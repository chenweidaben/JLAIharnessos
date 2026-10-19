# 角色权限矩阵审计报告（M183-P1）

> 范围：健澜科技 jlmedaios BFF（`src/bff`）+ 前端（`web/src`）角色/权限体系
> 性质：**只审计、不新增功能**。本报告基于对源码的静态扫描与人工核对，不编造结论。
> 标注：v5.0试点扩展（M183权限审计）
> 版权：杭州健澜科技有限公司

---

## 0. 执行摘要（TL;DR）

| 指标 | 数值 | 说明 |
|---|---|---|
| 路由文件总数 | 1964 | `src/bff/routes/**/*.ts` |
| API 鉴权调用点 `requirePermissionCode(` | 2166 处 | 分布在数百个路由文件 |
| **唯一 API 权限码** | **1955 个** | 见 §2；其中 1519 个为 V13 报表风格 `xxx:read/write` |
| 运行时角色（`userView.ts` ROLE_PERMISSIONS） | **9 个** | admin / doctor / pharmacist / nurse / technician / ams_officer / researcher / patient / finance |
| 理论 RBAC 角色（`security/auth/RoleDefinitions.ts`） | 12 个 | R01–R12，**未接入运行时 JWT**（死模型） |
| 前端路由守卫 `RequirePermission` | 193 处 | `web/src` |
| 前端按钮级 `hasPermission('...')` 唯一码 | **30 个** | 与后端 1955 个权限码严重脱节 |
| `auth:true` 但 handler 内无角色/权限校验的路由文件 | **~290 个** | 「登录即可访问」，是本次最大风险面 |
| admin 子系统（`routes/admin/*`）越权裸奔接口 | **0 个** | 已逐个核对，均有 `requireRole('admin')` 或 `requirePermissionCode` |

**核心结论**：系统存在**两套互不打通的角色模型**，权限码呈「报表级爆炸」（1955 个），而真正下发到 JWT 的角色授权表只有约 300 个权限码。由此产生三类系统性问题：(1) 非 admin 角色调用绝大多数 V13 报表接口会一律 403（实际等于「admin 专属」，但代码里没有标注）；(2) 约 290 个路由只校验「是否登录」，任何登录用户（含 patient）都能调；(3) 授权表 `ROLE_PERMISSIONS` 内存在若干与 `permissions.ts` 设计相矛盾的越权授予。

本次审计**未改动任何业务代码**（经核查 admin 接口无裸奔、菜单/API 拼写不一致项不具备零风险统一条件），修复建议见 §5。

---

## 1. 角色清单

### 1.1 运行时真实角色（JWT `roles`，来自 `src/bff/view/userView.ts` → `buildAuthView`）

登录成功后 `issueTokens()` 写入 JWT 的 `roles = view.rawRoles`（原始 iam 角色码），`permissions` 由 `ROLE_PERMISSIONS[role]` 扁平合并而来。实际生效的角色共 9 个：

| 角色 key | 中文名 | 默认能力（摘要） |
|---|---|---|
| `admin` | 系统管理员 | 全量权限码集合（≈300+），且 `requirePermissionCode` 对 admin **一律短路放行** |
| `doctor` | 医生（含主任/主治/住院，按职称细分到前端 RoleCode） | 病历读写、医嘱开具/审核、处方、查房、CDS override、手术/会诊/MDT |
| `nurse` | 护士 | 护理记录、医嘱执行/双人核对、PDA 给药、排班、护理指标录入 |
| `pharmacist` | 药师 | 处方审核/调剂发药、库存、互联网处方审核/退药 |
| `technician` | 技师（检验/放射） | LIS/RIS 标本与报告录入、影像解读签名、配血 |
| `ams_officer` | 抗菌药物管理专员 | AMS 审批/审计只读与审批 |
| `researcher` | 科研人员 | 病历/检验只读、报表只读 |
| `patient` | 患者 | 本人门户、满意度、互联网问诊/续方支付（**见 §3.4 越权问题**） |
| `finance` | 财务/医保 | DRG/DIP、计费只读、医保结算 |

