from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..logger import logger
from ..models import Contribution, Edition, Group
from ..schemas import ContributionIn
from ..security import get_current_user, get_session
from ..serializers import serialize_contribution

router = APIRouter()


@router.post("/api/contributions", status_code=status.HTTP_201_CREATED)
def create_contribution(
    payload: ContributionIn,
    session: Session = Depends(get_session),
    current_user=Depends(get_current_user),
) -> dict:
    if not (payload.text or payload.successStory or payload.failStory):
        raise HTTPException(status_code=400, detail="Contribution is empty")

    edition = session.get(Edition, payload.editionId)
    if not edition:
        raise HTTPException(status_code=404, detail="Edition not found")

    if payload.groupId:
        group = session.get(Group, payload.groupId)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

    entry = Contribution(
        edition_id=payload.editionId,
        group_id=payload.groupId,
        author=current_user.name,
        text=payload.text,
        success_story=payload.successStory,
        fail_story=payload.failStory,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    logger.info("contribution_created", extra={"id": str(entry.id)})

    entry.edition = edition
    return serialize_contribution(entry)
