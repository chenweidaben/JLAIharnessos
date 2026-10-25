# 健澜AI原生医院操作系统OS · consult-agent 深化轮分组提交与远端核对留档（deepen round 1 · commits 档）

> 本档为 consult-agent 深化轮（deepen round 1）分组提交、允许范围内 fast-forward 推送与远端核对的留档说明；仅记录 git 提交 / 推送 / 核对动作与证据，本轮未修改任何源码、测试、既有文档与脚本内容。
> 产品名：健澜AI原生医院操作系统OS；提交身份：`chenweidaben <chenweidaben@users.noreply.github.com>`；时区 Asia/Shanghai（UTC+08:00）。
> 口径边界：本档不预判后续收口推送；除下文注明的 gitcode 普通 fast-forward 外，不写入任何「两仓已对齐」「镜像已完成同步」类完成性结论。

## 1. 基本信息

- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 本地分支：`consult-agent-m86`
- 三仓推送前实测基线 SHA：`d0c2d79756cacd75960bd7563ba8d9b186127270`
- 提交身份：`chenweidaben <chenweidaben@users.noreply.github.com>`（本地 `git config --local` 已固定，本轮未改动 global 配置）
- 留档生成时间：2026-10-26 04:34（Asia/Shanghai）；各笔提交时间以 `git commit` 记录为准。
- 远端口径：
  - `gitcode`（JLMEDAIOS `master`）：允许普通 fast-forward，**禁止** `--force` / `--force-with-lease`；
  - `heagentos`（HEAGENTOS `main`）：本轮**不推送**，force-main 覆盖口径留待流程收口判定；
  - `mirror`（GitHub JLAIharnessos `master`）：本轮**只核对、不推送**；
  - `origin` 为历史 HTTPS 内嵌凭据配置：本轮全程不引用、不推送、不改写，提交信息、本档与日志中均不回显其凭据取值。

## 2. 提交分组表（5 笔）

### 2.1 提交 1 — `feat(consult-agent): 前端五预留能力接线、规则债清零，置信度标签与消息 ID 回填`

- SHA：`2294cee310b5ec997c5d1df25d6e6306732c2603`
- 提交时间（author / committer）：2026-10-26T04:28:55+08:00
- 文件数：2
- 暂存清单（逐文件）：
  1. `M web/src/pages/consult-agent/ConsultAgentChatPage.tsx`
  2. `M web/src/services/api/consultAgent.ts`
- 提交要点：`transcribe` / `listAudit` / `getRulesSnapshot` / `replayEvents` / `getProfile` 五入口按权限码挂 UI 并二次判权；`meta.confidence` 渲染高 / 中 / 低标签；`onDone.messageId` 落本地状态回填气泡；基线 7 errors + 1 warning 与 1 warning 清零；未改功能契约、权限码与医疗红线字面量。

### 2.2 提交 2 — `test(consult-agent): 补仓储契约、路由错误分支、核心分支与 DDL 静态自洽测试`

- SHA：`91aab672622ff746b8d1586e0502a6da0b644109`
- 提交时间（author / committer）：2026-10-26T04:29:09+08:00
- 文件数：11
- 暂存清单（逐文件）：
  1. `A tests/integration/consult-agent/consultRouteErrors.test.ts`
  2. `A tests/unit/consult-agent/audit.test.ts`
  3. `A tests/unit/consult-agent/consultAgentRepo.test.ts`
  4. `A tests/unit/consult-agent/ddlSchema.test.ts`
  5. `A tests/unit/consult-agent/orchestratorBranches.test.ts`
  6. `A tests/unit/consult-agent/profileMemoryBranches.test.ts`
  7. `A tests/unit/consult-agent/roleSupport.test.ts`
  8. `A tests/unit/consult-agent/safeLlm.test.ts`
  9. `A tests/unit/consult-agent/sessionRuntime.test.ts`
  10. `A tests/unit/consult-agent/supervisorBranch.test.ts`
  11. `A tests/unit/consult-agent/toolRegistryBranches.test.ts`
