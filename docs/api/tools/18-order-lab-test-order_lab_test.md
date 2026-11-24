# order_lab_test — 开立检验申请

> 所属分类：**检验检查** ｜ 工具名：`order_lab_test` ｜ 风险等级：**MEDIUM**（中（需用户确认））

## 工具描述

医生向 LIS 发起检验申请单，需确认并联动患者收费。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `medium` |
| 需要登录认证 | 是 |
| 需要用户确认 | 是 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `lab:order` |
| 适用角色 | doctor |
| 是否只读 | 否 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| patientId | string | 是 | 患者ID |
| encounterId | string | 是 | 就诊ID |
| testItems | array&lt;object&gt; | 是 | 检验项目列表（至少 1 项），元素：`{ testCode: enum(BLOOD_ROUTINE/BIOCHEMISTRY/CARDIAC_ENZYME/COAGULATION/THYROID), testName?: string, specimenType?: string, urgency: enum(常规/紧急/立即，默认常规) }` |
| clinicalDiagnosis | string | 否 | 临床诊断/开单原因 |
| priority | enum(常规/紧急/立即) | 否 | 申请优先级，默认 常规 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| orderId | string | 检验申请ID |
| orderStatus | enum(已提交/已审核/被阻止) | 申请状态 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| LICENSE_REQUIRED | 仅执业医师可开立 |
| LIS_UNAVAILABLE | LIS 接口不可用 |
| PERMISSION_DENIED | 缺少 lab:order 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "order_lab_test",
  "input": {
  "patientId": "P20260001",
  "encounterId": "E20260916001",
  "testItems": [
    { "testCode": "BLOOD_ROUTINE", "urgency": "常规" }
  ],
  "clinicalDiagnosis": "发热待查",
  "priority": "常规"
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "order_lab_test", "status": "ok" }
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

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：检验检查*
