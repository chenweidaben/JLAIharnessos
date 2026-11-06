# 健澜仓库两小时滚动巡检简报（2026-11-07 02:23 轮）

- 巡检时间：2026-11-07 02:23–02:4x（UTC+8，星期六）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 本轮起点：`f27dc70d`（组织侧 P5-23 两提交：`93a523b8` 脚本、`f27dc70d` 简报）
- 本轮收口：脚本修复 + 本简报（双推后见第八节）

## 一、智能体进度

| 项 | 实测 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk` |
| 状态 | finished / idle-resumable 待唤醒，version 717 |
| 本轮产出 | P5-23：`scripts/gate-unit.ps1`、`scripts/gate-e2e.ps1` + 简报 `patrol-20261107-0035-p5-23-gate-executable.md` |
| 已落库 | `93a523b8`（2 文件 170 行）、`f27dc70d`（1 文件 129 行） |

组织侧本轮如实报告了两件事，都经我复核为真：8080 无监听、`Get-Process bun` 返回空。这不是"报错"，是**事实**——上一轮我认为健康的 pid 41448 也已消失。

## 二、工具链与编译门禁（独立复跑）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| 根 tsc | **exit 0 / 0 字节**（`logs/patrol-0223-tsc-root.log`） |
| web tsc（cwd=web） | **exit 0 / 0 字节**（`logs/patrol-0223-tsc-web.log`） |

## 三、把门禁脚本真正跑起来（本轮主要工作量）

组织侧交付的两个脚本，我第一次在这台机器上直接执行——**跑不起来**：

```
cmd /c "where bun"  →  INFO: Could not find files for the given pattern(s).
```

脚本里用的是 `cmd /c "bun test ... > log 2>&1"`。本机 `bun` 只存在于 `C:\Users\lenovo\.bun\bin\bun.exe`，**PATH 未注册**。也就是说：脚本在组织侧的环境能跑（它的 PATH 里有 bun），在这台机器上必然落到"解析不到汇总行 → actual -1"的分支。**一个只能在作者机器上跑的门禁，等于没有门禁。**

### 本轮修复（`scripts/gate-unit.ps1`、`scripts/gate-e2e.ps1`）

1. **解析 bun 绝对路径**：先 `Get-Command bun`，再回落 `%USERPROFILE%\.bun\bin\bun.exe`，两者都没有就 `exit 1` 并打印原因——fail-closed，不静默降级。
2. **不再经 cmd 中转**：改为 `& $bunExe test @files *> $logFile`，直接调用 exe、把全部流重定向进日志。绕开了 cmd 的引号与 PATH 依赖，仍然满足"禁止裸管道接 bun test"。
3. **移除内联 `JWT_SECRET`**：原脚本把 `local-dev-jwt-secret-...` 硬编码在仓库里。bun 会自动加载 `.env`，这个常量既不必要又扩大泄露面；删除后 E2E 仍 23/0/83，证明 `.env` 已提供所需配置。
4. **gate-e2e 补 fail-closed**：解析不到 `pass` 时明确报"用例可能根本没跑起来"，而不是带着 `actual=-1` 去和基线做减法。
5. `scripts/gate-unit.mts` 头部把 `536 expect` 改为 `512`（与 BASELINE 常量、与实测一致），并删掉重复了一行的一整句话——同一份清单里两个 expect 数字是最容易被下次引错的地方。

## 四、两道门禁实测 + 自证（我自己重做了一遍）

| 场景 | actual | expected | 输出 | exit |
|---|---|---|---|---|
| `gate-unit.ps1` 默认 | 181/0/512 | 181/0/512 | PASS | **0** |
| `gate-unit.ps1 -Baseline 180/0/512` | 181/0/512 | 180/0/512 | `FAIL: diff pass=1 fail=0 expect=0` | **1** |
| 改回默认 | 181/0/512 | 181/0/512 | PASS | **0** |
| `gate-e2e.ps1` 默认 | 23/0/83 | 23/0/83 | PASS + `port 8081: clean` + `DATABASE_URL len=44` | **0** |
| `gate-e2e.ps1 -Baseline 23/0/84` | 23/0/83 | 23/0/84 | `FAIL: diff pass=0 fail=0 expect=-1` | **1** |

这份自证是**只有门禁真生效才会出现**的证据：数字错一位就必须红，并且要指出错在哪一位。组织侧报的结论与我复跑一致，不是抄它的数。

**清单一致性（这条组织侧没强调，但是关键）**：`gate-unit.ps1` 与 `gate-unit.mts` 各 13 个文件，逐行比对**完全一致**（`Compare-Object` 无差异）。两边若不同，断言的是不同集合，数字永远对不上。

E2E 隔离指纹未变：跑后 8081 无残留监听，`DATABASE_URL` 只出现长度 44。

## 五、运行态：8080 从"无监听"恢复到"脱离会话启动"

开工实测：8080 无监听、`Get-Process bun` 为空、五个端点全部连接被拒。与组织侧报告一致。

本轮按上一轮定下的验证方案启动，**用 `Win32_Process.Create` 让父进程脱离当前会话**：

```
WMI ReturnValue=0  PID=34148            ← cmd.exe（WmiPrvSE 7500 的子进程）
  └─ bun PID=33500  "bun src/bff/server.ts"
