# drg_dip_analysis — DRG/DIP分析

> 所属分类：**运营管理** ｜ 工具名：`drg_dip_analysis` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

按 DRG/DIP 分组分析病组盈亏、费用结构与效率。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `drg:read` |
| 适用角色 | admin |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| period | string | 是 | 统计周期 |
| groupCode | string | 否 | DRG/DIP 病组 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| groups[] | array | 病组分析（权重/费用/盈亏/住院日） |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PERMISSION_DENIED | 缺少 drg:read 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "drg_dip_analysis",
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
  "data": { "tool": "drg_dip_analysis", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：运营管理*
