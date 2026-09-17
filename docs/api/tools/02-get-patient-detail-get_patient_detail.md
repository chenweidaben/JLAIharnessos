# get_patient_detail — 获取患者详情

> 所属分类：**患者管理** ｜ 工具名：`get_patient_detail` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

根据患者ID获取患者完整详情，包括基本信息、过敏史、当前用药、既往史、就诊信息等敏感信息（输出按数据分级脱敏）。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `patient:read` |
| 适用角色 | doctor, nurse |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者唯一ID |
| includeHistory | boolean | 否 | 是否包含就诊史，默认 false |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| patientId | string | 患者ID |
| name | string | 脱敏姓名 |
| gender/age | string/number | 性别与年龄 |
| allergyHistory | array | 过敏史列表 |
| currentMedications | array | 当前用药列表 |
| encounters | array | 就诊记录摘要 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PATIENT_NOT_FOUND | 患者不存在 |
| PERMISSION_DENIED | 缺少 patient:read 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "get_patient_detail",
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
  "data": { "tool": "get_patient_detail", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：患者管理*
