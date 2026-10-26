# S-12 切片记录：引用编号协议与检索质量闭环（后端协议先行）

- **切片编号**：S-12
- **产品口径**：健澜AI原生医院操作系统OS
- **署名**：杭州健澜科技有限公司
- **基线仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`，基线 HEAD `1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **实现形态**：纯类型 + 纯函数 + 进程无状态模块，离线闭环；不接 DB、不发起网络请求、不调用真实 LLM / Embedding；测试使用 demo 合成夹具，无院方实名、无明文端点、无密钥口令。

## 1. 目标与契约依据

### 1.1 技术文档章节（`docs/technical/YXS20261026-development-spec-2026-10-26.md`）

| 章节 | 行号 | 落地内容 |
|---|---|---|
| 3.3.5 引用溯源协议（S-12） | 419–442 | `RetrievalHit` 扩展字段（`chunkId / title / sectionPath / provenance / pageRef / effectiveDate / score / graphPath`）；模型输出结构化字段 `content / citations / missingInfo / evidenceLevel`；`Citation` 八字段；前端 `[n]` 编号锚点弹窗数据契约；`evidenceLevel=none` 必须标注「（待核实）」且不得出现确定性结论；未引用知识却下结论由 S-01 输出校验器标记 CAUTION/BLOCK |
| 3.3.6 验收标准（S-11、S-12、S-13） | 444–446 | 引用编号与弹窗组件闭环；既有知识中台测试不回归 |
| 台账 S-12 验收口径 | 1417 | 「检索质量闭环：拒答协议、引用编号协议、前端原文弹窗；无命中拒答测试；引用弹窗闭环」 |

### 1.2 差距矩阵（`docs/research/YXS20261026-gap-matrix-2026-10-26.md`）

| 编号 | 行号 | 差距说明 | 本切片落地 |
|---|---|---|---|
| R-06 | 200 | 流程顺序与方案一致；重排为规则加权而非独立重排模型；去重仅按 chunk id，跨文档相似片段合并未见；检索阈值 `minScore` 可配但「低于阈值判无依据如实提示」的拒答协议在生成侧未强制 | 本切片落地后端协议层：命中去重（同 chunkId 保留首条）、`deriveEvidenceLevel` 级别推导、`buildNoEvidenceAnswer` 无命中拒答模板与 none 级别约束；hybrid 召回链路接线、跨文档归并、独立重排模型接入归后续批次 |
| R-07 | 201 | 后端溯源字段具备，部分前端页面有追溯展示；「模型输出正文内嵌引用编号 → 前端锚点弹窗查看原文片段 + 出处元信息」的标准化组件与协议未统一；`sourceRef` 结构 0 命中 | 统一 `Citation` / `CitationPopupData` 协议结构；`buildCitations` 编号装配、`extractRefMarkers` 锚点定位、`findCitationByRef` 弹窗回查、`toCitationPopupData` 纯映射；前端组件归后续批次 |
| 台账 S-12 | 357 | 重排模型接入点；跨文档去重；阈值拒答协议强制；引用编号内嵌协议 + 前端原文锚点弹窗；相似病例患者级隔离索引与强制过滤审计测试 | 本切片交付协议类型、编号装配、一致性 / 完整性校验、none 级别确定性约束、拒答模板与弹窗映射；重排模型、跨文档归并、前端组件、患者隔离测试按台账登记分批（见第 7 节） |

### 1.3 切片边界（本切片明确不做）

- 前端 `[n]` 可点击弹窗组件实现与路由接入（仅交付弹窗数据结构纯映射函数，组件归后续前端批次）；
- `hybrid.ts` 召回链路真实接线、跨文档相似片段归并、独立重排模型接入（R-06 运行时接线归后续批次）；
- 向量路 / 关键词路改造；
- S-01 输出校验器规则集扩写（本切片只在协议层产出同口径发现，供 S-01 后续接线消费）；
- 台账持久化落库；患者级隔离索引（S-13）。

## 2. 输入输出契约

### 2.1 输入（本切片只读复用，不改动语义）

- `EvidenceLevel = 'supported' | 'partial' | 'none'`、`OutboundLevel = 'PASS' | 'CAUTION' | 'BLOCK'`（`src/security/ai/types.ts`）：协议层 `import type` 复用，不重复定义同义枚举，不改动 S-01 规则集。
- `SourceProvenance`（`src/knowledge-platform/types.ts`）：`CitationHit.provenance` 复用既有结构；新扩展命中类型与既有 `RetrievalHit` 并存，不回改既有接口。
- S-11 `KnowledgeEntry` 字段口径（`versionRef / origin / sectionTitle / pageRef / specialty / securityLevel / effectiveDate / expireDate / conflictGroup`）：映射口径对齐，不回改 S-11 类型。

