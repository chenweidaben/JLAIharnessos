# 会话管理器 API

> 对应源码：`src/core/session/SessionManager.ts`、`MedicalSession.ts`

## 概述

会话管理器负责医生与智能体对话会话的生命周期：创建、恢复、持久化、超时销毁，以及会话与患者上下文（`PatientContext`）的绑定。

## 核心类

### SessionManager

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `create(user)` | `MedicalSession` | 创建新会话 |
| `get(sessionId)` | `MedicalSession \| undefined` | 获取会话 |
| `resume(sessionId)` | `MedicalSession` | 恢复历史会话 |
| `destroy(sessionId)` | `void` | 销毁并清理会话 |
| `bindPatient(sessionId, ctx)` | `void` | 绑定当前患者上下文 |
| `listActive()` | `MedicalSession[]` | 列出活跃会话 |

### MedicalSession

| 字段/成员 | 类型 | 说明 |
| --- | --- | --- |
| `sessionId` | `string` | 会话ID |
| `userId` | `string` | 医生ID |
| `messages[]` | `array` | 对话消息 |
| `patientContext` | `PatientContext` | 当前患者上下文 |
| `createdAt / lastActiveAt` | `number` | 时间戳 |
| `append(msg)` | `void` | 追加消息 |

## 调用示例

```typescript
const sm = new SessionManager(store);
const session = sm.create(medicalUser);
sm.bindPatient(session.sessionId, { patientId: "P20260001", encounterId: "E001", ... });
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `SESSION_NOT_FOUND` | 会话不存在 |
| `SESSION_EXPIRED` | 会话已超时 |
| `CONCURRENT_MODIFICATION` | 并发修改冲突 |

---

*健澜科技数智医院智能体 · 服务 API*
