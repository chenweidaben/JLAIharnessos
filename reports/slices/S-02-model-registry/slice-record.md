# S-02 切片记录：模型注册表 / 模型卡片 / 健康快照 / 版本回滚元数据

- **切片编号**：S-02
- **产品**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）
- **署名**：杭州健澜科技有限公司
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`
- **基线 HEAD**：`1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **完成时间**：2026-10-26 20:18（Asia/Shanghai）
- **环境**：`DEMO_MODE=1`；无 PostgreSQL / Redis / 真实 LLM 凭证；纯类型 + 纯函数 + 进程内存实现，离线闭环验证；不接真实 LLM、不连数据库、不发起网络请求。

## 1. 目标与契约依据

### 1.1 切片目标

在既有 `modelProvider.ts` 单实例工厂之外，落地独立的模型管理域骨架：模型卡片登记/查询/标签检索、健康快照台账、状态机迁移留痕、版本台账与回滚元数据指针、注入式健康探针与熔断/半开语义；与现有 provider 工厂解耦，供 S-03 策略路由直接挂载。

### 1.2 契约依据（文档章节与台账行，编号以成文为准）

| 依据 | 位置 | 落点 |
|---|---|---|
| 技术文档 3.2.2 模型卡片与注册表设计 | `docs/technical/YXS20261026-development-spec-2026-10-26.md` 第 232–266 行 | `ModelCard` / `ModelHealthSnapshot` 字段契约 |
| 技术文档 3.2.3 模块划分与接口契约 | 同上，第 284–293 行 | 注册表接口、探针接口、模块路径 |
| 技术文档 3.2.4 关键流程（注册表/探针侧） | 同上，第 295–311 行 | 卡片状态流转、健康判定口径（路由/分流/粘性部分归 S-03） |
| 技术文档 3.2.6 验收标准 | 同上，第 333–335 行 | 注册/查询/标签过滤、健康快照/失败计数/熔断、既有 provider 测试不回归、双 tsc 零错误 |
| 差距矩阵 M-01 模型注册表与模型卡片 | `docs/research/YXS20261026-gap-matrix-2026-10-26.md` 第 181 行 | 卡片结构、版本号、能力标签、风险等级、知识依赖、责任人落台账 |
| 差距矩阵 M-02 模型健康检查探针 | 同上，第 182 行 | 存活/时延/失败计数/熔断状态按模型维度登记（指标持久化与备用接管归后续切片） |
| 差距矩阵 M-03 模型版本管理与回滚 | 同上，第 183 行 | 版本台账、`previousVersion` 指针、退役留痕（真实切换归 S-03/S-07） |
| 差距矩阵 M-08 三层模型体系 | 同上，第 188 行 | `tier: primary / auxiliary / specialized` 分层登记 |
| 差距矩阵 M-09 统一模型抽象层 | 同上，第 189 行 | 卡片元数据与注册表解耦；`ModelProviderPort` 宽接口与 `streamChat` 不在本切片 |
| 切片台账 S-02 | 同上，第 347 行 | 注册表可注册/查询/按标签检索；与现有 provider 工厂解耦；持久化表结构属后续里程碑，本轮内存实现；依赖 S-06（本切片不阻塞 S-06 元数据合并） |

### 1.3 范围边界（本切片不做，避免提前实现 S-03/S-07 内容）

- 不创建 `modelRouter.ts`；不实现策略规则匹配、`trafficWeight` 权重分流、会话粘性一致性哈希、主备降级决策、`shadowModelId` 影子双跑标记。
- 不实现 `ModelProviderPort` 宽接口、`ChatRequest/ChatResponse`、`streamChat`、token 用量回传（3.2.5，后续切片）。
- 不做真实模型切换与一键回滚执行；版本台账仅落元数据与 `previousVersion` 指针。
- 不改动 `src/bff/index.ts`、既有 BFF 路由、前端页面、既有 provider 调用链、既有函数签名与权限码。
- 未新增数据库表结构；未持久化台账。

## 2. 输入输出契约

### 2.1 新增类型（`src/bff/agents/modelRegistry.ts`）

