# P5-5 WORM 存储后端抽象 + 跨段 seq 连续性 简报（槽位 0445，墙钟 2026-11-05 04:40）

## commit
- e8a3dd91 feat(security): WormStore 可插拔后端 + seqContinuity
- f51ab5f7 docs: 台账回写
- bdd34fee docs: P5-2 台账历史警示（伪国密首版标注）

## 新增/改动
- 新建 src/bff/aggregators/wormStore.ts（WormStore 接口 + MemoryWormStore + FileWormStore + 路径穿越防护）
- 改 wormArchiveAggregator.ts（改用 store、新增 seqContinuity / storeInfo）
- 改 routes/worm.ts（新增 GET /worm/store/info；非法 segmentId → 400）
- 单测 29 用例（新增 9）；E2E 17 用例（新增 3）
- 台账 P5-2 行更新

## Store 接口
WormStore { kind:'memory'|'fs'; put(seg); get(id); list(); count() }
- MemoryWormStore 默认；FileWormStore 每段落一个 <dir>/<segmentId>.json
- WORM_BACKEND=fs 启用 FileWormStore；WORM_STORE_DIR 指定目录，默认 logs/worm-store（logs/ 已在 .gitignore）

## 路径穿越防护
白名单正则 ^(WORM-\d{4}-[a-z0-9]+|VERIFY-PROBE-\d+-[a-z0-9]+)$ + path.resolve 目录内校验；不匹配 → 400 invalid-segment-id

## seqContinuity
{valid, gaps[{prevToSeq,nextFromSeq,expected,actual}], duplicateSeq[], outOfOrder, startGap?{expected:1,actual:N}}
valid 整体 = realChainValid && seqContinuity.valid && digestValid && signatureValid && !probeBroken

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：29 pass / 0 fail / 61 expect
- E2E 同进程连跑两轮不重启：pid 42928 前后不变，R1 17 pass/0 fail/42 expect，R2 17 pass/0 fail/42 expect
- 品牌 17 词 Ordinal 0 命中
- git status tracked 干净（无额外落盘文件）

## 本人独立实证（不采信自报）
**fs 后端真实落盘**（用真实 FileWormStore 类，临时目录）：
- FILES_ON_DISK=WORM-9001-vertest.json，827 字节，HAS_BOM=false，JSON 可解析
- **WRITE_AFTER_SEAL=BLOCKED_OK**（封存后文件不可改写，WORM 语义成立）
- 新实例同目录读回：NEW_INSTANCE_READ=true，DIGEST_MATCH=true，COUNT=1，KIND=fs（等价"重启不丢"）
- 重复 put → duplicate-segment 被拒
- 3 个穿越串 ../../etc/passwd、..\..\win.ini、WORM-0001-x/../../y 全部被 isValidSegmentId 拒
- 临时目录已清理

**HTTP 层**（直连 8080，admin token）：
- GET /worm/store/info → 200，{kind:memory, segmentCount:4, writable:true, oldestSeq:1, newestSeq:47}
- GET /worm/segments/..%2F..%2Fetc%2Fpasswd → **400 invalid-segment-id**
- POST /worm/verify?scope=real → 200，valid=true / realChainValid=true / digestValid=true / signatureValid=true / seqContinuity{gaps:[],duplicateSeq:[],outOfOrder:false}

## 未覆盖
S3/对象存储适配器（已有 FileWormStore 抽象层，接 S3 只需新增实现）、自动时间窗触发 seal、冷数据查询索引、SM2 密钥轮换与 HSM/KMS