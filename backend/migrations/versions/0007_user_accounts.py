"""Add email and password credentials for user accounts."""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    # Nullable preserves any pre-auth development rows. The API never issues a
    # session for those rows, and every new account receives both fields.
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=512), nullable=True))
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade():
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
