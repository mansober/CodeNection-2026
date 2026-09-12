"""Initial Santai domain, independent of runtime model imports."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def common(owned=True):
    columns = [
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    ]
    if owned:
        columns.append(
            sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
        )
    return columns


def col(name, datatype, nullable=False, foreign=None, ondelete="RESTRICT"):
    args = [sa.ForeignKey(foreign, ondelete=ondelete)] if foreign else []
    return sa.Column(name, datatype, *args, nullable=nullable)


def upgrade():
    op.create_table(
        "users",
        *common(False),
        col("timezone", sa.String(64)),
        col("registered_on", sa.Date()),
        col("plan_revision", sa.Integer()),
    )
    op.create_table(
        "session_tokens",
        *common(),
        col("token_hash", sa.String(64)),
        col("expires_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_table(
        "baselines",
        *common(),
        col("effective_from", sa.Date()),
        col("data", sa.JSON()),
        col("limits", sa.JSON()),
        col("policy_version", sa.String(40)),
        sa.UniqueConstraint("user_id", "version"),
    )
    op.create_table(
        "modules",
        *common(),
        col("name", sa.String(160)),
        col("normalized_name", sa.String(160)),
        sa.UniqueConstraint("user_id", "normalized_name"),
    )
    op.create_table(
        "assignments",
        *common(),
        col("module_id", sa.Uuid(), foreign="modules.id"),
        col("name", sa.String(160)),
        col("start_date", sa.Date()),
        col("due_date", sa.Date(), True),
    )
    op.create_table(
        "commitments",
        *common(),
        col("data", sa.JSON()),
        col("module_id", sa.Uuid(), True, "modules.id"),
        col("assignment_id", sa.Uuid(), True, "assignments.id"),
        col("import_key", sa.String(64), True),
        sa.UniqueConstraint("user_id", "import_key"),
    )
    op.create_table(
        "occurrence_overrides",
        *common(),
        col("occurrence_key", sa.String(200)),
        col("source", sa.String(30)),
        col("source_id", sa.String(64)),
        col("original_date", sa.Date()),
        col("target_date", sa.Date()),
        col("data", sa.JSON()),
        sa.UniqueConstraint("user_id", "occurrence_key"),
    )
    op.create_table(
        "check_ins",
        *common(),
        col("date", sa.Date()),
        col("data", sa.JSON()),
        sa.UniqueConstraint("user_id", "date"),
    )
    op.create_table(
        "weekly_notes",
        *common(),
        col("week_start", sa.Date()),
        col("text", sa.String(10000)),
        sa.UniqueConstraint("user_id", "week_start"),
    )
    op.create_table(
        "recovery_results",
        *common(),
        col("date", sa.Date()),
        col("data", sa.JSON()),
        col("recommendation_code", sa.String(60)),
        sa.UniqueConstraint("user_id", "date"),
    )
    op.create_table(
        "materials",
        *common(),
        col("module_id", sa.Uuid(), foreign="modules.id"),
        col("name", sa.String(160)),
        col("topic", sa.String(160)),
        col("lesson_date", sa.Date()),
        col("scope", sa.String(16)),
        col("media_type", sa.String(120)),
        col("size_bytes", sa.Integer()),
        col("storage_key", sa.String(64)),
        col("sha256", sa.String(64)),
        col("status", sa.String(40)),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_table(
        "flashcards",
        *common(),
        col("module_id", sa.Uuid(), foreign="modules.id"),
        col("material_id", sa.Uuid(), True, "materials.id", "CASCADE"),
        col("question", sa.String(2000)),
        col("answer", sa.String(10000)),
        col("topic", sa.String(160)),
    )
    indexes = {
        "session_tokens": ["expires_at"],
        "baselines": ["effective_from"],
        "modules": [],
        "assignments": ["module_id", "due_date"],
        "commitments": ["module_id", "assignment_id"],
        "occurrence_overrides": ["source_id", "target_date"],
        "check_ins": ["date"],
        "weekly_notes": [],
        "recovery_results": [],
        "materials": ["module_id"],
        "flashcards": ["module_id", "material_id"],
    }
    for table, names in indexes.items():
        for name in ["user_id", *names]:
            op.create_index(f"ix_{table}_{name}", table, [name])


def downgrade():
    for table in (
        "flashcards",
        "materials",
        "recovery_results",
        "weekly_notes",
        "check_ins",
        "occurrence_overrides",
        "commitments",
        "assignments",
        "modules",
        "baselines",
        "session_tokens",
        "users",
    ):
        op.drop_table(table)
