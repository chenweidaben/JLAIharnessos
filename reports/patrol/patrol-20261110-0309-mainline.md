# 巡检简报 2026-11-10 03:09

## 0. 本轮背景

- 上一轮（01:09）基线 `6c9e8de0` 双推收口。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 21 轮未发纠偏消息。

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
| PG 16.15 | 5433 | 15384 | listening，CPU 5.05s（自 22:23:50 运行 ~4h45m，正常） |
| BFF bun（旧） | 8080 | 42184 | **本轮强杀**（CPU 累计 7898.92s，运行 6h56m） |
| BFF bun（新） | 8080 | **40000** | listening，CPU 8.00s（自 02:23:45 启动） |
| Vite | 5173 | — | 未启动 |

**BFF CPU 趋势与本轮 P0 处置**：
- 01:09 轮：pid 42184 CPU 3202.56s（运行 4h42m ≈ 31.6% 单核）
- 03:09 轮：pid 42184 CPU 7898.92s（运行 6h56m，两小时增量 +4696.4s ≈ **65.2% 单核**）
- 按上轮承诺（突破 50% 单核考虑再次重启），强杀旧 pid 42184，重启为新 pid 40000。
- 新进程启动后五端点全 200，CPU 8s（正常）。

BFF 五端点全 200：/health 2B、/ready 232B、/api/v1/health 163B、/api/v1/system/health 145B、/metrics 4373B。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：pid 42184 运行 6h56m CPU 达 65% 单核后被强杀。新 pid 40000 重启。已两次重启（pid 29468→42184→40000），均在数小时内 CPU 持续爬升，根因（事件循环内部自转）未定位。
3. **PG 无故退出原因未定位**：pid 25208 消失原因仍未查 pg.log。
4. **组织智能体纠偏未发**：连续 21 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- **P0 就地处置**：强杀 BFF pid 42184（CPU 65% 单核），重启为 pid 40000，五端点全 200。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察新 BFF pid 40000 CPU 趋势（若再次爬升，需 `bun --inspect` + CDP Profiler 抓热点）。
2. 查 PG 退出原因（pg.log 末尾）。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
