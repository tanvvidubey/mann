"""Add profile and email verification columns to users, entry_type to entries.

Uses PostgreSQL ADD COLUMN IF NOT EXISTS so safe to run on DBs that already
have these columns (e.g. after create_all with new schema).

Revision ID: 20250310_profile
Revises:
Create Date: 2025-03-10

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20250310_profile"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: IF NOT EXISTS so migration is idempotent
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_change_token VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_change_expires TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies JSON")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS likes TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS dislikes TEXT")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS other_details TEXT")
    op.execute("ALTER TABLE entries ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'voice'")


def downgrade() -> None:
    op.execute("ALTER TABLE entries DROP COLUMN IF EXISTS entry_type")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS other_details")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS dislikes")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS likes")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS hobbies")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS bio")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS pin_change_expires")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS pin_change_token")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS email_verify_expires")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS email_verify_token")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS email_verified")
