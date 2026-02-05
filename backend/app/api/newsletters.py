from __future__ import annotations

import re
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from ..logger import logger
from ..models import Comment, Contribution, Edition, Group, Newsletter
from ..newsletter_prompt import build_newsletter_prompt, build_system_message
from ..schemas import CommentIn, NewsletterGenerateIn, NewsletterIn, ReactionIn
from ..security import get_current_user, get_session, require_admin
from ..serializers import serialize_comment, serialize_newsletter
from ..settings import get_settings

settings = get_settings()

router = APIRouter()


def normalize_color(value: str | None) -> str | None:
    cleaned = (value or "").strip()
    if not cleaned:
        return None
    if not re.fullmatch(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})", cleaned):
        raise HTTPException(status_code=400, detail="Invalid color")
    return cleaned.lower()


@router.post("/api/newsletters/generate")
def generate_newsletter(
    payload: NewsletterGenerateIn,
    session: Session = Depends(get_session),
    _current_user=Depends(require_admin),
) -> dict:
    if not settings.openai_api_key and not settings.openai_base_url:
        raise HTTPException(status_code=503, detail="OPENAI_NOT_CONFIGURED")

    edition = session.get(Edition, payload.editionId)
    if not edition:
        raise HTTPException(status_code=404, detail="Edition not found")

    group = None
    if payload.groupId:
        group = session.get(Group, payload.groupId)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

    stmt = (
        select(Contribution)
        .options(selectinload(Contribution.group))
        .where(Contribution.edition_id == edition.id)
    )
    if payload.groupId:
        stmt = stmt.where(Contribution.group_id == payload.groupId)

    contributions = session.scalars(stmt.order_by(Contribution.created_at.desc())).all()

    label = edition.label
    if group:
        label = f"{edition.label} · {group.name}"
    prompt = build_newsletter_prompt(label, contributions)
    if not prompt:
        raise HTTPException(status_code=400, detail="NO_CONTRIBUTIONS")

    system_prompt_override = (payload.systemPrompt or "").strip()
    system_prompt = build_system_message(system_prompt_override)
    prompt_context = {
        "custom_prompt": bool(system_prompt_override),
        "prompt_length": len(system_prompt),
        "group_id": str(payload.groupId) if payload.groupId else None,
    }

    api_key = settings.openai_api_key or "local"
    base_url = settings.openai_base_url or None
    client = OpenAI(api_key=api_key, base_url=base_url, timeout=30.0)

    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
    except Exception as error:
        logger.exception(
            "newsletter_ai_failed",
            extra={
                "edition_id": str(edition.id),
                "model": settings.openai_model,
                "base_url": settings.openai_base_url or "openai",
                **prompt_context,
            },
        )
        raise HTTPException(status_code=502, detail="OPENAI_REQUEST_FAILED") from error

    content = (completion.choices[0].message.content or "").strip()
    if not content:
        logger.error(
            "newsletter_ai_empty",
            extra={
                "edition_id": str(edition.id),
                "model": settings.openai_model,
                "base_url": settings.openai_base_url or "openai",
                **prompt_context,
            },
        )
        raise HTTPException(status_code=502, detail="OPENAI_EMPTY_RESPONSE")

    logger.info(
        "newsletter_ai_generated",
        extra={
            "edition_id": str(edition.id),
            "contributions": len(contributions),
            "model": settings.openai_model,
            "base_url": settings.openai_base_url or "openai",
            **prompt_context,
        },
    )

    return {"html": content}


@router.post("/api/newsletters", status_code=status.HTTP_201_CREATED)
def create_newsletter(
    payload: NewsletterIn,
    session: Session = Depends(get_session),
    _current_user=Depends(require_admin),
) -> dict:
    title = payload.title.strip()
    body = payload.body.strip()
    if not title or not body:
        raise HTTPException(status_code=400, detail="Newsletter title/body required")

    color = normalize_color(payload.color)

    audience = "Toute l'organisation"
    if payload.groupId:
        group = session.get(Group, payload.groupId)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        audience = group.name
    if payload.editionId:
        edition = session.get(Edition, payload.editionId)
        if not edition:
            raise HTTPException(status_code=404, detail="Edition not found")

    entry = Newsletter(
        title=title,
        body=body,
        audience=audience,
        image_url=payload.imageUrl,
        color=color,
        group_id=payload.groupId,
        edition_id=payload.editionId,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("newsletter_created", extra={"id": str(entry.id)})

    return serialize_newsletter(entry)


@router.post("/api/newsletters/{newsletter_id}/reactions")
def add_reaction(
    newsletter_id: UUID,
    payload: ReactionIn,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
) -> dict:
    if payload.reactionId not in {"up", "down"}:
        raise HTTPException(status_code=400, detail="Unknown reaction")

    if payload.reactionId == "up":
        stmt = (
            update(Newsletter)
            .where(Newsletter.id == newsletter_id)
            .values(reaction_up=Newsletter.reaction_up + 1)
            .returning(Newsletter.reaction_up, Newsletter.reaction_down)
        )
    else:
        stmt = (
            update(Newsletter)
            .where(Newsletter.id == newsletter_id)
            .values(reaction_down=Newsletter.reaction_down + 1)
            .returning(Newsletter.reaction_up, Newsletter.reaction_down)
        )

    result = session.execute(stmt).first()
    if not result:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    session.commit()

    logger.info(
        "newsletter_reaction",
        extra={"id": str(newsletter_id), "reaction": payload.reactionId},
    )

    return {"reactions": {"up": result[0], "down": result[1]}}


@router.post("/api/newsletters/{newsletter_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    newsletter_id: UUID,
    payload: CommentIn,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
) -> dict:
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="Comment body required")

    newsletter = session.get(Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    entry = Comment(
        newsletter_id=newsletter_id,
        author=current_user.name,
        body=payload.body.strip(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("newsletter_comment", extra={"id": str(entry.id)})

    return serialize_comment(entry)
