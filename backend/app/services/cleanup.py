from sqlalchemy import select

from app.models import FileDeletion, Material
from app.services.imports import storage_path


def queue_file_deletions(db, keys):
    """Call inside the same transaction that removes the material/account."""
    for key in keys:
        db.add(FileDeletion(storage_key=key))


def drain_file_deletions(db, *, keys=None, limit=100):
    """Retry-safe: unlink happens before acknowledging each durable intent.

    This owns its transaction and must run AFTER the deletion transaction commits.
    PostgreSQL SKIP LOCKED allows several maintenance workers to share the queue.
    """
    query = (
        select(FileDeletion).order_by(FileDeletion.created_at).limit(limit).with_for_update(skip_locked=True)
    )
    if keys is not None:
        query = query.where(FileDeletion.storage_key.in_(keys))
    deleted = failed = 0
    for item in db.scalars(query):
        item.attempts += 1
        if db.scalar(select(Material.id).where(Material.storage_key == item.storage_key)):
            item.last_error = "StillReferenced"
            failed += 1
            continue
        try:
            storage_path(item.storage_key).unlink(missing_ok=True)
        except (OSError, ValueError) as exc:
            # Keep paths, private filenames and file contents out of error records.
            item.last_error = type(exc).__name__[:64]
            failed += 1
        else:
            db.delete(item)
            deleted += 1
    db.commit()
    return {"deleted": deleted, "failed": failed}
