from __future__ import annotations

from .models import Contribution

SYSTEM_MESSAGE = (
    "Tu es un redacteur de newsletter interne. "
    "Rends uniquement du HTML (pas de markdown), avec des titres h1/h2, "
    "des paragraphes courts et des listes a puces quand utile. "
    "Ecris en francais, style clair et professionnel. "
    "Ne fabrique aucune information, synthese uniquement a partir des contributions."
)


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
    return f"- {author} ({group_label}) : " + " | ".join(details)


def build_newsletter_prompt(label: str, contributions: list[Contribution]) -> str:
    lines = [
        format_contribution_for_prompt(contribution)
        for contribution in contributions
    ]
    cleaned = [line for line in lines if line]
    if not cleaned:
        return ""
    return f"Titre: {label}\nContributions:\n" + "\n".join(cleaned)
