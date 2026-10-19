"""
健澜科技 jlmedaios AI 服务 - API Key 鉴权中间件。

# 生产接 Redis 计数 + PostgreSQL 客户表，当前本地 mock

合规红线：
- 未带 Bearer Token → 401
- Token 无效 → 401
- 超 rate limit → 429
"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
import time

# 本地 mock API 客户表
# 生产接 PostgreSQL，当前 mock
API_KEYS = {
    "ak_mock_client_001": {
        "clientName": "mock-client-001",
        "scopes": ["ai/qc", "ai/triage", "ai/cds"],
        "rateLimitPerMin": 60
    },
    "ak_mock_client_002": {
        "clientName": "mock-client-002",
        "scopes": ["ai/learning", "ai/similar"],
        "rateLimitPerMin": 30
    }
}

# 本地请求计数（mock，生产接 Redis）
_request_counts: dict[str, list[float]] = {}

security = HTTPBearer()


def check_rate_limit(api_key: str) -> bool:
    """
    检查 rate limit。

    Returns:
        bool: 是否允许继续
    """
    client = API_KEYS.get(api_key)
    if not client:
        return False

    limit = client.get("rateLimitPerMin", 60)
    now = time.time()

    # 清理 60 秒前的记录
    if api_key not in _request_counts:
        _request_counts[api_key] = []

    _request_counts[api_key] = [t for t in _request_counts[api_key] if now - t < 60]

    if len(_request_counts[api_key]) >= limit:
        return False

    _request_counts[api_key].append(now)
    return True


async def api_key_auth(request: Request) -> HTTPAuthorizationCredentials:
    """
    API Key 鉴权依赖函数。

    用于 FastAPI Depends，对 /ai/* 路由生效。

    Raises:
        HTTPException: 401/429
    """
    # 跳过非 /ai/* 路由
    if not request.url.path.startswith("/ai/"):
        return None

    credentials = await security(request)
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Bearer Token")

    api_key = credentials.credentials
    if api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    if not check_rate_limit(api_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return credentials
