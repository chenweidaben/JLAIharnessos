# 上下文管理器 API

> 对应源码：`src/core/context/ContextCompressor.ts`、`MedicalContextBuilder.ts`、`TokenBudgetTracker.ts`

## 概述

上下文管理器负责在有限 token 窗口内组织"系统提示词 + 病历 + 对话历史 + 工具结果"，并在超限时进行压缩与裁剪，保障医疗上下文的完整性与安全。

## 核心类

### MedicalContextBuilder

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `build(session, patient)` | `LLMContext` | 拼装一轮推理的完整上下文 |

### ContextCompressor

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `compress(context, budget)` | `CompressedContext` | 按 token 预算压缩历史 |
| `summarize(turns)` | `string` | 对早期对话生成摘要 |

### TokenBudgetTracker

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `add(usage)` | `void` | 累加 token 用量 |
| `remaining()` | `number` | 剩余预算 |
| `isExceeded()` | `boolean` | 是否超预算 |

## 调用示例

```typescript
const budget = new TokenBudgetTracker(128_000);
const compressed = new ContextCompressor().compress(rawContext, budget.remaining());
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `CONTEXT_OVERFLOW` | 压缩后仍超限 |
| `TOKEN_LIMIT` | token 预算耗尽 |

---

*健澜科技数智医院智能体 · 服务 API*
