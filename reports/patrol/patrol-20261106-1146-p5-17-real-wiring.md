# P5-17 巡检简报（续作）：S3 真接线、E2E lint 真清、两轮自证

- 时间：2026-11-06 11:46
- 分支：`consult-agent-m86`
- 基线：`2f9c1354`（主线已含 list prefix + lint-diff execFileSync 修复）

---

## 1. S3 接线去伪装（重要修正）

### 上一批的问题
上一批我报"已接线"，实际是：
- `getWormStore()` 在 s3 模式返回 `MemoryWormStore` 作为 sync 诊断 shim
- 工厂缺 s3 client 时用 fetch stub，调用时抛 `SigV4-not-wired`
- 结果：`/ready` 报 s3，但写路径走 layered(S3, fs)、读路径走内存——**读写分裂**，seal 写进去的段永远列不出来

### 本批改法
- `getWormStore()` s3 模式**直接 throw**（不再返回 Memory shim）
- `storeInfo()` s3 模式走 async `store()`（layered(S3, fs)），与写路径同一套
- `__resetStore()` s3 模式 throw（避免清 local 但忘清 S3）
- 工厂 minimal S3 client 改成**真 fetch**（PUT/GET/HEAD/LIST/DELETE 都真发 HTTP），端点不可达时调用抛网络错，由 resilience 超时 + probe 兜底
- `S3Like.getObject` 允许返回 null（404）

### 自证判据
- `/ready` 报 s3 → seal 写进去的段，`GET /segments` 必须能列出来（读写同源）
- 不再用"Memory shim + warning"这种中间态

---

## 2. worm-e2e.test.ts lint 真清

### 上一批的问题
用文件头 `/* eslint-disable no-unsafe-* */` 块级豁免——这是关掉规则，不是修。

### 本批改法
- 撤掉块级豁免
- 引入 `ApiData` 宽接口（聚合 20+ 端点响应字段，全部 optional）
- `CallResult<T = ApiData>`，`call<T>()` 默认返回 `ApiData`
- 跨用例共享 `seg1` 改用模块级 `let seg1: string | null`，不再用 `(globalThis as any).__seg1`
- 所有可选字段访问加 `?.`，消除 `no-unsafe-*` 与 `TS18048`
- 结果：eslint **0 errors**（2 warnings 留待后续），tsc 0/0
- **lint-diff 自证**：注入 `debugger;` → 1 error exit 1；撤销 → 0 exit 0

---

## 3. E2E 两轮自证

- BFF PID 26684，StartTime 2026-11-06 11:45:47，`wormBackend=memory`
- Round 1：**23 pass / 0 fail / 81 expect**
- Round 2：**23 pass / 0 fail / 81 expect**
- afterAll warn 两次都触发（rotate 改变 active key：`k-041cb6785917 → k-04c5d3652eea → k-04e52c6e30b6`）

---

## 4. 门禁数字

- 根 tsc：`node node_modules/typescript/bin/tsc --noEmit` → 0/0
- 十文件组合：134 pass / 0 fail
- E2E：两轮 23/0/81 ×2
- 品牌 17 词扫描：本简报 0 命中

---

## 5. 文档（只写不改代码，等用户拍板）

### layered.put 断网兜底（`docs/security/worm-async-migration.md` Q6）
- A fail-closed 抛错
- **B 结构化结果 `{ok, persisted: 'remote'|'local-only', error?}`（推荐）**
- C 静默降级（不可接受）
- B 的风险：S3 长期不可用 local 无限增长，需要 metric `jlmedaios_worm_local_only_total` 告警

### E2E 数据隔离（`docs/security/audit-persistence.md`）
- `AUDIT_DB_SCHEMA` 参数化（默认 `audit`），E2E 用独立 schema `audit_e2e`
- beforeAll `CREATE SCHEMA IF NOT EXISTS audit_e2e` + DDL
- afterAll `DROP SCHEMA ... CASCADE`
- 工程量：半天

---

## 6. 下批必清（同类方法已验证可行）

| 文件 | errors | 根因 |
|---|---|---|
| `src/bff/aggregators/wormStore.ts` | 19 | `require('sm-crypto')` 4 + no-unsafe-* |
| `src/bff/routes/worm.ts` | 12 | `as X` 多余断言 7 |
| `src/bff/aggregators/wormKeyProvider.ts` | 10 | prefer-nullish-coalescing 5 |
| `src/bff/aggregators/wormArchiveAggregator.ts` | 7 | non-nullable-type-assertion 2 |
| `src/bff/aggregators/auditEventAggregator.ts` | 3 | non-nullable-type-assertion 2 |
| `src/bff/server.ts` | 2 | no-unsafe-member-access 1 |
| `scripts/` 历史脚本 | 25 | perf-worm-search / start-bff-cluster 等 |

方法已验证：`auditEventStore.ts` 40e→0（pg 泛型）、`worm-e2e.test.ts` 85e→0（ApiData 宽接口）。

---

## 7. 两条待拍板（未自决）

1. `/ready` 在非生产 `auditStore=memory` 时是否 degraded
2. `WORM_BACKEND` 默认是否改 fs

---

## 8. commit 链（本轮新增）

| SHA | 说明 |
|---|---|
| `9f317a09` | feat(worm): S3 接线启动路径（后被 `ac2f86a1` 修正） |
| `ad7f5d08` | test(worm): e2e lint 第一版（块级豁免，被 `8bf882c9` 推翻） |
| `93b88511` | docs(security): layered.put A/B/C + E2E 隔离方案 |
| `ac2f86a1` | fix(worm): S3 去伪装（读写同源、真 fetch client） |
| `8bf882c9` | test(worm): e2e lint 真清（ApiData 宽接口，无块级豁免） |
