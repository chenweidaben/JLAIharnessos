# S-03 切片记录：策略路由 / 主备切换 / 会话粘性

- **切片编号**：S-03
- **产品**：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS）
- **署名**：杭州健澜科技有限公司
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- **分支**：`consult-agent-m86`
- **基线 HEAD**：`1d0dc546e5d32e42dc8313d4601cb09a8f72abe6`
- **完成时间**：2026-10-26 20:39（Asia/Shanghai）
- **环境**：`DEMO_MODE=1`；无 PostgreSQL / Redis / 真实 LLM 凭证；纯函数 + 进程内存决策层，离线闭环验证；不接真实 LLM、不连数据库、不发起网络请求；不改变现有单实例 provider 默认行为。

## 1. 目标与契约依据

### 1.1 切片目标

在 S-02 模型注册表之上落地策略路由决策层：规则台账登记与校验、按条件与优先级匹配、会话粘性一致性哈希、同优先级流量权重分流、健康判定与主备降级、影子模型标记与路由事件留痕；决策器不创建真实 provider 实例，无匹配规则时显式回退既有默认 provider 路径。

### 1.2 契约依据（文档章节与台账行，编号以成文为准）

| 依据 | 位置 | 落点 |
|---|---|---|
| 技术文档 3.2.2 `ModelRouteRule` 类型块 | `docs/technical/YXS20261026-development-spec-2026-10-26.md` 第 268–281 行 | `ModelRouteRule` / 匹配条件枚举 / `trafficWeight` / `shadowModelId` / `stickyKey` / `enabled` 字段契约 |
| 技术文档 3.2.3 策略路由模块行 | 同上，第 289 行 | `src/bff/agents/modelRouter.ts`；`selectModel(req: RouteRequest): RouteDecision`；决策结果含 `modelId / fallbackModelId / shadowModelId / stickyKey / routeReason` |
| 技术文档 3.2.4 模型选择流程 | 同上，第 297–309 行 | 构造请求 → 规则匹配 → 粘性哈希 → 权重分流 → 健康判定与主备降级 → 影子双跑仅记录 → 全程事件留痕 |
| 技术文档 3.2.6 验收标准 | 同上，第 335 行 | 单测覆盖条件匹配、权重分流、粘性哈希一致、主备降级、影子双跑标记；既有 `modelProvider.test.ts` 不回归；双 tsc 零错误 |
| 差距矩阵 M-04 A-B 测试与流量权重 | `docs/research/YXS20261026-gap-matrix-2026-10-26.md` 第 184 行 | `trafficWeight` 模型级权重分流；同组权重和校验（双模型对照指标比对属后续切片） |
| 差距矩阵 M-06 备用模型无缝切换 | 同上，第 186 行 | 主用熔断/不可用沿 `fallbackModelId` 切换；切换事件留痕；切换后质量比对属后续切片 |
| 差距矩阵 M-07 会话粘性 | 同上，第 187 行 | `patientId / visitId` 一致性哈希固定模型，同一就诊过程跨请求不漂移 |
| 切片台账 S-03 | 同上，第 348 行 | 路由规则可配置；主备切换事件留痕；粘性键一致哈希；不改变现有单实例 provider 默认行为；真实供应商时延/成本指标需生产数据校准 |

### 1.3 范围边界（本切片不做）

- 不实现 `ModelProviderPort` 宽接口、`createProvider(card)` 适配层扩展、真实 HTTP/LLM 调用、token 用量回传、`streamChat`（3.2.5 及后续切片）。
- 不新增 BFF 路由 `modelRegistryV1.ts`；不做规则配置 / 健康看板 / 影子对照结果查询前端页面。
- 不改动 `src/core/agent/providers/factory.ts`、`src/bff/routes/modelRouterV5.ts`、`modelInfo.ts`、`modelProvider.ts` 及既有调用面；不聚合导出既有 `agentRegistry.ts`、`toolRegistry.ts`、`modelProvider.ts`。
- 不发起影子模型真实调用；`shadowModelId` 仅透传标记并写入事件。
- 规则台账、权重配置界面、事件台账均为进程内存态，不落库。

