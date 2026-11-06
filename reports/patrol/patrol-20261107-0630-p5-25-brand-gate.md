# P5-25: 品牌口径统一 + 入聚合门禁

**日期**: 2026-11-07
**基线**: `ab2994f1` → 本次提交

---

## 1. 字段定义（brand-gate.ps1 唯一权威口径）

```
filesScanned: <int>
hardViolations: [ { file, line, word }, ... ]
backlogGangos: { count: <int>, files: [ ... ] }
```

- **exit 1 当且仅当 `hardViolations.length > 0`**
- `backlogGangos` 只打印，**不影响 exit code**
- 词表 30 词从 `logs/brand-words-reversed.txt` 读（不硬编码——硬编码等于把违规词写进仓库）
- `gangos_` 前缀独立扫描进 `backlogGangos`，不进词表
- 默认扫 `src` + `web/src`，排除 `logs/`

---

## 2. 口径三数字

| 口径 | filesScanned | 说明 |
|---|---|---|
| 6 类后缀（权威） | **9811** | `.ts` 6439 + `.tsx` 3372 |
| 全量 | **9816** | 含 `.css` 5 |
| 主线扫描器 | 9815 | 需主线给出后缀清单才能对齐 |

> 权威口径 = `brand-gate.ps1` 的 6 类后缀 = **9811**；`brand-scan.mts` 报的 9816 是含 `.css/.json/.svg` 的全量口径（实际差 5 个 `.css`）；主线 9815 需由主线给出其后缀清单才能对齐。

---

## 3. 两个 bug 的定性（本批最有价值）

### bug 1：`-LiteralPath` + `-Include` 不生效

`-LiteralPath` 不接受 `-Include` 参数，参数被**静默忽略** → 名义扫 6 类后缀、实际扫全量 9816。结果碰巧对（硬违规词不出现在 `.css` 里），但**脚本声称的口径是假的**。

**修法**：改用 `-Path $full -Recurse -File | Where-Object { $allowedExt -contains $_.Extension.ToLower() }`

### bug 2：`-Paths` 绝对路径静默假绿

`Join-Path $repoRoot $p` 当 `$p` 是绝对路径时报错被吞 → `Test-Path` 失败 → `continue` 跳过 → `filesScanned=0` 却 exit 0。**"扫不到东西"和"扫了但没违规"在这里无法区分，这就是假绿。**

**修法**：`[IO.Path]::IsPathRooted($p)` 判断 + `Test-Path` 失败 → `ERROR: path not found` + **exit 1**（fail-closed）。

### 共同病根

与 P5-20 三条真发现一样：**判据选错了信号，永远命中"没问题"分支。** `-Include` 静默忽略、路径找不到静默 continue——都是"沉默地通过"。

---

## 4. 5 条自证原文

```
TEST 1 (relative fixture):    1 file, hard=1, exit=1
TEST 2 (absolute fixture):   1 file, hard=1, exit=1     ← bug2 修复证明
TEST 3 (nonexistent path):    ERROR: path not found, exit=1  ← 不再静默
TEST 4 (default):            9811 files, hard=0, backlog=13, exit=0
TEST 5 (gate-all -BrandPaths abs fixture):
  tsc-root  PASS
  tsc-web   PASS
  gate-unit PASS
  gate-e2e  PASS
  brand-gate FAIL         ← 只有这一项
  OVERALL: FAIL exit=1
```

---

## 5. gate-all.ps1 第 5 步

顺序：tsc-root → tsc-web → gate-unit → gate-e2e → **brand-gate**

- brand 步只由 `hardViolations > 0` 驱动 FAIL
- backlog 只打印数字，不影响 PASS/FAIL
- 保持"不短路"（五道全跑完）
- `-UnitBaseline` / `-E2eBaseline` / `-BrandPaths` 三参数透传

---

## 6. WORM_BACKEND=memory 风险段

`/ready` 响应中 `wormBackend` 字段：`(in-process memory; not persisted)`。

启动日志两条：
```
[worm] backend=memory: WORM segments not persisted to disk
[worm] unsafe combo: audit events persisted to PG but WORM segments only in memory.
  Restart resets lastArchivedSeq, re-archiving and overwriting old segments.
```

E2E 用 `WORM_BACKEND=memory` + `AUDIT_STORE=pg` 正是 unsafe combo。非 production 只 console.error 不阻断，但重启后段丢失、跨段链断裂。这是 `WORM_BACKEND` 默认值（当前 `memory`）的实际代价。

`AUDIT_BACKFILL_LIMIT` A/B/C 三案挂起：主线启动时显式传 10000 是**临时口径不是方案**（只写方案未执行）。

---

## 7. env-doctor WARN 判定缺失的教训

原代码只有 `if ($cmdLine -match 'src/bff/index\.ts')`，**无归属判定**（不判断端口是否被非本仓进程占用）→ 声称会报警、实际不报警 → **比没有自检更危险，因为"没 WARN"被读成"没问题"**。

---

## 8. PowerShell 脚本硬规矩

1. 文件 **UTF-8 带 BOM**（`EF BB BF`）
2. **字符串一律英文，中文只放注释**

两条都要：BOM 可能被某些编辑器/CI 剥掉，只靠 BOM 不够稳；字符串英文是双保险。

---

## 9. 品牌扫描结论

30 词表（含中文真名 / 中文简称 / 拼音 / 英文别名四套）大小写不敏感扫描 9811 个文件：**硬违规 0 命中**。`gangos_` 前缀 backlog 13 处（2 个文件：`src/bff/observability/metrics.ts`、`src/core/observability/metrics.ts`），不影响门禁通过。
