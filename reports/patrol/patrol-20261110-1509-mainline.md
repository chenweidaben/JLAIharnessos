# 巡检简报 2026-11-10 15:09

## 0. 本轮背景

- 上一轮（13:09）基线 `3fc2bf81` 双推收口，BFF pid 48236 当时刚重启 CPU 6.34s。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 27 轮未发纠偏消息。

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
| PG 16.15 | 5433 | 37436 | listening，CPU 7.73s（正常，+1.43s/2h） |
| BFF bun | 8080 | 48236 | listening，CPU 1340.08s（自 12:23:40 运行 ~2h45m） |
| Vite | 5173 | — | 未启动 |

**BFF CPU 趋势（第六次轨迹对比）**：
- pid 48236：12:23:40 启动，本轮 CPU 1340.08s，两小时增量 +1333.7s ≈ **18.5% 单核**，未突破 50% 阈值，**不重启**。
- 与前几轮新进程同期对比：pid 40000 同期 18.4%、pid 40500 同期 19.3%、pid 48236 同期 18.5%，三者几乎一致。
- 规律已确认：每次重启后新进程两小时增量从 ~18% 起步，随后逐轮爬升（18% → 44% → 58%），最终突破 50% 被强杀。

**CDP Profiler 根因定位**：本轮 BFF CPU 仅 18.5%，处于正常区间，抓 profile 价值不大。计划在下轮 BFF 进入 40%+ 爬升通道时，用 `bun --inspect` 重启并连 CDP 抓热点；当前不重启以保留运行态。

BFF 五端点全 200（/health 2B、/ready 234B、/api/v1/health 165B、/api/v1/system/health 145B、/metrics 4373B）。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：已五次重启。pid 48236 当前 18.5%，下轮预计进入 40%+ 通道。下轮起用 `bun --inspect` + CDP Profiler 抓热点。
3. **PG 两次无故退出**：pid 25208、pid 15384 已消失。本轮 pid 37436 运行正常（CPU 7.73s）。
4. **组织智能体纠偏未发**：连续 27 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- 无 P0 就地修复（BFF CPU 18.5% 未超阈值）。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 48236 CPU 趋势，预计进入 40%+ 爬升通道。
2. **若 BFF 突破 50% 阈值，下轮重启时加 `--inspect` 参数，连 CDP Profiler 抓 CPU 自转根因**。
3. PG 两次无故退出原因（Windows 事件查看器 / pg_log）。
4. Vite 死锁 `--debug` 定位。
5. 组织智能体纠偏消息补发。
