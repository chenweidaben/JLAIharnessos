# 16:23 轮主线巡检——P4-4 通用限流全局挂载 + login action 特例独立复测收口

时间：2026-11-05 02:05（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`8c06b9ec`（15:23 轮 P4-3 收口）

## 本轮结论

P4-4 通用限流全局挂载 + login action 特例已由组织智能体 `o_000Rfj7NkAk` 交付（commits `62deee55` feat + `59827c6c` docs 台账 + `9cd4397f` docs 简报）。主线独立复测全绿，本轮收口。

P4-3 留下的"通用 read/write 桶纯函数已实现但未全局挂载"尾巴收掉，等保三级访问控制层闭环。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/globalRateLimit.test.ts ./tests/integration/globalRateLimit-e2e.test.ts` | 17 pass / 0 fail / 151 expect（13 unit + 4 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,791 文件 0 命中 |
| BFF 五健康端点 | 全 200 |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

## P4-4 交付物

- `src/bff/middleware/globalRateLimit.ts`：read 100/min/IP、write 30/min/IP，超限 429 code=42900 + Retry-After。
- 白名单：/health /ready /metrics /livez /version /ws/、/api/v1/health、/api/v1/system/health、/api/v1/audit/*（审计查询不限流）。
- `auditEventHook.ts`：PATH_ACTION_OVERRIDE 让 /auth/login、/auth/logout、/auth/_demo-login 审计 action=login/logout（不再是 create）；rawBody 提取 patientId 写入审计事件。
- server.ts：+1 行挂 globalRateLimit 中间件。
- 实测：POST /auth/login 错密码后审计 `action=login`；POST /engagement/reports 带 patientId 后审计含该 patientId；/health 白名单不限流；read 第 101 次 429 + Retry-After header。

## 未覆盖（台账已标注）

分布式 Redis 限流、Captcha 二次校验、按租户/科室维度细分限流、body 中其他敏感字段（drug/orderId）提取、429 响应体标准化。
