# 巡检简报 · 2026-11-07 18:23 轮（主线）

- **轮次**：2026-11-07 18:23（两小时滚动巡检，主线独立复跑）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **轮次基线**：`816002d652d01592bb556ee83ef22aa584f970ec`（16:23 轮收口值）
- **本轮代码收口 HEAD**：`ca7a703f`（B 组文档改写）；简报自身另起一笔提交并再次双推

## 1. 组织智能体进度

- `o_000Rfj7NkAk`：`status=2 finished`、100%、version **798**（上轮 791）、round 12369–12370、`reason=flush`，处 idle-resumable standby。
- **本窗口产出的是清单、不是代码**：交付 B 组 29 行逐行清单（含 4 行判为豁免），5 份业务文档一行未改。
- 摘要仍写 `HEAD=47197e6f`，与现 HEAD 差 5 笔提交，**摘要基线未更新**（连续第三轮出现同一问题）。
- 三方计数分歧已收敛：同一批 5 份文档，本轮主线实测 **25 行 / 42 处**；组织侧 43–54 处源于其词集额外含普通中文词（创业/创业团队语境）造成的重复命中，剔除后与其清单逐行加总一致（13+5+2+4+1=25 行）。

## 2. 代码健康门禁（主线实测）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| root tsc | exit 0（52s，0 字节） |
| web tsc | exit 0（86s，0 字节） |
| 单测 | 181 / 0 / 512（13 files，14s） |
| E2E | 23 / 0 / 83（12s） |
| brand-gate（src,web/src） | 9816 文件 / 0 硬违规（code=0 doc=0）/ backlog 13，10s |
| brand-gate（docs 重跑） | 294 文件 / 0 硬违规 / backlog 14 |
| gate-all | 5/5 PASS，`OVERALL: PASS`，exit 0（`logs\patrol-1823-gateall.txt`） |

- 路由：`lazy_imports=2872 / dangling=0 / route_paths=2870 / dup_paths=0`，与上轮完全一致（无新增悬空、无重复 Route）。
- 硬禁展示名全仓复核（排除 `reports/`、`logs/`、`pgdata`、`pgsql`、`node_modules`）：**0 命中**。口径为两组——中文旧称（含其简写变体）、对标厂商中文真名与其英文/产品线标识，逐词大小写不敏感检索，源域与文档域均无残留。
- `gangos` 前缀仍分布在 18 个非 reports 文件（指标名/告警名/词表定义/测试夹具），属专项 backlog，与门禁 `backlogGangos: 13` 口径一致，未混入硬违规。

## 3. 运行态实测（18:27–18:35）

| 端口 | 状态 | 归属 |
|---|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 | — |
| 5173 | LISTEN pid 51604 | node.exe，06:02:17（外部沙箱 vite） |
| 8080 | LISTEN pid 46600 | bun.exe，06:52:46（BFF） |
| 8000 | LISTEN pid 36640 | python.exe，06:02:18（他项目） |
| 5433 | LISTEN pid 240 | postgres.exe，08:26:54 |

- **端点在门禁并发期间全部 8s 超时**（`/health` `/ready` `/api/v1/health` `/api/v1/system/health` `/metrics` 全 ERR），gate-all 结束后**同一 pid 连续 3 轮全部 200**，`uptimeSec` 由 34517 连续增至 41825，**进程未重启**。
  → 判定：门禁五步并发抢占 CPU 导致事件循环停顿超过 8s，属瞬时无响应而非崩溃；但这条本身是风险——重负载下 BFF 会出现 >8s 不响应，已记为观察项（不是本轮修的 P0，未改配置）。
- 最后一次探测字节数：`/health` 2、`/ready` 235、`/api/v1/health` 166、`/api/v1/system/health` 145、`/metrics` 4399、`5173/` 200 bytes 714。
- `/ready`：`status=ok`、`auditStore=pg`、`dbReachable=true`、`wormBackend=memory`、`sealDisabled=true`（`audit-backfill-truncated`，既有状态）。

## 4. 本轮处理项（P0：B 组业务文档厂商真名，25 行清零）

**处置口径**（沿用组织侧清单并逐行复核，不改语义、不动业务数字）：

| 场景 | 处置 |
|---|---|
| 有具体指向 + 业务数字 | 改泛指代称，**数字保留**（营收、薪资包、中标金额、涨幅） |
| 可反查识别信息（股票代码）、产品名 | **删除**（产品名改"其 EMR 产品线/一体产品"） |
| 非 HIS 品类（CDSS / 影像 / 财务 HRP） | **品类泛指**，不套 HIS 编号（避免编号语义漂移） |
| 泛泛竞对 | "头部 HIS 厂商""全国渠道型厂商"，不套编号 |
| 文档内出现的医疗机构全称 | 改"某三甲""某地市项目" |

