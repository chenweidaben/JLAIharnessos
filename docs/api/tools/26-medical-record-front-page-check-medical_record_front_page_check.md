# medical_record_front_page_check — 病案首页质控

> 所属分类：**质控管理** ｜ 工具名：`medical_record_front_page_check` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

对出院病案首页进行逻辑校验，检测主要诊断/手术/费用一致性问题。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | 无（公开只读） |
| 适用角色 | admin, doctor |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| frontPageData | object | 是 | 病案首页数据对象，内含：`patientId`（必填）、`mainDiagnosis`（必填）、`secondaryDiagnoses?`、`mainIcd10?`、`surgeries[]?`、`dischargeDisposition`（enum 正常出院/转院/转科/自动出院/死亡/其他，必填）、`totalCost`（必填）、`insuranceType?` |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| defects[] | array | 首页逻辑问题 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| RECORD_NOT_FOUND | 病历不存在 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "medical_record_front_page_check",
  "input": {
  "frontPageData": {
    "patientId": "P20260001",
    "mainDiagnosis": "社区获得性肺炎",
    "dischargeDisposition": "正常出院",
    "totalCost": 8600
  }
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "medical_record_front_page_check", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：质控管理*
