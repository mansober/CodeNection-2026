from datetime import date, timedelta
from uuid import UUID

import pytest
from sqlalchemy import func, select

from app.core.config import settings
from app.models import Commitment, SessionToken, User
from app.schemas.domain import BaselineWrite
from app.services.scoring import calibrate, demand


def revision(client):
    return client.get("/v1/me").json()["plan_revision"]


def today(auth):
    return date.fromisoformat(auth["user"]["registered_on"])


def baseline(client):
    routines = [
        {"kind": "study", "duration_minutes": 60, "days_per_week": 7},
        {"kind": "sport", "duration_minutes": 30, "days_per_week": 7},
        {"kind": "classes", "duration_minutes": 120, "days_per_week": 7},
    ]
    payload = {
        "routines": routines,
        "answers": {"mental": "some", "physical": "some", "social": "some", "free_time": "60_to_120"},
        "recovery_minutes_per_week": 180,
        "expected_revision": revision(client),
    }
    result = client.put("/v1/baseline", json=payload)
    assert result.status_code == 200, result.text
    return result.json()


def commitment(day, **extra):
    return {
        "name": "Club practice",
        "category": "club",
        "schedule": {"kind": "once", "date": str(day)},
        "duration_minutes": 60,
        "effort": {"mental": 3, "physical": 1, "social": 4},
        **extra,
    }


def create_commitment(client, payload):
    result = client.post("/v1/commitments", json=payload)
    assert result.status_code == 201, result.text
    return result.json()


def plan(client, day, end=None):
    result = client.get("/v1/planner", params={"start_date": str(day), "end_date": str(end or day)})
    assert result.status_code == 200, result.text
    return result.json()


def module(client, name="Data Structures"):
    result = client.post("/v1/modules", json={"name": name})
    assert result.status_code == 201, result.text
    return result.json()


def assignment(client, day, module_id):
    result = client.post(
        "/v1/assignments",
        json={
            "module_id": module_id,
            "start_date": str(day),
            "due_date": str(day + timedelta(days=7)),
        },
    )
    assert result.status_code == 201, result.text
    return result.json()


def action(client, occurrence, name, **extra):
    return client.post(
        "/v1/planner/actions",
        json={
            "occurrence_key": occurrence["key"],
            "original_date": occurrence["original_date"],
            "action": name,
            "expected_revision": revision(client),
            **extra,
        },
    )


def test_api_schema_and_health(client):
    assert client.get("/health").status_code == 200
    assert client.get("/ready").json() == {"status": "ready"}
    schema = client.get("/openapi.json").json()
    assert "/v1/planner/what-if" in schema["paths"]
    assert "discriminator" in schema["components"]["schemas"]["CommitmentWrite"]["properties"]["schedule"]
    day_fields = schema["components"]["schemas"]["DayRead"]["properties"]
    assert "energy_score" in day_fields and "planning_room_score" not in day_fields
    assert (
        client.get("/v1/planner", params={"start_date": "2026-09-12", "end_date": "2026-09-12"}).status_code
        == 401
    )


def test_guest_token_is_hashed_rotates_and_logs_out(client, auth, db):
    token = auth["access_token"]
    hashes = list(db.scalars(select(SessionToken.token_hash)))
    assert token not in hashes and all(len(value) == 64 for value in hashes)
    rotated = client.post("/v1/auth/refresh")
    assert rotated.status_code == 200
    assert client.get("/v1/me").status_code == 401
    client.headers["Authorization"] = "Bearer " + rotated.json()["access_token"]
    assert client.get("/v1/me").status_code == 200
    assert client.post("/v1/auth/logout").status_code == 204
    assert client.get("/v1/me").status_code == 401


def test_ownership_for_read_write_and_relations(client, auth):
    first = module(client)
    first_token = auth["access_token"]
    second = client.post("/v1/auth/guest", json={"timezone": "UTC"}).json()
    client.headers["Authorization"] = "Bearer " + second["access_token"]
    assert client.get("/v1/modules").json() == []
    assert (
        client.put(
            f"/v1/modules/{first['id']}", json={"name": "Changed"}, headers={"X-Resource-Version": "1"}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/v1/assignments", json={"module_id": first["id"], "start_date": "2026-09-12"}
        ).status_code
        == 404
    )
    client.headers["Authorization"] = "Bearer " + first_token
    assert client.get("/v1/modules").json()[0]["name"] == first["name"]