- `ModelProviderKind = 'openai-compatible' | 'deepseek' | 'anthropic' | 'local'`
- `ModelTier = 'primary' | 'auxiliary' | 'specialized'`
- `ModelRole = 'main-large' | 'main-medium' | 'embedding' | 'rerank' | 'asr' | 'ocr' | 'ner' | 'classifier' | 'extractor' | 'rule'`
- `ModelRiskLevel = 'low' | 'medium' | 'high'`
- `ModelStatus = 'draft' | 'staging' | 'active' | 'shadow' | 'standby' | 'retired'`
- `ModelCard`：字段严格对齐 3.2.2（`id / displayName / provider / endpointRef / model / tier / role / contextWindow / capabilities / riskLevel / defaultParams{temperature,topP,maxTokens} / knowledgeDependencies / departmentScope / scenarioTags / owner / releasedAt / retiredAt? / version / status / health / fallbackModelId? / sessionSticky / costPer1kInput? / costPer1kOutput? / complianceNotes?`）。
- `ModelHealthSnapshot`：`checkedAt / available / latencyMsP50? / latencyMsP95? / successRate? / errorRate? / consecutiveFailures / circuitOpen / lastError?`。
- `ModelRegistryFilter`：`tier? / role? / status? / provider? / scenarioTag? / department? / capability?`；枚举字段精确匹配，标签/科室/能力按包含匹配；`departmentScope` 为空（全院）时命中任意科室过滤。
- `ModelVersionRecord`：`version / releasedAt / previousVersion? / changelog / owner / baseline? / retiredAt? / note?`。

### 2.2 注册表 API（`ModelRegistry` 类 + 模块级单例）

| 接口 | 契约 |
|---|---|
| `register(card): ModelCard` | 必填字段与枚举合法性校验；重复 `id` 拒绝（`REG-002`）；`health` 缺省补默认快照（`checkedAt` 当前时间、`available=true`、`consecutiveFailures=0`、`circuitOpen=false`）；返回深拷贝 |
| `getCard(id): ModelCard \| undefined` | 返回深拷贝；未登记返回 `undefined` |
| `getCardOrThrow(id): ModelCard` | 未登记抛中文错误（`REG-001`） |
| `listCards(filter?): ModelCard[]` | 无过滤返回全部；返回深拷贝数组，不可反向修改台账 |
| `updateHealth(id, snapshot): void` | 合并写入 `health`；未登记抛错（`REG-003`） |
| `setStatus(id, status, reason?): void` | 状态机迁移校验；非法迁移抛中文错误（`REG-008`）；迁移记录进入版本台账 |
| `recordVersion(cardId, record): void` | 追加版本台账；`previousVersion` 指向登记前当前版本；未登记抛错（`REG-005`） |
| `getVersionHistory(cardId): ModelVersionRecord[]` | 按登记先后返回深拷贝；未登记抛错（`REG-006`） |
| `retire(cardId, reason): void` | 置 `status='retired'`、写 `retiredAt`，追加退役版本记录；重复退役抛错（`REG-010`）；未登记抛错（`REG-009`） |
| `validateModelCard(card): string[]` | 纯函数校验，空数组 = 通过 |
| `isValidStatusTransition(from, to): boolean` | 纯函数状态机判定 |
| `getModelRegistry(): ModelRegistry` | 进程级单例 |
| `_resetModelRegistry(): void` | 测试专用重置 |

**状态机**：`draft → staging → active → shadow → standby → retired`；`retired` 为终态，无出边；同状态不视为合法迁移。

### 2.3 探针 API（`src/bff/agents/modelHealthProbe.ts`）

| 接口 | 契约 |
|---|---|
| `probeOnce(registry, cardId, outcome, options?): ModelHealthSnapshot` | 注入时钟 `now?()`、阈值 `failureThreshold?`（默认 3）、冷却 `cooldownMs?`（默认 60_000ms）；未登记 `cardId` 抛中文错误；结果经 `updateHealth` 写回注册表并返回深拷贝 |
| `startProbeLoop(registry, intervalSec, probeFn, cardIds?): () => void` | 未指定 `cardIds` 时遍历 `active / shadow / standby` 卡片；探针抛错被捕获记为失败且不中断循环；返回停止句柄；重复启动先停旧循环 |
| `ProbeOutcome { available: boolean; latencyMs?: number; error?: string }` | 注入式结果，本切片不实现真实 HTTP 探测 |
| `ProbeFn = (card: ModelCard) => Promise<ProbeOutcome>` | 注入式探针函数 |
| `_resetProbeLoop(): void` | 测试专用：停止循环并清空熔断打开时间戳台账 |

