# 健澜仓库滚动巡检简报 · 2026-11-05 16:24 槽位

- 巡检时间：2026-11-05 16:24–16:40（CST）
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 工作分支：`consult-agent-m86`；本轮基线 HEAD：`46e4aeaa`（组织侧 P5-9 最后一个提交）
- 产品正式名：健澜AI原生医院操作系统OS
- 说明：本简报不写死自身最终 SHA，最终 HEAD 与三端核对值在巡检回执中给出。

## 1. 组织智能体状态

`o_000Rfj7NkAk`（HIS-EMR 一体化复刻与脱敏升级）：

- peek：`status=2`（finished）、overall **85%**、version **386**、round 5141–5144、`updated_at_unix=1793861299`（约 14:48）。摘要仍停在「双 tsc 跑中 / 待补生产单测 / 待 commit」，属 flush 滞后，实际其后已交完 P5-9。
- 本轮交付（均已入库，本轮之前未推送）：
  - `b9140c30` retire/purge 回收 + XFF 反代免流防护 + KEK 文档
  - `dd490f9d` setKeyInUseChecker 接到 store + 巡检简报
  - `a3a3fa92` purge fail-closed + 错误码区分 + 台账
  - `46e4aeaa` 真实 store 的 purge `refs=2` 用例
- 主线复核结论：
  - `purge()` 在 Demo 与 File 两个 provider 末尾均先检查 `keyInUse`，未挂检查器返 `key-in-use-checker-not-wired`；`refs>0` 返 `key-in-use` 并带 refs 数；active key 返 `cannot-purge-active` —— fail-closed 真实落地，非空转。
  - `retire()` 后 `active()` 自动切到下一个未 retired；全 retired 抛 `worm-no-active-key`，seal 侧捕获后返回独立错误码，与 `worm-key-not-configured` 不再混用。
  - `globalRateLimit` 新增 `hasXForwardedFor` 判定：`noProxy = TRUST_PROXY !== '1' && !hasXForwardedFor`，堵住「反代未设 TRUST_PROXY 但带 XFF 时、源 IP 被归一成 127.0.0.1 导致免流被绕过」的口子。
  - **仍缺运维入口**：`src/bff/routes/worm.ts` 只有 `GET /keys` 与 `POST /keys/rotate`，retire/purge 仅在 provider 层可用，运维无法通过 HTTP 触发回收。列为下一批候选。

## 2. 工具链实测

| 工具 | 版本 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0 |
| npm | 10.9.8 |

## 3. 双 tsc 门禁

