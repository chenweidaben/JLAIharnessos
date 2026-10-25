# consult-agent M86 提交分层与收口纪律（MainAgent 2026-10-25 17:58 巡检口径，F/G 强制执行）

> 本文件为组织者内部工作底稿，**不纳入任何 git 提交**。提交只显式 `git add` 下文 A 类 consult 路径。

## 0. MainAgent 19:20 巡检最终口径（覆盖 §1 中冲突表述，G 阶段以此为准）

### 0.1 提交前索引处置（硬约束）
- 当前暂存区已 staged **656** 个历史过程 txt/csv/`web/build_out.txt`/`web/coverage_out.txt` 删除（配合 .gitignore 取消跟踪）；另有 3 个未暂存删除：`deploy/grafana/dashboards/gangos-infra.json`、`gangos-overview.json`、`deploy/prometheus/rules/gangos.yml`。
- 进入任何提交前先 `git reset`（只清索引、不动工作区改动），再按分组显式 `git add <路径>`；**禁止在当前暂存区状态直接 commit**。

### 0.2 feat(consult-agent) 允许纳入的 61 个新增文件（清单固定，不得多 add）
- `src/core/agent/consult/**` 26 个源码；
- `src/bff/routes/consultAgentRoutes.ts` 1；`src/db/repositories/consultAgentRepo.ts` 1；
- `web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 1；`web/src/services/api/consultAgent.ts` 1；
- `docs/consult-agent/**` 8；`docs/api/consult-agent-openapi.yaml` 1；
- `tests/unit/consult-agent/**` 14；`tests/security/consult-agent/**` 1；`tests/integration/consult-agent/**` 1；
- `deploy/postgres/init/380-consult-threads.sql` … `385-consult-profile-memory.sql` 6。

### 0.3 共享基线文件 hunk 归属（禁止整文件 add 未授权文件）
- `src/bff/permissions.ts`：纯追加 22 行、0 删除，已核实干净，**整文件 add**。
- `src/bff/server.ts`：23 行改动中仅 **2 行属 consult**（`import { consultAgentRoutes }`、allRoutes 内 `...consultAgentRoutes,`）；其余 21 行属另一路生产 fail-closed/runtimeEnv/路由重排加固，`git add -p` 只选这 2 行 consult hunk。
- `web/src/router/index.tsx`：只选 consult 段（`ConsultAgentChatPage` lazy import、`consult-agent/chat` 路由注册、`RequirePermission permission="consult-agent:read"` 包裹）；其余 CRLF 存量与另一路菜单/路由改动不得纳入。
- `.env.example`：37 行改动全部归属另一路（APP_NAME 品牌、Redis/Kafka/ES 占位、LLM provider 换 deepseek、JWT/加密主密钥 fail-closed 占位、Java 旁路变量、文件头品牌），**无 consult 专属环境变量，consult 提交不得纳入**。
- `.gitignore` 拆分：头部旧称注释替换（杠OS → 新产品名）归另一路品牌整改；追加的过程文件忽略规则（`/*.txt`、`/web/*.txt`、`/web/build_out.txt`、`/web/coverage_out.txt`、`/*.csv`、scripts 探针、`reports/*.txt|csv`）归独立 `chore(housekeeping)` 提交，与 feat(consult-agent) 分开。
- 其余约 81 个未暂存修改（README/README_EN、docs/architecture、docs/operations、deploy 配置、services-java/python、既有 BFF 路由 apiDocs/health/imaging/system/twin3DInpatient、middleware audit/auth/sessionGuard、pool/FieldCipher/ComplianceChecker、web 既有页面/mock/Navbar/TopHeader 等）全部归属另一路架构审计整改，独立成组、独立过门禁，**严禁混入 feat(consult-agent)**。
- `web/src/store/cdrQueryV2M636Store.ts` 遗留脏文件：不纳入任何 consult 提交；`probe_m416.txt` 属历史探针取消跟踪，归 `chore(housekeeping)` 组，不归 consult 组。

### 0.4 分组建议（conventional commits）
- `feat(consult-agent):` 源码 + BFF 路由/仓储 + 前端服务层/页面（0.2 清单中 src/bff/web 部分 + permissions.ts 整文件 + server.ts 2 行 consult hunk + router consult hunk）。
- `test(consult-agent):` `tests/unit|security|integration/consult-agent/**`。
- `docs(consult-agent):` `docs/consult-agent/**` + `docs/api/consult-agent-openapi.yaml` + 里程碑说明。
- `chore(consult-agent):` 六表迁移 SQL（380–385）。
- `chore(housekeeping):` 仓库卫生（.gitignore 过程文件规则、probe_m416.txt 取消跟踪、656 个历史 txt/csv 删除、3 个 gangos 运维资产删除）。
- 另一路品牌与安全整改：独立 `chore(brand)` / `docs(brand)` / `chore(security)` 组，独立门禁，与 consult 提交物理分开。

### 0.5 推送前暂停复核（不满足不得推送）
把两类文件清单、diff 规模、本轮门禁退出码、177 测试证据、合规 grep 结果交回 MainAgent 复核通过后再推：
- JLMEDAIOS `master` 普通 fast-forward（**不用 force**）；HEAGENTOS `main` force-main 覆盖占位 README；GitHub mirror 本轮**禁止推送**、只核对。
- 禁止把密码/token/凭据写入提交、日志与简报；`origin` 历史内嵌 token 不沿用、不回显。
- 阻塞或门禁转红：把具体报错/退出码发回 MainAgent，不得自行绕过 `--max-warnings 0` 或跳过测试。

### 0.6 19:20 实测门禁证据（Organizer 已独立复跑确认）
- 根 `tsc --noEmit` EXIT=0；后端 consult 新增 ESLint `--max-warnings 0` EXIT=0；后端 consult Prettier `--check` EXIT=0；
- web 本地 `tsc --noEmit` EXIT=0；web consult 两文件 ESLint EXIT=0；Prettier EXIT=0；
- `bun test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent`：**177 pass / 0 fail / 659 expect() / 15 文件 / 11.93s，EXIT=0**。
- 旧称扫描：consult 全部新增树（src/docs/tests/deploy/web）命中 0；产品名「健澜AI原生医院操作系统OS」在 consult 文档/OpenAPI 出现 14 处；zod 字面量 `needsPhysicianReview=z.literal(true)`、`isOutOfHospitalPrescription=z.literal(false)`、`status=z.literal('pending_review')` 在位；12 个 handler 首行 `requirePermissionCode`；急症 `escalated` 旁路 + `safety:acute` 帧 + `acute_bypass` 审计；审计字段白名单无原始入参；免责声明随每条回复附着。

## 1. 工作区改动三分类（17:58 历史快照；与 §0 冲突处以 §0 为准）

### A 类：consult 集成必需 → 仅纳入 `feat(consult-agent):` 提交
- consult 全部新增未跟踪产物：
  - `src/core/agent/consult/**`（26 源码）
  - `tests/unit/consult-agent/**`（13 测试 + helpers）
  - `deploy/postgres/init/380-consult-threads.sql` … `385-consult-profile-memory.sql`
  - `docs/consult-agent/**`、`docs/api/consult-agent-openapi.yaml`
  - D 分片新增：`src/bff/routes/consultAgentRoutes.ts`、`src/db/repositories/consultAgentRepo.ts`
  - E 分片新增：`web/src/services/api/consultAgent.ts`、`web/src/pages/consult-agent/**`
  - F 分片新增：`tests/security/consult-agent/**`、`tests/integration/consult-agent/**`
  - G 交付报告：`docs/verification/consult-agent-m86-report.md`
- 基线联动跟踪文件（仅限 consult 相关 hunk）：
  - `src/bff/permissions.ts`（追加 consult-agent:read/write/audit）
  - `src/bff/server.ts`（import + allRoutes 末尾 `...consultAgentRoutes`）
  - `web/src/router/index.tsx`（consult-agent/chat lazy 路由 + RequirePermission）
  - `.gitignore`、`.env.example`（LLM 凭证占位，仅 consult 新增段）
- 注意：上述 5 个跟踪文件在 `git diff` 里若混入 B 类品牌 hunk，F/G 必须逐 hunk 核对；能拆 `git add -p` 就拆，不能拆的混合文件在报告中如实标注"混合文件、hunk 归属"，不得把品牌 hunk 叙述为 consult 交付。

### B 类：越界主干品牌整改 → 禁止混入 consult 提交，独立成组
- 提交分组：源码/配置/部署类 `chore(brand): 全仓旧称与旧仓库链接替换、删除 gangos 命名运维资产`；
  文档类 `docs(brand): 文档旧称与旧链接替换`。
- 已实测跟踪清单（61 快照中除 A 类与排除项外全部归 B）：
  - `.env.compose.example`、`.github/ISSUE_TEMPLATE/config.yml`、`bun.lock`、`package.json`、`web/package.json`、`web/package-lock.json`
  - `CONTRIBUTING.md`、`DEPLOYMENT_GUIDE.md`、`README.md`、`README_EN.md`、`SECURITY.md`、`docs/DEPLOYMENT_GUIDE.md`、`docs/open-source/GitHub发布指南.md`
  - `docs/architecture/` 下 11 个 md（00-决策基线、00-架构宪法、01-PRD、02-技术架构、03-开发指南、04-迁移路线、05-合规清单、06-团队与成本、review-1-architect、review-2-compliance、review-4-business-cost）
  - 删除资产：`deploy/grafana/dashboards/gangos-infra.json`、`deploy/grafana/dashboards/gangos-overview.json`、`deploy/prometheus/rules/gangos.yml`
  - 部署/运维：`deploy/grafana/provisioning/dashboards/dashboards.yml`、`deploy/nginx/Dockerfile`、`deploy/observability/Dockerfile.jaeger`、`deploy/observability/alertmanager/alertmanager.yml`、`deploy/postgres/backup.sh`、`deploy/postgres/restore.sh`、`deploy/prometheus/prometheus.yml`、`docker-compose.yml`、`docker-compose.prod.yml`
  - `services-java/README.md`、`services-java/pom.xml`、`services-python/README.md`、`services/radar-inference/README.md`、`services-python/docker-compose.yml`、`services-java/jlmedaios-monolith/README.md`、`services-java/jlmedaios-monolith/docker-compose.yml`、`services-java/jlmedaios-monolith/src/main/java/com/jlmedaios/monolith/common/JwtAuthenticationFilter.java`、`services-java/jlmedaios-monolith/src/main/resources/application.yml`
  - 后端源码联动：`src/bff/aggregators/apiDocsAggregator.ts`、`src/bff/middleware/auth.ts`、`src/bff/routes/apiDocs.ts`、`src/bff/routes/health.ts`、`src/bff/routes/imaging.ts`、`src/bff/routes/twin3DInpatient.ts`、`src/db/pool.ts`、`src/security/encryption/FieldCipher.ts`、`tests/unit/apiDocs.test.ts`
- B 类独立过门禁：根 `tsc --noEmit` exit 0；B 类改动文件 ESLint `--max-warnings 0`；Prettier `--check`；`bun:test` 全量；被改动既有路由/安全/测试文件对应用例必须跑通并附退出码；2101 行删除逐条核对不引入回归。B 类门禁不达标不提交、不推送。
- 不要回退 B 类已完成的品牌整改；只做分层、独立验证、独立提交。

### 排除项（不纳入任何提交，保持原样、不回退）
- `probe_m416.txt`
- `web/src/store/cdrQueryV2M636Store.ts`
- 约 730 个未跟踪过程日志/探针 txt：一律不 `git add`。
- 组织者底稿目录 `reports/consult-rebuild/`（本文件、CONTRACT-m86.md、baseline-survey.md、验收日志）不入库；交付报告只写 `docs/verification/consult-agent-m86-report.md`。

## 2. 提交分组规范
- `feat(consult-agent): 四角色咨询智能体 M86 重建（核心编排/四角色/双层记忆/哨兵/急症旁路/BFF 12 端点/前端对话页/迁移 380–385/单元·安全·集成测试/文档与 OpenAPI）`——只含 A 类。
- `chore(brand): 全仓旧称与旧仓库链接替换、删除 gangos 命名运维资产`——B 类代码/配置/部署/删除项。
- `docs(brand): 文档旧称与旧链接替换`——B 类 md/yaml 文档。
- `test(consult-agent): consult-agent 安全与集成测试`（如 F 单独成 commit）；`docs(consult-agent): 需求/架构/契约/数据模型/状态机/测试策略/里程碑 M86 与 OpenAPI`；`chore(consult-agent): 过程脚本`。
- 每个提交只含声明范围内路径；交付报告分别列 A/B 两类文件清单与各自 diff 规模（增/删行数），不得合并叙述。

## 3. 推送前暂停（硬门禁，不得跳过）
1. F 收口完成后，先把以下材料汇总交回 Organizer → MainAgent 复核：
   - A/B 两类文件清单、diff 增删行数；
   - 根 `tsc --noEmit`、ESLint（新增/改动路径 `--max-warnings 0`）、Prettier `--check` 实测命令与退出码；
   - `bun:test` 全量与 consult 专项 pass/fail/expect 数；
   - B 类被改动既有文件对应测试退出码；
   - 合规 grep 证据：consult 新增树旧称零命中；产品名「健澜AI原生医院操作系统OS」；急症 `escalated` 旁路；免责声明常驻；写操作三件套（权限码 + 审计 + 幂等键）；`needsPhysicianReview: true`、`isOutOfHospitalPrescription: false`、`status='pending_review'`。
2. 复核通过后再执行：`--dry-run` 预检 → gitcode JLMEDAIOS `master` 普通 fast-forward（**不用 force**）→ heagentos `main` force-main 覆盖占位 → `git ls-remote` 与本地 HEAD 逐位比对。
3. `mirror`（GitHub）本轮**禁止推送**；`origin` 历史内嵌 token 禁止沿用/回显/写入新配置/提交日志。
4. 任一推送失败或 SHA 不一致：停止、如实上报证据，不重复 force。

## 3.1 收口实测：混合文件 hunk 拆分清单（G 阶段 `git add -p` 依据，2026-10-25 核验）

### `web/src/router/index.tsx`（E 分片仅应负责两段 consult hunk；其余 hunk 属工作区既有未提交整改，禁止混入 feat(consult-agent)）
- **纳入 consult（A 类）仅两段**：
  1. import 段：`const ConsultAgentChatPage = lazy(() => import('@/pages/consult-agent/ConsultAgentChatPage'));`（含其上方 M86-E 注释行）。
  2. 路由段：`consult-agent/chat` 的 `RequirePermission permission="consult-agent:read"` + `<ConsultAgentChatPage />` Route 块（含 M86-E 注释行），位于 medmuse 路由之后。
- **不得纳入 consult（既有整改 hunk，单独成 `chore(web): 既有路由去重与权限码/组件别名对齐` 组）**：
  1. 删除冗余 `const EmergencyTriage = lazy(() => import('@/pages/emergency/triage-detail'));`，路由改用既有 `EmergencyTriageDetailPage`。
  2. 删除冗余 `const DictManagementPage = lazy(() => import('@/pages/system/dict'));`，路由改用既有 `SystemDictPage`；两个管理组内重复 `system/dict` 路由删除。
  3. 注释 `nursing_admin:view` → `nursing_admin:schedule:view`。
  4. 删除 `const EmergencyV2 = lazy(...)` 与 `emergency/report-v2` 路由。
  5. `billing:view` → `billing:read`（注释同步）。
  6. 删除一处重复 `order/detail` 路由（另一处保留）。
- 门禁事实：`web npx tsc --noEmit` exit 0；`npx eslint src/pages/consult-agent src/services/api/consultAgent.ts --max-warnings 0` exit 0；两新文件 `prettier --check` exit 0；router 整体 prettier 既有债务 exit 1（HEAD 基线即不通过，9713 组差异均在既有 M 系列长行，非本次引入），G 报告中如实标注，不对 router 执行 `--write`。
- 旧称 grep：两新文件 + router consult 段零命中。

### `src/bff/permissions.ts`（D 分片纯追加 22 行，0 删除，整文件归 A 类）
- 追加段 199–218：`CONSULT_AGENT_PERMISSIONS`（READ/WRITE/AUDIT）、`ConsultAgentPermissionCode` 类型、`ALL_CONSULT_AGENT_PERMISSION_CODES`；既有段字节未改。

### `src/bff/server.ts`（混合文件：consult 两行 + 既有 M 系列路由顺序整改 hunk，G 阶段 `git add -p` 拆分）
- **纳入 consult（A 类）仅两行**：
  1. import：`import { consultAgentRoutes } from './routes/consultAgentRoutes';`（4091 hunk，含 M86-D 注释）。
  2. 挂载：`...consultAgentRoutes,`（allRoutes 末尾 `...securityBaselineRoutes,` 之后，6516 hunk）。
- **不得纳入 consult（既有待挂载/顺序整改 hunk，单独成 `chore(bff): 既有 M 系列路由静态段优先注册与补挂载` 组）**：
  - `...m209Routes,` 从 M208 后移至 `...fhirRoutes` 之前（4108 增 / 4175 删）。
  - `...m232Routes,` 移至 `...patient360Routes` 之前（4157 增 / 4195 删）。
  - `...dataMartDeepRoutes,` 移至 `...dataMartRoutes` 之前（4577 增 / 4598 删）。
  - `...adminSurgeryOptimizeRoutes,` 补挂载（4599 增）。
  - `...performanceReportRoutes / performanceStressRoutes / performanceBenchmarkRoutes / performanceDeepRoutes` 前移至 `...performanceReviewRoutes` 之前（4780 增；4924 / 4946 / 6471 / 6499 删）。
- 门禁事实：根 `tsc --noEmit` exit 0；两个新文件 eslint/prettier 独立 exit 0；server.ts 存量 eslint 1 error + 11 warnings、prettier 不通过均位于既有段（HEAD 基线即有），consult 两行不在告警/格式 hunk 内。

### `.gitignore`（混合：品牌头注释 B 类 + `/*.txt` 探针忽略规则 A 类支撑）
- B 类 hunk：头注释 `健澜科技杠OS (Jianlan Gang-OS)` → `健澜AI原生医院操作系统OS`、版权行替换。
- A 类支撑 hunk：新增 `/*.txt`（锚定根目录散落探针/取证 txt，保护排除项不被误 add；不影响子目录已跟踪文件）。
- 无法 `git add -p` 拆净时，整文件归 A 组但报告注明品牌头注释属 B 类内容；不得把品牌替换叙述为 consult 交付。

### `.env.example`（实测全部为 B 类主干配置整改，**无 consult 专属 hunk**）
- 实测 diff：APP_NAME 改名、Redis/Kafka/ES 连接占位、JWT/加密主密钥占位加固、Java 旁路单体密钥、LLM 提供方 deepseek 替换、品牌头注释替换。
- 契约 §9 仅要求凭证从 `process.env` 读取（`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`），**未要求改 `.env.example`**；本文件不纳入 feat(consult-agent)，整体归 B 类配置整改组。G 在暂停复核清单中显式标注此处置与 MainAgent 初版 A 类名单的差异，由 MainAgent 复核确认。

### 其他 A 类跟踪文件同样需 hunk 核对
- `src/bff/permissions.ts`、`src/bff/server.ts`：D 分片完成后 `git diff` 逐段核对；consult hunk（权限三条码、import + `...consultAgentRoutes` 展开）入 A；其余既有整改 hunk 入独立整改组。
- `.gitignore`、`.env.example`：`git diff` 核对仅 consult 新增段（LLM 凭证占位）入 A；既有变更入独立组。
- 凡无法在 `git add -p` 中干净拆分的混合文件，G 必须在交付报告"混合文件"小节逐 hunk 注明归属，提交时整体归入其主属组，不得把非 consult hunk 叙述为 consult 交付物。

## 4. 既有口径备忘
- 迁移编号 380–385（100–105 前缀已被主干既有 SQL 占用；旧沙箱 372–377 按禁令不复用）；`docs/consult-agent/07-milestone-m86.md` 注明编号口径。
- 基线 HEAD `3f0190788ce05fd7231bbefb68618cecccbc470e`；备份分支 `backup/pre-m86-rebuild`；功能分支 `consult-agent-m86`。
- 提交身份固定 `chenweidaben <chenweidaben@users.noreply.github.com>`。
- 环境缺口：本机无运行中 PostgreSQL，六表 DDL 未在真实库演练；`bun run db:check` 的 12 个历史跟踪文件括号粗检误报与 consult 无关，报告如实标注。
