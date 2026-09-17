# 加密服务 API

> 对应源码：`src/security/encryption/EncryptionService.ts`、`KeyManager.ts`、`HashUtils.ts`

## 概述

加密服务提供医疗敏感数据的传输与存储加密、密钥轮换与哈希校验能力，确保患者数据"加密存储、加密传输、医疗数据不出境"。

## 核心类

### EncryptionService

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `encrypt(plaintext, purpose)` | `Ciphertext` | 加密（AES-GCM） |
| `decrypt(ciphertext)` | `string` | 解密 |
| `encryptField(obj, fields)` | `object` | 对指定字段批量加密 |

### KeyManager

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `getKey(purpose)` | `Key` | 按用途获取当前密钥 |
| `rotate(purpose)` | `Key` | 轮换密钥（旧密钥保留用于解密） |

### HashUtils

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `sha256(data)` | `string` | 哈希 |
| `hmac(data, key)` | `string` | 消息认证码 |

## 密钥用途

| purpose | 用途 |
| --- | --- |
| `patient-pii` | 患者身份信息 |
| `record` | 病历正文 |
| `audit` | 审计日志签名 |

## 调用示例

```typescript
const enc = await encryptionService.encrypt(idCard, "patient-pii");
const back = await encryptionService.decrypt(enc);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `KEY_NOT_FOUND` | 密钥不存在 |
| `DECRYPT_FAIL` | 解密失败/数据被篡改 |
| `KEY_EXPIRED` | 密钥过期，需轮换 |

---

*健澜科技数智医院智能体 · 服务 API*
