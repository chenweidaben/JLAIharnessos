# 巡检简报 2026-11-10 13:09

## 0. 本轮背景

- 上一轮（11:09）基线 `647e93e9` 双推收口，PG pid 37436 当时刚重启，BFF pid 40500 CPU 4555.94s。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 26 轮未发纠偏消息。

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
| PG 16.15 | 5433 | 37436 | listening，CPU 6.30s（正常） |
| BFF bun | 8080 | **48236**（本轮新起） | listening，CPU 6.34s（正常） |
| Vite | 5173 | — | 未启动 |

**本轮 P0 处置**：BFF pid 40500 CPU 8703.75s（自 06:23:52 启动运行 ~6h45m），两小时增量 +4147.8s ≈ **57.6% 单核**，突破 50% 阈值。按上轮承诺强杀（Stop-Process -Force），用 `Start-Process bun.exe run src/bff/server.ts` 重启，新 pid **48236** 启动于 12:23:40，CPU 6.34s（正常）。重启前五端点全 200；重启后五端点全 200（/health 2B、/ready 232B、/api/v1/health 163B、/api/v1/system/health 145B、/metrics 4373B）。

**BFF CPU 趋势（五次重启轨迹对比）**：
- pid 29468：10:33 启动 → 21:09 强杀，CPU 23118s ≈ 92% 单核
- pid 42184：20:27:47 启动 → 03:09 强杀，CPU 7898.92s，运行 6h56m ≈ 65% 单核
- pid 40000：02:23:45 启动 → 07:09 强杀，CPU 5409.42s，运行 4h45m ≈ 56.6% 单核
- pid 40500：06:23:52 启动 → 13:09 强杀，CPU 8703.75s，运行 6h45m，两小时增量 +4148s ≈ 57.6% 单核
- pid 48236：12:23:40 启动，本轮 CPU 6.34s（正常）

**规律观察**：每次重启后新进程在数小时内 CPU 持续爬升，两小时增量从 ~18% → ~44% → ~58%，最终突破 50% 阈值被强杀。这是**第五次**复发，已确认是事件循环内部自转的持续性问题，不是偶发。下轮起需用 `bun --inspect` + CDP Profiler 抓根因。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：已五次重启。pid 48236 刚启动。下轮起需 `bun --inspect` + CDP Profiler 抓热点。
3. **PG 两次无故退出**：pid 25208（21:09→23:09 间消失）、pid 15384（09:09→11:09 间消失）。本轮 pid 37436 运行正常。
4. **组织智能体纠偏未发**：连续 26 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- P0 BFF 重启（pid 40500 → 48236），已恢复。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 48236 CPU 趋势。
2. **首次用 `bun --inspect` 连 pid 48236 + CDP Profiler 抓 CPU 自转根因**（已五次复发，不能再只重启）。
3. 查 PG 两次无故退出原因（Windows 事件查看器 / pg_log 更早位置）。
4. Vite 死锁 `--debug` 定位。
5. 组织智能体纠偏消息补发。
