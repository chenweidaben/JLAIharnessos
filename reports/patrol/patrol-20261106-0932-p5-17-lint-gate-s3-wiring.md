# P5-17 巡检简报：lint 差分门禁、S3 接线与 E2E 前置自检

- 时间：2026-11-06 09:32
- 分支：`consult-agent-m86`
- 范围：A（lint 差分门禁 + scripts tsconfig 全量覆盖）→ B（S3 接线）→ C（E2E 前置自检）→ D（确认不回退）→ 卫生清理

---

## 1. lint 差分门禁：为什么不清零全量

全量 `eslint src tests scripts` 基线 5486 文件 / 14186 problems（7499 errors / 6687 warnings）。这是 P1 时代累积的历史 backlog，本批不试图清零——清零是另一个独立工程，硬清会把本切片拖入无关改动。

本批做法是**差分门禁**：
- 新建 `scripts/lint-diff.mts`，对 `git diff` 列出的改动文件逐个跑 eslint，有 error 则 exit 1
- 支持 `--staged`、`--base <ref>`，分批 20 文件避免单次 OOM
- 语义：**新代码不许带新 error；历史 backlog 不阻断**

### scripts parsing error 49 → 0
- 问题：`scripts/verify-roles.ts` 等触发 "was not found by project service" parsing error，因为这些文件不在任何 tsconfig 的 program 里
- 做法：新建独立 `scripts/tsconfig.json`，`extends ../tsconfig.json`，`include: ["**/*.ts", "**/*.mts"]`，`strict: false`
- `eslint.config.js` 的 scripts 块指向 `./scripts/tsconfig.json`，开 `@typescript-eslint/no-floating-promises`
- `.cjs` / `.mjs`（CommonJS）走无类型感知规则集，避免 project service 找不到
- 结果：parsing error 49 → **0**；剩余 25 errors 全是真实规则命中（`perf-worm-search.mts` 4e、`start-bff-cluster.ts` 2e 等历史脚本），不是解析失败

### scripts/tsconfig.json 是否影响根 tsc
不影响。根 tsc 命令 `node node_modules/typescript/bin/tsc --noEmit` 0/0 输出为空。`scripts/tsconfig.json` 只被 `eslint.config.js` 的 `parserOptions.project` 引用，根 tsconfig 仍是逐文件列举。

### `strict: false` 的妥协
- 实测：strict 模式第一个错误是 `TS7016: Could not find a declaration file for module 'sm-crypto'`（implicitly any）
- 这是**配置不匹配**（`sm-crypto` 无官方 @types），不是脚本逻辑问题
- 加 `noImplicitAny: false` 后 strict 模式通过
- 在 `scripts/tsconfig.json` 注释中注明"新脚本应 strict 合规"，避免后续新脚本在宽松环境里写

---

## 2. `auditEventStore.ts` 40e → 0e：证明 pg 泛型这条路可行

### 根因
`SqlExecutor = any` 一行注解，导致所有 `sql\`...\`` 模板标签、`rows[0]?.x` 访问都是 any。21 个 `no-unsafe-call`、8 个 `no-unsafe-assignment`、6 个 `no-unsafe-member-access` 全从这一行来。

### 解法
定义 `PgSql` 最小接口，模板标签带泛型：
```ts
interface PgSql {
  <T = unknown>(strings, ...values): Promise<T[]>;
  begin<T>(fn: (tx: PgSql) => Promise<T>): Promise<T>;
  cursor<T>(batchSize): (strings, ...values) => AsyncIterable<T[]>;
  join(parts, sep): unknown;
}
```
每个查询点收窄到具体 Row 类型：`tx<{seq}>`、`this.sql<EventsRow>`、`this.sql<{count}>`、`this.sql<{n}>`。

### 结果
- 40 errors → **0 errors**（剩 4 warning：no-console 等）
- tsc 0/0，单测 12 pass / 0 fail
- **这证明剩余 53e（wormStore/routes/worm/wormKeyProvider 等）同类方法可推平**，已列入下批必清

---

## 3. S3 接线：组合顺序为什么不能反

### 组合
```
withResilience(                ← 外层：超时 + 信号量 20 + put 超时补救
  createLayeredWormStore(      ← 内层：remote ∪ local + divergence 校验
    new S3WormStore(s3),       ← remote：headObject 探测
    fileStore,                 ← local：fs 兜底
  ),
)
```

### 为什么不能反（layered 在外、resilience 在内）
如果 layered 在外层，`remote.put` 超时发生在 resilience 内部，resilience 把错误往上抛，但 layered 会把这个错误当成"remote miss"——然后把段写到 local 兜底。这是**最危险的假成功**：上层以为 put 成功，实际 S3 可能根本没收到。

resilience 在外层时，超时直接抛 `worm-store-timeout`，由 resilience 调 `inner.probe(segmentId)` 判定对象是否真落盘。

### probe 转发
`createLayeredWormStore` 必须提供 `probe(segmentId)` 并转发到 remote.probe。否则组合后 `inner` 变成 layered，resilience 的 put 超时补救调 `inner.probe()` 时找不到方法，补救静默失效。

### 超时绝不返回空的语义
- `get` 返回 `null`：上层会当成"这段不存在"，可能触发重复归档
- `get` 超时抛 `worm-store-timeout`：上层必须显式处理
- 集成测试显式断言：`await expect(p).rejects.toThrow(/worm-store-timeout/)`，且 catch 到的不是 null

