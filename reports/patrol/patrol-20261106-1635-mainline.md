# 健澜仓库两小时滚动巡检简报（2026-11-06 16:35 槽位 · 主线独立复跑）

- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 分支：`consult-agent-m86`
- 本轮起点 HEAD：`7e59a25b4ba76118513e3c97179d76e2fb14cfcf`
- 本轮收口 HEAD：`ba34a8a8e97dc108039562640478d4b33b1d04f8`
- 巡检时间：2026-11-06 16:35（UTC+8）

## 一、组织智能体状态

- 智能体：`o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级），version 606，status = finished / idle-resumable standby。
- 自报口径：P5-19 续作验收 ALL_GREEN（lint-diff 四处修复、brand-scan 9816、双 tsc 0/0、单测 135/0/413、E2E 23/0/81×2）。
- 本轮处置：按"组织侧自报门禁一律不可信"纪律全线独立复跑（见第三节），并唤醒其以下轮基线 `ba34a8a8` 续做。
- 旧智能体 `o_000pZ6W0z5F`/`o_000pKWRkDCO`/`o_000EkD3iWsb`/`o_000E2mfsz5X` 已终态，不再巡查。

## 二、工具链基线（实测）

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（全路径 `C:\Users\lenovo\.bun\bin\bun.exe`，PATH 未注册） |
| npm | 10.9.8 |

## 三、门禁实测（主线独立复跑，非沿用组织侧自报）

| 门禁 | 命令 | 结果 |
|---|---|---|
| 根 tsc | `node node_modules/typescript/bin/tsc --noEmit` | exit 0，输出 0 字节，31.2s |
| web tsc | cwd=web `bun x tsc --noEmit` | exit 0 |
| 单测 | 组合跑 10 文件 | 146 pass / 0 fail / 432 expect，13.01s |
| 品牌复扫 | 自写独立扫描器，四套词表 24 词，9815 文件 | 硬违规 0；`gangos` 13 处/2 文件（指标前缀，属 backlog 不计硬违规） |
| 路由检查 | lazy import 2865 个 | 全部可解析、0 悬空；Route 2870 条 0 重复；element 组件 2769 个 0 未定义 |
| 端点 | 7 端点 | 全 200 |

单测文件数说明：命令列 11 文件、实际跑到 10 文件，缺 `tests/integration/VendorAdapters.test.ts`——该文件未入库、`git log` 无历史、`git ls-files` 无记录，即从未提交过，非本轮回归；对应上轮基线 153 pass / 441 expect 的差值（-7 pass / -9 expect）。`bun test` 对不存在路径静默跳过（exit 0），已登记为口径风险。

## 四、运行态与端点

- 端口：3000 无；5173 由外部沙箱 vite 占用（非本仓源码，已判定不让用户使用）；5174 本仓 vite（`--port 5174 --strictPort`）；8080 本轮重启的 BFF；8081 本轮 E2E 隔离实例；8000 为他项目 uvicorn；9090 无。
- BFF：以 `HTTP_PORT=8080` + `AUDIT_BACKFILL_LIMIT=10000` 启动，`/ready` 返回 `sealDisabled=false`、`auditStore=pg`、`wormBackend=memory`。
- 端点实测：`/health` 200、`/ready` 200、`/api/v1/health` 200、`/api/v1/system/health` 200、`/metrics` 200、5174 `/` 200、5174 `/login` 200。
- 启动期外来进程坑：`src/bff/index.ts`（re-export 壳）被组织侧用来起进程占住 8080，新进程 EADDRINUSE 静默退出，表现为"改了代码却仍报错"，必须先停掉外来 PID 再起。

## 五、本轮 P0：工作台登录不可用（已修复并提交）

- 现象：用户在 5174 登录页反复登录失败；页面预填 `admin` 且提示"任意 6 位以上密码"。
- 取证：抓访问日志为 `POST /api/v1/auth/login 400/401 1ms`，非 5xx；读 `src/bff/routes/auth.ts` 定位 P0-7 收尾后 `verifyDemoPassword()` 只比对 `DEMO_CREDENTIALS` 表，而表中没有 `admin` 键 → 任何口令都返回 `401 code=40101`。
- 修复：`DEMO_CREDENTIALS` 增补 `admin`（与 `demo-admin` 同口令同权限；仅演示种子，生产无此表）；`LoginPage.tsx` 页脚提示改为与实现一致。
- 复验：8080 直连与 5174 代理 `POST /api/v1/auth/login` 均 200 并签发 token；根 tsc / web tsc 复跑 0 错误。
- 安全权衡（供决策）：演示环境开明文 admin 口令与 `demo-admin` 同权限，组织侧曾提示风险；用户实际需要该入口演示，维持现状并登记。
- 工作树处置：组织智能体此前把该修复 stash 走（判为"来源不明 WIP"），本轮 `stash apply` 取回、提交后 `stash drop`，stash 队列已清空。

## 六、本轮 P1：E2E 跨段检索用例不可复现（未修，取证完整）

同一份代码、同一测试文件，四轮实测：

| 轮次 | 实例 | 结果 |
|---|---|---|
| r1 | 全新隔离实例 | 23 pass / 0 fail / 81 expect |
| r2 | 重启新实例 | 22 pass / 1 fail / 77 expect |
| r3 | 重启新实例 | 22 pass / 1 fail / 77 expect |
| r4 | store 已有段的实例 | 23 pass / 0 fail / 81 expect |

- 固定失败点：`P5-6 GET /worm/search 跨段检索有结果`，`expect(r.data.total).toBeGreaterThanOrEqual(1)` 收到 0（`worm-e2e.test.ts:315`）。
- 访问日志时序：`POST /worm/segments/seal 201 25ms` → `GET /worm/search?limit=10 200 **4ms**`，4ms 说明该次检索**扫描到 0 个段**。
- 手工探针（全新实例，`store/info segmentCount=0`）：`seal` 建段成功（fromSeq=1 toSeq=1407、eventCount=1407、SM4 加密）→ 立即 `search` 返回 `total=1407 scanned=1 rows=10`，+300ms/+2s 三次一致。
- 结论：`seal → search` 端点链路本身正常；失败源于**启动期 store 状态竞态**（进程刚起、回填与自动封段尚未就绪时，用例自造段未被检索可见）。属测试基础设施对环境状态的依赖，**不是本轮改动引入**，也不是 seal 功能缺陷。
- 影响：E2E 门禁不再具备"同代码必绿"的可复现性，与组织侧 P5-19 查出的"E2E 已依赖 `audit.events` 行数"同源，为 `AUDIT_DB_SCHEMA` 独立 schema 隔离方案再添一条实证。
- 建议（下一轮执行）：`beforeAll` 增加有界等待——轮询 `/store/info` 直到 `segmentCount>=1` 或超时后主动 `seal` 一次再断言，把竞态从断言里剥离；根治仍需 E2E 独立 schema/独立审计库。

## 七、仓库卫生

- `logs/` 全部被 `.gitignore` 覆盖，本轮新增探针脚本与日志（`probe-search.ps1`、`probe-warmup.ps1`、`probe-seal-order.ps1`、`patrol-1625-*`、`bff-e2e-8081*`）均未入库。
- 另一路 p0–p4 切片简报 38 项仍为 untracked（`reports/patrol/patrol-20261103-*` 起），按纪律不代提交、不删除。
- 未提交残留：`wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释（更早轮遗留，非本轮）。

