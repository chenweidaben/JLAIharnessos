# drug_interaction_check — 药物相互作用检查

> 所属分类：**临床决策支持** ｜ 工具名：`drug_interaction_check` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

对一组当前用药与拟用药物进行相互作用筛查，输出风险等级与处置建议。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | 无（公开只读） |
| 适用角色 | doctor, pharmacist |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| currentDrugs | array<string> | 是 | 当前用药列表 |
| proposedDrugs | array<string> | 是 | 拟用药物列表 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| interactions[] | array | 相互作用（药物对/风险等级/机制/建议） |
| overallRisk | enum | safe/caution/contraindicated |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| VALIDATION_ERROR | 用药列表为空 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "drug_interaction_check",
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
  "data": { "tool": "drug_interaction_check", "status": "ok" }
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
