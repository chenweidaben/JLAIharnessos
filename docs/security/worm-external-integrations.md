# WORM 外部集成（S3 / SIEM）适配器

> ⚠️ **未联调声明**：本文件描述的 S3 与 SIEM 适配器当前均为 mock 实现，**没有**连接真实 S3 bucket 或真实 syslog endpoint。所有代码路径已通过契约测试，但生产环境接入前必须按下方"联调 checklist"逐项验证。

## 1. S3 WORM 段存储适配器

> **重要前置说明**：现有 `WormStore` 是**同步**接口（`put/get/list/countBySigner` 直接返回值），因为它只服务 `FileWormStore`（本地 fs，同步 API）和 `MemoryWormStore`。S3 是网络 IO，天生异步。因此 `S3WormStore` 实现的是独立的 `AsyncWormStore` 接口（返回 Promise），**与现有同步接口并存**。
>
> 真正接入 S3 前需做一次前置改造：`wormArchiveAggregator` 的调用链（`seal` / `verify` / `listSegments` / `getSegment` / `countBySigner` 回退路径）目前全是同步的，需要改为 async（或引入一个带超时与并发上限的同步桥接层）。**本切片未做这项改造**，所以 S3 只到 mock 契约测试层面。

### 接口契约
`src/bff/aggregators/s3WormStore.ts` 实现 `WormStore` 接口，与 `MemoryWormStore` / `FileWormStore` 行为对齐：

| 方法 | 说明 |
|---|---|
| `put(segment)` | 序列化 JSON 上传到 `s3://<bucket>/<prefix><segmentId>.json`；重复 segmentId 抛 `duplicate-segment` |
| `get(segmentId)` | 本地缓存命中直接返回；否则 S3 getObject 反序列化 |
| `list()` | listObjects 拉全部 key，逐个 get，按 `seq` 排序 |
| `count()` | 缓存大小（非 S3 实时） |
| `countBySigner(keyId)` | put/refresh 时维护的倒排计数 |
| `refresh()` | 清空缓存，重新 list+get，用于校准外部写入 |

### 可注入的 S3Like
```ts
interface S3Like {
  putObject(args: { Bucket; Key; Body }): Promise<void>;
  getObject(args: { Bucket; Key }): Promise<{ Body }>;
  listObjects(args: { Bucket; Prefix }): Promise<{ Keys: string[] }>;
}
```
真实 `@aws-sdk/client-s3` 实现此接口即可切换。单测用 `MockS3Client`（内存 Map）。

### 需要的 env 变量（联调时配置）
- `S3_BUCKET`：bucket 名
- `S3_PREFIX`：key 前缀，默认 `worm/segments/`
- `AWS_REGION`：region
- AWS 凭证通过标准 ~/.aws/credentials 或 IAM role 注入，不写进代码

### 联调 checklist
- [ ] 真实 S3 bucket 已创建，bucket policy 允许 put/get/list
- [ ] `put` 后立即 `get` 回读字节一致（含中文 Unicode）
- [ ] `list` 在 1000+ 段时分页正确（S3 listObjects 默认 1000 key 上限，需要 continuation token）
- [ ] `countBySigner` 在 refresh 后仍准确
- [ ] 网络抖动时 put 有重试（当前 mock 无重试，联调时加）

## 2. SIEM Syslog-CEF 输出

### 格式
```
CEF:0|Jianlan|HospitalOS|1.0|<sigId>|<name>|<severity>|<extensions>
```

| 字段 | 取值 |
|---|---|
| vendor | `Jianlan`（中性名） |
| product | `HospitalOS` |
| version | `1.0` |
| sigId | `WORM_<ACTION 大写>`，如 `WORM_PURGE` |
| name | action 原文（转义后） |
| severity | result=ok → `5`；其他 → `3` |
| extensions | `src=<ip> suser=<actorId> act=<action> outcome=<result> cs1Label=module cs1=<module> rt=<ISO时间> msg=<detail?>` |

### 转义规则（CEF 最易错）
- `|` → `\|`
- `\` → `\\`
- 换行 `\r\n` / `\n` → 空格（一条事件一行）

单测已覆盖：字段含 `|`、`\`、换行均正确转义。

### SyslogExporter 接口
```ts
interface SyslogExporter {
  send(events: AuditEventLike[]): Promise<{ sent: number; failed: number }>;
}
```
当前 `MockSyslogExporter` 把所有报文存内存数组。真实实现应走 RFC3164/RFC5425 UDP/TCP/TLS。

### 重试策略
当前 mock **不重试**。联调时建议：失败指数退避（1s/2s/4s，最多 3 次），超过后计入 `failed` 并落本地死信队列（磁盘）。

### 需要的 env 变量（联调时配置）
- `SIEM_SYSLOG_HOST`：syslog server 地址
- `SIEM_SYSLOG_PORT`：端口
- `SIEM_SYSLOG_PROTOCOL`：udp / tcp / tls
- `SIEM_CEF_VENDOR_OVERRIDE`（可选）

### 联调 checklist
- [ ] 一条事件发出后，SIEM 平台能解析出 CEF 头与全部 extensions
- [ ] 字段含 `|`、`\`、换行时 SIEM 不报错、不串条
- [ ] 批量 100 条 → SIEM 收到 100 行，无合并、无截断
- [ ] SIEM 不可达时 exporter 返回 failed 计数，不阻塞主流程
- [ ] 重试 3 次后失败的事件进死信队列，重启可重放

## 3. 未联调边界
- S3：当前没有真实 bucket 连接；`S3WormStore` 构造需要传入 `S3Like`，生产 wiring 未在 `server.ts` 里接
- SIEM：当前没有真实 syslog 连接；`MockSyslogExporter` 仅在测试里用，主流程未调用
- 两个适配器都**不应该**在生产 env 里被自动启用，必须显式 wiring 并打日志声明"已联调"
