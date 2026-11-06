# P5-27: 单测清单口径收敛（双口径）

**日期**: 2026-11-07

---

## 14 文件逐文件明细表（实测，非抄表）

| 文件 | pass | expect |
|---|---|---|
| wormArchive | 57 | 197 |
| wormKeyProvider | 29 | 63 |
| auditEventHook | 17 | 26 |
| wormKeysRoutes | 11 | 24 |
| keyOpsStore | 10 | 41 |
| auditEventStore | 9 | 27 |
| wormStoreResilience | 9 | 23 |
| wormExternalIntegrations | 7 | 37 |
| VendorAdapters | 7 | 9 |
| wormAuditCombo | 5 | 7 |
| wormLayeredStore | 8 | 25 |
| backfillTruncation | 4 | 13 |
| worm-s3-fallback | 8 | 20 |
| **auditChainVerify** | **5** | **10** |
| **合计** | **186** | **522** |

逐行相加：57+29+17+11+10+9+9+7+7+5+8+4+8+5 = **186**
expect：197+63+26+24+41+27+23+37+9+7+25+13+20+10 = **522**

## 两套口径的代码实现

- **默认 13 文件**：不带参数 = 181/0/512（与 `8707e87c` 固化口径一致）
- **14 文件**：`-WithChain` = 186/0/522（含 `auditChainVerify`）

`gate-unit.ps1`：
- `$files`：13 文件数组
- `$chainFile`：`./tests/unit/auditChainVerify.test.ts`
- if/else 两套默认基线（空字符串时按模式选 181 或 186）
- `$files += $chainFile` 当 `-WithChain`

`gate-all.ps1`：
- `-UnitWithChain` 开关透传给 `gate-unit.ps1`

## 3 条自证

| 命令 | actual | expected | 结果 |
|---|---|---|---|
| `gate-unit.ps1`（默认 13） | 181/0/512 | 181/0/512 | PASS exit=0 |
| `gate-unit.ps1 -WithChain`（14） | 186/0/522 | 186/0/522 | PASS exit=0 |
| `gate-unit.ps1 -WithChain -Baseline 185/0/522` | 186/0/522 | 185/0/522 | diff pass=+1 FAIL exit=1 |

## auditEventStore 仍 9/27

P5-26 给 `AuditEventStore` 接口加了 `ping()` 方法，但 `auditEventStore.test.ts` 测试计数**未变**（仍 9 pass / 27 expect）。**加接口方法不等于加测试**——`ping()` 目前只被 `/ready` 路由调用，没有独立单测覆盖。

## gate-all -UnitWithChain 五步全 PASS

```
tsc-root   PASS
tsc-web    PASS
gate-unit  PASS (186/0/522)
gate-e2e   PASS (23/0/83)
brand-gate PASS
OVERALL: PASS exit=0
```
