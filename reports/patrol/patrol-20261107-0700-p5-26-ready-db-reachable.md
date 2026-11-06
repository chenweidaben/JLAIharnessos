# P5-26: /ready 真实连通性 dbReachable

**日期**: 2026-11-07

---

## 问题定性

`/ready` 原报 `auditStore=pg` 是**启动期装配结果**，不是当前连通性。库已挂时 `/ready` 仍 `status=ok`、仍报 `auditStore=pg`——**探针说谎**。

## 三态对照（停库 / 拉库原文）

| 状态 | status | auditStore | dbReachable | HTTP |
|---|---|---|---|---|
| 停库 | degraded | unreachable | false | 200 |
| 拉库 | ok | pg | true | 200 |

**停库时 /ready 原文**：
```json
{"status":"degraded","wormBackend":"memory","wormS3Client":"none",
 "wormStoreDir":"(in-process memory; not persisted)",
 "auditStore":"unreachable","dbReachable":false,
 "sealDisabled":true,"sealDisabledReason":"audit-backfill-truncated",
 "uptimeSec":33}
```
HTTP=200

**拉库后 /ready 原文**：
```json
{"status":"ok","wormBackend":"memory","wormS3Client":"none",
 "wormStoreDir":"(in-process memory; not persisted)",
 "auditStore":"pg","dbReachable":true,
 "sealDisabled":true,"sealDisabledReason":"audit-backfill-truncated",
 "uptimeSec":124}
```
HTTP=200

## 设计选择

### 超时方式：Promise.race 2s
选 `Promise.race` 而非 PG `statement_timeout`——连接断时 `statement_timeout` 无意义（连接层就挂了），`Promise.race` 在连接层就超时。

### auditStore 三分支语义
- `pg`：配置 pg 且当前可达
- `unreachable`：曾配置 pg 但当前不可达（不谎称 pg）
- `memory`：装配为内存

### 非生产 vs 生产
- 非生产（NODE_ENV != production）：`status=degraded`，HTTP 200
- 生产（NODE_ENV=production）：`status=fail`，HTTP 503

## 数据完整性
停库前后 `audit.events` 计数均为 **2877**，无数据丢失。BFF PID 46600 全程存活。

## sealDisabled=true 是既有状态
`sealDisabled=true, sealDisabledReason=audit-backfill-truncated` 是因为 `audit.events=2877 > AUDIT_BACKFILL_LIMIT 默认 1000`。**这是 fail-closed 的正确行为，不是停库导致。**

## PG 拉起后不稳定窗口（新发现）
`pg_ctl start` 后 `/ready` 不是立刻绿，验收过程中中间又挂两次 `Connection refused`，重新 `start` 才稳定。**"依赖可用性必须当门禁前置条件"的直接证据**——不能 `start` 完立刻 curl 就下结论。

## 门禁
```
tsc-root   PASS  31s
tsc-web    PASS  58s
gate-unit  PASS  10s (181/0/512)
gate-e2e   PASS  10s (23/0/83)
brand-gate PASS   7s (9816 files, 0 hard, 13 backlog)
OVERALL: PASS exit=0
```
