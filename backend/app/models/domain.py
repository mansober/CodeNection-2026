from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Entity:
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    version: Mapped[int] = mapped_column(Integer, default=1)


class Owned(Entity):
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)


class User(Entity, Base):
    __tablename__ = "users"
    timezone: Mapped[str] = mapped_column(String(64))
    registered_on: Mapped[date] = mapped_column(Date)
    plan_revision: Mapped[int] = mapped_column(Integer, default=0)


class SessionToken(Owned, Base):
    __tablename__ = "session_tokens"
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Baseline(Owned, Base):
    __tablename__ = "baselines"
    __table_args__ = (UniqueConstraint("user_id", "version"),)
    effective_from: Mapped[date] = mapped_column(Date, index=True)
    data: Mapped[dict] = mapped_column(JSON)
    limits: Mapped[dict] = mapped_column(JSON)
    policy_version: Mapped[str] = mapped_column(String(40))


class Module(Owned, Base):
    __tablename__ = "modules"
    __table_args__ = (UniqueConstraint("user_id", "normalized_name"),)
    name: Mapped[str] = mapped_column(String(160))
    normalized_name: Mapped[str] = mapped_column(String(160))


class Assignment(Owned, Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("user_id", "module_id", name="uq_assignments_user_module"),)
    module_id: Mapped[UUID] = mapped_column(ForeignKey("modules.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    start_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date, index=True)


class Commitment(Owned, Base):
    __tablename__ = "commitments"
    data: Mapped[dict] = mapped_column(JSON)
    module_id: Mapped[UUID | None] = mapped_column(ForeignKey("modules.id", ondelete="RESTRICT"), index=True)
    assignment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("assignments.id", ondelete="RESTRICT"), index=True
    )
    import_key: Mapped[str | None] = mapped_column(String(64))
    import_source: Mapped[str | None] = mapped_column(String(512))
    coverage_windows: Mapped[list] = mapped_column(JSON, default=list)
    __table_args__ = (UniqueConstraint("user_id", "import_key"),)


class OccurrenceOverride(Owned, Base):
    __tablename__ = "occurrence_overrides"
    __table_args__ = (UniqueConstraint("user_id", "occurrence_key"),)
    occurrence_key: Mapped[str] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(30))
    source_id: Mapped[str] = mapped_column(String(64), index=True)
    original_date: Mapped[date] = mapped_column(Date)
    target_date: Mapped[date] = mapped_column(Date, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class CheckIn(Owned, Base):
    __tablename__ = "check_ins"
    __table_args__ = (UniqueConstraint("user_id", "date"),)
    date: Mapped[date] = mapped_column(Date, index=True)
    data: Mapped[dict] = mapped_column(JSON)


class WeeklyNote(Owned, Base):
    __tablename__ = "weekly_notes"
    __table_args__ = (UniqueConstraint("user_id", "week_start"),)
    week_start: Mapped[date] = mapped_column(Date)
    text: Mapped[str] = mapped_column(String(10000))


class Recovery(Owned, Base):
    __tablename__ = "recovery_results"
    __table_args__ = (UniqueConstraint("user_id", "date"),)
    date: Mapped[date] = mapped_column(Date)
    data: Mapped[dict] = mapped_column(JSON)
    recommendation_code: Mapped[str] = mapped_column(String(60))


class Material(Owned, Base):
    __tablename__ = "materials"
    module_id: Mapped[UUID] = mapped_column(ForeignKey("modules.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    topic: Mapped[str] = mapped_column(String(160))
    lesson_date: Mapped[date] = mapped_column(Date)
    scope: Mapped[str] = mapped_column(String(16))
    media_type: Mapped[str] = mapped_column(String(120))
    size_bytes: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(64), unique=True)
    sha256: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(40))


class Flashcard(Owned, Base):
    __tablename__ = "flashcards"
    module_id: Mapped[UUID] = mapped_column(ForeignKey("modules.id", ondelete="RESTRICT"), index=True)
    material_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("materials.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(String(2000))
    answer: Mapped[str] = mapped_column(String(10000))
    topic: Mapped[str] = mapped_column(String(160))


class FileDeletion(Base):
    """Durable deletion intent; intentionally survives account deletion."""

    __tablename__ = "file_deletions"
    storage_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(String(64))