**熔断语义**（对齐既有 `modelProvider.ts` 基线：连续失败 3 次、冷却 60s）：

- 成功：`consecutiveFailures=0`、`circuitOpen=false`、`available=true`，写入 `latencyMsP50`，清空 `lastError`；
- 失败：`consecutiveFailures+1`；达到阈值 `circuitOpen=true`、`available=false`、落盘 `lastError`；
- 冷却期内：保持打开，不清零失败计数；
- 冷却到期（半开）：探测成功关闭熔断；探测失败重新打开熔断、计数归 1。

### 2.4 出口挂接

- 新建 `src/bff/agents/index.ts`：仅 `export * from './modelRegistry.js'` 与 `export * from './modelHealthProbe.js'`；**未**聚合导出既有 `agentRegistry.ts`、`toolRegistry.ts`、`modelProvider.ts`，既有调用面不变。

## 3. 文件清单

### 3.1 新增文件（5 个，均为本切片新建）

| 相对路径 | 行数 | 字节 | 说明 |
|---|---:|---:|---|
| `src/bff/agents/modelRegistry.ts` | 476 | 18895 | 类型契约、纯函数校验、状态机、内存台账、版本台账、单例与重置 |
| `src/bff/agents/modelHealthProbe.ts` | 191 | 7138 | 单次探测、熔断/半开语义、定时循环、注入式探针 |
| `src/bff/agents/index.ts` | 15 | 519 | S-02 模块出口桶文件 |
| `tests/unit/bff/agents/modelRegistry.test.ts` | 478 | 19040 | 注册/校验/过滤/健康合并/状态机/版本台账/退役/深拷贝隔离单测 |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 271 | 9761 | 成功/失败/阈值熔断/冷却/半开/循环/异常捕获/未登记拒绝单测 |

