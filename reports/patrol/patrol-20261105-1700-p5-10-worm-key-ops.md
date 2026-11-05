# P5-10 巡检简报：WORM 密钥运维 HTTP 入口 + signerKeyId 倒排索引

> 健澜AI原生医院操作系统OS

## 1. 运维入口

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/api/v1/worm/keys/retire` | auth + admin | body `{keyId}`，标记 key 不可用于新签名，旧段仍可验签 |
| POST | `/api/v1/worm/keys/purge` | auth + admin | body `{keyId}`，物理删除；失败返 409/400 |

### 状态码约定
- 200：成功
- 400：`unknown-key-id` / `keyId` 缺失 / `retire` 失败
- 401：未带 token
- 403：非 admin
- 409：`key-in-use`（仍有段引用，body 带 `refs` 数）/ `cannot-purge-active`
- 响应体**绝不包含私钥**，只返元信息

## 2. 语义

- **retire 后**：旧段仍可验签（公钥保留在环里），新 seal 用下一个未 retired key
- **purge 受双重约束**：非 active + 无段引用
- **purge 成功后**：旧段 verify 返 `unknown-key-id`（链断，需运维侧补签或重建）
- **全 retired 时**：seal 返 `worm-no-active-key`（独立错误码，不与未配置混淆）

## 3. 索引化

- `WormStore` 加 `countBySigner(keyId): number`（O(1)）
- `MemoryWormStore` 与 `FileWormStore` 都在 `put()` / `refresh()` 时维护 `Map<keyId, number>`
- **双保险**：索引命中 0 时回退一次真实 `list().filter()` 扫描，防外部写入未 refresh 导致索引滞后而误删
- 外部写入后必须 `refresh()` 重建索引（语义明确）

### 性能对比（200 段，10 次采样）
| 实现 | min | median | p90 |
|---|---|---|---|
| `countBySigner` 索引 | 0.000ms | 0.000ms | 0.019ms |
| `list().filter()` 全扫 | 0.024ms | 0.032ms | 0.508ms |

- median 降幅 **99.4%**
- 用的是等价构造（只填 signerKeyId，不做真加密），测量的是 O(n) 扫描 vs O(1) Map 查询本身

## 4. 安全
- 不写任何密钥值到日志/响应/简报
- KEK 注入方式见 `docs/security/worm-key-provider.md`