**结果：5 文件 25 行 42 处 → 0**

| 文件 | 行 | 命中 |
|---|---|---|
| `docs\architecture\review-4-business-cost.md` | 13 | 18 |
| `docs\architecture\01-PRD-产品需求.md` | 5 | 12 |
| `docs\MEDMUSE-FEASIBILITY.md` | 2 | 6 |
| `docs\architecture\06-团队与成本.md` | 4 | 4 |
| `docs\architecture\00-决策基线.md` | 1 | 2 |

- 方向核对：`git diff -U0` 新增 25 行、删除 25 行，**新增行含厂商标识 0 行**（证据 `logs\patrol-1823-scrub-groupB.txt`、`logs\patrol-1823-docs-scan3.txt`）。
- 复扫后 docs 域仅剩 4 行 5 处命中，**全部为误报**：某开源 EMR 项目名（GitHub 上同名无关项目）3 行 + 某常用词内部恰好拼出厂商标识的跨词子串 1 处。组织侧转述的"验收实测只剩 4 处"若指这 4 行，则数字碰巧吻合但口径不同（该口径只扫 2 个词，不能用来证明干净）。
- 组织侧清单里的 4 行"豁免"（创业公司/创业团队语境的普通中文词）本轮确认不属违规，未改。

## 5. 提交与推送

| 提交 | 内容 |
|---|---|
| `ca7a703f` | docs(compliance)：5 份业务成本与产品文档 25 行厂商真名改泛指（+25/−25） |

- 双推 `gitcode` + `mirror` exit 0；`ls-remote` 四 ref 逐位核对全等 `ca7a703f`，与本地 HEAD 一致。
- 未推 `origin`、未推 `heagentos`、未打 tag。
- 本简报自身另起一笔提交并再次双推，收口 SHA 以推送后核对值写在第七节。

## 6. 仓库卫生

- 根目录 `*.txt` 1361、`*.log` 762；`logs/` 5205 文件（gitignored）。
- 未跟踪 40（`reports/patrol/*.md` 39 + `pgdata/pg_stat` 1）；`pgdata/` 被跟踪仍为 **2220**。
- 本轮临时脚本与取证全在 `logs/`：`patrol-1823-docs-scan.py`、`patrol-1823-docs-hits.json`、`tmp_scrub_groupB_1823.py`、`patrol-1823-router-check.py`。
- 另一路 consult 产物（`docs/_m2xx*`、`pgdata/`）未代提交、未删除。

## 7. 遗留风险与下一轮重点

1. **`reports/` 硬禁旧称仍未定口径**：全仓 57 个文件含旧称/前缀，其中 `reports/patrol` 30 篇是历轮自查简报（正文复述词表），`reports/audit-2026-10-25` 3 篇、`reports/slices` 3 篇为审计与切片记录。**这批是"记录"还是"泄漏"没有口径**，本轮一行未动。
2. **词表仍是最短板**：现有 40 条覆盖 5 类厂商，本轮 B 组涉及的另外十余类完全在词表外——"门禁长期报 0"的真正原因是**没在找**，不是抓不到。扩词必须先解决两字拼音直扫的高误报（某两字拼音实测 ~50 处命中、真名占比仅约 5%，必须放弃裸子串）。
3. **三条防复发约束仍未落地**：`gate-all.ps1` 加 diff 方向核对、index/worktree 一致性预检、替换脚本打印 pattern/replacement 方向——目前靠人工执行（本轮人工做了 25 行新增行核验）。
4. **BFF 重负载响应**：门禁并发时出现 >8s 无响应（3 轮复探全 200 后恢复）。若后续要做生产级压测，这条会变成可用性问题。
5. 组织智能体摘要连续三轮写死旧 HEAD，其自报"ALL_GREEN"的基线不可信，验收必须回到仓库实测。

## 8. 待拍板（跨轮累积，本轮未动）

- `AUDIT_BACKFILL_LIMIT`（A 调大 / B 归档后截断（须 dry-run + 开关默认关）/ C 冷热分离）
- `pgdata/`（2220 文件）与 `pgsql/` 是否摘除；`WORM_BACKEND=memory` 是否改 `fs`
- `reports/` 豁免口径（"记录"vs"正文顺抄词表"判别规则）
- 词表扩到覆盖 B 组遗漏品类，及两字拼音是否改词边界或只做上下文判定
- P5-30 B 方案边界、C 方案"到生产再验"；P5-31 E1/E2 拆分
- 演示环境明文口令取舍（位置 `src\bff\routes\auth.ts` L104-113，仅可引用位置）
