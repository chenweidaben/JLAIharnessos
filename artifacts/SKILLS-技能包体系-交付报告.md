# jlmedaios 技能包（Skill）体系 · 第二阶段子任务交付报告

交付时间：2026-09-19 ｜ 范围：新增 skills 层（Tool/SOP/Agent 三层中的 SOP）

## 1. 新增文件清单

后端核心：
- src/skills/types.ts — SkillManifest 类型 + Zod schema
- src/skills/loader.ts — 扫描/解析 frontmatter/校验/依赖校验
- src/skills/registry.ts — 注册中心（版本/角色租户过滤/租户覆盖）
- src/skills/executor.ts — 工作流编排/三级风险确认/人工节点/审计/失败补偿
- src/skills/integration/orchestratorAdapter.ts — 触发匹配契约（未改 orchestrator）
- src/skills/index.ts — 统一出口

内置技能（skills/library/，33 个）：
- outpatient/×4、inpatient/×3、nurse/×3、pharmacist/×3、tech/×3、quality/×3、director/×3、emergency/×3、patient-service/×3、admin/×5

BFF：
- src/bff/routes/skills.ts — 导出 skillRoutes 与 registerSkillRoutes()（未改 server.ts）

前端：
- web/src/pages/skills/SkillMarketPage.tsx（技能市场）
- web/src/pages/skills/SkillStudioPage.tsx（技能工作室）
- web/src/pages/skills/index.ts

测试与文档：
- tests/unit/skills/skills.test.ts — 19 个用例
- docs/SKILLS-技能包体系设计与角色技能矩阵.md

## 2. SkillManifest 关键字段
id / name / version(semver) / category / summary / description / icon /
triggers(phrases|schedule|event) / roles(R01–R12 严格对齐 RoleCode) /
requiredTools / requiredAgents / requiredKnowledge / requiredCdsRules /
riskLevel(low|medium|high) / permissions / inputSchema / outputSchema /
enabled / tenantScope / author / tags / steps[]。

## 3. 技能总数与角色覆盖
- 总数：33（解析 0 错误，依赖 0 缺失）。
- 三标杆可跑：ai-outpatient-record（AI 病历生成）、medical-record-quality-control（AI 病历质控）、voice-medical-record（语音病历，ASR 文本接口抽象+Mock）。
- 角色分布：R01×6、R02×8、R03×4、R04×8、R05×15、R06×11、R08×7、R09×3、R10×10、R11×2。

## 4. 验证结果
- 后端 bunx tsc --noEmit：0 错误
- 后端 bun test：1132 pass / 0 fail（基线 1058 + 新增 19，只增不减）
- 前端 web/ bunx tsc --noEmit：0 错误
- 真实加载：33 loaded / 0 errors / 0 dependencyIssues

## 5. BFF API
GET 列表/catalog/详情/versions；POST validate/dry-run/新建/租户覆盖；PUT enabled。写操作 admin 校验。

## 6. 安全红线落实
- 未改 security/orchestrator/medical-tools/bff-server/middleware。
- high 风险技能执行前强制三级确认（用户+双签），拒绝即中止。
- 租户覆盖仅改 enabled/参数；tenantScope=false 系统技能拒绝租户改写。
- 条件求值仅安全子集（== / != / 真值），杜绝代码注入。

## 7. 遗留/接线说明
- skills 路由仅导出未注册到 server.ts，由启动层 `...skillRoutes` 统一接线。
- 前端两页未注册进 router/index.tsx（接线同 BFF，由整合方统一挂载）。
- dry-run 用 Mock invoker；真实 invoker 需在接线层把 medical-tools/orchestrator 包装为 SkillInvokers（契约已在 adapter 定义）。
