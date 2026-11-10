# 巡检简报 2026-11-10 19:09

## 0. 本轮背景

- 上一轮（17:09）基线 `4c71c660` 双推收口，BFF pid 37520 以 `--inspect=127.0.0.1:6499` 重启。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 29 轮未发纠偏消息。

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
| PG 16.15 | 5433 | 37436 | listening，CPU 11.23s（+1.93s/2h 正常） |
| BFF bun（带 --inspect） | 8080 | 37520 | listening，CPU 1403.84s（自 16:24:34 启动） |
| CDP inspect | 6499 | 37520 | listening，`/json/version` 返回 Bun/1.2.0 |
| Vite | 5173 | — | 未启动 |

**BFF CPU 轨迹（第七次进程，进行中）**：
- pid 37520（16:24:34 启动，带 --inspect）：
  - 17:09 时 CPU 11.62s（起步 ~0.3%）
  - 19:09 时 CPU 1403.84s，两小时增量 +1392s ≈ **19.3% 单核**
  - **未突破 50% 阈值，本轮不重启**。

**CDP 探针就绪验证**：
- `GET http://127.0.0.1:6499/json/version` 返回：
  ```json
  {"Protocol-Version":"1.3","Browser":"Bun","User-Agent":"Bun/1.2.0",
   "WebKit-Version":"9e3b60e4...","Bun-Version":"1.2.0",
   "Bun-Revision":"b0c5a7655dac9040655a22754c5eab91046e923b"}
  ```
- 探针已活。下轮（21:09）预计 BFF 进入 40%+ 通道，若再下轮（23:09）突破 50%，**先连 CDP 6499 抓 CPU profile** 再决定重启。

BFF 五端点全 200（/health 2B、/ready 234B、/api/v1/health 165B、/api/v1/system/health 145B、/metrics 4373B）。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因**：已六次重启。本轮 pid 37520 CDP 探针已验证活，按历史规律下下轮（23:09）预计突破 50%，届时抓 profile。
3. **PG 两次无故退出**：pid 25208、pid 15384 已消失。本轮 pid 37436 运行正常。
4. **组织智能体纠偏未发**：连续 29 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- 无 P0 修复（BFF 19.3% 在阈值内）。
- 验证 CDP `/json/version` 端点可用。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 37520 CPU 趋势，预计 21:09 进入 40%+ 通道。
2. **23:09 轮若突破 50%，不要急着杀**——先连 CDP 127.0.0.1:6499，`GET /json` 取 webSocketDebuggerUrl，发 `Profiler.enable` → `Profiler.start` → 采样 10s → `Profiler.stop` 导出热点函数栈，定位泄漏的 setInterval/setTimeout。
3. PG 两次无故退出原因（Windows 事件查看器）。
4. Vite 死锁 `--debug` 定位。
5. 组织智能体纠偏消息补发。