### 2.2 输出（本切片新增公共符号，经 `src/knowledge-platform/citation/index.ts` 与 `src/knowledge-platform/index.ts` 双桶挂接）

**类型**：`CitationSecurityLevel`、`CitationHit`、`Citation`、`CitedAnswer`、`CitationRuleId`、`CitationIssueSeverity`、`CitationIssue`、`CitationVerdict`、`CitationPopupData`。

**常量**：`CITATION_ERROR_PREFIX='CIT-'`；规则编号常量 `CITATION_RULE_REF_MISSING`、`CITATION_RULE_REF_UNUSED`、`CITATION_RULE_CITATION_INCOMPLETE`、`CITATION_RULE_NONE_LEVEL_CERTAINTY`、`CITATION_RULE_NONE_LEVEL_MISSING_MARKER`、`CITATION_RULE_UNSUPPORTED_CLAIM`、`CITATION_RULE_EVIDENCE_LEVEL_MISMATCH`；`NO_EVIDENCE_FALLBACK_MISSING`、`NO_EVIDENCE_TEMPLATE`。

**纯函数**：`buildCitations`、`deriveEvidenceLevel`、`validateCitedAnswer`、`validateCitations`（模块级别名）、`buildNoEvidenceAnswer`、`toCitationPopupData`、`extractRefMarkers`、`findCitationByRef`。

### 2.3 协议类型字段表（3.3.5 第 422–437 行）

**`CitationHit`（协议层扩展命中，与既有 `RetrievalHit` 并存）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `chunkId` | `string` | 知识块唯一标识；`buildCitations` 按其去重 |
| `title` | `string` | 条目标题 |
| `sectionPath` | `string` | 章节路径 |
| `provenance` | `SourceProvenance` | 既有溯源结构；`sourceName` 映射进 `Citation` |
| `pageRef?` | `string` | 页码 / 原文位置 |
| `effectiveDate?` | `string` | 生效日期 ISO8601，原样透传 |
| `score` | `number` | 检索相关度得分；本协议不计算得分 |
| `graphPath?` | `string` | 图谱关系路径 |
| `quotedExcerpt?` | `string` | 命中原文片段；缺省时由 `content` 截断装配 |
| `content?` | `string` | 命中原文内容（截断兜底来源） |
| `securityLevel?` | `CitationSecurityLevel` | 密级字面量对齐 S-11，本地联合类型，不反向依赖 lifecycle 模块 |
| `conflictGroup?` | `string` | 冲突分组，供跨文档归并后续批次使用 |

**`Citation`（3.3.5 Citation 八字段）**

| 字段 | 类型 | 口径 |
|---|---|---|
| `refId` | `string` | `[1]`…`[n]`，按命中顺序编号 |
| `chunkId` | `string` | 命中知识块标识 |
| `title` | `string` | 标题 |
| `sectionPath` | `string` | 章节路径 |
| `pageRef?` | `string` | 页码引用 |
| `sourceName` | `string` | 来源名称（取 `provenance.sourceName`） |
| `effectiveDate?` | `string` | 生效日期 |
| `quotedExcerpt` | `string` | 引用片段；缺省截断前 120 字符 + `…` |

**`CitedAnswer`（模型输出结构化载荷）**：`content`（正文，引用位置标注 `[n]`）、`citations: Citation[]`、`missingInfo: string[]`（资料不足留空字段清单）、`evidenceLevel: EvidenceLevel`。

**`CitationPopupData`（前端弹窗契约预留）**：`refId / chunkId / title / sectionPath / pageRef? / sourceName / effectiveDate? / securityLevel? / quotedExcerpt`，由 `toCitationPopupData` 纯映射，不做文案加工。

### 2.4 规则编号与级别对照表

| 规则编号 | 严重度 | 触发条件 | 问题口径 |
|---|---|---|---|
| `ref-missing` | block | 正文出现 `[n]` 但 `citations` 无对应 `refId`；编号格式非法（`[0]`、`[abc]` 等非正整数形式） | 阻断发布；issue 携带 `refId` 或非法片段 `excerpt` |
| `ref-unused` | caution | `citations` 存在但正文未引用该 `refId` | 提示清理未使用引用 |
| `citation-incomplete` | block | 任一 `Citation` 缺 `chunkId / title / sectionPath / sourceName / quotedExcerpt`；`effectiveDate` 存在但 `Date.parse` 非法 | 阻断发布；issue 列出缺失字段名 |
| `none-level-missing-marker` | block | `evidenceLevel='none'` 但正文不含「（待核实）」 | none 级别必须标注待核实 |
| `none-level-certainty` | block | `evidenceLevel='none'` 且正文命中确定性措辞词表 | 阻断发布；`excerpt` 为命中片段 |
| `evidence-level-mismatch` | caution | `supported` 无引用；`none` 携带非空引用；`partial` 无 `missingInfo` | 级别与引用 / 缺口清单不一致提示 |
| `unsupported-claim` | caution | `supported / partial` 正文不含任何 `[n]` 编号 | 协议层粗检；句级事实比对归 S-01 后续细粒度规则消费 |

