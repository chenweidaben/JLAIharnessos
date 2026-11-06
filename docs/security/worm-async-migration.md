# WORM 异步改造前置设计（S3 接入前必须完成）

> 状态：**设计待审**。本文档只回答问题、给结论，不写实现代码。审过之后再派落地切片。
>
> 背景：P5-15 已落地 `S3WormStore`（mock），但它实现的是独立的 `AsyncWormStore` 接口，与现有同步 `WormStore` 并存。`wormArchiveAggregator` 仍全同步，**没有任何生产路径调用 `AsyncWormStore`**。本文档回答：真接 S3 时怎么改、改到什么程度、边界在哪。

---

## Q1. 五个方法怎么改 async

现状：`wormArchiveAggregator.ts` 暴露的五个公开方法全是同步的，调用方全是 HTTP 路由（已经是 async ctx handler）。

| 方法 | 调用方 | 是否已在 async 上下文 | 改成 Promise 后连带要改的签名 |
|---|---|---|---|
| `seal(opts)` | `POST /api/v1/worm/segments/seal` handler | 是（`async handle`） | 返回 `Promise<SealResult>`；aggregator 内部 `store.put` 改 `await store.put`；pending 事件从 PG 读已是 async，不动 |
| `verify(scope)` | `POST /api/v1/worm/verify` handler | 是 | `Promise<VerifyResult>`；内部 `store.list()` / `store.get(id)` 都改 await；逐段 SM3/SM2 验签是纯 CPU，不变 |
| `listSegments(limit, offset)` | `GET /segments` handler | 是 | `Promise<{rows,total}>`；内存后端现在直接返回数组，S3 后端要先 `list()` 再 slice |
| `getSegment(id)` | `GET /segments/:id` handler | 是 | `Promise<WormSegment \| null>` |
| `countBySigner(keyId)` 回退路径 | `wormKeysAggregator` purge/retire 判定 | 是（keys 路由也是 async） | `Promise<number>`；purge handler 里 `const refs = store.countBySigner(...)` 前加 await |

**结论**：五个方法的调用方全在 async HTTP handler 里，改 Promise 是自然传播，不需要改 ctx / 中间件 / 错误处理框架。路由层 `json(ok(await aggregator.seal(...)))` 只是多一个 await。

**seal() 全部调用点（grep 实测）**：
- `routes/worm.ts:63` — HTTP `POST /segments/seal`，async ✅
- `wormAuto.ts:164` — `tick()` 内部调用；`tick()` 本身由 `routes/worm.ts:335` 的 `POST /auto/tick` 调用，async ✅（但 `tick()` 函数签名要同步改 `async`，内部 `await seal({})`）
- 测试：`tests/unit/wormArchive.test.ts`、`tests/integration/worm-e2e.test.ts`，全是 `await` 上下文 ✅
- **无启动流程、无 setInterval 直接调用 seal**（wormAuto.tick 只通过 HTTP 触发，没有定时器自动跑）

**级联影响**：`wormArchiveAggregator.ts:173` 注册了 `setKeyInUseChecker((keyId) => store.countBySigner(keyId))`，这个同步回调被 `wormKeyProvider` 在 retire/rotate 时同步调用。改 async 后：
- `keyInUse` 回调签名改 `(keyId: string) => Promise<number>`
- `wormKeyProvider.retire()/rotate()` 内部 `await this.keyInUse(keyId)`
- 这两个方法本身只在 keys 路由（async handler）里被调，传播 OK

**被否决的方案**：在 aggregator 内部把所有调用并行 `Promise.all`（seal 里 put 多个段）——seal 一次只产一个段，没有并行收益，反而引入错误处理复杂度。

---

## Q2. 超时与并发上限放哪一层

**结论：放在 `AsyncWormStore` 的装饰层**，包装 S3 client，不侵入 aggregator、不侵入业务代码。

- 装饰类 `S3WormStoreWithResilience`：构造时包一个 `AsyncWormStore`，每个方法加 `Promise.race([inner.method(), timeout(ms)])`；并发上限用简单的信号量（`p-limit` 风格，自己写 20 行：一个队列 + in-flight 计数）。

**按方法分档超时**（5s 对 seal 太短，因为 seal 含 SM3/SM4/SM2 CPU 操作）：

| 方法 | 超时 | 理由 |
|---|---|---|
| `put`（seal 调用） | **30s** | seal 要取 pending → SM3 哈希 → SM4 加密 → SM2 签名 → 写 S3；段几百条事件时 CPU + 网络都耗时 |
| `get` | 5s | 单段读，小对象 |
| `list` | 10s | S3 listObjects 可能分页 |
| `countBySigner` | 5s | 基于 list 的内存过滤 |
| `refresh` | 10s | 重新拉索引 |
| `newestSeq` | 5s | 单次读 |

**in-flight 并发上限**：put 5（seal 不会高频并发），get/list 各 20。

