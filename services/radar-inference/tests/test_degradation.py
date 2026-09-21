# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Automatic degradation when weights are missing (contract section 0/3.2)."""
from app import production_engine
from app.contract import Mode


def test_resolve_mode_is_demo_without_weights(monkeypatch):
    # Force the no-weights path regardless of local filesystem.
    monkeypatch.setattr(production_engine, "weights_available", lambda: False)
    assert production_engine.resolve_mode() == Mode.demo.value


def test_run_degrades_to_demo(monkeypatch):
    monkeypatch.setattr(production_engine, "weights_available", lambda: False)
    result = production_engine.run("DEGRADE-1", None)
    assert result.mode == Mode.demo
    assert len(result.findings) == 146
    assert result.model == "damo-radar"


def test_health_ready_reports_degraded(client):
    r = client.get("/health/ready")
    body = r.json()
    assert body["status"] == "degraded"
    assert body["mode"] == "demo"
