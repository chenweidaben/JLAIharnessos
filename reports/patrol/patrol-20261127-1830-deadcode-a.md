# 巡检简报 2026-11-27 18:30 轮（死代码 A 类本地私有死函数小批量 · 3 个零引用函数删除 · 门禁双 0 · 基线 181 pass）

## 概要
本轮紧接 #149 日志迁移收口，续接台账 #143 死代码可自主项，清理 3 个 A 类本地定义、零引用的私有辅助函数。每个函数先在本文件内词边界复核调用点、确认非 `export`、无 barrel 再导出、无字符串 / 反射 / 动态调用；同名函数在其他文件为各自本地副本，互不引用。删除后连带依赖（如 `toDateStr`）仍被在用路径引用，保留未动。后端 `tsc --noEmit` 与前端 web typecheck 双 **exit 0**；核心 + 聚合器基线 15 文件 **181 pass / 0 fail / 656 expect**。全量 eslint：errors **1291 持平基线**，warnings 3436 → **3433**；no-unused-vars 166 → **163**（-3，与删除函数一一对应）。本轮改动 **3 个 src 文件**。

## 工具链与现场基线
- Node v22.23.2 / Bun 1.2.0；后端 TS 6.0.2；前端 `web/` TS 5.6.3。
- 本轮第二个提交起点 HEAD：`3109a30a33cdf0595af85e6cb8d876c2811f84db`（#149 日志迁移，三远端 0/0）。
- 工作区：本轮真实改动 3 个 aggregator；2 个 CRLF 噪音 aggregator 忽略行尾后内容差异 0 行，不暂存；探针 / 台账 / 历史切片 / `_rep19_*` 留痕均不入库。

## 删除项证据闭合
| 文件 | 删除符号 | 类型 | 零引用证据 | 连带保留 |
|---|---|---|---|---|
| aggregators/coverageFixAggregator.ts | `round2(n)` | 本地私有函数（两位小数取整） | 本文件仅定义行、无调用；非 export；导出清单无该符号；同文件 `round4` 在用保留 | `round4`、`clampRate` 保留 |
| aggregators/diagnoseDeepAggregator.ts | `fnv1a(input)` | 本地私有函数（FNV-1a 指纹） | 本文件仅定义行、无调用；非 export；全仓其他 `fnv1a` 为 knowledge-platform 导出或各文件独立本地副本，互不引用 | 同文件 `round2` 在用（956/1173）保留 |
| aggregators/drugLifecycleAggregator.ts | `todayStr()` | 本地私有函数（当天 ISO 串） | 本文件仅定义行、无调用；非 export；全仓其他 `todayStr` 为独立本地函数 / 局部变量，互不引用 | 被其调用的 `toDateStr` 在 142 行仍在用，保留 |

## 门禁与回归取证（真实退出码）
| 门禁 / 批次 | 基线 | 本轮 | 退出码 |
|---|---|---|---:|
| 后端根 `tsc --noEmit` | 0 error | 0 error | **0** |
| 前端 `bun run --cwd web typecheck` | 0 error | 0 error | **0** |
| 核心 5 + 聚合器 10 基线 15 文件 | 181 / 0 / 656 | 181 pass / 0 fail / 656 expect | **0** |
| 全量 eslint `src` | 4727 problems（1291 errors / 3436 warnings） | 4724 problems（**1291 errors 持平** / 3433 warnings） | **1**（存量规则） |
| no-unused-vars | 166 | **163**（-3，args 106 未动） | — |

- **error 存量对照**：本轮未引入新 error；coverageFixAggregator 残留 2 条 `no-non-null-assertion` warning 为存量（基线 461/473，删行后漂移至 456/468），diagnoseDeep / drugLifecycle 删除后文件 eslint 干净。
- **测试隔离核查**：本轮改动文件无 `process.env =` 写入（Grep 0 命中）；未新增进程级 env 改写缺口。
- **直接单测**：3 个聚合仓未被 `tests/` 直接 import，经基线 15 文件回归覆盖；删除均为本地私有未用函数，不触及导出契约。

## 本轮未纳入、保留待后续批次（接台账 #143）
- **A 类本地定义死函数（剩余 14 个）**：inpatientAssistant maxLevel、medicalRecordDeep round2、pharmacyMgmt isAntibiotic、qualityGate baseScoreOf、risRepo numOrNull、pipeline sectionPathAt、TextSplitter matchDrugSection、notifyChannels isDemoMode、infectionDashboard listByDepartment、cryptoAssessCn isAssessDomain、m210/m257 handleOutpatientQueue、m551/m581 notFound；删除前继续排除路由表注册 / 事件订阅 / 反射 / 字符串调用 / barrel 再导出。
- **B 类模块级常量表 / 状态 `let`（38 项 vars-assigned）**：ABNORMAL_KINDS、SPEC_BY_KEY、NEXT_STATUS、IRRATIONAL_LABEL、PRAISE_LEXICON、SUPPORTED_TYPES、ORDER_TYPES、SPECIAL_BASE_COLS、LIST_FIELDS 等映射表；删除前确认无动态字符串索引 / 闭包 / 事件 / 定时器 / 外部读取 / 再导出；settlementAnalyticsRepo 模块级 `db = getDb()` 复核连接获取副作用。
- **前端 `.tsx` 未使用项 12 处**：走 web typecheck + eslint 复核，排除 JSX 同名绑定后清理。
- **C 类未使用参数 106 项**：接口契约签名，禁删形参；仅在可同步改签名的内部函数加 `_` 前缀。
- 明细指针：`_rep19_unused.csv`；改动后全量 eslint `_rep19_eslint_after2.txt`；改动前基线 `_rep18_eslint.txt`。

## 红线复核
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露生产可达清场 / 重置端点。
- 待拍板维持原状：四套漂移 DDL（256/349/350/369）与 339 选型；`role_permissions` 全量镜像三前置；medical-qc 详情组装四项；369 ops_metric 快照回写调度；350 规则引擎旧表；web→TS6 对齐；限流选项 B 生产不可达评审；审计链 seq 1647 断点复测待测试库授权与备份。

## 遗留阻塞与待办
- 全量原生汇总待低峰串行复跑；wormArchive / LLMClient / monitoring 三文件串行稳定性待复核，仍复现须定位根因。
- 工具链只读方案（不擅自升级）：bun ≥1.2.10 前缀锚定需全量回归 + 复核 M48-A Windows afterEach pump 根因；web→TS6 先评估兼容矩阵，独立分支取证。
- Python 测试本机缺依赖，仅 py_compile 通过，严禁伪造 pytest 通过。
- 未入库产物：`_rep19_*` 留痕、历史 patrol 切片、schema 备份、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`scripts/_*.py`；2 个 CRLF 噪音 aggregator 未暂存。
