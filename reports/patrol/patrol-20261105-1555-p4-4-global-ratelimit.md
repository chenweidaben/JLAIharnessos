# P4-4 通用限流全局挂载+login action 特例 简报（15:55 轮）

## commit
- 62deee55 feat(security): read/write 桶全局中间件 + login/logout action 特例 + patientId body 提取
- 59827c6c docs: 台账回写

## 限流参数
read GET 100 req/min/IP；write POST/PUT/PATCH/DELETE 30 req/min/IP；超限 429 + Retry-After
白名单：/health /ready /metrics /livez /version /ws/ /api/v1/health /api/v1/system/health /api/v1/audit/*

## 新增文件
src/bff/middleware/globalRateLimit.ts
src/bff/middleware/auditEventHook.ts（改：PATH_ACTION_OVERRIDE + rawBody patientId）
src/bff/server.ts（+1 行挂中间件）

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：13 pass / 0 fail / 142 expect
- E2E：4 pass / 0 fail / 9 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键实测
login 后审计 action=login（不是 create）；POST /engagement/reports 后审计 patientId 提取正确；/health 白名单不限；read 第 101 次 429 + Retry-After header

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 已活

## 未覆盖
分布式 Redis 限流、Captcha、按租户/科室细分、body 其他敏感字段（drug/orderId）提取、429 响应体标准化