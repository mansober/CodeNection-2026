from datetime import date


def merge_coverage(windows: list[dict[str, str]], start: date, end: date) -> list[dict[str, str]]:
    """Merge only overlapping or adjacent windows, retaining unreviewed gaps."""
    ranges = [(date.fromisoformat(w["start"]), date.fromisoformat(w["end"])) for w in windows]
    ranges.append((start, end))
    merged = []
    for left, right in sorted(ranges):
        if merged and (left - merged[-1][1]).days <= 1:
            merged[-1] = (merged[-1][0], max(right, merged[-1][1]))
        else:
            merged.append((left, right))
    return [{"start": left.isoformat(), "end": right.isoformat()} for left, right in merged]


def covers_class_day(commitment, day: date) -> bool:
    return commitment.data["category"] == "class" and any(
        window["start"] <= day.isoformat() <= window["end"]
        for window in getattr(commitment, "coverage_windows", [])
    )