- 提交要点：11 个新测试覆盖仓储契约、路由错误分支、编排器 / 主管 / 工具注册 / 角色支持 / 会话运行时 / 画像记忆 / 安全 LLM / 审计核心分支与 DDL 静态自洽；既有夹具 `tests/unit/consult-agent/helpers.ts` 本轮未改动、未纳入暂存。

### 2.3 提交 3 — `docs(consult-agent): 补齐 ADR、权限矩阵、FMEA、覆盖矩阵、运行手册与三端契约复核`

- SHA：`f1228ef825a3f2bba3556585e73813eb1255df4a`
- 提交时间（author / committer）：2026-10-26T04:29:24+08:00
- 文件数：7
- 暂存清单（逐文件）：
  1. `M docs/consult-agent/README.md`
  2. `A docs/consult-agent/08-adr.md`
  3. `A docs/consult-agent/09-permission-matrix.md`
  4. `A docs/consult-agent/10-fmea.md`
  5. `A docs/consult-agent/11-test-coverage-matrix.md`
  6. `A docs/consult-agent/12-runbook.md`
  7. `A docs/consult-agent/13-contract-reconciliation.md`
- 提交要点：README 增补导航与索引；新增 08 ADR、09 权限矩阵、10 FMEA、11 测试覆盖矩阵、12 运行手册、13 三端契约复核；未改动 01–07 既有文档。

### 2.4 提交 4 — `chore(consult-agent): 固化专项一键门禁脚本并归档基线、覆盖率、门禁与巡检留档`

- SHA：`7149cd7f41c2f435de8654092e697e26925ef4c5`
- 提交时间（author / committer）：2026-10-26T04:31:14+08:00
- 文件数：167
- 分组构成：
  - `scripts/consult-agent/gate.ps1`：1 个（专项一键门禁脚本）；
  - `reports/consult-deepen/` 根目录：16 个（`baseline-round0.md`、12 个 `baseline-*.log/.ps1`、`coverage-round1.log`、`coverage-round1.md`、`deepen-round1-report.md`）；
  - `patrol-20261026-0019/`：16 个；`patrol-20261026-0111/`：10 个；`patrol-20261026-0212/`：23 个；`patrol-20261026-0308/`：30 个；`patrol-20261026-0407/`：37 个；
  - `round1-gate/`：34 个（顶层门禁日志 15 个 + `archive/20261026-032253/` 快照 19 个）。
- 逐文件清单见附录 A。
- 提交要点：固化专项一键门禁脚本；归档基线档案、基线日志 / 脚本、覆盖率日志与报告、本轮深化报告、门禁全量日志与快照、五轮巡检日志与脚本；被 `.gitignore` 忽略的 `*.log` 按归档需要显式强制暂存（仅本地暂存绕过忽略规则，非推送 force）；`reports/consult-rebuild/` 与 `reports/patrol/` 历史隔离对象未纳入。

### 2.5 提交 5 — `chore(consult-agent): 分组提交与远端核对留档`

- SHA：本档自身提交 SHA 无法在文档内自录，由终态回报补记（见 §5.2 与回报清单）。
- 文件数：1
- 暂存清单（逐文件）：
  1. `A reports/consult-deepen/deepen-round1-commits.md`（本档）
- 提交要点：单独成笔，仅包含本留档 Markdown；不含其他源码、测试、文档或脚本改动。

## 3. 凭据与旧称扫描留证

- 扫描范围：本轮待暂存的提交 1–4 全部清单，合计 187 个文件；提交 5 本档在扫描完成后新建，提交前另行人工复核，复核结果见 §3.3；未发现凭据取值与旧称使用。
- 扫描方式：PowerShell 5.1 逐文件按 UTF-8 读取，正则匹配；旧称变体清单以 `baseline-round0.md` §8 定义为准，本档正文不重复抄录旧称字面量。

### 3.1 凭据扫描命中数

