from __future__ import annotations

import logging
from datetime import date
from typing import Literal, Optional
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from .db import SessionLocal
from .models import (
    Comment,
    Contribution,
    Edition,
    Group,
    GroupMembership,
    Newsletter,
    User,
)
from .settings import get_settings

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("anjanews")

app = FastAPI(title="Anjanews API")

frontend_origin = f"http://localhost:{settings.frontend_port}"
frontend_alt_origin = f"http://127.0.0.1:{settings.frontend_port}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, frontend_alt_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ContributionIn(BaseModel):
    editionId: UUID
    groupId: Optional[UUID] = None
    author: str
    text: Optional[str] = None
    successStory: Optional[str] = None
    failStory: Optional[str] = None


class NewsletterIn(BaseModel):
    title: str
    body: str
    imageUrl: Optional[str] = None
    groupId: Optional[UUID] = None
    editionId: Optional[UUID] = None


class ReactionIn(BaseModel):
    reactionId: str


class CommentIn(BaseModel):
    author: str
    body: str


class UserIn(BaseModel):
    name: str
    role: Literal["user", "admin", "superadmin"]
    groupIds: list[UUID] = Field(default_factory=list)


class UserGroupsIn(BaseModel):
    groupIds: list[UUID] = Field(default_factory=list)


class GroupIn(BaseModel):
    name: str
    canContribute: bool = True
    canApprove: bool = False


class GroupAdminsIn(BaseModel):
    adminIds: list[UUID] = Field(default_factory=list)


def get_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def build_edition_label(period_start: date) -> str:
    months = [
        "janvier",
        "fevrier",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "aout",
        "septembre",
        "octobre",
        "novembre",
        "decembre",
    ]
    month_name = months[period_start.month - 1]
    return f"Newsletter mensuelle - {month_name} {period_start.year}"


def get_or_create_current_edition(session: Session) -> Edition:
    today = date.today()
    period_start = date(today.year, today.month, 1)
    label = build_edition_label(period_start)
    stmt = (
        pg_insert(Edition)
        .values(period_start=period_start, label=label)
        .on_conflict_do_nothing(index_elements=[Edition.period_start])
    )
    session.execute(stmt)
    session.commit()
    edition = session.scalar(select(Edition).where(Edition.period_start == period_start))
    if not edition:
        raise HTTPException(status_code=500, detail="Edition not initialized")
    return edition


def serialize_user(user: User) -> dict:
    group_ids = [str(m.group_id) for m in user.memberships]
    return {
        "id": str(user.id),
        "name": user.name,
        "role": user.role,
        "groupIds": group_ids,
    }


def serialize_group(group: Group) -> dict:
    memberships = group.memberships or []
    admin_ids = [str(m.user_id) for m in memberships if m.is_admin]
    return {
        "id": str(group.id),
        "name": group.name,
        "canContribute": group.can_contribute,
        "canApprove": group.can_approve,
        "adminIds": admin_ids,
    }


def serialize_comment(comment: Comment) -> dict:
    return {
        "id": str(comment.id),
        "author": comment.author,
        "body": comment.body,
        "createdAt": comment.created_at.isoformat(),
    }


def serialize_newsletter(newsletter: Newsletter) -> dict:
    return {
        "id": str(newsletter.id),
        "title": newsletter.title,
        "date": newsletter.created_at.isoformat(),
        "audience": newsletter.audience,
        "groupId": str(newsletter.group_id) if newsletter.group_id else None,
        "imageUrl": newsletter.image_url,
        "body": newsletter.body,
        "reactions": {
            "up": newsletter.reaction_up or 0,
            "down": newsletter.reaction_down or 0,
        },
        "comments": [serialize_comment(c) for c in (newsletter.comments or [])],
    }


def serialize_contribution(contribution: Contribution) -> dict:
    return {
        "id": str(contribution.id),
        "newsletterLabel": contribution.edition.label if contribution.edition else "",
        "text": contribution.text or "",
        "successStory": contribution.success_story or "",
        "failStory": contribution.fail_story or "",
        "author": contribution.author,
        "groupId": str(contribution.group_id) if contribution.group_id else None,
        "createdAt": contribution.created_at.isoformat(),
    }


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/editions/current")
def current_edition(session: Session = Depends(get_session)) -> dict:
    edition = get_or_create_current_edition(session)
    return {
        "id": str(edition.id),
        "label": edition.label,
        "periodStart": edition.period_start.isoformat(),
    }


@app.get("/api/bootstrap")
def bootstrap(session: Session = Depends(get_session)) -> dict:
    edition = get_or_create_current_edition(session)

    users = session.scalars(
        select(User).options(selectinload(User.memberships)).order_by(User.name)
    ).all()
    groups = session.scalars(
        select(Group).options(selectinload(Group.memberships)).order_by(Group.name)
    ).all()
    newsletters = session.scalars(
        select(Newsletter)
        .options(selectinload(Newsletter.comments))
        .order_by(Newsletter.created_at.desc())
    ).all()
    contributions = session.scalars(
        select(Contribution)
        .options(selectinload(Contribution.edition))
        .where(Contribution.edition_id == edition.id)
        .order_by(Contribution.created_at.desc())
    ).all()

    return {
        "currentEdition": {
            "id": str(edition.id),
            "label": edition.label,
            "periodStart": edition.period_start.isoformat(),
        },
        "users": [serialize_user(user) for user in users],
        "groups": [serialize_group(group) for group in groups],
        "newsletters": [serialize_newsletter(nl) for nl in newsletters],
        "contributions": [serialize_contribution(c) for c in contributions],
    }


