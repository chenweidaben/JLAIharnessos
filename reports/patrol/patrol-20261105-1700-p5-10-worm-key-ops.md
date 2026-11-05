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
- **purge 的适用面**：只允许在「非 active 且零段引用」时执行，因此成功 purge 不会破坏已有链；曾签过段的密钥一律被 409 `key-in-use` 拦住，只能 retire。purge 后该密钥公钥移出验证环，若后续出现用它签名的段（外部写入或索引滞后），验签才会报 `unknown-key-id`
- **全 retired 时**：seal 返 `worm-no-active-key`（独立错误码，不与未配置混淆）

## 3. 索引化

- `WormStore` 加 `countBySigner(keyId): number`（O(1)）
- `MemoryWormStore` 与 `FileWormStore` 都在 `put()` / `refresh()` 时维护 `Map<keyId, number>`
- **双保险**：索引命中 0 时回退一次真实 `list().filter()` 扫描，防外部写入未 refresh 导致索引滞后而误删
- 外部写入后必须 `refresh()` 重建索引（语义明确）

### 性能对比（段数扫掠，10 次 median，元数据段不涉解密）
| 段数 | `countBySigner` 索引 | `list().filter()` 全扫 |
|---|---|---|
| 200 | 0.0002ms | 0.0412ms |
| 1000 | 0.0002ms | 0.0784ms |
| 5000 | 0.0002ms | 0.2804ms |
| 20000 | 0.0005ms | 1.3959ms |

- 全扫随段数近似线性增长（200→20000 段数 ×100，耗时 ×34）
- 索引侧基本恒定（~0.0002ms）
- **结论**：在 <1000 段规模下该优化不可测量（都在微秒级），价值在于段数上量后的线性增长控制；20000 段时全扫 1.4ms，对 purge 操作不可接受，索引将其压到 <0.001ms

## 4. 安全
- 不写任何密钥值到日志/响应/简报
- KEK 注入方式见 `docs/security/worm-key-provider.md`
