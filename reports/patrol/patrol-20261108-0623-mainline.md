# 巡检简报 · 2026-11-08 06:23 轮（主线）

- **轮次**：2026-11-08 06:23（两小时滚动巡检）
- **仓库**：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- **轮次基线**：`47d8543c`（04:23 轮收口值）
- **本轮一处 P0 实修**：BFF 每次跑完智能体泄漏一个 25ms 永不休止的轮询器，已定位根因、修复并重启验证

## 1. 组织智能体进度

- `o_000Rfj7NkAk`：`version` **821 → 826**，round 12947–12950，`reason=flush`，`status=2 finished`、85% executing，已进入 idle-resumable standby（无新切片产出，本轮唤醒续做）。
- 本窗口它给出三条与主线相关的判断，**本轮逐条实测**：
  1. "`reports/` 896 命中 = 332 指标前缀 + 564 待拆" —— 与主线 185 处不符，差异来自词集不同，见第 4 节。
  2. "`pgsql` 用 40 词表扫为 0，主线 20 处是更宽口径" —— 属实，主线那 20 处是正则 + 短拉丁词打出的第三方误报（`pgAdmin 4` 内 Google API discovery JSON、pygments lexer、win32 头文件）。
  3. "`docs/technical/04` 仍有 7 类厂商真名残留、brand-gate 词表不全导致漏报" —— **前半句不成立，后半句成立**，见第 4、5 节。

## 2. 代码健康门禁

| 项 | 修复前 | 修复后 |
|---|---|---|
| root tsc | exit 0（46s） | exit 0（33s） |
| web tsc | exit 0（96s） | exit 0（70s） |
| 单测 | 181 / 0 / 512 | 181 / 0 / 512 |
| E2E | 23 / 0 / 83 | 23 / 0 / 83 |
| brand-gate(src,web/src) | 9816 / 0 硬违规 / backlog 13 | 同 |
| brand-gate(docs) | 294 / 0 / backlog 14 | 同 |
| 路由 | 2872 lazy / 0 悬空 / 2870 route / 0 重复 | 同 |
| gate-all | `OVERALL: PASS`，exit 0 | `OVERALL: PASS`，exit 0 |

工具链：node v22.23.2、bun 1.2.0、npm 10.9.8、pwsh 7.6.4。

## 3. 本轮 P0：BFF 轮询器泄漏（已修复并验证）

### 3.1 症状（第三次复现，这次是持续性的）

8080 端口上那个已运行 23 小时的 BFF，健康端点开始大面积超时：

- 首探 8s：`/health`、`/ready`、`/api/v1/health`、`/api/v1/system/health`、`/metrics` **五个全超时**，只有 5173 前端正常。
- 放宽到 25s：五个全部 200，但 `/health` 用了 **21503ms**，`/ready` 2385ms，`/api/v1/system/health` 3463ms，`/metrics` 2ms。
- 连续六次探测：**3 次成功（10118 / 3912 / 1821ms）、3 次 30s 超时**，成功率 50%。
- 进程累计 CPU 从 04:23 的 76883s 涨到 87211s，**两小时净增 10328s**；45 秒采样窗口内 CPU 增长 215s ≈ **3.6 个核**。

### 3.2 关键判据：慢的不是 handler

`/metrics` 里服务端自报的时延极小——`/api/v1/health` 18 次请求、直方图 `le="0.005"` 已经有 14 个，总和 0.058s；请求总数只有 18/19 次（进程启动以来）。也就是说**几乎没有流量，handler 本身 3ms 内就返回**，慢在请求被 event loop 接住之前。PG 侧同时只有 2 个连接、1 个 active（还是我自己的查询），数据库不是源头。

结论：**空载状态下 CPU 被烧掉 3.6 核、事件循环被饿死**，这是进程内部自转，不是负载问题。

### 3.3 根因（代码可复算）