**汇总级别**：存在任一 `block` → `BLOCK`；否则存在任一 `caution` → `CAUTION`；否则 `PASS`。`sanitizedAnswer` 仅在 `PASS` 时回填深拷贝答案；`BLOCK` 时不回填正文。

### 2.5 确定性措辞词表口径（3.3.5 第 441 行）

`none` 级别正文命中以下任一措辞即按 `none-level-certainty` 阻断：`确诊`、`肯定`、`必然`、`一定`、`无疑`、`保证`、`无需`、`建议立即`、`可以排除`、`百分之百`、`绝对`。词表为中文正则顺序匹配，`excerpt` 记录首个命中片段；词表扩写归 S-01 红线规则集统一维护。

### 2.6 无命中拒答模板口径

`buildNoEvidenceAnswer(query, missingInfo)`：`evidenceLevel='none'`、`citations=[]`；`missingInfo` 原样回读，空数组兜底 `['检索未命中可引用知识条目']`；正文为离线确定性模板：

> （待核实）当前检索未获取到可引用的权威知识依据，以下问题暂无法给出确定性结论：{query}。请补充资料后由医务人员结合临床判断。

模板含「（待核实）」且不含确定性措辞；`query` 原文进入模板；文案基调与 `MEDICAL_DISCLAIMER` 免责口径一致，不构成诊断或治疗依据。

## 3. 新增 / 修改文件清单（实测行数与字节）

