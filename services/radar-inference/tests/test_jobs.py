# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Job submission, status polling, and demo result contract."""


def test_submit_demo_job_and_fetch(client, auth_headers):
    r = client.post(
        "/api/v1/radar/jobs",
        headers=auth_headers,
        json={"study_uid": "STU-DEMO-001", "source": "demo"},
    )
    assert r.status_code == 202, r.text
    accepted = r.json()
    assert accepted["status"] in ("queued", "completed")
    assert accepted["mode"] == "demo"
    job_id = accepted["job_id"]
    assert job_id.startswith("job_")

    g = client.get(f"/api/v1/radar/jobs/{job_id}", headers=auth_headers)
    assert g.status_code == 200
    job = g.json()
    assert job["job_id"] == job_id
    assert job["status"] == "completed"
    assert job["study_uid"] == "STU-DEMO-001"
    assert job["mode"] == "demo"
    assert job["error"] is None
    assert job["result"] is not None


def test_get_unknown_job_404(client, auth_headers):
    r = client.get("/api/v1/radar/jobs/job_doesnotexist", headers=auth_headers)
    assert r.status_code == 404


def test_demo_result_schema(client, auth_headers):
    r = client.post(
        "/api/v1/radar/jobs",
        headers=auth_headers,
        json={"study_uid": "STU-SCHEMA", "source": "demo"},
    )
    job = client.get(
        f"/api/v1/radar/jobs/{r.json()['job_id']}", headers=auth_headers
    ).json()
    result = job["result"]

    # RadarResult top-level keys (contract 3.6)
    assert set(result.keys()) == {
        "study_uid", "model", "model_version", "mode", "generated_at",
        "positive_threshold", "findings", "summary", "disclaimer",
    }
    assert result["model"] == "damo-radar"
    assert result["model_version"] == "eaec6129"
    assert result["mode"] == "demo"
    assert "放射科医师复核" in result["disclaimer"]

    findings = result["findings"]
    assert len(findings) == 146, f"expected 146 findings, got {len(findings)}"

    organ_set = set()
    for f in findings:
        assert set(f.keys()) == {
            "key", "organ_zh", "name_zh", "name_en",
            "probability", "positive", "tier",
        }
        assert 0.0 <= f["probability"] <= 1.0
        assert f["tier"] in ("critical", "major", "minor")
        assert isinstance(f["positive"], bool)
        organ_set.add(f["organ_zh"])
    assert len(organ_set) == 18

    s = result["summary"]
    assert set(s.keys()) == {
        "critical_count", "major_count", "minor_count",
        "positive_count", "critical_findings", "major_findings",
    }
    # counts must be internally consistent
    assert s["positive_count"] == s["critical_count"] + s["major_count"] + s["minor_count"]
    assert len(s["critical_findings"]) == s["critical_count"]
    assert len(s["major_findings"]) == s["major_count"]
    # positive_count equals number of positive findings in the list
    assert s["positive_count"] == sum(1 for f in findings if f["positive"])
