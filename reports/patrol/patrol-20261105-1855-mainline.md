# 18:55 轮每小时巡检——P5-2 WORM 冷存储归档 主线独立复测全绿

## 轮次口径说明

本轮轮次标签沿用组织侧 commit 口径「18:55」，与墙钟存在偏差：`Get-Date` 实测本轮执行墙钟为 `2026-11-05 00:50`，`git log --date=format` 亦显示 P5-2 三条 commit 落在 `00:43`、组织侧简报落在 `00:45`。即本仓库巡检简报的「HHMM 轮」是轮次槽位标签，不是墙钟时刻。后续如需按真实时间检索，应以 commit 时间与文件 mtime 为准。

## 本轮基线

- 上一轮（17:45）主线已独立复测 P5-1 医疗质量管理指标闭环，双推三端对齐 `709aa66e`。
- 组织智能体 `o_000Rfj7NkAk` 唤醒后先澄清一笔账务：**P4-4 台账无欠账**。`git log --all` 可查到 `59827c6c docs(research): P4-4 ... commit 62deee55`，台账行完整存在；此前「待回填」是其旧摘要残留，本轮已核实清除，无需补 docs commit。
- 随后自主选 **P5-2 WORM 冷存储归档 + 审计哈希链衔接**（等保三级与电子病历 6 级双重硬要求，直接复用 P4-1 哈希链与 P4-5 取证包）并交付：
  - `15f89612` feat(security)：WORM 不可变段 + 链式哈希 + verify
  - `f301e338` docs(research)：台账回写
  - `12feb9eb` docs(patrol)：组织侧简报
- 本轮主线独立复测 P5-2 全绿。

## P5-2 切片概览

### 新增路由（`/api/v1/worm` grep 零冲突，未与既有 2870 条唯一路由冲突）

| 路由 | 说明 |
|---|---|
| POST `/api/v1/worm/segments/seal`（admin） | 手动封存段 |
| GET `/api/v1/worm/segments` | 列段（分页） |
| GET `/api/v1/worm/segments/:id` | 段元信息 |
| GET `/api/v1/worm/segments/:id/content?format=json\|csv` | 读段内容 |
| POST `/api/v1/worm/verify` | 全链校验 |
| POST `/api/v1/worm/_tamper`（DEMO_MODE only） | 篡改测试钩子 |

### 段哈希算法

```
segmentHash = SHA256(prevSegmentHash + '|' + sourceChainHead + '|' + JSON(events 按 seq 升序))
```

- 首段 `prevSegmentHash='GENESIS'`，其余承接上一段 `segmentHash`；
- `sourceChainHead` 取归档时刻 P4-1 审计哈希链尾 event.hash（归档前先跑 `verifyChain`）；
- 段存储 Map 只 set 不 update，无 DELETE/PUT 端点 —— 这是「不可变」在内存态下的最小实现；
- 空事件 seal 返回 `no-events`（幂等），非法时间窗返回 `invalid-window`。

## 主线独立复测

| 门禁项 | 主线实测 | 组织侧自报 | 结论 |
|---|---|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | **exit 0 / 0 字节** | exit 0/0B | 一致 |
| web `bun x tsc --noEmit` | **exit 0 / 0 字节** | exit 0/0B | 一致 |
| wormArchive 单测 | **11 pass / 0 fail** | 11 pass / 24 expect | 一致 |
| worm-e2e E2E（清库存后） | **10 pass / 0 fail** | 10 pass / 21 expect | 一致 |
| 合计（两文件合并跑） | **21 pass / 0 fail / 45 expect** | — | — |
| 品牌 17 词 Ordinal 扫描 | **9,802 文件 / 0 命中** | 0 命中 | 一致（较 P5-1 的 9,800 增 2） |
| BFF `/health` | 200 | 200 | 一致 |
| BFF `/api/v1/health` | 200 | 200 | 一致 |
| BFF `/api/v1/worm/segments`（无 token） | **401**（路由存在且鉴权有效） | — | 补充取证 |
| BFF `/api/v1/quality/dashboard/overview`（无 token） | **401** | — | 补充取证 |
| Vite 5173 首页 | 200 | 200 | 一致 |

