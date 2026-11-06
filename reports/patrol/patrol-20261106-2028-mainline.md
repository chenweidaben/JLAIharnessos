# 健澜仓库两小时滚动巡检简报（2026-11-06 20:28 轮）

- 巡检时间：2026-11-06 20:10–20:35（UTC+8，星期五）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 基线（起点）：`b1db6e1d`（组织侧本批 2 个未推送提交）
- 执行口径：组织侧自报门禁一律独立复跑；未推送提交先复核再收口

## 一、智能体进度

| 项 | 实测值 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk`（HIS-EMR一体化复刻与脱敏升级） |
| 状态 | status=2，finished，100% done |
| 版本 | 671，updated_at=1793963306 |
| 本批落地 | `f08e8b72`（E2E BASE 硬绑）/ `b1db6e1d`（收口简报），均**未推送** |
| 自报口径 | tsc 0、12 文件 152/0/449、E2E 23/0/82、brand 9816/0/13 |

上一轮下达的三项要求均已被执行：`DEMO_MODE=0` 真跑、E2E fail-open 注入自证、5 个语法债逐个定性。

## 二、工具链与编译门禁

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| 根 tsc | **exit 0 / 0 字节** |
| web tsc（cwd=web，`bun x tsc`） | **exit 0 / 0 字节** |

日志：`logs/patrol-1900-tsc-root.log`、`logs/patrol-1900-tsc-web.log`（均 0 字节）。

## 三、单测与 E2E（独立复跑）

**单测（11 文件显式列举，不跑目录）**

```
154 pass / 0 fail / 445 expect() calls
Ran 154 tests across 11 files. [11.75s]   UNIT_EXIT=0
```

与上一轮 154/0/445 逐位一致，无回归。组织侧自报为"12 文件 152/0/449"——集合不同（多 1 文件、多用例口径不同），**0 fail 一致**；两个数字不可互相替代，已在简报并列登记。

**E2E**

```
23 pass / 0 fail / 82 expect() calls
Ran 23 tests across 1 files. [6.70s]   E2E_EXIT=0
[P5-6-dump] store/info: {"segmentCount":2,"oldestSeq":1,"newestSeq":16}
[P5-6-dump] search: {"total":16,"scanned":2,"rowsLen":10}
```

`newestSeq=16` 而非生产库的 1824/1833 → 隔离实例（8081 + `audit_e2e`）真实生效；跑后 8081 无残留监听。

## 四、组织侧 `f08e8b72` 复核（未推送提交）

diff 仅 1 文件 9 增 2 删，`tests/integration/worm-e2e.test.ts`：

- `BASE` 由 `process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080'` 改为 `let BASE: string | null = null`
- 新增 `requireBase()`：未初始化直接 `throw new Error('baseUrl not initialized — startBff must succeed before any request')`
- `call()` 内 `fetch(BASE+path)` → `fetch(requireBase()+path)`
- `afterAll` 末尾 `BASE = null` 复位

判定：**方向正确、与主线上一轮建议一致**，模块级默认回落已消除。动态复核以本轮 E2E 真跑 23/0 + 隔离指纹成立为准（未复跑组织侧的注入实验，其日志已记录 exit 1 + 23 fail）。

## 五、品牌脱敏 / 路由

| 项 | 值 |
|---|---|
| filesScanned / termCount | 9815 / 24 词 |
| 命中 | 仅 `gangos`，13 处 / 2 文件（`src/bff/observability/metrics.ts` 7、`src/core/observability/metrics.ts` 6） |
| 硬违规 | **0** |
| 路由 lazy import | 2865 / resolved 2865 / package 0 / MISSING 0 |
| route path | 2870 / duplicates 0 |
| elements | 2769 / undefined 0 |

## 六、运行态

开工时 **8080 无监听**（上一轮 pid 45332 已消失），5 个健康端点全部连接被拒。排查结论：

- 进程日志 `logs/bff-8080.*.log` 无异常栈、无退出记录；Windows 应用事件日志近 90 分钟无 bun 相关条目
- E2E `stopBff` 按 `handle.pid` 精确 `taskkill /T /F`，不按镜像名杀进程；本轮 E2E 跑完后 8080 仍存活（LISTEN_PID=47344，uptime 61s），**证明不是测试收尾误杀**
- 因此判定为**非代码原因的外部进程终止**，确切触发点未取到证据，登记为待观察项（下轮开工先复核 8080 是否存活）

处置：按规范入口重启，`HTTP_PORT=8080`、`AUDIT_BACKFILL_LIMIT=10000`、`WORM_BACKEND=memory`、`DEMO_MODE=1`：

