# 13:23 轮主线巡检——P4-1 全链路审计日志独立复测收口（等保三级合规底座起步）

时间：2026-11-04 23:55（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`1b16a4e8`（12:23 轮 P3-4 收口）

## 本轮结论

P4-1 全链路审计日志（Audit Event）已由组织智能体 `o_000Rfj7NkAk` 交付（commits `45ca973b` feat + `504c0109` docs 台账 + `11390e1a` docs 简报）。主线独立复测全绿，本轮收口。

P4 方向选定等保三级 + 互联互通四甲 + 电子病历 5 级共同要求的合规底座——全链路审计日志与 SHA256 哈希链。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/auditEvents.test.ts ./tests/integration/auditEvents-e2e.test.ts` | 28 pass / 0 fail / 63 expect（16 unit + 12 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,787 文件 0 命中 |
| BFF 五健康端点 | 全 200 |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

## P4-1 交付物

- AuditEvent 14 字段模型。
- SHA256 哈希链：`hash = SHA256(prevHash + '|' + canonical(payload))`，创世 `prevHash='GENESIS'`。
- 路由：
  - GET `/api/v1/audit/events?actorId&module&action&result&from&to&patientId&limit&offset`（7 维过滤+分页）
  - GET `/api/v1/audit/events/export?format=csv`（admin）
  - GET `/api/v1/audit/events/verify-chain`（admin，遍历重算，异常返 `{valid:false, brokenAt:seq}`）
  - POST `/api/v1/audit/events/_seed`（仅 DEMO_MODE）
- 越权：patient 查审计 403、doctor 查别人 actorId 403、doctor 不能 verify-chain/导出 403；limit>500 400；admin verify-chain `{valid:true, totalEvents:20}`；篡改一条 → brokenAt=seq；CSV 含 header。

## 未覆盖（台账已标注）

既有模块 middleware 埋点（login/logout/开方/发药/终稿/审批/导出的钩子）、WORM 冷存储、SIEM 对接、操作回放与取证。
