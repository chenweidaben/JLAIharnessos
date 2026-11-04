# P4-5 操作回放与取证包导出 简报（16:55 轮）

## commit
- 18e882a4 feat(security): replay + 取证包 + JSON/CSV 下载
- 008dd003 docs: 台账回写

## 新增路由
GET /api/v1/forensic/replay?actorId&from&to&limit&offset
GET /api/v1/forensic/replay-by-patient?patientId&from&to
POST /api/v1/forensic/packages
GET /api/v1/forensic/packages/:id
GET /api/v1/forensic/packages/:id/download?format=json|csv

## 取证包字段
packageId / generatedBy / generatedAt / query / eventCount / hashChainValid / events[]（不可变）

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：12 pass / 0 fail / 21 expect
- E2E：11 pass / 0 fail / 19 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键实测
admin replay actorId=admin 非空；replay-by-patient 匹配；actorId/patientId 都不给 400；doctor replay 自己 OK 别人 403；doctor 生成包 403；admin 生成包 hashChainValid=true；packageId 不存在 404；CSV 含 header

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 已活

## 未覆盖
取证包 SM2 签名、长期归档对象存储、包访问本身审计、按 IP/UA 回放、批量打包多患者