`src/bff/aggregators/agentRuntimeAggregator.ts` 的 `startAgentRun` 用 `Promise.race([handle.result…, waitingForHuman(handle)])` 等人工节点。而 `waitingForHuman` 的循环是：

```ts
while (true) {
  if (handle.getState() === 'waiting_human') return { kind: 'waiting' };
  await new Promise((r) => setTimeout(r, 25));
}
```

**没有 human 节点的流程会直接跑完**，此时 `handle.result` 先兑现、race 结束，但 `waitingForHuman` 这个 25ms 轮询器**永远不会退出**——它的唯一出口是"状态变成 waiting_human"，而跑完的流程只会变成 completed。于是**每成功执行一次智能体，就永久泄漏一个 40Hz 轮询器**；23 小时里被 E2E/单测/演示反复触发，累积成持续 CPU 占用 + 计时器堆增长（工作集 635MB），最终把事件循环拖垮。

### 3.4 修复

退出条件改为"二选一"：命中 `waiting_human` 返回等待；命中终态（completed/failed/cancelled）或 `handle.result` 已兑现则直接交出运行结果。这样轮询器在流程结束的同一时刻终止，返回形状与原有调用点完全兼容（`{kind:'done', r}`）。

### 3.5 验证（重启前后同口径对照）

| 项 | 重启前（旧码 + 23h 泄漏累积） | 重启后（新码，跑 45s） |
|---|---|---|
| `/health` | 超时 / 21503ms | **93ms** |
| `/ready` | 超时 / 2385ms | **7ms** |
| `/api/v1/health` | 超时 / 3821ms | **5ms** |
| `/api/v1/system/health` | 超时 / 3463ms | **8ms** |
| `/metrics` | 超时 / 2ms | **1ms** |
| 六连探成功率 | 3/6 | 本轮 5/5 全 200 |
| 空闲 CPU | 215s / 60s ≈ 3.6 核 | **0.7s / 45s ≈ 1.5% 单核** |
| 工作集 | 635.6MB | 390.8MB |
| uptimeSec | 85104（旧进程连续） | 14（新进程） |

重启已核对端口归属：8080 监听 PID = 55672 = 新启动进程（非旧进程残留）。`/ready` 内容与其他状态项不变：`auditStore=pg`、`dbReachable=true`、`sealDisabled=true`（`audit-backfill-truncated`）。

需要说明的是：**重启前那 23 小时的历史 CPU 数据不能归因**——它既有泄漏累积，也可能包含测试负载。但 45 秒采样窗口的 3.6 核是无负载时段测的，这一点可以归因。

## 4. 组织侧口径核实

- **`docs/technical/04` 真名残留：不成立。** 该文件 3737 行、252KB，用 7 类厂商名做全字面扫描，命中 **0**；`git grep -c` 对 `docs/` 全目录同样 0 文件。命中的 3 处是 `jianlan`（本产品自有标识：来源系统取值、`application/vnd.jianlan.v1+json`、`client_id: jianlan_agent`），不是外部厂商名。docs 门禁 294 文件 / 0 硬违规也与之一致。它这轮大概率读的是自己 VM 里的旧副本或子代理的过期结论。
- **`reports` 896 vs 主线 185：词集不同，不是谁算错。** 主线用的是 `scripts/brand-words.b64.txt` 里那 40 条（literal 30 + 正则 10）；它这边口径更宽。同一批文件、不同词集必然得出不同总数，这类数字**必须带词集版本一起引用**，否则无法对账。
- **`pgsql` 0 vs 20：也是口径差。** 主线的 20 处全部是正则与短拉丁词在第三方文件里的误报，用"字面词表 + 大写敏感"去扫自然是 0。

## 5. 词表覆盖缺口：这次是真的（4 类厂商名不在 40 词表内）

用外部厂商名逐类全仓扫描，发现 **4 类厂商名在 40 条词表里一条都没有**，因此 brand-gate 报"0 硬违规"时看不见它们。落点集中在 **7 个文件**：

