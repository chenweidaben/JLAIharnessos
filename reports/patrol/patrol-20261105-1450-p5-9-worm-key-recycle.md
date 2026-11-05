# P5-9 巡检简报：retire/purge 回收 + XFF 反代免流防护 + KEK 文档

> 健澜AI原生医院操作系统OS
> 范围：P5-8 KeyProvider 的收尾，密钥环生命周期治理 + 限流三态门控安全项

## 1. 密钥环生命周期

- `retire(keyId)`：标记 key 不可用于新签名，公钥保留在环里，旧段仍可验签
- `purge(keyId)`：彻底删除，三道护栏：
  - `cannot-purge-active`：不能删当前 active key
  - `key-in-use`：仍有段引用时拒绝，返回引用段数
  - `unknown-key-id`：删除不存在的 keyId
- `setKeyInUseChecker(fn)`：由 wormArchiveAggregator 在启动时注入，
  扫 `store.list()` 统计 `signerKeyId === kid` 的段数
- active 自动切换：retire 当前 active 后，`activeEntry()` 自动选下一个未 retired 的；
  全部 retired 抛 `worm-no-active-key`（在 seal 路径表现为 key-not-configured）

### 风险收敛结论
- **已收敛**：密钥环只增不删的问题由 retire（止血）+ purge（物理删除）解决
- **仍未解决**：purge 后旧段 verify 返回 unknown-key-id（这是预期行为，不是 bug）；
  密钥环文件本身不加密公钥（公钥可公开，私钥才加密）

## 2. 限流三态门控（含安全项）

本机免流需同时满足：
1. `isLocal`（IP ∈ 127.0.0.1 / ::1 / localhost）
2. `devMode`（NODE_ENV=development 或 DEMO_MODE=1）
3. `noProxy`（TRUST_PROXY != 1 且 **请求未带 X-Forwarded-For 头**）

### 安全取舍（重要）
- 部署在 CDN/反代后，XFF 头永远存在 → **本机免流永久失效**
- 这是有意的安全取向：宁可多限流，也不让反代把外部源 IP 归一成 127.0.0.1 后全网免流
- 开发环境如需绕过，直连 BFF（不带 XFF）即可；生产必须接受这个取舍

## 3. KEK 分层文档

新建 `docs/security/worm-key-provider.md`：
- WORM_KEK 与 WORM_SM4_KEY 分离，FileKeyProvider 只认 WORM_KEK
- 无 KEK 时拒绝构造（worm-kek-not-configured），不回落内容密钥
- 注入方式（K8s Secret / 密钥管理系统），不写真实值

## 4. 门禁三元

| 项 | exit | bytes | lines |
|---|---|---|---|
| 根 tsc（commit 前） | 0 | 0 | 0 |
| 根 tsc（commit 后） | 0 | 0 | 0 |
| 根 tsc（wiring 后） | 0 | 0 | 0 |
| web tsc | 0 | 0 | 0 |

单测：
- wormKeyProvider 15/0/44
- globalRateLimit 18/0/150
- wormArchive 48/0/165
- 组合 81/0/359

E2E 同进程两轮：22/0/73（571ms / 1.51s）
