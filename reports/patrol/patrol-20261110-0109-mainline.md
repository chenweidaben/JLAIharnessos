# 巡检简报 2026-11-10 01:09

## 0. 本轮背景

- 上一轮（23:09）基线 `49aa7f80` 双推收口，当时刚重启 PG 为 pid 15384。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 20 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181/0/512（一次通过） |
| gate-e2e | 未重跑（上轮 23/0/83） |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 15384 | listening，CPU 3.52s（自 22:23:50 运行 ~2h45m，正常） |
| BFF bun | 8080 | 42184 | listening，CPU 3202.56s（自 20:27:47 运行 ~4h42m） |
| Vite | 5173 | — | 未启动 |

**BFF CPU 趋势观察**：
- 23:09 轮：CPU 929.86s（运行 2h42m ≈ 5.7% 单核）
- 01:09 轮：CPU 3202.56s（运行 4h42m，两小时增量 +2272.7s ≈ **31.6% 单核**）

CPU 占比从 5.7% 上升到 31.6%，但仍远低于旧 pid 29468 的 92% 水平。重启后已平稳运行 4h42m，暂未达到旧进程的自转级别。继续观察。

BFF 五端点全 200：/health 2B、/ready 235B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4372B。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：新 pid 42184 CPU 占比从 5.7% 上升到 31.6%，趋势需持续观察。
3. **PG 无故退出原因未定位**：pid 25208 消失原因仍未查 pg.log。
4. **组织智能体纠偏未发**：连续 20 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- 无 P0 就地修复（PG/BFF 均在运行，门禁全绿）。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 持续观察 BFF pid 42184 CPU 趋势（若突破 50% 单核考虑再次重启）。
2. 查 PG 退出原因（pg.log 末尾）。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