| 操作 | 路径 | 行数 | 字节 | 说明 |
|---|---|---:|---:|---|
| 新增 | `src/knowledge-platform/citation/citationProtocol.ts` | 446 | 18160 | 协议类型、规则编号常量、编号装配、级别推导、七规则校验器、拒答模板、弹窗映射、编号提取与回查、深拷贝隔离 |
| 新增 | `src/knowledge-platform/citation/index.ts` | 8 | 216 | `export * from './citationProtocol.js'` |
| 修改 | `src/knowledge-platform/index.ts` | 49 | 2053 | 末尾追加 `export * from './citation'`；既有 13 条导出、S-11 `export * from './lifecycle'` 行与 `MEDICAL_DISCLAIMER` 保持原位不变 |
| 新增 | `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 378 | 16749 | bun:test 单测，9 个 describe 共 27 例 |
| 新增 | `reports/slices/S-12-citation-protocol/slice-record.md` | 214 | 20328 | 切片记录（含类型字段表、规则级别对照表、确定性措辞词表、遗留风险与 S-13 建议） |

> 未改动：`src/knowledge-platform/types.ts`、`retrieval/hybrid.ts`、`src/knowledge-platform/lifecycle/*`、`src/security/ai/outputGuard.ts`、`src/security/ai/types.ts`、`src/knowledge/` 运行时全部源码、13 份既有回归测试，以及 S-02 / S-03 / S-04 / S-06 / S-08 / S-11 全部源码与测试；未新增任何依赖。

## 4. 测试清单与结果

### 4.1 新增测试（S-12）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/knowledge-platform/citation/citationProtocol.test.ts` | 27 | 0 | 80 | 936 ms | `logs/s12-citation-test-20261026-2222.log` |

覆盖用例分组：

- **编号装配**：三条命中生成 `[1][2][3]` 且字段映射正确；同 `chunkId` 重复命中去重保留首条；`quotedExcerpt` 缺省时按内容截断（前 120 字符 + `…`）；短原文不追加省略号；`effectiveDate` 原样透传。
- **证据级别推导**：无命中 → `none`；有命中且 `missingInfo` 非空 → `partial`；有命中且无缺口 → `supported`。
- **引用一致性校验**：正文 `[1]` 与 citations 一一对应 → `PASS` 并回填深拷贝；引用缺失编号 → `BLOCK`（`ref-missing`，携带 `refId`）；`[0]` / `[abc]` 非法格式 → `BLOCK`；citation 未被正文使用 → `CAUTION`（`ref-unused`）；缺 `sourceName / quotedExcerpt` 等 → `BLOCK`（`citation-incomplete`，消息含缺失字段名）；非法日期 → `BLOCK`；模块级别名 `validateCitations` 与 `validateCitedAnswer` 结果一致。
- **none 级别约束**：含「（待核实）」且无确定性措辞 → 不产出 none 级别阻断问题；缺「（待核实）」→ `BLOCK`；命中「确诊 / 肯定 / 一定 / 建议立即」→ `BLOCK` 且 `excerpt` 为命中片段。
- **级别错配**：`supported` 无引用 → `CAUTION`；`none` 带引用 → `CAUTION`；`partial` 无 `missingInfo` → `CAUTION`。
- **协议层粗检**：`supported` / `partial` 正文无 `[n]` 标记 → `CAUTION`（`unsupported-claim`）。
- **无依据拒答模板**：`none` 级别、空引用、`missingInfo` 空数组兜底文案；正文含「（待核实）」且不含确定性措辞；query 原文进入模板；自定义 `missingInfo` 原样回读；模板经校验为 `PASS`。
- **弹窗映射与回查**：`toCitationPopupData` 字段一一对应、密级可选透传；`extractRefMarkers` 按出现顺序去重提取；`findCitationByRef` 命中与未命中分支。
- **深拷贝隔离**：`PASS` 时 `sanitizedAnswer` 为深拷贝，外部修改不影响入参与结论；`BLOCK` 时不回填 `sanitizedAnswer`，入参不被校验器改写。

### 4.2 既有回归（数字不劣化，未修改这些测试与对应源码；2223 / 2224 批次全部 exit=0）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/knowledge-platform/lifecycle/knowledgeRegistry.test.ts` | 24 | 0 | 90 | 959 ms | `logs/s12-regression-tests-unit-knowledge-platform-lifecycle-knowledgeRegistry-20261026-2223.log` |
| `tests/unit/orchestrator/engine.test.ts` | 16 | 0 | 36 | 1029 ms | `logs/s12-regression-tests-unit-orchestrator-engine-20261026-2223.log` |
| `tests/unit/orchestrator/e2e.test.ts` | 2 | 0 | 8 | 1126 ms | `logs/s12-regression-tests-unit-orchestrator-e2e-20261026-2223.log` |
| `tests/unit/ragTuningV5.test.ts` | 5 | 0 | 8 | 976 ms | `logs/s12-regression-tests-unit-ragTuningV5-20261026-2223.log` |
| `tests/unit/knowledge/KnowledgeBaseManager.test.ts` | 6 | 0 | 15 | 976 ms | `logs/s12-regression-tests-unit-knowledge-KnowledgeBaseManager-20261026-2223.log` |
| `tests/unit/knowledge/RetrievalEngine.test.ts` | 9 | 0 | 21 | 969 ms | `logs/s12-regression-tests-unit-knowledge-RetrievalEngine-20261026-2223.log` |
| `tests/unit/knowledge/TextSplitter.test.ts` | 10 | 0 | 27 | 937 ms | `logs/s12-regression-tests-unit-knowledge-TextSplitter-20261026-2223.log` |
| `tests/unit/knowledge/VectorStore.test.ts` | 14 | 0 | 17 | 972 ms | `logs/s12-regression-tests-unit-knowledge-VectorStore-20261026-2223.log` |
| `tests/unit/knowledge/searchMedicalKnowledge.test.ts` | 9 | 0 | 23 | 1059 ms | `logs/s12-regression-tests-unit-knowledge-searchMedicalKnowledge-20261026-2223.log` |
| `tests/unit/knowledge/medicalRecordQc.test.ts` | 12 | 0 | 29 | 959 ms | `logs/s12-regression-tests-unit-knowledge-medicalRecordQc-20261026-2223.log` |
| `tests/unit/security/audit.test.ts` | 19 | 0 | 34 | 1106 ms | `logs/s12-regression-tests-unit-security-audit-20261026-2224.log` |
| `tests/unit/security/outputGuard.test.ts` | 18 | 0 | 40 | 958 ms | `logs/s12-regression-tests-unit-security-outputGuard-20261026-2224.log` |
| `tests/unit/security/aiAudit.test.ts` | 21 | 0 | 85 | 962 ms | `logs/s12-regression-tests-unit-security-aiAudit-20261026-2224.log` |

> 说明：S-11 生命周期测试、9 份知识 / 编排测试与 3 份安全域测试复跑数字与基线逐项一致；桶文件追加 `export * from './citation'` 未造成类型或行为回归；未删用例、未改既有断言换绿灯。

## 5. 双 tsc 门禁

| 门禁 | 命令（工作目录） | 退出码 | 日志 | 日志字节 |
|---|---|---:|---|---:|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit`（仓库根） | 0 | `logs/s12-tsc-root-20261026-2222.log` | 0 |
| web tsc | `bun x tsc --noEmit`（`web/` 目录） | 0 | `logs/s12-tsc-web-20261026-2222.log` | 0 |

> 过程留痕：本切片首轮根 tsc 与 web tsc 均一次通过，无类型错误；新测试首轮 27 pass / 0 fail / 80 expect，无失败修复批次。

## 6. 协议层与既有模块对接口径

### 6.1 与 S-11 生命周期条目的映射预留

| S-11 `KnowledgeEntry` 字段 | S-12 `CitationHit` / `Citation` 映射方向 |
|---|---|
| `versionRef` | 后续批次写入 `CitationHit` 扩展元数据，供历史病历版本快照回查 |
| `origin.sourceName` | `CitationHit.provenance.sourceName` → `Citation.sourceName` |
| `sectionTitle` | `CitationHit.sectionPath` → `Citation.sectionPath` |
| `pageRef` | 原样透传 `Citation.pageRef` |
| `effectiveDate` | 原样透传 `Citation.effectiveDate`，校验 `Date.parse` 合法性 |
| `securityLevel` | 透传 `CitationHit.securityLevel`，弹窗数据 `securityLevel` 可选展示 |
| `conflictGroup` | 透传 `CitationHit.conflictGroup`，供后续跨文档归并分组 |

### 6.2 与 S-01 输出防护的分工

- 本切片 `CitationVerdict.level` 复用 `OutboundLevel` 三档口径；`unsupported-claim` 仅做协议层粗检（正文有无编号标记），句级事实一致性比对、红线措辞细粒度判定归 S-01 规则集后续接线消费。
- `none-level-certainty` 词表与 S-01 `certainty-redline` 红线规则保持口径对齐；词表统一维护位置归 S-01 规则集，本切片仅持有协议层副本用于离线校验。

## 7. 遗留风险与后续建议

### 7.1 本切片已预留但未闭环项（不谎称通过）

1. **前端 `[n]` 弹窗组件与路由接入（R-07，201 行）**：本切片仅交付 `CitationPopupData` 纯映射与 `findCitationByRef` 回查接口；正文编号锚点定位、弹窗展示原文片段 / 章节 / 来源机构 / 生效日期 / 密级标识的前端组件与页面接入归后续前端批次。
2. **hybrid 召回链路真实接线（R-06，200 行）**：本切片不改动 `retrieval/hybrid.ts`；结构化标签前置过滤、三路召回 candidateK 合并去重、规则重排分值回填 `CitationHit.score`、`minScore` 阈值以下转 `buildNoEvidenceAnswer` 的运行时接线归后续检索服务批次。
3. **跨文档相似片段归并**：`conflictGroup` 字段已预留；跨文档相似片段合并、重复引用折叠归 R-06 后续批次。
4. **独立重排模型接入**：规则加权重排保持现状；模型精排接入点与供应商选型待院方环境确认（台账 S-12 阻塞项），本切片不引入模型依赖。
5. **句级事实一致性比对**：`unsupported-claim` 为协议层粗检；正文断言与命中片段的句级证据覆盖、矛盾检测归 S-01 输出校验器后续扩写。
6. **持久化落库**：协议为无状态纯函数；引用台账、校验结论与弹窗快照持久化归后续数据层批次。
7. **患者级隔离索引（R-08 / S-13）**：相似病例患者级索引、强制就诊标识过滤、跨患者召回拒绝与越权审计测试归 S-13 专项；本切片不涉及患者数据范围判定。

### 7.2 对 S-13（患者数据隔离专项）的接口预留建议

- 弹窗数据与引用条目当前不携带 `patientId / visitId`；建议 S-13 在相似病例场景独立 `SimilarCaseIndex` 命中结构上叠加隔离字段，不与通用 `CitationHit` 混用。
- S-13 越权检索事件可复用 S-08 `AiAuditService` 审计事件模型；本切片协议层不承担权限判定职责。

### 7.3 工程自检记录

- TypeScript strict、ESM、`@/*` 别名 + `.js` 后缀；未新增依赖（仅使用语言内置 `structuredClone` 与既有类型模块）。
- 本地开发态未执行 `git add / commit / push / tag`；未删除用户源码；未移动 / 重命名既有文件；未清理历史 backlog；未改动未点名既有路由 / 页面 / 挂载 / 权限码 / 函数签名。
- 代码 / 测试 / 日志 / 文档无真实密码、token、密钥与明文端点；测试夹具为合成演示数据，无院方实名；日志不含大段患者文本。