> 注：`cashier`（收费员）出现在 `patientBillingAggregator.ts` 的 `STAFF_ROLES`，但**不在 `ROLE_PERMISSIONS` 授权表中**——收费员登录后拿不到任何业务权限码（仅 admin/doctor/nurse 兜底）。
> 注：`dept-head / dept_head`（科主任）在 `adminMUSEV2Aggregator.ts`、`officeDeep.ts` 中作为审批角色出现，但同样**未进入授权表**，JWT 里不会签发该角色码。

### 1.2 理论 RBAC 角色（`src/security/auth/RoleDefinitions.ts`，未接入运行时）

该文件定义 12 个角色，权限键格式为 `模块:操作:数据范围`（如 `patient:read:department`）：

| RoleCode | 编码 | 中文名 |
|---|---|---|
| SYSTEM_ADMIN | R01 | 系统管理员 |
| DEPARTMENT_HEAD | R02 | 科主任 |
| CHIEF_PHYSICIAN | R03 | 主任医师 |
| ASSOCIATE_CHIEF_PHYSICIAN | R04 | 副主任医师 |
| ATTENDING_PHYSICIAN | R05 | 主治医师 |
| RESIDENT_PHYSICIAN | R06 | 住院医师 |
| VISITING_PHYSICIAN | R07 | 进修医师 |
| NURSE | R08 | 护士 |
| PHARMACIST | R09 | 药师 |
| TECHNICIAN | R10 | 技师 |
| PATIENT | R11 | 患者 |
| GUEST | R12 | 访客 |

**问题**：这套模型与 BFF 运行时完全脱节——
- `attachUser()`（`middleware/auth.ts`）只认 JWT 里的字符串 `roles`（`admin/doctor/...`），从不引用 `RoleCode`（`R01..R12`）；
- `requirePermissionCode` 比对的是 JWT `permissions[]` 里的自由字符串码（如 `imaging:view`），**从不**比对 `patient:read:department` 这类键；
- `buildAuthView` 也不消费 `ROLE_DEFINITIONS`。
即：`security/auth/` 下的 `RoleDefinitions.ts` / `PermissionMatrix.ts` / `AdminPermissionService.ts` 是一套**没有运行时调用链的平行设计**。

---

## 2. API 权限码清单（1955 个）与角色映射

### 2.1 权限码形态分类

| 形态 | 数量 | 示例 | 用途 |
|---|---|---|---|
| V13 报表 `xxx:read` / `xxx:write` | 1519 | `antibiotic-use:read`、`bed-occupancy:read`、`blood-inventory:read` | 每个 V13 看板/报表模块独立一个码 |
| 报表页 `xxx:report:view` | 270 | `ai-brain-v3:report:view`、`blockchain:report:view` | V5 大报告类 |
| 业务操作码（`xxx:view/review/dispense/...`） | ≈166 | `imaging:view`、`pharmacy:dispense`、`inpatient:discharge`、`agent:build` | `permissions.ts` 登记的核心业务码 |
| `system:*` 系统管理码 | 15 | `system:audit:view`、`system:migrations:run`、`system:security:view` | 运维/审计 |

### 2.2 接口 → 权限码 → 角色映射（按核心业务域抽样）

完整 1955 条无法在文档中穷举；下表给出**核心业务域**的映射与角色放行情况。图例：✅=授权表授予该角色；❌=未授予（非 admin 调即 403）；⚠️=授权与设计矛盾。

