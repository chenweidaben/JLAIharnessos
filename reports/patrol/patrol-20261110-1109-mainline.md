# 巡检简报 2026-11-10 11:09

## 0. 本轮背景

- 上一轮（09:09）基线 `64bc28d5` 双推收口，BFF pid 40500 当时 CPU 1398.12s。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 25 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181/0/512（一次通过） |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | **37436**（本轮新起） | listening，psql `select 1` 通过 |
| BFF bun | 8080 | 40500 | listening，CPU 4555.94s（自 06:23:52 启动 ~4h45m） |
| Vite | 5173 | — | 未启动 |

**本轮 P0 处置**：PG pid 15384 消失（5433 不再监听）。postmaster.pid 残留 pid 15384（实际进程已死）。删除残留后 `pg_ctl start` 重启，pg_ctl 报超时但端口实际已起来（新 pid **37436**），psql `select 1` 验证成功。这是继 23:09 轮 pid 25208 消失后第二次 PG 无故退出，原因仍未定位（pg.log 末尾只有 client connection forcibly closed，无 crash stack）。

**BFF CPU 趋势（四次重启轨迹对比）**：
- pid 29468：10:33 启动 → 21:09 强杀，CPU 23118s ≈ 92% 单核
- pid 42184：20:27:47 启动 → 03:09 强杀，CPU 7898.92s，运行 6h56m ≈ 65% 单核
- pid 40000：02:23:45 启动 → 07:09 强杀，CPU 5409.42s，运行 4h45m ≈ 56.6% 单核
- pid 40500：06:23:52 启动，本轮（11:09，4h45m）CPU 4555.94s，两小时增量 +3157.8s ≈ **43.9% 单核**，未突破 50% 阈值，**不重启**。比 pid 40000 同期 56.6% 略低，但仍在单调爬升通道上。

BFF 五端点全 200：/health 2B、/ready 251B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：已四次重启。pid 40500 当前 4h45m 43.9% 单核，预计下轮（13:09）两小时增量可能突破 50%，需重启。若连续五次复发，需 `bun --inspect` + CDP Profiler 抓根因。
3. **PG 两次无故退出**：pid 25208（21:09→23:09 间消失）、pid 15384（09:09→11:09 间消失）。pg.log 末尾无 crash stack，只有客户端断连。需深入查 Windows 事件查看器 / 内存 / OOM。
4. **组织智能体纠偏未发**：连续 25 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- P0 PG 重启（pid 15384 → 37436），已恢复。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 40500 CPU 趋势（预计 13:09 轮两小时增量突破 50%，需重启；若连续五次复发需 profile 抓根因）。
2. 查 PG 两次无故退出原因（Windows 事件查看器 / pg_log 更早位置）。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
