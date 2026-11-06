# 健澜仓库两小时滚动巡检简报（2026-11-07 00:23 轮）

- 巡检时间：2026-11-07 00:20–00:5x（UTC+8，星期六）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 本轮起点：`9848f6f0`（上一轮双推 tip）
- 本轮收口：`32d92f4c`（组织侧 5 个提交）+ 本简报

## 一、智能体进度

| 项 | 实测值 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk` |
| 状态 | finished，100% done，version 711 |
| 自报 | P5-22 复验 ALL_GREEN；P5-9 至 P5-22 多轮收官门禁验收完成 |
| HEAD | `32d92f4c`（`git rev-parse` 实测，未 push、未打 tag） |

组织侧这轮做了一件真正有价值的事：**把自己上一版的结论推翻了一次**。

- 第一版定性：`sourceChainValid:false` 是"设计行为，非缺陷"。
- 再查一层后改判：**E2E 的 seal 用例压根没有断言 `sourceChainValid`**，而种子事件的 `prev_hash='prev-1'` 是假哈希，所以 seal 时验链如实报断、返回 `false` —— 这个 `false` 是**静默副作用**，测试不查，所以永远不会红。定性由"设计"改为"**测试夹具缺陷（漏网）**"，产品代码本身是对的（`false` = 检测到断裂，fail-closed）。

随后修了两处，缺一不可：种子换成真实哈希链（`GENESIS` 起、逐条 `computeHash` 衔接）+ seal 用例加 `expect(sourceChainValid).toBe(true)`；另加 5 条 unit 覆盖 `false` 态（首条断 / 中段断 / 哈希篡改 / 空数组 / 健康链）。这条方法论值得留档：**"测试通过"只证明"测试断言的事成立"，不证明"你没断言的事成立"**。

## 二、工具链与编译门禁（独立复跑）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| 根 tsc（HEAD=32d92f4c） | **exit 0 / 0 字节**（`logs/patrol-0107-tsc-root.log`） |
| web tsc（cwd=web） | **exit 0 / 0 字节**（`logs/patrol-0107-tsc-web.log`） |

说明：组织侧自报过两次"双 tsc 0"实际是 exit=2 / 4 错误（`ApiData` 缺字段、import 带 `.ts`、`patientId: null` 不匹配），本轮是它修完 `32d92f4c` 之后我**在最后一条提交之后**复跑的，0/0 成立。

## 三、测试（独立复跑）

| 套件 | 实测 |
|---|---|
| 官方 13 文件单测 | **181 pass / 0 fail / 512 expect**（`logs/patrol-0107-unit13.log`） |
| 新增 `tests/unit/auditChainVerify.test.ts` | **5 pass / 0 fail / 10 expect**（`logs/patrol-0107-auditchain.log`） |
| E2E `tests/integration/worm-e2e.test.ts` | **23 pass / 0 fail / 83 expect / 7.93s**（`logs/patrol-0107-e2e.log`） |

E2E expect 由 82 → **83**，差额就是新增的 `sourceChainValid` 断言，与本轮复跑一致；隔离指纹 `newestSeq=16`（生产共享表 2877），跑后 8081 无残留监听。

关于"断言真的能抓回归"：我读了用例，三条断链用例都是严格 `expect(r.valid).toBe(false)` + `brokenAt` 精确值。**这三条能在实现正确时通过，本身就要求实现真的会返回 `false`**——若实现退化为永远 `true`，这三条必红。组织侧的变异自证（改成永远 `true` → 3 fail）与这个逻辑一致，我未重复做破坏性变异，判定依据记录在此。

## 四、品牌脱敏 / 路由

| 项 | 值 |
|---|---|
| 扫描 | filesScanned 9815 / 24 词 / totalHits 13 |
| 命中构成 | 仅 `gangos`，13 处 / 2 文件（`src/bff/observability/metrics.ts` 7、`src/core/observability/metrics.ts` 6），属专项 backlog |
| 硬违规 | **0** |
| lazy import | 2865 / resolved 2865 / package 0 / MISSING 0 |
| route path | 2870 / duplicates 0 |
| elements | 2769 / undefined 0 |

## 五、运行态：8080 换了主人，上一轮的假设被推翻

本轮开工时 8080 有监听，但**不是上一轮我起的进程**：

| 项 | 实测 |
|---|---|
| 当前 8080 监听 | **pid 41448**，`bun.exe src/bff/index.ts`，启动 2026-11-06 22:41:13 |
| 父进程 41552 | 已不存在 |
| uptime | 6155s（约 1h43，持续存活） |
| `/ready` | 200，`status=ok`、`wormBackend=memory`、`auditStore=pg`、`sealDisabled=false` |
| 其余端点 | `/health` 200 len=2、`/api/v1/health` 200 len=165、`/api/v1/system/health` 200 len=145、`/metrics` 200 len=4149 |
| 上一轮我起的 44264 | **已消失**；`logs/bff-8080-r4.out.log` 仅 466 字节、末两行是启动时的健康请求，之后无输出无异常栈 |

**结论：上一轮"缺 stdin 句柄导致退出"的假设被推翻。** 反证很直接：44264 带着 stdin 重定向仍然死了，而 41448 在**父进程已经不存在**的情况下活了 1h43 以上。父进程存活与否、stdin 是否存在，都不是充分条件。

目前剩下的假设是**启动它的执行会话 / 作业对象被回收时连带终止子进程**（工具宿主给每次命令分配 job，job 关闭时 KILL_ON_JOB_CLOSE 会带走后代）。这个假设可以验证：用 `Win32_Process.Create`（父进程是 WmiPrvSE，不挂在当前会话的 job 上）起 BFF，对比存活时长。

本轮**没有动 41448**：它健康、五端点全 200、`sealDisabled=false`，且它不是主线起的（父进程已消失、入口还是 re-export 壳 `src/bff/index.ts`），来源可能是另一条流水线。杀掉别人的进程不属于本轮范围。但它用壳文件作入口这件事本身是本轮已修掉的错法，登记如下。

端口全景：3000 none、5173 pid 41116（外部沙箱 vite，非本仓）、5174 pid 37772（**本仓 vite**，`node web/node_modules/vite/bin/vite.js --port 5174`，14:37 起）、8080 pid 41448、8081 none（E2E 跑后已清）、8082 none、8000 pid 12744（他项目）、9090 none。前端 `http://127.0.0.1:5174/` → 200 len=854。