@pytest.mark.parametrize(
    "change",
    [
        {"duration_minutes": True},
        {"duration_minutes": "60"},
        {"duration_minutes": -1},
        {"effort": {"mental": 6, "physical": 0, "social": 0}},
        {"user_id": "untrusted"},
        {"schedule": {"kind": "weekly", "start_date": "2026-09-12", "weekdays": [1, 1]}},
        {"schedule": {"kind": "daily", "start_date": "2026-09-15", "end_date": "2026-09-12"}},
    ],
)
def test_invalid_payloads_are_rejected(client, auth, change):
    assert client.post("/v1/commitments", json=commitment(today(auth), **change)).status_code == 422


def test_version_conflict_and_duplicate_name(client, auth):
    row = module(client)
    result = client.put(
        f"/v1/modules/{row['id']}", json={"name": "Algorithms"}, headers={"X-Resource-Version": "1"}
    )
    assert result.json()["version"] == 2
    assert (
        client.put(
            f"/v1/modules/{row['id']}", json={"name": "Stale"}, headers={"X-Resource-Version": "1"}
        ).status_code
        == 409
    )
    assert client.post("/v1/modules", json={"name": "ALGORITHMS"}).status_code == 409
    assert client.get("/v1/modules").json()[0]["name"] == "Algorithms"


def test_module_has_one_generated_assignment_and_rename_follows_module(client, auth):
    day = today(auth)
    m = module(client)
    first = assignment(client, day, m["id"])
    assert first["name"] == "Data Structures assignment"
    duplicate = client.post(
        "/v1/assignments",
        json={"module_id": m["id"], "start_date": str(day), "due_date": None},
    )
    assert duplicate.status_code == 409
    renamed = client.put(
        f"/v1/modules/{m['id']}",
        json={"name": "Algorithms"},
        headers={"X-Resource-Version": "1"},
    )
    assert renamed.status_code == 200, renamed.text
    saved = client.get("/v1/assignments").json()[0]
    assert saved["name"] == "Algorithms assignment" and saved["version"] == 2


@pytest.mark.parametrize(
    ("path", "payload", "field"),
    [
        (
            "/v1/baseline",
            {
                "routines": [
                    {
                        "kind": "study",
                        "duration_minutes": 60,
                        "days_per_week": 5,
                        "weekdays": [1, 2, 3, 4, 5],
                    }
                ],
                "answers": {"mental": "some", "free_time": "60_to_120"},
                "recovery_minutes_per_week": 180,
                "expected_revision": 0,
            },
            "weekdays",
        ),
        (
            "/v1/check-ins/2026-09-13",
            {"stress": 1, "reported_energy": 8},
            "reported_energy",
        ),
    ],
)
def test_uncollected_frontend_fields_are_rejected(client, auth, path, payload, field):
    result = client.put(path, json=payload, params={"expected_revision": revision(client)})
    assert result.status_code == 422
    assert any(error["loc"][-1] == field for error in result.json()["detail"])


def test_uncollected_commitment_and_assignment_fields_are_rejected(client, auth):
    day = today(auth)
    m = module(client)
    assignment_result = client.post(
        "/v1/assignments",
        json={"module_id": m["id"], "name": "Custom name", "start_date": str(day)},
    )
    assert assignment_result.status_code == 422
    commitment_result = client.post(
        "/v1/commitments",
        json=commitment(day, baseline_routine="study"),
    )
    assert commitment_result.status_code == 422