## 八、提交与双仓推送

分组提交：

| 提交 | 内容 |
|---|---|
| `ba34a8a8` | `fix(bff,web): 演示登录页预填账号 admin 未在演示口令表内导致登录恒 401`（`src/bff/routes/auth.ts`、`web/src/pages/LoginPage.tsx`） |

推送与四 ref 核对（推送后 `git ls-remote` 逐位比对）：

| 远端 | refs/heads/master | refs/heads/consult-agent-m86 |
|---|---|---|
| 本地 HEAD | `ba34a8a8e97dc108039562640478d4b33b1d04f8` | 同左 |
| gitcode | `ba34a8a8e97dc108039562640478d4b33b1d04f8` | `ba34a8a8e97dc108039562640478d4b33b1d04f8` |
| mirror | `ba34a8a8e97dc108039562640478d4b33b1d04f8` | `ba34a8a8e97dc108039562640478d4b33b1d04f8` |

四 ref 全部一致。未推 origin（HTTPS token 口径）与 heagentos；未打 tag。

## 九、遗留风险与下一轮重点

1. **E2E 竞态（P1）**：按第七节建议先在 `beforeAll` 做有界等待，同时推进 `AUDIT_DB_SCHEMA` 隔离；在隔离落地前，E2E 绿灯不得单独作为发布依据，须附"实例启动后 store 已就绪"的取证。
2. **`VendorAdapters.test.ts` 缺失**：单测面从 11 文件退到 10 文件，需确认是否补建（无 git 历史，疑为从未入库的规划件）。
3. **待拍板决策项**（沿用前轮）：`layered.put` 断网兜底方案、`/ready` 非生产 `auditMemory` 是否降级 `degraded`、`WORM_BACKEND` 默认是否改 `fs`。
4. **口径风险**：brand-scan 已不排除 `logs/coverage`，若未来路径集合含 `logs/` 会把巡检日志里的厂商词误判硬违规；本轮自写扫描器显式排除 `node_modules/dist/coverage`。
5. **`sourceChainValid:false`**：seal 响应长期如此（历史链因回填截断/加密所致），尚未定性是否属缺陷，下一轮可专项判定。

## 十、纪律声明

本轮全部门禁数字均为主线独立复跑所得，未沿用组织侧自报；组织侧自报的单测 135/413 与主线实测 146/432 存在差异，以主线为准。E2E 未取到稳定绿，如实记录为 P1 未闭环，不宣称通过。