### fail-closed
`WORM_BACKEND=s3` 缺 `S3_BUCKET` 或缺 s3 client 注入 → 抛错，**不回落 memory/fs**。用例 5/6 覆盖。

### 集成测试 6 用例
1. 断网 put 抛错不 500
2. sweep 补传成功后 local 删除（FileWormStore 加 `delete()` 方法）
3. get 超时抛 worm-store-timeout，绝不返回 null
4. put 超时但 probe 命中 → 视为成功，`putTimeoutButExists=1`
5/6. fail-closed 缺 env 抛错

---

## 4. E2E 前置自检：为什么用 verify 当断言

### 早期版本（C v1）
只检查 `signerKeyId` 存在。但真正的假红机制不是 active key 缺失，而是**历史段用的旧 key 被 purge 出环**——只要 active key 在环里，这个检查永远通过。

### 改强后（C v2）
`beforeAll` 直接调 `GET /api/v1/worm/verify?scope=all`，要求 `valid=true`。如果 verify=false，把首个错误码/段 ID/消息打进 throw message，收敛成 **1 条前置失败**，而不是 seal/rotate/verify 用例散成 6 条红。

### 实测 5 轮全 23/0/81
内存 store 模式下 purge 只删 `refs=0` 的 key，历史段仍引用旧 key，所以 verify 不破坏。主线之前观察到的 17/6 假红出现在 **fs 持久化段跨多次 purge** 的条件下——段写在磁盘上、keyring 在内存里、多次 purge 后旧公钥从环里移除、重启后 verify 这些段时 `unknown-key-id`。本批 E2E 跑在 memory store + 每轮 BFF 重启，不会触发；但前置自检在任何 verify=false 的场景下都会拦下。

### afterAll warn
每轮跑完快照 active key，若被本次 rotate 改变，`console.warn` 提示"下次同进程会假红"。5 轮实测 warn 全部触发（`k-xxx → k-yyy`），证明 rotate 在改 active key。

---

## 5. 卫生清理

### 撤回数字
| 目录 | 清理前索引数 | 清理后 |
|---|---|---|
| `reports/consult-deepen/` | 167 | 0 |
| `reports/consult-rebuild/` | 12 | 0 |
| `reports/patrol/`（另路时间戳） | 247 | 0 |
| `reports/` 总 | 479 | 53 |
| 仓库总文件 | 34696 | 34270 |

磁盘文件未删，仅 `git rm --cached` 取消跟踪。

### .gitignore 排除模式
```
reports/patrol/*
!reports/patrol/patrol-*-p5-*.md
```
- 本批 p5 切片简报自动跟踪（不依赖 `git add -f`）
- 另路 `patrol-YYYYMMDD-HHMM.md` 自动忽略
- `git check-ignore -v` 验证：ours exit 1（不忽略），other exit 0（忽略）

---

## 6. 门禁数字

- 根 tsc：`node node_modules/typescript/bin/tsc --noEmit` → 0/0
- 九文件组合 + S3 集成：133 pass / 0 fail / 406 expect
- E2E：PID 31484 起 5 轮全 23 pass / 0 fail / 81 expect
- 差分 lint：本批新文件 0 error
- 品牌词扫描：本简报 0 命中（17 词清单未在正文出现）

---

## 7. 下批必清清单（P5-17 同类方法已验证可行）

| 文件 | errors | 根因 |
|---|---|---|
| `tests/integration/worm-e2e.test.ts` | 83 | `CallResult.data: any` 需 `call<T>` 泛型化 |
| `src/bff/aggregators/wormStore.ts` | 19 | `require('sm-crypto')` 4 + no-unsafe-* |
| `src/bff/routes/worm.ts` | 12 | `no-unnecessary-type-assertion` 7 + `no-base-to-string` 5 |
| `src/bff/aggregators/wormKeyProvider.ts` | 10 | prefer-nullish-coalescing 5 + array-type 2 |
| `src/bff/aggregators/wormArchiveAggregator.ts` | 7 | non-nullable-type-assertion 2 + no-empty-object-type 1 |
| `src/bff/aggregators/auditEventAggregator.ts` | 3 | non-nullable-type-assertion 2 + no-require-imports 1 |
| `src/bff/server.ts` | 2 | no-unsafe-member-access 1 + no-unnecessary-type-assertion 1 |
| `scripts/` 历史脚本 | 25 | perf-worm-search / start-bff-cluster 等 |

**方法已验证**：`auditEventStore.ts` 用 pg 泛型从 40e 推到 0e，剩余文件可同法。

---

## 8. 两条待拍板（未自决）

1. **`/ready` 在非生产 `auditStore=memory` 时是否 degraded**：当前只在 `sealDisabled=true` 时置位。dev 环境 `AUDIT_STORE=memory` 是否也应 degraded（提示审计未持久化）？
2. **`WORM_BACKEND` 默认是否改 fs**：当前默认 memory，生产自检会要求 fs。dev 体验 vs 安全默认值的取舍。

---

## 9. 方法论沉淀（本批反复出现的同一类问题）

**"配了检查必须当场注入违规证明它真能抓住东西"**：
- `/metrics` 计数器有名字但没 import → 假绿
- fs 脚本 CHECK-B 是 console.log 不是断言 → 假绿
- E2E "绿"跑在早于 commit 的旧 BFF → 假绿
- scripts `no-floating-promises` 配了但三次注入都不报 → 最终发现是文件不在 tsconfig program 里，@typescript-eslint 静默退回无类型模式

以后凡是"配了门禁/检查/断言"，必须当场注入一次违规，证明能抓住东西，再报通过。
