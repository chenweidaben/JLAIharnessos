# 示例（Examples）

本目录提供健澜科技杠OS 的可运行示例，帮助你快速理解核心能力。
后端示例使用 [Bun](https://bun.sh/) 运行；部分示例默认 BFF 已在本地启动（`bun run bff`）。

| 示例 | 说明 | 运行 |
| ---- | ---- | ---- |
| [`orchestrate.ts`](orchestrate.ts) | **智能体编排快速上手**：加载 `agents/` 中的 agent.yaml，在确定性 Mock 运行时中跑通「生成→质控→人工审核→归档」，演示人工挂起与审批 | `bun examples/orchestrate.ts` |
| [`auth-flow.ts`](auth-flow.ts) | 登录获取 JWT、刷新令牌、携带令牌访问受保护接口 | `bun examples/auth-flow.ts` |
| [`patient360.ts`](patient360.ts) | 通过 BFF 聚合接口获取患者 360 全景（HIS/EMR/LIS/PACS 脱敏数据） | `bun examples/patient360.ts` |
| [`chat-stream.tsx`](chat-stream.tsx) | 智能体流式对话（SSE/流式输出）的前端用法 | 供前端参考 |
| [`ws-alerts.tsx`](ws-alerts.tsx) | WebSocket 订阅危急值/告警推送 | 供前端参考 |
| [`curl.sh`](curl.sh) | 用 curl 调用认证、患者、对话、告警等 REST 接口 | `bash examples/curl.sh` |

## 最小编排示例（节选）

```ts
import { createMockOrchestrator } from '@/orchestrator/index.js';
import { loadAgentPackageFromDir } from '@/orchestrator/pack/directoryLoader.js';

const orch = createMockOrchestrator();                 // 生产环境改用 createOrchestrator 注入真实依赖
const loaded = await loadAgentPackageFromDir('./agents/medical-record-writer');
orch.packManager.importPackage(loaded.pkg, { resolver });
const agent = orch.registry.get('medical-record-writer')!;
const result = await orch.invoker.run(agent, { patientId: 'P1' }, { trigger: 'api' });
```

完整可运行版本见 [`orchestrate.ts`](orchestrate.ts)。十大刚需智能体模板见 [`../agents/`](../agents/)，
低代码画布见 Web 工作台「智能体工厂」，DSL 规范见[《Agent 能力与医疗工具设计》](../docs/technical/02-Agent能力与医疗工具设计.md)。