| 目标 | 结果 |
|---|---|
| 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`） | 修复前 **exit 2 / 162 字节 / 1 行**；修复后 **exit 0 / 0 字节** |
| web tsc（`bun x tsc --noEmit`，cwd=`web`） | **exit 0 / 0 字节**（补上了组织侧本轮自认的空档） |

**本轮修掉的 P0（组织侧再次自报假绿）**：`46e4aeaa` 新增用例写成 `verify({ scope: 'real' })`，而 `wormArchiveAggregator.verify(scope: 'all' | 'real' = 'all')` 只收字符串，根 tsc 报 **TS2345**。运行态同样错：对象永不等于 `'real'`，会静默落进 probe 分支。改为 `verify('real')` 后复跑归零。组织侧声称「根 tsc commit 前/后 exit 0/0/0」，说明其复跑发生在加入该用例之前，三元口径仍未覆盖「最后一条提交后复跑」。

## 4. 测试门禁（实测）

| 套件 | 结果 | 日志 |
|---|---|---|
| 五文件组合（wormKeyProvider + wormArchive + auditEventHook + auditEvents + auditReport） | **105 pass / 0 fail / 278 expect（4.48s）** | `logs/patrol-1624-unit-worm.log` |
| globalRateLimit 单测 | **18 pass / 0 fail / 150 expect** | `logs/patrol-1624-unit-ratelimit.log` |
| WORM E2E R1 | **22 pass / 0 fail / 73 expect** | `logs/patrol-1624-e2e-R1.log` |
| WORM E2E R2（紧接着第二遍） | **22 pass / 0 fail / 73 expect** | `logs/patrol-1624-e2e-R2.log` |

## 5. 运行态与健康端点

BFF 原 pid 6364 启动于 14:53:53，早于 `a3a3fa92`（14:55:35），即运行进程未加载 fail-closed 版本。本轮已重启至 HEAD 前一刻的代码：**pid 29072，启动 2026-11-05 16:31:01**，`WORM_STORE_DIR=logs\worm-store-1624`（干净目录），stdout/stderr 落 `logs/bff-1624.out.log` / `logs/bff-1624.err.log`。前端 5173 pid 6528（10:51:27 启动）未动。

| 端点 | 状态 | 字节 |
|---|---|---|
| `8080/health` | 200 | 7 |
| `8080/ready` | 200 | 115 |
| `8080/api/v1/health` | 200 | 163 |
| `8080/api/v1/system/health` | 200 | 145 |
| `8080/metrics` | 200 | 6448（新进程计数尚少） |
| `5173/` | 200 | 894 |

端口：3000 / 8000 / 9090 无监听；5173 与 8080 各单实例，无冲突。

**WORM 跨钥验签运行态实证（本轮新增，比上轮的「轮换后验旧段」更强）**：

- `GET /keys` → 200，`keySource=demo-ephemeral`、`signerKeyId=k-0414fb8b46e7`。
- `POST /keys/rotate` → 200，切到 `k-04d7ca8c2780`。
- `POST /segments/seal` → 201，段 `WORM-0001-mw3aewcb`（seq 1，fromSeq 1→toSeq 2，2 事件），`signerKeyId=k-04d7ca8c2780`。
- 再 rotate 到 `k-0498f8ae7d7c` → seal → 段 `WORM-0002-mw3aewe7`（seq 2，1 事件），签名用新钥。
- 再 rotate 到 `k-047140878a1b` → seal → 段 `WORM-0003-mw3aewfw`（seq 3，1 事件）。
- `POST /verify?scope=real` → 200：`valid=true`、`realChainValid=true`、`digestValid=true`、`signatureValid=true`、`seqContinuity.valid=true`（gaps=[]、duplicateSeq=[]、outOfOrder=false）、`segmentCount=3`，**三段逐个 digestValid/signatureValid=true**。
- 三段分别由三把不同密钥签名，验签全部通过 —— 按段 `signerKeyId` 选钥的改造在运行态成立，且段链 `prevSegmentHash` 首尾相接（首段 GENESIS）。

## 6. 品牌与路由

- 品牌硬禁词 17 词：遍历 `src` + `web/src` 共 **9809** 个文件，逐文件 Ordinal 匹配，**命中 0**（`gangos_` 存量指标名仍未计入硬违规）。
- 路由体检：`routePathDeclarations=2870`、`uniquePaths=2870`、`duplicatePaths=0`、`lazyImports=2863`、`lazyMissing=0`。本轮新增代码未引入路由，数字与上轮一致。

## 7. 仓库卫生

- 提交后 `trackedDirty=0`。
- 未跟踪 **381** 项，全部在 `reports/`：`reports/consult-deepen` 197、`reports/patrol` 172、`reports/consult-rebuild` 12。属另一路 consult 任务与历史轮次产物，本主线不代提交不删除。
- `logs/` 由 `.gitignore:33` 覆盖；本轮全部日志、探针脚本（`patrol-1624-*`、`bff-1624.*`）不入库。

## 8. 分组 commit

| SHA | 类型 | 内容 |
|---|---|---|
| `9d139eb9` | fix(test) | 修正 P5-9 purge 用例的 verify 调用签名（`tests/unit/wormArchive.test.ts`） |

组织侧四个提交（`b9140c30`、`dd490f9d`、`a3a3fa92`、`46e4aeaa`）随本轮一并推送。

## 9. 遗留风险与下一轮重点

1. **retire/purge 无 HTTP 运维入口**：能力只在 provider 层，管理员无法通过 API 触发回收；补齐 `POST /api/v1/worm/keys/retire`、`POST /api/v1/worm/keys/purge`（admin + 返回 refs 数）是下一批首选。
2. **purge 引用判定成本**：每次 purge 全量 `store.list()` 扫段，段规模上千后是 O(段数) 阻塞；需索引化（按 signerKeyId 建倒排）或异步化。
3. **密钥体系仍是 demo 形态**：`.env` 无 `WORM_*`，运行态恒为 demo-ephemeral，重启换钥即旧段签名失效；生产 KEK/KMS 注入路径待产品确认。
4. **scripts 下 11 个历史脚本类型债**：仍登记 backlog，未修、未加 `@ts-nocheck`。
5. **组织侧复跑口径**：连续两轮出现「最后一条提交后未复跑」导致的假绿，下一轮要求其在 `git commit` 之后、报告之前再跑一次双 tsc 并贴三元。
6. 381 个未跟踪 `reports/` 项长期未收口，归另一路 consult 任务。

## 10. 结论

本轮双 tsc 双 0、单测 105/0/278 + 18/0/150、E2E 22/0 ×2、六端点全 200、品牌 0/9809、路由 2870/0 dup；修掉组织侧一处 TS2345 假绿（`9d139eb9`），并把 BFF 重启到最新代码后用三段三钥的跨钥验签做了运行态实证。双仓推送与三端 SHA 核对结果见巡检回执。
