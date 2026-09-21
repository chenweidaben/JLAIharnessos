# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""PII / patient-identifier redaction in logs and error bodies."""
import logging

from app.logging_redact import (
    RedactionFilter,
    register_sensitive,
    safe_ref,
    unregister_all,
)


def test_safe_ref_never_leaves_path():
    p = "/data/pacs/PATIENTID_88421/study_001.nii.gz"
    out = safe_ref(p)
    assert "PATIENTID_88421" not in out
    assert "study_001" not in out
    assert ".nii.gz" in out or "nii" in out


def test_redaction_filter_scrubs_records():
    unregister_all()
    token = "PatientSecret-9f3a"
    register_sensitive(token)
    try:
        rec = logging.LogRecord(
            name="t", level=logging.INFO, pathname=__file__, lineno=1,
            msg=f"processing {token} from pacs", args=(), exc_info=None,
        )
        f = RedactionFilter()
        assert f.filter(rec) is True
        assert token not in rec.msg
        assert "***REDACTED***" in rec.msg
    finally:
        unregister_all()


def test_error_body_has_no_traceback(client, auth_headers):
    # Force the inference call to fail and ensure the job error body is generic.
    import app.jobs as jobs

    def boom(study_uid, file_ref, mode):
        raise RuntimeError("secret stack detail PatientID leaked")

    original = jobs.run_inference
    jobs.run_inference = boom
    try:
        r = client.post(
            "/api/v1/radar/jobs",
            headers=auth_headers,
            json={"study_uid": "STU-FAIL", "source": "demo"},
        )
        job = client.get(
            f"/api/v1/radar/jobs/{r.json()['job_id']}", headers=auth_headers
        ).json()
        assert job["status"] == "failed"
        assert job["result"] is None
        assert "PatientID" not in job["error"]["message"]
        assert "Traceback" not in job["error"]["message"]
    finally:
        jobs.run_inference = original
