# EMR 适配器 API

> 对应源码：`src/integration/adapters/emr/EMRAdapter.ts`、`EMRMockAdapter.ts`

## 概述

EMR 适配器负责从源电子病历系统拉取病历正文、就诊记录与医嘱历史，供本系统融合与智能分析。

## 接口方法

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `fetchRecord(encounterId)` | 就诊ID | MedicalRecord | 拉取病历 |
| `fetchEncounters(patientId)` | 患者ID | Encounter[] | 就诊列表 |
| `fetchOrders(encounterId)` | 就诊ID | Order[] | 历史医嘱 |
| `pushDraft(encounterId, content)` | 就诊ID+正文 | Result | 回写草稿 |
| `healthCheck()` | - | HealthStatus | 连通性 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `EMR_UNAVAILABLE` | EMR 不可用 |
| `RECORD_NOT_FOUND` | 病历不存在 |
| `PERMISSION_DENIED` | 无该患者访问权 |

---

*健澜科技数智医院智能体 · 适配器 API*