def test_workload_formula_and_unknown_capacity():
    assert demand(60, {"mental": 4, "physical": 0, "social": 2}) == {
        "time": 60,
        "mental": 48,
        "physical": 0,
        "social": 24,
    }
    payload = BaselineWrite(
        routines=[{"kind": "study", "duration_minutes": 60, "days_per_week": 7}],
        answers={"mental": "some", "free_time": "30_to_60"},
        recovery_minutes_per_week=180,
        expected_revision=0,
    )
    limits = calibrate(payload)
    assert limits["mental"] == 60 and limits["time"] == 105
    assert limits["physical"] is None and limits["social"] is None


def test_scoring_policy_is_public_and_transparent(client):
    client.headers.pop("Authorization", None)
    result = client.get("/v1/planner/policy")
    assert result.status_code == 200, result.text
    policy = result.json()
    assert policy["policy_version"] == "planning-v1"
    assert policy["dimensions"]["mental"]["formula"] == "duration_minutes * effort / 5"
    assert policy["status_bands_percent"] == {
        "moderate": 60.0,
        "high": 85.0,
        "over_limit": 100.0,
    }
    assert "10_if_recovery_completed_today" in policy["energy_score_formula"]
    assert policy["purpose"] == "Estimate date-based workload against a personal planning envelope"
    assert "status bands are provisional product rules" in policy["guardrails"]


def test_assignment_deadline_counts_zero_and_study_allocation_once(client, auth):
    day = today(auth)
    baseline(client)
    a = assignment(client, day, module(client)["id"])
    before = plan(client, day)["days"][0]["capacities"]["time"]["used"]
    create_commitment(
        client,
        commitment(
            day,
            name="Work on trees",
            category="assignment_work",
            module_id=a["module_id"],
            assignment_id=a["id"],
        ),
    )
    after = plan(client, day)["days"][0]
    assert after["capacities"]["time"]["used"] == before
    due = plan(client, date.fromisoformat(a["due_date"]))["days"][0]
    assert len(due["deadlines"]) == 1
    assert not any(i["category"] == "assignment_work" for i in due["occurrences"])


def test_actions_compose_restore_and_only_change_one_occurrence(client, auth):
    day = today(auth)
    baseline(client)
    row = create_commitment(client, commitment(day, schedule={"kind": "daily", "start_date": str(day)}))
    original = next(i for i in plan(client, day)["days"][0]["occurrences"] if i["source_id"] == row["id"])
    assert action(client, original, "move", target_date=str(day + timedelta(days=1))).status_code == 200
    assert action(client, original, "lighten", duration_minutes=30).status_code == 200
    tomorrow = plan(client, day + timedelta(days=1))["days"][0]
    same_series = [i for i in tomorrow["occurrences"] if i["source_id"] == row["id"]]
    assert sorted(i["duration_minutes"] for i in same_series) == [30, 60]
    assert action(client, original, "skip").status_code == 200
    assert action(client, original, "keep").status_code == 200
    restored = [i for i in plan(client, day)["days"][0]["occurrences"] if i["source_id"] == row["id"]]
    assert len(restored) == 1 and restored[0]["duration_minutes"] == 60


def test_skip_does_not_refill_baseline_and_help_does_not_reduce_load(client, auth):
    day = today(auth)
    baseline(client)
    a = assignment(client, day, module(client)["id"])
    row = create_commitment(
        client,
        commitment(
            day,
            category="assignment_work",
            module_id=a["module_id"],
            assignment_id=a["id"],
        ),
    )
    current = plan(client, day)["days"][0]
    item = next(i for i in current["occurrences"] if i["source_id"] == row["id"])
    used = current["capacities"]["time"]["used"]
    assert action(client, item, "ask_help", helper_note="Teammate").status_code == 200
    assert plan(client, day)["days"][0]["capacities"]["time"]["used"] == used
    assert action(client, item, "skip").status_code == 200
    assert plan(client, day)["days"][0]["capacities"]["time"]["used"] == used - 60


def test_recurrence_deadline_and_move_validation(client, auth):
    day = today(auth)
    invalid = commitment(
        day,
        category="competition",
        deadline=str(day + timedelta(days=2)),
        schedule={"kind": "daily", "start_date": str(day)},
    )
    assert client.post("/v1/commitments", json=invalid).status_code == 422
    row = create_commitment(client, commitment(day, category="competition", deadline=str(day)))
    item = plan(client, day)["days"][0]["occurrences"][0]
    assert item["source_id"] == row["id"]
    assert action(client, item, "move", target_date=str(day + timedelta(days=1))).status_code == 422