| 项 | 值 |
|---|---|
| 启动 PID / 监听 PID | 47344 / **47344**（一致） |
| `/ready` | 200，`status=ok`、`auditStore=pg`、`wormBackend=memory`、`sealDisabled=false` |
| 端点 | `/health` 200、`/api/v1/health` 200、`/api/v1/system/health` 200、`/metrics` 200 |
| 前端 | `5174/` 200、`5174/login` 200 |
| 端口 | 3000 none、5173 pid 41116（外部沙箱 vite，非本仓）、5174 pid 37772（本仓 vite）、8080 pid 47344、8081 none、8000 pid 12744（他项目）、9090 none |

**`sealDisabled` 与审计量**：库内 `audit.events=1833`；`AUDIT_BACKFILL_LIMIT` 默认值 1000（`auditEventAggregator.ts:236`），按 P5-16 fail-closed 设计，超限即 `sealDisabled=true` 且 seal 返 503，代码注释已明示"调大 limit 后重启"。本机按 10000 启动故为 `false`。组织侧观测到的 `sealDisabled=true` 是同库、默认 limit 启动所致，非缺陷；**生产需按事件量配置该参数**，属部署参数，本轮不擅改默认。

## 七、数据态复核（独立验证组织侧回滚）

| 项 | 值 |
|---|---|
| `public.schema_migrations` | 349（与回滚前一致，pending 仍为 380–385 六件） |
| `audit.events` | 1833 |
| `consult` schema 表数 | 0 |
| `to_regclass('consult.threads')` | null |

即组织侧 `DEMO_MODE=0` 真跑 + 回滚是干净的，6 张 consult 表已 DROP、版本记录已删。

## 八、提交与双仓推送

本轮主线**无新增代码改动**（两处代码改动均为组织侧已提交的 `f08e8b72`、`b1db6e1d`，经复核后随本轮一并收口）；本轮仅新增 1 个 docs 简报提交。

推送口径（不推 origin / heagentos，不打 tag）：

| 仓 | 命令 | 结果 |
|---|---|---|
| gitcode | `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror | `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 核对（`git ls-remote`，原始输出落 `logs/patrol-1900-refs.txt`）：本地 HEAD 与 gitcode/mirror 的 `refs/heads/master`、`refs/heads/consult-agent-m86` 逐位一致，值见该日志。

## 九、仓库卫生

- tracked 修改：0
- untracked：39 项，全部为另一路 consult 任务巡检简报，按纪律不代提交、不删除
- 根目录 2123 个 `.txt`/`.log` 探针均被 `.gitignore` 覆盖（`*.log` 等），不入库

## 十、遗留风险与下一轮重点

1. **8080 掉线原因未定**：日志与事件记录均无痕迹，本轮仅做恢复。下一轮开工先探 8080；若连续两轮再掉，改为「启动即写 pid 文件 + 看门狗」方案定位。
2. **`AUDIT_BACKFILL_LIMIT` 与事件量的生产配置**：库内已 1833，任何默认值启动都会 sealDisabled，需在部署清单里显式配置（待用户拍板上限策略）。
3. 组织侧与主线的单测集合口径不统一（12 文件 152/0/449 vs 11 文件 154/0/445）：建议固定一份官方清单落 `tests/` 脚本，避免以后无法比对。
4. `seal` 响应 `sourceChainValid:false`（历史现象）仍未定性。
5. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释。
6. 五项配置决策仍待用户拍板（`layered.put` 兜底、`AUDIT_DB_SCHEMA` 优先级、`/ready` 非生产 `degraded`、`WORM_BACKEND` 默认 `fs`、演示环境明文口令取舍）。
7. 更早遗留：`docs/**` 历史商业分析文档厂商真名专项脱敏、`gangos_` 13 处前缀是否清理、PG 备份表 drop、2403 误纳入对象 rewrite、根目录历史探针清理、本地 master 清理。

## 十一、本轮结论

- 双 tsc 0/0、单测 154/0/445、E2E 23/0/82（隔离指纹 16≠1833）、品牌硬违规 0、路由 0 悬空 —— 五条门禁本轮全部实测通过。
- 组织侧两项落地（E2E fail-open 消除、`DEMO_MODE=0` 真跑 + 干净回滚）经独立复核成立，其 2 个未推送提交已随本轮双推收口。
- 8080 掉线已恢复（pid 47344，`sealDisabled=false`），根因未取到证据，如实登记为待观察。
