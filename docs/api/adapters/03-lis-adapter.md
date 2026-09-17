# LIS 适配器 API

> 对应源码：`src/integration/adapters/lis/LISAdapter.ts`、`LISMockAdapter.ts`

## 概述

LIS 适配器对接实验室信息系统，完成检验申请下传、标本状态回传与检验结果/危急值获取。

## 接口方法

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `placeOrder(order)` | 检验申请 | OrderAck | 下传检验申请 |
| `getResult(patientId, item?)` | 患者/项目 | LabResult[] | 获取检验结果 |
| `getCriticalValues(patientId?)` | 患者/科室 | CriticalValue[] | 获取危急值 |
| `getSpecimenStatus(orderId)` | 申请ID | SpecimenStatus | 标本状态 |
| `healthCheck()` | - | HealthStatus | 连通性 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `LIS_UNAVAILABLE` | LIS 不可用 |
| `SPECIMEN_REJECTED` | 标本不合格 |
| `RESULT_PENDING` | 结果未出 |

---

*健澜科技数智医院智能体 · 适配器 API*