def test_weekly_schedule_uses_frontend_sunday_zero_weekdays(client, auth):
    start = today(auth)
    sunday = start + timedelta(days=(6 - start.weekday()) % 7)
    baseline(client)
    row = create_commitment(
        client,
        commitment(
            sunday,
            schedule={"kind": "weekly", "start_date": str(sunday), "weekdays": [0]},
        ),
    )
    assert any(item["source_id"] == row["id"] for item in plan(client, sunday)["days"][0]["occurrences"])
    assert not any(
        item["source_id"] == row["id"]
        for item in plan(client, sunday + timedelta(days=1))["days"][0]["occurrences"]
    )


def test_what_if_is_pure_and_checks_every_repeated_day(client, auth, db):
    day = today(auth)
    baseline(client)
    initial_revision = revision(client)
    count = db.scalar(select(func.count()).select_from(Commitment))
    response = client.post(
        "/v1/planner/what-if",
        json={
            "commitment": commitment(
                day,
                schedule={"kind": "daily", "start_date": str(day), "end_date": str(day + timedelta(days=2))},
            ),
            "start_date": str(day),
            "end_date": str(day + timedelta(days=2)),
        },
    )
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["added"] is False
    assert all(
        after["capacities"]["time"]["used"] - before["capacities"]["time"]["used"] == 60
        for before, after in zip(result["before"]["days"], result["after"]["days"])
    )
    assert db.scalar(select(func.count()).select_from(Commitment)) == count
    assert revision(client) == initial_revision


def test_unscheduled_work_does_not_count(client, auth):
    day = today(auth)
    row = create_commitment(client, commitment(day, schedule={"kind": "unscheduled"}))
    result = plan(client, day)
    assert result["unscheduled"][0]["id"] == row["id"]
    assert result["days"][0]["capacities"]["time"]["used"] == 0
    assert result["days"][0]["assessment_complete"] is False


def test_check_in_eligibility_assignment_plan_and_streak(client, auth, db):
    day = today(auth)
    baseline(client)
    payload = {"stress": 3, "sport_today": False}
    assert (
        client.put(
            f"/v1/check-ins/{day}", json=payload, params={"expected_revision": revision(client)}
        ).status_code
        == 422
    )
    user = db.get(User, UUID(auth["user"]["id"]))
    user.registered_on = day - timedelta(days=1)
    db.commit()
    a = assignment(client, day, module(client)["id"])
    payload["assignment_plans"] = [{"assignment_id": a["id"], "planned_percent": 20}]
    result = client.put(f"/v1/check-ins/{day}", json=payload, params={"expected_revision": revision(client)})
    assert result.status_code == 200, result.text
    dashboard = client.get("/v1/dashboard").json()
    assert dashboard["streak"] == 1 and dashboard["check_in_saved"] is True
    assert dashboard["today"]["reported_stress"] == 3
    assert not any(i["source_id"] == "sport" for i in dashboard["today"]["occurrences"])
    study = [i for i in dashboard["today"]["occurrences"] if i["baseline_routine"] == "study"]
    assert sum(i["duration_minutes"] for i in study) == 60
    assert len(study) == 1 and study[0]["source"] == "assignment_plan"
    assert any(
        i["source_id"] == "sport" for i in plan(client, day + timedelta(days=1))["days"][0]["occurrences"]
    )


def test_assignment_percentages_weight_estimated_study_time(client, auth, db):
    day = today(auth)
    baseline(client)
    m = module(client)
    first = assignment(client, day, m["id"])
    second = assignment(client, day, module(client, "Algorithms")["id"])
    eligible_check_in(
        client,
        auth,
        db,
        [
            {"assignment_id": first["id"], "planned_percent": 20},
            {"assignment_id": second["id"], "planned_percent": 80},
        ],
    )
    intentions = [
        item for item in plan(client, day)["days"][0]["occurrences"] if item["source"] == "assignment_plan"
    ]
    assert sorted((item["duration_minutes"], item["planned_percent"]) for item in intentions) == [
        (12.0, 20),
        (48.0, 80),
    ]
    assert all(item["estimated"] for item in intentions)


