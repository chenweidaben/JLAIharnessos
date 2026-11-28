# 巡检简报 2026-11-28 21:01 轮（只读调研轮 · Bun 升级前置 / web→TS6 兼容矩阵 / 7 项阻塞清单证据整理）

## 概要
本轮定时唤醒定位为**只读调研与证据整理**，不落地升级、不改生产配置。三条自主可选项并行收口：① Bun ≥1.2.10 升级前置调研落档；② web→TypeScript 6 兼容矩阵评估落档；③ 7 项待拍板 / 外部阻塞清单现状证据整理（标注前置依赖与所需输入）。

本轮 **未改动任何 `src/`、`web/`、`services-python/`、`services-java/` 源码与配置**（tracked modified 0），两份调研文档为新增 untracked 研究产物。实测复核：后端根 `tsc --noEmit` 与 web typecheck 双 **exit 0**；其余门禁（eslint / 全量 unit / Java 聚合 / Python pytest）沿用既有基线，本轮无源码改动、输入文件集未变，未重跑。两份调研均明确标注：查不到官方明确声明的项一律记"未知 / 待分支取证"，不臆断兼容或不兼容；M48-A、env 串扰等历史缺陷结论仅在本机 Bun 1.2.0 上成立。

## 工具链与现场基线
- 起点 HEAD：`a7e73836b453454bfcd16d3e20d9273163a1730d`（上一轮 19:00 简报提交）；分支 `consult-agent-m86`。
- 三远端 `consult-agent-m86` SHA 逐字一致、ahead/behind 0/0，认证正常：
  - origin（GitCode HTTPS）/ gitcode（GitCode SSH）/ mirror（GitHub SSH）均为 `a7e73836…1730d`。
- 工具链：Node v22.23.2 / Bun **1.2.0**（`C:\Users\lenovo\.bun\bin\bun.exe`，不在 PATH）/ JDK 17.0.19.10 / Maven 3.9.9 / 仓库内 PG 16.4 临时实例 5432（上一轮 `pg_ctl start` 拉起，本轮未主动 stop；业务库 5433 当前未监听）。
- 工作区：tracked modified **0**；untracked 项含本轮两份 `docs/research/` 调研文档、既有 `docs/TODO_LEDGER.md` 台账（历史约定不入库）及探针 / 台账 / 切片 / 日志生成物；2 个 CRLF 噪音 aggregator（lessonRecord / teachingOnline）不暂存。

## 一、Bun 运行时升级前置只读调研（落档）
- **调研文档**：`docs/research/2026-11-28-bun-upgrade-preflight.md`（26.1 KB，七节：版本差异表 / 1.2.10→1.3.x→1.4.x 变更要点 / M48-A 核查 / 影响面 / 回归清单 / 风险与前置条件 / 结论）。

### 核心结论
1. **现状四方分叉**：本机 Bun 实测 **1.2.0**，同时低于 `engines.bun >=1.3.0`、`packageManager bun@1.4.2`、CI `BUN_VERSION=1.4.2`；类型包 `bun-types 1.3.11` 亦未对齐。现有缺陷结论（M48-A、env 串扰、filter 误纳）仅在 1.2.0 成立，CI 的 1.4.2 行为未在本机逐件复核。
2. **M48-A 未定位到明确官方修复版本**：1.3.0 重写测试钩子执行顺序并修复"异步 rejection 致 runner hang"，1.3.13 / 1.4.0 的 `--isolate` 在文件间关闭 socket / 定时器 / 子进程；但官方 notes 与可访问 changelog 镜像均未点名"Windows afterEach 阶段 postgres.js 池连接读循环不 pump"。**不能据 changelog 推断已修复**，须独立分支最小复现实测。
3. **env 串扰兜底暂不能撤**：`--isolate` 是否跨文件重置 `process.env` 官方文档未明示；`tests/support/testEnv.ts` 的 beforeEach 复位 DEMO_MODE 与 afterAll 关池兜底在证实隔离前保留。
4. **升级属联动变更**：运行时 + bun-types + `bun.lock`（lockfileVersion 2，release 走 `--frozen-lockfile`）+ CI 标签须一起对齐；Node 上报版本从 1.3.0 的 Node 24.3.0 跳到 1.4.0 的 Node 26，需扫原生预编译插件依赖（本仓以纯 JS 为主，风险偏低）。
5. **结论：当前不建议在未做独立分支全量回归前升级**；9 项回归清单（unit 16677/163/113 基线、三族两口径、真实模式集成、前后端 tsc 双零、ESLint 1291 errors 不新增、audit 双路径、M48-A / env 探针复核）见文档第 5、6 节。

