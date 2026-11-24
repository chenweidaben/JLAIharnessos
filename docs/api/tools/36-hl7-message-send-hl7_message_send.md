# hl7_message_send — 发送HL7消息

> 所属分类：**系统集成** ｜ 工具名：`hl7_message_send` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

构造并发送 HL7 v2 消息（如 ADT/ORM/ORU）到下游系统，需确认。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `integration:write` |
| 适用角色 | admin |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| messageType | enum(ADT/ORM/ORU/MDM) | 是 | HL7消息类型 |
| messageTrigger | enum(A01/A04/O01/R01/T01/T02) | 是 | 触发事件（A01入院/A04门诊登记/O01检验申请/R01检验结果/T01/T02病历） |
| messageContent | object | 是 | 结构化消息内容，元素：`{ patientId?: string, patientName?: string, encounterId?: string, orderId?: string, testName?: string, department?: string, note?: string }` |
| targetSystem | enum(HIS/LIS/PACS/EMR) | 是 | 目标系统 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| messageControlId | string | 消息控制ID（MSH-10） |
| ackCode | enum(AA/AE/AR/未收到ACK) | HL7应答码 |
| ackMessage | string | 应答说明 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| HL7_PARSE_ERROR | 消息构造/解析失败 |
| DESTINATION_UNREACHABLE | 下游 MLLP 不可达 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "hl7_message_send",
  "input": {
  "messageType": "ORM",
  "messageTrigger": "O01",
  "messageContent": { "patientId": "P20260001", "orderId": "O20260001", "testName": "血常规" },
  "targetSystem": "LIS"
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "hl7_message_send", "status": "ok" }
}
```

### 失败返回示例

```json
{
  "success": false,
  "error": { "code": "PERMISSION_DENIED", "message": "缺少所需权限" }
}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：系统集成*
