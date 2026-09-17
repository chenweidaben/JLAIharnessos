# query_patient — 查询患者

> 所属分类：**患者管理** ｜ 工具名：`query_patient` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

根据患者ID、姓名、身份证号、性别、年龄范围等条件查询患者基本信息列表，支持模糊搜索和分页。返回脱敏后的患者数据。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `patient:read` |
| 适用角色 | doctor, nurse, admin |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| name | string | 否 | 患者姓名（支持模糊匹配） |
| patientId | string | 否 | 患者唯一ID |
| idCard | string | 否 | 身份证号（脱敏存储） |
| gender | enum(男/女/未知) | 否 | 性别 |
| ageRange.min | integer | 否 | 最小年龄 0-150 |
| ageRange.max | integer | 否 | 最大年龄 0-150 |
| page | integer | 否 | 页码，默认 1 |
| pageSize | integer | 否 | 每页条数，默认 10，最大 50 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| success | boolean | 是否成功 |
| total | number | 总匹配数 |
| page | number | 当前页码 |
| pageSize | number | 每页条数 |
| data[] | array | 患者列表（姓名已脱敏，如 李*英） |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| VALIDATION_ERROR | 至少提供一个查询条件 |
| PERMISSION_DENIED | 缺少 patient:read 权限 |
| RATE_LIMITED | 查询过于频繁，触发限流 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "query_patient",
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
  "data": { "tool": "query_patient", "status": "ok" }
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
