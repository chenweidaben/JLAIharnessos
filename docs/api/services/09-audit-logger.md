# 审计日志器 API

> 对应源码：`src/security/audit/AuditLogger.ts`、`LogStorage.ts`、`LogIntegrity.ts`、`AuditEvent.ts`

## 概述

审计日志器对所有敏感操作（患者查询、病历读写、医嘱/处方、外部系统同步）进行不可篡改的留痕，满足等保三级与《医疗卫生机构网络安全管理办法》的追溯要求。

## 核心类

### AuditLogger

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `log(entry)` | `void` | 写入一条审计事件 |
| `query(filter)` | `AuditEvent[]` | 按时间/用户/工具查询 |

### LogStorage

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `append(event)` | `void` | 追加存储 |
| `export(range)` | `Stream` | 导出审计包 |

### LogIntegrity

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `verify()` | `boolean` | 校验日志链哈希完整性 |
| `seal(period)` | `void` | 对周期日志封档 |

## AuditEvent 字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | number | 时间戳 |
| `userId / userName / role` | string | 操作者 |
| `toolName` | string | 工具名 |
| `patientId / encounterId` | string | 相关患者（可空） |
| `input / outputSummary` | any | 入参与结果摘要（脱敏） |
| `ipAddress / traceId` | string | 来源IP与链路ID |

## 调用示例

```typescript
auditLogger.log({ ...entry, outputSummary: "返回患者列表10条" });
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `LOG_WRITE_FAIL` | 日志写入失败（fail-closed，阻断操作） |
| `INTEGRITY_BROKEN` | 日志链校验失败 |

---

*健澜科技数智医院智能体 · 服务 API*
