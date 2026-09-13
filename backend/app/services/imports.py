import csv
import hashlib
import io
import zipfile
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import UUID
from zoneinfo import ZoneInfo

import recurring_ical_events
from icalendar import Calendar

from app.api.dependencies import fail
from app.core.config import settings
from app.schemas.domain import ImportCandidate, TimetablePreview


def storage_path(key: str) -> Path:
    # Keys are generated UUIDs, never user-supplied filenames or file paths.
    normalized = UUID(key).hex
    root = settings.storage_dir.resolve()
    target = (root / normalized).resolve()
    if target.parent != root:
        raise ValueError("Invalid storage key")
    return target


def read_upload(upload, maximum: int | None = None) -> bytes:
    raw = upload.file.read((maximum or settings.max_upload_bytes) + 1)
    if len(raw) > (maximum or settings.max_upload_bytes):
        fail("file_too_large", "The file exceeds the configured size limit", 413)
    if not raw:
        fail("empty_file", "Choose a nonempty file", 422)
    return raw


def text_cards(raw: bytes, suffix: str):
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        fail("invalid_encoding", "Text materials must use UTF-8 encoding", 422)
    if "\x00" in text:
        fail("invalid_text", "This file contains binary data", 422)
    pairs = []
    structured = suffix in {".csv", ".tsv"}
    rows = (
        csv.reader(io.StringIO(text, newline=""), delimiter="\t" if suffix == ".tsv" else ",", strict=True)
        if structured
        else text.splitlines()
    )
    try:
        for index, row in enumerate(rows):
            if structured:
                pair = row if len(row) == 2 else None
                if (
                    index == 0
                    and pair
                    and tuple(v.strip().casefold() for v in pair)
                    in {
                        ("question", "answer"),
                        ("term", "definition"),
                    }
                ):
                    continue
            else:
                separator = "\t" if "\t" in row else ":"
                pair = row.lstrip(" -*").split(separator, 1) if separator in row else None
            if pair and all(v.strip() for v in pair):
                question, answer = (v.strip() for v in pair)
                if len(question) <= 2000 and len(answer) <= 10000:
                    pairs.append((question, answer))
            if len(pairs) == 200:
                break
    except csv.Error:
        fail("invalid_delimited_text", "The CSV/TSV file contains an invalid or oversized field", 422)
    return pairs


def material_content(raw: bytes, filename: str):
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md", ".csv", ".tsv"}:
        return (
            {
                ".txt": "text/plain",
                ".md": "text/markdown",
                ".csv": "text/csv",
                ".tsv": "text/tab-separated-values",
            }[suffix],
            text_cards(raw, suffix),
            "ready",
        )
    if suffix == ".pdf" and raw.startswith(b"%PDF-"):
        return "application/pdf", [], "manual_cards_required"
    if suffix == ".pptx":
        try:
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                entries = archive.infolist()
                names = {v.filename for v in entries}
                if len(entries) > 5000 or sum(v.file_size for v in entries) > 100 * 1024 * 1024:
                    fail("document_too_large", "The slide archive expands beyond the document limit", 413)
                if "[Content_Types].xml" in names and "ppt/presentation.xml" in names:
                    return (
                        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        [],
                        "manual_cards_required",
                    )
        except zipfile.BadZipFile:
            pass
    fail("unsupported_file", "Use UTF-8 TXT/MD/CSV/TSV, a PDF, or a PPTX file", 415)


def preview_timetable(
    raw: bytes, start: date, end: date, user_timezone: str, default_minutes: int
) -> TimetablePreview:
    if end < start or (end - start).days >= settings.max_import_days:
        fail("invalid_date_range", f"Import a range of 1 to {settings.max_import_days} days", 422)
    try:
        calendar = Calendar.from_ical(raw)
        events = calendar.walk("VEVENT")
        if len(events) > 100:
            fail("too_many_events", "Import up to 100 event definitions at a time", 422)
        for event in events:
            rule = event.get("RRULE")
            if rule and (
                str(rule.get("FREQ", [""])[0]) not in {"DAILY", "WEEKLY"}
                or any(k in rule for k in ("BYSECOND", "BYMINUTE", "BYHOUR"))
            ):
                fail(
                    "unsupported_recurrence",
                    "This import supports daily and weekly recurrence; simplify the calendar or enter other events manually",
                    422,
                )
        expanded = recurring_ical_events.of(calendar).between(
            start - timedelta(days=1), end + timedelta(days=2)
        )
    except (ValueError, TypeError, KeyError, OverflowError) as exc:
        fail("invalid_calendar", f"The calendar could not be read ({type(exc).__name__})", 422)
    if len(expanded) > 2000:
        fail("too_many_occurrences", "Reduce the import date range", 422)
    groups = {}
    warnings = {"Only occurrences within this date range will be imported; import again for a later term."}
    for event in expanded:
        start_value = event.decoded("DTSTART", None)
        title = str(event.get("SUMMARY", "")).strip()
        if not isinstance(start_value, date) or not title:
            warnings.add("Some events without a start date or title were omitted.")
            continue
        event_date = (
            start_value.astimezone(ZoneInfo(user_timezone)).date()
            if isinstance(start_value, datetime) and start_value.tzinfo
            else start_value.date()
            if isinstance(start_value, datetime)
            else start_value
        )
        if not start <= event_date <= end:
            continue
        finish = event.decoded("DTEND", None)
        minutes = default_minutes
        if isinstance(start_value, datetime):
            if start_value.tzinfo is None:
                warnings.add("Floating event dates were interpreted in your planner timezone.")
            if isinstance(finish, datetime):
                if bool(start_value.tzinfo) != bool(finish.tzinfo):
                    warnings.add("Some events with inconsistent start/end timezones were omitted.")
                    continue
                begin = start_value.astimezone(UTC) if start_value.tzinfo else start_value
                stop = finish.astimezone(UTC) if finish.tzinfo else finish
                minutes = int((stop - begin).total_seconds() / 60)
        if not 1 <= minutes <= 1440:
            warnings.add("Some events with invalid or multi-day durations were omitted.")
            continue
        uid = str(event.get("UID", "")).strip() or hashlib.sha256(title.encode()).hexdigest()
        if len(title) > 160 or len(uid) > 512:
            warnings.add("Some event titles or identifiers were too long and were omitted.")
            continue
        key = uid, title, minutes
        groups.setdefault(key, set()).add(event_date)
    candidates = [
        ImportCandidate(source_uid=uid, module_name=title, dates=sorted(days), duration_minutes=minutes)
        for (uid, title, minutes), days in groups.items()
    ]
    if len(candidates) > 100:
        fail("too_many_groups", "Reduce the import date range or number of events", 422)
    warnings.add("Confirming replaces the estimated class routine within this reviewed date window.")
    return TimetablePreview(start_date=start, end_date=end, candidates=candidates, warnings=sorted(warnings))
