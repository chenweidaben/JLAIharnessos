# P5-15 WORM / 审计持久化深化简报

- 日期：2026-11-06 04:56
- 范围：P5-15 两件 —— key-ops 清理语义修正 + S3/SIEM mock 适配器与契约测试
- 分支：`consult-agent-m86`
- 上游：P5-14 并发写口径（按实例分文件 JSONL）

---

## 1. 清理语义的三条缺陷（主线查实）

P5-14 把写入侧从"读-改-写单文件"改成"按实例分文件 JSONL 追加"，解决了多实例互相覆盖。但**清理侧**仍停留在单实例假设上，主线复盘时查出三条问题：

1. **死代码**：`cleanupOldKeyOps` 全仓只有定义（`keyOpsStore.ts`）与单测/文档引用，**没有任何生产调用点**。即使策略对，也永远不会跑。
2. **语义物理不可达**：`INSTANCE_ID = hostname-pid-rand6`，进程重启后换新 id；清理只删"文件名含本实例 id"的文件。**上一个进程的文件永远不会被任何进程清理**——`readKeyOps` 永久累积读取，目录无限增长。原注释"他实例的旧文件由他实例自己清理"在物理上不成立。
3. **默认留存过短**：旧默认 `maxAgeDays=30` 低于网络日志 6 个月留存要求。此前没接线所以无害，一旦有人接上就会删掉本应留存的审计记录。

**因果**：写入侧修了竞态，清理侧却把策略钉死在单实例上——分文件解决了互相覆盖，却制造了无人回收。

---

## 2. 清理修法

- **按文件名内 `YYYYMMDD` 跨实例清理**：从 `_key-ops-<instanceId>-<YYYYMMDD>.jsonl` 正则提取日期，与 cutoff 比较，**删所有实例的旧文件**，不再依赖 instanceId。
- **默认留存 180 天**（网络日志 6 个月），`KEY_OPS_RETENTION_DAYS` 环境变量覆盖。非法值（非数字 / ≤0 / <180）直接抛错，**不允许**静默取默认——审计留存是合规硬指标。
- **默认 dry-run**：`scripts/cleanup-keyops.mts` 只打印将要删除的清单 + 日期 + cutoff，加 `--apply` 才真删。
- **`src/bff` 里无进程内自动调用**。

**为什么不做进程内静默自动删除**：审计记录删除是不可逆操作。必须让人先看到清单、确认 cutoff、再执行。脚本 dry-run → 人审 → apply，是对审计数据删除的最小安全边界。

---

## 3. S3 / SIEM 适配器（mock，未联调）

### 边界声明
- `s3WormStore.ts` 文件头、`syslogCefExporter.ts` 文件头、`docs/security/worm-external-integrations.md` 均有醒目"NOT INTEGRATED — mock only, no real endpoint"声明。
- **没有**真实 S3 bucket 连接，**没有**真实 syslog 连接。主流程（`server.ts` / `wormArchiveAggregator.ts`）未引用这两个适配器。

### 为什么要独立 `AsyncWormStore`
现有 `WormStore` 是同步接口（`put/get/list/countBySigner` 直接返回值），因为它只服务本地 fs（`FileWormStore`，同步 API）和内存（`MemoryWormStore`）。S3 是网络 IO，天生异步。

把 S3 强行做成同步（阻塞等待网络）在 Node 里是反模式：
- 独占事件循环
- 超时无法取消
- 并发全部串行

因此新增 `AsyncWormStore`（全 Promise），与同步接口并存：
- `S3WormStore implements AsyncWormStore`
- `toAsyncStore(sync)` 把同步后端包成异步，供契约测试用同一套用例跑两种实现

### 前置改造未做（重要）
真正接入 S3 前必须做一次前置改造：`wormArchiveAggregator` 的调用链（`seal` / `verify` / `listSegments` / `getSegment` / `countBySigner` 回退路径）目前全是同步的。需要改为 async，或引入带超时与并发上限的同步桥接层。**本切片未做这项改造**，所以 S3 只到 mock 契约测试层面。

### CEF 转义（实跑单测）
- `|` → `\|`
- `\` → `\\`
- 换行 `\r\n` / `\n` → 空格（保证一条事件一行）
- severity：result=ok → `5`，其他 → `3`
- extensions：`src / suser / act / outcome / cs1Label=module / cs1 / rt / msg`

---

## 4. 门禁数字

| 项 | 结果 |
|---|---|
| 根 tsc (`bun x tsc --noEmit`) | exit=0 / 0 字节（`logs/tsc-root-p5-15.log`） |
| web tsc | exit=0 / 0 字节（`logs/tsc-web-p5-15.log`） |
| 七文件单测组合（wormArchive + wormKeysRoutes + keyOpsStore + wormAuditCombo + auditEventStore + auditEventHook + wormExternalIntegrations） | **114 pass / 0 fail / 352 expect** |
| `wormExternalIntegrations` 单测文件 | 7 pass / 0 fail / 37 expect |
| E2E Round 1（BFF pid 40980，`/ready` 报 wormBackend=memory / auditStore=pg，uptime 454s） | **23 / 0 / 81** |
| E2E Round 2 | **23 / 0 / 81** |
| 清理脚本 dry-run 实测 | `retentionDays=180 cutoff=2026-05-09T20:30:37.435Z candidates=0 dry-run：未删除任何文件` |
| 品牌 17 词（4 个改/新源文件） | 全 0 |

---

## 5. lint 环境问题

`eslint .` 在本机退出 134（V8 堆内存崩溃，非代码错误）。**未通过**，原因是本机跑不动，待换机或调 `--max-old-space-size` 参数。本简报如实标注，不写成通过。

---

## 6. 两条待拍板（未自行决定）

1. `/ready` 在非生产环境且 `auditStore=memory` 时是否降级为 `degraded`（当前一律 `ok`）
2. `WORM_BACKEND` 默认值是否从 `memory` 改为 `fs`（当前默认 memory，启动只在日志里 warn）

---

## 7. 运维提示

- **dev 环境 `WORM_BACKEND=memory` 重启会重复归档**：内存后端不持久化段链，重启后 `lastArchivedSeq=0`，已归档事件会被 backfill 重新归档、新段 `fromSeq=1` 覆盖旧段。生产必须用 `WORM_BACKEND=fs`（或真接 S3 后用 S3WormStore）。
- **key-ops 旧格式迁移**：滚动升级时先单起一个实例完成 `_key-ops.json` → `_key-ops-*.jsonl` 迁移，观察到 `.migrated` 文件出现后再起其余实例。毫秒级并发窗口最坏结果是旧记录重复一次（不丢失），但单起迁移可彻底规避。
- **清理不是自动的**：定期（如每月）跑一次 `bun run scripts/cleanup-keyops.mts`（dry-run）→ 人审清单 → `--apply`。
