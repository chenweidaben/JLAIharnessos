# WORM SM2 KeyProvider 与 KEK 注入说明

> 健澜AI原生医院操作系统OS - P5-8/P5-9
> 本文档只描述变量名与注入方式，**不包含任何真实密钥值或示例 hex**。

## 密钥分层

| 用途 | 环境变量 | 说明 |
|---|---|---|
| 段内容加密（SM4-CBC） | `WORM_SM4_KEY` | 32 hex，加密 WORM 段事件正文 |
| 私钥环加密（KEK） | `WORM_KEK` | 32 hex，加密 `_keys.json` 里的 SM2 私钥 |
| SM2 签名（运行时） | 由 KeyProvider 管理 | 不直接读 env，从密钥环取 active key |

## 为什么 KEK 必须独立

- `WORM_SM4_KEY` 加密的是段正文（可重放、可离线分析）
- `WORM_KEK` 加密的是签名私钥（泄露等于伪造段）
- 同钥多用途会扩大 CBC 攻击面，且一旦内容密钥泄露等于私钥环泄露
- `FileKeyProvider` **只认 `WORM_KEK`**，缺失时抛 `worm-kek-not-configured`，**不回落 `WORM_SM4_KEY`**

## 注入方式（生产）

- 由部署侧（systemd unit / K8s Secret / 密钥管理系统）在启动 BFF 前注入环境变量
- `WORM_KEK` 应与 `WORM_SM4_KEY` 分开存放、分开轮换
- 不落盘、不写进任何代码仓库、不进日志

## 无 WORM_KEK 时的行为

- `FileKeyProvider` 拒绝构造（`worm-kek-not-configured`）
- 工厂回落 `DemoEphemeralKeyProvider`：每进程重生成密钥
- **后果**：跨进程旧段验签失败（`unknown-key-id`），生产不可用
- 这是有意为之的"显式降级"，不是静默容错

## 密钥生命周期

- `rotate()`：生成新钥 → 旧钥保留可验签 → 新钥成为 active
- `retire(keyId)`：标记旧钥不可用于新签名，旧段仍可验签
- `purge(keyId)`：彻底删除，护栏：
  - 不能 purge active key → `cannot-purge-active`
  - 不能 purge 仍被段引用的 key → `key-in-use`（附引用数）
  - 不能 purge 不存在的 keyId → `unknown-key-id`

## 验证路径

- `verify(digest, sig, keyId)` 按段里存的 `signerKeyId` 选公钥
- 未知 keyId → `unknown-key-id`（密钥环里没有）
- 签名不符 → `bad-signature`（疑似篡改）
- 两者明确区分，避免"换钥"被误判为"篡改"
