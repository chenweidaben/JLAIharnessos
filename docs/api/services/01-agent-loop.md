# Agent 循环 API

> 对应源码：`src/core/agent/MedicalAgentLoop.ts`、`QueryEngine.ts`、`LLMClient.ts`、`SystemPromptBuilder.ts`

## 概述

Agent 循环（Agent Loop）是健澜科技数智医院智能体的核心推理引擎，负责"接收用户意图 → 调用大模型 → 决策调用医疗工具 → 执行 → 回灌结果 → 再推理"的闭环。该模块复用 claude-code 2.1.88 的 Agent 引擎，并针对医疗场景注入安全上下文与工具集。

## 核心类

### MedicalAgentLoop

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `run(input, context)` | `Promise<LoopResult>` | 启动一轮 Agent 推理循环 |
| `setMaxTurns(n)` | `void` | 设置最大推理轮数（防死循环） |
| `abort()` | `void` | 中止当前循环 |

#### LoopResult

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `finalText` | `string` | 最终面向用户的回答 |
| `toolCalls[]` | `array` | 本轮调用的工具与入参 |
| `turns` | `number` | 实际推理轮数 |
| `usage` | `object` | token 用量 |
| `traceId` | `string` | 链路追踪ID |

### LLMClient

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `chat(messages, options)` | `Promise<LLMMessage>` | 调用大模型（基于 `@anthropic-ai/sdk@0.80.0`） |
| `setModel(model)` | `void` | 切换模型 |
| `setTimeout(ms)` | `void` | 设置超时 |

### SystemPromptBuilder

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `build(context)` | `string` | 按医生角色、科室子代理、安全约束拼装系统提示词 |

## 调用示例

```typescript
const loop = new MedicalAgentLoop(llmClient, registry, context);
loop.setMaxTurns(12);
const result = await loop.run("帮我看下3床王*英的检验结果", medicalContext);
console.log(result.finalText);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `MODEL_TIMEOUT` | 大模型超时 |
| `MAX_TURNS_EXCEEDED` | 超过最大推理轮数 |
| `TOOL_UNKNOWN` | 模型请求了未注册工具 |
| `CONTEXT_OVERFLOW` | 上下文超长，需先压缩 |

---

*健澜科技数智医院智能体 · 服务 API*
