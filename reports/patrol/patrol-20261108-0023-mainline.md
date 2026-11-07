# 巡检简报 · 2026-11-08 00:23 轮（主线）

- **轮次**：2026-11-08 00:23（两小时滚动巡检）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **轮次基线**：`3c5666fa`（22:23 轮收口值）
- **本轮无源码改动**：门禁 5/5 PASS、六端点全 200、品牌硬违规 0；本轮处理的是**组织侧验收简报的口径更正**

## 1. 组织智能体进度

- `o_000Rfj7NkAk`：`version` **815**（上轮 805，**本窗口有实质产出**），status 仍是 finished / executing 82%。
- 新增落地：
  - P5-27 双口径闭合验证完成（13 文件 181/0/512，14 文件含 auditChainVerify 186/0/522，与一次性汇总一致）；
  - P5-31 survey 完成（高端 HIS 厂商装机量口径，落 `logs/p5-31-survey.log`）；
  - P5-31 验收简报 `reports/patrol/patrol-20261107-2224-p5-31-acceptance.md` 落盘（本文档由本轮主线更正后入库）。
- 它自报的两处错误已自行认账：`wormLayeredStore 8/3` 是正则误读到日志正文；未跟踪 147 是把 `??` 当通配符。两条均在本轮主线复跑中确认修正成立。

## 2. 代码健康门禁（主线实测，全绿）

| 项 | 结果 |
|---|---|
| node / bun / npm / pwsh | v22.23.2 / 1.2.0 / 10.9.8 / 7.6.4 |
| root tsc | exit 0（38s，0 字节） |
| web tsc | exit 0（72s，0 字节） |
| 单测 | 181 / 0 / 512（11s） |
| E2E | 23 / 0 / 83（13s） |
| brand-gate（src,web/src） | 9816 文件 / 0 硬违规（code=0 doc=0）/ backlog 13（10s） |
| brand-gate（docs 单独） | 294 文件 / 0 硬违规 / backlog 14 |
| gate-all | `OVERALL: PASS`，exit 0（`logs\patrol-0023-gateall.txt`） |
| 路由 | lazy 2872 / 悬空 0 / route 2870 / 重复 0 |

**品牌全仓复扫**：真正的硬违规（旧称中文名、拼音 id、拉丁旧标识、产品旧称的缩写形态、对标厂商真名）**0 命中**；命中项全为 `gangos_` 指标前缀及其派生形态，属专项 backlog。组织侧本轮新增的两份文档（P5-31 验收简报、2307 轮简报）单独扫描 16 个禁词形态，命中均为 0。

## 3. 运行态

| 端口 | 归属 |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 |
| 5173 | pid 51604 node，06:02:17（外部沙箱 vite） |
| 8080 | pid 46600 bun，06:52:46（BFF） |
| 8000 | pid 36640 python，06:02:18 |
| 5433 | pid 240 postgres，08:26:54 |

- 六个探测点全部 200：`/health` 2B、`/ready` 235B、`/api/v1/health` 166B、`/api/v1/system/health` 145B、`/metrics` 4401B、`5173/` 714B。
- `/ready`：`status=ok`、`auditStore=pg`、`dbReachable=true`、`wormBackend=memory`、`sealDisabled=true`（`audit-backfill-truncated`，既有状态）、`uptimeSec=63213`。
- 四窗口 uptime 连续：41825 → 48884 → 56094 → **63213**，同 pid 46600，**全程未重启**。本轮未复现 8s 超时。

## 4. 本轮处理项（P0：一份验收文档的三处口径错误）

组织侧的 P5-31 验收简报落盘后，主线逐项复核，更正三处，**结论方向不变**：

1. **`worm-s3-fallback` 0/0/0 的原因写错**。原文称"单跑加载异常"，实际是两件事叠加：
   - **路径写错**——该文件在 `tests/integration/worm-s3-fallback.test.ts`，不在 `tests/unit/` 下；
   - **CLI 参数误用**——`bun test tests/...` 不带 `./` 前缀时，bun 把参数当**文件名子串过滤器**，扫全仓 65133 个文件后报 "0 tests"。看起来像加载失败，其实一个用例都没被选中。
   - 按正确路径单跑实测：**8 pass / 0 fail / 20 expect，exit 0**（`logs\patrol-0023-s3fallback3.txt`）。因此 13 文件逐文件相加**本身就等于 181/0/512**，原文"173 + 8 = 181"的差额说明不成立，已改为直接闭合。
2. **HEAD 双记写反了主次**。原文写"作者实测 3c5666fa / 主线定稿 a16c9d95"，但 `a16c9d95` 是 20:23 轮终值，22:23 轮收口已是 `3c5666fa`。已改为"两值同为 `3c5666fa`，`a16c9d95` 是上一窗口终值，其后仅 1 笔简报提交、代码未变"。
3. **补第 9 节「主线独立复核」**，写清哪些数字主线实测过、哪些未复核：只核了算术闭合与 2 个文件（s3-fallback、wormLayeredStore 8/0/25），其余 11 个文件未逐文件复跑；其"wormLayeredStore 跨环境结果不一致"一说在本机单一口径下无从复现。

**新增测量纪律（已写进该文档）**：单文件跑 `bun test` 必须带 `./` 前缀；遇到"全零"结果先怀疑调用方式，再怀疑代码。

## 5. 提交与推送

| 提交 | 内容 |
|---|---|
| 第 1 笔 | P5-31 验收简报（含主线第 9 节复核与三处更正） |
| 第 2 笔 | 本轮巡检简报 |

- 双推 `gitcode` + `mirror`，`ls-remote` 四 ref 逐位核对与本地 HEAD 全等；不推 `origin`、不推 `heagentos`、不打 tag。

## 6. 仓库卫生

- 根目录 `*.txt` 1361、`*.log` 762；`logs/` 5274 文件（gitignored，`.gitignore:33`）。
- 脏项 **148**（含 2 项 pgdata 运行态删除）；未跟踪 **41**（历史简报 40 + `pgdata/pg_stat` 1）。
- `pgdata/` 仍被跟踪 **2220**。
- 另一路 consult 产物（`docs/_m2xx*`）未代提交、未删除。

## 7. 遗留风险与下一轮重点

1. **词表与 reports 豁免仍未定**，组织侧已在做 40 词表重扫与 diff 方向核对——注意其本轮自认过"清理后 0 命中不构成误报率证据"，重扫结论须按此口径读。
2. **`wormLayeredStore` 跨环境不一致待排查**：主线本机为 8/0/25，本轮无法复现所谓 3 fail，倾向于是另一侧的读法问题而非代码问题，需要对方给出原始日志再判。
3. BFF 重负载 >8s 无响应：四窗口未复现，维持观察项。
4. 三条防复发约束（gate 加 diff 方向核对、index/worktree 一致性预检、替换脚本打印方向）仍未落地。

## 8. 待拍板（跨轮累积）

- **词表扩词 + `reports/` 豁免口径**（同一套门禁的两面，须一起定）
- `AUDIT_BACKFILL_LIMIT`（A / B / C）
- `pgdata/`（2220 文件）与 `pgsql/` 是否摘除；`WORM_BACKEND=memory` 是否改 `fs`
- P5-30 B 方案边界、P5-31 E1/E2 拆分；`m600Routes.ts` 供应商字段改名
- 演示环境明文口令取舍（位置 `src\bff\routes\auth.ts` L104-113，仅可引用位置）
