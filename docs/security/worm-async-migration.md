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

**被否决的方案**：在 aggregator 内部把所有调用并行 `Promise.all`（seal 里 put 多个段）——seal 一次只产一个段，没有并行收益，反而引入错误处理复杂度。

---

## Q2. 超时与并发上限放哪一层

**结论：放在 `AsyncWormStore` 的装饰层**，包装 S3 client，不侵入 aggregator、不侵入业务代码。

- 装饰类 `S3WormStoreWithResilience`：构造时包一个 `AsyncWormStore`，每个方法加 `Promise.race([inner.method(), timeout(ms)])`；并发上限用简单的信号量（`p-limit` 风格，自己写 20 行：一个队列 + in-flight 计数）。
- 默认 timeout 5s、in-flight 20。

**为什么不放 aggregator 调用点**：
- aggregator 有 5+ 方法 × 多个路由，每个调用点都写 timeout/并发是重复代码
- 业务语义不应该关心"这次 S3 读要等多久"
- 换后端（比如回本地 fs）时 aggregator 代码不用动

**为什么不放 S3 client 层**：
- 真实 `@aws-sdk/client-s3` 有自己的 retry/timeout 配置（`maxRetries`、`requestTimeout`），但它管的是"单次 HTTP 请求"，管不了"aggregator 并发打 50 个 list"这种应用层并发
- 应用层并发上限必须在 S3 client 之上，否则 S3 SDK 内部并发不受控

---

## Q3. 失败如何回退到本地 fs

**结论：S3 put 失败时，写本地 `FileWormStore` 并打 `[worm] s3 put failed, fell back to local: ...` 警告；读路径合并两边。**

具体：
- **写路径**：`put(segment)` 先写 S3；S3 抛错 → 写本地 `FileWormStore(WORM_STORE_DIR)`，并在内存标记 `pendingUpload.add(segmentId)`。
- **读路径**：`list()` = `S3.list() ∪ Local.list()`，按 segmentId 去重，S3 优先（S3 有的段本地忽略）。`get(id)` 先查 S3，miss 再查本地。
- **后台补传**：一个低优先级 setInterval（如 60s）扫 `pendingUpload`，重试 S3 put，成功后从本地删除该段（或标记已上传）。

**数据一致性后果（说清）**：
- S3 写成功但本地没写 → 正常，无影响
- S3 写失败、本地写成功 → 读路径能读到（本地兜底），但段在 S3 缺失；补传任务负责追上
- S3 写成功、本地也写了（双写窗口） → 读路径 S3 优先，本地那份是冗余，补传任务完成后删本地
- **不允许**：S3 失败直接让 seal 500——那样用户写操作失败，但段可能已经在本地/PG 落了，状态不一致

**被否决的方案**：S3 失败直接 500 让上层重试。理由：seal 是归档操作，失败重试可能造成 pending 事件被重复归档（已有 seq-gap 闸保护，但仍会让用户看到错误）。本地兜底 + 后台补传是最终一致，对用户透明。

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
2. 路由层（`worm.ts`）五个对应 handler 加 await（机械改动）
3. `MemoryWormStore` / `FileWormStore` 包成 `AsyncWormStore`（用已有 `toAsyncStore`），aggregator 构造函数注入 `AsyncWormStore`
4. `S3WormStoreWithResilience` 装饰类（Q2）
5. 双写兜底逻辑（Q3），但**默认不启用 S3**——`WORM_BACKEND=s3` 才走 S3WormStore，否则走现有 fs/memory
6. 单测：aggregator 用 async store 重跑现有所有 wormArchive 用例（Promise 化）

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
