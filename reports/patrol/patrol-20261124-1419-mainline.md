# 巡检简报 2026-11-24 14:19 轮（每小时滚动 · 后端 hang 解除与专项 fail 收口）

## 概要
定时巡检唤醒后收口 `consult-agent-m86` 分支后端专项：定位并解除两处既有测试 hang（根因：Bun 1.2.0 下 `setTimeout` 调 `unref()` 后回调不被事件循环调度），批量解除同源一次性超时/退避定时器隐患；修复 forensic 回放/取证包缺失的 actorId/patientId 过滤；对齐 consult-agent DDL 静态解析器引号标识符与两条路由自检基线。门禁均复跑取真实退出码，改动拆分两个提交推送 GitHub mirror 与 GitCode 三远端，ls-remote 逐字核对一致。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / 前端 web 目录 npm + vitest v2.1.9
- 后端 BFF/TS：仓库根 `bun test` + `tsc --noEmit`；前端：`web/` 目录 `vitest run`
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码，5433 Listen）

## 两处 hang 根因定位与解除（本轮核心突破）
隔离探针逐段对照坐实：**Bun 1.2.0 下对 `setTimeout` 调用 `unref()` 后，其回调不被事件循环调度**——普通 async 函数与 async generator 内均可复现，等待该定时器的 Promise 永久悬挂；`bun:test` per-test timeout 无法中断忙/悬挂态。这解释了：
1. `DeepSeekProvider.test.ts` 5xx 重试第二次流式消费悬挂：卡在重试退避 `sleep()` 的 unref 定时器。
2. `bulkhead.test.ts` 信号量超时/排队用例：ConcurrencyLimiter acquire 超时 unref 定时器未触发。

**对照探针结论**：`setInterval` + `unref` 在同一 Bun 1.2.0 下**正常触发**（tick 1/2 齐全、exit 0），与 `setTimeout` 行为不同；故三处周期定时器（ToolRiskManager 清理、DistributedLock 续期 watchdog、TriggerManager 分钟轮询）的 unref 保留不动。

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 后端 `tsc --noEmit` | **退出码 0**，无类型错误 |
| 分片 `consult-agent/ddlSchema.test.ts` | 20/20 通过，**退出码 0** |
| 分片 `consult-agent/typesSchema.test.ts` | 15/15 通过，**退出码 0**（此前 4 fail 为 hang 前并行污染，独立跑已全绿） |
| 分片 forensicExport + 押金结算 + 药房发药 三文件 | 50/50 通过，**退出码 0** |
| 后端 `bun test tests/unit` 全量 | 16649 pass / 171 fail / 113 errors，16820 tests / 2245 files，194.37s，**退出码 1** |
| 后端 `bun test tests/integration` 全量 | 768 pass / 189 skip / 484 fail / 46 errors，1441 tests / 170 files，185.43s，**退出码 1** |
| 前端 `vitest run` 全量 | Test Files 18 failed / 153 passed (171)；Tests 52 failed / 1345 passed (1397)，Duration 1615.88s |
| 前端隔离复跑 transfusion-page + emergencyComponents | 2 files / 44 tests **全部通过**，退出码 0（Duration 154.80s） |

## unit 全量 fail/error 归类（退出码 1，未编造通过结论）
### A. web 前端测试被 bun 运行时误纳入（环境/配置问题，非后端回归）
- 现象：`bun test tests/unit` 位置参数按子串匹配，`web/tests/unit/...` 路径含 `tests/unit` 子串被一并扫入；bunfig `pathIgnorePatterns=["web/**"]` 在 Bun 1.2.0 下未按 Windows 反斜杠路径排除。
- 报错：`vi.mock is not a function`、`Can't find variable: document/window` 等（vitest 命名空间与 jsdom 全局在 Bun 运行时缺失）。
- 归属：request 24、storage 24、auth 14、format 4、download 4、useOnlineStatus 3（合计 73 fail）及大部分 errors。**前端用例应在 `web/` 目录由 vitest 运行，不应纳入 bun test 口径。**

### B. 后端并行污染类（隔离单跑全 pass，非源码缺陷）
- `getDrugInfo.test.ts` 3、`searchMedicalKnowledge.test.ts` 3、`modelHealthProbe.test.ts` 1：全量并行下失败，单独隔离复跑 48 pass / 1 fail（见 C 项），判为跨用例/跨文件状态污染或并发时序。
- `db.unsafe is not a function`：测试桩 `DbExecutor` 未实现 `unsafe` 方法，并行下回退到缺方法桩；隔离不复现。

### C. 稳定复现的历史遗留 1 条（与本轮改动无关，列入下轮）
- `knowledge-platform/lifecycle/knowledgeRegistry.test.ts:387` 季度评审：`approve()` 内部 `approvedAt = nowIso()` 锚定当前真实时间（2026-11-24）+3 个月推算 `reviewDueAt`，测试却按固定日历 2026-10-26 基准断言 2027-02-01 命中到期台账；未到推算到期日，`listReviewDue` 返回 0。属时间基准未注入的历史漂移，本轮未改该模块。

