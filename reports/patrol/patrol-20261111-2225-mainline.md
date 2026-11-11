# 巡检简报 2026-11-11 22:25

## 0. 本轮背景

- 上一轮（20:25）基线 `8d1c8452`，双仓一致。
- cron 于 22:25 先落云端 VM，复核环境后切回本机 `client:582478:1083434981454011`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished / idle-resumable standby），85% completing，version 829，摘要与上轮一致，无新切片产出。
- 本轮无 error、无卡死，不唤醒。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（C:\Users\lenovo\.bun\bin\bun.exe） |
| npm | 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181 / 0 / 512 |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

### P0 处理：PG 第六次无故退出，已重启

- 22:25 盘点时 5433 端口 closed，无 postgres 进程。
- 旧 pid 46664（10:24:18 启动，存活约 12h）在 20:25→22:25 两小时间隔内自行消失，pg.log 末尾仍停在 10:24:55 "数据库系统准备接受连接"，无 crash 栈、无退出记录。
- postmaster.pid 残留（pid 46664），删除后 `pg_ctl start` 做 crash recovery，pg_ctl -w 30s 超时（recovery 慢），但实际进程已起来：新 pid **51088**，22:24:02 启动，5433 listening。
- psql 连接 jlmedaios 正常（`select 1` 返回 1 行）。
- 这是第六次 PG 无故退出（旧 pid 25208、15384、37436、37728、39724、46664），根因仍未定位，疑似 Windows 侧 OOM kill 或杀毒干预。

### BFF pid 15396 CPU 爬升但未破阈值

- 18:23:58 启动，本轮 22:25 盘点：CPU 4079.89s。
- 两小时增量 = 4079.89 - 1415.72 = 2664.17s ≈ **37.0% 单核**（2h=7200s）。
- 较上轮 19.5% 明显爬升，但仍低于 50% 强杀阈值，不重启。
- 8080/6499 listening，CDP ws `ws://127.0.0.1:6499/d6hxgq5zi2i` 保持。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 51088 | listening，22:24:02 启动（本轮重启） |
| BFF bun（带 --inspect） | 8080 | 15396 | listening，18:23:58 启动，CPU 4079.89s（+37%/2h） |
| CDP inspect | 6499 | 15396 | listening |
| Vite | 5173 | — | 未启动，端口关闭 |

### 健康端点

五端点全 200：/health 2B、/ready 251B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B。
（注：PG 挂掉期间 BFF 五端点仍全 200，说明 BFF 不依赖 PG 做 ready 检查，或有连接池容错。）

## 4. P0 未决项

1. **PG 第六次无故退出根因**：本轮已重启 pid 51088，需继续观察存活时间。
2. **BFF CPU 爬升趋势**：pid 15396 两小时增量 37%，较上轮 19.5% 明显爬升，接近历史轨迹（历史通常 2h 内 +30~40%）。下轮若突破 50% 则强杀重启。
3. **BFF 进程自行消失根因（18:25 轮发现）**：pid 49368 在 16:25→18:25 间自行消失，已重启 pid 15396。
4. **Vite dev server 死锁**：本轮未启动，5173 端口关闭。
5. **组织智能体纠偏未发**：历史遗留。

## 5. 仓库卫生

- `docs/` 修改 99 项、`pgdata/` 修改 6 项：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- 未跟踪 `reports/patrol/` 旧简报 40 项，归属历史轮次收口，本轮不代提交。
- 无其他未跟踪源码；`logs/` 已被 `.gitignore` 覆盖。

## 6. 本轮处理项与 commit

- P0：PG 第六次退出，已删 postmaster.pid 残留并 `pg_ctl start` 重启至 pid 51088。
- 无代码改动；门禁全绿，仅落盘本轮简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 15396 CPU**：本轮 37%/2h，下轮若突破 50% 强杀重启。
2. **PG pid 51088 存活**：观察是否再次无故退出（第七次？）。
3. Vite 死锁 `--debug` 定位；组织智能体纠偏消息补发。
