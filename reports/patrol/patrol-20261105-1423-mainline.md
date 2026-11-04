# 14:23 轮主线巡检——P4-2 审计中间件全局埋点独立复测收口

时间：2026-11-05 00:20（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`74100e75`（13:23 轮 P4-1 收口）

## 本轮结论

P4-2 审计中间件全局埋点已由组织智能体 `o_000Rfj7NkAk` 交付（commits `7ff66efa` feat + `df252c1c` docs 台账 + `22949cbc` docs 简报）。主线独立复测全绿，本轮收口。

P4-1 的审计日志底座加上 P4-2 的 after-hook 全局埋点，等保三级合规底座从"可查"升级到"自动覆盖生产操作面"。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/auditEventHook.test.ts ./tests/integration/auditEventHook-e2e.test.ts` | 16 pass / 0 fail / 31 expect（13 unit + 3 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,788 文件 0 命中 |
| BFF 五健康端点 | 全 200 |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

## P4-2 交付物

- `src/bff/middleware/auditEventHook.ts`：Hono after-hook，零侵入业务代码。
- `src/bff/server.ts`：+1 行 finally 块挂 hook。
- 过滤 7 类白名单：GET/HEAD/OPTIONS 跳过；非 `/api/v1/` 跳过；`/audit/` 递归跳过；`/health /ready /metrics /livez /version /ws/` 跳过。
- 映射：method→action（POST=create / PUT/PATCH=update / DELETE=delete）；path→module/resourceType/resourceId；status→result（2xx=success / 401,403=forbidden / 其他=failure）；actor=JWT sub 或 anonymous。
- 实测：POST `/api/v1/engagement/reports` 成功后 `GET /audit/events?module=engagement` 最新一条 = `{action:create, result:success, actorId:ADMIN}`；无 token POST → 审计最新一条 = `{actorId:anonymous, result:forbidden}`；`/audit/_seed` 不递归记录。

## 未覆盖（台账已标注）

login/logout 特殊 action 映射、patientId 从 body 提取、慢操作采样、写失败告警通道。