| 扫描模式 | 命中数 | 性质判定 |
|---|---:|---|
| `oauth2:` 方案前缀（仅扫描规则名，类别名引述） | 2 | 元描述：两条巡检合规脚本内凭据扫描正则定义串引述；不含凭据取值，不构成连接串示例 |
| 历史 token 片段（取值不在本档回显） | 0 | 无命中 |
| `password=` 赋值前缀（仅扫描规则名） | 1 | 元描述：`deepen-round1-report.md` §5 第 12 行合规表内规则名反引号串引述，无赋值取值 |
| `secret=` 赋值前缀（仅扫描规则名） | 1 | 同上 |
| `api_key=` 赋值前缀（仅扫描规则名） | 1 | 同上 |
| `sk-` 长串赋值 | 0 | 无命中 |

- 真实内嵌凭据 / 密码 / token / 长串 API key：**0 命中**；凭证键仅以 `process.env` 键名引用，不含取值。
- 命中位置（均为元描述，非凭据交付）：
  - `reports/consult-deepen/deepen-round1-report.md:187`：`password=` / `secret=` / `api_key=` 规则名反引号串；
  - `reports/consult-deepen/patrol-20261026-0308/patrol-compliance.ps1:86`：`oauth2:` 凭据扫描正则定义串；
  - `reports/consult-deepen/patrol-20261026-0407/patrol-compliance-endpoint.ps1:69`：`oauth2:` 凭据扫描正则定义串。

### 3.2 品牌旧称扫描命中数

- 正则匹配合计 24 次，全部落在两行模式定义文本内，均为元描述，不计品牌使用命中：
  - `reports/consult-deepen/baseline-round0.md:104`：§8 禁用模式清单反引号串；
  - `reports/consult-deepen/patrol-20261026-0308/patrol-compliance.ps1:27`：`$legacy` 扫描正则字面量。
- 交付源码 / 文档 / 测试 / 脚本中的品牌旧称使用：**0 命中**；产品名「健澜AI原生医院操作系统OS」在位。

### 3.3 本档（提交 5）提交前自扫复核

本档新建后、提交前按同一口径重扫：历史 token 片段 0、`sk-` 长串赋值 0、品牌旧称 0；下列命中均为反引号内规则名引述（元描述），无真实 token 值、无密码串、无环境变量取值、无连接串模板。下表行号为本小节写入前的本档行号；本小节表格内规则名仅作索引引述，不计入命中计数。

| 规则名 | 本档命中行号 | 命中次数 | 定性 |
|---|---|---:|---|
| `oauth2:` | L96、L106、L107 | 3 | 元描述：规则名 / 巡检脚本正则定义串引述，非内嵌连接串，不含凭据取值 |
| `password=` | L98、L105 | 2 | 元描述：合规表规则名反引号串引述，无赋值取值 |
| `secret=` | L99、L105 | 2 | 同上 |
| `api_key=` | L100、L105 | 2 | 同上 |
| 历史 token 片段 | — | 0 | 无命中，取值不在本档回显 |
| `sk-` 长串赋值 | — | 0 | 无命中 |
| 品牌旧称 | — | 0 | 无命中 |

## 4. 推送口径表

| 远端 | 仓库 | 分支 | 本轮动作 | 口径说明 |
|---|---|---|---|---|
| `gitcode` | JLMEDAIOS | `master` | 普通 fast-forward 推送（未加 `--force` / `--force-with-lease`） | 推送前 `d0c2d797…` → 推送后 `7149cd7f…`；推送退出码 0；远端钩子检查 PASSED |
| `heagentos` | HEAGENTOS | `main` | 本轮未推送 | force-main 覆盖口径留待流程收口判定；保持基线 `d0c2d797…` |
| `mirror` | JLAIharnessos（GitHub） | `master` | 本轮未推送，仅核对 | 保持基线 `d0c2d797…` |

## 5. 远端核对对照表

### 5.1 推送时点（提交 4 完成后、提交 5 之前）

祖先校验：`git merge-base --is-ancestor d0c2d79756cacd75960bd7563ba8d9b186127270 HEAD` 退出码 0；`git merge-base` 结果为 `d0c2d79756cacd75960bd7563ba8d9b186127270`，满足 fast-forward 条件。

