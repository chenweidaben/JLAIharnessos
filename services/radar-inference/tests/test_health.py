# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Health endpoints (unauthenticated)."""


def test_live(client):
    r = client.get("/health/live")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ready_degraded_without_weights(client):
    # In this environment no GPU weights are present -> demo + degraded.
    r = client.get("/health/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "degraded"
    assert body["mode"] == "demo"
    assert body["weights_loaded"] is False
    assert body["gpu_available"] is False
    assert body["model"] == "damo-radar"
    assert body["model_version"] == "eaec6129"