## 2. 输入输出契约

### 2.1 新增类型（`src/bff/agents/modelRouter.ts`）

- `ContextLength = 'short' | 'medium' | 'long'`
- `PerformanceTier = 'low' | 'medium' | 'high'`（时延档 / 成本档共用枚举）
- `StickyKey = 'patientId' | 'visitId' | 'none'`
- `ModelRouteMatch`：`department? / scenario? / agentId? / contextLength? / latencyTier? / costTier?`；未出现字段表示不约束。
- `ModelRouteRule`：`id / priority / match / modelId / trafficWeight / shadowModelId? / stickyKey? / enabled`。
- `RouteRequest`：`department? / scenario? / agentId? / contextLength? / tokenBudget? / patientId? / visitId?`；并补充可选 `latencyTier? / costTier?`（上游按 SLA 与成本口径推导后传入，见 2.5 契约扩展说明）。
- `RouteDecision`：`modelId: string | undefined / fallbackModelId? / shadowModelId? / stickyKey / routeReason / matchedRuleId? / degraded / degradedReason? / shadow / stickyBucket?`。
- `RouteEvent`：`seq / at / ruleId? / modelId? / fallbackModelId? / shadowModelId? / stickyKey / patientId? / visitId? / agentId? / scenario? / degraded / routeReason`（主备切换 / 影子留痕，为 S-08 审计链预留字段，不落 DB）。

### 2.2 规则台账 API（`ModelRouteRegistry` 类 + 模块级单例）

| 接口 | 契约 |
|---|---|
| `registerRule(rule): ModelRouteRule` | 字段与枚举校验（错误汇总抛 `[RT-001]`）；重复 `id` 拒绝（`[RT-002]`）；返回规则深拷贝 |
| `listRules(): ModelRouteRule[]` | 返回深拷贝数组（按登记先后），不可反向修改台账 |
| `setRuleEnabled(id, enabled): void` | 启停规则；未登记 id 抛中文错误（`[RT-003]`） |
| `removeRule(id): void` | 移除规则；不存在时静默返回 |
| `validateWeights(): string[]` | 按 `priority` 分组核算启用规则权重和是否为 1（容差 `1e-6`）；返回中文错误信息数组，空 = 通过；未启用规则不参与；不同优先级组独立核算 |
| `validateRouteRule(rule): string[]` | 纯函数校验，空数组 = 通过（供 `registerRule` 内部调用与单测直接断言） |
| `getModelRouteRegistry(): ModelRouteRegistry` | 进程级单例 |
| `_resetModelRouteRegistry(): void` | 测试专用重置 |

### 2.3 决策器 `selectModel(req, options?)`

默认取 S-02 `getModelRegistry()` 与本模块 `getModelRouteRegistry()`；`registry` / `routeRegistry` / `random?()` / `now?()` 均可注入，便于确定性单测。决策流程：

