# 集成适配器 API

> 对应源码：`src/integration/adapters/AdapterRegistry.ts`、`BaseAdapter.ts`、`AdapterConfig.ts`、`AdapterError.ts`、`middleware/IntegrationBus.ts`、`middleware/FieldMapper.ts`

## 概述

集成适配器统一封装与医院 HIS / EMR / LIS / PACS 等外部系统的对接，通过适配器注册表管理多厂商实现，并经集成总线完成协议转换、字段映射与熔断重试。

## 核心类

### AdapterRegistry

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `register(adapter)` | `void` | 注册适配器 |
| `get(system)` | `BaseAdapter \| undefined` | 按系统名获取 |
| `list()` | `BaseAdapter[]` | 列出全部 |

### BaseAdapter

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `connect(config)` | `Promise<void>` | 建立连接 |
| `read(bizType, query)` | `Promise<DataFrame>` | 读取数据 |
| `write(bizType, data)` | `Promise<Result>` | 写回数据 |
| `healthCheck()` | `HealthStatus` | 健康检查 |

### IntegrationBus

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `send(message)` | `Promise<Ack>` | 经总线投递消息（含熔断/重试） |
| `subscribe(bizType, handler)` | `void` | 订阅业务事件 |

### FieldMapper

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `map(fromSchema, toSchema, data)` | `object` | 院内字段映射转换 |

## 已实现 HIS 适配器

| 适配器 | 文件 |
| --- | --- |
| 卫宁 HIS | `WeiningHISAdapter.ts` |
| 东华 HIS | `DonghuaHISAdapter.ts` |
| 创业 HIS | `ChuangyeHISAdapter.ts` |
| 联众 HIS | `LianzhongHISAdapter.ts` |
| 智业 HIS | `ZhiyeHISAdapter.ts` |
| Mock | `HISMockAdapter.ts` |

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `ADAPTER_NOT_FOUND` | 适配器未注册 |
| `CONNECTION_FAIL` | 外部系统连接失败 |
| `MAPPING_ERROR` | 字段映射失败 |
| `UPSTREAM_TIMEOUT` | 上游超时（已重试） |

---

*健澜科技数智医院智能体 · 服务 API*
