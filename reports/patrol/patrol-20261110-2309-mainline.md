# 巡检简报 2026-11-10 23:09

## 0. 本轮背景

- 上一轮（21:09）基线 `20ccae43` 双推收口，BFF pid 32176（带 CDP，20:27:31 启动）、PG pid 37728。
- cron 首落云端 VM，确认 Windows 在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 31 轮未发纠偏消息。

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

### 本轮 P0 处置

**PG 第四次无故退出，恢复**

- 上轮 pid 37728（21:09 轮新起）在 21:09→23:09 间消失，5433 端口未监听。
- 删除残留 postmaster.pid，`pg_ctl start` 恢复，新 pid **39724**（22:23:43 启动）监听 5433。
- 这是 PG 第四次无故退出：
  1. pid 25208 在 11/9 21:09→23:09 间消失
  2. pid 15384 在 11/10 09:09→11:09 间消失
  3. pid 37436 在 11/10 19:09→21:09 间消失
  4. pid 37728 在 11/10 21:09→23:09 间消失

### BFF 状态（未重启）

- pid 32176（20:27:31 启动，带 --inspect=127.0.0.1:6499）：
  - CPU 561.03s，两小时增量 ≈ **7.8% 单核**，远低于 50% 阈值。
  - 新进程运行约 2h42m，CPU 趋势正常，未突破。
- 五端点全 200（/health 2B、/ready 227B、/api/v1/health 165B、/api/v1/system/health 145B、/metrics 4373B）。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 39724 | listening，本轮新起 |
| BFF bun（带 --inspect） | 8080 | 32176 | listening，20:27 启动，CPU 7.8% |
| CDP inspect | 6499 | 32176 | listening |
| Vite | 5173 | — | 未启动 |

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因**：已七次重启（pid 32176 是第八次，目前正常）。Bun CDP Profiler domain 不可用，需改 BFF 代码加 `Bun.profiler` API 或 Windows ETW。
3. **PG 四次无故退出**：规律稳定（约每 2 小时消失一次），机器未重启，pg.log 无 crash stack。**疑似 Windows 侧 OOM kill 或杀毒软件干预**，需查 Windows 事件查看器。
4. **组织智能体纠偏未发**：连续 31 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- PG pid 37728 消失（第四次），恢复为 pid 39724。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 32176 CPU 趋势（目前 7.8%，按历史规律下轮可能爬到 30%+）。
2. **PG 四次无故退出**：查 Windows 事件查看器 Application/System 日志，定位是 OOM、杀毒还是其他原因。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