1. **规则匹配**：仅 `enabled=true`；`match` 中出现的条件与请求对应字段精确相等，未出现不约束；`contextLength / latencyTier / costTier` 枚举相等。
2. **优先级分组**：按 `priority` 降序取最高优先级组。
3. **会话粘性**：组内首个声明 `stickyKey='patientId'` 且 `req.patientId` 存在、或 `stickyKey='visitId'` 且 `req.visitId` 存在的规则生效；FNV-1a 32 位确定性哈希对标识取模得桶位，同一标识跨请求恒得同一规则；`stickyKey='none'` 或对应标识缺失时退化为权重分流。
4. **权重分流**：非粘性候选按 `trafficWeight` 累计权重落桶；使用注入 `random()`（缺省 `Math.random`）；权重和异常时按比例归一化兜底（`validateWeights` 仍会给出配置告警）。
5. **健康判定与主备降级**：健康口径 `!health.circuitOpen && health.available`；主用不可用沿 `card.fallbackModelId` 找备用：备用存在且健康 → `modelId=备用 id`、`fallbackModelId=原主用 id`、`degraded=false`、`routeReason` 注明主备降级；备用缺失 / 不健康 / 未配置 → `degraded=true`、`degradedReason='主备均不可用，转人工/模板兜底由工作流异常处理节点承接'`，`modelId` 保留最后尝试卡片 id 供审计定位。
6. **影子**：规则 `shadowModelId` 非空时写入决策 `shadowModelId`、`shadow=true`；本切片不发起影子调用。
7. **无匹配规则**：`modelId=undefined`、`degraded=false`、`routeReason='无匹配规则，沿用既有默认 provider 路径'`，不强制选模型。
8. **事件留痕**：每次决策写一条 `RouteEvent`（seq 自增、ISO 时间戳、规则 id、主 / 备 / 影子模型、粘性键与标识、场景、降级标记、`routeReason`）；`listRouteEvents()` 返回深拷贝；`_resetRouteEvents()` 测试专用清空并复位序号。

### 2.4 出口挂接

- 修改 `src/bff/agents/index.ts`：在 S-02 两条导出之后追加 `export * from './modelRouter.js'`；桶文件其余内容保持不变；未聚合导出其他既有模块。

### 2.5 契约扩展说明（如实记录）

- 技术文档 3.2.4 `RouteRequest` 原文仅列 `department / scenario / agentId / contextLength / tokenBudget / patientId? / visitId?`，而 `ModelRouteRule.match` 含 `latencyTier / costTier` 两个条件，且验收标准要求分别覆盖命中与不命中。本切片在 `RouteRequest` 补充可选 `latencyTier? / costTier?`，由上游按 SLA 时延档与成本口径推导后传入；`tokenBudget` 本轮仅透传留痕，预算 → 档位推导属后续观测切片。
- 3.2.3 `RouteDecision` 基字段为 `modelId / fallbackModelId / shadowModelId / stickyKey / routeReason`；按任务书与 3.2.4 流程补充 `matchedRuleId / degraded / degradedReason / shadow / stickyBucket`，用于审计追溯与降级断言。

## 3. 文件清单

### 3.1 新增文件（2 个）

| 相对路径 | 行数 | 字节 | 说明 |
|---|---:|---:|---|
| `src/bff/agents/modelRouter.ts` | 498 | 19009 | 类型契约、规则台账、纯函数校验、匹配 / 粘性哈希 / 权重分流 / 健康判定 / 降级 / 影子 / 事件台账、决策器与单例 |
| `tests/unit/bff/agents/modelRouter.test.ts` | 506 | 21336 | 条件匹配、优先级、权重分流、粘性、主备降级、影子标记、无匹配回退、规则校验、权重和校验、事件留痕单测 |

### 3.2 修改文件（1 个）

| 相对路径 | 行数 | 字节 | 修改内容 |
|---|---:|---:|---|
| `src/bff/agents/index.ts` | 16 | 583 | 追加 `export * from './modelRouter.js'`；头部注释更新为「模型注册表、健康探针、策略路由（S-02 / S-03）」；未聚合导出其他既有模块 |

