# get_patient_history — 获取患者就诊史

> 所属分类：**患者管理** ｜ 工具名：`get_patient_history` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

查询患者历史就诊记录，含历次门诊/住院诊断、医嘱摘要与随访情况，支持按时间范围与就诊类型过滤。

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
| visitType | enum | 否 | 就诊类型：outpatient/emergency/inpatient/physical_exam/followup |
| startDate | string(YYYY-MM-DD) | 否 | 起始日期 |
| endDate | string(YYYY-MM-DD) | 否 | 截止日期 |
| page/pageSize | integer | 否 | 分页参数 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| total | number | 记录总数 |
| data[] | array | 就诊史条目（诊断/科室/日期/摘要） |

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
  "name": "get_patient_history",
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
  "data": { "tool": "get_patient_history", "status": "ok" }
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