### 未决 / 需拍板项（详见文档 §7.1）
- 目标版本：对齐 CI 的 1.4.2，还是评估更新的 1.4.x（1.4.4 / 1.4.5）；
- 是否随升级启用 `--isolate` / `--parallel` 及其范围；
- `NODE_ENV` / `TRUST_PROXY` / `DATABASE_URL` / `WORM_*` 等其余 env 跨文件残留是否纳入全局兜底；
- 升级后是否借前缀锚定收敛 113 个 `web/tests` 误纳 errors；
- CI 缓存键 `bun.lockb`→`bun.lock` 修正是否随升级一并落地；
- 升级前是否专项排查按 `NODE_MODULE_VERSION` 选预编译产物的依赖包。
- 备注：issue #5969（filter 前缀锚定）页面被 robots.txt 拦截未能直读，"1.2.10 前缀锚定"归属已在文档标注为待实测，未作已核实结论。

## 二、web → TypeScript 6 兼容矩阵只读评估（落档）
- **调研文档**：`docs/research/2026-11-28-web-ts6-compat-matrix.md`（30.7 KB，现状版本表 / 逐项矩阵 / 根后端可复用经验 / 预估动作清单 / 风险阻断项 / 建议路径与拍板项 / 来源清单 / 结论）。

### 矩阵汇总（判定口径：兼容 / 有条件兼容 / 疑似缺口 / 未知；未知项须分支取证，不臆断）
| 判定 | 项 |
| --- | --- |
| 兼容 | React 19 运行时；@types/react 19.3.x / @types/react-dom 19.3.x；jsdom 25.0.1；typescript-eslint 8.70/8.71；tailwindcss 3.4.19（低风险） |
| 有条件兼容 | v5-patch-for-react-19；@vitejs/plugin-react；Vite 5.4（EOL，中长期须升级） |
| 疑似缺口 | Vitest 2.1（EOL，类型未验证）；echarts 5.6（自带 d.ts 未验证） |
| 未知 | antd 5.29.3；@testing-library/react 16.3.3；@xyflow/react 12.11.6；其余运行时库 |

### 核心结论
- tseslint 链路在 TS6 支持窗口（`>=4.8.4 <6.1.0`），web 8.70.0 对齐根后端 8.71.2 即可；React19 类型侧基本就绪（@types 19.3.0 挂 ts6.0 dist-tag，保持 19.3.x）。
- 主要缺口集中在 **EOL 工具链**（Vite 5.4、Vitest 2.1 均已不在官方支持矩阵）与**未验证的自带 d.ts**（antd 5.29.3、echarts 5.6、xyflow 12.11.6、testing-library 16.3.3 未查到官方 TS6 明确声明）。
- **建议路径**：主干保持 TS 5.6.3 不动；先切独立试点分支拉 TS 6.0.2，跑通 typecheck + lint + vitest + build + e2e 取证，再依据缺口决定直接合入、连带升级工具链，还是暂缓。

### 需要拍板项（详见文档 §6.3）
| # | 拍板项 | 选项 |
| --- | --- | --- |
| D1 | TS6 试点是否连带升级工具链大版本（Vite 5→6.4+/8.x、Vitest 2.1→4.1/5.x） | A 守旧工具链取证失败再议；B 直接连带升级 |
| D2 | antd 路线：维持 v5 取证，还是同步规划 v6 迁移 | A 维持 v5；B 规划 v6（icons 同步升 6） |
| D3 | `target`/`lib` 是否由 ES2020 上调到 ES2022 | A 保持 ES2020；B 上调 ES2022 |
| D4 | 试点准出标准（typecheck exit 0、lint 无新增 error、vitest 全绿且覆盖率不降、build 成功、e2e 回归通过） | 评审确认门槛与 warn 例外清单 |
| D5 | tseslint 是否与根后端锁定同一 8.x 基线（8.71.2） | A 对齐同基线；B web 独立选最新 8.x |
| D6 | echarts / xyflow 是否借试点评估大版本升级（echarts 6、xyflow 13） | A 维持现版本取证；B 评估大版本 |

