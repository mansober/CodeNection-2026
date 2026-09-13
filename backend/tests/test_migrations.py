from datetime import UTC, date, datetime
from pathlib import Path
from uuid import uuid4

import sqlalchemy as sa
from alembic import command
from alembic.config import Config

from app.core.config import settings


def test_upgrade_preserves_import_coverage_and_metadata(tmp_path, monkeypatch):
    # Only ever migrates this test's temporary SQLite file, not the configured DB.
    url = f"sqlite:///{(tmp_path / 'migration-check.sqlite').as_posix()}"
    monkeypatch.setattr(settings, "database_url", url)
    root = Path(__file__).resolve().parents[1]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    command.upgrade(config, "0002")
    engine = sa.create_engine(url)
    metadata = sa.MetaData()
    metadata.reflect(engine)
    # Reflected SQLite UUID columns are CHAR(32), so bind their storage form.
    user_id, commitment_id = uuid4().hex, uuid4().hex
    now = datetime.now(UTC)
    common = {"created_at": now, "updated_at": now, "version": 1}
    with engine.begin() as connection:
        connection.execute(
            metadata.tables["users"]
            .insert()
            .values(id=user_id, timezone="UTC", registered_on=date(2026, 9, 12), plan_revision=0, **common)
        )
        connection.execute(
            metadata.tables["commitments"]
            .insert()
            .values(
                id=commitment_id,
                user_id=user_id,
                data={},
                import_source="old-import",
                coverage_start=date(2026, 9, 12),
                coverage_end=date(2026, 9, 20),
                **common,
            )
        )
    command.upgrade(config, "head")
    current = sa.Table("commitments", sa.MetaData(), autoload_with=engine)
    with engine.connect() as connection:
        windows = connection.scalar(
            sa.select(current.c.coverage_windows).where(current.c.id == commitment_id)
        )
        assert windows == [{"start": "2026-09-12", "end": "2026-09-20"}]
        assert connection.scalar(sa.select(current.c.import_source)) == "old-import"
    command.check(config)
    command.downgrade(config, "0002")
    restored = sa.Table("commitments", sa.MetaData(), autoload_with=engine)
    with engine.connect() as connection:
        assert connection.scalar(sa.select(restored.c.coverage_end)) == date(2026, 9, 20)
    command.upgrade(config, "head")
    command.check(config)
    engine.dispose()
