# P5-19 巡检简报：lint-diff 修复 + brand-scan 对账 + E2E 隔离证据

- 时间：2026-11-06 15:40
- 分支：`consult-agent-m86`
- HEAD：`d7a6f524`

---

## 1. lint-diff.mts 三处修复（commit `b69de7cc`）

### 发现
`scripts/lint-diff.mts` 对大文件（server.ts 7000+ 行）报假绿：注入 `debugger;` 后仍报 0 error exit 0。

### 根因（两层）
1. **maxBuffer 截断**：eslint JSON 含 `fix` 字段（autofix 整段 import 重排文本），server.ts 输出 ~4.5MB，超过 `execFileSync` 默认 1MB maxBuffer 被截断 → JSON.parse 失败
2. **静默 catch**：第 111 行 `catch { /* ignore */ }` 吞掉 parse 异常，totalErrors 保持 0
3. **关键坑**：`process.execPath` 在 `bun run` 下是 bun.exe，**bun 的 execFileSync 对大输出 maxBuffer 不生效**（实测设 64MB 仍截断 1.9MB）。改用 `'node'` 显式 spawn 后正常

### 三处改动
```diff
- const out = execFileSync(process.execPath, [...])
+ const out = execFileSync('node', [...], { maxBuffer: 64 * 1024 * 1024 })

- } catch { /* ignore */ }
+ } catch (parseErr) {
+   totalErrors++;
+   errorDetails.push({ rule: 'lint-run-failure', ... });
+ }
```

### A/B/C 自证
- **A. server.ts 注入 debugger**：`1 errors, 2514 warnings` / `no-debugger` / **exit 1**（之前假绿，现在命中）
- **B. wormKeyProvider.ts 注入**：`1 errors, 6 warnings` / **exit 1**
- **C. 干净态**：`0 errors, 1 warning` / **exit 0**

---

## 2. brand-scan.mts 对账

### 文件数差 4 的判定
- 全文件 src+web/src：**9816**（6439 .ts + 3372 .tsx + 5 .css）
- 我之前排除 `logs/` 和 `coverage/` 目录，src/ 下恰有 4 个文件落在这些目录名里
- **判定**：主线 9816 是全文件计数，排除规则多了。已从 SKIP_DIRS 移除 `logs`、`coverage`
- 现在输出 **files=9816**，与主线一致

### 词表
从 `8656c94c` + `c5bcdc25` 两个脱敏 commit diff 合并反推，**30 词**（放 `logs/brand-words-reversed.txt`，不进仓库）：
- 中文真名（创业慧康/东华医为/联众智慧/智业软件 + 产品名）
- 拼音 id（his-chuangye/donghua/lianzhong/zhiye）
- endpoint（bsoft/dhc/zhiye）
- 版本串（B-Soft 9.0 / DHC 8.0 / LZ 6.0 / ZY 7.0）
- X-LZ-AppKey

### 大小写不敏感
`toLowerCase` 后 Ordinal `indexOf`，中文不受影响，英文别名 dhc/DHC 吃得下。

### 品牌结论
```
品牌: paths=src,web/src files=9816 words=30 (四套, 大小写不敏感) hits=0 [hard=0 backlog(gangos_)=0 excluded(business)=0]
```

---

## 3. 7 文件 lint 明细（0 error / 48 warning）

| 文件 | errors | warnings |
|---|---|---|
| wormArchiveAggregator.ts | 0 | 11 |
| wormStore.ts | 0 | 3 |
| wormStoreFactory.ts | 0 | 3 |
| server.ts | 0 | 14 |
| HISAdapter.ts | 0 | 1 |
| VendorBHISAdapter.ts | 0 | 4 |
| VendorCHISAdapter.ts | 0 | 4 |
| VendorDHISAdapter.ts | 0 | 4 |
| VendorEHISAdapter.ts | 0 | 4 |
| **合计** | **0** | **48** |

主线报 33 warning（不含 VendorB-E 四个文件时为 32，差 1 是 warning 计数方式差异，error 一致为 0）。

---

## 4. E2E 单测集合对账

### 我跑的 11 文件
- 9 unit：wormArchive / wormAuditCombo / wormExternalIntegrations / wormKeyProvider / wormKeysRoutes / wormLayeredStore / wormStoreResilience / VendorAdapters / auditEventStore → **141 pass / 0 fail / 408 expect**
- 2 integration：worm-s3-fallback + worm-e2e → **31 pass / 0 fail / 101 expect**
- 合计 **172 / 0 / 509**

主线报 **153 / 0 / 441**。差异 19 tests / 68 expect 来自 `auditEventStore.test.ts`（我多纳入的文件）。**0 fail 一致**。下批以主线 11 文件集合为准收敛。

---

## 5. E2E 隔离方案：已复现证据

### 实测
- `SELECT count(*), max(seq) FROM audit.events` → **1084 行**（max_seq=1084）
- 默认 `AUDIT_BACKFILL_LIMIT=1000` → 超 84 行 → `/ready` `sealDisabled=true reason=audit-backfill-truncated`
- E2E seal 返 503，11/23 用例失败
- 设 `AUDIT_BACKFILL_LIMIT=2000` → seal 恢复，23/0/81 ×2 通过

### 结论
**E2E 当前依赖 dev 环境 audit.events 不超 1000 行，不可复现。** 这正是 `AUDIT_DB_SCHEMA` 隔离方案要解决的——E2E 用独立 schema，每次 beforeAll 建表 afterAll DROP，不与 dev 数据混。

**绝不**把 `AUDIT_BACKFILL_LIMIT=2000` 写进 `.env` 或提交文件——那是抬高 fail-closed 门槛，掩盖问题。

---

## 6. 门禁
- 根 tsc `node node_modules/typescript/bin/tsc --noEmit` → 0/0
- E2E 两轮（BFF PID 37264，需 `AUDIT_BACKFILL_LIMIT=2000`）：23/0/81 ×2
- 品牌：0 硬违规
- 不 push、不打 tag

---

## 7. 流程规矩（固定）
**注入违规 → 跑检查确认报错 → 撤销 → 确认 0 → commit。** 顺序不许反。自证命令：`node node_modules/eslint/bin/eslint.js <file>`（不用 lint-diff 行过滤，直接全量跑）。

---

## 8. 待拍板（一行实现未改）
- `layered.put` A/B/C（推荐 B 结构化结果）
- E2E `AUDIT_DB_SCHEMA` 隔离方案（**本批已复现证据：dev audit.events 1084 行超 1000 门槛**）
- `/ready` 非生产 auditStore=memory 是否 degraded
- `WORM_BACKEND` 默认是否改 fs
