# 巡检简报 2026-11-11 14:25

## 0. 本轮背景

- 上一轮（12:23）基线 `e80802e7`。PG pid 46664（10:24:18）；BFF pid 49368（06:23:46，带 CDP）。
- cron 于 14:25 先落云端 VM，复核环境后切回本机 `client:582478:1083434981454011`。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：peek status=2（finished / idle-resumable standby），85% completing，version 829，摘要与上轮一致，无新切片产出。
- 本轮无 error、无卡死、无连续两轮 0 实质产出，不唤醒；三条已证伪旧说法纠偏消息仍未发（历史遗留）。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node | v22.23.2 |
| bun | 1.2.0（C:\Users\lenovo\.bun\bin\bun.exe） |
| npm | 10.9.8 |
| tsc-root | exit 0（修复后复跑 0） |
| tsc-web | exit 0 |
| gate-unit | PASS 181 / 0 / 512（修复后复跑） |
| gate-e2e | 未重跑 |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

品牌硬违规 Grep（src + web/src）：gang-os / Gang-OS / GangOS / Jianlan OS / 杠OS / 建兰 / 对标厂商真名 / Winning / WiNEX / WiNGPT 均 0 命中；13 条命中全部为 `gangos_` 存量指标名，属专项 backlog，不计硬违规。

### 本轮 P0：wormStore `attrib` 同步子进程偶发挂起

- 现象：全量 gate-unit 首跑 180/1/511，失败用例 `P5-12 mtime 边界补测 > 同精度窗口连续 put 2 段`；第二次全量复跑仍 180/1/511，失败用例变为 `目录删除后重建，新段 seq 从 1 开始`。
- 定位：两次挂起点同一处 `src/bff/aggregators/wormStore.ts:178`，win32 `execSync('attrib +R ...')` 无超时，并发/磁盘压力下被拖住，测试 5000ms 超时被 kill（dangling process）。单文件隔离重跑 `wormArchive.test.ts` 57 pass / 0 fail，确认是全量并发下的子进程挂起竞态，非产品逻辑回归。
- 修复：给 `execSync` 加 `timeout: 1500` 与 `killSignal: SIGKILL`，超时/失败仍走既有 catch 忽略；只读属性本就是 best-effort，不改落盘语义、不改既有挂载。
- 复核：根 tsc exit 0；全量 gate-unit 复跑回到 181 / 0 / 512 PASS。

## 3. 运行态

### PG pid 46664 存活

- PG pid 46664（10:24:18）本轮仍存活，5433 listening，CPU 3.92s，已存活约 4h01m，无再次退出。

### BFF pid 49368 CPU 爬升，未破阈值

- BFF pid 49368（06:23:46 启动，带 --inspect=6499）：CPU **9968.03s**，从 12:23 的 7047.28s 增量 +2920.75s，运行 8h01m，两小时增量 ≈ **39.9% 单核**，未破 50% 阈值，不重启。
- CPU 轨迹：10.50s（06:23 初始）→ 1653.80s（08:23，22.8%）→ 4470.83s（10:23，39.1%）→ 7047.28s（12:23，35.8%）→ 9968.03s（14:25，39.9%）。

### 当前进程

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | 46664 | listening，10:24:18 启动，CPU 3.92s |
| BFF bun（带 --inspect） | 8080 | 49368 | listening，06:23 启动，CPU 9968.03s |
| CDP inspect | 6499 | 49368 | listening |
| Vite | 5173 | — | 未启动，积极拒绝连接 |

### 健康端点

五端点全 200：/health 2B、/ready 235B、/api/v1/health 166B、/api/v1/system/health 145B、/metrics 4373B。前端 5173 拒绝连接。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动，5173 积极拒绝。
2. **BFF CPU 自转根因**：pid 49368 两小时增量 39.9%，按历史规律后续轮次仍可能破阈值。Bun CDP Profiler 不可用（-32601）。
3. **PG 五次无故退出根因未定位**：本轮 pid 46664 存活约 4h，继续观察；前五次退出 pg.log 均无 crash 栈，疑似 Windows 侧 OOM kill 或安全软件干预。
4. **组织智能体纠偏未发**：历史遗留。

## 5. 仓库卫生

- `docs/` 修改 99 项、`pgdata/` 修改 6 项：另一路 consult 任务产物与 PG 运行时数据，按边界本主线不代提交、不删除。
- 未跟踪 `reports/patrol/` 旧简报 40 项，归属历史轮次收口，本轮不代提交。
- 无其他未跟踪源码；`logs/` 已被 `.gitignore` 覆盖。
- 根目录临时探针 txt 1361 个、logs 目录 4834 个文件，均在忽略范围。

## 6. 本轮处理项与 commit

1. fix(bff)：wormStore win32 `attrib` 子进程加 1.5s 超时兜底，消除全量并发下测试挂起超时。
2. docs(patrol)：本轮巡检简报。

## 7. 双仓推送与 SHA

见本轮 commit 后 `git ls-remote` 核对（不推 origin / heagentos，不打 tag）。

## 8. 下一轮重点

1. **BFF pid 49368 CPU**：继续盯两小时增量，破 50% 阈值即强杀重启。
2. **PG pid 46664 存活**：观察是否再次无故退出。
3. 复跑全量单测确认 attrib 超时兜底稳定，不再出现 1 fail。
4. Vite 死锁 `--debug` 定位；组织智能体纠偏消息补发。
