"""Run periodically: uv run python -m app.maintenance --limit 100."""

import argparse
import json

from app.db.session import SessionLocal
from app.services.cleanup import drain_file_deletions


def main():
    parser = argparse.ArgumentParser(description="Retry pending private-file deletions")
    parser.add_argument("--limit", type=int, default=100)
    args = parser.parse_args()
    if not 1 <= args.limit <= 1000:
        parser.error("--limit must be between 1 and 1000")
    with SessionLocal() as db:
        result = drain_file_deletions(db, limit=args.limit)
    print(json.dumps(result))
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
