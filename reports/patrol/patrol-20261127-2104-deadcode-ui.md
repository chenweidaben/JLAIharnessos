# 巡检简报 2026-11-27 21:04 轮（死代码 C 类前收口：前端 .tsx 未用项 10 处 + B 类保守专项复核清理 6 项 · 门禁双 0 · 基线 181 pass 持平）

## 概要
本轮紧接 `d6cdca7e`（B 类第一批 18 项）收口，续接台账 #143 优先级 1（前端 `.tsx` 未用项）与优先级 2（B 类保守保留专项逐项复核）。两轮甄别后共清理 **16 个零引用、无外部副作用的未用绑定**：前端 `src/ui` 10 处（7 个未用 `useState` setter 解构、1 个纯常量表、1 个纯局部未用变量、1 个未用导入成员）；后端 6 项（1 个本地私有死函数、1 个模块级死缓存状态、1 个只写不读的闭包时间戳、1 个未用解构成员、1 个纯函数未用绑定、1 个残留计数器）。

每项先在本文件词边界复核定义 / 读写计数，全仓 Grep 排除外部 import / 再导出 / 字符串 / 反射 / 动态索引 / 同名副本；getter、props 解构、图标动态引用、在用常量与 repo 导出经复核仍被引用，保留未动。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；受影响 5 文件 **58 pass / 0 fail / 180 expect**；核心 + 聚合器基线 15 文件 **181 pass / 0 fail / 656 expect**（与上轮基线逐字持平）。全量 eslint：errors **1291 持平基线**，warnings 3401 → **3385**；no-unused-vars 131 → **115**（args 106 契约形参未动，vars 22 → 6，-16，与清理项一一对应）。本轮改动 **15 个 src 文件**。

