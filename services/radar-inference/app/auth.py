# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""Internal-token authentication (contract section 3).

* Header ``X-Internal-Token`` must equal ``RADAR_INTERNAL_TOKEN`` when configured.
* When ``RADAR_INTERNAL_TOKEN`` is NOT configured, only loopback callers
  (127.0.0.1 / ::1 / localhost) are allowed.

Health probes are intentionally unauthenticated (Kubernetes probes).
"""
from __future__ import annotations

from fastapi import HTTPException, Request, status

from .config import settings

LOOPBACK_HOSTS = {"127.0.0.1", "::1", "localhost", "0.0.0.0"}


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    h = host.lower()
    if h in LOOPBACK_HOSTS:
        return True
    if h.startswith("127."):
        return True
    if h == "[::1]" or h.endswith("::1]"):
        return True
    return False


async def require_internal(request: Request) -> None:
    """FastAPI dependency guarding /api/v1/* endpoints."""
    token = request.headers.get("X-Internal-Token")
    expected = settings.internal_token

    if expected:
        if not token or token != expected:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid or missing internal token",
                headers={"WWW-Authenticate": "InternalToken"},
            )
        return

    # No secret configured: restrict to loopback only.
    client_host = request.client.host if request.client else None
    if not _is_loopback(client_host):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="internal token not configured; non-loopback access denied",
        )
