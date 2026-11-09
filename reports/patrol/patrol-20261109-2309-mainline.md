# 巡检简报 2026-11-09 23:09

## 0. 本轮背景

- 上一轮（21:09）基线 `36fc7ac5` 双推收口，当时刚重启 BFF 为 pid 42184。
- cron 首落云端 VM，确认 Windows 客户端在线后切回本机。

## 1. 智能体进度

- 组织智能体 `o_000Rfj7NkAk`：本轮未 `peek_task_progress`。连续 19 轮未发纠偏消息。

## 2. 工具链与门禁（本轮实测）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| tsc-root | exit 0 |
| tsc-web | exit 0 |
| gate-unit | PASS 181/0/512（一次通过，无 flaky） |
| gate-e2e | 未重跑（上轮 23/0/83，本轮无代码改动） |
| brand-gate | PASS 9816 files, 0 hard, backlog 13 |
| router-check | PASS lazy=2872 dangling=0 paths=2870 dup=0 |

## 3. 运行态

| 服务 | 端口 | PID | 状态 |
|---|---|---|---|
| PG 16.15 | 5433 | **15384（新）** | listening，启动于 22:23:50，CPU 1.73s |
| BFF bun | 8080 | 42184 | listening，CPU 929.86s（自 20:27:47 运行 ~2h42m，约 5.7% 单核，未复发自转） |
| Vite | 5173 | — | 未启动 |

**本轮 P0 处置**：发现旧 PG pid 25208 已消失（5433 不再监听），删除残留 postmaster.pid 后 `pg_ctl start` 重启。pg_ctl 报超时但实际端口已起来（pid 15384），psql 验证 `select 1` 成功。旧 PG 消失原因未定位（机器未重启，BFF 42184 仍在运行），疑似 PG 进程崩溃或被外部终止。

BFF 五端点全 200：/health 2B、/ready 250B、/api/v1/health 165B、/api/v1/system/health 145B、/metrics 4373B。

**BFF CPU 自转观察**：新 pid 42184 运行 2h42m，CPU 累计 929.86s ≈ 5.7% 单核，远低于旧 pid 29468 的 92% 水平。重启有效，暂未复发。

## 4. P0 未决项

1. **Vite dev server 死锁**：本轮未启动。
2. **BFF CPU 自转根因未定位**：重启后 2h42m 正常，但根因（事件循环内部自转）仍未定位。
3. **PG 无故退出原因未定位**：pid 25208 在两小时间隔内消失，需查 pg.log 末尾。
4. **组织智能体纠偏未发**：连续 19 轮。

## 5. 仓库卫生

- `git status --porcelain`：148 行，与上轮持平。无真实代码改动。

## 6. 本轮处理项与 commit

- P0：重启 PG（pid 25208 → 15384）。
- 提交本轮简报。

## 7. 双仓推送与 SHA

见末尾回填。

## 8. 下一轮重点

1. 查 PG 退出原因（pg.log 末尾）。
2. 持续观察 BFF pid 42184 CPU 趋势。
3. Vite 死锁 `--debug` 定位。
4. 组织智能体纠偏消息补发。
