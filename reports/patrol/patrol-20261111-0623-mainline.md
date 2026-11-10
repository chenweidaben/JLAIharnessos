# 巡检简报 2026-11-11 06:23

## 0. 本轮背景

- 上一轮（04:23 提前轮）基线 `851e3360`。BFF pid 45728（02:25:45 新启，带 CDP）CPU 20.7%/2h；PG pid 39724 连续存活超 6h。
- cron 于 06:23 触发。cron 首落云端 VM，切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 35 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181/0/512 |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

### P0 处置：BFF pid 45728 CPU 自转突破阈值

- **旧 BFF pid 45728**（02:25:45 启动，带 --inspect=6499）：CPU **5778.31s**，从 04:23 的 1480.34s 增量 +4297.97s，运行 3h58m，两小时增量 ≈ **59.7% 单核**，突破 50% 阈值。
  - CPU 轨迹：10.97s（03:09 初始）→ 1480.34s（04:23，20.7%）→ 5778.31s（06:23，59.7%）。
  - 这是第十次进程触发 P0。
- 处置：
  1. 先测旧 BFF 五端点全 200（/health 2B、/ready 235B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B）。
  2. `Stop-Process -Id 45728 -Force` 强杀。
  3. 重启新 BFF：`Start-Process bun.exe -ArgumentList '--inspect=127.0.0.1:6499','run','src/bff/server.ts'`，日志 `logs\bff-1111b-out.log` / `bff-1111b-err.log`。
  4. 新 BFF pid **49368**（06:23:46 启动），初始 CPU 10.50s，五端点全 200（/health 2B、/ready 232B、/api/v1/health 163B、/api/v1/system/health 145B、/metrics 4373B）。

### PG 连续存活

- **PG pid 39724**（22:23:43 启动）：CPU **10.05s**（从 04:23 的 8.27s 增量 +1.78s，2h 正常），5433 listening。已连续存活超 8h，打破此前连续四轮每两小时无故退出的规律。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 39724 | listening，22:23 启动，CPU 10.05s |
| BFF bun（带 --inspect） | 8080 | 49368 | listening，06:23 启动，CPU 10.50s |
| CDP inspect | 6499 | 49368 | listening |
| Vite | 5173 | — | 未启动 |

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因**：pid 49368 是第十一次进程，CPU 轨迹按历史规律爬升。Bun CDP Profiler 不可用。
3. **PG 四次无故退出**：pid 39724 已连续存活超 8h，规律暂断。
4. **组织智能体纠偏未发**：连续 35 轮。

## 5. 仓库卫生

- `git status --porcelain`：与上轮持平，无真实代码改动。

## 6. 本轮处理项与 commit

- P0：BFF pid 45728 CPU 59.7%/2h，强杀重启为 pid 49368。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. **BFF pid 49368 CPU 趋势**：按历史规律，下轮（~08:23）应爬到 ~18%。
2. **PG pid 39724 存活**：已连续存活超 8h，继续观察。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