```

| 端点 | 结果 |
|---|---|
| `/health` | 200 len=2 |
| `/ready` | 200 len=190 |
| `/api/v1/health` | 200 len=163 |
| `/api/v1/system/health` | 200 len=145 |
| `/metrics` | 200 len=4373 |

`/ready` 正文：`{"status":"ok","wormBackend":"memory","wormS3Client":"none","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","sealDisabled":false,"sealDisabledReason":"","uptimeSec":12}`

入口这次是 `src/bff/server.ts`（不再是 re-export 壳 `index.ts`）。启动时带 `HTTP_PORT=8080`、`AUDIT_BACKFILL_LIMIT=10000`（默认 1000 会让 2877 条历史的库直接 `sealDisabled=true`）。

**这是本轮唯一未定论的事**：父进程是 `WmiPrvSE.exe`（不属于本会话的 job），所以"作业对象回收连带终止后代"这个假设**这轮没能被证伪**——上一轮我是从会话内起进程，这轮换了挂载点。下一轮开工第一件事就是看 33500 还在不在：在，说明脱离会话确实更耐久；不在，说明终止原因既不是 stdin、也不是 job，需要换取证角度（例如监视 `TaskKill` 来源、安全软件行为日志）。

另记一条运行态事实：`.env` 里 `DEMO_MODE=1`，所以 BFF 启动日志明确写 `跳过 PostgreSQL 连接，使用内存演示数据`；但审计存储走的是独立的 `AUDIT_STORE=pg`，`/ready` 报 `auditStore=pg`、`sealDisabled=false`。也就是说：**业务数据是内存演示态，审计数据是真的进 PG**。这与库内 `audit.events=2877` 相符。

端口全景：3000 none、5173 pid 41116（外部沙箱 vite，非本仓）、5174 pid 37772（**本仓 vite**，200 len=910）、8080 pid 33500（本轮启动）、8081 none（E2E 跑后已清）、8000 pid 12744（他项目）、9090 none。

## 六、品牌 / 路由 / 数据态

| 项 | 值 |
|---|---|
| 品牌扫描 | 9815 文件 / 24 词 / **13 命中 / 2 文件，全部 `gangos`**（`metrics.ts` 7 + 6，专项 backlog）→ **硬违规 0** |
| lazy import | 2865 / resolved 2865 / package 0 / MISSING 0 |
| route path | 2870 / duplicates 0 |
| elements | 2769 / undefined 0 |
| `schema_migrations` | 349 |
| `audit.events` | **2877**（连续三轮持平，无新增写入） |
| `consult` 表数 / `to_regclass('consult.threads')` | 0 / null |

## 七、仓库卫生

- tracked 改动：本轮 3 个脚本（已提交，见第八节）
- untracked：42 项，全部在 `reports/patrol/`，属另一路 consult，不代提交、不删除
- 根目录探针 txt 1361 / log 762；`logs/` 累计 4230（本轮 +29）
- `git stash list` 为空

## 八、分组提交与双仓推送

| # | 提交 | 内容 |
|---|---|---|
| 1 | `fix(scripts)` | gate-unit/e2e 解析 bun 绝对路径、直接调用 exe 重定向、去内联 JWT_SECRET、e2e 补解析失败即红；gate-unit.mts 头部 expect 536→512 并删重复句 |
| 2 | `docs(patrol)` | 本简报 |

| 仓 | 结果 |
|---|---|
| gitcode `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 逐位核对落 `logs/patrol-0223-refs.txt`。不推 origin / heagentos，未打 tag。

## 九、遗留风险与下一轮重点

1. **8080 持久化**：本轮首次用 WmiPrvSE 挂载启动（pid 33500）。下一轮先验证存活；若仍死，说明 stdin 与 job 都不是原因，转做终止来源取证（不再靠猜测换方案）。
2. **`WORM_BACKEND=memory` 的代价这轮再次真实打印**：`logs/bff-8080-r5.err.log` 里 `[worm] backend=memory ... restart will re-archive already-sealed events and BREAK the cross-segment chain` 与 `[worm] unsafe combo` 两条同时出现。非生产只 `console.error` 不阻断，但 dev 每次重启都在破坏跨段链。默认值是否改 `fs` 仍待用户拍板。
3. **`AUDIT_BACKFILL_LIMIT` 上限策略**待拍板（A 调大 / B 归档后截断，需 dry-run + 可恢复性验证 / C 冷热分离）。当前靠启动时显式传 10000 绕过，**这不是方案，是临时口径**。
4. **门禁仍未"一条命令"**：现在是两个脚本，tsc 还是手工跑。下一批切片定为聚合器 + 环境自检（见第十节）。
5. 五项配置决策挂起：`layered.put` 兜底 / `AUDIT_DB_SCHEMA` 优先级 / `/ready` 非生产 `degraded` / `WORM_BACKEND` 默认 `fs` / 演示环境明文口令。
6. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释；`brand-scan` 未排除 `logs/` 的口径风险仍在（扫描路径含 `logs/` 会把巡检日志里的厂商词算成硬违规）。

## 十、结论

- 双 tsc 0/0、单测 181/0/512、E2E 23/0/83、品牌硬违规 0、路由 0 悬空 —— 全部独立复跑通过，且新增的两道门禁脚本本身也做了"错基线必须红"的自证。
- 本轮真正修掉的是**门禁的可执行性**：组织侧交付的脚本只能在它自己的 PATH 下跑，在这台机器上 `where bun` 都找不到。修完之后两个脚本才算"能被执行"，而在此之前它们只是"定义了清单"。
- 8080 从无监听恢复到五端点全 200，启动挂载点第一次脱离会话（WmiPrvSE）。**是否真的更耐久，下轮用存活与否回答，不用推理回答。**