## 三、7 项待拍板 / 外部阻塞清单（现状证据 · 前置依赖 · 所需输入）
> 本轮仅整理台账证据，**未落地任何选型、未改上线契约、未回填数据**。

| # | 阻塞项 | 现状证据（台账取证） | 前置依赖 | 所需输入 / 拍板 |
| --- | --- | --- | --- | --- |
| 1 | **四套漂移 DDL + 339 选型** | 未记账迁移 5 个（256/339/349/350/369），autoMigrate 阻断真实非 dev/非 demo BFF 起服。`256` 生产走旧表 `clinical.follow_up_plans`，新结构 visit_id/plan_type/timepoint/…/note 未落地；`349` satisfactionRepo 读旧列，9 深化列未落地、8 个新扩展字段无人读写；`350` aggregator 纯函数不触库，`meta.data_quality_rule` 仅 9 行旧规则码、17 条新种子码未 upsert、新列未落地；`369` persistForecast 写旧结构 `medmuse.ops_forecast`（11 列），5 新快照列 + 视图 `medmuse.v_ops_trend` 无人读写；`339` 种子把 waiting_area/clinic_room 写入旧 room_type 列，违反 `room_layout_room_type_check` 非法枚举。 | 架构 / 用户拍板；每文件二选一：(A) 新模型改独立表名/schema 并存再迁仓储；(B) 废弃新模型、DDL 对齐旧结构。**不可凭 DDL 单方补列到生产旧表**。 | 各迁移文件选型 A/B 决策；仓储改写范围确认。 |
| 2 | **role_permissions 全量镜像三前置** | 运行时鉴权以内存 `ROLE_PERMISSIONS` 为准，DB `iam.role_permissions` 仅管理后台展示 / 编辑。镜像三条件：①补 36 个未登记进 `iam.permissions` 字典的权限码（否则 FK 23503）；②清 DB 冗余旧码；③定运行时事实来源（内存为准 vs 以库为准）。证据 `docs/permission-audit-m183.md` §7、`patrol-20261125-0005-mainline.md`。 | 架构 / 用户拍板事实来源；字典码补登与旧码清理脚本。 | 事实来源口径决策；36 字典码清单确认；旧码清理授权。 |
| 3 | **medical-qc 详情组装四项未决依赖** | `GET /records/:id` getQcRecord 仅返回 `{nextLevel, status?}`，前端目标态期望 record/visit/patient/reviews/latestRule。取数：recordRepo.getMedicalRecordById ✓、reviewRepo.listReviewsByRecord ✓；visit/patient 需按 visitId join（队列 SQL 有范式可复用）；latestRule 无落库快照来源。四未决：①响应体扩字段属上线契约变更（形状对齐前端 + 补集成测试断言，M2-B 设计决策）；②详情查看数据权限口径未定（权限码 + dataScope 科室过滤）；③latestRule 无落库快照来源；④issue 字段别名（后端 code/level ↔ 前端 ruleId/severity/source）未决。证据 `patrol-20261125-0425-mainline.md` 专项②。 | 前端契约对齐；权限口径设计；latestRule 快照来源方案。 | 响应体字段形状拍板；数据权限口径；latestRule 来源；字段别名映射约定。 |
| 4 | **369 ops_metric 快照回写** | 5 新列（mom_value/yoy_value/forecast_value/forecast_confidence/benchmark_rank）+ 视图 `v_ops_trend` 缺快照回写与调度。 | 待 #1 中 369 选型拍板后落地。 | 选型结论；回写调度与触发时点。 |
| 5 | **350 规则引擎旧表** | 运行时仍走旧 `meta.dq_rules/dq_runs/dq_results`，新表 `meta.data_quality_rule` 无 SQL 读写。 | 待 #1 中 350 选型拍板。 | 选型 A/B；规则种子码与仓储迁移范围。 |
| 6 | **限流选项 B 评审** | 选项 A 已落地：测试侧 afterAll 调既有 admin `/rate-limit/unlock` 清 IP/账号桶，零生产装配。选项 B=仅非生产注册全量桶重置端点，待生产不可达 / 安全评审；本轮未放松生产阈值、未暴露生产可达清场端点。证据 `patrol-20261125-1504-mainline.md`、`patrol-20261125-2133-mainline.md`。 | 生产不可达确认；安全评审通过。 | 选项 B 是否进入排期；端点暴露范围与鉴权口径。 |
| 7 | **审计链 seq 1647 断点复测** | audit.events 2057 条 seq 1..2057 连续；断点 seq 1647 prev_hash 指向 seq 1000 陈旧基准、与 1646 脱节；时间 2026-11-25 06:09:55，module self-scheduling/action create/resource slots；影响 forensic-e2e 4 条 + auditEvents-e2e 1 条。方案 1 本地测试库清表重建 / 方案 2 按 seq 整条重算 / 方案 3 生产根因修复专项。 | **需测试库授权与备份**，未具备前不动。 | 测试库账号 / 备份授权；方案选择；根因修复排期。 |

