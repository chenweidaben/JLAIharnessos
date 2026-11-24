# generate_medical_record — AI生成病历

> 所属分类：**电子病历** ｜ 工具名：`generate_medical_record` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

基于患者主诉、现病史、检查结果等，由 AI 辅助生成结构化病历草稿，需医生确认后落库。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `emr:write` |
| 适用角色 | doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者ID |
| encounterId | string | 否 | 就诊ID |
| recordType | string | 是 | 文书类型（如"门诊病历""入院记录""病程记录""出院小结"） |
| keyPoints | array&lt;object&gt; | 是 | 问诊要点列表（至少 1 条），元素：`{ category: enum(主诉/现病史/既往史/体格检查/辅助检查/诊断/处理/其他), content: string }` |
| templateId | string | 否 | 使用的病历模板ID |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| draftId | string | 草稿ID（临时存储，未归档） |
| content | string | AI 生成的病历正文 |
| confidence | number | 内容置信度 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PERMISSION_DENIED | 缺少 emr:write 或非医生角色 |
| VALIDATION_ERROR | 主诉为空或过短 |
| MODEL_TIMEOUT | 大模型生成超时 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "generate_medical_record",
  "input": {
  "patientId": "P20260001",
  "recordType": "门诊病历",
  "keyPoints": [
    { "category": "主诉", "content": "发热 3 天" },
    { "category": "现病史", "content": "3 天前无明显诱因发热，伴咳嗽" }
  ]
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "generate_medical_record", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：电子病历*
