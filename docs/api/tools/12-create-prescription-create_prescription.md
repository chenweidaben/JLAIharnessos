# create_prescription — 开具处方

> 所属分类：**处方药品** ｜ 工具名：`create_prescription` ｜ 风险等级：**HIGH**（高（需双重确认+资格校验））

## 工具描述

开具药品处方，支持普通/特殊/麻醉级别。高风险操作，需双重确认、执业医师资格与处方权校验，并自动执行合理用药检查。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `high` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 是 |
| 所需权限 | `prescription:create` |
| 适用角色 | doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者ID |
| encounterId | string | 是 | 就诊ID |
| items[] | array | 是 | 处方明细（药品/规格/剂量/用法/数量） |
| diagnosis | string | 是 | 临床诊断 |
| prescriptionType | enum | 否 | 普通/特殊/麻醉，默认普通 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| prescriptionId | string | 处方ID |
| status | string | 待药师审核/已开立 |
| safetyCheck | object | 相互作用/禁忌/过敏/剂量预警 |
| requiresDoubleConfirm | boolean | 需双重确认 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PRESCRIPTION_RIGHT_REQUIRED | 无相应级别处方权 |
| SAFETY_BLOCKED | 合理用药检查未通过 |
| PERMISSION_DENIED | 缺少 prescription:create 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "create_prescription",
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
  "data": { "tool": "create_prescription", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：处方药品*
