from copy import deepcopy


def planner_state(day: str):
    return {
        "routineEntries": {
            "classes": {"durationHours": 2, "timesPerWeek": 5, "condition": "Typical"},
            "study": {"durationHours": 1, "timesPerWeek": 5, "condition": "Light"},
        },
        "feelAnswers": {"mental": 1, "time": 2},
        "recoveryChoice": 1,
        "commitments": [
            {
                "id": "club-session-1",
                "name": "Robotics practice",
                "category": "Club",
                "schedule": "Every day",
                "flexibility": "Flexible",
                "time": 5,
                "mental": 8,
                "physical": 3,
                "social": 11,
                "startDate": day,
                "durationHours": 1,
                "scheduleType": "Daily routine",
            }
        ],
        "modules": [
            {
                "id": "module-algorithms",
                "name": "Algorithms",
                "days": [1, 3],
                "assignment": {"start": day, "due": ""},
            }
        ],
        "materials": [
            {
                "id": "material-notes",
                "moduleId": "module-algorithms",
                "name": "notes.txt",
                "topic": "notes",
                "week": day,
                "date": day,
                "uri": "",
                "cards": [{"id": "card-1", "question": "Q", "answer": "A"}],
            }
        ],
        "checks": {},
        "recoveryResults": {},
        "overrides": {},
        "registeredOn": day,
        "weeklyNote": "Protect Friday evening",
    }


def test_planner_state_roundtrip_conflict_privacy_and_export(client, auth):
    day = auth["user"]["registered_on"]
    assert client.get("/v1/planner-state").status_code == 404

    payload = {"schema_version": 1, "state": planner_state(day), "expected_version": 0}
    saved = client.put("/v1/planner-state", json=payload)
    assert saved.status_code == 200, saved.text
    assert saved.json()["version"] == 1
    assert saved.json()["state"]["modules"][0]["days"] == [1, 3]
    assert "dueDate" not in saved.json()["state"]["commitments"][0]
    assert client.get("/v1/me").json()["plan_revision"] == 0

    loaded = client.get("/v1/planner-state")
    assert loaded.status_code == 200
    assert loaded.json()["state"]["weeklyNote"] == "Protect Friday evening"

    stale = deepcopy(payload)
    stale["state"]["weeklyNote"] = "Stale write"
    conflict = client.put("/v1/planner-state", json=stale)
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == "stale_planner_state"

    module = client.post("/v1/modules", json={"name": "Independent backend module"})
    assert module.status_code == 201, module.text
    assert client.get("/v1/me").json()["plan_revision"] == 1

    updated = deepcopy(stale)
    updated["expected_version"] = 1
    result = client.put("/v1/planner-state", json=updated)
    assert result.status_code == 200, result.text
    assert result.json()["version"] == 2
    assert client.get("/v1/me").json()["plan_revision"] == 1

    private = deepcopy(updated)
    private["expected_version"] = 2
    private["state"]["checks"] = {
        day: {
            "stress": 1,
            "causes": [],
            "note": "This must remain on the device",
            "savedAt": f"{day}T12:00:00.000Z",
            "assignments": {},
        }
    }
    assert client.put("/v1/planner-state", json=private).status_code == 422

    exported = client.get("/v1/me/export")
    assert exported.status_code == 200, exported.text
    assert exported.json()["planner_state"]["state"]["weeklyNote"] == "Stale write"


def test_planner_state_is_isolated_between_accounts(client, auth):
    first_state = planner_state(auth["user"]["registered_on"])
    first_state["weeklyNote"] = "Only the first account can read this"
    assert client.put(
        "/v1/planner-state",
        json={"schema_version": 1, "state": first_state, "expected_version": 0},
    ).status_code == 200

    second = client.post(
        "/v1/auth/signup",
        json={"email": "isolated@example.com", "password": "isolated-password", "timezone": "UTC"},
    )
    assert second.status_code == 201, second.text
    client.headers["Authorization"] = "Bearer " + second.json()["access_token"]
    assert client.get("/v1/planner-state").status_code == 404

    first = client.post(
        "/v1/auth/signin",
        json={"email": "planner@example.com", "password": "correct-horse-battery-staple"},
    )
    assert first.status_code == 200, first.text
    client.headers["Authorization"] = "Bearer " + first.json()["access_token"]
    assert client.get("/v1/planner-state").json()["state"]["weeklyNote"] == first_state["weeklyNote"]
