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
import os
import json
import logging

# 配置日志
logger = logging.getLogger("ai_access")
logger.setLevel(logging.INFO)

# P9 安全加固：API_KEYS 从环境变量读取，保留 dev 默认值
# 生产环境：export AI_API_KEYS="key1,key2,key3"
_default_keys = {
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

_env_keys = os.getenv("AI_API_KEYS", "")
if _env_keys:
    # 从环境变量解析：格式 key1:name1:limit1,key2:name2:limit2
    API_KEYS = {}
    for item in _env_keys.split(","):
        parts = item.strip().split(":")
        if len(parts) >= 1:
            API_KEYS[parts[0]] = {
                "clientName": parts[1] if len(parts) > 1 else "env-client",
                "scopes": ["ai/*"],
                "rateLimitPerMin": int(parts[2]) if len(parts) > 2 else 60
            }
else:
    API_KEYS = _default_keys

# 本地请求计数（mock，生产接 Redis）
_request_counts: dict[str, list[float]] = {}

# P9 安全加固：per-IP 简单限流（TODO: 生产换 Redis 分布式限流）
_ip_request_counts: dict[str, list[float]] = {}
IP_RATE_LIMIT_PER_MIN = 60

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


def check_ip_rate_limit(ip: str) -> bool:
    """
    P9 安全加固：per-IP 限流。

    TODO: 生产环境换 Redis 分布式限流
    """
    now = time.time()
    if ip not in _ip_request_counts:
        _ip_request_counts[ip] = []
    _ip_request_counts[ip] = [t for t in _ip_request_counts[ip] if now - t < 60]
    if len(_ip_request_counts[ip]) >= IP_RATE_LIMIT_PER_MIN:
        return False
    _ip_request_counts[ip].append(now)
    return True


async def api_key_auth(request: Request) -> HTTPAuthorizationCredentials:
    """
    API Key 鉴权依赖函数。

    用于 FastAPI Depends，对 /ai/* 路由生效。

    Raises:
        HTTPException: 401/429
    """
    # P9 安全加固：per-IP 限流检查
    client_ip = request.client.host if request.client else "unknown"
    if not check_ip_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="IP rate limit exceeded")

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
