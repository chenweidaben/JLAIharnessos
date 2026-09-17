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
| messageType | enum | 是 | ADT^A04/ORM^O01/ORU^R01 等 |
| payload | object | 是 | 消息业务载荷 |
| destination | string | 是 | 接收端 MLLP 地址 host:port |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| messageControlId | string | 消息控制ID |
| ack | object | 下游 ACK 响应 |

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
  "patientId": "P20260001",
  "encounterId": "E20260916001"
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
