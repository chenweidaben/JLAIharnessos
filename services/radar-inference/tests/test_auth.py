# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Internal-token authentication (contract section 3)."""
from app.auth import _is_loopback


def test_missing_token_rejected(client, auth_headers):
    # do NOT send the header
    r = client.get("/api/v1/radar/catalog")
    assert r.status_code == 401


def test_wrong_token_rejected(client):
    r = client.get("/api/v1/radar/catalog", headers={"X-Internal-Token": "wrong"})
    assert r.status_code == 401


def test_correct_token_accepted(client, auth_headers):
    r = client.get("/api/v1/radar/catalog", headers=auth_headers)
    assert r.status_code == 200


def test_health_endpoints_not_protected(client):
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200


def test_loopback_detection():
    assert _is_loopback("127.0.0.1")
    assert _is_loopback("::1")
    assert _is_loopback("localhost")
    assert not _is_loopback("10.0.0.5")
    assert not _is_loopback(None)
