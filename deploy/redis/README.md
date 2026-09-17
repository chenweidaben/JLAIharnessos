# 健澜科技杠OS · Redis 部署

Redis 7，作为缓存、分布式锁、限流与会话存储；compose 已挂载 `redis.conf` 并通过 `--requirepass` 注入密码。

## 配置要点（redis.conf）

- **持久化**：AOF（`appendfsync everysec`）+ RDB 双保险，数据落 `/data` 持久卷；
- **淘汰策略**：`volatile-lru`，仅淘汰带 TTL 的键，保护无 TTL 关键数据；
- **安全**：密码鉴权（命令行注入，不入库）、`protected-mode`、内网绑定；
- **高危命令**：重命名禁用 `KEYS`（应用统一用 `SCAN`）、`FLUSHDB`、`FLUSHALL`、`DEBUG`；
- **慢查询**：阈值 10ms，记录最近 128 条。

## 应用侧能力（src/cache）

| 能力 | 类 | 用途 |
|------|-----|------|
| 统一缓存 | `ICache` / `RedisCache` / `MemoryCache` | 生产 Redis、本地与降级内存 |
| 分布式锁 | `DistributedLock` | SET-NX-PX + token 安全释放 + 看门狗续期 |
| 限流 | `RateLimiter` | 固定窗口原子计数（API/智能体配额/登录锁定） |
| 会话 | `SessionStore` | 刷新令牌哈希存储与轮换 |
| 缓存旁路 | `CacheAside` | 防击穿（singleflight）、防穿透（空值缓存）、防雪崩（TTL 抖动） |

Redis 不可用时工厂自动降级为进程内内存缓存并告警（分布式语义退化为单机），保证服务可启动。

## 本地无 Redis 运行

设置 `REDIS_URL=memory` 或不传 `REDIS_URL`，即使用内存缓存，单元测试零外部依赖：

```bash
bun test tests/unit/cache
```
