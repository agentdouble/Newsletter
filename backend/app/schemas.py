from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from .models import ContributionStatus, ContributionType, GlobalRole, NewsletterStatus


# Auth
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    must_change_password: bool = False


class TokenData(BaseModel):
    user_id: Optional[int] = None


# Users
class UserBase(BaseModel):
    email: EmailStr
    trigram: str
    name: str
    global_role: GlobalRole = GlobalRole.USER


class UserCreate(UserBase):
    password: str


class UserResetPassword(BaseModel):
    user_id: int
    new_password: str


class UserRead(UserBase):
    id: int
    must_change_password: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PasswordReset(BaseModel):
    new_password: str


# Groups
class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupMemberAdd(BaseModel):
    user_id: int
    role_in_group: str = "contributor"


class GroupRead(GroupBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class GroupMembershipRead(BaseModel):
    group: GroupRead
    role_in_group: str

    model_config = ConfigDict(from_attributes=True)


class UserWithGroups(UserRead):
    memberships: List[GroupMembershipRead] = []

    model_config = ConfigDict(from_attributes=True)

# Newsletters
class NewsletterBase(BaseModel):
    title: str
    group_id: int
    period: Optional[str] = None


class NewsletterCreate(NewsletterBase):
    status: NewsletterStatus = NewsletterStatus.DRAFT


class NewsletterUpdate(BaseModel):
    title: Optional[str] = None
    period: Optional[str] = None
    status: Optional[NewsletterStatus] = None
    layout_config: Optional[dict] = None
    rendered_html: Optional[str] = None


class NewsletterRead(NewsletterBase):
    id: int
    status: NewsletterStatus
    created_at: datetime
    updated_at: datetime
    layout_config: Optional[dict] = None
    rendered_html: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NewsletterAdminBase(BaseModel):
    user_id: int


class NewsletterAdminCreate(NewsletterAdminBase):
    pass


class NewsletterAdminRead(NewsletterAdminBase):
    id: int
    newsletter_id: int
    user: UserRead

    model_config = ConfigDict(from_attributes=True)


# Contributions
class ContributionBase(BaseModel):
    type: ContributionType
    title: str
    content: str


class ContributionCreate(ContributionBase):
    status: ContributionStatus = ContributionStatus.SUBMITTED


class ContributionUpdate(BaseModel):
    type: Optional[ContributionType] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[ContributionStatus] = None


class ContributionStatusUpdate(BaseModel):
    status: ContributionStatus


class ContributionRead(ContributionBase):
    id: int
    status: ContributionStatus
    user_id: int
    newsletter_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Templates
class TemplateBase(BaseModel):
    name: str
    layout_config: Optional[dict] = None
    description: Optional[str] = None


class TemplateCreate(TemplateBase):
    pass


class TemplateRead(TemplateBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
