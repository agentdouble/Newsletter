from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import create_access_token, get_password_hash, verify_password
from ..dependencies import get_current_active_user, require_super_admin
from ..core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")

    if user.email in settings.super_admin_emails and user.global_role != models.GlobalRole.SUPER_ADMIN:
        user.global_role = models.GlobalRole.SUPER_ADMIN
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return schemas.Token(access_token=access_token, must_change_password=user.must_change_password)


@router.get("/me", response_model=schemas.UserWithGroups)
async def read_users_me(
    current_user: models.User = Depends(get_current_active_user),
):
    return current_user


@router.post("/bootstrap-admin", response_model=schemas.UserRead)
def bootstrap_admin(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_admin = (
        db.query(models.User)
        .filter(models.User.global_role == models.GlobalRole.SUPER_ADMIN)
        .first()
    )
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin already exists")
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        trigram=user.trigram,
        name=user.name,
        password_hash=hashed_password,
        global_role=models.GlobalRole.SUPER_ADMIN,
        must_change_password=True,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/change-password", response_model=schemas.UserRead)
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/reset-password/{user_id}", response_model=schemas.UserRead)
def reset_password(
    user_id: int,
    payload: schemas.PasswordReset,
    db: Session = Depends(get_db),
    super_admin: models.User = Depends(require_super_admin),
):
    target = db.get(models.User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.password_hash = get_password_hash(payload.new_password)
    target.must_change_password = True
    db.commit()
    db.refresh(target)
    return target
