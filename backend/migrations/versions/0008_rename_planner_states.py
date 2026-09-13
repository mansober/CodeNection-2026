"""Use the product-facing planner state table name."""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    op.rename_table("frontend_states", "planner_states")
    op.drop_index("ix_frontend_states_user_id", table_name="planner_states")
    op.create_index("ix_planner_states_user_id", "planner_states", ["user_id"])


def downgrade():
    op.drop_index("ix_planner_states_user_id", table_name="planner_states")
    op.create_index("ix_frontend_states_user_id", "planner_states", ["user_id"])
    op.rename_table("planner_states", "frontend_states")
