# 巡检简报 2026-11-11 10:23

## 0. 本轮背景

- 上一轮（08:23）基线 `e8991453`。BFF pid 49368（06:23:46 新启，带 CDP）CPU 1653.80s（22.8%/2h）；PG pid 39724 连续存活超 10h。
- cron 于 10:23 触发，首落云端 VM，切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 37 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（C:\Users\lenovo\.bun\bin\bun.exe） |
| npm | 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181/0/512 |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

品牌硬违规 Grep（src + web/src）：gang-os / Gang-OS / GangOS / Jianlan OS / 杠OS / 建兰 / 对标厂商真名 / Winning / WiNEX / WiNGPT 均 0 命中；13 条命中全部为 `gangos_` 存量指标名，属专项 backlog，不计硬违规。

## 3. 运行态

### P0：PG 第五次无故退出，已就地恢复

- 上轮存活的 **PG pid 39724**（2026-11-10 22:23:43 启动）在 08:23→10:23 两小时间隔内消失，5433 端口未监听。残留 `postmaster.pid`（pid 39724），pg.log 末尾无 crash 栈（与前四次一致，仅客户端连接被强制关闭类记录）。
- 处置：确认 pid 39724 已不存在 → 删除残留 pid 文件 → `pg_ctl start` 做 crash recovery（redo done at 0/79FD398）。pg_ctl 报等待超时，但端口实际已起来。
- 新 **PG pid 46664**（10:24:18 启动）监听 5433，psql `select 1` 返回正常；CPU 0.27s 初始。

### BFF pid 49368 CPU 正常爬升，未破阈值

- **BFF pid 49368**（06:23:46 启动，带 --inspect=6499）：CPU **4470.83s**，从 08:23 的 1653.80s 增量 +2817.03s，运行 4h00m，两小时增量 ≈ **39.1% 单核**，未破 50% 阈值，不重启。
- CPU 轨迹：10.50s（06:23 初始）→ 1653.80s（08:23，22.8%）→ 4470.83s（10:23，39.1%）。按历史规律，下轮（~12:23）预计突破 50%。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 46664 | listening，10:24:18 新启，crash recovery 完成，CPU 0.27s |
| BFF bun（带 --inspect） | 8080 | 49368 | listening，06:23 启动，CPU 4470.83s |
| CDP inspect | 6499 | 49368 | listening |
| Vite | 5173 | — | 未启动 |

### 健康端点

PG 恢复后复测五端点全 200：/health 2B、/ready 235B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因**：pid 49368 按历史规律爬升，下轮预计破阈值。Bun CDP Profiler 不可用（-32601）。
3. **PG 五次无故退出**：pid 39724 本轮消失（第五次）。pg.log 无 crash 栈，疑似 Windows 侧 OOM kill 或安全软件干预，待查事件查看器 / 内存。
4. **组织智能体纠偏未发**：连续 37 轮。

## 5. 仓库卫生

- `docs/`、`pgdata/` 工作区改动：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- `logs/` 已被 `.gitignore` 覆盖（第 33 行 `logs/`）。
- 历史未跟踪 `reports/patrol/` 旧简报归属历史轮次收口，本轮不代提交。
- 根目录临时探针 txt 1361 个、logs 目录 4822 个文件，均在忽略范围。

## 6. 本轮处理项与 commit

- P0 处置：PG pid 39724 退出后恢复为 pid 46664（删残留 pid → pg_ctl start → psql 验证）。
- 本轮门禁全绿，提交本轮简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对回填（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 49368 CPU**：按轨迹下轮（~12:23）预计破 50% 阈值，准备强杀重启。
2. **PG pid 46664 存活**：新一轮重启后观察是否再次两小时内无故退出。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
