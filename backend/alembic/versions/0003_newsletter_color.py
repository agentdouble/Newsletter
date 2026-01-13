"""newsletter color

Revision ID: 0003_newsletter_color
Revises: 0002_auth_login
Create Date: 2026-01-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_newsletter_color"
down_revision = "0002_auth_login"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "newsletters", sa.Column("color", sa.String(length=16), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("newsletters", "color")
