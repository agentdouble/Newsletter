from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .db import SessionLocal
from .models import User, UserSession
from .settings import get_settings

settings = get_settings()

PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 210_000
SESSION_TTL = timedelta(hours=settings.session_ttl_hours)


def get_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def normalize_user_name(name: str) -> str:
    return name.strip().upper()


def ensure_password_strength(password: str) -> None:
    if len(password) < settings.password_min_length:
        raise HTTPException(status_code=400, detail="PASSWORD_TOO_SHORT")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    digest_b64 = base64.b64encode(digest).decode("utf-8")
    return f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}${salt_b64}${digest_b64}"


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt_b64, digest_b64 = encoded_hash.split("$", 3)
    except ValueError:
        return False
    if algorithm != PASSWORD_ALGORITHM:
        return False
    try:
        iterations = int(iterations_raw)
        salt = base64.b64decode(salt_b64.encode("utf-8"))
        expected = base64.b64decode(digest_b64.encode("utf-8"))
    except (ValueError, binascii.Error):
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(candidate, expected)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def generate_temporary_password() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnopqrstuvwxyz"
    return "".join(secrets.choice(alphabet) for _ in range(12))


def issue_session(session: Session, user: User) -> str:
    token = generate_session_token()
    session.add(
        UserSession(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(timezone.utc) + SESSION_TTL,
        )
    )
    return token


def get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer":
        return None
    token = value.strip()
    return token or None


def load_session_from_token(session: Session, token: str) -> Optional[UserSession]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(UserSession)
        .options(selectinload(UserSession.user))
        .where(
            UserSession.token_hash == hash_token(token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    )
    return session.scalar(stmt)


def get_current_session(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> UserSession:
    token = get_bearer_token(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="AUTH_REQUIRED")
    active_session = load_session_from_token(session, token)
    if not active_session or not active_session.user:
        raise HTTPException(status_code=401, detail="AUTH_REQUIRED")
    return active_session


def get_current_user(
    current_session: UserSession = Depends(get_current_session),
) -> User:
    user = current_session.user
    if user.must_reset_password:
        raise HTTPException(status_code=403, detail="PASSWORD_RESET_REQUIRED")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"admin", "superadmin"}:
        raise HTTPException(status_code=403, detail="ADMIN_REQUIRED")
    return current_user


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="SUPERADMIN_REQUIRED")
    return current_user