def test_recovery_adds_one_display_energy_bonus_and_is_today_only(client, auth):
    day = today(auth)
    baseline(client)
    before = plan(client, day)["days"][0]["energy_score"]
    for _ in range(2):
        result = client.put(
            f"/v1/recovery/{day}",
            json={"completed": True, "reflection": "better"},
            params={"expected_revision": revision(client)},
        )
        assert result.status_code == 200, result.text
    assert plan(client, day)["days"][0]["energy_score"] == min(100, before + 10)
    assert (
        client.put(
            f"/v1/recovery/{day + timedelta(days=1)}",
            json={"completed": True},
            params={"expected_revision": revision(client)},
        ).status_code
        == 422
    )
    assert (
        client.put(
            f"/v1/recovery/{day}",
            json={"completed": False, "reflection": "better"},
            params={"expected_revision": revision(client)},
        ).status_code
        == 422
    )


def test_material_roundtrip_cards_and_private_download(client, auth):
    m = module(client)
    raw = b"Tree: A connected acyclic graph\nStack\tLast in, first out\n"
    uploaded = client.post(
        "/v1/materials",
        data={"module_id": m["id"], "lesson_date": str(today(auth))},
        files={"file": ("notes.txt", raw, "text/plain")},
    )
    assert uploaded.status_code == 201, uploaded.text
    material = uploaded.json()
    assert "storage_key" not in material and material["status"] == "ready"
    assert len(client.get("/v1/flashcards").json()) == 2
    file_url = f"/v1/materials/{material['id']}/file"
    assert client.get(file_url).content == raw
    second = client.post("/v1/auth/guest", json={"timezone": "UTC"}).json()
    assert (
        client.get(file_url, headers={"Authorization": "Bearer " + second["access_token"]}).status_code == 404
    )
    assert client.delete(f"/v1/materials/{material['id']}").status_code == 204
    assert client.get("/v1/flashcards").json() == []
    assert list(settings.storage_dir.iterdir()) == []


def test_material_type_and_size_errors(client, auth, monkeypatch):
    m = module(client)
    data = {"module_id": m["id"], "lesson_date": str(today(auth))}
    assert (
        client.post("/v1/materials", data=data, files={"file": ("fake.pdf", b"not a PDF")}).status_code == 415
    )
    monkeypatch.setattr(settings, "max_upload_bytes", 5)
    assert (
        client.post("/v1/materials", data=data, files={"file": ("notes.txt", b"too large")}).status_code
        == 413
    )


def test_timetable_review_is_pure_and_confirm_deduplicates(client, auth):
    day = today(auth)
    baseline(client)
    end = day + timedelta(days=14)
    raw = (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Santai tests//EN\r\nBEGIN:VEVENT\r\nUID:lecture-1\r\n"
        f"DTSTART:{day:%Y%m%d}T090000\r\nDTEND:{day:%Y%m%d}T100000\r\n"
        "RRULE:FREQ=WEEKLY;COUNT=3\r\nSUMMARY:Algorithms\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
    ).encode()
    preview = client.post(
        "/v1/imports/timetable/preview",
        data={"start_date": str(day), "end_date": str(end)},
        files={"file": ("classes.ics", raw, "text/calendar")},
    )
    assert preview.status_code == 200, preview.text
    assert client.get("/v1/modules").json() == []
    candidates = preview.json()["candidates"]
    assert len(candidates) == 1 and len(candidates[0]["dates"]) == 3
    for expected in [1, 0]:
        result = client.post(
            "/v1/imports/timetable/confirm",
            json={
                "start_date": str(day),
                "end_date": str(end),
                "candidates": candidates,
                "expected_revision": revision(client),
            },
        )
        assert result.status_code == 201, result.text
        assert len(result.json()["created_commitment_ids"]) == expected
    assert len(client.get("/v1/commitments").json()) == 1
    assert plan(client, day)["days"][0]["capacities"]["time"]["used"] == 150
    assert plan(client, day + timedelta(days=1))["days"][0]["capacities"]["time"]["used"] == 90