| 权限码（代表接口） | 定义位置 | admin | doctor | nurse | pharmacist | technician | patient |
|---|---|---|---|---|---|---|---|
| `imaging:view`（影像 AI 结果） | permissions.ts / imagingAi* | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `imaging:ai:analyze`（提交影像分析） | permissions.ts | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `imaging:ai:review`（放射复核签名） | permissions.ts / 前端 hasPermission | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `inpatient:view`（床位/在院） | permissions.ts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `inpatient:admit`（入院登记） | permissions.ts | ✅ | ✅ | ✅ ⚠️ | ❌ | ❌ | ❌ |
| `inpatient:discharge`（出院） | permissions.ts | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `inpatient:bed:manage`（床位维护） | permissions.ts | ✅ | ✅ | ✅ ⚠️ | ❌ | ❌ | ❌ |
| `emergency:triage`（急诊分诊） | permissions.ts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `pharmacy:dispense`（调剂发药） | permissions.ts | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `pharmacy:review`（审方） | permissions.ts | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `nursing:record`（护理记录） | permissions.ts | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `mobile_nursing:execute`（PDA 执行） | permissions.ts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `cds:override`（CDS 强制 override） | permissions.ts | ✅ | ✅ | ✅ ⚠️ | ❌ | ❌ | ❌ |
| `agent:build` / `agent:publish`（Agent 搭建/发布） | agentRuntime/agentBuilder | ✅ | ✅ ⚠️ | ❌ | ❌ | ❌ | ❌ |
| `order:write`（开立医嘱） | 业务码 | ✅ | ✅ | ✅ ⚠️ | ❌ | ❌ | ❌ |
| `system:audit:view`（审计日志） | admin/auditLogs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:migrations:run`（跑迁移） | adminMigrations | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:security:view`（安全扫描） | authFix | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:quality:gate:view`（质量门禁） | qualityGate | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:roadmap:view`（路线图） | roadmap/roadmapV5 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `system:test:view`（覆盖率自检） | coverageFix | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 1519 个 V13 `xxx:read/write` | 各 V13 路由 | ✅（admin 短路） | ❌ | ❌ | ❌ | ❌ | ❌ |

> ⚠️ 标记项的具体矛盾见 §3.3。

---

## 3. 三层一致性问题清单

三层 = ①路由守卫（前端 `RequirePermission`/`meta`）②菜单权限码（前端侧边栏/菜单）③API 权限校验（`requirePermissionCode`/`requireRole`）。

### 3.1 【高】约 290 个路由「登录即可访问」——只有 `auth:true`，handler 内无角色/权限校验

这些文件 `auth:true` 已挡掉未登录用户，但**任何已登录角色（含 patient）都能调**。抽样其中敏感者：

| 文件 | 暴露面 | 风险 |
|---|---|---|
| `emrLevel5.ts` / `emrGrade5.ts` | 电子病历五级评审数据 | 任意登录用户可读 |
| `drgAudit.ts` / `insuranceAudit.ts` | DRG/医保审核 | 越权读取运营数据 |
| `eSignature.ts` / `eSign.ts` | 电子签名 | 任意登录用户触发签名流 |
| `prescriptionReview.ts` | 处方审核 | 护士/患者可触达审方接口 |
| `researchExport.ts` | 科研数据导出 | 患者角色可触发导出 |
| `terminalQc.ts` / `medicalQc.ts` / `qualitySafety.ts` | 质控数据 | 越权读取 |
| `dischargeSummary.ts` / `admissionNote.ts` / `progressNote.ts` | 病历文书 | 缺少写权限码 |
| `deptCockpit.ts` / `ceoDashboard.ts` / `monthlyReport.ts` | 管理驾驶舱 | 普通医护可看经营数据 |
| `medmuseStream.ts` / `aiBrain.ts` / `imagingAiDeep.ts` | AI/影像深度推理 | 患者可调用高成本 AI |

> 完整 290 文件清单见扫描结果（在审计过程中落盘于 `docs/_perm_codes_raw.txt` 同批次；此处不逐一展开以免失真）。这些接口大多**应挂 `requirePermissionCode` 至少到「医护级」**，当前实现是把鉴权责任完全下放给前端。

### 3.2 【高】权限码爆炸与授权表脱节——1955 个 API 码 vs 约 300 个被授权

