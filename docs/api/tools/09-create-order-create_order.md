# create_order — 开具医嘱

> 所属分类：**医嘱管理** ｜ 工具名：`create_order` ｜ 风险等级：**HIGH**（高（需双重确认+资格校验））

## 工具描述

开具药品/检查/检验/治疗/护理/手术/输血等医嘱。高风险操作，需双重确认与执业医师资格校验；自动执行 CDS 安全检查（药物相互作用、禁忌症、过敏、剂量异常），药品医嘱需药师审核。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `high` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 是 |
| 所需权限 | `order:create` |
| 适用角色 | doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者ID |
| encounterId | string | 是 | 就诊ID |
| orderType | enum | 是 | 药品/检查/检验/治疗/护理/手术/输血/其他 |
| orderContent | string | 是 | 医嘱内容（如 阿司匹林肠溶片100mg qd 口服） |
| dosage | string | 否 | 剂量（药品医嘱） |
| frequency | string | 否 | 频次 qd/bid/tid/q4h/prn |
| duration | string | 否 | 疗程（如 7天） |
| startDate | string(YYYY-MM-DD) | 否 | 开始日期，默认当天 |
| priority | enum | 否 | 普通/急/即刻，默认普通 |
| clinicalIndication | string | 是 | 临床指征/开单原因 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| orderId | string | 医嘱ID |
| status | enum | 已开立/待审核/已驳回 |
| safetyCheck | object | 相互作用/禁忌/过敏/剂量预警 |
| requiresPharmacistReview | boolean | 是否需药师审核 |
| requiresDoubleConfirm | boolean | 是否需双重确认 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PATIENT_NOT_FOUND | 患者不存在 |
| LICENSE_REQUIRED | 仅执业医师可开具医嘱 |
| SAFETY_BLOCKED | 存在严重过敏/禁忌，医嘱被阻止 |
| PERMISSION_DENIED | 缺少 order:create 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "create_order",
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
  "data": { "tool": "create_order", "status": "ok" }
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
