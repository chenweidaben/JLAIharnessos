# 巡检简报 2026-11-11 18:25

## 0. 本轮背景

- 上一轮（16:25）基线 `52690fd1`，双仓一致。
- cron 于 18:25 先落云端 VM，复核环境后切回本机 `client:582478:1083434981454011`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished / idle-resumable standby），85% completing，version 829，摘要与上轮一致，无新切片产出。
- 本轮无 error、无卡死，不唤醒；历史已证伪旧说法纠偏消息仍未发。

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

## 3. 运行态

### P0：BFF pid 49368 自行消失，已重启 pid 15396

- 16:25 巡检时 BFF pid 49368（06:23:46 启动）CPU 12810.42s ≈ 39.5%/2h；本轮 18:25 盘点时该进程已不存在，8080/6499 端口均关闭，无 bun 进程。
- 消失时间在两小时间隔内，非本巡检强杀（本巡检仅在破 50% 阈值时强杀，上轮 39.5% 未破阈值）。推测为 Windows 侧进程退出或资源回收，原因未定位（待查 Windows 事件查看器）。
- 已按模板重启：新 BFF pid **15396**，18:23:58 启动，带 `--inspect=127.0.0.1:6499`，CDP ws `ws://127.0.0.1:6499/d6hxgq5zi2i`，CPU 10.92s 初始值。

### PG pid 46664 存活约 8h

- PG pid 46664（10:24:18 启动）5433 listening，CPU 8.05s，已存活约 8h，未再次无故退出。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 46664 | listening，10:24:18 启动，CPU 8.05s |
| BFF bun（带 --inspect） | 8080 | 15396 | listening，18:23:58 启动，CPU 10.92s 初始 |
| CDP inspect | 6499 | 15396 | listening |
| Vite | 5173 | — | 未启动，端口关闭 |

### 健康端点

五端点全 200（新 BFF）：/health 2B、/ready 232B、/api/v1/health 163B、/api/v1/system/health 145B、/metrics 4372B。

## 4. P0 未决项

1. **BFF 进程自行消失根因**：pid 49368 在未破阈值情况下两小时内消失，需查 Windows 事件查看器/应用日志。
2. **Vite dev server 死锁**：本轮未启动，5173 端口关闭。
3. **BFF CPU 自转根因**：新 pid 15396 两小时增量观察中。Bun CDP Profiler 不可用（-32601）。
4. **PG 五次无故退出根因未定位**：本轮 pid 46664 存活约 8h，继续观察。
5. **组织智能体纠偏未发**：历史遗留。

## 5. 仓库卫生

- `docs/` 修改 99 项、`pgdata/` 修改 6 项：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- 未跟踪 `reports/patrol/` 旧简报 40 项，归属历史轮次收口，本轮不代提交。
- 无其他未跟踪源码；`logs/` 已被 `.gitignore` 覆盖。
- 根目录临时探针 txt 1361 个、logs 目录 4850 个文件，均在忽略范围。

## 6. 本轮处理项与 commit

- 本轮 P0：BFF 进程消失，已重启 pid 15396 并实测五端点全 200。
- 门禁全绿，无代码改动；仅落盘本轮简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 15396 CPU 两小时增量**：新进程初始 10.92s，下轮观察增量是否复现历史爬升规律。
2. **BFF 自行消失根因**：查 Windows 事件查看器应用日志，确认是否 OOM/杀毒干预。
3. **PG pid 46664 存活**：观察是否再次无故退出。
4. Vite 死锁 `--debug` 定位；组织智能体纠偏消息补发。
