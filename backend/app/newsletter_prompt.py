from __future__ import annotations

from .models import Contribution

IMMUTABLE_SYSTEM_MESSAGE = (
    "Rends uniquement du HTML (pas de markdown), avec un h1 puis des h2 si besoin."
)
DEFAULT_SYSTEM_MESSAGE = (
    "Tu es un redacteur de newsletter interne. "
    "Ecris un article fluide et narratif, pas une liste de faits. "
    "Evite les listes a puces sauf si strictement necessaire. "
    "Ecris en francais, style clair et professionnel. "
    "Ne fabrique aucune information, synthese uniquement a partir des contributions."
)


def build_system_message(custom_prompt: str | None) -> str:
    cleaned = (custom_prompt or "").strip()
    if cleaned:
        return f"{cleaned}\n{IMMUTABLE_SYSTEM_MESSAGE}"
    return f"{DEFAULT_SYSTEM_MESSAGE}\n{IMMUTABLE_SYSTEM_MESSAGE}"


def format_contribution_for_prompt(contribution: Contribution) -> str:
    details = []
    if contribution.text:
        details.append(f"Faits marquants: {contribution.text.strip()}")
    if contribution.success_story:
        details.append(f"Success story: {contribution.success_story.strip()}")
    if contribution.fail_story:
        details.append(f"Fail story: {contribution.fail_story.strip()}")
    if not details:
        return ""
    group_label = contribution.group.name if contribution.group else "Sans groupe"
    author = contribution.author or "Anonyme"
    return f"Contribution - {author} ({group_label}) : " + " | ".join(details)


def build_newsletter_prompt(label: str, contributions: list[Contribution]) -> str:
    lines = [
        format_contribution_for_prompt(contribution)
        for contribution in contributions
    ]
    cleaned = [line for line in lines if line]
    if not cleaned:
        return ""
    return f"Titre: {label}\nContributions:\n" + "\n".join(cleaned)
