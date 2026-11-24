# treatment_plan_suggestion — 治疗方案建议

> 所属分类：**临床决策支持** ｜ 工具名：`treatment_plan_suggestion` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

基于诊断与指南知识库，推荐治疗方案、用药路径与注意事项。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | 无（公开只读） |
| 适用角色 | doctor |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 否 | 患者ID |
| diagnosis | string | 是 | 主要诊断 |
| severity | enum(轻度/中度/重度/危重) | 否 | 严重程度 |
| comorbidities | array&lt;string&gt; | 否 | 合并症 |
| allergies | array&lt;string&gt; | 否 | 过敏史 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| pharmacological[] | array | 药物治疗方案（用药/剂量/频次/途径/疗程/依据/监测） |
| nonPharmacological[] | array | 非药物治疗方案 |
| lifestyle[] | array | 生活方式干预 |
| guidelineReferences[] | array | 指南/文献来源 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| VALIDATION_ERROR | 诊断为空 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "treatment_plan_suggestion",
  "input": {
  "diagnosis": "社区获得性肺炎",
  "severity": "中度"
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "treatment_plan_suggestion", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：临床决策支持*
