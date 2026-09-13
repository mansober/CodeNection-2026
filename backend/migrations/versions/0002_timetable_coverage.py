"""Record imported timetable coverage and stable calendar source identities."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("commitments", sa.Column("import_source", sa.String(512), nullable=True))
    op.add_column("commitments", sa.Column("coverage_start", sa.Date(), nullable=True))
    op.add_column("commitments", sa.Column("coverage_end", sa.Date(), nullable=True))


def downgrade():
    op.drop_column("commitments", "coverage_end")
    op.drop_column("commitments", "coverage_start")
    op.drop_column("commitments", "import_source")
