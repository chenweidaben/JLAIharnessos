# 健澜科技杠OS · 智能体市场（Agents）

本目录存放健澜科技杠OS内置的**十大刚需医疗智能体**。每个智能体都是一个声明式 **AgentPackage**，不写过程式代码即可被编排引擎加载、校验、运行，并在低代码画布中可视化编辑。

> 初心：**让医疗 AI 更简单、更落地。** 医院信息科可以直接复制任一智能体目录，改提示词、调工作流、换知识库，快速搭建本院专属智能体。

## 目录结构

```
agents/<agent-id>/
├── agent.yaml        # 智能体定义：元信息 + 工具/知识库授权 + 工作流 DAG（节点与边）
├── prompts/
│   └── system.md     # 系统提示词（可多份，在节点中按路径引用）
├── examples/
│   └── input.json    # 虚拟患者示例输入（禁止放入真实患者数据）
└── README.md         # 智能体说明
```

## 十大刚需智能体

| 智能体 | 目录 | 分类 | 风险等级 |
|--------|------|------|---------|
| AI 电子病历生成 | `medical-record-writer` | 电子病历 | 中 |
| AI 病历质控 | `medical-record-qc` | 医疗质控 | 低 |
| 语音电子病历 | `voice-medical-record` | 电子病历 | 中 |
| 智能诊断辅助 | `diagnosis-assistant` | 临床决策 | 中 |
| 智能处方审核 | `prescription-review` | 合理用药 | **高** |
| 检验检查报告解读 | `lab-imaging-interpreter` | 报告解读 | 低 |
| 智能编码与 DRG/DIP | `medical-coder` | 病案与医保 | 中 |
| 智能随访 | `follow-up` | 诊后管理 | 中 |
| 智能导诊预问诊 | `triage-preconsult` | 诊前服务 | 低 |
| 医务统计与报表 | `medical-affairs-report` | 运营管理 | 低 |

## 工作流节点（12 类）

`start` / `end` / `llm`（大模型）/ `tool`（医疗工具）/ `rag`（知识检索）/
`condition`（条件分支）/ `loop`（while、foreach 批量）/ `parallel`（all、any、race 并行）/
`human`（人工审核挂起）/ `subagent`（调用其他智能体 / MDT 会诊）/ `code`（安全表达式计算）/ `delay`。

## 安全设计

- **安全表达式沙箱**：自研递归下降解析，无 `eval`，拦截原型链与危险全局对象；
- **人工在环（Human-in-the-loop）**：所有高风险动作（病历归档、处方、危急值）强制人工确认；
- **风险分级**：工具与智能体按 low/medium/high 分级，高风险默认拦截 + 双复核；
- **可追溯**：全流程执行记录、审计留痕、校验和防篡改。

## 加载与校验（开发自测）

智能体在加载时会经过 Zod 结构校验、DAG 图论校验（无环、可达、端口完整）、工具/知识库/提示词引用校验与校验和验证：

```bash
# 全量智能体加载校验 + 重点智能体端到端冒烟
bun test tests/unit/orchestrator/agents.load.test.ts tests/unit/orchestrator/agents.exec.test.ts
```

## 自建一个智能体

1. 复制 `medical-record-writer/` 目录并改名；
2. 修改 `agent.yaml` 的 `id`、`name`、`tools`、`knowledgeBases` 与工作流；
3. 在 `prompts/system.md` 写角色提示词；
4. 在低代码画布（Web 端 Builder）中拖拽调整节点，或直接编辑 YAML；
5. 通过校验后即可发布到本院智能体市场。

> 所有示例均为**虚拟患者数据**。严禁在开源仓库提交任何真实患者隐私信息。