### 首跑 5 fail 的假红取证与处置

主线接手时 BFF 8080 监听进程为 pid 26388，创建时间 `00:48:14`——正是组织侧自跑 E2E 前重启的那一只，其内存里残留了组织侧自测产生的段与一条被 `_tamper` 改写过的首段。主线首跑因此出现 5 fail，错误特征全部指向内存残留而非代码缺陷：

| 失败用例 | 期望 | 实得 | 判定 |
|---|---|---|---|
| 第一批 seal → 首段 GENESIS | `prevSegmentHash='GENESIS'` | `4053c062…`（上一段哈希） | 内存中已有段 |
| verify 未篡改 → valid=true | `true` | `false` | 内存中首段已被 `_tamper` 改写 |
| _tamper 首段 → 200 | 200 | 400 | 传入 segmentId 已非首段 |
| download JSON 含 events | 200 | 404 | 对应段不存在 |
| download CSV 含 header | 200 | 404 | 同上 |

按纪律**未改任何断言**，处置为：Stop-Process 杀 pid 26388 → `DEMO_MODE=1` 重启 `bun run src/bff/server.ts`（新 pid 35812，`logs\bff-1845.log` / `.err` 取证）→ 复跑即 21 pass / 0 fail / 45 expect。

这是「E2E 直接复跑会因 BFF 内存残留出假红」的第三次实证（前两次：P1-3、P3-3）。**改进建议（本轮未实施，登记待办）**：WORM 的 `_tamper` 钩子会永久破坏内存首段，建议测试结束自行清理，或给 `_tamper` 加 `restore` 参数，否则每次组织侧自跑都会把下一轮巡检拖进假红。

## 关键行为实测（主线复核要点）

- 首段 `segmentHash` 为 64 hex，`prevSegmentHash='GENESIS'`；第二段 `prevSegmentHash` 承接首段 `segmentHash`；
- `verify` → `valid=true` 且 `segmentCount>=2`；
- `_tamper` 首段后 `verify` → `valid=false`，`brokenSegmentId` 精确指向被改段；
- JSON 返回 `events` 数组，CSV 含 13 列 header；`format=xml` → 400；段不存在 → 404；doctor seal → 403。

## 工作区与仓库卫生

- `git status --porcelain` 中已跟踪改动为 0（本轮仅新增简报文件）。
- `reports/consult-deepen/**`、`reports/consult-rebuild/**` 及历史 `reports/patrol/patrol-2026MMDD-*.md` 等大量 untracked 项属另一路 consult 任务产物，本主线不代提交、不删除。

## 收口动作

- 本地 commit：`docs(patrol): P5-2 WORM 冷存储归档 主线独立复测全绿 18:55 轮`
- 推送 GitCode（gitcode.com:22，默认 GIT_SSH_COMMAND）
- 推送 mirror（ssh.github.com:443，独立 GIT_SSH_COMMAND）
- 三端 SHA 逐位核对（两 remote 分别 ls-remote）

## 未覆盖（沿用组织侧台账登记的缺口）

段落盘对象存储/S3（当前纯内存）、SM4 段加密、SM2 段签名、按时间窗自动触发 seal（当前手动）、跨段 seq 连续性校验、冷数据查询性能索引。

## 下一步

P5 电子病历 6 级 + 等保三级的合规底座已连片：审计哈希链（P4-1）→ 全局埋点/限流（P4-2~4-4）→ 取证包（P4-5）→ 质量指标（P5-1）→ WORM 归档（P5-2）。组织侧待唤醒后自主选下一切片，候选：互联互通五甲（XDS 文档共享 + EMPI 跨域）、SIEM Syslog/CEF 适配器、Captcha 接入登录、租户/科室分级限流，或把 WORM 落到真实对象存储。

7x24 不停工。
