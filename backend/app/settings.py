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


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@localhost:5432/anjanews",
        ),
        frontend_port=int(os.getenv("FRONTEND_PORT", "5173")),
        backend_port=int(os.getenv("BACKEND_PORT", "8000")),
        log_level=os.getenv("LOG_LEVEL", "info"),
        env=os.getenv("ENV", "development"),
    )
