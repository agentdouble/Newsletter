from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..editions import get_or_create_current_edition
from ..models import Contribution, Group, Newsletter, User
from ..security import get_current_user, get_session
from ..serializers import (
    serialize_contribution,
    serialize_group,
    serialize_newsletter,
    serialize_user,
)

router = APIRouter()


@router.get("/api/bootstrap")
def bootstrap(
    session: Session = Depends(get_session),
    _current_user=Depends(get_current_user),
) -> dict:
    edition = get_or_create_current_edition(session)

    users = session.scalars(
        select(User).options(selectinload(User.memberships)).order_by(User.name)
    ).all()
    groups = session.scalars(
        select(Group).options(selectinload(Group.memberships)).order_by(Group.name)
    ).all()
    newsletters = session.scalars(
        select(Newsletter)
        .options(selectinload(Newsletter.comments))
        .order_by(Newsletter.created_at.desc())
    ).all()
    contributions = session.scalars(
        select(Contribution)
        .options(selectinload(Contribution.edition))
        .where(Contribution.edition_id == edition.id)
        .order_by(Contribution.created_at.desc())
    ).all()

    return {
        "currentEdition": {
            "id": str(edition.id),
            "label": edition.label,
            "periodStart": edition.period_start.isoformat(),
        },
        "users": [serialize_user(user) for user in users],
        "groups": [serialize_group(group) for group in groups],
        "newsletters": [serialize_newsletter(nl) for nl in newsletters],
        "contributions": [serialize_contribution(c) for c in contributions],
    }