| 远端 | 分支 | 推送前 SHA | 推送后 SHA | 与当时本地 HEAD 是否一致 |
|---|---|---|---|---|
| `gitcode` | `master` | `d0c2d79756cacd75960bd7563ba8d9b186127270` | `7149cd7f41c2f435de8654092e697e26925ef4c5` | 是，逐位一致（当时本地 HEAD = `7149cd7f41c2f435de8654092e697e26925ef4c5`） |
| `heagentos` | `main` | `d0c2d79756cacd75960bd7563ba8d9b186127270` | `d0c2d79756cacd75960bd7563ba8d9b186127270` | 否（本轮未推送，保持基线） |
| `mirror` | `master` | `d0c2d79756cacd75960bd7563ba8d9b186127270` | `d0c2d79756cacd75960bd7563ba8d9b186127270` | 否（本轮未推送仅核对，保持基线） |

### 5.2 本档提交时点（提交 5 完成后）

- 本地 HEAD = 提交 5（SHA 由终态回报补记）；`gitcode` `master` 仍为 `7149cd7f41c2f435de8654092e697e26925ef4c5`（本轮未对提交 5 二次推送）；`heagentos` `main`、`mirror` `master` 仍为 `d0c2d79756cacd75960bd7563ba8d9b186127270`。
- 三仓尚未全量对齐，后续收口环节另行判定推送口径与远端核对；本档不预判该结论。

## 6. 隔离对象清单与本轮未纳入原因

| 对象 | 状态 | 未纳入原因 |
|---|---|---|
| `reports/consult-rebuild/` 下 12 个历史探针 `.ps1` | 保持未跟踪，未读取、未暂存 | #30 之前历史物料，与本轮 consult 交付无关 |
| `reports/patrol/` 下 6 个历史巡检简报 `.md` | 保持未跟踪，未读取、未暂存 | 历史轮次简报，归属其他分组 |
| `docs/research/` | 已由其他提交（`5afe5413`）纳入，本轮未改动 | 不在本轮改动范围 |
| `probe_m416.txt` | 保持原状，未暂存 | 历史探针落盘文本，本轮不纳入 |
| `web/src/store/cdrQueryV2M636Store.ts` | 已跟踪，本轮未改动 | CDR 查询 V2 M636 状态仓，另一分片 |
| `.env.example` | 已跟踪，本轮未改动 | 共享配置分片，不在 consult 门禁文件清单 |
| `dist/`、`web/dist/`、`coverage/` | 已被 `.gitignore` 忽略，不出现于状态清单 | 构建产物，不入库 |
| `tests/unit/consult-agent/helpers.ts` | 已跟踪，本轮未改动 | 既有测试夹具，不属于本轮新增测试清单 |
| `web/src/knowledge/`（含 `templates/templateCatalog.ts`；非 consult 页面 `emr-template-management` 缺失模块的另一路在制品） | 工作区未跟踪，本轮未读取、未暂存、未改动，`git status` 中保持 untracked | 归属另一路 B 类 / 非 consult 分片，本轮未纳入 consult 提交，禁止 `git add` 该目录及其任何文件 |

## 7. 环境未闭环项指引

本轮提交 / 推送动作不改变环境结论：无运行中 PostgreSQL、无 LLM 凭证、未做真实 SSE / HTTP 端到端联调、未做浏览器视觉走查等环境硬约束未闭环，详见 `deepen-round1-report.md` §9；基线遗留失败用例 F1 / F2 见该报告 §7，本轮未修复、不计入门禁口径。

## 附录 A：提交 4 暂存文件逐文件清单（167 个）

