# FHIR 资源 API

> 对应源码：`src/integration/protocols/fhir/FHIRClient.ts`、`FHIRBuilder.ts`、`FHIRResource.ts`、`FHIRParser.ts`

## 概述

FHIR 模块基于 HL7 FHIR R4 标准，以 RESTful 资源方式与互联互通平台/区域卫生信息平台交换数据。

## 核心类

### FHIRClient

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `read(resourceType, id)` | 类型+ID | Resource | 读取资源 |
| `search(type, params)` | 类型+查询参数 | Bundle | 条件检索 |
| `create(type, resource)` | 类型+资源 | Result | 创建资源 |
| `update(type, id, resource)` | 类型+ID+资源 | Result | 更新资源 |

### FHIRBuilder / FHIRParser

| 方法 | 说明 |
| --- | --- |
| `buildPatient(...)` | 构造 Patient 资源 |
| `buildObservation(...)` | 构造 Observation 资源 |
| `parse(bundle)` | 解析 Bundle 为领域对象 |

## 常用资源类型

| 资源 | 含义 |
| --- | --- |
| `Patient` | 患者 |
| `Encounter` | 就诊 |
| `Observation` | 检验检查结果 |
| `MedicationRequest` | 用药医嘱 |
| `DiagnosticReport` | 诊断报告 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `FHIR_NOT_FOUND` | 资源不存在（HTTP 404） |
| `FHIR_OPERATION_OUTCOME` | 操作失败（OperationOutcome） |
| `FHIR_AUTH_FAIL` | OAuth2/token 失败 |

---

*健澜科技数智医院智能体 · 适配器 API*
