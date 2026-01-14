import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(16), nullable=False, unique=True)
    role = Column(String(16), nullable=False)
    password_hash = Column(String(256), nullable=True)
    must_reset_password = Column(Boolean, nullable=False, server_default=text("true"))
    password_updated_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memberships = relationship(
        "GroupMembership", back_populates="user", cascade="all, delete-orphan"
    )
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "role in ('user', 'admin', 'superadmin')", name="user_role_check"
        ),
    )


class Group(Base):
    __tablename__ = "groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(128), nullable=False, unique=True)
    can_contribute = Column(Boolean, nullable=False, server_default=text("true"))
    can_approve = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memberships = relationship(
        "GroupMembership", back_populates="group", cascade="all, delete-orphan"
    )


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_admin = Column(Boolean, nullable=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash = Column(String(128), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")


class Edition(Base):
    __tablename__ = "editions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label = Column(String(256), nullable=False)
    period_start = Column(Date, nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="CASCADE"),
        nullable=False,
    )
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="SET NULL"),
        nullable=True,
    )
    author = Column(String(128), nullable=False)
    text = Column(Text, nullable=True)
    success_story = Column(Text, nullable=True)
    fail_story = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    edition = relationship("Edition")
    group = relationship("Group")


class Newsletter(Base):
    __tablename__ = "newsletters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(256), nullable=False)
    body = Column(Text, nullable=False)
    audience = Column(String(128), nullable=False)
    image_url = Column(Text, nullable=True)
    color = Column(String(16), nullable=True)
    group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("groups.id", ondelete="SET NULL"),
        nullable=True,
    )
    edition_id = Column(
        UUID(as_uuid=True),
        ForeignKey("editions.id", ondelete="SET NULL"),
        nullable=True,
    )
    reaction_up = Column(Integer, nullable=False, server_default=text("0"))
    reaction_down = Column(Integer, nullable=False, server_default=text("0"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    comments = relationship(
        "Comment",
        back_populates="newsletter",
        cascade="all, delete-orphan",
        order_by="desc(Comment.created_at)",
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    newsletter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("newsletters.id", ondelete="CASCADE"),
        nullable=False,
    )
    author = Column(String(128), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    newsletter = relationship("Newsletter", back_populates="comments")
