# 巡检简报 · 2026-11-07 22:24 轮（P5-31 验收）

- **轮次**：2026-11-07 22:24
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **作者实测 HEAD**：`3c5666fa`（22:23 轮主线简报提交）/ **主线当前 HEAD** `3c5666fa`（同一；20:23 轮终值为 `a16c9d95`，其后仅 1 笔简报提交，代码未变）
- **本轮无代码改动**：只做双口径复核与验收简报

## 1. 双口径闭合验证（核心结论）

### 13 文件口径

| 文件 | pass | fail | expect |
|---|---|---|---|
| wormArchive | 57 | 0 | 197 |
| wormKeyProvider | 29 | 0 | 63 |
| auditEventHook | 17 | 0 | 26 |
| wormKeysRoutes | 11 | 0 | 24 |
| keyOpsStore | 10 | 0 | 41 |
| auditEventStore | 9 | 0 | 27 |
| wormStoreResilience | 9 | 0 | 23 |
| wormExternalIntegrations | 7 | 0 | 37 |
| VendorAdapters | 7 | 0 | 9 |
| wormAuditCombo | 5 | 0 | 7 |
| wormLayeredStore | 8 | 0 | 25 |
| backfillTruncation | 4 | 0 | 13 |
| worm-s3-fallback | 8 | 0 | 20 |
| **Σ逐文件** | **181** | **0** | **512** |

**一次性批量跑**：181 / 0 / 512

**闭合等式（修正后）**：
- 13 文件逐文件相加本身即等于批量值：`181 = 181`、`512 = 512`、`0 = 0`，无需任何差额项 ✅
- 旧版表把 `worm-s3-fallback` 记成 0/0/0，并据此写「差额 8/20」，是**路径写错**造成的假差额：该文件实际在 `tests/integration/worm-s3-fallback.test.ts`，不在 `tests/unit/` 下。用正确路径单跑实测 **8 pass / 0 fail / 20 expect，exit 0**（见 `logs\patrol-0023-s3fallback3.txt`）。

### 14 文件口径（加 auditChainVerify）

- 批量跑：**186 / 0 / 522**
- 闭合：`181 + 5 = 186` ✅（auditChainVerify = 5 pass / 0 fail / 10 expect）

### 测量教训
- 本次初测曾误报 "wormLayeredStore 8 pass / 3 fail"，根因是正则 `(\d+)\s+fail` 匹配到日志行内的 "3 fail"（来自 log 输出），而非汇总行。修正为 `(?m)^\s+(\d+)\s+fail\s*$` 后确认为 8/0/25（主线 00:23 轮独立复跑一致，见 `logs\patrol-0023-wormlayered.txt`）。
- **纪律重申**：测试计数只读 bun test 汇总行，禁止从正文日志正则抠数字。
- **另一条等价教训**：单文件跑 `bun test` 时，路径必须带 `./` 前缀（如 `bun test ./tests/integration/x.test.ts`）。不带前缀时 bun 会把参数当**文件名子串过滤器**，扫全仓 65133 个文件后报 "0 tests"，看起来像"加载异常"，实际一个用例都没被选中。0/0/0 这类"全零"结果，先怀疑调用方式，再怀疑代码。

## 2. 门禁实测

| 项 | 结果 |
|---|---|
| root tsc | exit 0 |
| web tsc | exit 0 |
| gate-unit（13 文件） | 181 / 0 / 512，PASS exit 0 |
| gate-unit（14 文件 -WithChain） | 186 / 0 / 522，PASS exit 0 |
| gate-all（5 步） | 5/5 PASS，OVERALL: PASS exit 0 |
| brand-gate（src,web/src） | 9816 文件，22:24 实测 0 hard（清理后复测，仅证明当前干净，不构成误报率证据）/ backlog 13 |
| brand-gate（docs 单独） | 294 文件，22:24 实测 0 hard（清理后复测，仅证明当前干净，不构成误报率证据） |

### gate-unit.ps1 断言逻辑
第 99 行：`$pass -eq $expPass -and $fail -eq $expFail -and $expect -eq $expExpect` → **三值都校验**，不存在"只查 pass 不查 fail"的漏检。

## 3. 品牌词表缺口（P5-31 方案）

### 词表构成
- 40 条 = 30 literal + 10 RE:
- 覆盖 2 家厂商全名 + 拉丁变体；6+ 家厂商短名完全缺失

### 候选词直扫可行性

