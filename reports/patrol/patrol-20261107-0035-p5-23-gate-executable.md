# P5-23: 门禁可执行化

**日期**: 2026-11-07
**基线**: `4fd03ea9` → 本次提交

---

## 1. 两个脚本能力边界

### `scripts/gate-unit.ps1`
- 硬编码 13 文件清单（与 `scripts/gate-unit.mts` 一致）
- 默认断言 **181 pass / 0 fail / 512 expect**
- 日志落 `logs/gate-unit-<timestamp>.log`
- 用 `cmd /c ... > log 2>&1` 合并 stderr（避免 PowerShell NativeCommandError）
- 只解析汇总行 `N pass / N fail / N expect() calls`
- `-Baseline "P/F/E"` 可覆盖，默认不放宽

### `scripts/gate-e2e.ps1`
- 设 env：`PORT=8081`、`AUDIT_DB_SCHEMA=audit_e2e`、`WORM_BACKEND=memory`、`AUDIT_BACKFILL_LIMIT=3000`
- `DATABASE_URL` 从 `.env` 读，只打印长度（不回显）
- 断言 **23 pass / 0 fail / 83 expect**
- 跑完检查 8081 无残留监听（`Get-NetTCPConnection -LocalPort 8081`）
- 日志落 `logs/gate-e2e-<timestamp>.log`

---

## 2. 自证原文

### gate-unit.ps1
```
# 1. 正常
=== gate-unit: 13 files ===
actual:  181 / 0 / 512
expected: 181 / 0 / 512
PASS
EXIT=0

# 2. 错基线 180/0/512
baseline: 180 / 0 / 512
actual:  181 / 0 / 512
expected: 180 / 0 / 512
FAIL: diff pass=1 fail=0 expect=0
EXIT=1

# 3. 改回
PASS
EXIT=0
```

### gate-e2e.ps1
```
# 1. 正常
actual:  23 / 0 / 83
expected: 23 / 0 / 83
port 8081: clean (no listener)
PASS
EXIT=0

# 2. 错基线 23/0/84
actual:  23 / 0 / 83
expected: 23 / 0 / 84
FAIL: diff pass=0 fail=0 expect=-1
EXIT=1
```

---

## 3. 为什么不能在 bun 里 spawn bun

P5-22 期间踩过：`scripts/gate-unit.mts` 用 `Bun.spawnSync(['bun', 'test', ...])` 从 bun 进程内 spawn bun 子进程，子进程继承父 bun 的全局状态（环境变量、模块缓存），导致 **41 个假 fail**。

PowerShell 直跑同样的 12 文件 = 152/0/449 全绿。这是门禁脚本自己造出来的假红，比没有门禁更危险。

**结论**：门禁脚本只做"定义清单 + 打印命令"，或用外部 shell（`cmd /c` / `powershell -File`）执行，**不许从 bun 内 spawn bun**。

---

## 4. 只解析汇总行

测试输出正文里有 `failed`、`failure`、`flaky`、`sweep upload failed` 等含数字的行。用正则 `(\d+) fail` 会误捕（P5-22 期间 `wormLayeredStore` 的 "3 fail" 就是把日志里的 "sweep upload failed" 的数字误算）。

**规则**：只读 `N pass / N fail / N expect() calls` 这三行汇总。

---

## 5. 风险段：WORM_BACKEND=memory

代码（`src/bff/aggregators/wormStore.ts:263-270`）：
```
[worm] unsafe combo: 审计事件已持久化到 PG，但 WORM 段仅在内存。
重启后 lastArchivedSeq 归零，会把已归档事件重复归档并覆盖旧段。
请设置 WORM_BACKEND=fs。
```

E2E 当前用 `WORM_BACKEND=memory` + `AUDIT_STORE=pg`，正是这个"unsafe combo"。在非 production 环境只 `console.error` 不阻断，但代价是：

- **重启后 WORM 段丢失**：`lastArchivedSeq` 归零，已归档的事件会被重复 seal
- **跨段链断裂**：内存里的段 hash 链不持久，重启后新段的 `prevSegmentHash = GENESIS`，旧段无法被新段链接
- **E2E 每次 beforeAll 重建 schema**，所以这个问题在 E2E 里被隔离了，但**任何 dev/prod 重启都会触发**

这是 `WORM_BACKEND` 默认值决策（当前默认 `memory`）的实际代价。生产环境必须显式设 `WORM_BACKEND=fs`。

---

## 6. AUDIT_BACKFILL_LIMIT 上限策略（挂起）

现库 `audit.events` 持续增长（已 2877+），默认 `AUDIT_BACKFILL_LIMIT=1000` → 每次启动 `sealDisabled=true`。

| 方向 | 做法 | 代价 | 风险 |
|---|---|---|---|
| A. 调大 limit | 默认改 10000+ | 启动慢，内存涨 | 大库 OOM |
| B. 归档截断 | seal 后删除已归档事件 | 需清理任务 | 删除前必须验证 WORM 段可恢复；事务原子性；合规保留期 |
| C. 冷热分离 | 旧事件归档冷存储 | 架构复杂 | 查询跨层 |

**推荐 B**，但需：dry-run 模式、删除前逐条验证 WORM 段可解密、事务内操作、默认不开启（需显式 env）。**交用户拍板，不执行。**

---

## 7. 启动路径

8080/8081 启动一律用 `src/bff/server.ts`，不用 `src/bff/index.ts`（re-export 壳）。

---

## 8. 父进程生命周期

P5-23 期间发现：用 stdin 重定向起的 BFF 子进程在父 PowerShell 退出后会被杀（"缺 stdin 句柄"假设被推翻）。实际原因是**启动会话/作业对象回收时连带终止后代**。

E2E 的 `startBff` 用 `spawn(bunBin, ['run', 'src/bff/server.ts'], { stdio: ['ignore', 'pipe', 'pipe'] })`，子进程在测试结束后由 `stopBff` 显式 kill。门禁脚本不常驻 BFF，只跑 `bun test`，所以不受此问题影响。
