"""
健澜AI原生医院操作系统OS - 限流存储单元测试。

锁定 P2 改造：
- 内存固定窗口计数（兜底）行为：未超限放行、超限拒绝、身份隔离；
- Redis 实现经 mock 客户端验证 Lua eval（INCRBY + 首次 PEXPIRE）原语，不依赖真实 6379；
- 工厂在无 REDIS_URL / memory / Redis 不可用时降级内存；
- api_key_auth 接入存储后，配额按 key 独立计数、超限 429。
"""

import pytest

from app.core import api_key_auth
from app.core.rate_limit_store import (
    MemoryRateLimitStore,
    RateLimitStore,
    RedisRateLimitStore,
    create_rate_limit_store,
)


class _FakeRedis:
    """模拟同步 Redis 客户端：字典计数，eval 复刻 Lua「首次建键才设过期」语义。"""

    def __init__(self):
        self._counts: dict[str, int] = {}
        self.expire_keys: list[str] = []
        self.eval_calls: list[tuple] = []

    def eval(self, script, numkeys: int, *args):
        key, ttl_ms, by = args[0], int(args[1]), int(args[2])
        self.eval_calls.append((key, ttl_ms, by))
        exists = key in self._counts
        count = self._counts.get(key, 0) + by
        self._counts[key] = count
        if not exists:
            self.expire_keys.append(key)
        return count

    def ping(self):
        return True

    def close(self):
        pass


def test_memory_store_allows_within_limit_and_rejects_over_limit():
    store = MemoryRateLimitStore()
    oks = [store.consume("api", "key-a", limit=3, window_sec=60) for _ in range(4)]
    assert oks[:3] == [True, True, True]
    assert oks[3] is False
    # 第 1、2 次在限额内应放行
    store2 = MemoryRateLimitStore()
    assert store2.consume("api", "key-b", 2, 60) is True
    assert store2.consume("api", "key-b", 2, 60) is True
    assert store2.consume("api", "key-b", 2, 60) is False


def test_memory_store_identities_isolated():
    store = MemoryRateLimitStore()
    store.consume("ip", "10.0.0.1", 1, 60)
    # 另一身份不受前一身份配额影响
    assert store.consume("ip", "10.0.0.2", 1, 60) is True


def test_redis_store_incr_and_expire_once_per_key():
    fake = _FakeRedis()
    store: RateLimitStore = RedisRateLimitStore(fake)

    # 同键三次：count 1 / 2 放行，count 3 超限
    assert store.consume("api", "key-x", limit=2, window_sec=60) is True
    assert store.consume("api", "key-x", limit=2, window_sec=60) is True
    assert store.consume("api", "key-x", limit=2, window_sec=60) is False
    # 另一身份新键独立计数
    assert store.consume("ip", "10.0.0.1", limit=2, window_sec=60) is True

    # 每个键仅首次创建时设一次过期；同键二次访问不续期 TTL（对齐 BFF 固定窗口）
    assert len(fake.eval_calls) == 4
    assert len(fake.expire_keys) == 2
    assert fake.expire_keys[0] == "jianlan:ratelimit:api:key-x"
    assert fake.expire_keys[1] == "jianlan:ratelimit:ip:10.0.0.1"
    # 首次 PEXPIRE 窗口为 60s = 60000ms
    assert fake.eval_calls[0][1] == 60000


def test_factory_memory_mode_without_redis_url(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    store = create_rate_limit_store()
    assert isinstance(store, MemoryRateLimitStore)

    monkeypatch.setenv("REDIS_URL", "memory")
    assert isinstance(create_rate_limit_store(), MemoryRateLimitStore)


def test_factory_degrades_to_memory_on_redis_failure(monkeypatch):
    def _boom(_url):
        raise RuntimeError("connect refused")

    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setattr("app.core.rate_limit_store._build_redis_client", _boom)
    store = create_rate_limit_store()
    assert isinstance(store, MemoryRateLimitStore)


@pytest.fixture
def isolated_store():
    store = MemoryRateLimitStore()
    api_key_auth._set_store(store)
    yield store
    api_key_auth._set_store(None)


def test_check_rate_limit_enforces_per_key_quota(isolated_store):
    key = next(iter(api_key_auth.API_KEYS))
    limit = api_key_auth.API_KEYS[key]["rateLimitPerMin"]
    results = [api_key_auth.check_rate_limit(key) for _ in range(limit + 1)]
    assert all(results[:limit]) is True
    assert results[-1] is False


def test_check_ip_rate_limit_rejects_over_limit(isolated_store):
    for _ in range(api_key_auth.IP_RATE_LIMIT_PER_MIN):
        assert api_key_auth.check_ip_rate_limit("203.0.113.7") is True
    assert api_key_auth.check_ip_rate_limit("203.0.113.7") is False
