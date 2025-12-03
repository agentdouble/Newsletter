from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import require_super_admin

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[schemas.GroupRead])
def list_groups(
    db: Session = Depends(get_db), admin: models.User = Depends(require_super_admin)
):
    return db.query(models.Group).all()


@router.post("", response_model=schemas.GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    group: schemas.GroupCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    existing = db.query(models.Group).filter(models.Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Group already exists")
    db_group = models.Group(name=group.name, description=group.description)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/{group_id}", response_model=schemas.GroupRead)
def update_group(
    group_id: int,
    payload: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    db_group = db.get(models.Group, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    if payload.name is not None:
        db_group.name = payload.name
    if payload.description is not None:
        db_group.description = payload.description
    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    db_group = db.get(models.Group, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")
    db.delete(db_group)
    db.commit()
    return None


@router.post("/{group_id}/members", response_model=schemas.GroupRead)
def add_member(
    group_id: int,
    member: schemas.GroupMemberAdd,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    db_group = db.get(models.Group, group_id)
    if not db_group:
        raise HTTPException(status_code=404, detail="Group not found")

    user = db.get(models.User, member.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(models.GroupMembership)
        .filter(
            models.GroupMembership.group_id == group_id,
            models.GroupMembership.user_id == member.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already in group")

    db_membership = models.GroupMembership(
        group_id=group_id, user_id=member.user_id, role_in_group=member.role_in_group
    )
    db.add(db_membership)
    db.commit()
    db.refresh(db_group)
    return db_group