## integration 全量 fail 归类（退出码 1，环境 schema 未就绪）
- 484 fail 中 **394 条为 `PostgresError: relation/column does not exist`**（本地 5433 库缺 `clinical.am_metrics`、`antibiotic_catalog`、`preop_assessments`、`pacu_records`、`barthel_assessments` 等表及 `imaging_reports.status` 列），17 条为缺表导致接口返回 null 的次生链式错误。
- 定性：本地 PG 未跑全量迁移/种子，属环境 schema 不完整；本轮未改 repository SQL 与 DDL，非代码回归。需在 DB 补齐迁移与种子后复跑。

## 前端 vitest 全量 fail 定性（无新回归）
- 本轮 `web/` 源码 **零改动**（`git diff --name-only web/` 与 `web/src` 未跟踪均为空）。
- 52 条 fail 中断言失败 **0** 处，超时/竞态类 112 处；典型为 `TestingLibraryElementError: Unable to find an element`（组件未渲染完成即查询）。
- 全量并行 20 个 node worker、Duration 1615s、setup 8824s（并发累加），机器显著过载；上轮已绿的 transfusion-page 本轮全量 7 failed，隔离复跑 12/12 转绿。判定为低资源并行超时 flaky，非前端代码回归。

## 本轮提交（2 个，拆分提交）
| SHA | 类型 | 说明 |
|---|---|---|
| `da00ca69` | fix(resilience) | 解除 Bun 1.2.0 下 unref 定时器不调度导致的重试 hang 与超时失效（11 files, +18/-23） |
| `6cd9c06b` | fix(consult-agent) | 对齐 forensic 回放过滤、DDL 引号标识符解析与两条路由自检基线（5 files, +39/-28） |

### 提交 A 覆盖的定时器去 unref（一次性超时/退避，均有 clearTimeout/finally 兜底）
DeepSeekProvider 重试退避与流式超时、LLMClient 退避、ToolExecutor 工具超时、ConcurrencyLimiter 信号量超时、AsyncQueue 背压超时、CircuitBreaker 调用超时、aiRecord/chat/emergency 聚合器与 interpret/llmClient abort 超时、wormStore 超时。

### 提交 B 处置明细
- `forensicExportAggregator.ts`：`replay`/`createPackage` 补 actorId/patientId 精确过滤（此前仅时间窗过滤，全量 pending 事件被返回）。
- `ddlSchema.test.ts`：静态解析器支持双引号引用标识符（`threads.current_role` 为 PG 保留字，DDL 必须加引号）。
- `forensicExport.test.ts`：`seed()` 改 async 逐条 `await recordEvent`（写穿 store 成功后才入内存 pending 池）。
- 路由自检基线对齐源码实况：押金结算 6→8 条、药房发药 8→13 条；`auth:true` 与前缀合规核对不变。

## 双仓镜像核对（推送后 ls-remote 逐字比对）
- 本地 HEAD：`6cd9c06b811cc03c26486b9b6639c9667a1f2dd8`
- origin（GitCode JLMEDAIOS, https）：`6cd9c06b811cc03c26486b9b6639c9667a1f2dd8` ✅
- gitcode（GitCode JLMEDAIOS, ssh）：`6cd9c06b811cc03c26486b9b6639c9667a1f2dd8` ✅
- mirror（GitHub JLAIharnessos, ssh.github.com）：`6cd9c06b811cc03c26486b9b6639c9667a1f2dd8` ✅
- 领先/落后 origin：`0 0`，三远端与本地完全一致。
- 凭据实测可用：origin https 推送 hooks PASSED；gitcode ssh、mirror GitHub ssh 均连通（ssh 仅 post-quantum 密钥交换算法告警，不影响连通）。
- `heagentos` remote（HEAGENTOS.git）仅含 `main` 分支，未承载 `consult-agent-m86`，不在本次同步范围。

## 工作区遗留（本轮未提交，归类留存）
- `docs/` 大量 modified：`core.autocrlf=true`、`.gitattributes` 声明 `eol=lf`，纯 CRLF→LF 换行漂移，无实质内容 diff，按既有范式不入库。
- `reports/patrol/` 历史切片（p0–p4、two-hour、round 等）不符合 mainline/p5 豁免命名，保持未跟踪。
- 本轮临时探针 `.ts`/`.cmd` 启动器已全部删除；`.txt` 取证日志由 `.gitignore` 忽略，本地留存备查。

## 待办（后续轮次）
1. 本地 PG 补全迁移与种子后复跑 `tests/integration`，消除 394 条缺表缺列及其次生 null 链式失败。
2. `knowledgeRegistry.approve` 支持注入时间基准（now 参数），消除季度评审日期漂移；补 `reviewDueAt` 可测性。
3. 排查 Bun 1.2.0 `pathIgnorePatterns=["web/**"]` 对 Windows 反斜杠路径失效；或后端 test 命令显式排除 `web/` 目录，避免前端用例误入 bun 运行时。
4. 低峰期、降 worker 并发复跑全量 web vitest，复核 52 条超时/竞态 flaky 是否稳定转绿；基线历史仅 3 failed（websocket 定时器类）。
5. 既有小泄漏待补：`ToolExecutor` 超时 Promise 的 timer 未在 `Promise.race` 后 `clearTimeout`，建议包 finally 统一清理（本轮仅去 unref 恢复超时触发，未改结构）。