绝对路径前缀：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\`

### 3.2 修改文件

**无。** `git status --short` 与 `git diff --stat` 确认：既有跟踪文件零改动；`modelProvider.ts`、`tests/unit/modelProvider.test.ts`、`src/security/ai/*`、`src/bff/index.ts` 均未修改。

## 4. 测试与门禁结果（2026-10-26 20:18 现场复跑，退出码取自进程真实结果）

### 4.1 双 tsc 门禁

| 门禁 | 命令（仓库根 / web 目录分别执行） | 退出码 | 日志 | 日志大小 |
|---|---|---:|---|---:|
| 根目录 | `node node_modules/typescript/bin/tsc --noEmit` | **0** | `logs/s02-tsc-root-20261026-2018.log` | 0 字节（零错误） |
| web 目录 | `bun x tsc --noEmit`（cwd=`web`） | **0** | `logs/s02-tsc-web-20261026-2018.log` | 0 字节（零错误） |

### 4.2 新增单测

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 pass | 0 fail | 106 | 2.10s | `logs/s02-registry-test-20261026-2018.log` |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 pass | 0 fail | 48 | 1476.00ms | `logs/s02-probe-test-20261026-2018.log` |

### 4.3 既有回归（不得回归项）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/modelProvider.test.ts` | 4 pass | 0 fail | 20 | 1370.00ms | `logs/s02-regression-modelprovider-20261026-2018.log` |

### 4.4 开工前基线复跑（对照）

| 项 | 结果 | 日志 |
|---|---|---|
| 根 tsc | 退出 0，0 字节 | `logs/s02-baseline-tsc-root-20261026-2010.log` |
| web tsc | 退出 0，0 字节 | `logs/s02-baseline-tsc-web-20261026-2010.log` |
| `modelProvider.test.ts` | 4 pass / 0 fail / 20 expect / 1.59s | `logs/s02-baseline-regression-modelprovider-20261026-2010.log` |

### 4.5 测试覆盖要点

**modelRegistry.test.ts（36 例）**：注册回读与默认健康快照补齐；重复 id 拒绝；`getCard` 未登记 `undefined` / `getCardOrThrow` 抛错；必填缺失、未知 provider/tier/role/riskLevel/status、温度/topP/maxTokens/上下文窗口越界、`sessionSticky` 非布尔、数组字段非法；`listCards` 无过滤全量、tier/role/status/provider/scenarioTag/department/capability 命中与未命中、组合交集；`updateHealth` 合并写入、保留未覆盖字段、未登记抛错；状态机合法路径逐条通过、非法迁移中文报错、`retired` 终态不可再迁、迁移记录入台账；`recordVersion` 顺序与 `previousVersion` 指针链、未登记抛错；`retire` 写 `retiredAt`/状态/退役记录、重复退役拒绝；`getCard`/`listCards`/`getVersionHistory` 返回对象修改不影响台账内部状态。

**modelHealthProbe.test.ts（12 例）**：成功清零/关熔断/写 P50/清 `lastError`；未登记 `cardId` 抛错；失败累计到阈值开熔断、`available=false`、`lastError` 落盘；低于阈值不熔断；冷却期失败保持打开不清零；冷却期成功不清零；冷却到期半开成功关闭；半开失败重新打开计数归 1；定时循环按间隔调用、`stop` 后不再调用；探针抛错记失败且循环不中断；未指定 `cardIds` 仅遍历 `active/shadow/standby`；重复启动先停旧循环。

### 4.6 工程合规自查

- 未引用 `package.json` 未安装依赖；TypeScript strict；ESM；`@/` 别名 + `.js` 后缀；新公共符号经 `src/bff/agents/index.ts` 出口。
- 未执行 `git add` / `git commit` / `git push` / 打 tag；提交分组与双仓推送由主会话收口。
- 新代码/注释/文档扫描：未出现品牌规范禁用的旧产品代号、错误汉字写法与旧称；未出现明文端点、鉴权头、访问密钥、访问令牌、账号口令等敏感字样；`endpointRef` 仅为配置引用标识（演示占位 `cred-radar-main`）。
- 测试数据为内置演示主数据/合成数据；无院方实名；日志不含大段患者文本。
- 证据日志位于 `logs/`（已 gitignore）。

## 5. 遗留风险

1. **进程内存台账**：卡片、版本台账、熔断打开时间戳均为进程内存态，重启丢失；持久化表结构属后续里程碑（台账 S-02 既定口径），S-06 两套注册表统一方案收口时再合并仓储层。
2. **成功率/错误率未聚合**：`successRate` / `errorRate` 字段已预留，`probeOnce` 本轮仅维护 `consecutiveFailures` 与时延 P50；成功率/错误率聚合与看板展示列入后续观测切片。
3. **状态机为线性单向链**：未支持 `active → staging` 等回退迁移；版本回滚的真实流程、灰度与回滚 SOP 属 S-07。
4. **探针为注入式**：未接真实 HTTP 探测；真实时延分布、成功率、错误率需生产环境数据校准；熔断阈值 3 次 / 冷却 60s 沿用既有 `modelProvider` 基线口径，后续可按模型分层参数化。
5. **宽接口未落地**：`ModelProviderPort`、`ChatRequest/ChatResponse`、token 用量回传、`streamChat` 属后续切片；本切片仅完成卡片元数据与注册表解耦（M-09 部分缓解）。
6. **主备与影子仅登记引用**：`fallbackModelId`、`sessionSticky`、`shadow` 状态已在卡片结构中预留，切换/粘性/双跑逻辑归 S-03。

## 6. 下一切片（S-03）建议

1. 在本切片 `ModelRegistry` 之上新增 `src/bff/agents/modelRouter.ts`：`ModelRouteRule` 规则表按科室/场景/智能体/上下文长度/时延档/成本档匹配，`selectModel(req): RouteDecision`；**不改变现有单实例 provider 默认行为**。
2. 复用本切片 `ModelCard.health.circuitOpen / available` 判定可用性；沿 `fallbackModelId` 降级；`shadowModelId` 双跑仅记录不输出；`stickyKey`（`patientId / visitId / none`）一致性哈希保证同就诊过程不漂移。
3. 同优先级 `trafficWeight` 分流（权重和为 1）；路由决策（`routeReason`、选定模型、备用模型、权重版本、探测指标）留痕，为 S-08 审计链预留事件字段。
4. 复用本切片 `probeOnce` 结果作为路由前健康判定输入；探针循环已支持按 `active/shadow/standby` 自动圈定探测范围。
5. 回归基线：`tests/unit/modelProvider.test.ts` 4 pass / 0 fail / 20 expect 必须保持；双 tsc 零错误；不改动既有 `modelInfo.ts` / `modelRouterV5.ts` 页面数据源。

## 7. 未闭环项

无阻塞项。本切片范围内契约、测试、门禁全部闭环；S-03 及后续切片依赖项已在第 5、6 节列明。