## 六、数据态

| 项 | 值 |
|---|---|
| `public.schema_migrations` | 349 |
| `consult` 表数 / `to_regclass('consult.threads')` | 0 / null |
| `audit.events` | **2877**（与上一轮持平，本轮无新增写入） |
| `audit.events` 列 | seq,event_id,occurred_at,actor_id,actor_role,action,module,resource_type,resource_id,patient_id,result,error_code,ip,user_agent,prev_hash,hash,tenant_id |

## 七、本轮复核的组织侧提交（逐文件核归属）

| 提交 | 文件 | 判定 |
|---|---|---|
| `f5bfc0fa` | `reports/patrol/p5-22-source-chain-valid.md` (+105) | 第一版定性，已被下一提交自我推翻，保留留痕 |
| `0bc69d98` | 同文件 (+60/−25) | 改为"夹具缺陷"定性，补方案 B 风险 |
| `90fe67df` | `auditEventAggregator.ts`(+6/−6)、`worm-e2e-setup.ts`(+50/−7)、`worm-e2e.test.ts`(+1) | 产品代码改动**仅 3 处 `export` 关键字**（GENESIS/canonical/computeHash 暴露给测试），无逻辑变更；种子改真实链；加 1 条断言 |
| `e3a5a903` | `audit-persistence.md`(+20)、`auditChainVerify.test.ts`(+82) | 文档语义章节 + 5 条 unit |
| `32d92f4c` | `worm-e2e.test.ts`(+2)、`auditChainVerify.test.ts`(+3/−3) | 修 4 个 tsc 错误：`ApiData` 补可选字段、去 `.ts` 扩展、`patientId` 用 `undefined` |

无跨任务产物被误提交（5 个提交的文件全部与本切片相关，没有触碰另一路 consult 的 39 项未跟踪简报）。

## 八、分组提交与双仓推送

本轮主线无代码改动（仅本简报），组织侧 5 个提交经复核后一并收口。

| 仓 | 命令 | 结果 |
|---|---|---|
| gitcode | `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror | `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 逐位核对落 `logs/patrol-0107-refs.txt`（本地 HEAD / gitcode master / gitcode consult-agent-m86 / mirror master / mirror consult-agent-m86 完全一致）。不推 origin / heagentos，未打 tag。

## 九、仓库卫生

- tracked 改动：0（组织侧提交已全部入库）
- untracked：39 项，全部为另一路 consult 任务的巡检简报，不代提交、不删除
- 根目录探针 txt 1361 / log 762，均由 `.gitignore` 的 `/*.txt` 覆盖，不入库
- `logs/` 累计 4201 个文件（较上轮 +20）
- `git stash list` 为空

## 十、遗留风险与下一轮重点

1. **8080 持久化根因未定**：新假设=执行会话/作业对象回收连带终止。下一轮开工先看 41448 是否还在：在 → 说明脱离会话的启动方式确实更耐久；不在 → 改用 `Win32_Process.Create` 起 `src/bff/server.ts` 并落 pid 文件，同时对"入口用壳文件"的现象做一次纠正。
2. **`[worm] unsafe combo` 已在本轮 BFF 错误日志里明确出现**：审计事件持久化在 PG，但 WORM 段仅内存，重启后 `lastArchivedSeq` 归零 → 重复归档并覆盖旧段、**破坏跨段链**。这是 `WORM_BACKEND` 默认值决策（待用户拍板）的实际代价，不再只是理论风险。
3. **`AUDIT_BACKFILL_LIMIT` 生产上限策略**待拍板。组织侧给了 A（调大 limit）/B（归档后截断，需 dry-run + 可恢复性验证）/C（冷热分离）三案，推荐 B 但明确不执行、不改默认。库内 2877 已 2.9 倍于默认 1000。
4. **P5-9~P5-22 已全线收官，台账归零**：下一批切片需由主线定义，否则组织侧只能空转或自造任务。
5. 五项配置决策仍挂起（`layered.put` 兜底、`AUDIT_DB_SCHEMA` 优先级、`/ready` 非生产 `degraded`、`WORM_BACKEND` 默认 `fs`、演示环境明文口令）。
6. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释；`brand-scan` 未排除 `logs/`，若扫描路径含 `logs/` 会把巡检日志里的厂商词误判硬违规。

## 十一、本轮结论

- 双 tsc 0/0、官方 13 文件单测 181/0/512、新增断链用例 5/0/10、E2E 23/0/83（隔离指纹 16≠2877）、品牌硬违规 0、路由 0 悬空 —— 六项门禁全部独立复跑通过，且全部在组织侧最后一条提交 `32d92f4c` 之后执行。
- 组织侧本轮的自我纠正（把"设计行为"改判为"测试漏断言"）是本轮最有价值的产出，比任何一次全绿都重要。
- 8080 上一轮的 stdin 假设**已被数据推翻**：带 stdin 的进程死了，父进程消失的进程活了 1h43。新假设（作业对象连带终止）写清楚，下轮验证，不再用"已恢复"掩盖"根因未知"。
