# P5-24: 门禁聚合 + 环境自检

**日期**: 2026-11-07
**基线**: `b4e37db5` → 本次提交

---

## 1. 33500 / 8080 状态

```
bun PID 33500, StartTime=2026/11/7 2:27:28
8080 LISTENING pid=33500 cmd="C:\...\bun.exe" src/bff/server.ts
8081 free
```

入口是 `src/bff/server.ts`（正确，非 `index.ts` 壳）。五端点全 200：`/health` `/ready` `/api/v1/health` `/api/v1/system/health` `/metrics`。

---

## 2. 新脚本

### `scripts/gate-all.ps1`
顺序跑四道，日志落 `logs/gate-all-<ts>-<step>.log`：
1. 根 tsc（`node node_modules/typescript/bin/tsc --noEmit`）
2. web tsc（`cd web; bun x tsc --noEmit`）
3. `gate-unit.ps1`（透传 `-UnitBaseline`）
4. `gate-e2e.ps1`（透传 `-E2eBaseline`）

最后打印汇总表，任一失败 exit 1（不短路，四道都跑完）。

### `scripts/env-doctor.ps1`（只读，不杀进程）
- node / bun / npm 版本
- bun 绝对路径解析（PATH → 回落 `%USERPROFILE%\.bun\bin\bun.exe`）
- 8080/8081/5173/5174 持有 PID + CommandLine（`Win32_Process`）
- 入口是 `index.ts` → WARN
- `.env` 存在 + `DATABASE_URL` 长度（不回显）
- 8080 五端点状态码

bun 解析不到或 `.env` 缺失 → exit 1。

---

## 3. 自证原文

### gate-all.ps1

**正常跑**：
```
Step      Status Seconds
tsc-root  PASS        28
tsc-web   PASS        57
gate-unit PASS        11
gate-e2e  PASS        11
OVERALL: PASS
EXIT=0
```

**错基线 `-UnitBaseline 180/0/512`**：
```
Step      Status Seconds
tsc-root  PASS        29
tsc-web   PASS        59
gate-unit FAIL        12    <- 只有这一项红
gate-e2e  PASS        13
OVERALL: FAIL (1 steps failed)
EXIT=1
```

**改回**：
```
OVERALL: PASS
EXIT=0
```

### env-doctor.ps1
```
node: v22.23.2
bun (fallback): C:\Users\lenovo\.bun\bin\bun.exe
bun version: 1.2.0
.env: exists, DATABASE_URL len=44
8080: LISTENING pid=33500 cmd=...src/bff/server.ts
8081: free
/health : 200 ... /metrics : 200
EXIT=0
```

---

## 4. 为什么不能在 bun 里 spawn bun

P5-22 踩过：`Bun.spawnSync(['bun','test',...])` 从 bun 进程内 spawn bun，子进程继承父 bun 全局状态 → 41 个假 fail。门禁只做"定义清单"或用外部 shell，**不许从 bun 内 spawn bun**。

## 5. 只解析汇总行

正文日志里 `failed`/`failure`/`flaky` 含数字，正则必误捕。只读 `N pass / N fail / N expect() calls`。

---

## 6. 风险段：WORM_BACKEND=memory

代码（`wormStore.ts:263-270`）：
```
[worm] unsafe combo: 审计事件已持久化到 PG，但 WORM 段仅在内存。
重启后 lastArchivedSeq 归零，会把已归档事件重复归档并覆盖旧段。
```

E2E 用 `WORM_BACKEND=memory` + `AUDIT_STORE=pg` 正是 unsafe combo。非 production 只 console.error 不阻断，但重启后段丢失、跨段链断裂。这是 `WORM_BACKEND` 默认值（当前 `memory`）的实际代价。

`AUDIT_BACKFILL_LIMIT` A/B/C 三案挂起：主线启动时显式传 10000 是**临时口径不是方案**。
