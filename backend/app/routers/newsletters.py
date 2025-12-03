from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import ensure_newsletter_admin, get_current_active_user
from ..services.ai_generator import generate_ai_draft

router = APIRouter(prefix="/newsletters", tags=["newsletters"])


@router.get("", response_model=list[schemas.NewsletterRead])
async def list_newsletters(
    group_id: Optional[int] = None,
    status_filter: Optional[models.NewsletterStatus] = Query(None, alias="status"),
    period: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    query = db.query(models.Newsletter)
    if group_id:
        query = query.filter(models.Newsletter.group_id == group_id)
    if status_filter:
        query = query.filter(models.Newsletter.status == status_filter)
    if period:
        query = query.filter(models.Newsletter.period == period)
    if user_id:
        query = query.join(models.Contribution).filter(models.Contribution.user_id == user_id).distinct()
    return query.order_by(models.Newsletter.created_at.desc()).all()


@router.post("", response_model=schemas.NewsletterRead, status_code=status.HTTP_201_CREATED)
async def create_newsletter(
    newsletter: schemas.NewsletterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    group = db.get(models.Group, newsletter.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if current_user.global_role != models.GlobalRole.SUPER_ADMIN:
        membership = (
            db.query(models.GroupMembership)
            .filter(
                models.GroupMembership.group_id == newsletter.group_id,
                models.GroupMembership.user_id == current_user.id,
            )
            .first()
        )
        if not membership or membership.role_in_group.lower() != "admin":
            raise HTTPException(status_code=403, detail="Admin of this group required")

    db_newsletter = models.Newsletter(
        title=newsletter.title,
        group_id=newsletter.group_id,
        period=newsletter.period,
        status=newsletter.status,
        created_by=current_user.id,
    )
    db.add(db_newsletter)
    db.commit()
    db.refresh(db_newsletter)
    return db_newsletter


@router.get("/{newsletter_id}", response_model=schemas.NewsletterRead)
async def get_newsletter(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return newsletter


@router.put("/{newsletter_id}", response_model=schemas.NewsletterRead)
async def update_newsletter(
    newsletter_id: int,
    payload: schemas.NewsletterUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_newsletter = db.get(models.Newsletter, newsletter_id)
    if not db_newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    ensure_newsletter_admin(db, current_user, db_newsletter)

    if payload.title is not None:
        db_newsletter.title = payload.title
    if payload.period is not None:
        db_newsletter.period = payload.period
    if payload.status is not None:
        db_newsletter.status = payload.status
    if payload.layout_config is not None:
        db_newsletter.layout_config = payload.layout_config
    if payload.rendered_html is not None:
        db_newsletter.rendered_html = payload.rendered_html

    db.commit()
    db.refresh(db_newsletter)
    return db_newsletter


@router.post("/{newsletter_id}/publish", response_model=schemas.NewsletterRead)
async def publish_newsletter(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_newsletter = db.get(models.Newsletter, newsletter_id)
    if not db_newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, db_newsletter)
    db_newsletter.status = models.NewsletterStatus.PUBLISHED
    db.commit()
    db.refresh(db_newsletter)
    return db_newsletter


@router.put("/{newsletter_id}/layout", response_model=schemas.NewsletterRead)
async def update_layout(
    newsletter_id: int,
    layout: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_newsletter = db.get(models.Newsletter, newsletter_id)
    if not db_newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, db_newsletter)
    db_newsletter.layout_config = layout
    db.commit()
    db.refresh(db_newsletter)
    return db_newsletter


@router.post("/{newsletter_id}/render", response_model=schemas.NewsletterRead)
async def render_newsletter(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, newsletter)

    approved_contributions = (
        db.query(models.Contribution)
        .filter(
            models.Contribution.newsletter_id == newsletter_id,
            models.Contribution.status == models.ContributionStatus.APPROVED,
        )
        .all()
    )

    sections = []
    for contrib in approved_contributions:
        sections.append(
            {
                "type": contrib.type.value,
                "title": contrib.title,
                "author_id": contrib.user_id,
                "content": contrib.content,
            }
        )
    html_blocks = "".join(
        f"<section><h3>{item['type'].title()} — {item['title']}</h3><p>{item['content']}</p></section>"
        for item in sections
    )
    newsletter.rendered_html = f"<article><h1>{newsletter.title}</h1>{html_blocks}</article>"
    newsletter.layout_config = newsletter.layout_config or {"sections": sections}
    db.commit()
    db.refresh(newsletter)
    return newsletter


@router.post("/{newsletter_id}/ai-draft", response_model=schemas.NewsletterRead)
async def ai_draft_newsletter(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, newsletter)

    approved_contributions = (
        db.query(models.Contribution)
        .filter(
            models.Contribution.newsletter_id == newsletter_id,
            models.Contribution.status == models.ContributionStatus.APPROVED,
        )
        .all()
    )
    draft_layout = generate_ai_draft(newsletter, approved_contributions)
    newsletter.layout_config = draft_layout
    db.commit()
    db.refresh(newsletter)
    return newsletter
