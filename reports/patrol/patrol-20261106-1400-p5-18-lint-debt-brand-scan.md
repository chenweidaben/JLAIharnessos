# P5-18 巡检简报：lint 清债 6/6 + brand-scan 脚本 + lint-diff bug 取证

- 时间：2026-11-06 14:00
- 分支：`consult-agent-m86`
- 基线：`fd311a3e`（品牌脱敏 P0 + 双 tsc 0/0 + 153 单测）

---

## 1. lint 差分门禁自证方法修正（重要）

### lint-diff.mts bug 取证
实测发现 `scripts/lint-diff.mts` 对大文件（7000+ 行 server.ts）报假绿：
- 注入 `debugger;` 到 server.ts 第 1 行
- `bun run scripts/lint-diff.mts` 报 `checking 1 files: src/bff/server.ts` → `0 errors, 0 warnings` exit 0
- 同一注入用 `node node_modules/eslint/bin/eslint.js server.ts` 直接跑 → 报 `1:1 error no-debugger` exit 1

**根因**：server.ts 的 eslint JSON 输出因 `import/fix` autofix 字段（整段 import 重排文本）膨胀到 ~4.5MB，超过 `execFileSync` 默认 1MB maxBuffer 被截断 → `JSON.parse(out)` 抛异常 → 第 111 行 `catch { /* ignore */ }` 静默吞掉 → totalErrors 保持 0。

**wormStore.ts 之前能命中**：文件小，JSON 输出远小于 maxBuffer，parse 成功。这不是注入位置差异，是文件大小差异。

**建议修复（上报主线，本批不动）**：
1. `execFileSync` 加 `maxBuffer: 10 * 1024 * 1024`
2. 第 111 行 parse 失败时必须 `totalErrors++` 报 `lint-run-failure`，不能静默
3. eslint formatter strip `fix` 字段

### 本批临时自证方案
改用 `node node_modules/eslint/bin/eslint.js <file>` 直接跑：
1. 注入 `debugger;`
2. `node ...eslint.js <file>` → 报 1 error `no-debugger` exit 1
3. 撤销
4. `node ...eslint.js <file>` → 0 error
5. commit

待主线修 lint-diff 后恢复原流程。

---

## 2. lint 清账表（6/6 文件）

| 文件 | 原 error | 现 error | 改法 | commit |
|---|---|---|---|---|
| `wormStore.ts` | 19 | 0 | `require(fs/cp)` 改顶层 import | `254f122e` |
| `server.ts` | 2 | 0 | `catch(e: unknown)` + 删多余 `as` | `c0af13e9` |
| `auditEventAggregator.ts` | 3 | 0 | `if` 分支内 `const` narrowing；`require(metrics)` 改顶层 | `47c970b7` |
| `wormArchiveAggregator.ts` | 6 | 0 | `createRequire` for sm-crypto；`interface {}` → `type`；`@ts-expect-error` → 显式 cast | `1a6e1d48` |
| `routes/worm.ts` | 12 | 0 | `c.body<T>()` 泛型；`String(b.x)` → `typeof === 'string'` | `599dcba5` |
| `wormKeyProvider.ts` | 10 | 0 | `createRequire`；`Array<T>`→`T[]`；5 处 `\|\|` 保留加 disable-next-line 带原因 | `e0a8f688` |

**合计清 52 个历史 error**。所有文件自证：注入 `debugger;` → eslint 报 1 error；撤销 → 0 error。

### 关键改法
- **`require()` → `createRequire(import.meta.url)`**：sm-crypto 无 @types，用本地类型声明替代 `as any`
- **`as string` → `if (x) { const v: string = x; ... }`**：不依赖运行时 `!`，用 TS narrowing
- **`String(b.x ?? '')` → `typeof b.x === 'string' ? b.x : ''`**：no-base-to-string 干净解
- **`c.body() as Record` → `c.body<Record>()`**：no-unnecessary-type-assertion 正确解
- **`||` 保留处**：env 空串/空 keyId 需回退，`??` 语义不对，加 `// eslint-disable-next-line ... -- 原因`

---

## 3. brand-scan.mts 脚本

`scripts/brand-scan.mts`（commit `06beb17c`）：
- 逐文件 `fs.readFileSync` + `String.indexOf(word, Ordinal)`
- 跳过 `node_modules/dist/.git/logs` 等
- 输出 JSON `{filesScanned, totalHits, byWord, byFile, backlogGangos}`
- 硬违规 exit 1
- 分类：`gangos_` backlog 单列；`winningSupplierId` 排除

### 词表反推
从 `git show 8656c94c` diff 收集被删原字符串，得 29 词（放 `logs/brand-words-reversed.txt`，gitignore 不进仓库）：
- 四家厂商中文真名（创业慧康/东华医为/联众智慧/智业软件 + 完整产品名）
- 拼音 id（his-chuangye/donghua/lianzhong/zhiye）
- endpoint（bsoft/zhiye）
- 版本串（B-Soft 9.0 / DHC 8.0 / LZ 6.0 / ZY 7.0）
- X-LZ-AppKey

### 全量扫描结果
- `src + web/src + tests`：**12127 文件，0 硬违规**
- `+ docs`：12419 文件，22 硬违规（全在历史商业分析文档，按约定不碰）
- `gangos_` backlog：0（本批未扫到）

---

## 4. 门禁
- 根 tsc `node node_modules/typescript/bin/tsc --noEmit` → **0/0**
- E2E 两轮：BFF PID 46804，StartTime 2026-11-06 13:57:43，`wormBackend=memory`
  - Round 1：**23 pass / 0 fail / 81 expect**
  - Round 2：**23 pass / 0 fail / 81 expect**
- 品牌：brand-scan 0 硬违规（src+web+tests）
- 不 push、不打 tag

---

## 5. 待拍板（一行实现未改）
- `layered.put` A/B/C（推荐 B 结构化结果）
- E2E `AUDIT_DB_SCHEMA` 隔离方案
- `/ready` 非生产 auditStore=memory 是否 degraded
- `WORM_BACKEND` 默认是否改 fs

---

## 6. 下批
- 主线修 lint-diff maxBuffer + parse-fail 处理
- SigV4 接入（P5-18 剩余）
- `scripts/` 历史 25 error（backlog）
