from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    frontend_port: int
    backend_port: int
    log_level: str
    env: str
    session_ttl_hours: int
    password_min_length: int


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return f"postgresql+psycopg://{url[len('postgres://'):]}"
    if url.startswith("postgresql://"):
        return f"postgresql+psycopg://{url[len('postgresql://'):]}"
    return url


def get_settings() -> Settings:
    return Settings(
        database_url=normalize_database_url(
            os.getenv(
                "DATABASE_URL",
                "postgresql+psycopg://postgres:postgres@localhost:5432/anjanews",
            )
        ),
        frontend_port=int(os.getenv("FRONTEND_PORT", "5173")),
        backend_port=int(os.getenv("BACKEND_PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info"),
        env=os.getenv("ENV", "development"),
        session_ttl_hours=int(os.getenv("SESSION_TTL_HOURS", "12")),
        password_min_length=int(os.getenv("PASSWORD_MIN_LENGTH", "10")),
    )
