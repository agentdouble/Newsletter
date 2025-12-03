from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import require_super_admin
from ..security import get_password_hash

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db), admin: models.User = Depends(require_super_admin)
):
    return db.query(models.User).all()


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_super_admin),
):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.trigram == user.trigram).first():
        raise HTTPException(status_code=400, detail="Trigram already registered")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        trigram=user.trigram,
        name=user.name,
        password_hash=hashed_password,
        global_role=user.global_role,
        must_change_password=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