绝对路径前缀：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\`

### 3.3 未改动项（回归边界）

`src/bff/agents/modelRegistry.ts`、`src/bff/agents/modelHealthProbe.ts`、`tests/unit/bff/agents/modelRegistry.test.ts`、`tests/unit/bff/agents/modelHealthProbe.test.ts`、`tests/unit/modelProvider.test.ts`、`src/bff/index.ts`、`src/core/agent/providers/factory.ts`、`src/bff/routes/modelRouterV5.ts`、`modelInfo.ts`、`modelProvider.ts` 及既有前端页面、既有路由、既有函数签名与权限码均未修改。

## 4. 测试与门禁结果（2026-10-26 20:39 现场复跑，退出码取自进程真实结果）

### 4.1 双 tsc 门禁

| 门禁 | 命令（仓库根 / web 目录分别执行） | 退出码 | 日志 | 日志大小 |
|---|---|---:|---|---:|
| 根目录 | `node node_modules/typescript/bin/tsc --noEmit` | **0** | `logs/s03-tsc-root-20261026-2038.log` | 0 字节（零错误） |
| web 目录 | `bun x tsc --noEmit`（cwd=`web`） | **0** | `logs/s03-tsc-web-20261026-2039.log` | 0 字节（零错误） |

> 修复过程留痕：首轮根 tsc 报 3 处类型错误（`getModelRegistry` 未导入、健康判定谓词在 false 分支收窄为 `never`），就地修复后复跑清零；中间失败日志 `logs/s03-tsc-root-20261026-2036.log`、`logs/s03-tsc-root-20261026-2037.log` 留存备查。

### 4.2 新增单测

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/agents/modelRouter.test.ts` | 36 pass | 0 fail | 109 | 1142.00ms | `logs/s03-router-test-20261026-2039.log` |

### 4.3 既有回归（不得回归项，数字与 S-02 复核基线一致）

| 测试文件 | pass | fail | expect | 耗时 | 日志 |
|---|---:|---:|---:|---:|---|
| `tests/unit/bff/agents/modelRegistry.test.ts` | 36 pass | 0 fail | 106 | 967.00ms | `logs/s03-regression-s02-20261026-2039.log`（前段） |
| `tests/unit/bff/agents/modelHealthProbe.test.ts` | 12 pass | 0 fail | 48 | 1.55s | `logs/s03-regression-s02-20261026-2039.log`（后段） |
| `tests/unit/modelProvider.test.ts` | 4 pass | 0 fail | 20 | 1100.00ms | `logs/s03-regression-modelprovider-20261026-2039.log` |

### 4.4 测试覆盖要点（`modelRouter.test.ts`，36 例）

- **条件匹配（9 例）**：`department / scenario / agentId / contextLength / latencyTier / costTier` 各自命中与不命中；多条件交集命中、缺任一条件不命中；`enabled=false` 跳过；高 `priority` 规则优先于低 `priority`。
- **权重分流（3 例）**：同优先级 0.7 / 0.3 两条规则，注入受控随机源分别落规则 a 与规则 b；非粘性请求固定随机源结果确定；非粘性不写 `stickyBucket`。
- **会话粘性（4 例）**：`patientId` 同标识两次决策模型一致；`visitId` 同理；`stickyKey='none'` 不固定；声明 `patientId` 粘性但标识缺失时退化为权重分流。
- **主备切换（5 例）**：主用健康选主用并登记配置的备用 id；主用熔断且备用健康切换备用、`fallbackModelId` 保留原主用 id、事件记录切换；备用模型未登记降级；主用不可用且未配置备用降级并说明兜底口径；规则引用卡片未登记降级且保留规则引用 id。
- **影子标记（1 例）**：`shadowModelId` 透传决策与事件，`shadow=true`，本切片不发起影子调用。
- **无匹配回退（1 例）**：`modelId=undefined`、`degraded=false`、`shadow=false`、`stickyKey='none'`，`routeReason` 注明沿用既有默认路径。
- **规则校验（6 例）**：合法规则空错误；`trafficWeight` 越界拒绝；空 `id` / 空 `modelId` 拒绝；非法 `stickyKey` / `contextLength` 枚举拒绝；`priority` 非有限数值、`enabled` 非布尔拒绝；重复 id 抛 `[RT-002]`、非法规则抛 `[RT-001]`。
- **权重和校验（4 例）**：同组权重和为 1 通过；不为 1 返回中文错误并指明规则；未启用规则不参与核算；不同优先级组独立核算、仅异常组报错。
- **事件留痕（3 例）**：两次决策产生两条事件、seq 自增、字段完整；降级事件记录 `degraded=true` 与场景；`_resetRouteEvents` 清空台账并复位序号。