def test_export_excludes_secrets_and_deletion_removes_owned_data(client, auth, db):
    module(client)
    data = client.get("/v1/me/export")
    assert data.status_code == 200, data.text
    assert (
        auth["access_token"] not in data.text
        and "token_hash" not in data.text
        and "storage_key" not in data.text
    )
    assert client.delete("/v1/me").status_code == 204
    assert client.get("/v1/me").status_code == 401
    assert db.get(User, UUID(auth["user"]["id"])) is None


def test_diary_remains_local_and_errors_do_not_echo_private_values(client, auth):
    result = client.put(
        f"/v1/check-ins/{today(auth)}",
        json={"stress": 1, "diary": "very-private-content"},
        params={"expected_revision": revision(client)},
    )
    assert result.status_code == 422
    assert "very-private-content" not in result.text


def confirm_class(client, start, end, event_day, duration=60):
    return client.post(
        "/v1/imports/timetable/confirm",
        json={
            "start_date": str(start),
            "end_date": str(end),
            "candidates": [
                {
                    "source_uid": "coverage-test",
                    "module_name": "Algorithms",
                    "dates": [str(event_day)],
                    "duration_minutes": duration,
                }
            ],
            "expected_revision": revision(client),
        },
    )


def test_import_coverage_extends_identical_dates_but_preserves_gaps(client, auth, db):
    day = today(auth)
    baseline(client)
    first = confirm_class(client, day, day, day)
    assert first.status_code == 201, first.text
    key = first.json()["created_commitment_ids"][0]
    second = confirm_class(client, day, day + timedelta(days=2), day)
    assert second.status_code == 201, second.text
    assert second.json()["updated_commitment_ids"] == [key]
    assert plan(client, day + timedelta(days=1))["days"][0]["capacities"]["time"]["used"] == 90
    later = day + timedelta(days=6)
    third = confirm_class(client, later, later + timedelta(days=2), later)
    assert third.status_code == 201, third.text
    assert third.json()["updated_commitment_ids"] == [key]
    assert plan(client, day + timedelta(days=4))["days"][0]["capacities"]["time"]["used"] == 210
    assert plan(client, later + timedelta(days=1))["days"][0]["capacities"]["time"]["used"] == 90
    unchanged = revision(client)
    assert confirm_class(client, later, later + timedelta(days=2), later).json()[
        "existing_commitment_ids"
    ] == [key]
    assert revision(client) == unchanged
    assert len(db.get(Commitment, UUID(key)).coverage_windows) == 2
    assert len(client.get("/v1/commitments").json()) == 1


@pytest.mark.parametrize("edit", ["category", "schedule"])
def test_manual_import_edit_detaches_coverage(client, auth, db, edit):
    day = today(auth)
    baseline(client)
    created = confirm_class(client, day, day + timedelta(days=2), day).json()["created_commitment_ids"][0]
    row = client.get("/v1/commitments").json()[0]
    payload = {k: v for k, v in row.items() if k not in {"id", "version"}}
    if edit == "category":
        payload.update(category="club")
    else:
        payload["schedule"] = {"kind": "once", "date": str(day)}
    result = client.put(f"/v1/commitments/{created}", json=payload, headers={"X-Resource-Version": "1"})
    assert result.status_code == 200, result.text
    saved = db.get(Commitment, UUID(created))
    assert saved.coverage_windows == [] and saved.import_source is None and saved.import_key is None
    assert plan(client, day + timedelta(days=1))["days"][0]["capacities"]["time"]["used"] == 210


def test_conflicting_import_rolls_back_without_duplicate_classes(client, auth):
    day = today(auth)
    assert confirm_class(client, day, day, day).status_code == 201
    initial = revision(client)
    assert confirm_class(client, day, day, day, duration=90).status_code == 409
    assert revision(client) == initial
    assert len(client.get("/v1/commitments").json()) == 1