| 位置 | 文件数 | 性质 |
|---|---|---|
| `reports/` | 5 | 证据性引用（多厂商对比报告） |
| `RELEASE_NOTES_v0.1.0.md` | 1 | 历史发布说明 |
| `verification-report/` | 1 | 历史验收报告 |
| `src`、`web/src`、`docs`、`deploy` | **0** | 无 |

另有两个"看起来像、实际不是"的误报要记下来，避免下轮重复排查：`handleAiMedicalReport` 这类函数名里的 `iMedical` 只是 `AiMedical` 的子串；`产后 42 天，产后健康检查` 里的 `天健` 是跨词切分。

**结论**：`src`/`web/src`/`docs` 确实是干净的，"0 硬违规"在这个范围内成立；不成立的是"全仓干净"。缺口全在 reports 与两个历史文档里，正好落在待拍板的 reports 豁免口径上。

## 6. 运行态

| 端口 | 归属（重启后） |
|---|---|
| 3000 / 5174 / 8081 / 9090 | 无监听 |
| 5173 | pid 51604 node，06:02:17（外部沙箱 vite，714B） |
| 8080 | **pid 55672 bun（本轮重启）**，五端点 200 |
| 8000 | pid 36640 python，06:02:18 |
| 5433 | pid 240 postgres，08:26:54 |

## 7. 提交与推送

- 两组语义提交：`fix(bff)` 轮询器泄漏、`docs(patrol)` 本轮简报。
- 双推 `gitcode` + `mirror`，`ls-remote` 四 ref 逐位核对与本地 HEAD 全等；不推 `origin`、`heagentos`，不打 tag。

## 8. 仓库卫生

- 根目录 `*.txt` 1361、`*.log` 762（与前轮同值）。
- `logs/` 顶层 **4647** 文件（本轮 +15；口径为本目录非递归计数）。
- 脏项 **107**（`docs/_m2xx*` 99 + `pgdata` 8，均属另一路 consult 在制品，未代提交、未删除）。
- 未跟踪 **41**：`reports/patrol/` 40 篇 + `pgdata/pg_stat/`。`pgdata/` 仍被跟踪 2220。

## 9. 遗留风险与下一轮重点

1. **轮询器泄漏已修，但同类写法要全仓清查**：`while(true) + sleep` 型轮询若没有"对端已结束"的退出条件，都会变成这轮这种慢性拖垮。下轮起扫一遍 `while (true)` 与 `setInterval`，逐个确认有终止条件。
2. 重启前的 23 小时 CPU 曲线无法归因（泄漏 + 负载混合），从本轮起 `/metrics` 已带服务端时延直方图，可直接区分"handler 慢"与"event loop 饿死"。
3. 词表覆盖缺口实测量出来了（4 类 / 7 文件 / 全在 reports 与两个历史文档），可与 reports 豁免一并拍板。
4. 组织侧 `docs/technical/04` 的结论已证伪，需它自行改口；若它坚持，请它贴出行号，主线再对。
5. `.gitignore:148` 会忽略"日期+时刻"命名的组织侧轮次简报，本窗口该行为未变。

## 10. 待拍板（跨轮累积）

- **词表扩词 + `reports/` 豁免口径**（同一次决策）：reports 非前缀族 103 处 / 25 文件，另有 `RELEASE_NOTES` 与 `verification-report` 各 1 文件不在任何门禁范围内。
- `pgdata/`（2220 跟踪文件）与 `pgsql/`（2220 级第三方树）是否摘除。
- `AUDIT_BACKFILL_LIMIT`（A / B / C）、`WORM_BACKEND=memory` 是否改 `fs`。
- P5-30 B 方案边界、P5-31 E1/E2 拆分；`m600Routes.ts` 供应商字段改名。
- 演示环境明文口令取舍（位置 `src\bff\routes\auth.ts` L104-113，仅可引用位置）。
