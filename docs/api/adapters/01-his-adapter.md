# HIS 适配器 API

> 对应源码：`src/integration/adapters/his/HISAdapter.ts`、`WeiningHISAdapter.ts`、`DonghuaHISAdapter.ts` 等

## 概述

HIS 适配器封装与医院信息系统（挂号、收费、医嘱、患者主索引）的双向对接，支持卫宁、东华、创业、联众、智业等主流厂商实现与 Mock 实现。

## 接口方法

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `getPatient(mpi)` | 患者主索引 | PatientInfo | 查询患者 |
| `getRegistration(patientId, date)` | 患者/日期 | Registration[] | 查询挂号 |
| `pushOrder(order)` | 医嘱对象 | Result | 医嘱下传 HIS |
| `pushPrescription(rx)` | 处方对象 | Result | 处方下传 |
| `charge(fee)` | 收费明细 | ChargeResult | 计费 |
| `healthCheck()` | - | HealthStatus | 连通性检查 |

## 配置项（AdapterConfig）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `vendor` | enum | weining/donghua/chuangye/lianzhong/zhiye/mock |
| `endpoint` | string | HIS 接口地址 |
| `appId / appSecret` | string | 认证凭据 |
| `timeoutMs` | number | 超时，默认 5000 |
| `retry` | number | 重试次数，默认 2 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `HIS_UNAVAILABLE` | HIS 不可用 |
| `AUTH_FAIL` | 认证失败 |
| `PATIENT_NOT_FOUND` | 患者主索引未命中 |
| `CHARGE_REJECTED` | 计费被拒 |

---

*健澜科技数智医院智能体 · 适配器 API*
