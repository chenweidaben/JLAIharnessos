# sync_to_his — 同步数据到HIS

> 所属分类：**系统集成** ｜ 工具名：`sync_to_his` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

将本系统产生的病历/医嘱/处方结果回写 HIS，需确认并经集成总线字段映射。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `integration:write` |
| 适用角色 | admin, doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| source | enum | 是 | medical_record/order/prescription |
| bizId | string | 是 | 业务单据ID |
| target | string | 否 | 目标 HIS（Weining/Donghua/Chuangye/Lianzhong/Zhiye） |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| syncId | string | 同步任务ID |
| status | string | success/failed |
| mappedFields | number | 映射字段数 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| HIS_UNAVAILABLE | HIS 接口不可用 |
| MAPPING_ERROR | 字段映射失败 |
| PERMISSION_DENIED | 缺少 integration:write 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "sync_to_his",
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
  "data": { "tool": "sync_to_his", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：系统集成*