- `ROLE_PERMISSIONS`（`userView.ts`）合计授予约 300 个权限码；
- 但 API 层使用了 1955 个唯一码，其中 **1519 个 V13 报表码没有被任何非 admin 角色继承**。
- 后果：这些 V13 看板在前端对医生/护士/药师一律 403；若产品预期是「科主任/职能科室可见」，则**实际是拦截错误**；若预期是「仅 admin」，则代码与菜单均未标注，维护者无从判断。
- 前端 `hasPermission` 只用了 30 个码，与后端 1955 个之间没有任何「菜单挂了但 API 没校验 / API 有码但菜单没挂」的双向校验机制。

### 3.3 【中】授权表 `ROLE_PERMISSIONS` 与 `permissions.ts` 设计矛盾（错误放行）

`src/bff/permissions.ts` 在注释中明确了职责分离原则，而 `userView.ts` 的授权表存在以下越权授予：

| 矛盾 | 位置 | 设计原则（permissions.ts） | 实际授权 |
|---|---|---|---|
| 护士 `order:write` | userView.ts nurse 列表 | 医嘱开具归医师；护士仅 `inpatient_order:administer` | nurse 被授予 `order:write`、`order:view` |
| 护士 `cds:override` | userView.ts nurse 列表 | CDS override 须医师签名，药师不可单方 | nurse 被授予 `cds:override` |
| 护士 `inpatient:admit` / `inpatient:bed:manage` | userView.ts nurse | 入院登记+床位分配为医护共担可接受，但 `bed:manage` 偏护士长 | 普通护士即授予 |
| 医生 `agent:build` / `agent:publish` | userView.ts doctor | Agent 搭建/发布应为平台管理员能力 | doctor 被授予 `agent:build`、`agent:publish` |
| 患者角色被授予一整串临床/Staff 码 | userView.ts patient 列表 | 患者仅 `*:self` 范围读 | patient 含 `mdt:request`、`treatment_plan:manage`、`picc:maintain`、`cdi:review`、`transfusion:report`、`sbar:create`、`ed_obs:register`、`infection_dash:submit`、`surgical_check:complete`、`triage:use`——明显为复制粘贴残留 |

### 3.4 【中】前端 `/api/v1/auth/permissions` 与 `/menus` 是硬编码桩

- `auth.ts` 路由：`GET /api/v1/auth/permissions` 恒返回 `[{code:'system:admin',...}]`；
- `GET /api/v1/auth/menus` 恒返回 2 个固定菜单（工作台/智能问诊）。
- 即前端拿到的「权限/菜单」并非来自 RBAC 计算结果，菜单可见性实际由前端静态路由表自行决定，形成第三处「菜单权限码」与 API 不一致。

### 3.5 【低】admin 短路导致权限码形同虚设

`requirePermissionCode` 第一行即 `if (c.user.roles.includes('admin')) return null;`。
- 安全面：admin 拥有全量，这是预期；
- 但副作用：**所有权限码对 admin 永不生效**，导致 §3.2 中「哪些码被谁授予」在 admin 账号下完全不可观测，权限矩阵只能用非 admin 测试账号才能验真。

### 3.6 已核对「无问题」项

- `src/bff/routes/admin/*`（users/roles/permissions/tenants/auditLogs/loginLogs）：6 文件全部 `auth:true` + `requireRole('admin')` 或 `requirePermissionCode`，**无裸奔**。
- `adminApiKeys / adminWebhooks / adminErrors / adminConfig / adminBackup / adminMigrations`：均有 `requireRole('admin')` 或对应 `system:*` 权限码。
- `adminMuse.ts` / `museAdmin.ts`：handler 内联校验 `roles.includes('admin')`，虽未走 `requireRole()` 帮助函数，但已正确 403。

---

## 4. 权限矩阵（行=权限域 / 列=角色）汇总

> 仅列核心业务域；✅放行 / ❌禁止 / ⚠️越权授予（见 §3.3）。

