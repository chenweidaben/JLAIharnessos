# 巡检简报 2026-11-10 21:09

## 0. 本轮背景

- 上一轮（19:09）基线 `78723219` 双推收口，BFF pid 37520（带 CDP）CPU 19.3%。
- cron 首落云端 VM，确认 Windows 在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 30 轮未发纠偏消息。

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

**(A) BFF CPU 自转第七次复发，强杀重启**

- pid 37520（16:24:34 启动，带 --inspect=127.0.0.1:6499）：
  - 19:09 时 CPU 1403.84s（19.3%）
  - 21:09 时 CPU **5425.89s**，两小时增量 +4022s ≈ **55.9% 单核**，突破 50% 阈值
- **CDP profile 抓取尝试失败**：连上 `ws://127.0.0.1:6499/0b4v34nf37xs` 后，`Profiler.enable` 返回 `-32601: 'Profiler' domain was not found`。**Bun 1.2.0 的 CDP 实现不支持 Profiler domain**，只能调试断点，不能运行时抓 CPU profile。这是环境限制，不是探针未活。
- 强杀 pid 37520（Stop-Process -Force），重启为新 pid **32176**（21:xx 启动，带 --inspect=127.0.0.1:6499），新 ws URL `ws://127.0.0.1:6499/65czkz6s25b`。
- 这是**第七次** BFF 自转复发（pid 29468→42184→40000→40500→48236→37520→32176）。

**(B) PG 第三次无故退出，恢复**

- 上轮 pid 37436（10:23:55 启动，CPU 13.16s）在 19:09→21:09 两小时间隔内消失，5433 端口未监听。
- pg.log 末尾无 crash stack。
- 删除残留 postmaster.pid，`pg_ctl start` 恢复，新 pid **37728** 监听 5433。
- 这是 PG 第三次无故退出（前两次：pid 25208 在 11/9 21:09→23:09 间消失；pid 15384 在 11/10 09:09→11:09 间消失）。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 37728 | listening，本轮新起 |
| BFF bun（带 --inspect） | 8080 | 32176 | listening，本轮新起 |
| CDP inspect | 6499 | 32176 | listening |
| Vite | 5173 | — | 未启动 |

BFF 五端点全 200（/health 2B、/ready 225B、/api/v1/health 163B、/api/v1/system/health 145B、/metrics 4163B）。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因**：已七次重启。CDP Profiler domain 不可用，运行时抓 profile 走不通。下一步可考虑：
   - 改 BFF 代码在内存里定期采样 `process.cpuUsage()` 或 `Bun.profiler` API；
   - 或用 Windows Performance Recorder / ETW 抓 bun.exe 系统级 profile。
3. **PG 三次无故退出**：pid 25208、15384、37436 均在两小时间隔内消失，机器未重启，pg.log 无 crash stack。需查 Windows 事件查看器 / 内存 / OOM。
4. **组织智能体纠偏未发**：连续 30 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- 强杀 BFF pid 37520（CPU 55.9%），重启为 pid 32176。
- PG pid 37436 消失，恢复为 pid 37728。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 观察 BFF pid 32176 CPU 趋势（起步应 ~0%）。
2. **Bun CDP Profiler 不可用**：评估是否改 BFF 代码加 `Bun.profiler` API 或 Windows ETW。
3. PG 三次无故退出原因（Windows 事件查看器）。
4. Vite 死锁 `--debug` 定位。
5. 组织智能体纠偏消息补发。
