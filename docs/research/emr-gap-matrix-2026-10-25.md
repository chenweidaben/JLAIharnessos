# 健澜AI原生医院操作系统OS · 电子病历（EMR）模块只读取证与合规对标差距矩阵

- 审计对象：健澜AI原生医院操作系统OS（Jianlan AI-Native Hospital OS），根 `package.json` `name=jlmedaios`，署名「健澜科技（杭州健澜科技有限公司）」，license Apache-2.0。
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`；分支 `consult-agent-m86`。
- 取证基线 HEAD（任务固定事实）：`d0c2d79756cacd75960bd7563ba8d9b186127270`；本轮取证时工作区检出 HEAD 为 `cc7601386caf36a2c6039fffa4334f82a516a4cb`，其间并行会话产生的 consult-agent 相关提交 / 未跟踪改动与 EMR 模块无关，未纳入本轮复核；本轮仅只读工作区现有文件。
- 取证日期：2026-10-25；审计角色：医疗信息系统审计员（只读静态取证）。
- 取证性质：本轮为**静态代码取证**，未启动全栈服务、未执行构建或全量测试；本机无 Maven / Docker / JDK21 / PostgreSQL / Redis / LLM 凭证，所有运行时行为判断均基于源码、SQL 迁移与测试源码的静态阅读。
- 品牌口径：本文档产品正式名统一为「健澜AI原生医院操作系统OS」；不出现其他旧称或错误写法；文档内不写入任何密码、token 或真实连接串。

---

## 一、取证方法与基线说明

### 1.1 扫描范围与方法

- 扫描目录（排除 `node_modules`、`pgsql`、`pgdata`、`dist`、`coverage`、`.venv`）：
  - 后端路由：`src/bff/routes/`；聚合器：`src/bff/aggregators/`；仓储：`src/db/repositories/`；中间件：`src/bff/middleware/`；配置：`src/bff/config/`；租户域：`src/tenant/`；安全域：`src/security/`。
  - 前端：`web/src/pages/`、`web/src/services/api/`。
  - SQL 迁移：`deploy/postgres/init/`。
  - 测试：`tests/integration/`、`tests/unit/`。
- 取证方法：仅使用只读操作（`Read` 逐文件复核、`Grep` / `Select-String` 静态检索、PowerShell 只读计数）；未修改 `src/`、`web/`、`tests/`、`deploy/` 任何产品源码；未执行 git push / tag；未新建定时任务；除本文档外未写入其他文件。
- 能力分级口径：
  - **真实落地**：路由 → 聚合器 → 仓储 → PostgreSQL 表已接通，状态机/事务/行锁在源码中可见。
  - **内存 mock**：路由权限码守卫存在，但处理逻辑为纯函数 + 内存种子 / `Map` / 数组，不引用仓储、不连库。
  - **仅接口定义**：路由或数据表已存在，但运行时未实现、未接线，或仅有表结构而无业务路由。
  - **未取证**：在本轮静态扫描范围内未找到对应实现，不等于生产环境绝对不存在。

### 1.2 基线文档（只读复核）

- `docs/COMPLIANCE_BLUEPRINT.md`（M247 研发基线）：六条生产化缺口（文档第 68–73 行）：
  1. 关闭 DEMO_MODE 接真实 RBAC；
  2. 病历正文 append-only 写入层拦截 + 版本链；
  3. 审计 WORM / 哈希链；
  4. 多租户 RLS + 越权测试；
  5. 密钥轮换 + refresh token；
  6. 导出 / 批量接口逐字段脱敏拦截。
  蓝图第 40–62 行自评：append-only 70%、PHI 85%、审计 90%、多租户 65%、JWT 95%、DEMO 80%（开发态）；并自述 DB 层 append-only 触发器待补（27/42 行）、WORM 待补（29/50 行）、RLS 全量待补（30/54 行）、密钥轮换与 refresh 待补（58 行）、真实流量逐字段脱敏拦截待补（46 行）。
- `docs/COMPLIANCE.md`：append-only 清单 43–58 行；审计保留 ≥180 天 60–63 行；病历哈希链 + CA 签章 + TSA 时间戳 89–95 行；SM2/SM3/SM4 当前为 mock 预留 96–102 行；FHIR R4 仅 4 类资源、生产接 HAPI FHIR Server 104–108 行——本轮代码取证显示其中多数仍为规划态 / 未落地，详见第二节矩阵与第三节深描。
- `reports/2026-10-25-架构与全栈审计整改报告.md`、`reports/patrol/patrol-20261025-2313.md`：两份报告中的历史遗留失败与 P2 债在第四节单独登记，标注「基线遗留，非本轮新增发现」，不归因本轮取证。

### 1.3 环境限制

- 未启动 PostgreSQL / Redis / BFF / 前端，未执行 `bun test`、`bun run build`、覆盖率统计；集成测试源码内 `skipIf` 无 DB 守卫均未在本轮运行。
- 前后端端点一致性结论为**静态代码比对，未联调验证**；接口契约、运行时错误码、并发行为需在具备数据库与凭证的环境复测。
- 法规条款引用以现行公开规范名称为准；条款归属不确定处标注「待法规分片核对」，不作过度断言。

---

## 二、差距矩阵总表

> 列说明：流程域｜现状证据（仓库相对路径:行号，或路由名 / 页面目录名 / SQL 文件名）｜已有能力（真实落地 / mock / 仅接口定义）｜缺口｜对应法规 / 标准条款｜优先级。
> 优先级口径：P0 对齐 `COMPLIANCE_BLUEPRINT.md` 六条生产化缺口；P1 为标准互通（FHIR / HL7 / CDA / 术语映射）与质控深化；P2 为高级别评级（电子病历 6 级 / 互联互通五乙）与 AI 决策支持深化。

### 2.1 跨切 P0 能力域（六条蓝图缺口对应行）

| 流程域 | 现状证据（路径:行号 / 路由 / SQL） | 已有能力 | 缺口 | 对应法规 / 标准条款 | 优先级 |
|---|---|---|---|---|---|
| 认证、DEMO_MODE 与 RBAC（P0-①） | `src/bff/middleware/auth.ts:171-181`（requireAuth：非生产 DEMO_MODE 短路为 demo admin，roles=['admin']、permissions=['*']，173-175；生产不短路）；`auth.ts:184-197` requireRole；`auth.ts:314-326` requirePermissionCode（admin 角色恒通过 318；显式码匹配 319；分组码通配 321；否则 403 322-325；守卫内不含就诊 / 患者归属校验）；`src/bff/config/runtimeEnv.ts:17-19、22-25、31-37`（生产 + DEMO 启动即抛错）；`src/bff/routes/auth.ts:112-118`（真实模式只按用户名 + active 查用户，无口令比对）、`auth.ts:183`（注释「试用构建不校验生产口令哈希，统一放行已存在账号」）、`auth.ts:189-198` 失败台账；`src/db/repositories/userRepo.ts:17`（SELECT_COLS 不含 password_hash）、`37-49`；`src/security/encryption/HashUtils.ts:248、271`（verifyBcryptHash / verifyArgon2Hash 仅定义，235-236 注释自述 PBKDF2 模拟 bcrypt 格式）；全仓 Grep 仅命中定义与再导出（`security/index.ts:170-171`、`encryption/index.ts:29-30`），无业务调用；`src/bff/server.ts:6767-6840` 中间件顺序（attachUser 6767、enforceSession 6769、rateLimit 6775、verifyCsrf 6782、tenantContextMiddleware 6789、路由匹配 6795-6828、医护白名单 6811-6817、日志 6837-6840） | 真实落地：JWT 签发 / 校验、会话台账、refresh 轮换、CSRF cookie、登录限流、失败台账；内存 / 缺口态：临床员工登录路径不做口令哈希比对；DEMO_MODE 开发态短路；admin 角色绕过权限码；无就诊 / 患者归属行级校验 | 生产口令哈希核验未接线；RBAC 仅角色 + 权限码，缺科室 / 病区 / 患者 / 就诊数据归属维度；admin 恒通过；多数临床主路由仅登录无独立权限码（见 2.2 各行）；口令哈希实现仍为 PBKDF2 模拟格式，未接真 bcrypt / argon2 库 | 网络安全法第二十一条身份鉴别；等保 2.0 身份鉴别与访问控制（GB/T 22239-2019，条款号待法规分片核对）；电子病历分级评价权限管理条款（国卫办医函〔2018〕1079号，待法规分片核对） | P0 |
| 密钥轮换与 refresh token（P0-⑤） | `src/bff/routes/auth.ts:149-168` issueTokens（access 7200s 161、refresh 7d 162；jti 双发 151-152）；`auth.ts:246-287` refresh（251 verifyJwt；257-263 查会话台账；264 loadViewById；269 轮换；271 吊销旧 refresh jti；273 旧 access 标记失效；274 登记新会话；isDemo 跳过 257/270）；`src/bff/middleware/auth.ts:68-81` signJwt（alg 固定 HS256 72、HMAC 单钥 79、默认 7200s 70）、`84-116` verifyJwt（timingSafeEqual 98-101；nbf/exp 113-114）、`47-57` getJwtSecret（生产必须 JWT_SECRET 否则 53 行 throw；开发态默认弱密钥 56 仅 console.warn 55）；`deploy/postgres/init/250-api-keys.sql:43-60、71、74`；`251-webhooks.sql:66`（webhooks.secret 明文列） | 真实落地：refresh token 轮换 + 旧 jti 吊销 + 会话台账；JWT 单 HS256 单钥；API key 哈希存储已设计（key_hash 46） | 缺口：无密钥版本号 / 双密钥过渡 / 历史密钥归档轮换机制；webhook secret 明文；未见密钥轮换计划与轮换审计留痕 | 等保 2.0 密码管理条款（GB/T 22239-2019，待法规分片核对）；网络安全法第二十一条；个人信息保护法访问控制 | P0 |
| 导出 / 批量接口逐字段脱敏拦截（P0-⑥） | `src/bff/routes/emrExportV14.ts:18`（内存 exportState 数组）、`26/37`（权限码 emr-export:read/write）、`46-58`（POST 创建上报任务，buildExportPayload 46-52、validateExportSchema 53、push 57；payload 无逐字段脱敏拦截）；`emrDataExportV14.ts:22/36、26-27、39`（状态恒 pending，不查真实库）；`emrMaskingV14.ts:15`（硬编码 demoNote，含姓名 / 手机 / 身份证明文样例）、`23`、`29-30`（maskByRole 纯函数，返回 original+masked，未接真实病历正文）；`emrDeidentifyOutputV14.ts:24/35、38-42`（仅处理 name/idCard/phone 三字段，内存）；`emrFineGrainedAuthV14.ts:24/35、38-43`（角色 / 允许字段 / 请求字段由 body 传入，无 DB 角色-字段绑定表）；`src/bff/utils/mask.ts:25-30、45-53、66-74、77-84、86、88、103-126`（maskBody 递归，仅字段名命中三族即掩码；地址 / 邮箱 / 医保卡号 / 紧急联系人 / 签名图像 / 病历正文不处理；未命中字段名原样保留）；独立 dataMaskingAggregator 另有一套角色差异脱敏（admin 全量 / doctor·nurse·patient 脱敏；地址截断到区 / 街道；嵌套对象与数组递归、大小写不敏感字段名；单测 `tests/unit/dataMasking.test.ts`）；审计日志 maskBody 走窄版 `utils/mask.ts` | mock：V14 导出 / 脱敏 / 字段授权均为内存纯函数；真实落地：通用字段名脱敏工具与角色差异聚合器（未接导出 / 批量出口） | 导出 / 批量 / 打印 / 下载出口无统一逐字段脱敏拦截层；两套脱敏实现并存且规则口径不一；病历正文、地址、邮箱、医保卡号、紧急联系人、签名图像未纳入脱敏字段集；无按角色-字段-场景的集中配置；无导出行为审计与水印追溯 | 个人信息保护法最小必要与敏感个人信息条款；数据安全法；医疗机构病历管理规定复印留痕条款（国卫医发〔2013〕31号）；等保 2.0 数据保密性（GB/T 22239-2019） | P0 |

### 2.2 病历全流程 29 个流程域

| # | 流程域 | 现状证据（路径:行号 / 路由 / SQL） | 已有能力 | 缺口 | 对应法规 / 标准条款 | 优先级 |
|---|---|---|---|---|---|---|
| 1 | 门诊记录 | `deploy/postgres/init/21-clinical-diagnoses.sql:20-26`（clinical.diagnoses：code ICD-10 20、name 21、kind primary/secondary/differential 22-23、confirmed 24、doctor_id 26；visits.consultation_detail jsonb 38-39）；`20-clinical.sql:65-84`（clinical.medical_records，record_type 含 outpatient 10）；`src/bff/aggregators/outpatientAggregator.ts`（本轮实测 chain=0、repoRef=8，未接哈希链）；`src/bff/routes/medicalRecordV13.ts:20-23`（records 硬编码两条内存样例）、`27-39`（auth:true 29、medical-record:read 31、三个比率纯函数 34-36，不连库）；`outpatient.ts`、`outpatientRegister.ts`、`patientCare.ts`、`inpatientGeneral.ts` 为 auth:false 演示路由（本轮批量扫描命中 auth:false 清单） | 真实落地：诊断表与门诊 / 住院病历主表结构；内存 mock：门诊病历 V13 统计路由与多个门诊演示路由 | 门诊病历书写 / 保存 / 签名主路由未取证到与 medical_records 表接通；门诊病历修改留痕、复诊时限、主诉病史规范要素校验未取证；门诊病历集中归档与保管年限管理未取证 | 《病历书写基本规范》门诊病历章节（卫医政发〔2010〕11号）；《医疗机构病历管理规定（2013年版）》（国卫医发〔2013〕31号） | P1 |
| 2 | 住院病案首页 | `src/db/repositories/medicalHeaderRepo.ts:13-46`（upsert ON CONFLICT DO UPDATE 覆盖 33-42；patient_name 24/34、id_card 24/35 明文落库）、`48-52`、`54-61`、`63-70`（verify 仅 completed→verified 守卫 67）；`src/bff/routes/medicalHeader.ts:25-30`（auth:true 25、isDemo 27）、`31-35`、`36-40`（仅登录无独立权限码）；`src/db/repositories/frontPageRepo.ts:274-322`（transitionFrontPage：FOR UPDATE 283-286、版本号乐观锁 289、状态白名单 290、version+1 292）、`345-379`（insertFrontPageReview 业务哈希链：锁链头 350-356、prevHash 357、signHash 360、INSERT 368-377）；`src/bff/aggregators/frontPageAggregator.ts`（本轮实测 chain=5、repoRef=5，已入链）；`191-medical-header.sql:5、8`（patient_name、id_card 明文列）；`53-medical-record-front-page.sql`（clinical.medical_record_front_pages + front_page_reviews） | 真实落地：首页仓储 + 状态机 + 乐观锁 + 评审业务哈希链 | 表头表明文存姓名 / 身份证明文；首页 upsert 在非终态可被覆盖且无历史快照；前端 `/api/v1/medical-records/homepages` 后端无对应路径（静态比对，未联调）；首页质控缺陷闭环、编码完整性校验与费用一致性校验深度待核 | 病案首页填写规范（文号待法规分片核对）；电子病历分级评价首页质量条款（国卫办医函〔2018〕1079号） | P1 |
| 3 | 入院记录 | `src/db/repositories/admissionNoteRepo.ts:10-14`、`16-36`（upsert ON CONFLICT (visit_id) DO UPDATE 覆盖 27-32，无状态守卫）、`38-42`（submit draft→submitted 守卫 40）、`44-48`（verify submitted→verified 守卫 46）；`src/bff/routes/admissionNote.ts:25、31、36、41`（/admission-notes，auth:true，仅登录无独立权限码）；`184-admission-note.sql`（clinical.admission_notes，admission_note:write/verify） | 真实落地：入院记录仓储 + submit/verify 状态守卫 | 草稿期 upsert 覆盖无版本快照、无正文哈希；verified 后禁止改写仅靠应用层状态分支，仓储层无 UPDATE 拦截；病史完整要素（主诉 / 现病史 / 既往史 / 体格检查 / 初步诊断 / 诊疗计划）必填与逻辑校验规则未取证 | 《病历书写基本规范》入院记录章节（卫医政发〔2010〕11号） | P1 |
| 4 | 病程记录 | `src/db/repositories/progressNoteRepo.ts:9-19`（create）、`21-25`（listByVisit）、`27-34`（sign draft→signed 守卫 31；无正文二次编辑接口、无历史表）；`src/bff/routes/progressNote.ts:25-30`（demo 27）、`31-35`、`36-40`；`185-progress-note.sql`（clinical.progress_notes）；`src/db/repositories/medicalRecordRepo.ts:72-84`（updateMedicalRecordStatus WHERE 仅 id AND deleted_at IS NULL 81，无状态迁移守卫；signed_at/signed_by COALESCE 不覆盖 79-80）、`87-100`（updateMedicalRecordContent WHERE 无状态条件 98，正文可覆盖、version+1 97，旧正文不落历史表） | 真实落地：病程记录 create-only + 签名守卫；缺口态：综合病历正文更新接口无状态守卫与历史链 | 病程 / 综合病历正文在 signed 后仍可经 updateMedicalRecordContent 覆盖（无状态条件、无历史表、无哈希链）；上级医师查房、阶段小结、会诊记录等类型区分与时限规则未取证；前端 `/api/v1/progress/notes` 后端无对应路径（静态比对） | 《病历书写基本规范》病程记录章节（卫医政发〔2010〕11号）；电子病历分级评价修改留痕要求（国卫办医函〔2018〕1079号） | P0（并入 P0-②） |
| 5 | 手术记录 | `src/db/repositories/surgeryRecordRepo.ts:12-31`（create）、`33-37`（listByVisit）、`39-46`（complete draft 守卫 43）、`48-55`（sign completed 守卫 51-52；签名仅 signed_by 工号 / UUID 文本，无证书）；`src/bff/routes/surgeryRecord.ts:22-26、27-31、32-36`；`190-surgery-record.sql`（clinical.surgery_records，surgery_record:write/sign）；`61-surgery.sql`（clinical.surgery_requests + anesthesia_records + intraop_events + pacu_assessments，surgery:view/schedule/precheck/anesthesia/discharge）；`179-surgical-checklist.sql`；`219-surgery-checklist.sql`（surgery.safety_checklist）；`src/bff/routes/surgeryChecklist.ts:27-38、39-50`；`src/db/repositories/surgicalChecklistRepo.ts:47-55、69-86`（updateStage WHERE id 83，无阶段顺序守卫） | 真实落地：手术记录仓储 + complete/sign 状态守卫；手术申请 / 麻醉 / 术中事件 / PACU 表结构 | 手术记录签名无证书 / 时间戳；安全核查三阶段（signin / timeout / signout）无先后顺序守卫；手术编码 ICD-9-CM-3 关联、术前讨论与手术知情同意联动未取证；前端 `/api/v1/surgery/records` 由 `m336Routes.ts:71` 内存演示路由承接，与主路由 `/surgery-records` 路径不一致（静态比对，未联调） | 《病历书写基本规范》手术记录章节；手术安全核查制度（卫办医政发〔2010〕41号）；ICD-9-CM-3 编码规范（待法规分片核对） | P1 |
| 6 | 麻醉记录 | `src/bff/routes/anesthesia.ts:17-29`（GET /anesthesia/report，auth:true 19、anesthesia:view 21、buildAnesthesiaReport 26 纯函数 db=0）；`61-surgery.sql` anesthesia_records 表结构；前端 `anesthesiaRecordV2M638.ts`→`/api/v1/anesthesia/records`，由 `m198Routes.ts:107`、`m287Routes.ts:98` 内存演示承接（静态比对）；未取证到麻醉记录书写 / 签名仓储路由 | 仅接口定义：表结构存在 + 统计报表纯函数；内存 mock：演示路由 | 麻醉记录书写、术前访视、麻醉记录单、术后随访的落库与签名闭环未取证；麻醉风险评估、术中用药 / 输血 / 出入量记录、危急值联动未取证 | 《病历书写基本规范》麻醉记录章节（卫医政发〔2010〕11号，具体条款待法规分片核对） | P1 |
| 7 | 护理记录 | `src/db/repositories/nursingRecordRepo.ts:11-30`（create-only）、`32-39`（listByVisit）；无状态 / 签名 / 版本 / 锁定；`src/bff/routes/nursingRecord.ts:25-30`（demo [] 27）、`31-35`；`189-nursing-record.sql`（clinical.nursing_records，nursing_record:write/view）；`98-nursing-admin.sql`（五张护理管理表，nursing_admin:*）；`99-nursing-risk-warning.sql`（风险评估 / 预防 / 事件，nursing_risk:read/assess/execute）；`103-nursing-io.sql`（clinical.nursing_io_records，nursing_io:read/write）；`102-event-review.sql`（clinical.nursing_event_reviews）；`228-nursing-risk-pattern.sql`（medmuse.nursing_risk_pattern）；`364-nursing-deep.sql`（nursing 五张深度表）；`pdaNursing.ts`、`tests/integration/mobileNursing.test.ts`、`nursingAdmin`、`nursingEventReview`、`nursingIntervention`、`nursingIo`、`nursingRisk` 集成测试（28 个 EMR 集成测试清单内） | 真实落地：一般护理记录 create-only 落库；护理风险 / 出入量 / 事件评审等表与部分仓储（前轮复核） | 护理记录无签名 / 审核 / 版本 / 锁定，生命体征二次录入无拦截；护理级别变更、跌倒 / 压疮风险评估与护理措施闭环字段深度待核；前端 `/api/v1/nursing/records` 由 `m204Routes.ts:181` 内存演示承接（静态比对） | 《病历书写基本规范》护理文书章节（卫医政发〔2010〕11号）；电子病历分级评价护理模块条款（待法规分片核对） | P1 |
| 8 | 医嘱 | `src/db/repositories/orderRepo.ts:46-60`（create）、`62-77`（createInpatientOrder 事务）、`79-89`、`91-111`、`113-117`、`119-127`（cancel active/pending_review 守卫 122-124）、`129-136`（reviewOrder 132 pending_review）、`138-145`、`148-155`（stopOrder 152 active）、`157-163`（updateOrderStatus 无状态守卫自由迁移，WHERE id 161）、`166-175`、`177-181`、`183-187`；`src/bff/routes/order.ts:25-30`（demo [] 27）、`31-35`、`36-43`、`44-51`、`52-57`（demo [] 54）；`188-orders.sql`（clinical.orders + order_executions，order:write/cancel/execute）；`104-order-cds.sql`（clinical.order_cds_alerts，cds:read/override）；`100-med-admin.sql`（clinical.med_administrations）；`196-medication-review.sql`（clinical.medication_reviews）；`tests/integration/orderCds.test.ts` | 真实落地：医嘱创建 / 取消 / 复核 / 退回 / 停止 / 执行状态机（大部分带守卫）+ 医嘱执行记录 | updateOrderStatus 无状态守卫可自由迁移；医嘱正文（药品 / 剂量 / 频次 / 途径）开出后修改留痕未取证；CPOE 闭环（医嘱-执行-复核-签名）与双人核对标识部分表存在；CDS 提醒覆盖、override 留痕与阻断策略深度待核 | 《病历书写基本规范》医嘱章节；《处方管理办法》（卫生部令第53号）；电子病历分级评价医嘱管理条款（待法规分片核对） | P1 |
| 9 | 处方 / 处方点评 | `src/db/repositories/prescriptionRepo.ts:11`（draft/pending_review/approved/rejected/dispensed/cancelled）、`32-33`、`65-69`、`71-92`（事务 INSERT 74、明细 84）、`94-101`、`103-117`、`119-131`（auditPrescription 125-127 pending_review 守卫）、`133-137`（dispensePrescription 136-137 approved 守卫）；无批准后正文编辑；无证书签名列；`src/bff/routes/prescriptionReview.ts:35-39、40-44`（仅登录无独立权限码）；`27-prescription-dispensing.sql`（clinical.prescription_dispensings + inventory_movements）；`218-prescription-review.sql`（clinical.prescription_review）；`346-pharmacy-deep.sql`（调剂事件 / 审方任务 / 不良事件）；`367-pharmacy-mgmt.sql`（采购 / 验收 / 审方 / ADR 等七表）；`tests/integration/scenario5-prescription-audit.test.ts` | 真实落地：处方头明细事务写入 + 药师审核状态守卫 + 发药守卫 | 处方批准后正文不可改由状态守卫部分保证，但无处方版本 / 修改留痕；处方点评（合理用药点评、科室排名、异常处方预警、点评结果反馈整改）以表结构为主，点评工作流落库链路未逐域取证；处方签名为账号标识，无可靠电子签名 | 《处方管理办法》（卫生部令第53号）；《医疗机构处方审核规范》（国卫办医发〔2018〕14号）；处方点评管理规范（文号待法规分片核对） | P1 |
| 10 | 检验检查报告接入 | `91-lis-workflow.sql`（clinical.lab_panels/items/panel_items/requests/request_items/specimens/reports 七表）；`92-ris-workflow.sql`（clinical.imaging_exams/devices/device_slots/requests/request_items/appointments/studies 七表）；`57-lab-interpretation.sql`（clinical.lab_interpretations，lab:interpret:view/sign）；`58-critical-value-loop.sql`（clinical.critical_value_alerts，critical:view/ack/resolve）；`93-ai-interpretation.sql`（clinical.imaging_interpretations，imaging:interpret:view/sign）；`src/db/repositories/labInterpretRepo.ts:215-263`（ON CONFLICT (visit_id, audience) DO UPDATE 239，状态重置 pending_review 255）、`345-371`（setStatus FOR UPDATE 355 + 白名单 359）、`304-317`（DEMO_MODE 种子三条）；`src/db/repositories/imagingInterpretRepo.ts:160-198`（ON CONFLICT 182）、`279-305`（FOR UPDATE 289 + 白名单 293）、`241-254`（DEMO 种子）；`src/bff/routes/labInterpret.ts:77-89`（lab:interpret:view 80、auth:true 88）、`91-98`、`100-104`、`106-110`、`112-118`；`src/bff/routes/imagingInterpret.ts:78-90`（imaging:interpret:view 81、auth:true 89）、`91-99`、`100-107`、`108-113`、`114-121`；`src/bff/routes/integrationHl7.ts:87-119`（auth:true 89、纯函数解析 100、persistParseLog best-effort 103、isDemo 跳过 logged 108、raw_message 明文落 315 日志表）、`122-135`（auth:true 124、白名单仅 Patient/Observation/MedicationRequest 129-133）；`315-integration-hl7.sql`（integ.hl7_message_log）；`lisAggregator.ts`、`risAggregator.ts` 已入哈希链（本轮 75 聚合器清单内） | 真实落地：LIS/RIS 表结构、检验 / 影像 AI 解读仓储（行锁 + 状态白名单）、危急值表、HL7 解析函数与日志表 | 检验检查原始报告经 LIS/RIS 接口自动接入的在线收发网关未取证到（HL7 消息以内存样例为主）；危急值闭环通知 / 确认 / 追踪时限规则深度待核；解读重新生成覆盖无历史版本；报告数据归属科室校验未在仓储层体现 | 《医疗机构病历管理规定》；互联互通标准化成熟度测评；HL7 v2 / FHIR R4；危急值报告制度（配套制度条款待法规分片核对） | P1 |
| 11 | 出院小结 | `src/db/repositories/dischargeSummaryRepo.ts:20-26`、`28-50`（upsert ON CONFLICT DO UPDATE 覆盖 41-46）、`52-59`（submit draft→submitted 56）、`61-68`（verify submitted→verified 65）；`src/bff/routes/dischargeSummary.ts:25-30`（demo 27）、`31-35`、`36-40`、`41-45`；`181-discharge-summary.sql`（clinical.discharge_summaries，discharge_summary:write/verify）；`163-discharge-plan.sql`（clinical.discharge_plans，discharge_plan:manage/view）；`src/db/repositories/dischargePlanRepo.ts:36-51`（createPlan）、`53-59`（pushToPatient planned 守卫 55）、`61-65`、`67-72`；`src/bff/routes/dischargePlan.ts:41-51`（discharge_plan:manage 45）、`52-57`（view 56）、`58-63`（manage 62） | 真实落地：出院小结仓储 + submit/verify 守卫；出院计划创建与推送守卫 | 小结 upsert 覆盖无版本快照；出院小结与首页诊断、医嘱、费用、随访计划的一致性校验未取证；前端 `/api/v1/discharge/summaries` 由 `m198Routes.ts:108` 内存演示承接（静态比对） | 《病历书写基本规范》出院记录章节（卫医政发〔2010〕11号） | P1 |
| 12 | 病案归档 | `src/db/repositories/medicalArchiveRepo.ts:10-14`、`16-27`（archive INSERT 19；ON CONFLICT 21-22，in_ward 守卫 22；25 行抛错「病历已归档或封存，不可重复归档」）、`29-39`（seal archived 守卫 34；37 行抛错「仅已归档病历可封存」）；`src/bff/routes/medicalArchive.ts:25-30`（auth:true 25、isDemo 27）、`31-35`、`36-40`（仅登录无独立权限码）；`182-medical-record-archival.sql`（clinical.medical_record_archives，medical_archive:archive/seal）；`emrArchiveV14.ts:18-21`（内存 archiveState）、`29、46`（computeArchiveDays/isArchivable 纯函数，不连库） | 真实落地：归档 / 封存状态机 + 守卫 + 拒绝重复归档；mock：归档天数 V14 纯函数 | 归档前完整性校验（首页 / 病程 / 手术 / 检验 / 知情同意齐备性）未取证；封存后调阅审批链未取证；保管年限自动到期提醒未取证；归档卷宗与实体病案对应关系未取证 | 《医疗机构病历管理规定（2013年版）》归档与保管期限条款（国卫医发〔2013〕31号）；《病历书写基本规范》 | P1 |
| 13 | 借阅与复印 | `src/db/repositories/medicalCopyRepo.ts:11-24`（INSERT 17；applicant_name 18、id_card_no 18、contact_phone 18、purpose 18 明文落库）、`26-35`（review pending 守卫 32）、`37-45`（complete approved 守卫 42）、`47-51`；`src/bff/routes/medicalCopy.ts:25-30`（auth:true 25、isDemo [] 27）、`31-35`、`36-40`、`41-45`（仅登录）；`183-medical-record-copy.sql`（clinical.medical_record_copy_requests，medical_copy:review/complete）；`356-medical-record-deep.sql`（clinical.medical_record_borrows，borrowed/returned/overdue，medical-record:deep:view）；`emrCopyRequestV14.ts:13-16、26、36、39-43、44`；`emrBorrowV14.ts:18-21、29、40`；`recordCopyCert.ts`（auth:false 演示路由，本轮批量扫描命中） | 真实落地：复印申请 / 审核 / 完成状态机 + 借阅表结构；mock：V14 借阅 / 复印纯函数 | 申请人身份核验（身份证 / 患者本人 / 代理人委托书）未取证；复印内容范围受控与逐份清单留痕未取证；借阅超期催还 / 归还核验纯函数在 V14 内存实现；申请人 PHI 明文落库未加密；复印水印 / 页码防伪未取证 | 《医疗机构病历管理规定（2013年版）》复印与借阅条款（国卫医发〔2013〕31号）；《个人信息保护法》 | P1 |
| 14 | 病历销毁 | `emrDestroyApplyV14.ts:24、35`（read/write 权限码）、`39-43`（入参 recordId/approver/reason）、`44`（registerDestroyApply 内存）；SQL 全量扫描未见病历销毁申请表 / 审批链表；未取证到保管年限校验、多级审批、见证人、销毁清册与留痕落库 | 仅接口定义：V14 内存表单纯函数 | 销毁审批链、保管年限到期前置条件、双人见证、销毁清册、不可恢复性证明与审计留痕整体缺失 | 《医疗机构病历管理规定（2013年版）》销毁条款（国卫医发〔2013〕31号；保管年限门诊≥15 年、住院≥30 年，具体条款待法规分片核对）；档案法相关条款（待法规分片核对） | P1 |
| 15 | 病历质控（环节质控 / 终末质控 / 缺陷闭环） | `src/bff/routes/medicalQc.ts:89-95`（GET /queue，auth:true 89、listQueueView 91、93 行注释「真实库队列查询暂未提供」内存 demo）、`96-101`（auth:true 96、demo 98）、`102-106`、`107-111`；`src/db/repositories/medicalQcRepo.ts:11-23、25-29、32-36、38-45`（rectify pending 守卫 41-42；接口状态含 confirmed 但仓储无 confirm 迁移）；`src/db/repositories/terminalQcRepo.ts:26-35、38-42、44-53、67-88`；`src/bff/routes/terminalQc.ts:23-27、28-32`；`src/db/repositories/qcRectificationRepo.ts:14`（open/fixed/reviewed/closed）、`54-64、67-73、76-84、87-99`（transitionRectification WHERE 仅 id 96，状态前推由聚合器纯函数保证）；`src/bff/routes/qcRectification.ts:41-50`（isDemo 返回 [] 43）、`52-60、62-71`；`src/db/repositories/timelinessRepo.ts:9-20、22-29、31-40`（complete pending 守卫 37，ontime/late 由 now()≤due_at 35）、`42-51`；`src/bff/routes/timeliness.ts:21-25、26-30、31-35`；`192-medical-qc.sql`、`210-terminal-qc.sql`、`215-qc-rectification.sql`、`193-timeliness.sql`、`252-medical-record-quality.sql`（medmuse.record_quality_check pending/confirmed/dismissed）、`314-quality-pdca.sql`、`343-quality-deep.sql`、`321-data-quality.sql`、`312-emr-smart-score.sql`、`194-emr-assessment.sql`、`220-emr-grade5-assessment.sql`、`207-ai-note-qc.sql`、`290-ai-quality.sql`；`emrQcDashboardV14.ts:15、23、26-27`（内存）；`emrDefectClosedLoopV14.ts:24、35、38-43、44`（内存）；`tests/integration/medical-record-qc.test.ts` 引用 runQcCheck/getQcRecord/submitQcReview/resubmitRecord/getQcQueue 五个 M2-B 接口，而 `medicalQcAggregator` 运行时显式抛 501（契约对齐、运行时未实现） | 真实落地：环节质控记录落库、终末质控评分落库、整改任务表、时限监控表与部分状态守卫；仅接口定义：五个 M2-B 质控接口；mock：质控驾驶舱 / 缺陷闭环 V14 纯函数 | 五个 M2-B 质控接口运行时 501；整改状态机仓储层无状态白名单；质控规则库（缺项 / 时限 / 逻辑校验规则）配置化程度未取证；AI 辅助质控留痕与人工复核权重未取证；终末质控-缺陷-整改-复核-关闭闭环跨表事务与超时升级未取证 | 《病历书写基本规范》；《医疗机构病历管理规定》；电子病历分级评价质控条款（国卫办医函〔2018〕1079号）；《医疗质量管理办法》（国家卫生计生委令第10号，待法规分片核对） | P1 |
| 16 | 患者时间线 / 360 视图 | `src/bff/routes/patientTimeline.ts:30/36/42/48/54/60`（六端点 auth:false）、`16-24`（makeItems 内存种子）；`src/bff/routes/patient360.ts:18`（requireAuth）、`21`（patientId 默认 P001）、`24-73`（硬编码 8 条 demo 事件）、`77`（patientName '张演示'）、`92`（/api/v1/patient/360/:patientId）、`94`（auth:true；无归属校验）；`emrPatient360V14.ts:17-21、23-26、34、38-39`（内存）；`emrTimelineGenerateV14.ts:24、35、39-43、44`（内存）；`337-patient-journey.sql`（medmuse.patient_journey_event）；`345-patient-deep.sql`（clinical.patient_guide_session + nav_route + outpatient_flow + inpatient_flow，patient_deep:read/guide/followup）；`m544Routes.ts:130`（/api/v1/patients/:id/timeline，内存，repoImport=0）；`patientTimeline360.ts`、`timelineDeep.ts`（auth:false 演示路由） | 内存 mock：时间线 / 360 主路由硬编码演示数据且无患者归属校验；真实落地：就诊旅程事件与患者引导表结构 | 跨门诊 / 住院 / 检查 / 用药 / 护理 / 手术事件统一聚合服务未接线；360 视图按患者主索引（EMPI）跨就诊合并未取证；视图出口按需脱敏与查看审计未取证；前端 `/api/v1/patients/:id/summary` 后端无对应路径（静态比对） | 《个人信息保护法》最小必要；互联互通标准化成熟度患者画像要求（待法规分片核对）；电子病历分级评价患者视图条款（待法规分片核对） | P1 |
| 17 | FHIR 网关与资源映射 | `src/bff/routes/fhir.ts:14`（/api/fhir/Patient/:id，无 v1 前缀）、`18`（requireAuth）、`23-60`（硬编码 Patient；96 行残留旧品牌文案）；`fhirResources.ts:15/29`（requireAuth）、`266-283`（18 类资源路由，全部 5 条硬编码 Bundle，无持久化；静态 LOINC/SNOMED/RxNorm 编码体系）；`fhirGatewayV5.ts:21-25`（logStore 三行内存样例）、`31/33`（fhir-gateway:read）、`42/44`（fhir-gateway:write）；`fhirGatewayDetail.ts:30/36/42/48/54/60`（六类 search auth:false）、`16-24`（makeEntries 硬编码 mock Bundle）；`fhirGatewayDetail2.ts` 同范式；`fhirOperationsRoutes.ts:20/26/32/45/51/57`（Patient CRUD/search/$validate/_history 全 auth:false，全 mock）；`integrationHl7.ts:122-135`（白名单仅 Patient/Observation/MedicationRequest 129-133）；`76-empi.sql`（clinical.patient_identifiers + empi_match_candidates + empi_links，empi:read/write）；`docs/COMPLIANCE.md:104-108` 自述 FHIR R4 仅 4 类资源、生产接 HAPI FHIR Server（规划态）；`tests/unit/integration/Fhir.test.ts`（22 类资源模型 / 序列化 / 必填校验纯模型单测） | 仅接口定义：FHIR 资源模型纯函数校验 + 网关路由骨架；内存 mock：全部 Bundle 硬编码 | 无 FHIR Server 持久化与存储库映射；无资源写回 / 版本历史 / $history 落库；术语代码映射（LOINC/SNOMED/ICD/RxNorm）服务表与对照关系未取证；HL7 v2↔FHIR 双向转换未取证；CDA R2 文档表与转换零命中；Patient 主索引跨域合并规则待核 | 医院信息互联互通标准化成熟度测评（FHIR R4 / HL7 v2 / CDA R2 资源映射要求）；HL7 FHIR R4 规范；电子病历分级评价信息共享条款（待法规分片核对） | P1 |
| 18 | 病历版本管理 | `src/db/repositories/medicalRecordRepo.ts:27`（SELECT_COLS 含 version）、`87-100`（updateMedicalRecordContent version+1 97，旧正文不落历史表）；`20-clinical.sql:65-84`（content jsonb 70、plain_text 71、version int 80、deleted_at 软删 83；无 content_hash/prev_hash，无版本历史表）；`m542Routes.ts:38`（mrStore Map）、`40-62`（MR-001 三版种子）、`9`（注释「写接口内存 Map 短路，绝不连 PostgreSQL」）、`78-86`（handleVersionList requireAuth 79）、`90-130`（handleVersionCreate requireAuth 91；locked 终态 409 99-101；参数校验 116-123）、`157-159`（三版本端点，repoImport=0）；`emrVersion.ts`（auth:false 演示路由）；`emrTemplateVersionV14.ts:25/36、40-41`（versions 数组内存纯函数）；`emrTemplateRepo.ts:238-284`（模板乐观锁 + 状态白名单 + version+1）、`307-340`（模板评审业务哈希链）；`frontPageRepo.ts:274-322、345-379`（首页评审业务哈希链） | 真实落地：模板与首页评审业务级哈希链 + 乐观锁；内存 mock：病历正文版本路由内存 Map | 病历正文无版本历史表、无 prev_hash/content_hash、无历史版本只读对比接口落库；电子病历 6 级要求的修改痕迹可追溯（修改人 / 时间 / 前后内容 / 签名后锁定）未满足；前端 medicalRecordVersions 三端点由 m542 内存承接（静态比对） | 《病历书写基本规范》修改痕迹条款（卫医政发〔2010〕11号）；《电子病历系统应用水平分级评价标准（试行）》6 级电子病历条款（国卫办医函〔2018〕1079号） | P0（并入 P0-②） |
| 19 | 电子签名 | `src/bff/routes/eSignature.ts:38-95`（POST /api/v1/esignature/sign，auth:true 42；staffId 缺省取登录用户 70；persistSignature best-effort 81）、`96-108`（GET /verify/:id，auth:true 99；verifySignature 105 先读进程内台账）；`265-e-signature.sql:34-54`（clinical.e_signature：staff_id 36、document_type CHECK medical_record/prescription/surgical_consent 37-38、document_id 39、signature_data PNG base64 40、content_hash SHA-256 41、client_ip 42、signed_at 43、revoked_at 44 不物理删除；索引 49-54）；`212-e-sign.sql:10-20`（clinical.e_sign_log：biz_type 12、biz_id 13、operator_id 14、content_hash SHA-256 15、signed_at 16、client_ip 17；不落正文明文；索引 20）；`emrSignatureV14.ts:25/49、17、29-33、34、55`（signatureState Map，signNote/verifySignature 无证书链）；`surgeryRecordRepo.ts:48-55`（signed_by 工号 / UUID 文本）；`consentFormRepo.ts:29-35、40-45`（签名文本 / 工号）；`docs/COMPLIANCE.md:89-95` 自述病历哈希链 + CA 签章 + TSA 时间戳（代码取证未落地）、`96-102`（SM2/SM3/SM4 当前为 mock 预留）；`tests/unit/eSignature.test.ts`（台账纯函数，persistSignature 未覆盖） | 真实落地：签名台账表 + content_hash SHA-256 + 撤销不物理删除；内存 mock：V14 签名 Map | 无 CA 数字证书签名 / 证书链校验 / 可信时间戳机构；签名图像与正文绑定关系、签名后防篡改校验链路未取证；处方 / 手术记录 / 知情同意签名均为账号文本，未统一走 e_signature 表；国密算法预留未落地 | 《中华人民共和国电子签名法》第十三条至第十五条（可靠电子签名）；电子病历分级评价签名条款（国卫办医函〔2018〕1079号） | P0（并入 P0-② / P0-③） |
| 20 | 水印 | `emrWatermarkTraceV14.ts:24/35、38-42`（recordId/operator/watermarkText 由 body 传入）、`43`（applyWatermark 内存）；SQL 全量扫描未见临床水印表 / 打印水印落库表；未取证到正文 / PDF / 打印 / 截屏出口水印拦截层 | 仅接口定义：V14 内存水印参数纯函数 | 展示水印（工号 / 姓名 / 时间）、导出 PDF 水印、打印水印、水印追溯落库与违规外发审计整体缺失 | 等保 2.0 数据保密性与可追溯性（GB/T 22239-2019，条款待法规分片核对）；《个人信息保护法》；《医疗机构病历管理规定》复印留痕条款 | P2 |
| 21 | PHI 脱敏 | `20-clinical.sql:12-30`（clinical.patients：name_masked 15、name_enc AES-GCM 16、id_card_hash SHA-256 19、phone_enc 20、insurance_no_enc 21、allergies 23、past_history 24、tags 25、data_level 1-4 26）；`191-medical-header.sql:5、8`（patient_name、id_card 明文列）；`183-medical-record-copy.sql:5、7-9`（applicant_name、id_card_no NOT NULL、contact_phone NOT NULL、purpose 明文）；`src/bff/utils/mask.ts:25-30、45-53、66-74、77-84、86、88、103-126`；dataMaskingAggregator（角色差异：admin 全量 / doctor·nurse·patient 脱敏，地址截断到区 / 街道，嵌套对象与数组递归、大小写不敏感字段名；`tests/unit/dataMasking.test.ts`；`tests/unit/mask.test.ts` name/idcard/phone 三族）；`emrMaskingV14.ts:15、23、29-30`；`emrDeidentifyOutputV14.ts:24/35、38-42`；`emrFineGrainedAuthV14.ts:24/35、38-43`；`docs/COMPLIANCE_BLUEPRINT.md:46` 自述真实流量逐字段脱敏拦截待补 | 真实落地：患者主索引四态（掩码 / 加密 / 哈希 / 加密）设计 + 两套脱敏纯函数工具；mock：V14 脱敏 / 字段授权 | 病历表头、复印申请等表 PHI 明文落库；审计日志窄版 maskBody 未覆盖地址 / 邮箱 / 医保卡号 / 紧急联系人 / 签名图像 / 病历正文；脱敏规则未按角色-字段-场景集中配置；导出 / 打印 / 共享出口无统一拦截（并入 P0-⑥） | 《个人信息保护法》最小必要与敏感个人信息条款；《数据安全法》；《网络安全法》；等保 2.0 数据保密性（GB/T 22239-2019） | P0（并入 P0-⑥） |
| 22 | 审计日志 | `src/bff/middleware/audit.ts:2`（文件头残留旧品牌字样）、`22`（AUDITED_METHODS）、`33-46`（ensureOperationLogTable；audit.operation_log 建表 36-43：id/user_id/method/path/body jsonb/created_at，无 prev_hash、无链）、`54-75`（recordOperationLog；body 经 maskBody 62；fire-and-forget，失败仅 console.warn 97-100）、`89-91`（shouldSkipAuditForDemo 非生产 DEMO 跳过）、`73`（c.req.url 原始查询串落库未脱敏）；`src/db/repositories/auditChainRepo.ts:13-14`（注释自述历史 auditRepo.writeAuditLog 指向不存在表且未被业务调用）、`41`（MAX_CHAIN_RETRY=3）、`45-63`（insertChained）、`66-89`（insertWithChainLock，advisory 锁 76/108）、`99-111`（recordChainAudit）；`50-audit.sql:13-31`（audit.audit_logs：seq 14、trace_id 15、actor_id 16、actor_name 17、actor_role 18、action 19、resource_type 20、resource_id 21、patient_ref 22、result CHECK 23、risk_level 24、client_ip 25、user_agent 26、detail jsonb 27、prev_hash 28、hash 29、created_at 30；触发器 39-41；verify_chain() 44-56；58-59 注释声明只增不改不删，但全 init 目录实测无真实角色回收语句）；`51-audit-chain-lock.sql`（advisory 锁 + 触发器 16-58）；`52-audit-chain-state.sql`（链头单行表 24-38、触发器 41-90）；`68-audit-chain-concurrency.sql`（uq_audit_chain_prev 唯一约束 17-24）；`229-audit-log-enhance.sql:13`（补 hospital_id）；`246-audit-log.sql:18-47`（medmuse.data_access_log 36-45：staff_id 38、staff_role 39、action 40、resource_type 41、resource_id 42、脱敏 patient_id 43、accessed_at 44、ip_address 45；注释 22-24 只增不改、admin 限定查询；无链、无触发器、文件内无 REVOKE/GRANT）；`328-security-compliance.sql:34-92`（medmuse.security_audit_log 52-63：prev_hash 62/entry_hash 63 链；37 行注释声明只增不改，未落 REVOKE/GRANT；91-92 注释在线留存≥6 个月）；`384-consult-audit-trail.sql:18-45`（consult.audit_trail 27-41；无 updated_at/触发器、仅线程级联删除 29）；本轮 Grep：75 个聚合器调用 recordChainAudit；27 个核心病历写路径聚合器 chain=0（清单见第三节 P0-③）；`src/bff/server.ts:6837-6840`（finally 中 logRequest、auditOperation、recordHttpRequest） | 真实落地：审计链表 + 触发器 + 链头状态 + 并发唯一约束 + 重试；75 个业务域（急诊 / 检验 / 影像 / 药房 / EMPI / 会诊 / 路径 / VTE / 输血 / 语音病历 / 首页 / 互联网处方 / 整改 / 护理风险 / 医嘱 CDS 等）已入链 | 缺口：主操作日志表 audit.operation_log 无链；27 个病历写路径未入链；WORM 只增不改未在数据库角色 / 触发器层强制（REVOKE 实测近零）；审计 fire-and-forget 失败仅告警；原始 URL 查询串未脱敏；审计不记响应状态码；留存期默认 180 天（`src/constants/medical.ts:314`，可由 AUDIT_RETENTION_DAYS 覆盖，前轮复核）；无日志独立保管 / 防篡改导出验证工具落地 | 《网络安全法》第二十一条（日志留存不少于六个月）；等保 2.0 安全审计条款（GB/T 22239-2019）；《医疗机构病历管理规定》病历查阅留痕条款；《个人信息保护法》审计要求 | P0 |
| 23 | 权限与细粒度授权 | `src/bff/middleware/auth.ts:184-197`（requireRole）、`228-285`（REPORT_GROUP_DOMAINS）、`291-302`（matchReportGroupWildcard，仅 :read 走分组码通配 292）、`314-326`（requirePermissionCode：admin 恒通过 318；显式码匹配 319；分组码通配 321；否则 403 322-325；守卫内不含就诊 / 患者归属校验）；`src/bff/server.ts:6811-6817`（临床 / 医护白名单 isStaffOnlyPath）；多数临床主路由仅 auth:true 无独立权限码（medicalHeader.ts:25、admissionNote.ts:25、progressNote.ts:25、dischargeSummary.ts:25、nursingRecord.ts:25、surgeryRecord.ts:22、consentForm.ts:25、medicalArchive.ts:25、medicalCopy.ts:25、medicalQc.ts:89、order.ts:25 等，本轮已 Read）；labInterpret.ts:80/93/102/108/114、imagingInterpret.ts:81/94/103/111/117、dischargePlan.ts:45/56/62、clinicalPathway.ts:39/71/86/104、integrationHl7.ts 仅登录无权限码；`emrFineGrainedAuthV14.ts:38-43`（字段级授权纯函数，无 DB 角色-字段绑定表）；前端 53 条菜单声明权限但路由裸挂（基线遗留，见第四节 P1-19） | 真实落地：登录态 + 角色 + 权限码 + 报表分组通配 + 医护白名单 | 缺口：无科室 / 病区 / 患者 / 就诊数据归属授权（行级）；admin 角色恒绕过权限码；字段级细粒度授权仅内存演示；角色-权限-资源矩阵配置化与越权测试缺失；临床主路由大量仅登录 | 等保 2.0 访问控制条款（GB/T 22239-2019）；电子病历分级评价权限管理条款（国卫办医函〔2018〕1079号）；《个人信息保护法》访问控制 | P0（并入 P0-①） |
| 24 | 多租户隔离 | `deploy/postgres/init/261-multi-tenant.sql:28-38`（iam.users）、`43-53`（clinical.patients）、`58-68`（clinical.visits）、`73-83`（clinical.orders）、`88-98`（clinical.medical_record_headers）；FK→iam.tenants(id) 34-35/49-50/64-65/79-80/94-95；101-102（注释称谓词叠加由 BFF withTenantScope 统一收口）；其余临床文书表无租户列；SQL 全局批量扫描：ENABLE ROW LEVEL SECURITY=0、CREATE POLICY=0、CREATE ROLE=0、REVOKE=1（328:23 为注释行）、GRANT=2（真实仅 `369-ops-analysis.sql:105` GRANT SELECT ... TO PUBLIC）；`src/tenant/DataScopeGuard.ts:40-46`（buildPredicate）、`54-62`（isRowVisible fail-closed 55）、`65-67`（filterRows）、`70-77`（assertRowInScope）、`81`（单例）；除自身 + tenant/index.ts + tenant/types.ts 外业务代码零引用；`src/bff/aggregators/tenantAggregator.ts:83-101`（withTenantScope，hospitalId 空 fail-closed 抛错 84-88；权威覆盖既有谓词 93）、`112-121`（filterRowsByScope）、`162-168`（validateTenantAccess）、`128-149`（staffHospitalDir 进程内目录）；仅自身 + coverageDetailAggregator:267 + coverageReportAggregator:241 + testCoverageAggregator:631 三处引用，临床聚合器 / 仓储零调用；`src/bff/middleware/tenant.ts:26`（ctxTenantMap）、`29-31`（getTenantContext）、`37-55`（tenantContextMiddleware：resolveFromRequest 39；MedicalAgentError→403 43-48；其他 500 50-53）；`src/bff/server.ts:6789` 接线；`tests` 目录未见临床病历跨租户行级隔离断言（multiTenant.test.ts 仅覆盖 iam.tenants 注册表持久化与 admin 403/401；DataScopeGuard.test.ts 为内存谓词纯函数单测） | 真实落地：租户上下文中间件 + 租户注册表 + 范围谓词纯函数库 | 缺口：仅五张表有 hospital_id；无 DB 层 RLS/POLICY/角色回收；临床聚合器与仓储未接入 withTenantScope；无跨租户越权集成测试；患者 / 就诊 / 文书跨租户读取无法在数据层阻断 | 等保 2.0 边界防护与数据隔离（GB/T 22239-2019，条款待法规分片核对）；《个人信息保护法》；互联互通区域协同标准（待法规分片核对） | P0 |
| 25 | 术语字典 / ICD 编码 | `21-clinical-diagnoses.sql:20-26`（clinical.diagnoses code ICD-10 20、name 21、kind 22-23、confirmed 24、doctor_id 26）；`medicalHeaderRepo.ts:8`（icd10Codes 数组）；`frontPageRepo.ts:303`（primary_diagnosis_code）；`fhirResources.ts`（静态 LOINC/SNOMED/RxNorm 编码体系，无持久化术语服务）；`emrIcdCodingV14.ts:18`（codingState Map）、`26`（write）、`29-33`（noteId/text）、`34`（suggestIcdCodes）、`35`（codingState.set，内存）；`emrTerminologyV14.ts:18、20-21、22`（checkTerminology 内存纯函数）；`197-diagnosis-suggestion.sql`（clinical.diagnosis_suggestions）；未取证到独立术语主数据表（ICD-10 全量码表、ICD-9-CM-3、LOINC、SNOMED CT、药品字典、科室字典）与版本对照关系表 | 仅接口定义：诊断编码字段 + 编码建议表结构；内存 mock：ICD 辅助编码 / 术语校验 V14 纯函数 | 术语服务（主数据、版本、别名、停用、映射）未建库；编码自动校验 / 查重 / 上下级诊断逻辑未取证；手术编码与诊断编码联动未取证 | 互联互通标准化成熟度测评术语标准化要求；ICD-10、ICD-9-CM-3 编码规范（待法规分片核对）；电子病历分级评价条款 | P1 |
| 26 | 病历模板 | `src/bff/routes/emrTemplate.ts:45-56`（GET /api/v1/emr-template，auth:true 47）、`58-75`（POST，auth:true 61；actorId c.user.id 69）、`77-93`（PUT，auth:true 80）、`95-106`（DELETE，auth:true 98；仅登录无独立权限码；聚合器物理 DELETE）；`src/db/repositories/emrTemplateRepo.ts:238-284`（transitionTemplateStatus：FOR UPDATE 246-249、期望版本 252、状态白名单 253、version+1 255）、`307-340`（insertTemplateReview：链头 FOR UPDATE 311-317、prevHash 318、signHash 320、INSERT 328-337）、`343-353`（listReviewsByTemplate）；`217-emr-template.sql`（clinical.emr_template）；`371-emr-template-v2.sql`（clinical.emr_template_reviews）；`emrTemplateAggregator.ts`（本轮实测 chain=0、repoRef=0，未接 v2 表与评审链）；217 之外 emrTemplate*V14 系列 18 个聚合器全部 repoImport=0（本轮批量扫描口径）；`emrTemplateVersionV14.ts` 内存 | 真实落地：模板仓储 v1 + v2 评审哈希链 / 乐观锁表结构；内存 mock：V14 模板库系列纯函数 | emrTemplate 主路由未走 v2 乐观锁 / 评审链，物理删除无回收；模板分级（全院 / 科室 / 个人）、引用次数、版本复用、停用归档与权限隔离规则深度待核；模板变量与结构化字段绑定未取证 | 《病历书写基本规范》模板使用要求（待法规分片核对）；电子病历分级评价模板管理条款（国卫办医函〔2018〕1079号） | P1 |
| 27 | 结构化录入 | `emrStructuredInputV14.ts:24/35、39-42、43`（assistStructuredInput 内存纯函数）；`20-clinical.sql:70`（content jsonb）、`71`（plain_text）；`21-clinical-diagnoses.sql:38-39`（visits.consultation_detail jsonb）；`medicalRecordRepo.ts:15`（content Record + plainText）；`288-ai-record.sql`（clinical.ai_record_generation draft/revised/archived）；`29-voice-medical-record.sql`（clinical.voice_dictations draft/converted/discarded）；`src/bff/routes/voiceMedical.ts:75-82`（medical_record:read 76、auth:true 82）、`85-89、91-95、96-103、105-109`；`src/medical-tools/interpret` 系列（规则 + LLM 解读引擎，未在本轮运行时验证）；`194-emr-assessment.sql`、`220-emr-grade5-assessment.sql`、`312-emr-smart-score.sql`（结构化指标表） | 真实落地：jsonb 正文 + 语音转写草稿 + AI 记录生成状态表；内存 mock：结构化辅助录入 V14 纯函数 | 非结构化文本到结构化字段的自动抽取落库链路未取证；字段必填 / 合法性 / 术语校验规则引擎未取证；结构化程度评分与缺陷项回写闭环深度待核 | 电子病历系统应用水平分级评价 4 级及以上结构化要求（国卫办医函〔2018〕1079号）；互联互通标准化成熟度数据标准化要求 | P2 |
| 28 | 知情同意 / 患者门户 | `src/db/repositories/consentFormRepo.ts:11-21`（create）、`23-27`、`29-35`（patientSign pending 守卫 35，signature 文本 33）、`40-45`（doctorSign signed 守卫 45，doctor_signature 工号 44）；`src/bff/routes/consentForm.ts:25-30`（demo [] 27）、`31-35`、`36-43`（签名文本 41、witnessName）、`44-48`；`187-consent-form.sql`（clinical.consent_forms，consent:create/sign）；`informedConsentV13.ts:20-29`（records 内存 1 条）、`35`（auth:true）、`37`（informed-consent:read）、`40-42`（纯函数签署率统计；与 consentForm 实际签署记录不同）；`src/bff/routes/patientPortal.ts:28-48`（requester DEMO 短路）、`65-68`（真实路由 GET /api/v1/patient/portal，auth:true、patient_portal:view 68）、`87/93/99/105/111/117`（M454 mock /portal/appointments、/reports、/bills、/guide、/reminders、/health-archive 全 auth:false）；`63-internet-hospital-foundation.sql`（clinical.patient_accounts + profiles + realname_verifications + iam.internet_practitioners，patient:account/patient:realname/internet:practitioner/audit）；`80-patient-delegation.sql`（clinical.profile_delegations，delegation:manage/view）；`307-smart-followup.sql`（clinical.follow_up_plan pending/sent/completed/cancelled）；`298-patient-education.sql`（medmuse.patient_education_material）；`tests/integration/patientPortal.test.ts`（skipIf 无 DB） | 真实落地：知情同意书仓储 + 患者 / 医师签署状态守卫；患者账号 / 实名 / 受托关系表结构；内存 mock：M454 门户六类数据 | 知情同意书为文本签名（无 CA、无患者端可信签署流程）；患者门户除 /portal 真实路由外，预约 / 报告 / 账单 / 宣教 / 提醒 / 健康档案均 auth:false 内存 mock；患者查看本人病历 / 报告的归属校验与授权委托链未取证；在线签署意愿、版本更新再告知、撤回机制未取证 | 《中华人民共和国民法典》知情同意相关条款（待法规分片核对）；《医疗机构病历管理规定》患者权利条款；《个人信息保护法》；互联网医院管理办法患者实名认证条款（国卫医发〔2018〕25号系列） | P1 |
| 29 | 互联网诊疗病历 | `src/bff/routes/internetPrescription.ts:64-70`（doctorGuard，internet:prescription 65）、`73-79`（pharmacistGuard，internet:prescription:audit 74）、`82-90`（patientGuard，requireRole patient 85；patientId 取自 query 87）、`96-121`（create POST /create；路由定义无 auth: 字段，守卫在处理器内）、`125`（/resubmit）、`147`（/cancel）、`162`（/by-session）、`181`（/audit-queue）、`202`（/review）、`232`（/my）、`246`（/detail）；`src/db/repositories/internetPrescriptionRepo.ts:257-291`（createEPrescription 事务 INSERT 262/277；幂等键 269/285）、`297-309`（reviewEPrescription CAS pending_review 306）；`65-internet-prescription.sql`（clinical.internet_prescriptions + items，internet:prescription/audit/view）；`63-internet-hospital-foundation.sql`（账号 / 实名 / 医师）；`66-internet-payment.sql`（online_payments + e_invoices）；`67-internet-delivery.sql`（clinical.prescription_deliveries）；`329-internet-hospital.sql`（clinical.prescription_delivery_routes + internet_pharmacies）；`347-internet-hospital.sql`（clinical.online_prescription + online_health_record + online_patient_journey）；internetPatientAggregator、internetPaymentAggregator、internetPrescriptionAggregator 已入哈希链（75 清单内）；`tests/integration/internet-hospital-foundation.test.ts`、`internetDelivery.test.ts`、`internetPayment.test.ts`、`internetPrescription.test.ts`（skipIf 无 DB）；onlineConsult.test.ts 日期夹具失败属基线遗留（第四节 P1-5） | 真实落地：互联网处方头明细事务 + 药师审核 CAS + 幂等键 + 支付 / 配送 / 在线病历表结构；仅接口定义：在线健康记录业务路由待核 | 互联网诊疗病历（问诊记录、主诉 / 病史 / 查体 / 医嘱 / 复诊判断）与在线健康记录表的业务路由未取证到完整闭环；医师接诊权限、首诊限制、复诊病历留痕、处方流转追溯、医保 / 支付凭证关联深度待核；会话与病历绑定关系、诊疗全过程可追溯审计未取证 | 《互联网诊疗管理办法（试行）》《互联网医院管理办法（试行）》《远程医疗服务管理规范（试行）》（国卫医发〔2018〕25号系列）；《处方管理办法》；《病历书写基本规范》 | P1 |

> 备注：表中所有「前端路径」结论均为 `web/src/services/api/` 与 `src/bff/routes/` 的静态代码比对，未联调验证；m-series 演示路由（m198/m199/m204/m211/m287/m336/m542/m544/m552/m561 等）本轮实测 `repositories/` 引用计数为 0，属内存 mock 承接；进度记录、手术知情同意、病案首页、手术核查清单、360 摘要等部分前端路径在后端无对应实现（详见第三节 P0-① 附件清单与第五节未取证项）。

---

## 三、重点缺口深描（P0 六项）

### P0-① 关闭 DEMO_MODE，接通真实 RBAC 与口令核验

**1. 现状代码证据与行为摘要**

- 开发态短路：`src/bff/middleware/auth.ts:171-181` `requireAuth` 在非生产且 `DEMO_MODE` 开启时，将请求用户直接置为 demo admin（roles=['admin']、permissions=['*']，173-175 行）；生产环境不短路。`src/bff/config/runtimeEnv.ts:31-37` `assertProductionNotDemoMode` 在生产 + DEMO 同时开启时启动即抛错，构成启动期闸门。
- 登录无口令比对：`src/bff/routes/auth.ts:112-118` `loadViewByUsername` 真实模式只按用户名 + active 查询用户；`auth.ts:183` 注释明示「试用构建不校验生产口令哈希，统一放行已存在账号」；`src/db/repositories/userRepo.ts:17` SELECT_COLS 不含 `password_hash`。
- 口令核验工具未接线：`src/security/encryption/HashUtils.ts:248` `verifyBcryptHash`、`:271` `verifyArgon2Hash` 仅为定义，235-236 行注释自述实际用 PBKDF2 模拟 bcrypt 格式；全仓 Grep 仅命中 `HashUtils.ts` 定义与 `security/index.ts:170-171`、`encryption/index.ts:29-30` 再导出，**无业务调用方**。
- 权限码守卫：`auth.ts:314-326` `requirePermissionCode` 中 admin 角色恒通过（318 行）；显式码匹配（319）与报表分组通配（321）之外返回 403（322-325）；守卫内部不含就诊 / 患者 / 科室归属判断。
- 中间件接线：`src/bff/server.ts:6767-6840` 顺序为 attachUser → enforceSession → rateLimit → verifyCsrf → tenantContextMiddleware → 路由匹配 → 临床 / 医护白名单（6811-6817）→ finally 日志 / 审计 / HTTP 记录。
- 临床主路由权限现状：`medicalHeader.ts:25`、`admissionNote.ts:25`、`progressNote.ts:25`、`dischargeSummary.ts:25`、`nursingRecord.ts:25`、`surgeryRecord.ts:22`、`consentForm.ts:25`、`medicalArchive.ts:25`、`medicalCopy.ts:25`、`medicalQc.ts:89`、`order.ts:25` 等仅 `auth: true`，未挂独立权限码；挂码示例为 `labInterpret.ts:80`、`imagingInterpret.ts:81`、`dischargePlan.ts:45`、`clinicalPathway.ts:39`、`patientPortal.ts:68`。

**2. 法规差距**

- 等保 2.0 要求身份鉴别唯一标识、口令复杂度与失败处理、访问控制最小授权（GB/T 22239-2019，具体条款待法规分片核对）；当前登录路径跳过口令哈希核验，admin 角色恒绕过权限码，不满足最小授权与身份鉴别可追责要求。
- 电子病历分级评价要求医务人员身份唯一标识、权限与角色 / 岗位匹配（国卫办医函〔2018〕1079号，待法规分片核对）；当前无数据归属维度（科室 / 病区 / 患者 / 就诊）授权。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `src/bff/routes/auth.ts` 登录处理器：接通 `userRepo` 口令哈希列读取与 `HashUtils` 核验函数，失败计入会话台账；移除 183 行注释所对应的放行分支。
- `src/db/repositories/userRepo.ts`：扩展 SELECT_COLS 与查询方法，支持按用户名取口令哈希与密码更新；明确真 bcrypt / argon2 迁移策略。
- `src/bff/middleware/auth.ts`：拆分「登录身份」与「权限码」两层守卫；取消 admin 恒通过分支，改为显式超级管理员标记且不可用于临床业务豁免。
- `src/bff/middleware/` 新增数据归属守卫方向：在权限码校验之后，按就诊 / 患者 / 科室谓词二次校验，与 `src/tenant/DataScopeGuard.ts`、`tenantAggregator.withTenantScope` 接线。
- 临床主路由：按域补齐 `requirePermissionCode` 挂码，清理仅登录路由。

**4. 验收口径**

- 生产环境无 DEMO_MODE 启动路径；未认证请求一律 401，口令错误记录失败台账并限流；非授权角色 / 科室访问病历返回 403 并留痕。
- 单元 / 集成测试覆盖：口令错误 / 锁定 / 过期会话、admin 不可绕过临床权限码、跨科室与跨患者越权访问被拒绝。
- 所有临床写接口均挂独立权限码；权限码矩阵与前端菜单一致（基线遗留 P1-19 同步收口）。

---

### P0-② 病历正文 append-only 写入层拦截 + 版本链

**1. 现状代码证据与行为摘要**

- 综合病历仓储：`src/db/repositories/medicalRecordRepo.ts:72-84` `updateMedicalRecordStatus` 的 WHERE 条件仅 `id AND deleted_at IS NULL`（81 行），无状态迁移守卫；`signed_at/signed_by` 以 COALESCE 不覆盖（79-80）。`:87-100` `updateMedicalRecordContent` WHERE 同样无状态条件（98 行），正文可被覆盖，`version = version + 1`（97 行），**旧正文不落任何历史表**。
- 入院记录：`admissionNoteRepo.ts:16-36` `upsert` 以 `ON CONFLICT (visit_id) DO UPDATE` 覆盖（27-32 行），无状态守卫；`submit`（38-42，draft→submitted 40 行）、`verify`（44-48，submitted→verified 46 行）仅状态迁移带守卫。
- 病案首页表头：`medicalHeaderRepo.ts:13-46` `upsert` ON CONFLICT DO UPDATE 覆盖 33-42 行；`verify` 仅 completed→verified 守卫（67 行）。
- 出院小结：`dischargeSummaryRepo.ts:28-50` upsert 覆盖 41-46；submit（52-59，draft 56）、verify（61-68，submitted 65）带守卫。
- 病程记录：`progressNoteRepo.ts:9-19` create-only；`sign` 27-34 带 draft 守卫（31 行）；无正文二次编辑接口、无历史表。
- 手术记录：`surgeryRecordRepo.ts:12-31` create；`complete` 39-46（draft 43）；`sign` 48-55（completed 51-52）；签名仅 `signed_by` 工号 / UUID 文本。
- 护理记录：`nursingRecordRepo.ts:11-30` create-only；32-39 查询；无状态 / 签名 / 版本 / 锁定。
- 医嘱：`orderRepo.ts:157-163` `updateOrderStatus` 无状态守卫自由迁移（WHERE id 161 行）；cancel / reviewOrder / rejectOrder / stopOrder 带状态白名单（122-124、132、143、152 行）。
- 处方：`prescriptionRepo.ts:11` 状态机 draft/pending_review/approved/rejected/dispensed/cancelled；`auditPrescription` 119-131（125-127 pending_review 守卫）；`dispensePrescription` 133-137（136-137 approved 守卫）；无批准后正文编辑；无证书签名列。
- 表结构：`deploy/postgres/init/20-clinical.sql:65-84` clinical.medical_records 含 content jsonb 70、plain_text 71、status CHECK 75、version int 80、deleted_at 软删 83；**无 content_hash/prev_hash，无版本历史表**。全库 SQL 检索：无独立病历版本 / 历史表、零 CDA 表、临床水印表零命中、列级脱敏表零命中。
- 已具备正向参照：`emrTemplateRepo.ts:238-284`（FOR UPDATE 246-249、期望版本 252、状态白名单 253、version+1 255）与 `:307-340`（模板评审业务哈希链）；`frontPageRepo.ts:274-322`、`:345-379`（首页评审业务哈希链）；`labInterpretRepo.ts:345-371`、`imagingInterpretRepo.ts:279-305`（FOR UPDATE + 源状态白名单）。

**2. 法规差距**

- 《病历书写基本规范》要求病历修改留痕（修改人 / 时间 / 内容痕迹），上级医师签名确认后不得擅自修改（卫医政发〔2010〕11号，具体条款待法规分片核对）；当前签名 / 提交后正文仍可经仓储层覆盖，且无历史版本与哈希链。
- 电子病历分级评价 6 级要求病历修改痕迹可追溯、签名后锁定、版本可比对（国卫办医函〔2018〕1079号）；当前 `medical_records.version` 仅为计数，不构成版本链。
- 《电子签名法》第十三条至第十五条要求可靠电子签名与数据电文完整性；当前签名为账号文本，未绑定正文哈希与证书。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `src/db/repositories/` 各病历仓储：在状态机迁移方法中补 FROM/WHERE 源状态白名单；新增「版本快照表」方向（正文内容、prev_hash、content_hash、作者、时间、来源接口），快照与状态迁移同事务提交。
- `deploy/postgres/init/` 新增迁移方向：病历正文表追加 content_hash/prev_hash 列；版本历史表；BEFORE UPDATE/DELETE 触发器拦截已签名 / 归档文书正文改写。
- `src/bff/aggregators/` 病历写路径：写入事务内完成状态校验 → 快照落表 → 审计链登记（接 P0-③）→ 返回版本号。
- 电子签名模块：将正文哈希、文档类型、文档 ID、签名时间纳入统一签名台账（参照 `265-e-signature.sql` 结构扩展证书字段方向）。
- 复核 `orderRepo.updateOrderStatus` 等无守卫方法，纳入状态机白名单改造清单。

**4. 验收口径**

- 草稿期修改产生新版本快照；提交 / 签名 / 归档后仓储层 UPDATE/DELETE 正文被触发器或守卫拒绝；历史版本可按时间正序还原，前后内容可比对。
- 每条快照带 prev_hash/content_hash，可跑链校验；签名记录绑定正文哈希与签署人证书（CA 接入前先留接口）。
- 集成测试覆盖：签名后改写被拒绝、并发提交版本冲突 409、版本链篡改可检出、医嘱非法状态迁移被拒绝。

---

### P0-③ 审计 WORM / 哈希链覆盖病历写路径

**1. 现状代码证据与行为摘要**

- 主操作日志无链：`src/bff/middleware/audit.ts:33-46` `ensureOperationLogTable` 建 `audit.operation_log`（36-43：id/user_id/method/path/body jsonb/created_at），**无 prev_hash、无链**；`:54-75` `recordOperationLog` body 经 maskBody 62 行脱敏；写入 fire-and-forget，失败仅 `console.warn`（97-100）；`:89-91` 非生产 DEMO 跳过审计；`:73` `c.req.url` 原始查询串落库未脱敏。
- 哈希链仓储：`src/db/repositories/auditChainRepo.ts:41` MAX_CHAIN_RETRY=3；`:45-63` insertChained；`:66-89` insertWithChainLock（advisory 锁 76/108）；`:99-111` recordChainAudit；写 `audit.audit_logs`，链由 BEFORE INSERT 触发器维护；13-14 行注释自述历史 `auditRepo.writeAuditLog` 指向不存在表且未被业务调用。
- 入链覆盖：本轮 Grep `src/bff/aggregators/`，共 **75 个聚合器**调用 `recordChainAudit`（含 inpatient、lis、ris、pharmacy、emergency、empi、consultation、pathway、vte、transfusion、voiceMedical、frontPage、internetPrescription、rectification、nursingRisk、orderCds、nursingIo、nursingEventReview、pacuRecord、preopAssessment、surgery、pathwayVariance、patientDelegation 等）。
- 未入链的核心病历写路径（本轮 PowerShell 实测 chain=0 / repoRef 计数，共 27 个）：admissionNoteAggregator(0,1)、progressNoteAggregator(0,1)、surgeryRecordAggregator(0,1)、nursingRecordAggregator(0,1)、medicalHeaderAggregator(0,1)、dischargeSummaryAggregator(0,1)、consentFormAggregator(0,1)、orderAggregator(0,1)、medicalQcAggregator(0,2)、terminalQcAggregator(0,14)、qcRectificationAggregator(0,2)、timelinessAggregator(0,1)、medicalArchiveAggregator(0,1)、medicalCopyAggregator(0,1)、labInterpretAggregator(0,1)、imagingInterpretAggregator(0,1)、dischargePlanAggregator(0,3)、emrTemplateAggregator(0,0)、clinicalPathwayAggregator(0,0)、eSignatureAggregator(0,0)、emrAssessmentAggregator(0,2)、emrGrade5Aggregator(0,0)、emrLevel5Aggregator(0,0)、emrSmartScoreAggregator(0,0)、nursingRiskPatternAggregator(0,0)、medicalRecordDeepAggregator(0,0)、outpatientAggregator(0,8)。注意区分：`rectificationAggregator.ts`（chain=4、repoRef=3）与 `qcRectificationAggregator.ts`（chain=0、repoRef=2）为两个不同文件；`frontPageAggregator.ts`（chain=5、repoRef=5）已入链。
- SQL 设施：`50-audit.sql:13-31` audit.audit_logs（prev_hash 28、hash 29；触发器 39-41；verify_chain() 44-56；58-59 注释声明只增不改不删，**但全 init 目录实测无真实角色回收语句**）；`51-audit-chain-lock.sql` advisory 锁 + 触发器 16-58；`52-audit-chain-state.sql` 链头单行表 24-38、触发器 41-90；`68-audit-chain-concurrency.sql` uq_audit_chain_prev 唯一约束 17-24；`229-audit-log-enhance.sql:13` 补 hospital_id；`246-audit-log.sql:36-45` data_access_log（无链、无触发器、文件内无 REVOKE/GRANT）；`328-security-compliance.sql:52-63`（prev_hash 62/entry_hash 63；37 行注释声明只增不改，未落 REVOKE/GRANT）；`384-consult-audit-trail.sql:27-41`（无 updated_at/触发器，仅线程级联删除 29）。
- 全局 SQL 批量扫描：ENABLE ROW LEVEL SECURITY=0、CREATE POLICY=0、CREATE ROLE=0、REVOKE=1（328:23 为注释行）、GRANT=2（真实仅 `369-ops-analysis.sql:105` GRANT SELECT ... TO PUBLIC）。

**2. 法规差距**

- 《网络安全法》第二十一条要求日志留存不少于六个月；等保 2.0 安全审计要求审计记录保护、防篡改、可追溯（GB/T 22239-2019）；当前主操作日志表无链、27 个病历写路径未入链，WORM 仅停留在注释与应用层约定。
- 《医疗机构病历管理规定》要求病历查阅、复制、修改留痕可追溯（国卫医发〔2013〕31号，具体条款待法规分片核对）；当前借阅 / 复印 / 销毁等写路径审计覆盖不完整。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `src/bff/aggregators/` 27 个病历写路径：在状态迁移与快照写入同事务内调用 `recordChainAudit`，动作类型覆盖创建 / 提交 / 审核 / 签名 / 退回 / 归档 / 封存 / 借阅 / 复印 / 注销。
- `deploy/postgres/init/`：为 audit.operation_log 补链列与触发器方向；以应用角色 + 数据库角色分层，落地 UPDATE/DELETE 权限回收（WORM）；data_access_log、security_audit_log、consult.audit_trail 补齐链 / 触发器 / 不可变约束方向。
- `src/bff/middleware/audit.ts`：补齐响应状态码记录；URL 查询串脱敏；写库失败重试与告警（替代 fire-and-forget 仅 warn）。
- 新增审计链校验工具方向：周期跑 verify_chain() 并输出断裂告警；导出审计记录时附链校验结果。

**4. 验收口径**

- 病历全量写动作（含状态迁移、退回、归档、借阅、复印、签名）100% 入链；链校验工具可检出任意单条篡改。
- 数据库层应用角色无审计表 UPDATE/DELETE 权限；审计写入失败不允许静默通过。
- 审计记录含操作者、角色、动作、资源类型 / ID、患者引用、结果、客户端 IP、UA、时间戳、trace_id；留存策略满足 ≥6 个月（医疗场景按病历保管年限归档）。

---

### P0-④ 多租户 RLS + 越权测试

**1. 现状代码证据与行为摘要**

- 租户列覆盖：`deploy/postgres/init/261-multi-tenant.sql:28-38`（iam.users）、`43-53`（clinical.patients）、`58-68`（clinical.visits）、`73-83`（clinical.orders）、`88-98`（clinical.medical_record_headers）仅五张表加 `hospital_id NOT NULL DEFAULT 'demo-hospital'`，FK→iam.tenants(id)（34-35/49-50/64-65/79-80/94-95）；**其余临床文书表无租户列**；101-102 行注释称称谓词叠加由 BFF `withTenantScope` 统一收口。
- 数据范围守卫未接线：`src/tenant/DataScopeGuard.ts:40-46` buildPredicate、`54-62` isRowVisible（fail-closed 55 行无 tenantId 拒绝）、`65-67` filterRows、`70-77` assertRowInScope、`81` 单例；除自身 + tenant/index.ts + tenant/types.ts 外业务代码零引用。
- 聚合器范围收口未接线：`src/bff/aggregators/tenantAggregator.ts:83-101` withTenantScope（hospitalId 空 fail-closed 抛错 84-88；权威覆盖既有谓词 93）、`112-121` filterRowsByScope、`162-168` validateTenantAccess、`128-149` staffHospitalDir 进程内目录；仅自身 + coverageDetailAggregator:267 + coverageReportAggregator:241 + testCoverageAggregator:631 三处引用，**临床聚合器 / 仓储零调用**。
- 中间件：`src/bff/middleware/tenant.ts:26` ctxTenantMap、`29-31` getTenantContext、`37-55` tenantContextMiddleware（resolveFromRequest 39；MedicalAgentError→403 43-48；其他 500 50-53）；`server.ts:6789` 接线。
- 测试缺口：`tests/integration/multiTenant.test.ts` 仅覆盖 iam.tenants 注册表持久化与 admin 403/401；`tests/unit/DataScopeGuard.test.ts` 为内存谓词纯函数单测，与临床聚合器 / 仓储零接线；未见临床病历跨租户行级隔离断言。
- DB 层：RLS/POLICY/ROLE/REVOKE 全局实测近零（见 P0-③ SQL 扫描口径）。

**2. 法规差距**

- 等保 2.0 要求不同边界数据隔离、访问控制强制覆盖到记录级别（GB/T 22239-2019，条款待法规分片核对）；当前隔离仅靠 BFF 上下文，临床表无租户列、仓储查询无谓词、数据库无 RLS，存在跨租户读取风险。
- 《个人信息保护法》要求处理活动的访问控制与最小必要；集团多院区 / 医共体场景下患者数据跨院可见须有明确授权边界。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `deploy/postgres/init/`：补齐临床文书表 `hospital_id` 列与外键；按表启用 RLS 与 POLICY，策略方向为 `hospital_id = current_setting('app.hospital_id')`；建立应用数据库角色与默认拒绝模型。
- `src/db/repositories/`：查询方法接入租户谓词，与 `DataScopeGuard.buildPredicate` 对齐；租户上下文缺失时 fail-closed。
- `src/bff/aggregators/`：临床聚合器统一调用 `withTenantScope` 包裹仓储读写；`tenantAggregator.validateTenantAccess` 用于跨院 / 跨科室访问审批留痕方向。
- `tests/integration/`：新增跨租户越权用例（A 院医生读取 B 院患者病历 / 医嘱 / 检验报告被拒），覆盖创建、查询、导出、汇总报表四条路径。

**4. 验收口径**

- 任一临床表在数据库层启用 RLS；不带租户上下文的查询返回空或被拒绝；绕过 BFF 直连数据库按租户隔离仍生效。
- 集成测试覆盖跨租户读取 / 写入 / 导出越权拒绝；租户上下文中间件对缺失 / 伪造租户标识返回 403。
- 集团 / 医共体跨院共享场景走显式授权与审计留痕，不默认放行。

---

### P0-⑤ 密钥轮换与 refresh token 机制补全

**1. 现状代码证据与行为摘要**

- refresh token：`src/bff/routes/auth.ts:149-168` issueTokens（access 2h=7200s 161、refresh 7d=162；jti 双发 151-152）；`:246-287` refresh（251 verifyJwt；257-263 查会话台账；264 loadViewById；269 轮换；271 吊销旧 refresh jti；273 旧 access 标记失效；274 登记新会话；isDemo 跳过 257/270）。
- JWT：`src/bff/middleware/auth.ts:68-81` signJwt（alg 固定 HS256 72、HMAC 单钥 79、默认 7200s 70）；`:84-116` verifyJwt（timingSafeEqual 98-101；nbf/exp 113-114）；`:47-57` getJwtSecret（生产必须 JWT_SECRET 否则 53 行 throw；开发态默认弱密钥 56 仅 console.warn 55）。
- API key / webhook：`250-api-keys.sql:43-60`（key_prefix 45、key_hash 46、permissions 48、status 49、expires_at 50、revoked_at 54；唯一索引 59-60；注释 71 默认 90 天过期、74 revoked 立即失效）；`251-webhooks.sql:66` webhooks.secret 明文列。
- 未取证到：密钥版本号、双密钥并行过渡、历史密钥归档与轮换计划；token 撤销列表持久化之外的设备 / 会话统一管理；webhook secret 加密存储。

**2. 法规差距**

- 等保 2.0 与密码管理要求密钥定期更换、更换过程受控、失效密钥归档（GB/T 22239-2019，条款待法规分片核对）；当前单密钥无轮换过渡机制，密钥泄露后无法平滑切换。
- 《网络安全法》第二十一条要求身份鉴别凭证安全管理；refresh token 已具备轮换，但会话台账与密钥生命周期管理未闭环。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `src/bff/config/runtimeEnv.ts` 与 `middleware/auth.ts`：引入密钥版本号与密钥集（当前 / 上一版本并行校验方向），支持轮换过渡窗口。
- `src/db/repositories/` 会话台账：补齐会话设备 / 客户端 / 登出状态查询与批量吊销方向；refresh token 单次使用约束校验。
- `deploy/postgres/init/251-webhooks.sql`：webhook secret 改为哈希 / 加密存储方向；API key 表补充轮换时间戳与上次使用时间方向。
- 运维方向：密钥轮换预案、轮换审计留痕、密钥泄露应急吊销流程（本轮不涉及部署脚本改动，仅列方向）。

**4. 验收口径**

- 密钥轮换期间新旧密钥签发 / 校验均通过；旧密钥到期自动停用；轮换动作入审计链。
- refresh token 重放（旧 jti 复用）被拒绝；登出后会话与 token 立即失效；webhook secret 不以明文落库。

---

### P0-⑥ 导出 / 批量接口逐字段脱敏拦截

**1. 现状代码证据与行为摘要**

- 导出路由内存态：`emrExportV14.ts:18` 内存 exportState 数组；`26/37` 权限码 emr-export:read/write；`46-58` POST 创建上报任务（buildExportPayload 46-52、validateExportSchema 53、push 57；payload 无逐字段脱敏拦截）。`emrDataExportV14.ts:22/36` 权限码；`26-27` computeExportColumns/buildExportTask；`39` 状态恒 pending；不查真实库。
- 脱敏内存态：`emrMaskingV14.ts:15` 硬编码 demoNote（姓名「张三丰」/ 手机 13812345678 / 身份证明文样例 110101199001011234）；`23` 权限码 emr-masking:read；`29-30` maskByRole 纯函数，返回 original+masked，未接真实病历正文。`emrDeidentifyOutputV14.ts:24/35` 权限码；`38-42` deidentifyPatientData 仅处理 name/idCard/phone 三字段；内存。`emrFineGrainedAuthV14.ts:24/35` 权限码；`38-43` role/allowedFields/requestedFields 由 body 传入；checkFieldLevelPermission 43；无 DB 角色-字段绑定表。
- 通用脱敏工具：`src/bff/utils/mask.ts:25-30` maskName、`45-53` maskIdCard、`66-74` maskPhone；字段集合 NAME_FIELDS 77-84（name/realname/patientname/username/doctorname/appointmentname）、IDCARD_FIELDS 86（idcard/idno/certno/identitycard）、PHONE_FIELDS 88（phone/mobile/telephone/phonenumber）；`103-126` maskBody 递归，**仅字段名命中三族即掩码；地址 / 邮箱 / 医保卡号 / 紧急联系人 / 签名图像 / 病历正文均不处理；未命中字段名即原样保留**。文件头 2 行残留旧品牌字样。
- 并存实现：dataMaskingAggregator 独立一套（maskName/maskIdCard/maskPhone/maskAddress + maskSensitiveData 角色差异：admin 全量 / doctor·nurse·patient 脱敏；嵌套对象与数组递归、大小写不敏感字段名；地址截断到区 / 街道级；单测 `tests/unit/dataMasking.test.ts`）；审计日志 maskBody 走窄版 `utils/mask.ts`。
- 明文落库点：`191-medical-header.sql:5、8` patient_name、id_card 明文；`183-medical-record-copy.sql:5、7-9` applicant_name、id_card_no NOT NULL、contact_phone NOT NULL、purpose 明文；正向设计参照 `20-clinical.sql:12-30` patients 四态字段。

**2. 法规差距**

- 《个人信息保护法》要求敏感个人信息最小必要、访问与导出受控；《数据安全法》要求数据分类分级与导出防护；等保 2.0 要求数据保密性与导出审计（GB/T 22239-2019）。当前导出 / 批量 / 打印出口无统一拦截层，字段级规则散落在两套纯函数中，覆盖范围不足。
- 《医疗机构病历管理规定》复印 / 复制须登记留痕（国卫医发〔2013〕31号）；当前导出任务不连真实库、无逐字段受控策略、无导出审计与水印追溯。

**3. 建议改动切入点（目录 / 模块方向，不含具体代码）**

- `src/bff/middleware/` 或 `src/bff/aggregators/` 新增统一出口方向：报表导出、批量下载、打印、患者门户共享四类出口前，按角色-字段-场景配置执行脱敏 / 拦截 / 审计。
- 统一 `src/bff/utils/mask.ts` 与 dataMaskingAggregator 两套规则方向：集中字段注册表（姓名 / 证件 / 手机 / 地址 / 邮箱 / 医保卡号 / 紧急联系人 / 签名图像 / 病历正文），保留角色差异规则与嵌套 / 数组递归。
- `deploy/postgres/init/`：病历表头、复印申请表等明文 PHI 迁移到掩码 / 加密 / 哈希存储方向；字段级授权绑定表（角色、资源类型、字段、脱敏策略）方向。
- 导出动作纳入 P0-③ 审计链；导出清单、字段范围、操作者、时间、用途留痕；PDF / 打印出口接入水印方向（P2-20 联动）。

**4. 验收口径**

- 任一真实病历数据离开数据库的出口（接口返回、批量导出、打印、共享链接）均经过统一脱敏拦截；非授权角色不可见明文 PHI；未命中字段名的对象不会默认放行。
- 字段级规则可配置、可审计；导出动作 100% 入链并记录字段范围；集成测试覆盖角色差异、嵌套对象、数组、病历正文、地址 / 邮箱 / 医保卡号 / 紧急联系人等场景。

---

## 四、基线遗留债登记（基线遗留，非本轮新增发现）

> 以下条目摘自两份基线报告，均标注「基线遗留，非本轮新增发现」；本轮取证仅复核其在 EMR 范围内的相关性，未据此归因为本轮新增缺口。

### 4.1 摘自 `reports/2026-10-25-架构与全栈审计整改报告.md`

| 编号 | 基线位置 | 遗留事项 | EMR 相关性 |
|---|---|---|---|
| P1-5 | 报告行 297；§3.5.2 行 192 | `tests/unit/onlineConsult.test.ts:94` 稳定失败（9 pass / 1 fail），夹具 `acceptedAt='2026-10-16T08:00:00Z'` 早于当前日期，`sweepTimeouts(now)` 先标超时绕过空小结校验；属互联网诊疗状态机 / 夹具日期耦合 | 关联互联网诊疗病历域（矩阵 #29） |
| P1-6 | 报告行 298；行 193 | `tests/unit/db/ddl.test.ts:25` 稳定失败，12 个 deploy SQL 括号告警（`255/306/316/319/323/324/342/352/356/360/363/366-*.sql`，含 `356-medical-record-deep.sql` 病历相关） | 关联借阅 / 病历深度表 DDL |
| P1-7 | 报告行 299；行 199-200 | 2 个单元测试文件 Bun 1.2 / Windows 挂起（`core/DeepSeekProvider.test.ts`、`resilience/bulkhead.test.ts`），0 fail | 弱相关（AI 解读链路） |
| P1-12 | 报告行 300 | 内部组件明文（PG exporter sslmode=disable、Redis 无 TLS、Kafka PLAINTEXT、ES SSL false、Kibana http） | 关联审计 / 数据传输保密性 |
| P1-13 | 报告行 301 | 单体 actuator env 暴露 + anyRequest().permitAll() | 关联接口暴露面 |
| P1-14 | 报告行 302 | K8s Secret `change-me-*` 占位 | 关联密钥管理（P0-⑤ 环境侧遗留） |
| P1-15 | 报告行 303 | 根 6 条 high + web 1 条 high + 7 条 moderate 依赖升级 | 通用依赖债 |
| P1-19 | 报告行 307 | 前端 53 条菜单声明权限但路由裸挂、仅父级登录守卫生效（A2 报告 E 节 163-215 行清单，含病历页面，未逐一归属） | 关联权限与细粒度授权（矩阵 #23） |
| P1-20 | 报告行 308 | 前端 335 条路由位于主布局闭合之后，不在父级 RequireAuth/AppLayout 包裹内（router 10435-10829 批次） | 关联前端鉴权覆盖 |
| P2 BFF 审计 | 报告行 316 | 审计表无 trace_id 列；落库原始 URL 查询串未脱敏；白名单遗漏 password/email/地址/银行卡号；审计只记请求不记响应状态码；证据 `audit.ts:35-43`、`:72-73`；`mask.ts:77-88`；`log.ts:39,52`；保留期默认 180 天（`src/constants/medical.ts:314`，可由 AUDIT_RETENTION_DAYS 覆盖） | 与矩阵 #22、P0-③、P0-⑥ 直接相关，本轮已复核同源证据 |
| P2 重复注册 | 报告行 315 | 127 个同 method+path 重复注册（42 文件内自重复 + 85 跨文件），样例 `GET /api/v1/emr/version-compare`、`/api/v1/emr/versions`、`/api/v1/auth/permissions` | 关联病历版本 / 报表路由 |
| P2 裸信封 | 报告行 314 | 362 处裸 `json({code:...})` 未走 ok()/fail() 统一信封，71 个路由文件 | 通用接口契约债 |
| P2 LLM | 报告行 317 | LLM 端点 / 占位模型 / 占位密钥仅告警不失效关闭；4 个聚合器 / 工具缺省回退外网默认 BaseURL（`config/env.ts:43/45/47`、`:128-139`；`chatAggregator.ts:270`、`aiRecordAggregator.ts:58`、`medical-tools/interpret/llmClient.ts:42`、`emergencyAggregator.ts:423`） | 关联 AI 辅助病历 / 解读域 |
| P2 纵深 | 报告行 318 | `csrf.ts:39`、`rateLimit.ts:29,54`、`error.ts:24` 残余 DEMO_MODE 分支，当前被启动期 assertProductionNotDemoMode 整体阻断 | 关联 P0-① 纵深收口 |
| P2 测试 | 报告行 319；行 207 | 8 个 real-persistence 用例守卫早退 false-pass（`tests/integration/real-persistence.test.ts:57/81/92/145/191/225/262/310`） | 关联集成测试可信度 |
| P2 前端路由 | 报告行 320 | 其余 170 组重复挂载 | 前端路由债 |
| P2 前端架构 | 报告行 321 | 双守卫 / 双权限 store 并存（guards.tsx 读 authStore，RequireAuth.tsx 读 userStore） | 关联前端鉴权 |
| P2 前端权限 | 报告行 322 | 页面级权限码 `medicalRecord:compare` 后端目录缺失；路由 5068 未挂路由级守卫；证据 `pages/clinical/medical-record-version-compare-v2/index.tsx:35` | 关联病历版本对比域 |
| P2 前端孤儿 | 报告行 323 | 21 个候选孤儿页面目录 | 前端结构债 |
| P2 旁路 Python / Java / 小程序 / 部署观测 | 报告行 324-329 | 与 EMR 弱相关，本轮矩阵不展开 | 弱相关 |
| P2 品牌残余 | 报告行 330；行 424 | 运行时残余旧称组词面、文件头注释旧称、占位域名 / 镜像路径 / 内部 UID、docs/operations 旧文件名引用；整仓约 1226 行 / 963 文件（含注释与文档）。本轮复核补登 `src/` 内三类基线 P2 残留（仅登记、未改源码）：① 文件头旧产品名「健澜科技数智医院智能体 / 数智医院」：`src/bff/middleware/audit.ts:2`、`src/bff/utils/mask.ts:2`、`src/db/repositories/userRepo.ts:2`、`src/bff/routes/fhir.ts:96`；② 文件头注释旧代号 `GangOS / Jianlan OS`：`src/knowledge-platform/index.ts:2`、`src/knowledge-platform/types.ts:2`；③ `gangos_*` 指标前缀：`src/bff/observability/metrics.ts`（7 行）、`src/core/observability/metrics.ts`（6 行），随遥测重构统一改名，已列 backlog | 品牌合规债，与本矩阵 P0 并列跟踪 |

- 基线测试口径（报告行 26、204-208）：BFF 单元 2038 文件 / 15086 pass / 2 真实失败；集成 136 文件 / 210 pass / 0 fail / 1025 skip；前端 vitest 170 文件 / 1392 pass / 3 失败；集成跳过构成 612 DB 守卫 + 413 describe.skip；本机无 PostgreSQL/Redis、`bunfig.toml` preload 强制 `DEMO_MODE=1`。**本轮未复测上述数字**，仅作基线陈述。

### 4.2 摘自 `reports/patrol/patrol-20261025-2313.md`

| 编号 | 基线位置 | 遗留事项 | EMR 相关性 |
|---|---|---|---|
| F1 / F2 | §4.5 行 141-148；§9.2 行 266 | `onlineConsult.test.ts` 日期硬编码失败、`ddl.test.ts` check-sql 误报为基线遗留，留证不修复，源文件相对 HEAD 零改动（148 行） | 同 4.1 P1-5 / P1-6 |
| 环境缺口 | §9.3 行 268-274 | 本机无运行中 PostgreSQL（135 个既有集成用例未跑；380-385 六表 DDL 未做真实建表 / 触发器 / 索引 / 约束演练）；无 LLM 凭证（BFF 与前端未对运行中后端做真实 SSE/HTTP 联调；SSE 断线重连、超时降级、token 计量、浏览器视觉走查未覆盖）；全量 `bun test`、`bun run build`、`bun test --coverage` 未执行；services-java 无 Maven/JVM 未独立构建；services-python、radar-inference 不在验证范围；前端预留未挂 UI：transcribe/listAudit/getRulesSnapshot/replayEvents/getProfile | 本轮取证环境限制与该基线一致 |
| §7.5 | 行 264 | B/C 类旧称命中：B 类 6 文件 55 命中；C 类基线遗留 11 文件 52 命中；A 108 + B 55 + C 52 = 215 | 品牌残余基线口径 |

---

## 五、取证统计与限制说明

### 5.1 本轮实测计数（2026-10-25 静态扫描，不含排除目录）

| 类别 | 计数 | 口径 |
|---|---|---|
| 后端路由文件 `src/bff/routes/*.ts` | 2396 | 文件名级静态计数 |
| 后端聚合器 `src/bff/aggregators/*.ts` | 1945 | 文件名级静态计数 |
| SQL 迁移 `deploy/postgres/init/*.sql` | 354 | 文件名级静态计数 |
| 前端 `emr-*` 页面目录 `web/src/pages/` | 430 | 目录名前缀匹配 |
| 前端 `clinical/` 子目录 | 99 | 目录级匹配 |
| 前端 service 文件 `web/src/services/api/` | 508 | 文件名级静态计数 |
| 集成测试 `tests/integration/` | 137 | 文件名级静态计数 |
| 单元测试 `tests/unit/` | 2054 | 文件名级静态计数（递归子目录） |
| EMR 相关集成测试（文件名宽松匹配） | 28 | 清单见 5.3 |
| `emr*V14.ts` 路由 | 423 | 本轮实测：repositories 引用 0、auth:false 0 |
| 调用 `recordChainAudit` 的聚合器 | 75 | 本轮 Grep 实测 |

### 5.2 本轮逐文件 Read 复核范围（要点清单）

- 基线文档：`docs/COMPLIANCE_BLUEPRINT.md`、`docs/COMPLIANCE.md`、两份 reports 相关章节。
- 中间件 / 配置 / 租户：`middleware/auth.ts`、`middleware/audit.ts`、`middleware/tenant.ts`、`config/runtimeEnv.ts`、`tenant/DataScopeGuard.ts`、`aggregators/tenantAggregator.ts`、`db/repositories/auditChainRepo.ts`、`db/repositories/userRepo.ts`。
- 核心仓储（本轮全文或区段复核，行号已入矩阵）：medicalRecordRepo、admissionNoteRepo、medicalHeaderRepo、dischargeSummaryRepo、progressNoteRepo、surgeryRecordRepo、nursingRecordRepo、orderRepo、prescriptionRepo、medicalQcRepo、terminalQcRepo、qcRectificationRepo、timelinessRepo、consentFormRepo、dischargePlanRepo、labInterpretRepo、imagingInterpretRepo、medicalArchiveRepo、medicalCopyRepo、medicalRecordReviewRepo、internetPrescriptionRepo（257-309）、emrTemplateRepo（236-353）、frontPageRepo（270-385）、surgicalChecklistRepo（45-96）。
- 后端临床 / V14 路由（本轮复核代表样本 30+）：eSignature、medicalArchive、medicalCopy、medicalQc、order、progressNote、dischargeSummary、nursingRecord、surgeryRecord、consentForm、medicalHeader、labInterpret、imagingInterpret、fhirGatewayDetail、fhirOperationsRoutes、patientTimeline、patientPortal、terminalQc、qcRectification、timeliness、prescriptionReview、surgeryChecklist、informedConsentV13、anesthesia、patient360、voiceMedical、fhir、fhirResources、fhirGatewayV5、hl7IntegrationV5、integrationHl7、clinicalPathway、dischargePlan、internetPrescription、emrTemplate、emrExportV14、emrMaskingV14、emrDeidentifyOutputV14、emrFineGrainedAuthV14、emrDataExportV14、emrDestroyApplyV14、emrWatermarkTraceV14、emrSignatureV14、emrCopyRequestV14、emrTimelineGenerateV14、emrPatient360V14、emrQcDashboardV14、emrTemplateVersionV14、emrIcdCodingV14、emrArchiveV14、emrBorrowV14、emrStructuredInputV14、emrTerminologyV14、emrDefectClosedLoopV14、m542Routes。
- SQL 关键文件（本轮全文 / 区段复核）：02-schemas、20-clinical、21-clinical-diagnoses、50-audit、51-audit-chain-lock、52-audit-chain-state、53-medical-record-front-page、68-audit-chain-concurrency、181-discharge-summary、182-medical-record-archival、183-medical-record-copy、184-admission-note、185-progress-note、187-consent-form、188-orders、189-nursing-record、190-surgery-record、191-medical-header、192-medical-qc、193-timeliness、194-emr-assessment、210-terminal-qc、215-qc-rectification、217-emr-template、218-prescription-review、219-surgery-checklist、220-emr-grade5-assessment、229-audit-log-enhance、246-audit-log、250-api-keys、251-webhooks、252-medical-record-quality、261-multi-tenant、265-e-signature、212-e-sign、315-integration-hl7、328-security-compliance、347-internet-hospital、356-medical-record-deep、371-emr-template-v2、384-consult-audit-trail。
- 其余 V13 / V14 / m-series 报表路由同「权限码守卫 + 纯函数聚合器 + 内存种子 / Map / 数组」范式，本轮以批量扫描（repositories 引用计数、auth:false 计数、权限码提取）为口径，未逐个体检；矩阵相应行已标注「未逐个体检」或归入 mock 范式说明。

### 5.3 EMR 相关集成测试清单（28 个，文件名宽松匹配；均 skipIf 无 DB，本轮未运行）

ai-interpretation.test.ts、critical-realtime.test.ts、critical-value-loop.test.ts、dischargePlan.test.ts、empi.test.ts、internet-hospital-foundation.test.ts、internetDelivery.test.ts、internetPayment.test.ts、internetPrescription.test.ts、lab-interpretation.test.ts、medical-record-front-page.test.ts、medical-record-qc.test.ts、mobileNursing.test.ts、nursingAdmin.test.ts、nursingEventReview.test.ts、nursingIntervention.test.ts、nursingIo.test.ts、nursingRisk.test.ts、orderCds.test.ts、pacuRecord.test.ts、pathway.test.ts、patientPortal.test.ts、preopAssessment.test.ts、rectification.test.ts、scenario4-critical-value.test.ts、scenario5-prescription-audit.test.ts、surgicalChecklist.test.ts、voice-medical-record.test.ts。

单元测试相关：`tests/unit/eSignature.test.ts`（台账纯函数，persistSignature 未覆盖）、`tests/unit/mask.test.ts`（name/idcard/phone 三族）、`tests/unit/dataMasking.test.ts`（name/idcard/phone/address + 角色规则 + 嵌套 / 数组 / 大小写）、`tests/unit/integrationHl7.test.ts`、`tests/unit/fhirGatewayV5.test.ts`、`tests/unit/hl7IntegrationV5.test.ts`、`tests/unit/integration/Fhir.test.ts`（22 类资源模型 / 序列化 / 必填校验）、HL7Parser/Builder/Hl7Enhancements.test.ts。

### 5.4 未取证项清单（本轮静态扫描范围内未找到对应实现，不等于生产环境绝对不存在）

1. 病历正文 DB 层 append-only 触发器 / 版本历史表：未取证到（`medical_records` 无 content_hash/prev_hash，无版本历史表）。
2. CA 机构证书签名 / 可信时间戳机构接入：未取证到真实落地；e_signature / e_sign_log 仅存 SHA-256 正文哈希与 PNG 图像。
3. 跨租户临床病历越权集成测试：未取证到；现有多租户测试仅覆盖注册表持久化与 admin 403/401。
4. 导出 / 批量接口逐字段脱敏拦截测试：未取证到；现有单测仅覆盖两套脱敏纯函数本身。
5. 水印落库表 / 打印层 / PDF 层拦截：未取证到。
6. 病历销毁审批链、保管年限校验、见证人、销毁清册：未取证到。
7. CDA R2 文档表与转换服务：SQL 与代码零命中。
8. 独立术语字典服务表（ICD-10 全量码表、ICD-9-CM-3、LOINC、SNOMED CT、药品 / 科室字典）与版本映射关系：未取证到。
9. 麻醉记录书写 / 签名仓储路由：表结构存在（anesthesia_records），书写闭环未取证到。
10. 门诊病历独立书写落库主路由：表结构存在（medical_records.outpatient、diagnoses），门诊书写主路由未取证到与表接通。
11. 患者门户在线查看病历 / 报告的真实授权归属校验：除 `/api/v1/patient/portal` 真实路由外，M454 六类数据为 auth:false mock。
12. 密钥版本号 / 双密钥轮换过渡 / 历史密钥归档：未取证到。
13. 27 个核心病历写路径聚合器未接哈希链（本轮实测 chain=0，清单见 P0-③）。
14. 前端 `/api/v1/progress/notes`、`/surgery/consents`、`/medical-records/homepages`、`/surgery/checklists`、`/patients/:id/summary` 在后端无对应路径（静态比对，未联调）。
15. FHIR 资源持久化、`$history` 落库、HL7 v2↔FHIR 双向转换服务：未取证到在线实现。

### 5.5 环境限制与结论边界

- 本轮为**静态代码取证**：未启动 PostgreSQL / Redis / BFF / 前端，未执行构建、全量测试、覆盖率统计；集成测试源码内 DB 守卫均未在本轮运行。运行时行为、并发竞态、错误码、页面视觉效果须在具备数据库与凭证的环境复测。
- 前后端端点一致性为静态代码比对结论，未联调验证；m-series 演示路由承接前端调用的判断基于 `repositories/` 引用计数为 0 与内存 `Map` / 种子标记，未做运行时抓包确认。
- 法规条款归属不确定处均标注「待法规分片核对」；标准版本（电子病历分级评价 2021 版评估口径、互联互通成熟度测评最新版本）需在合规立项时由法规专员二次核对。
- 本文档不沿用旧会话「176 切片 / 97.92% 覆盖率」等未复测叙事数字；所有计数均为 2026-10-25 本轮静态扫描实测口径。
- 本轮未修改任何产品源码，未执行 git push / tag，未新建定时任务；除本文档外未写入其他文件；文档内不含密码、token 或真实连接串。
