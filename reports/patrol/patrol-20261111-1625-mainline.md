# 巡检简报 2026-11-11 16:25

## 0. 本轮背景

- 上一轮（14:25）基线 `c3c4a45a`，含 wormStore attrib 超时兜底修复。
- cron 于 16:25 先落云端 VM，复核环境后切回本机 `client:582478:1083434981454011`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished / idle-resumable standby），85% completing，version 829，摘要与上轮一致，无新切片产出。
- 本轮无 error、无卡死、无连续两轮 0 实质产出，不唤醒；历史已证伪旧说法（wormLayeredStore 8/3、web/dist 含真名、reports/slices backlog）纠偏消息仍未发。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（C:\Users\lenovo\.bun\bin\bun.exe） |
| npm | 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181 / 0 / 512 |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

品牌硬违规复核：brand-gate scope=src+web/src 实测 0 hard（code=0 doc=0），13 条 backlog 全部为 `gangos_` 指标名（metrics.ts 派生），不计硬违规。

### 上轮 P0 复核：wormStore attrib 超时兜底稳定

- 上轮给 win32 `attrib` execSync 加 1.5s timeout + SIGKILL 后，本轮全量 gate-unit 一次跑通 181/0/512，未再出现子进程挂起超时。兜底生效。

## 3. 运行态

### PG pid 46664 存活约 6h

- PG pid 46664（10:24:18 启动）5433 listening，CPU 6.00s，已存活约 6h，未再次无故退出。

### BFF pid 49368 CPU 两小时增量 39.5%，未破阈值

- BFF pid 49368（06:23:46 启动，带 --inspect=6499）：CPU **12810.42s**，从 14:25 的 9968.03s 增量 +2842.39s，运行 10h，两小时增量 ≈ **39.5% 单核**，未破 50% 阈值，不重启。
- CPU 轨迹：10.50s（06:23 初始）→ 4470.83s（10:23，39.1%）→ 7047.28s（12:23，35.8%）→ 9968.03s（14:25，39.9%）→ 12810.42s（16:25，39.5%）。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 46664 | listening，10:24:18 启动，CPU 6.00s |
| BFF bun（带 --inspect） | 8080 | 49368 | listening，06:23 启动，CPU 12810.42s |
| CDP inspect | 6499 | 49368 | listening |
| Vite | 5173 | — | 未启动，端口关闭 |

### 健康端点

五端点全 200：/health 2B、/ready 235B、/api/v1/health 164B、/api/v1/system/health 145B、/metrics 4372B。前端 5173 未启动。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动，5173 端口关闭。
2. **BFF CPU 自转根因**：pid 49368 两小时增量 39.5%，按历史规律后续轮次仍可能破阈值。Bun CDP Profiler 不可用（-32601）。
3. **PG 五次无故退出根因未定位**：本轮 pid 46664 存活约 6h，继续观察。
4. **组织智能体纠偏未发**：历史遗留。

## 5. 仓库卫生

- `docs/` 修改 99 项、`pgdata/` 修改 6 项：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- 未跟踪 `reports/patrol/` 旧简报 40 项，归属历史轮次收口，本轮不代提交。
- 无其他未跟踪源码；`logs/` 已被 `.gitignore` 覆盖。
- 根目录临时探针 txt 1361 个、logs 目录 4843 个文件，均在忽略范围。

## 6. 本轮处理项与 commit

- 本轮门禁全绿，无 P0 需代码修复；仅落盘本轮简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 49368 CPU**：继续盯两小时增量，破 50% 阈值即强杀重启。
2. **PG pid 46664 存活**：观察是否再次无故退出。
3. Vite 死锁 `--debug` 定位；组织智能体纠偏消息补发。
