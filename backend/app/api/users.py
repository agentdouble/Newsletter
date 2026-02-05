from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..logger import logger
from ..models import Group, GroupMembership, User, UserSession
from ..schemas import UserGroupsIn, UserIn
from ..security import (
    ensure_password_strength,
    generate_temporary_password,
    get_session,
    hash_password,
    normalize_user_name,
    require_superadmin,
)
from ..serializers import serialize_user

router = APIRouter()


@router.post("/api/users", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserIn,
    session: Session = Depends(get_session),
    current_user=Depends(require_superadmin),
) -> dict:
    name = normalize_user_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="User name required")

    ensure_password_strength(payload.temporaryPassword)
    entry = User(
        name=name,
        role=payload.role,
        password_hash=hash_password(payload.temporaryPassword),
        must_reset_password=True,
        password_updated_at=datetime.now(timezone.utc),
    )
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

    logger.info("user_created", extra={"id": str(entry.id), "by": str(current_user.id)})

    entry.memberships = memberships
    return serialize_user(entry)


@router.post("/api/users/{user_id}/reset-password")
def reset_user_password(
    user_id: UUID,
    session: Session = Depends(get_session),
    current_user=Depends(require_superadmin),
) -> dict:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temporary_password = generate_temporary_password()
    user.password_hash = hash_password(temporary_password)
    user.must_reset_password = True
    user.password_updated_at = datetime.now(timezone.utc)

    session.execute(
        update(UserSession)
        .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    session.commit()

    logger.info("user_password_reset", extra={"id": str(user.id), "by": str(current_user.id)})

    return {
        "userId": str(user.id),
        "temporaryPassword": temporary_password,
        "mustReset": user.must_reset_password,
    }


@router.put("/api/users/{user_id}/groups")
def update_user_groups(
    user_id: UUID,
    payload: UserGroupsIn,
    session: Session = Depends(get_session),
    _current_user=Depends(require_superadmin),
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
