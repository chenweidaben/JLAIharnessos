# jlmedaios 术语表（glossary.md）

> 统一业务与技术叫法。AI 协作者写代码/文档必须与本表一致，禁止自造同义新词。
> 与 `CLAUDE.md`、`ARCHITECTURE_CHARTER.md`、`docs/ARCHITECTURE.md` 配套；新增术语先在此登记。

---

## 1. 产品与核心概念

| 中文 | 英文/标识 | 定义 |
|------|----------|------|
| 健澜 AI 原生医院操作系统 | jlmedaios | 医院"操作系统/AI 大脑"，不是 HIS |
| AI 原生医院 | AI-Native Hospital | 系统本身就是学习系统，非"传统 HIS + AI 外挂" |
| 组织级智能底座 | MEDMUSE | 全院智慧汇聚的 AI 核心引擎 |
| 个人智能体 | Personal Agent | 医生/护士/药师/管理者的专属 agent |
| 医生个人智能体 | Doctor MUSE | 学习医生的诊断/用药/沟通习惯 |
| 护士个人智能体 | Nurse MUSE | 护理判断/风险识别 |
| 药师个人智能体 | Pharma MUSE | 审方经验/相互作用 |
| 管理者个人智能体 | Admin MUSE | 运营决策/质控 |
| 科室层/医院层智能 | Dept MUSE / Hospital MUSE | 经验从个人→科室→医院三级聚合 |
| 学习点 | Learning Point | 记录→积累→进化→反馈 的闭环单元 |
| 反馈闭环 | Feedback Loop | AI 输出可 adopted/modified/rejected |
| 后继者机制 | Successor Mechanism | 新员工自动加载岗位历史经验基线 |

## 2. 架构术语

| 中文 | 英文/标识 | 定义 |
|------|----------|------|
| 体验层 | BFF | Backend for Frontend，前端聚合/鉴权/缓存（8080） |
| 交易引擎 | Transaction Engine | Java 业务层，45 个业务模块（9090） |
| 模块化单体 | Modular Monolith | Spring Modulith，域内高内聚、域间低耦合 |
| 业务域 | Business Domain | 按业务域拆分（reg/orders/pharmacy/…） |
| 本地推理 | vLLM | 院内本地大模型推理引擎，数据不出院 |
| 流式输出 | SSE | Server-Sent Events，MEDMUSE 输出流 |
| 智能体编排 | Orchestration | 主代理 + 8 科室子代理 + 编排引擎 |
| 子代理 | Sub-agent | 科室级代理（ADR-010） |

## 3. 医疗业务术语

| 中文 | 英文/标识 | 定义 |
|------|----------|------|
| 医院信息系统 | HIS | 挂号/收费/医嘱等交易系统 |
| 电子病历 | EMR | 电子病历（本项目 append-only + 哈希链） |
| 检验/影像系统 | LIS / PACS | 检验 / 影像归档与通信 |
| 临床决策支持 | CDS | 高危用药/漏诊实时拦截（ADR-009） |
| 疾病编码 | ICD-10 / ICD-9-CM-3 | 诊断 / 手术操作编码 |
| 医保分组 | DRG / DIP | 疾病诊断相关分组 / 按病种分值付费 |
| 互联互通四甲 | Interoperability 4A | FHIR R4 四级甲等测评目标 |
| 个人健康信息 | PHI | Protected Health Information（敏感级） |

## 4. 安全合规术语

| 中文 | 英文/标识 | 定义 |
|------|----------|------|
| 国密算法 | SM2 / SM3 / SM4 | 签名 / 哈希 / 加密（生产接 HSM） |
| 硬件加密机 | HSM | Hardware Security Module |
| 数字签章 / 时间戳 | CA / TSA | 病历法律效力的签章与可信时间 |
| 追加写病历 | append-only | 病历不可修改，只能追加 review |
| 哈希链 | Hash Chain | SHA-256 链式链接（prevHash → appendHash） |
| 三级风险确认 | 3-level Risk | low只读/medium单次确认/high双重确认（ADR-006） |
| 四级数据分级 | 4-level Data Class | 公开/内部/敏感(PHI)/极敏感（ADR-007） |
| 脱敏引擎 | DesensitizationEngine | 展示层自动掩码 |
| 风险确认器 | ToolRiskManager | 执行前定级，fail-closed |
| 幂等 | Idempotency | 写操作带 Idempotency-Key |
| 熔断降级 | Circuit Breaker | 30s 超时 + 指数退避 + 降级 mock |

## 5. AI 与智能体术语

| 中文 | 英文/标识 | 定义 |
|------|----------|------|
| 智能体包 | AgentPackage | 声明式（agent.yaml + prompts）分发单元 |
| 人机协同 | humanInLoop | 智能体输出须人工确认（所有刚需智能体为 true） |
| 风险等级 | riskLevel | low / medium / high |
| 检索增强生成 | RAG | Retrieval-Augmented Generation（ADR-008） |
| 模型上下文协议 | MCP | Model Context Protocol |
| 三级反馈 | adopted/modified/rejected | 采纳/修改/拒绝，即训练信号 |

## 6. 命名与缩写约定

- 代码标识用英文；业务术语中文名须与本表一致。
- 实体/表/字段命名对齐 `docs/technical/03-数据模型与知识库设计.md`。
- 缩写首次出现写全称 + 缩写，之后只用缩写（MEDMUSE、MUSE、CDS、PHI、HSM、TSA）。
- **新增术语先登记本表，再用于代码/文档**，禁止"先写后补"。

---

## 附：变更登记

| 日期 | 变更 |
|------|------|
| 2026-11-27 | 初稿（产品/架构/医疗/安全/AI 五类术语） |