| 候选 | 形态 | src+web/src | docs | 真名占比 | 建议 |
|---|---|---|---|---|---|
| 候选1 | 两字短名（HIS类第3类） | 0 | 0（清理后测） | N/A | 可加 literal |
| 候选2 | 两字短名（HIS类第4类） | 0 | 0（清理后测） | N/A | 可加 literal |
| 候选3 | 两字短名（EMR类第1类） | 0 | 0（清理后测） | N/A | 可加 literal |
| 候选4 | 两字短名（含普通词歧义） | 0 | 4 | **0%（4/4 全为普通词）** | **不进词表**，走上下文判定 |
| 候选5 | 拉丁驼峰形态 | 0 | 0 | N/A | 加 `(?i)` |
| 候选6 | 全大写英文缩写 | 0 | 0 | N/A | 加词边界 |

**关键说明**：上表 docs 列的 "0（清理后测）" 是**本轮 P0 脱敏清理之后**测的 0，**不构成误报率证据**。清理前这些短名在 docs/ 有 55 处命中。

## 4. B 组三列清单复核

- 5 文件逐文件实测（按行计）：review-4=15行 / PRD=5行 / MEDMUSE=3行 / 06团队=5行 / 00决策=1行 = **29 行**
- 其中候选4 类（普通词歧义）4 行，全为"创业公司/创业团队"语境，**豁免**
- 其余 25 行处置建议已列（详见 `patrol-20261107-1823-词集差距.md` 延伸）

## 5. 仓库卫生

- **脏（modified）**：105
- **未跟踪（untracked）**：41
- **deleted（pgdata 运行态）**：2
- **合计**：148
- **快照时点**：2026-11-07 22:33 实测；另一路 consult 在制品持续增加

### 未跟踪清单构成
- 历史简报 39 篇（20261103-04 段）
- 本词集差距文档 1 篇
- `pgdata/pg_stat/` 1 个目录

### 不碰项
- `docs/_m2xx*`（另一路 consult 在制品）
- `pgdata/`（运行态）
- `reports/` 下 894 处（豁免口径未拍板）

## 6. 运行态

- BFF PID 46600，`/ready` uptimeSec 持续增长，`sealDisabled=true`（既有状态，非本轮引入）
- PG 127.0.0.1:5433 正常，`audit.events=2877`

## 7. 遗留风险

1. **词表扩词与 reports 豁免口径必须一起定**，半套口径上线会导致 docs 绿但 reports 红
2. **worm-s3-fallback 单跑 0/0/0 加载异常**（批量跑正常），非测试失败，但需关注
3. 三条防复发约束（diff 方向核对、index/worktree 一致性预检、替换脚本打印方向）仍未落地
4. 测量纪律：从正文日志抠数字的错误已发生两次，必须只读汇总行

## 8. 待拍板

- 词表扩词（候选1/2/3 按"能抓住真东西"判据）+ reports 豁免口径一并拍板
- AUDIT_BACKFILL_LIMIT 三方案（A/B/C）
- `pgdata/` 与 `pgsql/` 是否摘除；`WORM_BACKEND=memory` 是否改 `fs`
- E1/E2 拆分（04 文档 E 两行冲突）
- 演示环境明文口令取舍

## 9. 主线独立复核（2026-11-08 00:23 轮追加）

本节由主线撰写，只做实测与更正，不改上文的结论方向。

1. **13 文件 Σ 已更正为 181/0/512**：`worm-s3-fallback` 那一行原本记 0/0/0，主线按正确路径单跑实测为 8/0/20，故逐文件相加本身即等于批量值，原"差额 8/20"的说明撤销。
2. **0/0/0 的真实成因是路径写错 + CLI 参数误用**，不是"加载异常"：文件在 `tests/integration/` 而非 `tests/unit/`；且不带 `./` 前缀的路径会被 bun 当成过滤器扫全仓。两处都在上文"测量教训"补齐。
3. **wormLayeredStore 独立复跑 = 8/0/25**（`logs\patrol-0023-wormlayered.txt`），"8/3"确属正则误读，作者的自我修正成立。
4. **门禁由主线独立复跑，未采信作者数据**：gate-all 5/5 PASS、`OVERALL: PASS`、exit 0（root tsc 38s、web tsc 72s、单测 181/0/512、E2E 23/0/83、brand 9816/0 backlog 13），docs 单独 294/0 backlog 14，路由 2872/0/2870/0。
5. **本文档自身品牌洁净**：主线对全文扫 16 个禁词形态（含对标厂商真名与旧称），命中 0。
6. **未复核项（如实登记）**：13 文件的逐文件数字，主线只核了算术闭合与其中 2 个文件（s3-fallback、wormLayeredStore），其余 11 个未逐文件复跑；`wormLayeredStore` 的"跨环境结果不一致"一说，本轮在本机为 8/0/25 单一口径，无从复现所谓不一致。
