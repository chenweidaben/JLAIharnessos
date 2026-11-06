# 健澜仓库两小时滚动巡检简报（2026-11-07 04:23 轮）

- 巡检时间：2026-11-07 04:23–04:5x（UTC+8，星期六）
- 仓库：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`，分支 `consult-agent-m86`
- 本轮起点：`2cd055a1`（组织侧 P5-24 三提交：`4f03d96b` 两脚本、`3ee4b024` 编码修复、`2cd055a1` 简报补充）
- 本轮收口：env-doctor 端口归属判定修复 + 本简报

## 一、智能体进度

| 项 | 实测 |
|---|---|
| 组织智能体 | `o_000Rfj7NkAk` |
| 状态 | finished / idle-resumable，version 717+ |
| 本轮产出 | P5-24：`scripts/gate-all.ps1`（92 行）、`scripts/env-doctor.ps1`（86 行）、简报 109+23 行 |
| 已落库 | `4f03d96b`、`3ee4b024`、`2cd055a1`（本轮我复核后双推） |

## 二、我上一轮改坏的东西，被它的验收代理抓到了

必须先记这一条：**`b5676bdd`（我 02:23 轮的 fix(scripts)）把 P5-23 原本能跑的脚本改成了完全不能跑。**

原因：我给两个脚本加了带中文全角括号 `（` `）` 的错误信息，而文件是 **UTF-8 无 BOM**。Windows PowerShell 5.1 用 GBK 解码这些字节，多字节序列被错误切分，**字符串的引号配对失效**，整个文件解析失败：

```
scripts/gate-unit.ps1:95 char:54
+   Write-Host "FAIL: diff pass=$dp fail=$df expect=$de"
+                                                      ~
The string is missing the terminator: ".
```

这恰好是我上一轮在简报里反复强调的编码问题——我提醒了别人，自己写脚本时没加 BOM。

组织侧的修复用了两条，缺一不可：
1. 文件存 **UTF-8 带 BOM**（`[IO.File]::WriteAllText(path, s, (New-Object Text.UTF8Encoding $true))`）
2. **字符串一律英文，中文只放注释**（注释被 GBK 误解不影响语法）

只靠 BOM 不够稳——编辑器、CI、某些写入路径都可能剥掉它；字符串英文是双保险。我本轮实测复核：四个脚本 BOM 全为 `EF BB BF`，非注释行中文 **0 行**。

## 三、门禁复核（全部我自己跑，且在 PowerShell 5.1 下跑）

| 项 | 结果 |
|---|---|
| node / bun / npm | v22.23.2 / 1.2.0 / 10.9.8 |
| 根 tsc | **exit 0 / 0 字节**（`logs/patrol-0423-tsc-root.log`） |
| web tsc（cwd=web） | **exit 0 / 0 字节**（`logs/patrol-0423-tsc-web.log`） |
| `gate-all.ps1` 默认 | **4/4 PASS，exit 0**：tsc-root 31s / tsc-web 59s / gate-unit 11s（181-0-512）/ gate-e2e 12s（23-0-83 + 8081 clean） |
| `gate-all.ps1 -UnitBaseline 180/0/512` | **exit 1**：只有 `gate-unit` 标 FAIL（`diff pass=1`），其余三项仍 PASS，四道全跑完 |

第二条是"聚合在逐项判定"的证据：如果四项一起红、或者干脆短路不跑后面的，就说明聚合没有在逐项判定。它没短路，`OVERALL: FAIL (1 steps failed)`，退出码 1，符合预期。

## 四、本轮 P0：env-doctor 声称会 WARN 的判定，代码里没有

P5-24 的切片定义和交付说明都写着：**"端口被非本仓进程占用 → 打 WARN 但 exit 0"**。实际代码（`scripts/env-doctor.ps1` 第 62 行）只有一句：

```powershell
if ($cmdLine -match 'src/bff/index\.ts') { $warn = '  [WARN: entry is index.ts shell, should be server.ts]' }
```

也就是**只判断"入口是不是壳文件"，根本没有归属判定**。而这台机器上 5173 正是被外部沙箱的 vite 占着（`sandbox_runtime\...\node.exe node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173`），它一声不响地打了 `LISTENING` 就过去了。

**一个声称会报警、实际不会报警的自检，比没有自检更危险**——它让人以为"没 WARN = 没问题"。

修复（保持只读、不动进程、WARN 不改退出码）：

```
入口是 index.ts            → WARN（原有）
命令行含 src/bff/server.ts → 本仓
命令行含仓库根绝对路径      → 本仓
其余                        → WARN: port held by non-repo process
```

复跑实测（PowerShell 5.1，`logs/patrol-0423-envdoctor2.txt`）：

```
8080  pid=33500 cmd="...bun.exe" src/bff/server.ts          ← 无 WARN
8081  free
5173  pid=41116 cmd=...sandbox_runtime\...\node.exe ...     ← [WARN: port held by non-repo process]
5174  pid=37772 cmd=node "...\new-chat-1\web\node_modules\vite\bin\vite.js"  ← 无 WARN
五个端点 200，exit 0
```

## 五、运行态：33500 活了 2 小时，但这还不足以定论

| 项 | 值 |
|---|---|
| 8080 持有者 | `bun.exe` pid **33500**，入口 `src/bff/server.ts` |
| 启动时间 | 2026-11-07 02:27:28（`WmiPrvSE 7500 → cmd 34148 → bun 33500`） |
| 已存活 | **约 2h05m**，`/ready` 报 `uptimeSec=7347` |
| 内存 | 370.8 MB |
| 五端点 | `/health` 200 / `/ready` 200 / `/api/v1/health` 200 / `/api/v1/system/health` 200 / `/metrics` 200 |
| `/ready` 正文 | `{"status":"ok","wormBackend":"memory","wormS3Client":"none","wormStoreDir":"(in-process memory; not persisted)","auditStore":"pg","sealDisabled":false,"sealDisabledReason":"","uptimeSec":7347}` |

**判定口径要说清**：它比上一轮 41448 的 1h43m 活得久，但这只说明"这一轮没死"，不说明"脱离会话就更耐久"。历史四次掉线分别发生在 18:36、20:26、22:28、01:xx–02:23 之后，间隔 2–4 小时。**要等到下一次跨过 4 小时（06:23 轮）才具备可比性**，现在下结论就是把观察当成了结论。

其余端口：3000 none、5173 pid 41116（外部沙箱 vite，非本仓）、5174 pid 37772（本仓 vite）、8081 none、8000 pid 12744（他项目）、9090 none。

## 六、品牌 / 路由 / 数据态

| 项 | 值 |
|---|---|
| 品牌扫描 | 9815 文件 / 24 词 / **13 命中 / 2 文件，全部 `gangos`**（`src/bff/observability/metrics.ts` 7 + `src/core/observability/metrics.ts` 6，专项 backlog）→ **硬违规 0** |
| lazy import | 2865 / resolved 2865 / package 0 / MISSING 0 |
| route path | 2870 / duplicates 0 |
| elements | 2769 / undefined 0 |
| `schema_migrations` | 349 |
| `audit.events` | **2877**（连续四轮持平） |
| `consult` 表数 / `to_regclass('consult.threads')` | 0 / null |

口径差异须记一笔：组织侧 `scripts/brand-scan.mts` 报 `files=9816 hits=0 backlogGangos=13`，我的扫描器报 `9815 / 13 hits / 2 files`。两边对 `gangos_` 的归类一致（都算 backlog 不算硬违规），但"命中数"字段定义不同（它把 backlog 从 hits 里剔了）。**同一个"0 违规"结论、两套数字，是下次一定会引错的地方**——下一批切片处理（见第十节）。

## 七、仓库卫生

- tracked 改动：本轮 `scripts/env-doctor.ps1`（已提交）
- untracked：39 项，全部在 `reports/patrol/`，属另一路 consult，不代提交、不删除
- 根目录探针 txt 1361 / log 762；`logs/` 累计 4287（本轮 +57，含 gate-all 的两轮跑测）
- `git stash list` 空

## 八、分组提交与双仓推送

| # | 提交 | 内容 |
|---|---|---|
| 1 | `fix(gate)` | env-doctor 补端口归属判定：入口 `index.ts` / 本仓 `server.ts` / 仓库根路径 / 其余 WARN，WARN 不改退出码 |
| 2 | `docs(patrol)` | 本简报 |

| 仓 | 结果 |
|---|---|
| gitcode `git push gitcode consult-agent-m86:master consult-agent-m86` | exit 0 |
| mirror `git push mirror consult-agent-m86:master consult-agent-m86` | exit 0 |

四 ref 逐位核对落 `logs/patrol-0423-refs.txt`。不推 origin / heagentos，未打 tag。

## 九、遗留风险与下一轮重点

1. **8080 持久化仍无定论**：33500 已 2h05m。06:23 轮若仍存活（>4h），才算比历史四次更耐久；若死，则 stdin、job、WmiPrvSE 三种挂载点全部排除，需转做终止来源取证（`TaskKill` 调用方、安全软件行为日志、Windows 应用事件日志），不再靠换启动方式猜。
2. **`WORM_BACKEND=memory` 的实证仍在**：`/ready` 明写 `wormStoreDir="(in-process memory; not persisted)"`，启动日志两条 `[worm]`（`BREAK the cross-segment chain` + `unsafe combo`）。默认值是否改 `fs` 待拍板。
3. **`AUDIT_BACKFILL_LIMIT`**：当前靠启动显式传 10000，属临时口径；A/B/C 策略待拍板（推荐 B，需 dry-run + 可恢复性验证 + 默认不开启）。
4. **品牌扫描双口径**（9815/13 vs 9816/0+13）：同一结论、两套数字，已列入下一批切片。
5. 五项配置决策仍挂起：`layered.put` 兜底 / `AUDIT_DB_SCHEMA` 优先级 / `/ready` 非生产 `degraded` / `WORM_BACKEND` 默认 `fs` / 演示环境明文口令。
6. `wormArchiveAggregator.ts:86` 的 `no-unsafe-argument` 抑制缺理由注释。

## 十、结论

- 双 tsc 0/0、gate-unit 181/0/512、gate-e2e 23/0/83、gate-all 4/4、品牌硬违规 0、路由零悬空——全部独立复跑通过；聚合门禁的"错基线必须红且只红一项"也已自证。
- 本轮修的 P0 是**"声称会报警、实际不报警"**：env-doctor 从"只认壳文件入口"补到"认得出非本仓占口者"，5173 现在会被点名。
- 必须留档的教训是**我上一轮自己踩的坑**：给 UTF-8 无 BOM 的 `.ps1` 塞中文全角括号，PowerShell 5.1 用 GBK 解码后引号配对失效、整个脚本报废。修复是 BOM + 字符串全英文两条一起上。
- 8080 已连续服务 2h05m，但**下结论要等到跨过 4 小时**。
