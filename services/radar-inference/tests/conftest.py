# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
import sys
from pathlib import Path

# Make the service root importable so `app` resolves under pytest.
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.config import settings  # noqa: E402
from app.jobs import manager  # noqa: E402


TEST_TOKEN = "test-secret-token"


@pytest.fixture(autouse=True)
def _isolate():
    # Deterministic auth for HTTP tests (avoids dependence on TestClient host).
    saved_token = settings.internal_token
    saved_conc = settings.max_concurrency
    settings.internal_token = TEST_TOKEN
    manager.reset()
    try:
        yield
    finally:
        settings.internal_token = saved_token
        settings.max_concurrency = saved_conc
        manager.reset()


@pytest.fixture
def client():
    return TestClient(app)


from app.main import app  # noqa: E402


@pytest.fixture
def auth_headers():
    return {"X-Internal-Token": TEST_TOKEN}
