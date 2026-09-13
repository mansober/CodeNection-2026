"""Add per-user planner state storage."""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "frontend_states",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_frontend_states_user_id", "frontend_states", ["user_id"])


def downgrade():
    op.drop_index("ix_frontend_states_user_id", table_name="frontend_states")
    op.drop_table("frontend_states")
