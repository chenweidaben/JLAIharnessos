# 17:23 轮主线巡检——P4-5 操作回放与取证包导出独立复测收口

时间：2026-11-05 03:10（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`b59915d5`（16:23 轮 P4-4 收口）

## 本轮结论

P4-5 操作回放与取证包导出已由组织智能体 `o_000Rfj7NkAk` 交付（commits `18e882a4` feat + `008dd003` docs 台账 + `23633474` docs 简报）。主线独立复测全绿，本轮收口。

P4-1 审计底座 + P4-2 after-hook 全局埋点 + P4-3/P4-4 访问控制 + P4-5 操作回放取证，等保三级"操作可追溯"硬要求闭环。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/forensicExport.test.ts ./tests/integration/forensic-e2e.test.ts` | 23 pass / 0 fail / 40 expect（12 unit + 11 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,793 文件 0 命中 |
| BFF 五健康端点 | 全 200 |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

注：首跑用 `forensicExport-e2e.test.ts` 文件名报 ModuleNotFound，实际 E2E 文件名为 `forensic-e2e.test.ts`（`Get-ChildItem tests -Recurse -Filter "*forensic*"` 已确认），改名后复跑全绿。

## P4-5 交付物

- 路由：
  - GET `/api/v1/forensic/replay?actorId&from&to&limit&offset` 按用户回放
  - GET `.../replay-by-patient?patientId&from&to` 按患者反查
  - POST `/api/v1/forensic/packages` 生成取证包（自动 verify-chain）
  - GET `.../packages/:id` 包元信息
  - GET `.../packages/:id/download?format=json|csv` 下载
- 取证包字段：`packageId`（FP-<ts>-<n>）/ `generatedBy` / `generatedAt` / `query{actorId,patientId,from,to}` / `eventCount` / `hashChainValid` / `hashChainBrokenAt?` / `events: AuditEvent[]`；Map 只 set 不 update，无删除端点（不可变）。
- 实测：admin replay actorId=admin → total>0；replay-by-patient → rows[0].patientId 匹配；actorId/patientId 都不给 → 400；doctor replay 自己 200、replay 别人 403；doctor 生成取证包 403；admin 生成包 → `hashChainValid=true`；packageId 不存在 → 404；CSV 首行含 header。

## 未覆盖（台账已标注）

取证包 SM2 签名、长期归档（对象存储/PG 持久化）、包访问本身的审计（谁下载了取证包）、按 IP/UA 维度回放、批量打包多患者。