### 4.5 工程合规自查

- 未引用 `package.json` 未安装依赖；TypeScript strict；ESM；`@/` 别名 + `.js` 后缀；新公共符号经 `src/bff/agents/index.ts` 出口。
- 未执行 `git add` / `git commit` / `git push` / 打 tag；提交分组与双仓推送由主会话收口。
- 新代码 / 注释 / 测试 / 日志扫描：未出现品牌规范禁用代号、错误汉字写法与「数智医院」旧称；未出现明文端点、鉴权头、访问密钥、访问令牌、账号口令；规则与卡片夹具仅使用演示占位标识（`cred-radar-main`、`shadow-001` 等）。
- 测试数据为内置演示主数据 / 合成数据；无院方实名；日志不含大段患者文本。
- 证据日志位于 `logs/`（已 gitignore）。

## 5. 遗留风险

1. **进程内存台账**：规则台账与路由事件台账均为进程内存态，重启丢失；持久化表结构与事件落库归后续里程碑（S-06 / S-08 收口）。
2. **档位推导在上游**：`latencyTier / costTier` 由上游推导传入；`tokenBudget → contextLength / costTier` 的映射规则、负载档位纳入后续观测切片；当前 `tokenBudget` 仅透传留痕。
3. **粘性哈希为取模一致性**：FNV-1a 哈希后对候选规则数取模；候选规则集合增删时桶位分布可能整体移动，未实现虚拟节点一致性哈希环；正式灰度放量前需在 S-07 灰度体系中复核漂移口径。
4. **权重和异常仅告警不阻断**：`validateWeights` 返回错误数组供配置面校验；决策器在权重和异常时按比例归一化兜底，不在路由层拒绝请求。
5. **影子不执行**：`shadowModelId` 仅标记与留痕，影子双跑调用、质量 / 时延 / 成本指标比对属后续切片。
6. **健康快照为只读输入**：决策器读取 S-02 注册表内健康快照，不主动触发探测；快照新鲜度依赖 S-02 `startProbeLoop` 循环节奏。
7. **事件未落库**：`RouteEvent` 字段已按 S-08 审计链预留（`seq / at / ruleId / modelId / fallbackModelId / shadowModelId / stickyKey / patientId / visitId / agentId / scenario / degraded / routeReason`），持久化与审计看板接入归 S-08。

## 6. 下一切片（S-04）建议

1. 按台账 S-04（第 349 行）落地提示词四层资产治理：系统 / 场景 / 科室 / 任务级资产结构化登记、版本记录、对比回滚预留、Few-shot 加载校验、Schema 校验重试降级协议。
2. 复用本切片 `RouteRequest` 的 `agentId / scenario / department / contextLength` 作为提示词资产选择键；路由决策 `matchedRuleId / modelId / stickyKey` 可随请求上下文带入提示词版本指针（`versionRefs` 四元组口径见 3.2.5，S-08 收口）。
3. S-04 扩展 `promptGovernanceV5` 数据模型与 `SystemPromptBuilder` 加载链时，需回归全部岗位提示词测试；本切片路由决策器不绑定提示词资产，两侧解耦。
4. 后续切片接入真实 `ModelProviderPort` 与 `createProvider(card)` 时，`selectModel` 的 `RouteDecision.modelId` / `fallbackModelId` 直接作为适配层取卡入参；本切片不预创建 provider 实例。

## 7. 未闭环项

无阻塞项。本切片范围内契约、单测、双 tsc 门禁全部闭环；2.5 节记录的 `RouteRequest` 字段扩展为任务书验收口径要求的如实补充，未改变 S-02 既有源码语义与对外行为。