## 工具链与现场基线
- Node v22.23.2 / Bun 1.2.0；后端 TS 6.0.2；前端 `web/` TS 5.6.3。
- 本轮起点 HEAD：`d6cdca7e0fcd4be18067ecb4e293edba4093b20f`（B 类第一批 18 项，origin / gitcode / mirror 三远端 0/0 逐字一致）。
- 工作区：本轮真实改动 15 个 src；2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep19_*` 留痕均不入库。

## 第一批：前端 `src/ui` .tsx 未用项（10 处）
> 组件位于后端仓 `src/ui/`（ink 终端视图层，非 `web/` 目录）；getter 经现场 Grep 确认在用，仅 setter / 未用绑定清理，JSX 同名绑定、props 解构、图标动态引用已排除。

| # | 文件 | 删除 / 改造符号 | 形态 | 零引用证据 | 连带保留 |
|---|---|---|---|---|---|
| 1 | ui/components/LabResultPanel.tsx | `setSelectedCategory` | `useState` 未用 setter 解构 | setter 仅定义行，无 onClick / handler 调用；getter `selectedCategory` 在筛选与分类渲染 189/238-240 在用 | getter 保留 |
| 2 | ui/components/MedicalRecordViewer.tsx | `setScrollOffset` | `useState` 未用 setter 解构 | setter 仅定义行；getter `scrollOffset` 在滚动偏移计算 133-135/230/232/242 在用 | getter 保留 |
| 3 | ui/components/OrderListPanel.tsx | `setTypeFilter` | `useState` 未用 setter 解构 | setter 仅定义行；getter `typeFilter` 在 182/235/236 在用 | getter 保留 |
| 4 | ui/components/OrderListPanel.tsx | `setStatusFilter` | `useState` 未用 setter 解构 | setter 仅定义行；getter `statusFilter` 在 183/248/249 在用 | getter 保留 |
| 5 | ui/components/PatientInfoBar.tsx | `setExpanded` | `useState` 未用 setter 解构 | setter 仅定义行；getter `expanded` 在 152/158/181 在用；`defaultExpanded` props 解构默认值仍在用 | getter / `defaultExpanded` 保留 |
| 6 | ui/components/StatusLine.tsx | `roleLabelMap` | 模块级 `Record<CurrentUser['role'], string>` 死常量表 | 仅定义行；全仓仅本文件定义 + 历史台账 md；非 export。上方 `statusMap`（35-39）在用，未误删 | `CurrentUser` 类型被 Props `user?` 在用，导入保留 |
| 7 | ui/components/input/CommandPalette.tsx | `setSelectedCategory` | `useState` 未用 setter 解构 | setter 仅定义行；getter 在 204/205/217/222/318-320 在用。注意与 `ui/components/commands/CommandPalette.tsx` 为不同文件，未触碰 | getter 保留 |
| 8 | ui/screens/DepartmentManagementScreen.tsx | `s` | `bedColor(status)` 内纯局部绑定 `BED_MAP[status]` | `s` 未读；switch 直接按 `status` 分支返回 theme 色值；RHS 为纯 Map 索引无副作用。`BED_MAP` 他处 283/293 在用，保留 | `BED_MAP` 保留 |
| 9 | ui/screens/WardRoundScreen.tsx | `setRightPanel` | `useState` 未用 setter 解构 | setter 仅定义行；getter `rightPanel` 在 268-270/277-279/285 在用 | getter 保留 |
| 10 | ui/components/chat/ChatMessageList.tsx | `formatTime` | 未用导入成员 | 仅导入行；本文件无调用；`formatMedical` 模块本体保留，他处引用未受影响 | 其余导入保留 |

## 第二批：后端 B 类保守专项复核后清理（6 项，纯死绑定 / 无副作用）
| # | 文件 | 删除符号 | 形态 | 复核证据 | 连带保留 |
|---|---|---|---|---|---|
| 11 | bff/aggregators/pharmacyMgmtAggregator.ts | `isSpecialAntibiotic(drugNames)` | 本地私有死函数（非 export） | 全仓仅本文件定义行；L162 `isSpecialAntibiotic: boolean` 为接口字段、L527 `isSpecialAntibiotic: special` 为对象字段赋值（`special` 系 L495 mock 派生局部，与本函数无关）、`web/src/pages/admin/PharmacyMgmt` 为前端独立接口字段；无函数调用点。纯字符串匹配，无 IO / 闭包 / 定时器 | 接口字段、`special` 局部、前端类型保留 |
| 12 | bff/routes/emrQcPdcaPlanV14.ts | `samplePlan`（声明 + 写入）+ 连带类型导入 `PdcaPlanV14` | 模块级死缓存状态 | 全仓仅本文件 L12 声明 / L26 写入，无读取；响应 L29 回显局部 `plan`，非 `samplePlan`；`buildPdcaPlan` 为纯构建函数无 IO。删除后 `PdcaPlanV14` 类型不再被引用，连带从 import 移除 | `buildPdcaPlan` / `buildPdcaReport` / `advancePdcaPhase` 导入仍在用，保留 |
| 13 | bff/llm/llmAdapter.ts | `lastCheckedAt`（声明 + 3 处写入） | 适配器闭包内只写不读时间戳 | 声明 L219；写入 315（成功）/320（失败）/329（health 探测）；全文件无读取。对外契约 `LLMHealth.checkedAt` 与 `LLMStatusSnapshot` 均无 `lastCheckedAt` 字段；`status()` 快照构造 363-372 未消费，`health()` 返回局部 `checkedAt`。三处写入删除不改变对外行为 | `healthy` / `degraded` / `warningCount` / `recentWarnings` 等健康状态保留 |
| 14 | security/encryption/KeyManager.ts | 解构成员 `key` | `const { keyId: newKeyId, key } = await this.generateDataKey('rotation')` | `key` 未用；`generateDataKey` 调用本身保留（生成新密钥并落缓存 / 文件，副作用在调用内）。仅去掉未用解构成员，改为 `const { keyId: newKeyId } = ...` | `generateDataKey` 调用、`newKeyId` 返回保留 |
| 15 | bff/aggregators/deployConfigAggregator.ts | `policy` | 纯函数未用局部绑定 `generateBackupPolicy()` | `generateBackupPolicy` 为纯字面量返回（L90-105，不读环境 / 不联网 / 无 IO）；`policy` 未读，backupBlock 模板以 `c.enableBackup` 与注释文字装配，未插值策略字段。函数本体 export 保留（单测覆盖） | `generateBackupPolicy` 导出、`resolve(config)` 保留 |
| 16 | bff/aggregators/demoModeAggregator.ts | `doctorCounter`（声明 + 自增） | 残留局部计数器 | L129 声明，L166 医生姓名分支 `doctorCounter++` 后从未读取；医生标签为 `演示医生-${currentDept ?? '内科'}`（按科室名，不含编号）。`patientCounter` 用于患者编号标签在用，保留 | `patientCounter` / `patientLabel` 保留 |

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit` | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck` | 0 error | 0 error | **0** |
| 受影响 5 文件（demoMode / deployConfig / emrQcPdcaPlanV14 / llmAdapter / pharmacyMgmt） | — | 58 pass / 0 fail / 180 expect | **0** |
| 核心 5 + 聚合器 10 基线 15 文件 | 181 / 0 / 656 | 181 pass / 0 fail / 656 expect | **0** |
| 全量 eslint `src` | 4692 problems（1291 errors / 3401 warnings） | 4676 problems（**1291 errors 持平** / 3385 warnings） | **1**（存量规则） |
| no-unused-vars | 131（args 106 / vars 22） | **115**（args 106 未动 / vars 6，-16） | — |

- **error 存量对照**：本轮未引入新 error；15 个改动文件在全量 eslint 中无残留 `no-unused-vars` 告警。
- **测试隔离核查**：15 个改动文件 `process.env =` 写入 Grep **0 命中**；未新增进程级 env 改写缺口。
- **SQL / 安全复核**：本轮仅在 `KeyManager` 去掉未用解构成员，未触碰密钥生成 / 轮换 / 加密状态；归档签名密钥标识 `signerKeyId` 保守保留（见下）。

## 本轮甄别后保守保留、不擅自删除（6 个 vars，逐项证据）
| 符号 | 文件 | 保留证据 |
|---|---|---|
| `target` | adminUserAggregator.ts:95 | `await getUserDetail(id)`：`getUserDetail` 内部 `getAdminUser` 为空即 `throw notFound('用户不存在或已删除')`，承担编辑前存在性校验；调用必须保留，未用返回值不删绑定语义 |
| `assistantMsg` | chatAggregator.ts:522 | `await appendMessage(conversationId, {...})` 落库写调用；返回消息记录未读，但写副作用必须保留 |
| `enrollment` | pathwayAggregator.ts:417 | `await loadEnrollmentForMutate(enrollmentId)` 变异前入组存在 / 可变异校验；不存在抛错，调用必须保留 |
| `signerKeyId` | wormArchiveAggregator.ts:140 | 归档 SM2 签名密钥源状态：`initKeys` 按 env / demo / 未配置三分支写入；虽实测模块变量仅写不读（seal 段用 `sealKeyId`=provider 签名返回，`keyStatus` 用 `signing.keyId`，验签用 `seg.signerKeyId`），属归档安全面密钥标识，保守保留，待密钥轮换 / 对账专项复核 |
| `db` | settlementAnalyticsRepo.ts:9 | `const db = getDb()`：`getDb()` 为 pool 单例（`_sql` 复用，未初始化则 `createClient()`）；本文件函数体未读 `db`，但顶层调用承担模块加载期单例初始化 / 预热时机，删除会改变建连时机与 `_shuttingDown` 检查触发点，保守保留 |
| `oldKey` | KeyManager.ts:159 | `await this.getDataKey(keyId)`：密钥轮换前读取 / 校验旧密钥存在性（不存在抛错），调用有校验副作用；`oldKey` 未读但调用必须保留 |

## C 类契约形参（禁删形参，本轮未动）
- args 106 项持平，含 `DesensitizationEngine.enableRestore`（方法形参，内部委托未透传，属功能缺口不在死代码清理范围）、`PromptInjectionGuard.source`（方法形参）、`amsAggregator.input`、`VendorAHISAdapter.limit`、`musePharma.hh` 等；仅在可同步改签名的内部函数加 `_` 前缀，本轮未动。
- 前端 `src/ui` 剩余 6 个 args 契约形参：AlertBanner `onAcknowledge` / `onDismiss`、ToolCallDisplay `onToggle`、DashboardScreen `onNavigate`、OutpatientScreen `onBack`、WardRoundScreen `onBack`；另 DataTable 229 一处 non-null assertion 告警，非 unused，不在本批。

## 本轮未纳入、保留待后续批次（接台账 #143）
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可同步改签名的内部函数加 `_` 前缀。
- **全量基线对齐**：晚间低峰择机串行复跑全量 unit 取原生汇总行；wormArchive（fs 超时）/ LLMClient（jsdom 串扰）/ monitoring（栈溢出）三文件串行稳定性待复核，仍复现须定位根因，不得判偶发了之。
- 明细指针：`_rep19_unused.csv`；本轮全量 eslint `_rep19_eslint_b2_ui.txt`；受影响单测 `_rep19_unit_b2_ui.txt`；基线单测 `_rep19_unit_base_b2_ui.txt`。

## 红线复核
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测待测试库授权与备份。

## 遗留阻塞与待办
- 工具链只读方案（不擅自升级）：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估 antd5 / React19 / vitest 2.1.8 / typescript-eslint 8.15 兼容矩阵，独立分支取证。
- Python 测试本机缺 pytest / fastapi / httpx 且无 venv，仅 py_compile 通过，严禁伪造 pytest 通过。
- 未入库产物：`_rep19_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`；2 个 CRLF 噪音 aggregator 未暂存。
