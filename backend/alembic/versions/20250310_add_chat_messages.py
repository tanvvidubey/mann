"""Add chat_messages JSON column to entries for entry-as-chat-room.

Revision ID: 20250310_chat
Revises: 20250310_profile
Create Date: 2025-03-10

"""
from typing import Sequence, Union

from alembic import op

revision: str = "20250310_chat"
down_revision: Union[str, None] = "20250310_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE entries ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]'::jsonb")


def downgrade() -> None:
    op.execute("ALTER TABLE entries DROP COLUMN IF EXISTS chat_messages")
