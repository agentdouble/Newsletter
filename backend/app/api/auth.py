from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session, selectinload

from ..logger import logger
from ..models import User, UserSession
from ..schemas import BootstrapIn, LoginIn, PasswordChangeIn
from ..security import (
    ensure_password_strength,
    get_current_session,
    get_session,
    hash_password,
    issue_session,
    normalize_user_name,
    verify_password,
)
from ..serializers import serialize_user

router = APIRouter()


@router.post("/api/auth/bootstrap", status_code=status.HTTP_201_CREATED)
def bootstrap_auth(
    payload: BootstrapIn,
    session: Session = Depends(get_session),
) -> dict:
    session.execute(text("LOCK TABLE users IN EXCLUSIVE MODE"))
    existing_users = session.scalar(select(func.count(User.id))) or 0
    if existing_users:
        raise HTTPException(status_code=409, detail="BOOTSTRAP_ALREADY_COMPLETED")

    name = normalize_user_name(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="User name required")
    ensure_password_strength(payload.password)

    now = datetime.now(timezone.utc)
    entry = User(
        name=name,
        role="superadmin",
        password_hash=hash_password(payload.password),
        must_reset_password=False,
        password_updated_at=now,
    )
    session.add(entry)
    session.flush()

    token = issue_session(session, entry)
    entry.last_login_at = now
    session.commit()
    session.refresh(entry)

    logger.info("auth_bootstrap_created", extra={"id": str(entry.id)})

    return {
        "token": token,
        "user": serialize_user(entry),
        "mustReset": entry.must_reset_password,
    }


@router.post("/api/auth/login")
def login(payload: LoginIn, session: Session = Depends(get_session)) -> dict:
    name = normalize_user_name(payload.name)
    if not name or not payload.password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    user = session.scalar(
        select(User).options(selectinload(User.memberships)).where(User.name == name)
    )
    if not user or not user.password_hash:
        logger.warning("auth_login_failed", extra={"user_name": name})
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

    if not verify_password(payload.password, user.password_hash):
        logger.warning("auth_login_failed", extra={"user_name": name})
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

    token = issue_session(session, user)
    user.last_login_at = datetime.now(timezone.utc)
    session.commit()
    session.refresh(user)

    logger.info("auth_login_success", extra={"id": str(user.id)})

    return {"token": token, "user": serialize_user(user), "mustReset": user.must_reset_password}


@router.get("/api/auth/me")
def auth_me(current_session: UserSession = Depends(get_current_session)) -> dict:
    user = current_session.user
    return {"user": serialize_user(user), "mustReset": user.must_reset_password}


@router.post("/api/auth/logout")
def logout(
    current_session: UserSession = Depends(get_current_session),
    session: Session = Depends(get_session),
) -> dict:
    current_session.revoked_at = datetime.now(timezone.utc)
    session.commit()

    logger.info(
        "auth_logout",
        extra={"user_id": str(current_session.user_id), "session_id": str(current_session.id)},
    )

    return {"status": "ok"}


@router.post("/api/auth/change-password")
def change_password(
    payload: PasswordChangeIn,
    current_session: UserSession = Depends(get_current_session),
    session: Session = Depends(get_session),
) -> dict:
    user = current_session.user
    if not user.password_hash or not verify_password(
        payload.currentPassword, user.password_hash
    ):
        raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

    ensure_password_strength(payload.newPassword)
    user.password_hash = hash_password(payload.newPassword)
    user.must_reset_password = False
    user.password_updated_at = datetime.now(timezone.utc)

    session.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user.id,
            UserSession.revoked_at.is_(None),
            UserSession.id != current_session.id,
        )
        .values(revoked_at=datetime.now(timezone.utc))
    )

    session.commit()
    session.refresh(user)

    logger.info("auth_password_changed", extra={"id": str(user.id)})

    return {"user": serialize_user(user), "mustReset": user.must_reset_password}