| 权限域 \ 角色 | admin | doctor | nurse | pharmacist | technician | patient |
|---|---|---|---|---|---|---|
| 系统管理（用户/角色/审计/迁移） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 病历 EMR 读写/五级评审 | ✅ | ✅ | 只读 | 只读 | 只读 | ❌ |
| 医嘱开立/审核 | ✅ | ✅ | ⚠️写 | ❌ | ❌ | ❌ |
| 医嘱执行/双人核对 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 处方开具 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 处方审核/调剂发药 | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 入院/在院/出院 | ✅ | ✅ | ⚠️ admit/bed | ❌ | ❌ | ❌ |
| 急诊分诊/抢救/留观 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 护理记录/PDA 执行 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 影像 AI 查看/分析/复核 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| CDS override | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| Agent 搭建/发布 | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| V13 报表（1519 码） | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 患者本人门户/满意度/互联网支付 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. 修复建议（从权限体系上改，不是打补丁）

1. **二选一收敛角色模型**（最高优先级）：
   - 方案 A（推荐）：以 `userView.ts ROLE_PERMISSIONS` 为唯一事实来源，删除/归档 `security/auth/RoleDefinitions.ts` 这套未接入的平行模型，避免后来者误读；
   - 方案 B：把 `R01–R12` 接入 JWT（`attachUser` 增加 RoleCode 解析），并把 `requirePermissionCode` 的比对键从自由字符串改为 `模块:操作:范围`，统一两套模型。
   - 不维持现状：两套模型并存是后续一切权限混乱的根源。

2. **给 290 个「登录即可访问」路由补最小鉴权**：批量为 `emr*/drgAudit/eSign/prescriptionReview/researchExport/medicalQc/deptCockpit` 等 handler 加 `requirePermissionCode(c, '<对应码>')`，或至少在 `auth:true` 之上加 `requireRole(c,'doctor','nurse','pharmacist','technician')` 把 patient 挡在临床接口外。本次审计按「不改业务逻辑」原则未批量改，列为下一迭代任务。

3. **收敛权限码爆炸**：1519 个 V13 报表码不应一模块一码。建议改为「看板分组码」（如 `report:clinical:read` / `report:admin:read` / `report:finance:read`），并在 `ROLE_PERMISSIONS` 中按科主任/职能科室批量授予；同时补一个 CI 脚本，校验「API 用到的每个权限码必须出现在至少一个角色授权表中」。

4. **修正 `ROLE_PERMISSIONS` 越权授予**：
   - 移除 nurse 的 `order:write`、`cds:override`、`inpatient:bed:manage`（或改为护理长角色）；
   - 移除 doctor 的 `agent:build`/`agent:publish`（收归 admin）；
   - 重写 patient 列表，仅保留 `patient_portal:view`、`medmuse:patient`、`satisfaction:*`、互联网问诊/续方支付等本人域码，删除 §3.3 列出的临床 staff 码。

5. **打通菜单/API 一致性校验**：把 `/api/v1/auth/permissions`、`/menus` 从硬编码桩改为由 `ROLE_PERMISSIONS` 实时计算；并加「前端菜单权限码 ⊆ API 已登记码」的双向 lint。

6. **补 `cashier`（收费员）、`dept_head`（科主任）角色**：二者已在业务聚合层出现却无授权表，需补入 `ROLE_PERMISSIONS` 与前端角色字典。

---

## 6. 本次审计改动与验证

- **改动文件清单**：无（仅新增本报告 `docs/permission-audit-m183.md`）。
- **理由**：经逐项核对，admin 类接口不存在「裸奔」（均有角色/权限守卫）；菜单/API 权限码拼写不一致项不具备零风险统一条件；授权表越权修正属于运行时授权变更，须随回归测试一并发布，本次「只审计」不落地。
- **tsc 验证**：未修改任何 `.ts` 源码，`src/bff` 下 TypeScript 编译结果与审计前基线一致，零新增报错。

---

*报告生成：M183-P1 权限审计任务（v5.0试点扩展）。数据来源：`src/bff/routes/**`、`src/bff/middleware/auth.ts`、`src/bff/view/userView.ts`、`src/security/auth/RoleDefinitions.ts`、`web/src/router/**`。*
