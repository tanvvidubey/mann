"""Cache weekly suggestions on users (refreshed on new entry).

Revision ID: 20250311_sugg
Revises: 20250310_chat
Create Date: 2025-03-11

"""
from typing import Sequence, Union

from alembic import op

revision: str = "20250311_sugg"
down_revision: Union[str, None] = "20250310_chat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS suggestions_cache JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS suggestions_cache")