@pytest.mark.parametrize("remove_deadline", [False, True])
def test_assignment_deadline_edits_refresh_adjustments(client, auth, remove_deadline):
    day = today(auth)
    a = assignment(client, day, module(client)["id"])
    row = create_commitment(
        client,
        commitment(
            day,
            category="assignment_work",
            module_id=a["module_id"],
            assignment_id=a["id"],
        ),
    )
    original = next(i for i in plan(client, day)["days"][0]["occurrences"] if i["source_id"] == row["id"])
    assert action(client, original, "lighten", duration_minutes=30).status_code == 200
    due = None if remove_deadline else str(day + timedelta(days=12))
    payload = {k: a[k] for k in ("module_id", "start_date", "due_date")}
    payload["due_date"] = due
    updated = client.put(f"/v1/assignments/{a['id']}", json=payload, headers={"X-Resource-Version": "1"})
    assert updated.status_code == 200, updated.text
    assert plan(client, day)["days"][0]["occurrences"][0]["deadline"] == due
    moved = action(client, original, "move", target_date=str(day + timedelta(days=10)))
    assert moved.status_code == 200, moved.text
    assert moved.json()["deadline"] == due


@pytest.mark.parametrize("assignment_draft", [False, True])
def test_what_if_illustrative_date_obeys_deadline(client, auth, assignment_draft):
    day = today(auth)
    draft = commitment(day, category="competition", deadline=str(day), schedule={"kind": "unscheduled"})
    if assignment_draft:
        a = assignment(client, day, module(client)["id"])
        draft.update(
            category="assignment_work",
            deadline=None,
            module_id=a["module_id"],
            assignment_id=a["id"],
        )
    initial = revision(client)
    result = client.post(
        "/v1/planner/what-if",
        json={
            "commitment": draft,
            "start_date": str(day),
            "end_date": str(day + timedelta(days=10)),
            "illustrative_date": str(day + timedelta(days=10)),
        },
    )
    assert result.status_code == 422, result.text
    assert revision(client) == initial and client.get("/v1/commitments").json() == []


def eligible_check_in(client, auth, db, plans):
    day = today(auth)
    db.get(User, UUID(auth["user"]["id"])).registered_on = day - timedelta(days=1)
    db.commit()
    result = client.put(
        f"/v1/check-ins/{day}",
        json={"stress": 1, "assignment_plans": plans},
        params={"expected_revision": revision(client)},
    )
    assert result.status_code == 200, result.text


def test_missing_goal_duration_marks_assessment_and_distribution_incomplete(client, auth, db):
    day = today(auth)
    result = client.put(
        "/v1/baseline",
        json={
            "routines": [{"kind": "sport", "duration_minutes": 60, "days_per_week": 7}],
            "answers": {"mental": "some", "physical": "some", "social": "some", "free_time": "60_to_120"},
            "recovery_minutes_per_week": 180,
            "expected_revision": revision(client),
        },
    )
    assert result.status_code == 200, result.text
    a = assignment(client, day, module(client)["id"])
    eligible_check_in(client, auth, db, [{"assignment_id": a["id"], "planned_percent": 20}])
    result = plan(client, day)
    current = result["days"][0]
    assert all(c["limit"] is not None for c in current["capacities"].values())
    assert current["assessment_complete"] is False and current["status"] == "incomplete"
    assert current["energy_score"] is None
    assert all(value is None for value in result["weekly_recovery_room"].values())
    distribution = client.get(
        "/v1/planner/distribution", params={"start_date": str(day), "end_date": str(day)}
    ).json()
    assert distribution["assessment_complete"] is False
    assert all(v["relative_demand_share_percent"] is None for v in distribution["capacities"].values())


def test_moving_estimated_intention_is_not_missing_duration(client, auth, db):
    day = today(auth)
    baseline(client)
    a = assignment(client, day, module(client)["id"])
    eligible_check_in(client, auth, db, [{"assignment_id": a["id"], "planned_percent": 20}])
    item = next(i for i in plan(client, day)["days"][0]["occurrences"] if i["source"] == "assignment_plan")
    assert action(client, item, "move", target_date=str(day + timedelta(days=1))).status_code == 200
    assert plan(client, day)["days"][0]["assessment_complete"] is True


