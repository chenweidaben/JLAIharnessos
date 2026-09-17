# prescription_audit — 处方审核

> 所属分类：**处方药品** ｜ 工具名：`prescription_audit` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

药师对处方进行合理性审核，通过或退回修改，记录审核结论。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `prescription:audit` |
| 适用角色 | pharmacist |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| prescriptionId | string | 是 | 待审核处方ID |
| decision | enum | 是 | approve/reject |
| reviewNote | string | 否 | 审核意见/退回原因 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| prescriptionId | string | 处方ID |
| status | string | 审核后状态 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PRESCRIPTION_NOT_FOUND | 处方不存在 |
| PERMISSION_DENIED | 缺少 prescription:audit 权限（仅药师） |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "prescription_audit",
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
  "data": { "tool": "prescription_audit", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：处方药品*
