# 巡检简报 2026-11-24 10:57 轮（每小时滚动 · 恢复同步）

## 概要
定时巡检唤醒后恢复本地仓库 `consult-agent-m86` 开发与双仓镜像同步。本地此前领先远端 59 个提交未推送；本轮完成门禁实测、工作区改动归类拆分提交，并将本地提交全部推送至 GitHub mirror 与 GitCode，三远端 SHA 逐字核对一致。

## 工具链版本（本轮实测）
- Node v22.23.2 / Bun 1.2.0 / npm 10.9.8
- 前端门禁位于 `web/`（vitest + tsc）；后端 BFF/TS 位于仓库根（bun test + tsc）

## 代码健康门禁（本轮实测，真实退出码）
| 门禁 | 结果 |
|---|---|
| web tsc (`npx tsc --noEmit`) | exit 0 |
| 根 tsc (`node_modules/.bin/tsc.cmd --noEmit`) | exit 0 |
| web vitest (`npx vitest run`) | **未全绿**：Test Files 3 failed / 168 passed (171)；Tests 3 failed / 1394 passed (1397)；Duration 592.47s |
| 后端 bun test | 500+ 用例、含 DB 集成用例；本轮前台超时未取得完整退出码，已观测到的前段用例均 pass（未编造通过结论），待 DB 就绪后复跑 |

### 前端 3 个失败用例研判
| 用例 | 现象 | 定性 | 处置 |
|---|---|---|---|
| `services/websocket.test.ts` M7-E 重连补拉 | 断言路径为完整 `/api/v1/outbox/events`，源码已改相对路径 `/outbox/events`（request 实例 baseURL 已带 `/api/v1`） | 测试断言滞后于源码相对路径设计，非功能回归 | **本轮已修复**，单文件复跑 4/4 通过 |
| `components/pharmacyComponents.test.tsx` DispenseModal override 放行提交 | 确定性复现：填写 override 后点击确认，`dispense` 未被调用 | 组件经 M190/M197 双人核对流程扩展后，旧测试提交路径未跟进；HEAD 基线既有，本轮 `web/src` 无改动，非新回归 | 遗留，待专项适配测试 |
| `pages/transfusion-page.test.tsx` 新建申请提交 | 30000ms 边界超时（3 个 antd Select + 多项输入，jsdom 环境偏慢） | 交互步骤多 + 环境慢导致的边界超时；HEAD 基线既有 | 遗留，待放宽 timeout / 优化 Select 交互 |

## 本轮提交（3 个）
| SHA | 类型 | 说明 |
|---|---|---|
| `87412417` | fix(test) | 同步 WebSocket 重连补拉断言为相对路径 |
| `c20578e9` | chore(emr) | 移除旧 CKEditor 4 loader 占位脚本（完整 4.22.1 内核已落库） |
| `5a899cc7` | docs(patrol) | 归档 P5-31 验收、P5-20 E2E 审计隔离两份简报 |

## 双仓镜像核对（推送后 ls-remote 逐字比对）
- 本地 HEAD：`5a899cc754db0221e0114adfd15a710bca647cc3`
- origin（GitCode JLMEDAIOS, https）：`5a899cc754db0221e0114adfd15a710bca647cc3` ✅
- mirror（GitHub JLAIharnessos, ssh.github.com）：`5a899cc754db0221e0114adfd15a710bca647cc3` ✅
- gitcode（GitCode JLMEDAIOS, ssh）：`5a899cc754db0221e0114adfd15a710bca647cc3` ✅
- 领先/落后 origin：`0 0`，三远端与本地完全一致。
- ssh 凭据实测可用（GitHub mirror、GitCode ssh 均 fetch/push 成功；GitCode 仅 post-quantum 密钥交换算法告警，不影响连通）。
- `heagentos` remote（HEAGENTOS.git）仅含 `main` 分支，未承载 `consult-agent-m86`，不在本次同步范围。

## 工作区遗留（本轮未提交，归类留存）
- `pgdata/` 8 项（PG 运行时数据：`pg_control`、WAL、`pg_internal.init`、`postmaster.opts`、base 目录）：历史被误 git 跟踪，**严禁提交**；建议后续 `git rm --cached pgdata/` 取消跟踪并补 `.gitignore` 规则（不删除本地数据文件）。
- `docs/` 105 项 modified：经 `--ignore-cr-at-eol` 核对为纯 CRLF→LF 换行符漂移，无实质内容 diff，未纳入提交。
- `reports/patrol/` 51 项 untracked：p0–p4 切片、two-hour、round 等历史未跟踪范式，不符合 mainline / p5 豁免命名，保持未跟踪。

## 待办（后续轮次）
1. 适配 pharmacyComponents 双人核对流程下的发药提交测试；评估 transfusion 用例 timeout 与 Select 交互优化。
2. DB 就绪后复跑后端全量 `bun test`，取回完整退出码与用例统计。
3. 评估 pgdata 取消跟踪与 `.gitignore` 补规则；docs 换行符按需 renormalize。