```text
scripts/consult-agent/gate.ps1
reports/consult-deepen/baseline-bun-consult-round0.log
reports/consult-deepen/baseline-coverage-round0.log
reports/consult-deepen/baseline-eslint-be-round0.log
reports/consult-deepen/baseline-eslint-fe-local-round0.log
reports/consult-deepen/baseline-eslint-fe-root-page-round0.log
reports/consult-deepen/baseline-eslint-fe-root-service-round0.log
reports/consult-deepen/baseline-gate-round0.log
reports/consult-deepen/baseline-gate-round0.ps1
reports/consult-deepen/baseline-prettier-round0.log
reports/consult-deepen/baseline-round0.md
reports/consult-deepen/baseline-test-round0.log
reports/consult-deepen/baseline-test-round0.ps1
reports/consult-deepen/baseline-tsc-round0.log
reports/consult-deepen/coverage-round1.log
reports/consult-deepen/coverage-round1.md
reports/consult-deepen/deepen-round1-report.md
reports/consult-deepen/patrol-20261026-0019/patrol-bun-test-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-bun-test.log
reports/consult-deepen/patrol-20261026-0019/patrol-coverage.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-be-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-be.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-local-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-local-service-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-local.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-root-page-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-root-page.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-root-service-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-eslint-fe-root-service.log
reports/consult-deepen/patrol-20261026-0019/patrol-prettier-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-prettier.log
reports/consult-deepen/patrol-20261026-0019/patrol-tsc-r2.log
reports/consult-deepen/patrol-20261026-0019/patrol-tsc.log
reports/consult-deepen/patrol-20261026-0111/patrol-bun-test.log
reports/consult-deepen/patrol-20261026-0111/patrol-coverage.log
reports/consult-deepen/patrol-20261026-0111/patrol-eslint-be.log
reports/consult-deepen/patrol-20261026-0111/patrol-eslint-fe-local.log
reports/consult-deepen/patrol-20261026-0111/patrol-eslint-fe-root-page.log
reports/consult-deepen/patrol-20261026-0111/patrol-eslint-fe-root-service.log
reports/consult-deepen/patrol-20261026-0111/patrol-prettier.log
reports/consult-deepen/patrol-20261026-0111/patrol-tsc-web.log
reports/consult-deepen/patrol-20261026-0111/patrol-tsc.log
reports/consult-deepen/patrol-20261026-0111/prettier-file-list.txt
reports/consult-deepen/patrol-20261026-0212/patrol-bun-gate.ps1
reports/consult-deepen/patrol-20261026-0212/patrol-bun-summary.log
reports/consult-deepen/patrol-20261026-0212/patrol-bun-test-err.log
reports/consult-deepen/patrol-20261026-0212/patrol-bun-test.log
reports/consult-deepen/patrol-20261026-0212/patrol-coverage-err.log
reports/consult-deepen/patrol-20261026-0212/patrol-coverage-only.ps1
reports/consult-deepen/patrol-20261026-0212/patrol-coverage.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-be-err.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-be.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-fe-local-err.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-fe-local.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-fe-root-page.log
reports/consult-deepen/patrol-20261026-0212/patrol-eslint-fe-root-service.log
reports/consult-deepen/patrol-20261026-0212/patrol-prettier-err.log
reports/consult-deepen/patrol-20261026-0212/patrol-prettier.log
reports/consult-deepen/patrol-20261026-0212/patrol-static-gate.ps1
reports/consult-deepen/patrol-20261026-0212/patrol-static-recheck-summary.log
reports/consult-deepen/patrol-20261026-0212/patrol-static-recheck.ps1
reports/consult-deepen/patrol-20261026-0212/patrol-static-recheck2.ps1
reports/consult-deepen/patrol-20261026-0212/patrol-static-summary.log
reports/consult-deepen/patrol-20261026-0212/patrol-tsc-web.log
reports/consult-deepen/patrol-20261026-0212/patrol-tsc.log
reports/consult-deepen/patrol-20261026-0212/prettier-file-list.txt
reports/consult-deepen/patrol-20261026-0308/patrol-backend-compliance.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-bun-gate.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-bun-summary.log
reports/consult-deepen/patrol-20261026-0308/patrol-bun-test-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-bun-test-only.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-bun-test.log
reports/consult-deepen/patrol-20261026-0308/patrol-compliance.log
reports/consult-deepen/patrol-20261026-0308/patrol-compliance.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-coverage-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-coverage-only.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-coverage.log
reports/consult-deepen/patrol-20261026-0308/patrol-endpoint-fix.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-be-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-be.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-local-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-local.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-root-page-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-root-page.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-root-service-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-eslint-fe-root-service.log
reports/consult-deepen/patrol-20261026-0308/patrol-prettier-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-prettier.log
reports/consult-deepen/patrol-20261026-0308/patrol-static-gate.ps1
reports/consult-deepen/patrol-20261026-0308/patrol-static-summary.log
reports/consult-deepen/patrol-20261026-0308/patrol-tsc-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-tsc-web-err.log
reports/consult-deepen/patrol-20261026-0308/patrol-tsc-web.log
reports/consult-deepen/patrol-20261026-0308/patrol-tsc.log
reports/consult-deepen/patrol-20261026-0308/patrol-web-recheck.ps1
reports/consult-deepen/patrol-20261026-0308/prettier-file-list.txt
reports/consult-deepen/patrol-20261026-0407/compliance-filelist.txt
reports/consult-deepen/patrol-20261026-0407/patrol-build-summary.log
reports/consult-deepen/patrol-20261026-0407/patrol-bun-summary.log
reports/consult-deepen/patrol-20261026-0407/patrol-bun-test-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-bun-test-only.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-bun-test.log
reports/consult-deepen/patrol-20261026-0407/patrol-compliance-backend.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-compliance-endpoint.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-compliance.log
reports/consult-deepen/patrol-20261026-0407/patrol-count-dir.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-coverage-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-coverage-only.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-coverage.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-be-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-be.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-local-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-local.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-root-page-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-root-page.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-root-service-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-eslint-fe-root-service.log
reports/consult-deepen/patrol-20261026-0407/patrol-filelist.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-prettier-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-prettier.log
reports/consult-deepen/patrol-20261026-0407/patrol-root-build-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-root-build-out.log
reports/consult-deepen/patrol-20261026-0407/patrol-root-build.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-static-gate.ps1
reports/consult-deepen/patrol-20261026-0407/patrol-static-summary.log
reports/consult-deepen/patrol-20261026-0407/patrol-tsc-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-tsc-web-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-tsc-web.log
reports/consult-deepen/patrol-20261026-0407/patrol-tsc.log
reports/consult-deepen/patrol-20261026-0407/patrol-web-build-err.log
reports/consult-deepen/patrol-20261026-0407/patrol-web-build-out.log
reports/consult-deepen/patrol-20261026-0407/patrol-web-build.ps1
reports/consult-deepen/patrol-20261026-0407/prettier-file-list.txt
reports/consult-deepen/round1-gate/gate-1-tsc-err.log
reports/consult-deepen/round1-gate/gate-1-tsc.log
reports/consult-deepen/round1-gate/gate-2-eslint-be-err.log
reports/consult-deepen/round1-gate/gate-2-eslint-be.log
reports/consult-deepen/round1-gate/gate-3a-eslint-fe-root-service-err.log
reports/consult-deepen/round1-gate/gate-3a-eslint-fe-root-service.log
reports/consult-deepen/round1-gate/gate-3b-eslint-fe-root-page-err.log
reports/consult-deepen/round1-gate/gate-3b-eslint-fe-root-page.log
reports/consult-deepen/round1-gate/gate-4-eslint-fe-local-err.log
reports/consult-deepen/round1-gate/gate-4-eslint-fe-local.log
reports/consult-deepen/round1-gate/gate-5-prettier-err.log
reports/consult-deepen/round1-gate/gate-5-prettier.log
reports/consult-deepen/round1-gate/gate-6-bun-test-err.log
reports/consult-deepen/round1-gate/gate-6-bun-test.log
reports/consult-deepen/round1-gate/gate-7-coverage-err.log
reports/consult-deepen/round1-gate/gate-7-coverage.log
reports/consult-deepen/round1-gate/gate-summary.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-1-tsc-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-1-tsc.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-2-eslint-be-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-2-eslint-be.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-3a-eslint-fe-root-service-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-3a-eslint-fe-root-service.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-3b-eslint-fe-root-page-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-3b-eslint-fe-root-page.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-4-eslint-fe-local-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-4-eslint-fe-local.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-5-prettier-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-5-prettier.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-6-bun-test-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-6-bun-test.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-7-coverage-err.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-7-coverage.log
reports/consult-deepen/round1-gate/archive/20261026-032253/gate-summary.log
```
