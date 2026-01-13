from __future__ import annotations

from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ContributionIn(BaseModel):
    editionId: UUID
    groupId: Optional[UUID] = None
    author: Optional[str] = None
    text: Optional[str] = None
    successStory: Optional[str] = None
    failStory: Optional[str] = None


class NewsletterIn(BaseModel):
    title: str
    body: str
    imageUrl: Optional[str] = None
    groupId: Optional[UUID] = None
    editionId: Optional[UUID] = None


class NewsletterGenerateIn(BaseModel):
    editionId: UUID
    systemPrompt: Optional[str] = None


class ReactionIn(BaseModel):
    reactionId: str


class CommentIn(BaseModel):
    author: Optional[str] = None
    body: str


class UserIn(BaseModel):
    name: str
    role: Literal["user", "admin", "superadmin"]
    groupIds: list[UUID] = Field(default_factory=list)
    temporaryPassword: str


class UserGroupsIn(BaseModel):
    groupIds: list[UUID] = Field(default_factory=list)


class GroupIn(BaseModel):
    name: str
    canContribute: bool = True
    canApprove: bool = False


class GroupAdminsIn(BaseModel):
    adminIds: list[UUID] = Field(default_factory=list)


class LoginIn(BaseModel):
    name: str
    password: str


class PasswordChangeIn(BaseModel):
    currentPassword: str
    newPassword: str


class BootstrapIn(BaseModel):
    name: str
    password: str
