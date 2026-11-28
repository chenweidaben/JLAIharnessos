"""
健澜AI原生医院操作系统OS - 限流计数存储抽象层。

对齐 BFF 侧 ``src/cache`` 样板：上层鉴权只依赖 ``RateLimitStore`` 抽象，
底层提供内存（本地开发/测试/Redis 不可用降级）与 Redis（生产多副本共享）
两套实现；Redis 连接不可用时降级为内存计数并告警，保证服务可启动，
分布式语义在降级时退化为单机。

键命名与 BFF 统一：``jianlan:ratelimit:<scope>:<identity>``，便于按域清理。

Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Optional, Protocol

logger = logging.getLogger("ai_access")

# 窗口长度（秒）：与既有 per-key / per-IP 每分钟配额口径一致
WINDOW_SECONDS = 60

# 内存兜底模式下，身份桶数量上限；超出时惰性驱逐已过期的空桶，防无界增长
_MEMORY_MAX_BUCKETS = 10000

# 对齐 BFF ``INCR_EXPIRE_SCRIPT``：先 exists 判断，仅键首次创建时设过期，
# 后续访问不续期 TTL，保证固定窗口边界原子、键到期自动回收。
# ARGV[1]=ttlMs, ARGV[2]=自增步长；返回当前计数。
_INCR_EXPIRE_SCRIPT = """
local exists = redis.call('exists', KEYS[1])
local count = redis.call('incrby', KEYS[1], ARGV[2])
if exists == 0 then
  redis.call('pexpire', KEYS[1], ARGV[1])
end
return count
"""


class RateLimitStore(Protocol):
    """限流计数存储抽象。"""

    driver: str

    def consume(self, scope: str, identity: str, limit: int, window_sec: int) -> bool:
        """消耗一次配额。返回 True 放行，False 已超配额。"""

    def close(self) -> None:
        """释放连接（内存实现为空操作）。"""


def _cache_key(scope: str, identity: str) -> str:
    """统一键命名：jianlan:ratelimit:<scope>:<identity>。"""
    return ":".join(["jianlan", "ratelimit", scope, identity])


class _Bucket:
    """固定窗口计数桶：计数 + 窗口重置时间戳。"""

    __slots__ = ("count", "reset_at")

    def __init__(self, reset_at: float) -> None:
        self.count = 0
        self.reset_at = reset_at


class MemoryRateLimitStore:
    """进程内固定窗口计数（本地开发 / 测试 / Redis 降级兜底）。

    注意：多副本部署下各实例计数不共享、重启丢失，仅作为兜底实现；
    生产环境必须经 Redis 实现跨实例共享配额。
    """

    driver = "memory"

    def __init__(self, max_buckets: int = _MEMORY_MAX_BUCKETS) -> None:
        self._buckets: dict[str, _Bucket] = {}
        self._max_buckets = max_buckets

    def consume(self, scope: str, identity: str, limit: int, window_sec: int) -> bool:
        now = time.time()
        key = _cache_key(scope, identity)
        bucket = self._buckets.get(key)

        if bucket is None or now >= bucket.reset_at:
            # 桶数量护栏：超出上限时先驱逐所有已过期桶，再创建新桶
            if len(self._buckets) >= self._max_buckets:
                stale = [k for k, b in self._buckets.items() if now >= b.reset_at]
                for k in stale:
                    del self._buckets[k]
            self._buckets[key] = _Bucket(reset_at=now + window_sec)
            bucket = self._buckets[key]

        bucket.count += 1
        return bucket.count <= limit

    def close(self) -> None:
        self._buckets.clear()


class RedisRateLimitStore:
    """Redis 固定窗口计数（生产多副本共享）。

    对齐 BFF ``incrAndExpire`` 原语：Lua 脚本内 ``exists`` 判断，仅在键首次
    创建时 ``PEXPIRE`` 设窗口 TTL；后续访问不续期，键在窗口结束后由 Redis 自动
    回收，固定窗口边界原子、活跃键不会被无限顺延。跨实例配额共享，重启不丢计数。
    """

    driver = "redis"

    def __init__(self, client: "RedisClientLike") -> None:
        self._client = client

    def consume(self, scope: str, identity: str, limit: int, window_sec: int) -> bool:
        key = _cache_key(scope, identity)
        count = int(
            self._client.eval(_INCR_EXPIRE_SCRIPT, 1, key, window_sec * 1000, 1)
        )
        return count <= limit

    def close(self) -> None:
        self._client.close()


class RedisClientLike(Protocol):
    """redis-py 同步客户端最小协议（便于测试注入 mock）。"""

    def eval(self, script: str, numkeys: int, *args: str) -> int: ...

    def ping(self) -> bool: ...

    def close(self) -> None: ...


def _build_redis_client(redis_url: str):
    """按连接串创建同步 Redis 客户端（lazy connect，不在此触发握手）。"""
    import redis  # 延迟导入：纯内存模式无需依赖 redis-py

    return redis.Redis.from_url(redis_url, decode_responses=True, socket_timeout=3)


def create_rate_limit_store(redis_url: Optional[str] = None) -> RateLimitStore:
    """工厂：按 ``REDIS_URL`` 装配存储；为空 / ``memory`` / 连接失败时降级内存。

    :param redis_url: Redis 连接串；缺省读环境变量 ``REDIS_URL``。
    """
    url = (redis_url if redis_url is not None else os.getenv("REDIS_URL", "")).strip()
    if not url or url.lower() == "memory":
        return MemoryRateLimitStore()

    try:
        client = _build_redis_client(url)
        if not client.ping():
            raise RuntimeError("redis ping 未返回 PONG")
        logger.info("[rate-limit] 使用 Redis 分布式限流存储")
        return RedisRateLimitStore(client)
    except Exception as exc:  # noqa: BLE001 - 降级兜底需兜住所有连接异常
        logger.warning("[rate-limit] Redis 不可用，降级为内存限流：%s", exc)
        return MemoryRateLimitStore()
