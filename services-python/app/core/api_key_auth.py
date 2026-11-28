"""
健澜科技 jlmedaios AI 服务 - API Key 鉴权中间件。

# 生产接 Redis 计数 + PostgreSQL 客户表；Redis 不可用时降级进程内内存计数

合规红线：
- 未带 Bearer Token → 401
- Token 无效 → 401
- 超 rate limit → 429
"""

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging
from typing import Optional

from app.core.rate_limit_store import (
    RateLimitStore,
    WINDOW_SECONDS,
    create_rate_limit_store,
)

# 配置日志
logger = logging.getLogger("ai_access")
logger.setLevel(logging.INFO)

# P9 安全加固：API_KEYS 从环境变量读取，保留 dev 默认值
# 生产环境：export AI_API_KEYS="key1,name1,limit1;key2,name2,limit2"
# （兼容旧格式 key1:name1:limit1,key2:name2:limit2）
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

_IS_PRODUCTION = os.getenv("APP_ENV", "development").lower() in ("production", "prod")

_env_keys = os.getenv("AI_API_KEYS", "")
if _env_keys:
    # 从环境变量解析：格式 key1:name1:limit1,key2:name2:limit2
    API_KEYS = {}
    for item in _env_keys.split(","):
        parts = item.strip().split(":")
        if len(parts) >= 1 and parts[0]:
            API_KEYS[parts[0]] = {
                "clientName": parts[1] if len(parts) > 1 else "env-client",
                "scopes": ["ai/*"],
                "rateLimitPerMin": int(parts[2]) if len(parts) > 2 else 60
            }
elif _IS_PRODUCTION:
    # P0 安全红线：生产环境禁止回落到硬编码 mock key，直接拒绝启动。
    raise RuntimeError(
        "APP_ENV=production 但未配置 AI_API_KEYS 环境变量，"
        "拒绝使用内置 mock API Key 启动。请配置 AI_API_KEYS 后重启。"
    )
else:
    API_KEYS = _default_keys

# per-IP 限流配额（每分钟）；配额与计数由限流存储统一管理
IP_RATE_LIMIT_PER_MIN = 60

# 限流存储单例（惰性装配；Redis 不可用自动降级内存）。
# 测试可通过 ``_set_store`` 注入内存/mock 实现，避免依赖真实 Redis。
_store: Optional[RateLimitStore] = None


def _get_store() -> RateLimitStore:
    global _store
    if _store is None:
        _store = create_rate_limit_store()
    return _store


def _set_store(store: RateLimitStore) -> None:
    """注入限流存储（测试专用）。"""
    global _store
    _store = store


def check_rate_limit(api_key: str) -> bool:
    """
    检查 API Key 维度的 rate limit。

    Returns:
        bool: 是否允许继续
    """
    client = API_KEYS.get(api_key)
    if not client:
        return False

    limit = client.get("rateLimitPerMin", 60)
    return _get_store().consume("api", api_key, limit, WINDOW_SECONDS)


def check_ip_rate_limit(ip: str) -> bool:
    """
    per-IP 限流。生产经 Redis 跨实例共享；Redis 不可用时降级进程内计数。
    """
    return _get_store().consume("ip", ip, IP_RATE_LIMIT_PER_MIN, WINDOW_SECONDS)


security = HTTPBearer()


async def api_key_auth(request: Request) -> HTTPAuthorizationCredentials:
    """
    API Key 鉴权依赖函数。

    用于 FastAPI Depends，对 /ai/* 路由生效。

    Raises:
        HTTPException: 401/429
    """
    # 先按路径过滤：非 /ai/* 路由不消耗 IP 限流配额
    if not request.url.path.startswith("/ai/"):
        return None

    # P9 安全加固：per-IP 限流检查
    client_ip = request.client.host if request.client else "unknown"
    if not check_ip_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="IP rate limit exceeded")

    credentials = await security(request)
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing Bearer Token")

    api_key = credentials.credentials
    if api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API Key")

    if not check_rate_limit(api_key):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    return credentials
