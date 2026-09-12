"""Match the module flow: each module has at most one assignment."""

from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("assignments") as batch:
        batch.create_unique_constraint("uq_assignments_user_module", ["user_id", "module_id"])


def downgrade():
    with op.batch_alter_table("assignments") as batch:
        batch.drop_constraint("uq_assignments_user_module", type_="unique")
