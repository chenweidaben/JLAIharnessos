# HL7 消息 API

> 对应源码：`src/integration/protocols/hl7/HL7Parser.ts`、`HL7Builder.ts`、`HL7Message.ts`、`HL7MessageTypes.ts`

## 概述

HL7 消息模块提供 HL7 v2.x 消息的解析与构造能力，基于 MLLP 协议与院内集成引擎交换 ADT / ORM / ORU 等消息。

## 核心类

### HL7Parser

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `parse(raw)` | MLLP 字节流 | HL7Message | 解析消息 |
| `parseBatch(raw)` | 多帧流 | HL7Message[] | 批量解析 |

### HL7Builder

| 方法 | 入参 | 出参 | 说明 |
| --- | --- | --- | --- |
| `adtA04(fields)` | 业务字段 | HL7Message | 构造入院登记消息 |
| `ormO01(fields)` | 医嘱字段 | HL7Message | 构造医嘱消息 |
| `oruR01(fields)` | 结果字段 | HL7Message | 构造结果消息 |
| `buildAck(message, code)` | 原消息+状态 | HL7Message | 构造 ACK |

## 常用消息类型

| 类型 | 含义 |
| --- | --- |
| `ADT^A04` | 就诊登记 |
| `ORM^O01` | 医嘱下单 |
| `ORU^R01` | 结果上传 |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `HL7_PARSE_ERROR` | 消息格式错误 |
| `HL7_REQUIRED_FIELD` | 必填段缺失 |
| `MLLP_IO_ERROR` | MLLP 收发失败 |

---

*健澜科技数智医院智能体 · 适配器 API*
