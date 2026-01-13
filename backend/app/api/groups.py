from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..logger import logger
from ..models import Group, GroupMembership, User
from ..schemas import GroupAdminsIn, GroupIn
from ..security import get_session, require_superadmin
from ..serializers import serialize_group

router = APIRouter()


@router.post("/api/groups", status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupIn,
    session: Session = Depends(get_session),
    _current_user=Depends(require_superadmin),
) -> dict:
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


@router.put("/api/groups/{group_id}/admins")
def update_group_admins(
    group_id: UUID,
    payload: GroupAdminsIn,
    session: Session = Depends(get_session),
    _current_user=Depends(require_superadmin),
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


@router.delete("/api/groups/{group_id}")
def delete_group(
    group_id: UUID,
    session: Session = Depends(get_session),
    _current_user=Depends(require_superadmin),
) -> dict:
    group = session.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    session.delete(group)
    session.commit()

    logger.info("group_deleted", extra={"id": str(group_id)})

    return {"groupId": str(group_id)}
