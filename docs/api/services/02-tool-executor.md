# 工具执行器 API

> 对应源码：`src/core/tools/ToolExecutor.ts`、`MedicalToolRegistry.ts`、`ToolRiskManager.ts`、`buildMedicalTool.ts`

## 概述

工具执行器负责安全、受控地执行医疗工具调用。在执行前后统一完成：输入校验（Zod）→ 权限校验 → 风险确认（一级/二级/三级）→ 审计日志写入 → 结果脱敏。

## 核心类

### ToolExecutor

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `execute(name, input, context)` | `Promise<ToolResult>` | 按工具名执行一次工具调用 |
| `listTools()` | `MedicalToolDefinition[]` | 列出当前可执行工具 |
| `setTimeout(ms)` | `void` | 全局执行超时 |

### MedicalToolRegistry

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `register(tool)` | `void` | 注册工具 |
| `get(name)` | `MedicalToolDefinition \| undefined` | 按名获取工具 |
| `getAll()` | `MedicalToolDefinition[]` | 获取全部工具 |
| `getByCategory(c)` | `MedicalToolDefinition[]` | 按分类获取 |
| `has(name)` | `boolean` | 是否存在 |
| `size` | `number` | 工具数量 |

### ToolRiskManager

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `resolve(tool, input)` | `RiskDecision` | 计算本次调用所需的确认级别（low/medium/high） |
| `requiresConfirm(tool)` | `boolean` | 是否需要确认 |

## 三级风险确认机制

| 级别 | 触发条件 | 交互 |
| --- | --- | --- |
| 一级 | 只读查询（low） | 直接执行，记录审计 |
| 二级 | 写操作（medium） | 弹窗提示，医生单次确认 |
| 三级 | 高危写操作（high） | 二次确认 + 执业医师/处方权校验 + CA 签名 |

## 调用示例

```typescript
const executor = new ToolExecutor(registry, riskManager, auditLogger);
const result = await executor.execute("create_order", {
  patientId: "P20260001", orderType: "药品", orderContent: "阿司匹林100mg qd",
}, medicalContext);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `TOOL_NOT_FOUND` | 工具未注册 |
| `PERMISSION_DENIED` | 权限不足 |
| `CONFIRM_REQUIRED` | 需要用户确认 |
| `EXECUTION_TIMEOUT` | 执行超时 |
| `VALIDATION_ERROR` | 入参校验失败 |

---

*健澜科技数智医院智能体 · 服务 API*
