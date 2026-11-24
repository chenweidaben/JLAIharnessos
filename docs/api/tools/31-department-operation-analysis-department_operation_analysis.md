# department_operation_analysis — 科室运营分析

> 所属分类：**运营管理** ｜ 工具名：`department_operation_analysis` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

输出科室门诊量、床位使用率、平均住院日等运营指标分析。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `operation:read` |
| 适用角色 | admin |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| department | string | 是 | 科室名称（如心血管内科） |
| startDate | string | 是 | 开始日期或月份（YYYY-MM 或 YYYY-MM-DD） |
| endDate | string | 是 | 结束日期或月份（YYYY-MM 或 YYYY-MM-DD） |
| metrics | array&lt;string&gt; | 否 | 关注指标列表（缺省返回全部核心指标） |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| dataPoints[] | array | 运营指标月度数据点 |
| summary | object | 汇总指标 |
| insights[] | array | 运营解读 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PERMISSION_DENIED | 缺少 operation:read 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "department_operation_analysis",
  "input": {
  "department": "心血管内科",
  "startDate": "2026-09",
  "endDate": "2026-11"
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "department_operation_analysis", "status": "ok" }
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
