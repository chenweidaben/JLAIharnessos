# appointment_registration — 预约挂号

> 所属分类：**患者服务** ｜ 工具名：`appointment_registration` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

为患者预约指定医生/科室号源并完成挂号登记。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `appointment:create` |
| 适用角色 | doctor, admin, nurse |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者ID |
| department | string | 是 | 科室 |
| doctorId | string | 否 | 医生 |
| scheduleTime | string | 是 | 预约时段 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| appointmentId | string | 挂号ID |
| status | string | 预约成功/已确认 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| SLOT_FULL | 号源已满 |
| PERMISSION_DENIED | 缺少 appointment:create 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "appointment_registration",
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
  "data": { "tool": "appointment_registration", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：患者服务*
