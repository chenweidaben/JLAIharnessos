# 巡检简报 2026-11-11 12:23

## 0. 本轮背景

- 上一轮（10:23）基线 `ee568441`。PG 新启 pid 46664（10:24:18）；BFF pid 49368（06:23:46，带 CDP）CPU 4470.83s（39.1%/2h）。
- cron 于 12:23 触发，先落云端 VM，复核环境后切回本机 `client:582478:1083434981454011`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished / idle-resumable standby），85% completing，version 829。
- 摘要：P5-27 双口径闭合验证完成；P5-31 survey 与八节验收简报完成；docs/technical/04 当前 HEAD 7 类厂商名命中 0；40 词集全仓重扫进行中；wormLayeredStore 8/3 回归待排查；构建产物与 reports/slices 口径差异待在简报第 8 节明确。
- 本轮无 error、无卡死、无连续两轮 0 实质产出，不唤醒；三条已证伪旧说法纠偏消息仍未发（历史遗留）。

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

### PG pid 46664 存活

- 上轮新启的 **PG pid 46664**（10:24:18）本轮仍存活，5433 listening，CPU 2.05s，已存活约 2h00m，无再次退出。

### BFF pid 49368 CPU 正常爬升，未破阈值

- **BFF pid 49368**（06:23:46 启动，带 --inspect=6499）：CPU **7047.28s**，从 10:23 的 4470.83s 增量 +2576.45s，运行 6h00m，两小时增量 ≈ **35.8% 单核**，未破 50% 阈值，不重启。
- CPU 轨迹：10.50s（06:23 初始）→ 1653.80s（08:23，22.8%）→ 4470.83s（10:23，39.1%）→ 7047.28s（12:23，35.8%）。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 46664 | listening，10:24:18 启动，CPU 2.05s |
| BFF bun（带 --inspect） | 8080 | 49368 | listening，06:23 启动，CPU 7047.28s |
| CDP inspect | 6499 | 49368 | listening |
| Vite | 5173 | — | 未启动，积极拒绝连接 |

### 健康端点

五端点全 200：/health 2B、/ready 235B、/api/v1/health 164B、/api/v1/system/health 145B、/metrics 4373B。前端 5173 拒绝连接。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动，5173 积极拒绝。
2. **BFF CPU 自转根因**：pid 49368 两小时增量 35.8%，按历史规律后续轮次仍可能破阈值。Bun CDP Profiler 不可用（-32601）。
3. **PG 五次无故退出根因未定位**：本轮 pid 46664 存活，继续观察；前五次退出 pg.log 均无 crash 栈，疑似 Windows 侧 OOM kill 或安全软件干预。
4. **组织智能体纠偏未发**：历史遗留。

## 5. 仓库卫生

- `docs/` 修改 99 项、`pgdata/` 修改 6 项：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- 未跟踪 `reports/patrol/` 旧简报 40 项，归属历史轮次收口，本轮不代提交。
- 无其他未跟踪源码；`logs/` 已被 `.gitignore` 覆盖。
- 根目录临时探针 txt 1361 个、logs 目录 4827 个文件，均在忽略范围。

## 6. 本轮处理项与 commit

- 本轮门禁全绿，无 P0 就地修复项；提交本轮简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 49368 CPU**：继续盯两小时增量，破 50% 阈值即强杀重启。
2. **PG pid 46664 存活**：观察是否再次无故退出。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
