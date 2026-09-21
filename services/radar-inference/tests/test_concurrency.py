# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Concurrency limiting via semaphore."""
import threading
import time

from app.config import settings
from app.jobs import manager
from app.demo_engine import run_demo
from app.contract import Mode, Source
import app.jobs as jobs


def test_concurrency_is_bounded(monkeypatch):
    settings.max_concurrency = 2
    manager.reset()
    # rebuild the semaphore with the test's limit
    manager._sem = threading.Semaphore(settings.max_concurrency)

    active = {"n": 0, "peak": 0, "lock": threading.Lock()}

    def fake_inference(study_uid, file_ref, mode):
        with active["lock"]:
            active["n"] += 1
            active["peak"] = max(active["peak"], active["n"])
        try:
            time.sleep(0.2)
        finally:
            with active["lock"]:
                active["n"] -= 1
        return run_demo(study_uid, Mode.demo)

    monkeypatch.setattr(jobs, "run_inference", fake_inference)

    def submit(i):
        manager.create(study_uid=f"CONC-{i}", source=Source.demo, file_ref=None)

    threads = [threading.Thread(target=submit, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    assert active["peak"] <= settings.max_concurrency
    # 6 jobs all completed
    assert active["n"] == 0