def test_assignment_dates_cannot_exclude_saved_intentions(client, auth, db):
    day = today(auth)
    a = assignment(client, day, module(client)["id"])
    eligible_check_in(client, auth, db, [{"assignment_id": a["id"], "planned_percent": 20}])
    payload = {k: a[k] for k in ("module_id", "start_date", "due_date")}
    payload["start_date"] = str(day + timedelta(days=1))
    initial = revision(client)
    result = client.put(f"/v1/assignments/{a['id']}", json=payload, headers={"X-Resource-Version": "1"})
    assert result.status_code == 409, result.text
    assert revision(client) == initial


@pytest.mark.parametrize("delete_account", [False, True])
def test_file_deletion_failure_is_durable_and_retryable(client, auth, db, monkeypatch, delete_account):
    from pathlib import Path

    from app.models import FileDeletion, Material
    from app.services.cleanup import drain_file_deletions
    from app.services.imports import storage_path

    m = module(client)
    uploaded = client.post(
        "/v1/materials",
        data={"module_id": m["id"], "lesson_date": str(today(auth))},
        files={"file": ("notes.txt", b"Term: Definition")},
    )
    assert uploaded.status_code == 201, uploaded.text
    key = db.get(Material, UUID(uploaded.json()["id"])).storage_key
    path = storage_path(key)
    unlink = Path.unlink

    def temporarily_unavailable(self, *args, **kwargs):
        if self == path:
            raise PermissionError("Test-only temporary failure")
        return unlink(self, *args, **kwargs)

    with monkeypatch.context() as patch:
        patch.setattr(Path, "unlink", temporarily_unavailable)
        url = "/v1/me" if delete_account else f"/v1/materials/{uploaded.json()['id']}"
        assert client.delete(url).status_code == 204
    pending = db.get(FileDeletion, key)
    assert pending is not None and pending.attempts == 1 and pending.last_error == "PermissionError"
    assert path.is_file()
    assert drain_file_deletions(db) == {"deleted": 1, "failed": 0}
    assert not path.exists() and db.get(FileDeletion, key) is None
    assert drain_file_deletions(db) == {"deleted": 0, "failed": 0}


def test_csv_cards_support_quoted_multiline_cells_and_headers(client, auth):
    m = module(client)
    uploaded = client.post(
        "/v1/materials",
        data={"module_id": m["id"], "lesson_date": str(today(auth))},
        files={"file": ("cards.csv", b'question,answer\r\n"A, B","First line\nSecond line"\r\n')},
    )
    assert uploaded.status_code == 201, uploaded.text
    cards = client.get("/v1/flashcards").json()
    assert len(cards) == 1 and cards[0]["question"] == "A, B"
    assert cards[0]["answer"] == "First line\nSecond line"


def test_invalid_csv_returns_validation_error_without_saving(client, auth):
    m = module(client)
    result = client.post(
        "/v1/materials",
        data={"module_id": m["id"], "lesson_date": str(today(auth))},
        files={"file": ("cards.csv", b'"unclosed cell,answer')},
    )
    assert result.status_code == 422, result.text
    assert client.get("/v1/materials").json() == []


def test_calendar_blank_title_is_omitted_with_warning(client, auth):
    day = today(auth)
    raw = (
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Santai tests//EN\r\nBEGIN:VEVENT\r\nUID:blank\r\n"
        f"DTSTART:{day:%Y%m%d}T090000\r\nDTEND:{day:%Y%m%d}T100000\r\n"
        "SUMMARY:   \r\nEND:VEVENT\r\nEND:VCALENDAR\r\n"
    ).encode()
    result = client.post(
        "/v1/imports/timetable/preview",
        data={"start_date": str(day), "end_date": str(day)},
        files={"file": ("classes.ics", raw, "text/calendar")},
    )
    assert result.status_code == 200, result.text
    assert result.json()["candidates"] == []
    assert any("omitted" in warning for warning in result.json()["warnings"])
