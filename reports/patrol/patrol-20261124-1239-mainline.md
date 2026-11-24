# 巡检简报 2026-11-24 12:39 轮（每小时滚动 · 遗留用例收口）

## 概要
定时巡检唤醒后继续收口 `consult-agent-m86` 分支遗留项：修复上轮遗留的 2 个前端失败用例并单文件复跑取真实结果；复跑后端 `bun test` 全量取证；将历史误跟踪的本地 PostgreSQL 运行时数据目录 `pgdata/` 取消跟踪并补忽略规则；改动拆分两个提交推送至 GitHub mirror 与 GitCode，三远端 SHA 逐字核对一致。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / npm（前端 web 目录）
- 前端门禁位于 `web/`（vitest + tsc）；后端 BFF/TS 位于仓库根（bun test + tsc）
- DB：本地 postgres 常驻 `127.0.0.1:5433/jlmedaios`（trust 无密码）

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| 前端 `pharmacyComponents.test.tsx` 单文件 vitest | 9/9 通过，Test Files 1 passed（Duration 47.17s） |
| 前端 `transfusion-page.test.tsx` 单文件 vitest | 12/12 通过，0 失败（Duration 109.41s） |
| 后端 `bun test tests/unit` 全量 | **未取得整体退出码**：被两处既有 hang 阻塞，进程无法自然退出；hang 前观测 14775 pass / 12 fail / 2003 文件头（未编造通过结论） |
| 后端分片 `tests/unit/consult-agent` | 210 tests / 23 files，206 pass / 8 fail，**退出码 1**（6.19s 落定） |
| 后端分片 security/orchestrator/coordinator/medical-tools/resilience/cds/emergency | hang 前 773 pass / 0 fail，未取得退出码（resilience/bulkhead 处 hang） |

### 前端 2 个遗留用例研判与处置（本轮已修复）
| 用例 | 现象 | 定性 | 处置 |
|---|---|---|---|
| `components/pharmacyComponents.test.tsx` DispenseModal override 放行 | 旧测试假设 dispense 成功即自动关闭；组件经 M190/M197 双人核对流程扩展后，发药成功先进入完成态（按钮转为「完成」），需二次点击才 `onClose` | 测试未跟进双人核对完成态流程，非功能回归 | **本轮已修复**：dispense/payload 断言通过后，等待完成态「完成」按钮 enabled 并点击触发 `onClose`；单文件 9/9 通过 |
| `pages/transfusion-page.test.tsx` 新建申请提交 | 上轮 30000ms 边界超时；本轮复跑 17.58s 通过（上次 35.06s 触顶） | jsdom 慢环境边界 flaky，非断言/代码缺陷 | **本轮已处置**：该新建申请表单用例 timeout 30000→45000 留余量，其余用例保持 30000，未改交互逻辑；单文件 12/12 通过 |

### 后端既有 hang 定位（阻塞全量退出码，待专项）
两处 hang 均无网络连接、CPU 自旋、bun per-test `--timeout` 无法中断；单文件可稳定复现：
1. `tests/unit/core/DeepSeekProvider.test.ts` 重试段：5xx 重试用例（`5xx 应触发重试，第二次成功`），首次 500 退避后第二次流式消费悬挂。
2. `tests/unit/resilience/bulkhead.test.ts`：信号量超时/排队用例（`获取超时抛受控错误` / `queue 策略：满时排队不拒绝`），并发原语在 Bun 1.2.0 下排队唤醒/超时未触发。

### 后端既有失败用例（历史遗留漂移，本轮未改后端源码）
| 归属文件 | 失败数 | 根因 |
|---|---|---|
| `tests/unit/forensicExport.test.ts` | 6 | `seed()` 后 `replay()` 读回 total=0，事件存储 seed/读取链路不一致（内存/DB 归属漂移） |
| `tests/unit/inpatientDepositSettle.test.ts` | 1 | 路由表自检：6 条路由 auth:true 与前缀断言不符 |
| `tests/unit/pharmacyDispenseTrade.test.ts` | 1 | 路由表自检：8 条路由 auth:true 与前缀断言不符 |
| `tests/unit/consult-agent/ddlSchema.test.ts` | 4 | 仓储/类型引用 `threads.current_role` 等列，DDL 建表语句缺列，schema 双向对齐漂移 |
| `tests/unit/consult-agent/typesSchema.test.ts` | 4 | 同上类型族 ↔ DDL 对齐漂移（分片独立跑暴露，全量并行 hang 前未覆盖） |

> 上述后端 fail/hang 均为 HEAD 基线既有问题，本轮仅改动 2 个前端测试文件，未引入新的后端回归。

## 本轮提交（2 个，拆分提交）
| SHA | 类型 | 说明 |
|---|---|---|
| `ca2ec988` | fix(test) | 适配双人核对完成态二次关闭；放宽输血新建申请 jsdom 超时（2 files, +6/-1） |
| `97432bf8` | chore(backend) | 取消跟踪本地 PostgreSQL 运行时数据目录 `pgdata/`（2220 个 PG 内部文件撤出索引，本地数据保留）并补 `.gitignore` 规则 |

## 双仓镜像核对（推送后 ls-remote 逐字比对）
- 本地 HEAD：`97432bf8e8fa4454eb51db6bb7711e7328d946af`
- origin（GitCode JLMEDAIOS, https）：`97432bf8e8fa4454eb51db6bb7711e7328d946af` ✅
- gitcode（GitCode JLMEDAIOS, ssh）：`97432bf8e8fa4454eb51db6bb7711e7328d946af` ✅
- mirror（GitHub JLAIharnessos, ssh.github.com）：`97432bf8e8fa4454eb51db6bb7711e7328d946af` ✅
- 领先/落后 origin：`0 0`，三远端与本地完全一致。
- 凭据实测可用：GitCode https（oauth2）推送 hooks PASSED；GitCode ssh、GitHub ssh 均连通（ssh 仅 post-quantum 密钥交换算法告警，不影响连通）。
- `heagentos` remote（HEAGENTOS.git）仅含 `main` 分支，未承载 `consult-agent-m86`，不在本次同步范围。

## 工作区遗留（本轮未提交，归类留存）
- `docs/` 99 项 modified：`core.autocrlf=true`、`.gitattributes` 声明 `* text=auto eol=lf`，索引已是 LF；经核对为纯 CRLF→LF 换行漂移，无实质内容 diff，`git add` 时自动归一，未专门提交。
- `reports/patrol/` 52 项 untracked：p0–p4 切片、two-hour、round 等历史未跟踪范式，不符合 mainline / p5 豁免命名，保持未跟踪。
- `pgdata/` 本地数据文件完整保留（`PG_VERSION` 等仍在磁盘），仅退出 Git 跟踪并被 `.gitignore` 忽略。

## 待办（后续轮次）
1. 专项排查后端两处 hang：DeepSeekProvider 重试流式消费、ConcurrencyLimiter/Bulkhead 信号量超时与排队唤醒（结合 Bun 1.2.0 兼容行为），解除后复跑全量 `bun test` 取完整退出码。
2. 对齐 consult-agent 仓储/类型与 DDL 列清单（`threads.current_role` 等缺列）；复核 forensicExport seed/replay 存储链路与两条路由自检的 auth/前缀期望。
3. 后端全量门禁恢复后，回归全量 web vitest 复核前端用例。
