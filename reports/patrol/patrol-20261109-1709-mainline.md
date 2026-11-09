# 巡检简报 2026-11-09 17:09

## 0. 本轮背景

- 上一轮（15:09）基线 `ba6ca227` 双推收口。本轮为两小时后常规巡检。
- cron 首落云端 VM，经 `manage_environment(list)` 确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`（门禁实测优先）。连续 16 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181 / 0 / 512 |
| gate-e2e | PASS 23 / 0 / 83（port 8081 clean） |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 25208 | listening，CPU 累计 4.81s |
| BFF bun | 8080 | 29468 | listening，**CPU 累计 10039.91s**（15:09 轮为 4662.75s，2h 内 +5377s ≈ 单核 75% 自转，持续加剧） |
| Vite | 5173 | — | 未启动（P0 死锁未修） |

BFF 五端点全 200：/health 2B、/ready 235B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未复现（未启动）。
2. **BFF 空闲 CPU 自转持续加剧**：pid 29468 自 10:33 启动以来累计 10040s CPU，运行 ~6.6h。CPU 增量轨迹：13:09 1049s → 15:09 4663s（+3614/2h）→ 17:09 10040s（+5377/2h），单调上升且加速。健康端点虽全 200，但事件循环已被内部自转严重挤占。下轮必须 `bun --inspect` + CDP Profiler 抓热点。
3. **组织智能体纠偏未发**：连续 16 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平，仍为 CRLF 规范化 + pgdata 运行时文件。无真实代码改动。

## 6. 本轮处理项与 commit

- 无 P0 代码修复（门禁全绿）。
- 仅提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. **BFF CPU 自转**：最高优先级，`bun --inspect 29468` 连 CDP Profiler 抓 30s 热点。若继续恶化，考虑重启 BFF。
2. Vite 死锁 `--debug` 定位。
3. 组织智能体纠偏消息补发。
