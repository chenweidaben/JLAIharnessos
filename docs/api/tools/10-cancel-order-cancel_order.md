# cancel_order — 作废医嘱

> 所属分类：**医嘱管理** ｜ 工具名：`cancel_order` ｜ 风险等级：**HIGH**（高（需双重确认+资格校验））

## 工具描述

作废已开立但未执行完毕的医嘱。高风险操作，需双重确认与作废原因，执行联动通知护士与药房。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `high` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 是 |
| 所需权限 | `order:cancel` |
| 适用角色 | doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| orderId | string | 是 | 待作废医嘱ID |
| reason | string | 是 | 作废原因（必填） |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| orderId | string | 医嘱ID |
| status | string | 作废后状态 |
| notifiedRoles | array | 已通知的角色 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| ORDER_NOT_FOUND | 医嘱不存在 |
| ORDER_ALREADY_EXECUTED | 医嘱已执行，不可作废 |
| LICENSE_REQUIRED | 仅执业医师可作废医嘱 |
| PERMISSION_DENIED | 缺少 order:cancel 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "cancel_order",
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
  "data": { "tool": "cancel_order", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：医嘱管理*
