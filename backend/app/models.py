from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


class GlobalRole(str, enum.Enum):
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
    USER = "USER"


class NewsletterStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    COLLECTING = "COLLECTING"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    PUBLISHED = "PUBLISHED"


class ContributionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ContributionType(str, enum.Enum):
    SUCCESS = "SUCCESS"
    FAIL = "FAIL"
    INFO = "INFO"
    OTHER = "OTHER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    trigram = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    global_role = Column(Enum(GlobalRole), default=GlobalRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True, nullable=False)

    memberships = relationship("GroupMembership", back_populates="user", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="user")


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String)

    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    newsletters = relationship("Newsletter", back_populates="group")


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (UniqueConstraint("user_id", "group_id", name="uq_group_membership"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    role_in_group = Column(String, default="contributor")

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")


class Newsletter(Base):
    __tablename__ = "newsletters"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    period = Column(String, nullable=True)
    status = Column(Enum(NewsletterStatus), default=NewsletterStatus.DRAFT, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    layout_config = Column(JSON, nullable=True)
    rendered_html = Column(Text, nullable=True)

    group = relationship("Group", back_populates="newsletters")
    contributions = relationship("Contribution", back_populates="newsletter", cascade="all, delete-orphan")


class Contribution(Base):
    __tablename__ = "contributions"
    __table_args__ = (UniqueConstraint("newsletter_id", "user_id", "type", name="uq_contrib_unique"),)

    id = Column(Integer, primary_key=True, index=True)
    newsletter_id = Column(Integer, ForeignKey("newsletters.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(ContributionType), default=ContributionType.INFO, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(ContributionStatus), default=ContributionStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    newsletter = relationship("Newsletter", back_populates="contributions")
    user = relationship("User", back_populates="contributions")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    layout_config = Column(JSON, nullable=True)
    description = Column(String, nullable=True)
