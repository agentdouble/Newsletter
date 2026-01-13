from __future__ import annotations

from .models import Comment, Contribution, Group, Newsletter, User


def serialize_user(user: User) -> dict:
    memberships = user.memberships or []
    group_ids = [str(m.group_id) for m in memberships]
    return {
        "id": str(user.id),
        "name": user.name,
        "role": user.role,
        "groupIds": group_ids,
        "mustReset": user.must_reset_password,
    }


def serialize_group(group: Group) -> dict:
    memberships = group.memberships or []
    admin_ids = [str(m.user_id) for m in memberships if m.is_admin]
    return {
        "id": str(group.id),
        "name": group.name,
        "canContribute": group.can_contribute,
        "canApprove": group.can_approve,
        "adminIds": admin_ids,
    }


def serialize_comment(comment: Comment) -> dict:
    return {
        "id": str(comment.id),
        "author": comment.author,
        "body": comment.body,
        "createdAt": comment.created_at.isoformat(),
    }


def serialize_newsletter(newsletter: Newsletter) -> dict:
    return {
        "id": str(newsletter.id),
        "title": newsletter.title,
        "date": newsletter.created_at.isoformat(),
        "audience": newsletter.audience,
        "groupId": str(newsletter.group_id) if newsletter.group_id else None,
        "imageUrl": newsletter.image_url,
        "body": newsletter.body,
        "reactions": {
            "up": newsletter.reaction_up or 0,
            "down": newsletter.reaction_down or 0,
        },
        "comments": [serialize_comment(c) for c in (newsletter.comments or [])],
    }


def serialize_contribution(contribution: Contribution) -> dict:
    return {
        "id": str(contribution.id),
        "newsletterLabel": contribution.edition.label if contribution.edition else "",
        "text": contribution.text or "",
        "successStory": contribution.success_story or "",
        "failStory": contribution.fail_story or "",
        "author": contribution.author,
        "groupId": str(contribution.group_id) if contribution.group_id else None,
        "createdAt": contribution.created_at.isoformat(),
    }
