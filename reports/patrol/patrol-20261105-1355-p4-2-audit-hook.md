# P4-2 审计中间件全局埋点 简报（13:55 轮）

## commit
- 7ff66efa feat(audit): after-hook 接入生产操作面
- df252c1c docs: 台账回写

## 新增文件
src/bff/middleware/auditEventHook.ts（过滤+映射+提取）
src/bff/server.ts（+1 行 finally 块挂 hook）
tests/unit/auditEventHook.test.ts（13 用例）
tests/integration/auditEventHook-e2e.test.ts

## 过滤规则
GET/HEAD/OPTIONS 跳过；非 /api/v1/ 跳过；/audit/ 递归跳过；/health//ready//metrics//livez//version//ws/ 跳过

## 映射
method→action：POST=create/PUT/PATCH=update/DELETE=delete
path→module/resourceType/resourceId
status→result：2xx=success/401,403=forbidden/其他=failure
actor=JWT sub 或 anonymous

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：13 pass / 0 fail / 20 expect
- E2E：3 pass / 0 fail / 11 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键实测
POST engagement/reports 成功后审计可查 {action:create,result:success}；无 token POST → 审计 {actorId:anonymous,result:forbidden}；/audit/_seed 不递归记录

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 已活

## 未覆盖
login/logout 特殊 action 映射、patientId 从 body 提取、慢操作采样、写失败告警