**seal 超时后的行为（关键）**：超时 ≠ 没写。S3 put 可能已经成功，只是响应慢。处理：
- 超时后**不抛错给上层**，而是把这次 put 标记为"结果未知"，立即 `headObject` 查询该 segmentId 是否存在
- 如果 headObject 返回存在 → 视为成功，继续返回 seal 结果
- 如果不存在 → 走 Q3 的本地兜底回退
- **绝不允许上层重试 seal**——重试会产生重复段（segmentId 相同）。seal 的幂等键是 segmentId，重复 put 会被 `duplicate-segment` 拦截，但这会让用户看到错误

**为什么不放 aggregator 调用点**：
- aggregator 有 5+ 方法 × 多个路由，每个调用点都写 timeout/并发是重复代码
- 业务语义不应该关心"这次 S3 读要等多久"
- 换后端（比如回本地 fs）时 aggregator 代码不用动

**为什么不放 S3 client 层**：
- 真实 `@aws-sdk/client-s3` 有自己的 retry/timeout 配置（`maxRetries`、`requestTimeout`），但它管的是"单次 HTTP 请求"，管不了"aggregator 并发打 50 个 list"这种应用层并发
- 应用层并发上限必须在 S3 client 之上，否则 S3 SDK 内部并发不受控

---

## Q3. 失败如何回退到本地 fs

**结论：S3 put 失败时，写本地 `FileWormStore` 并打 `[worm] s3 put failed, fell back to local: ...` 警告；读路径合并两边，但必须做段一致性校验。**

具体：
- **写路径**：`put(segment)` 先写 S3；S3 抛错 → 写本地 `FileWormStore(WORM_STORE_DIR)`。
- **读路径合并**：`list()` = S3.list() ∪ Local.list()，按 segmentId 去重。`get(id)` 先查 S3，miss 再查本地。
- **段一致性校验（关键）**：同一 `segmentId` 在 S3 和本地都存在时，**比对 `segmentHash`（SM3 摘要）**：
  - 一致 → 正常返回
  - **不一致 → 不返回任何一份，抛 `worm-segment-divergence` 错误 + 计数 metric + 日志记 segmentId 与两侧 hash**，交由人工处置
  - 理由：WORM 段不可变，读到不一致本身就是完整性事件，静默选一边等于吞掉篡改信号
- **后台补传（无状态推导）**：不维护内存 `pendingUpload` Set（重启即丢）。改成：每次 `list()` 或定期（60s）扫描时，发现"S3 miss 但本地有"的段，自动异步补传到 S3，成功后从本地删除。无状态推导，重启即恢复，不引入新的可丢失状态。

**数据一致性后果（说清）**：
- S3 写成功但本地没写 → 正常，无影响
- S3 写失败、本地写成功 → 读路径能读到（本地兜底），下次 list/定期扫描自动补传
- S3 写成功、本地也写了（双写窗口，如 seal 超时后 headObject 发现已存在但本地也落了） → 读路径比对 hash 一致后正常返回，定期扫描清理本地冗余
- **同一 segmentId 两边 hash 不同** → `worm-segment-divergence`，人工处置，不静默返回
- **不允许**：S3 失败直接让 seal 500——那样用户写操作失败，但段可能已经在本地/PG 落了，状态不一致

**被否决的方案**：
- S3 失败直接 500 让上层重试：seal 是归档操作，失败重试可能造成 pending 事件被重复归档
- 内存 `pendingUpload` Set：重启丢失，本地文件永久滞留（P5-15 修过的同一个病）
- 静默"S3 优先"选边：WORM 不可变语义下，不一致是安全事件，必须告警

---

## Q4. 同步 aggregator 怎么消化异步 store

**结论：不引入阻塞等待桥接层。改 async 是唯一正解。**

明确拒绝以下方案：
- `Atomics.wait` / `deasync` / 忙等 sleep：会独占 Node 事件循环，一个 S3 慢请求会卡住所有 HTTP 请求
- 超时无法取消：用户关了请求，后台 promise 还在等
- 并发全串行：本来 S3 可以并发打，桥接层把它变成同步阻塞，等于把 S3 退化成本地磁盘还更糟
- "先同步桥接，下切片再改 async"：技术债会沉淀，因为桥接层一旦能用，没人愿意回来改

**所以**：Q1 列出的五个方法必须直接改 async。这不是"要不要"的问题，是"怎么安全地一次性改完"的问题。落地切片的边界在 Q5。

---

## Q5. 最小落地范围

**本切片（落地时）只做**：
1. `wormArchiveAggregator.ts` 五个方法签名改 `async`，内部所有 `store.put/get/list/countBySigner/refresh` 调用加 await
2. 路由层（`worm.ts`）五个对应 handler 加 await（机械改动）；`wormAuto.tick()` 同步改 `async`
3. `MemoryWormStore` / `FileWormStore` 包成 `AsyncWormStore`（用已有 `toAsyncStore`），aggregator 构造函数注入 `AsyncWormStore`
4. `S3WormStoreWithResilience` 装饰类（Q2，按方法分档超时）
5. 双写兜底逻辑（Q3，含段一致性校验 + 无状态补传），但**默认不启用 S3**——`WORM_BACKEND=s3` 才走 S3WormStore，否则走现有 fs/memory
6. **fail-closed 启动校验**：`WORM_BACKEND=s3` 但没配 `S3_BUCKET` / 凭据 → 拒绝启动（不许静默回落 memory）；production 下 `WORM_BACKEND=s3` 无凭据同样拒绝
7. 单测：aggregator 用 async store 重跑现有所有 wormArchive 用例（Promise 化）；补 `worm-segment-divergence` 用例（本地与 S3 同 id 不同 hash → 抛错）；补 fail-closed 启动校验用例

