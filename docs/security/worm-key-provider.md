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

## P5-11：生产注入与迁移路径

### KEK 注入设计
- 环境变量：`WORM_KEK`（32 字节，hex 或 base64），用于派生 SM4 加密主密钥，保护落盘的 SM2 私钥段。
- 注入方式（二选一）：
  1. **启动脚本注入**：由 systemd unit / 容器启动脚本从机密管理读取，export 为进程环境变量；脚本本身权限 600，且不进 git。
  2. **容器 secret 挂载**：K8s Secret 以文件形式挂到 `/run/secrets/worm-kek`，启动时由 BFF 进程读取并赋值给 `WORM_KEK` 环境变量。
- **为什么必须独立于 `WORM_SM4_KEY`**：`WORM_SM4_KEY` 是默认的演示/兜底 SM4 密钥，只用于 demo-ephemeral provider；生产必须用 KEK 派生，KEK 不直接落盘，且轮换独立于 SM2 密钥本身。两者解耦后，SM2 轮换不需要换 KEK，KEK 泄漏也不需要重新签所有历史段。

### KMS 接入设计（接口形状）
`KeyProvider` 接口当前形状：
```
getSigningKey(keyId): { publicKey, privateKeyHex } | null
activeKeyId(): string
rotate(): { keyId, fromKeyId }
retire(keyId): { ok, error? }
purge(keyId): { ok, error?, refs? }
```
对接外部 KMS 的改造方向（只列接口，不绑定具体 SDK）：
- `getSigningKey(keyId)` 不再返回 `privateKeyHex`，改为返回一个 `sign(payload)` 闭包，私钥留在 KMS 内；BFF 只做调用。
- `publicKey` 改为从 KMS 的 `getPublicKey(keyId)` API 拉取并短期缓存。
- `rotate()` 对应 KMS 的 `key-rotation` API，返回新 keyId；旧 keyId 自动标记为 `retired`，不立即销毁。
- `purge()` 对应 KMS 的 `schedule-key-deletion`，要求先确认本地零引用（由 `_key-ops.json` 与 `countBySigner` 双重确认）。

### 轮换与旧段验签兼容
- 每个段落盘时记录 `signerKeyId`，verify 时按段内 keyId 从 provider 拉对应公钥。
- `retire(keyId)` 只标记不再用于新签名，**不删除私钥**；旧段仍可 verify。
- `purge(keyId)` 要求 `countBySigner(keyId) === 0`（零引用），否则 409 `key-in-use`。purge 成功后，引用该 keyId 的旧段将无法 verify（返回 `unknown-key-id`）。
- purge 需 body 带 `confirm:"PURGE"` 二次确认，操作落 `_key-ops.json`（独立运维审计，不进业务审计链）。

### 迁移步骤（demo-ephemeral → FileKeyProvider → KMS）
1. **demo → FileKeyProvider**：
   - 配置 `WORM_KEK` 与 `WORM_KEY_DIR`（落盘私钥目录）。
   - 启动后调 `POST /api/v1/worm/keys/rotate` 生成第一个持久化 keyId。
   - 验证：`GET /api/v1/worm/keys` 返回 `keySource` 为 `file`；seal 一段后 verify 通过。
2. **FileKeyProvider → KMS**：
   - 实现新的 `KmsKeyProvider`，实现 `KeyProvider` 接口。
   - 切换环境变量，重启 BFF；旧 FileKeyProvider 生成的 keyId 仍在本地目录，先不 purge，与 KMS keyId 共存。
   - 调 `rotate()` 让 KMS key 成为 active；逐步把旧段 verify 走 KMS（通过 keyId 路由）。
   - 确认所有旧段 verify 通过后，再 retire + purge 本地 FileKeyProvider 的 keyId。

### demo-ephemeral 与生产形态差异
- demo-ephemeral：每进程启动重新生成密钥，**跨进程旧段会 `unknown-key-id`**；无持久化；**不可用于生产**。
- FileKeyProvider：私钥加密落盘，跨进程一致，适合单机/小规模生产。
- KmsKeyProvider：私钥不出 KMS，适合多实例/合规生产。