@app.post("/api/contributions", status_code=status.HTTP_201_CREATED)
def create_contribution(
    payload: ContributionIn, session: Session = Depends(get_session)
) -> dict:
    if not (payload.text or payload.successStory or payload.failStory):
        raise HTTPException(status_code=400, detail="Contribution is empty")
    if not payload.author.strip():
        raise HTTPException(status_code=400, detail="Author required")

    edition = session.get(Edition, payload.editionId)
    if not edition:
        raise HTTPException(status_code=404, detail="Edition not found")

    if payload.groupId:
        group = session.get(Group, payload.groupId)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

    entry = Contribution(
        edition_id=payload.editionId,
        group_id=payload.groupId,
        author=payload.author.strip(),
        text=payload.text,
        success_story=payload.successStory,
        fail_story=payload.failStory,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("contribution_created", extra={"id": str(entry.id)})

    entry.edition = edition
    return serialize_contribution(entry)


@app.post("/api/newsletters", status_code=status.HTTP_201_CREATED)
def create_newsletter(
    payload: NewsletterIn, session: Session = Depends(get_session)
) -> dict:
    title = payload.title.strip()
    body = payload.body.strip()
    if not title or not body:
        raise HTTPException(status_code=400, detail="Newsletter title/body required")

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
        group_id=payload.groupId,
        edition_id=payload.editionId,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("newsletter_created", extra={"id": str(entry.id)})

    return serialize_newsletter(entry)


@app.post("/api/newsletters/{newsletter_id}/reactions")
def add_reaction(
    newsletter_id: UUID, payload: ReactionIn, session: Session = Depends(get_session)
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


@app.post("/api/newsletters/{newsletter_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    newsletter_id: UUID, payload: CommentIn, session: Session = Depends(get_session)
) -> dict:
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="Comment body required")
    if not payload.author.strip():
        raise HTTPException(status_code=400, detail="Author required")

    newsletter = session.get(Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    entry = Comment(
        newsletter_id=newsletter_id,
        author=payload.author.strip(),
        body=payload.body.strip(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("newsletter_comment", extra={"id": str(entry.id)})

    return serialize_comment(entry)


@app.post("/api/users", status_code=status.HTTP_201_CREATED)
def create_user(payload: UserIn, session: Session = Depends(get_session)) -> dict:
    name = payload.name.strip().upper()
    if not name:
        raise HTTPException(status_code=400, detail="User name required")

    entry = User(name=name, role=payload.role)
    session.add(entry)

    memberships = []
    if payload.groupIds:
        groups = session.scalars(select(Group).where(Group.id.in_(payload.groupIds))).all()
        if len(groups) != len(set(payload.groupIds)):
            raise HTTPException(status_code=404, detail="Group not found")
        memberships = [GroupMembership(user=entry, group=group) for group in groups]
        session.add_all(memberships)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="User already exists")

    session.refresh(entry)

    logger.info("user_created", extra={"id": str(entry.id)})

    entry.memberships = memberships
    return serialize_user(entry)


@app.put("/api/users/{user_id}/groups")
def update_user_groups(
    user_id: UUID, payload: UserGroupsIn, session: Session = Depends(get_session)
) -> dict:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    desired = {gid for gid in payload.groupIds}
    groups = session.scalars(select(Group).where(Group.id.in_(desired))).all()
    if len(groups) != len(desired):
        raise HTTPException(status_code=404, detail="Group not found")

    existing = session.scalars(
        select(GroupMembership).where(GroupMembership.user_id == user_id)
    ).all()

    existing_ids = {membership.group_id for membership in existing}

    for membership in existing:
        if membership.group_id not in desired:
            session.delete(membership)

    for group_id in desired - existing_ids:
        session.add(GroupMembership(user_id=user_id, group_id=group_id))

    session.commit()
    session.refresh(user)

    user.memberships = session.scalars(
        select(GroupMembership).where(GroupMembership.user_id == user_id)
    ).all()

    logger.info("user_groups_updated", extra={"id": str(user_id)})

    return serialize_user(user)


@app.post("/api/groups", status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupIn, session: Session = Depends(get_session)) -> dict:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name required")

    entry = Group(
        name=name,
        can_contribute=payload.canContribute,
        can_approve=payload.canApprove,
    )
    session.add(entry)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="Group already exists")

    session.refresh(entry)

    logger.info("group_created", extra={"id": str(entry.id)})

    return serialize_group(entry)


@app.put("/api/groups/{group_id}/admins")
def update_group_admins(
    group_id: UUID, payload: GroupAdminsIn, session: Session = Depends(get_session)
) -> dict:
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    admin_ids = {uid for uid in payload.adminIds}
    if admin_ids:
        users = session.scalars(select(User).where(User.id.in_(admin_ids))).all()
        if len(users) != len(admin_ids):
            raise HTTPException(status_code=404, detail="User not found")

    memberships = session.scalars(
        select(GroupMembership).where(GroupMembership.group_id == group_id)
    ).all()
    membership_by_user = {m.user_id: m for m in memberships}

    for membership in memberships:
        membership.is_admin = False

    for user_id in admin_ids:
        membership = membership_by_user.get(user_id)
        if membership:
            membership.is_admin = True
        else:
            session.add(
                GroupMembership(user_id=user_id, group_id=group_id, is_admin=True)
            )

    session.commit()

    group.memberships = session.scalars(
        select(GroupMembership).where(GroupMembership.group_id == group_id)
    ).all()

    logger.info("group_admins_updated", extra={"id": str(group_id)})

    return serialize_group(group)


@app.delete("/api/groups/{group_id}")
def delete_group(group_id: UUID, session: Session = Depends(get_session)) -> dict:
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    session.delete(group)
    session.commit()

    logger.info("group_deleted", extra={"id": str(group_id)})

    return {"groupId": str(group_id)}