**本切片明确不做**：
- 不接真实 `@aws-sdk/client-s3`（继续用 MockS3Client 跑契约）
- 不配 env 自动启用 S3（必须显式 `WORM_BACKEND=s3` + `S3_BUCKET`）
- 不改 `auditEventAggregator`（它是审计事件，不走 WORM store，独立链路）
- 不改 SIEM exporter（那是输出方向，与 WORM store 读路径无关）
- 不删同步 `WormStore` 接口（保留向后兼容，FileWormStore 继续实现它；新代码只依赖 `AsyncWormStore`）

**为什么这样切不会留半截状态**：
- 同步 `WormStore` 保留，但 aggregator 只依赖 `AsyncWormStore`；`toAsyncStore` 是薄包装，一行代码
- `WORM_BACKEND` 默认仍是 `fs` 或 `memory`，生产行为不变；`s3` 是 opt-in
- 单测全跑通后，async 改造是完整的，不是"一半同步一半异步"

---

## 附：被否方案汇总

| 方案 | 否决理由 |
|---|---|
| aggregator 内部 Promise.all 并行 | seal 一次一段，无并行收益 |
| 超时放路由层 | 重复代码，换后端要重改 |
| 超时放 S3 SDK | 管不了应用层并发 |
| S3 失败直接 500 | 状态不一致，用户体验差 |
| deasync / Atomics.wait 桥接 | 独占事件循环，技术债 |
| 默认启用 S3 | 风险高，必须 opt-in |
| 内存 pendingUpload Set | 重启丢失，本地文件永久滞留 |
| 同 id 不同 hash 时静默选 S3 | 吞掉篡改信号，违反 WORM 不可变语义 |
| WORM_BACKEND=s3 但缺凭据时回落 memory | P5-13 教训，fail-closed |

---

## Q6. layered.put 断网兜底（P5-17 新增，待用户拍板）

> 状态：**设计待审，不改代码**。当前 `layered.put(segment)` 的实现是"先 local.put 再 remote.put，remote 抛错直接往上抛"。上层 seal 调用方目前不处理这个错误，等于 S3 抖一下 seal 就 500。下面给三个选项。

### 选项 A：fail-closed 抛错
`put` 只做 `remote.put`，失败直接抛。

- 优点：语义最简单，不会出现"返回成功但其实只在本地"的假成功
- 缺点：S3 抖一下 seal 就失败，归档链路对网络异常零容忍；PG 里 pending 事件堆积，等 S3 恢复才能继续

### 选项 B：结构化结果（**推荐**）
`put` 返回 `Promise<{ok: boolean, persisted: 'remote' | 'local-only', error?: string}>`：

- 先 `local.put`（保证落盘）→ 再 `remote.put`
- remote 成功 → 返回 `{ok:true, persisted:'remote'}`，local 副本保留（读路径容灾）
- remote 失败 → 返回 `{ok:true, persisted:'local-only', error}` + metric `jlmedaios_worm_local_only_total` +1
- seal 侧只看 `ok`，`ok:true` 就不阻断归档
- `sweep()` 已有的无状态推导（"remote miss 但 local 有 → 补传 → 删 local"）天然接上

**为什么推荐 B**：
- 与 P5-13 `recordEvent` 的 `{ok, persisted, fallbackPath, reason}` 是同一个模式——失败可见、不阻断业务、靠补偿追上
- `sweep` 已经存在，不用新建机制
- metric 告警能及时发现"S3 长期不可用导致 local 无限增长"

**B 的风险**：S3 长期不可用时 local 无限增长。必须有 metric 告警（`local_only` 计数持续上涨 = S3 挂了），不能静默接受。

### 选项 C：静默降级（不可接受）
`put` 失败也返回成功，不区分 `remote`/`local-only`。等于把"审计段只在本地"这件事藏起来，用户以为有 S3 副本但其实没有。**任何时候都不批准。**

### 拍板后落地清单
- [ ] `AsyncWormStore.put` 签名改返回结构化结果（或新增 `putWithStatus` 方法，旧 `put` 保留薄包装）
- [ ] `ResilientWormStore` 透传结构化结果
- [ ] `layered.put` 实现 B 的顺序（先 local 后 remote）
- [ ] seal 调用方读 `ok`，不读 `persisted`
- [ ] Prometheus metric `jlmedaios_worm_local_only_total` 注册 + counter
- [ ] 单测：remote 成功 / remote 失败 / 网络超时三档，断言返回值 shape

