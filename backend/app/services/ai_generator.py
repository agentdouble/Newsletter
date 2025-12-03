from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from ..core.config import settings
from ..models import Contribution, Newsletter


SYSTEM_PROMPT = "You are an assistant that turns short bullet points into a concise internal newsletter."


def _group_contributions(contributions: Iterable[Contribution]):
    grouped = defaultdict(list)
    for contrib in contributions:
        grouped[contrib.type.value].append(contrib)
    sections = []
    for contrib_type, items in grouped.items():
        sections.append(
            {
                "heading": contrib_type.title(),
                "items": [
                    {
                        "title": item.title,
                        "content": item.content,
                        "author_id": item.user_id,
                        "status": item.status.value,
                    }
                    for item in items
                ],
            }
        )
    return sections


def generate_ai_draft(newsletter: Newsletter, contributions: Iterable[Contribution]):
    contributions = list(contributions)
    draft_layout = {
        "title": newsletter.title,
        "period": newsletter.period,
        "sections": _group_contributions(contributions),
    }

    if not contributions:
        draft_layout["note"] = "No approved contributions to summarize yet."
        return draft_layout

    if not settings.openai_api_key:
        draft_layout["note"] = "OPENAI_API_KEY not set; using deterministic draft."
        return draft_layout

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        bullet_points = "\n".join(
            f"- [{item.type.value}] {item.title}: {item.content}" for item in contributions
        )
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.4,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Rédige un brouillon concis pour une newsletter interne. "
                        f"Titre: {newsletter.title}. Période: {newsletter.period}.\n"
                        "Structure simple (sections success/fail/info) et ton factuel.\n"
                        "Points:\n" + bullet_points
                    ),
                },
            ],
        )
        ai_content = completion.choices[0].message.content if completion.choices else None
        if ai_content:
            draft_layout["ai_summary"] = ai_content
    except Exception:
        draft_layout["note"] = "AI generation failed; using deterministic draft."

    return draft_layout
