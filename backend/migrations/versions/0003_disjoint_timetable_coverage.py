"""Preserve disjoint timetable windows without suppressing unreviewed days."""

from datetime import date

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("commitments", sa.Column("coverage_windows", sa.JSON(), nullable=True))
    table = sa.table(
        "commitments",
        sa.column("id", sa.Uuid()),
        sa.column("coverage_start", sa.Date()),
        sa.column("coverage_end", sa.Date()),
        sa.column("coverage_windows", sa.JSON()),
    )
    connection = op.get_bind()
    rows = connection.execute(sa.select(table.c.id, table.c.coverage_start, table.c.coverage_end))
    for row in rows:
        windows = (
            [{"start": row.coverage_start.isoformat(), "end": row.coverage_end.isoformat()}]
            if row.coverage_start and row.coverage_end
            else []
        )
        connection.execute(table.update().where(table.c.id == row.id).values(coverage_windows=windows))
    with op.batch_alter_table("commitments") as batch:
        batch.alter_column("coverage_windows", existing_type=sa.JSON(), nullable=False)
        batch.drop_column("coverage_start")
        batch.drop_column("coverage_end")


def downgrade():
    # A single range cannot represent disjoint coverage. Refuse a lossy rollback.
    connection = op.get_bind()
    table = sa.table("commitments", sa.column("id", sa.Uuid()), sa.column("coverage_windows", sa.JSON()))
    if any(len(row.coverage_windows) > 1 for row in connection.execute(sa.select(table))):
        raise RuntimeError("Cannot downgrade while commitments have disjoint timetable coverage")
    op.add_column("commitments", sa.Column("coverage_start", sa.Date(), nullable=True))
    op.add_column("commitments", sa.Column("coverage_end", sa.Date(), nullable=True))
    table = sa.table(
        "commitments",
        sa.column("id", sa.Uuid()),
        sa.column("coverage_windows", sa.JSON()),
        sa.column("coverage_start", sa.Date()),
        sa.column("coverage_end", sa.Date()),
    )
    for row in connection.execute(sa.select(table.c.id, table.c.coverage_windows)):
        if row.coverage_windows:
            window = row.coverage_windows[0]
            connection.execute(
                table.update()
                .where(table.c.id == row.id)
                .values(
                    coverage_start=date.fromisoformat(window["start"]),
                    coverage_end=date.fromisoformat(window["end"]),
                )
            )
    op.drop_column("commitments", "coverage_windows")
