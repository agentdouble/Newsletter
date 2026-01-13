from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..editions import get_or_create_current_edition
from ..security import get_current_user, get_session

router = APIRouter()


@router.get("/api/editions/current")
def current_edition(
    session: Session = Depends(get_session),
    _current_user=Depends(get_current_user),
) -> dict:
    edition = get_or_create_current_edition(session)
    return {
        "id": str(edition.id),
        "label": edition.label,
        "periodStart": edition.period_start.isoformat(),
    }
