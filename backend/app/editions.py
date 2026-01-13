from __future__ import annotations

from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from .models import Edition


def build_edition_label(period_start: date) -> str:
    months = [
        "janvier",
        "fevrier",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "aout",
        "septembre",
        "octobre",
        "novembre",
        "decembre",
    ]
    month_name = months[period_start.month - 1]
    return f"Newsletter mensuelle - {month_name} {period_start.year}"


def get_or_create_current_edition(session: Session) -> Edition:
    today = date.today()
    period_start = date(today.year, today.month, 1)
    label = build_edition_label(period_start)
    stmt = (
        pg_insert(Edition)
        .values(period_start=period_start, label=label)
        .on_conflict_do_nothing(index_elements=[Edition.period_start])
    )
    session.execute(stmt)
    session.commit()
    edition = session.scalar(select(Edition).where(Edition.period_start == period_start))
    if not edition:
        raise HTTPException(status_code=500, detail="Edition not initialized")
    return edition
