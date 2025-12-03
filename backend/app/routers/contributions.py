from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import ensure_newsletter_admin, get_current_active_user

router = APIRouter(prefix="", tags=["contributions"])


@router.get(
    "/newsletters/{newsletter_id}/contributions",
    response_model=list[schemas.ContributionRead],
)
def list_contributions(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, newsletter)
    return (
        db.query(models.Contribution)
        .filter(models.Contribution.newsletter_id == newsletter_id)
        .all()
    )


@router.get(
    "/newsletters/{newsletter_id}/my-contributions",
    response_model=list[schemas.ContributionRead],
)
async def my_contributions(
    newsletter_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    return (
        db.query(models.Contribution)
        .filter(
            models.Contribution.newsletter_id == newsletter_id,
            models.Contribution.user_id == current_user.id,
        )
        .all()
    )


@router.post(
    "/newsletters/{newsletter_id}/contributions",
    response_model=schemas.ContributionRead,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_contribution(
    newsletter_id: int,
    contribution: schemas.ContributionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    newsletter = db.get(models.Newsletter, newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")

    existing = (
        db.query(models.Contribution)
        .filter(
            models.Contribution.newsletter_id == newsletter_id,
            models.Contribution.user_id == current_user.id,
            models.Contribution.type == contribution.type,
        )
        .first()
    )

    if existing:
        existing.title = contribution.title
        existing.content = contribution.content
        existing.status = contribution.status
        db.commit()
        db.refresh(existing)
        return existing

    db_contribution = models.Contribution(
        newsletter_id=newsletter_id,
        user_id=current_user.id,
        type=contribution.type,
        title=contribution.title,
        content=contribution.content,
        status=contribution.status,
    )
    db.add(db_contribution)
    db.commit()
    db.refresh(db_contribution)
    return db_contribution


@router.put("/contributions/{contribution_id}", response_model=schemas.ContributionRead)
async def update_contribution(
    contribution_id: int,
    payload: schemas.ContributionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_contribution = db.get(models.Contribution, contribution_id)
    if not db_contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    if db_contribution.user_id != current_user.id and current_user.global_role != models.GlobalRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")

    if payload.type is not None:
        db_contribution.type = payload.type
    if payload.title is not None:
        db_contribution.title = payload.title
    if payload.content is not None:
        db_contribution.content = payload.content
    if payload.status is not None:
        db_contribution.status = payload.status
    db.commit()
    db.refresh(db_contribution)
    return db_contribution


@router.post(
    "/contributions/{contribution_id}/status",
    response_model=schemas.ContributionRead,
)
async def update_contribution_status(
    contribution_id: int,
    payload: schemas.ContributionStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    db_contribution = db.get(models.Contribution, contribution_id)
    if not db_contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")
    newsletter = db.get(models.Newsletter, db_contribution.newsletter_id)
    if not newsletter:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    ensure_newsletter_admin(db, current_user, newsletter)
    db_contribution.status = payload.status
    db.commit()
    db.refresh(db_contribution)
    return db_contribution
