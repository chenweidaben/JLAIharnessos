# PACS 适配器 API

> 对应源码：`src/integration/adapters/pacs/PACSAdapter.ts`、`PACSMockAdapter.ts`

## 概述

PACS 适配器对接影像归档与通信系统，完成影像检查预约、报告获取与 DICOM 影像调阅（WADO-RS）。

## 接口方法

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `placeExam(order)` | 影像申请 | ExamAck | 下传影像申请 |
| `getReport(studyId)` | 检查号 | ImageReport | 获取诊断报告 |
| `getStudy(studyId)` | 检查号 | DICOMStudy | 获取影像元数据/序列 |
| `retrieveFrame(uid)` | 实例UID | RetrieveUrl | 获取 WADO-RS 句柄 |
| `healthCheck()` | - | HealthStatus | 连通性 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `PACS_UNAVAILABLE` | PACS 不可用 |
| `STUDY_NOT_FOUND` | 影像检查不存在 |
| `RETRIEVE_DENIED` | 无影像调阅权限 |

---

*健澜科技数智医院智能体 · 适配器 API*
