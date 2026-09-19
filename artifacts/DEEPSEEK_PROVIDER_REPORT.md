# DeepSeek Provider 接入交付报告（jlmedaios 第二阶段）

日期：2026-09-19
范围：为 jlmedaios 新增 DeepSeek Provider（OpenAI Chat Completions 兼容 + SSE 流式），实现现有 ILLMClient 抽象接口，不改动 Agent 主循环。

## 一、新增文件清单
1. `src/core/agent/providers/DeepSeekProvider.ts` —— DeepSeekProvider，implements ILLMClient
2. `src/core/agent/providers/factory.ts` —— createLlmClient() 工厂，按 LLM_PROVIDER 装配
3. `tests/unit/core/DeepSeekProvider.test.ts` —— 单元测试（mock fetch，不打真实网络）
4. `scripts/deepseek-e2e.ts` —— 真实端到端验证脚本
5. `artifacts/deepseek-e2e.log` —— 真实 E2E 响应落日志（运行产物）

未改动任何既有文件；Agent 主循环（QueryEngine）通过 config.llm 注入位接入，零侵入。

## 二、ILLMClient 实现的方法
- `streamChat(params, modelAlias?)`：SSE 流式，翻译为内部 LLMStreamEvent（message_start / text_delta / tool_use_start / tool_use_input_delta / tool_use_end / message_delta / message_stop）
- `getModel(alias)`：返回 { alias, model, contextWindow }
- `getCumulativeUsage()`：返回累计 { input, output } 副本

## 三、模型别名映射表
| 别名 | 真实模型 | 来源 |
|------|----------|------|
| sonnet | LLM_MODEL（默认 deepseek-chat） | process.env.LLM_MODEL |
| haiku  | LLM_MODEL（轻量，deepseek-chat） | process.env.LLM_MODEL |
| opus   | LLM_REASONING_MODEL（deepseek-reasoner） | process.env.LLM_REASONING_MODEL |
| contextWindow | 64000（保守） | 常量 |

## 四、单元测试覆盖场景（10 个用例，38 expect）
- 模型别名映射（sonnet/haiku→chat，opus→reasoning）
- 初始/累计用量为 0 且返回副本
- 文本流式拼接（按序 text_delta、message_stop 聚合全文与 usage）
- 工具调用分片累积（start / input_delta / end，arguments 分片合并为完整 JSON）
- 消息/工具映射（tool_result→role:tool 带 tool_call_id；assistant 的 tool_calls）
- 重试：5xx 触发重试第二次成功；4xx（非429）不重试直接抛错
- 鉴权：无 apiKey 抛未认证错误且不发请求
- [DONE] 正常终止
- factory：LLM_PROVIDER=deepseek 返回 DeepSeekProvider 实例

## 五、验证命令与结果
- `bunx tsc --noEmit`：0 错误
- `bun test`：1058 pass / 0 fail / 93 文件 / 5198 expect（基线 1048 → +10，只增不减）

## 六、真实 E2E 结果（一次性打真实网络）
- 脚本：`bun run scripts/deepseek-e2e.ts`
- 场景：门诊健康助手，空腹血糖 7.2mmol/L 就诊咨询
- 结果：成功流式返回医学科普回答（未下处方，仅科普+就诊建议）
- usage：input 70 / output 224；累计 usage 70/224 一致
- 耗时：约 1782ms；stopReason=stop
- 日志落盘：artifacts/deepseek-e2e.log

## 七、安全
- API Key 仅从 process.env.LLM_API_KEY 读取，未硬编码进任何代码；.env 已被 .gitignore 忽略；报告与日志均不打印 key。

## 八、遗留/后续
- DeepSeek 暂未启用推理模型（reasoner）真实调用验证；opus 别名已映射，待复杂临床推理场景接入。
- 高并发下建议后续为该 Provider 加连接池/限流（属第三阶段任务）。
