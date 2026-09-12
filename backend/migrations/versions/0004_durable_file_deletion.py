"""Persist private-file deletion intents independently of account lifetime."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "file_deletions",
        sa.Column("storage_key", sa.String(64), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.String(64), nullable=True),
    )
    op.create_index("ix_file_deletions_created_at", "file_deletions", ["created_at"])


def downgrade():
    table = sa.table("file_deletions", sa.column("storage_key", sa.String(64)))
    if op.get_bind().scalar(sa.select(sa.func.count()).select_from(table)):
        raise RuntimeError("Drain pending file deletions before downgrading")
    op.drop_table("file_deletions")
