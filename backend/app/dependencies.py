from __future__ import annotations

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import models
from .core.config import settings
from .database import get_db
from .schemas import TokenData
from .security import decode_token, get_oauth2_scheme


def is_super_admin(user: models.User) -> bool:
    return user.global_role == models.GlobalRole.SUPER_ADMIN or user.email in settings.super_admin_emails


def _is_group_admin(db: Session, user: models.User, group_id: int) -> bool:
    membership = (
        db.query(models.GroupMembership)
        .filter(
            models.GroupMembership.group_id == group_id,
            models.GroupMembership.user_id == user.id,
        )
        .first()
    )
    return bool(membership and membership.role_in_group.lower() == "admin")


def _is_newsletter_admin(db: Session, user: models.User, newsletter_id: int) -> bool:
    return (
        db.query(models.NewsletterAdmin)
        .filter(
            models.NewsletterAdmin.newsletter_id == newsletter_id,
            models.NewsletterAdmin.user_id == user.id,
        )
        .first()
        is not None
    )


async def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(get_oauth2_scheme())
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=int(user_id))
    except Exception as exc:  # noqa: BLE001
        raise credentials_exception from exc

    user = db.get(models.User, token_data.user_id)
    if user is None:
        raise credentials_exception
    # Promote to super admin if configured in settings without mutating DB state permanently.
    if user.email in settings.super_admin_emails and user.global_role != models.GlobalRole.SUPER_ADMIN:
        user.global_role = models.GlobalRole.SUPER_ADMIN
    return user


async def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def require_admin(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if current_user.global_role not in (models.GlobalRole.ADMIN, models.GlobalRole.SUPER_ADMIN) and not is_super_admin(
        current_user
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def require_super_admin(
    current_user: models.User = Depends(get_current_active_user),
) -> models.User:
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user


def ensure_newsletter_admin(
    db: Session,
    user: models.User,
    newsletter: models.Newsletter,
) -> None:
    if is_super_admin(user):
        return
    if _is_newsletter_admin(db, user, newsletter.id):
        return
    if user.global_role == models.GlobalRole.ADMIN and _is_group_admin(db, user, newsletter.group_id):
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin of this group required")