### 外部阻塞（如实上报，未伪造）
- **monolith 117 个 `@SpringBootTest` 无法复跑**：独立 parent SB 3.5.3 / java 21，本机仅 JDK17；测试直连主 PG、无 H2 测试 profile 兜底、无 `src/test/resources`。待 JDK21 工具链 + PG 可达环境。

## 四、门禁与回归取证（真实退出码）
| 门禁 / 批次 | 结果 | 退出码 |
| --- | --- | --- |
| 后端根 `tsc --noEmit`（本轮复测） | 0 error（日志 size 0） | **0** |
| 前端 web typecheck（`tsc --noEmit`，本轮复测） | 0 error（日志 size 0） | **0** |
| 全量 eslint `src` | 沿用基线 **4676 problems（1291 errors / 3385 warnings）**；本轮未改 src，输入集未变，未重跑 | **1**（存量规则） |
| 全量 unit `bun test tests/unit` | 沿用基线 **16677 pass / 163 fail / 113 errors**（16840 tests / 2247 files），存量无新增回归，未重跑 | **1**（存量） |
| 聚合 `mvn -f services-java/pom.xml test` | 沿用基线 BUILD SUCCESS、0 `[ERROR]`、14 模块 No tests to run；monolith 117 测试 JDK17 阻塞 | **0** |
| Python services-python 全量 pytest | 沿用基线 12 passed / 0 fail，未重跑 | 0 |

- 本轮为只读调研，两份调研文档不改源码；双零复测通过即足以确认工作区类型面未被调研过程破坏。
- 留痕：`_rep22_tsc.txt` / `_rep22_tsc.exit.txt`、`_rep22_web_typecheck.txt` / `_rep22_web_typecheck.exit.txt`（本轮门禁产物，不入库）。

## 五、红线复核
- 本轮零源码 / 配置改动；未升级 Bun 运行时、未改 `package.json` / `bun.lock` / `bunfig.toml`、未改 web 依赖与 tsconfig。
- 未 ALTER / DROP 既有表、未回填、未改上线契约；未放松生产限流阈值；未暴露清场 / 重置端点。
- 探针 / 台账 / 切片 / `_rep*` 留痕 / CRLF 噪音不入库；未回显 token / 密钥；连接串仅经环境变量读取。

## 六、本轮未纳入、维持台账（不得擅动）
- 上述 7 项待拍板 / 外部阻塞；Bun 升级与 web→TS6 均停留在只读评估，未在主干落地。
- 历史存量：163 fail / 113 errors 为并发串扰与 bun 1.2.0 环境性失败，非本轮回归；6 个保守保留 vars、106 个契约形参禁删维持原状。

## 七、遗留阻塞与待办
- **monolith 117 个 `@SpringBootTest`**：待 JDK21 工具链 + PG 可达后复跑真实 pass/fail；当前 JDK17 阻塞，不伪造通过。
- 审计链 seq 1647 断点复测待测试库授权与备份；DDL 四表 + 339 选型、role_permissions 事实来源、medical-qc 契约与权限口径均待架构 / 用户拍板。
- 未入库产物：`_rep22_*` 留痕、历史 patrol 切片、探针 / 种子 SQL/TS、`docs/TODO_LEDGER.md`、`.venv/`；2 个 CRLF 噪音 aggregator 未暂存。
