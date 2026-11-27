# 阿里云百炼（Bailian / DashScope）融合集成说明

> 集成日期：2026-11-26 · 上游：`modelstudioai/cli`（阿里云百炼 CLI，Apache-2.0，TypeScript）
> 本文档说明「健澜 AI 原生医院操作系统」如何接入阿里云百炼的通义千问（Qwen）模型，
> 以及百炼开放生态中可进一步融合的能力清单。

---

## 一、阿里云百炼是什么

「阿里百灵」的规范名称为 **阿里云百炼（Alibaba Cloud Bailian，即 Model Studio / DashScope）**，
是阿里云的大模型服务平台，聚合 150+ 模型（通义千问 Qwen、DeepSeek、GLM、Kimi、Wan 视频/图像等），
并提供知识库（RAG）、长期记忆、联网搜索、智能体（Managed Agent / Flow Agent）、文档解析（ParseX）、
语音/图像/视频理解、Batch 推理等能力。

其官方开源 CLI 为 [`modelstudioai/cli`](https://github.com/modelstudioai/cli)（npm 包 `bailian-cli`，
命令 `bl`），已于 2026-05-29 全面 CLI 化并开源，专为 AI Agent 框架设计：
每个命令均以**结构化工具调用**形式暴露，供 Agent 直接编排。

本仓库已浅克隆该上游至本地研究参考目录（`../bailing-cli`），并据此对齐其
**OpenAI 兼容端点**的协议细节，完成底层模型接入。

---

## 二、已完成集成：`BailianProvider`

### 2.1 落点

| 文件 | 说明 |
|------|------|
| `src/core/agent/providers/BailianProvider.ts` | 新增 Provider，实现 `ILLMClient`，与 `DeepSeekProvider` 同构 |
| `src/core/agent/providers/factory.ts` | `createLlmClient()` 增加 `bailian` / `dashscope` / `qwen` 分支 |
| `tests/unit/core/BailianProvider.test.ts` | 单元测试（注入 fetch 伪造网络，覆盖流式/工具调用/重试/鉴权/别名） |
| `.env.example` | 增加 `BAILIAN_*` 配置说明 |

### 2.2 协议

调用阿里云百炼的 OpenAI 兼容端点：

```
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer <API_KEY>
```

与 `DeepSeekProvider` 使用完全一致的 SSE 流式协议（`stream_options.include_usage`、
`tool_calls` 分片累积、`[DONE]` 终止），因此 Agent 主循环零改动。

### 2.3 模型别名映射

| 内部别名（ModelAlias） | 百炼模型 | 环境变量 |
|------------------------|----------|----------|
| `sonnet` / `haiku` | `qwen-plus`（对话） | `BAILIAN_MODEL` |
| `opus` | `qwen-max`（推理） | `BAILIAN_REASONING_MODEL` |

### 2.4 切换方式

```bash
LLM_PROVIDER=bailian
BAILIAN_API_KEY=sk-xxx
BAILIAN_MODEL=qwen-plus          # 可选，默认 qwen-plus
BAILIAN_REASONING_MODEL=qwen-max # 可选，默认 qwen-max
```

`LLM_PROVIDER` 也接受 `dashscope`、`qwen` 作为等价别名。安全红线：API Key 仅从环境变量读取，
任何情况下不落盘、不写入代码或日志。

---

## 三、待进一步融合的百炼能力（排期建议）

百炼 CLI（`bl`）暴露的能力远多于底层文本模型，适合作为本仓库下一步的**工具桥接**（Tool Bridge）接入，
与现有 `src/skills`、`src/orchestrator` 的 MCP/工具体系对齐：

| 能力 | 百炼命令/能力 | 对本仓库的契合点 | 优先级 |
|------|---------------|------------------|--------|
| 知识库 RAG | `bl knowledge *` | 医学知识库检索（`src/knowledge`） | 高 |
| 文档解析 ParseX | `bl parsex *` | 病历/报告/影像文档结构化抽取 | 高 |
| 图像/视频理解 | 多模态模型 | `lab-imaging-interpreter` 影像解读 Agent | 高 |
| 语音识别 ASR | 语音模型 | `voice-medical-record` 语音病历 | 中 |
| Managed/Flow Agent | `bl app *` | 云侧智能体编排与 MCP 注册 | 中 |
| 长期记忆 | `bl memory *` | 患者画像/随访记忆 | 中 |
| 联网搜索 | 搜索模型 | 诊疗指南/文献检索 | 低 |
| Batch 推理 | `bl batch *` | 批量病历/质控离线处理 | 低 |

> 注意：桥接方式建议通过 `bl` CLI 子进程或直接调用 DashScope OpenAPI，
> 而非把 `bailing-cli` 整个仓并入本仓库——两者均为 Apache-2.0，可自由引用，
> 但 CLI 属独立运行时可执行程序，应作为「工具」而非「库」集成。

---

## 四、许可与合规

- 上游 `modelstudioai/cli`：Apache-2.0，允许商用与再分发，需保留版权声明。
- 本集成仅实现 `ILLMClient` 接口（自有代码），未复制上游实现，仅对齐公开协议端点。
- 医疗场景合规：患者隐私数据出域前须完成去标识化，并遵守医院数据安全与等保要求；
  `BAILIAN_API_KEY` 生产环境应走院内密钥管理服务（KMS/Vault），禁止明文入镜像。
