# 前端路由债清理与一致性核对报告（web/src 范围 / A2 前端）

- 执行日期：2026-10-25
- 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
- 授权范围：仅 `web/src/**`（router、pages、services/api、store、菜单/权限/守卫、前端测试）。未触碰 `web/package.json`、`web/package-lock.json`、`src/**`、`tests/**`、`deploy/**`、`docker-compose*.yml`、`README*`、`services-*`；全程未执行 `git add` / `git commit`。
- 基线档案：`…/agents/o_000pKWRkDCO/scratch/baseline-findings.md` §4（路由基线）、§8（文件归属）。
- 改动前快照：`…/agents/s_000pKYeEYyf/scratch/router-index.backup.tsx`（10834 行）；A2 去重后快照 `web/src/router/index.tsx` 10824 行，净删 10 行。收口时刻活树 10835 行，差额 11 行来自并行会话 M86-E `consult-agent` 接线（详见 §4.3，非 A2 改动）。
- 口径说明：下文「备份行号」指改动前快照行号（快照文件留存、恒定不变）；「当前行号」指收口时刻活树实测行号。并行会话在 335–336、8803–8811 插入 `consult-agent` 接线，使 8800 行之后的 A2 路由行号相对 A2 快照后移 2–11 行；凡引用活树行号处均已按收口时刻实测刷新。

---

## 一、5 组重复路由去重结论（任务一）

本轮共删除 5 个重复 `<Route>` 块、3 个删除后不再被引用的 lazy 常量、2 处陈旧挂载注释；2 处保留路由的本地组件别名归并到规范 lazy。所有页面组件、service、store 一律保留未删；删除前均已核对被删挂载引用的组件与保留处一致，未误删唯一定义；未改写未点名的其他路由。

### 1.1 `emergency/report-v2`（基线称 ×2，实测 ×2）

| 处置 | 位置（备份行号 / 当前行号） | 证据 |
|---|---|---|
| **保留** | 当前 6037 `<Route path="emergency/report-v2" element={<EmergencyMgmtV2 />} />` | 主 AppLayout 急诊管理 V2 批次；lazy 当前 1177 `@/pages/emergency/report-v2`；页面 `web/src/pages/emergency/report-v2/index.tsx` 第 40 行默认导出 `EmergencyMgmtV2Page` |
| 删除 | 备份 6017 `<Route path="emergency/report-v2" element={<EmergencyV2 />} />`（连同备份 6016 注释「M222-C：急救体系 V2」） | 与保留处指向同一模块；删除后 `EmergencyV2` 无其他引用 |
| 删除 | lazy 备份 1155 `const EmergencyV2 = lazy(() => import('@/pages/emergency/report-v2'));`（连同备份 1154 注释） | 删除后全文件无引用，随挂载一并移除 |

防混淆核验：独立路径 `emergency-mgmt/report-v2`（当前 6061，lazy 1201，目录 `pages/emergency-mgmt/report-v2`）与本组无关，原样保留。

### 1.2 `system/dict`（基线称 ×2，**实测 ×4**）

| 处置 | 位置（备份行号 / 当前行号） | 证据 |
|---|---|---|
| **保留** | 当前 8900 `<Route path="system/dict" element={<SystemDictPage />} />` | 主 AppLayout「系统管理」组 8899–8908 内；菜单 `SideMenu.tsx:248` key `/system/dict`、perm `system:config`；lazy 当前 284；页面 `web/src/pages/system/dict/index.tsx` 默认导出 `SystemDictPage`（第 8 行附近） |
| 删除 | 备份 9180 `<Route path="system/dict" element={<SystemDictPage />} />` | 多批次重复注册，组件同保留处 |
| 删除 | 备份 9356 `<Route path="system/dict" element={<SystemDictPage />} />` | 同上 |
| 删除 | 备份 10596 `<Route path="system/dict" element={<SystemDictPage />} />` | 同上 |
| 删除 | lazy 备份 387 `const DictManagementPage = lazy(() => import('@/pages/system/dict'));` | 删除后无引用 |
| 归并 | 保留处备份 8895 原引用别名 `DictManagementPage`，当前 8900 归并为规范别名 `SystemDictPage`（lazy 284） | 两个 lazy 均解析同一目录索引 `pages/system/dict/index.tsx` |

遗留孤儿（按指令不删，留收口判定）：扁平文件 `web/src/pages/system/dict.tsx` 默认导出 `DictManagementPage`；全 `web/src` Grep 仅命中其自身第 9 行，无任何导入方；目录索引在 Vite/TS 解析中优先于同名扁平文件。

### 1.3 `order/detail`（基线称 ×2，实测 ×2）

| 处置 | 位置（备份行号 / 当前行号） | 证据 |
|---|---|---|
| **保留** | 当前 9561 `<Route path="order/detail" element={<OrderDetailPage />} />` | M302 列表/详情成对组，与当前 9560 `order/list` 并列；lazy 当前 426；页面 `web/src/pages/order/detail/index.tsx` 默认导出 `OrderDetailPage`（第 7 行附近） |
| 删除 | 备份 8915 `<Route path="order/detail" element={<OrderDetailPage />} />` | M257 孤立详情挂载，无配对 list；组件同保留处 |

### 1.4 `skills`（基线称 ×2，**实测不存在 path 级重复，本轮不去重**）

- 全文件不存在裸 `skills` 路由，仅两条不同 path 的兄弟路由：
  - 当前 8836 `skills/market`（`SkillMarket`，lazy 768–770，多行 `import('@/pages/skills').then((m) => ({ default: m.SkillMarketPage }))`）；
  - 当前 8837 `skills/studio`（`SkillStudio`，lazy 771–773，多行映射 `m.SkillStudioPage`）。
- `web/src/pages/skills/index.ts` 第 7–8 行再导出 `SkillMarketPage`、`SkillStudioPage`；两个页面文件在位。
- 基线「skills ×2」系把两条兄弟路由误计为重复；本轮不删任何一处、不合并。

### 1.5 `emergency/triage-detail`（**path 本身仅 1 处，重复的是另一个 lazy 别名**）

| 处置 | 位置（备份行号 / 当前行号） | 证据 |
|---|---|---|
| **保留** | 当前 10665 `<Route path="emergency/triage-detail" element={<EmergencyTriageDetailPage />} />` | M422 批次（该批位于主布局闭合之后，见 §六.3）；lazy 当前 4698；页面 `web/src/pages/emergency/triage-detail/index.tsx` 默认导出 `EmergencyTriageDetailPage`（第 8 行附近） |
| 别名归并 | 动态路由当前 8840 `emergency/triage/:visitId`，备份 8835 原用重复别名 `EmergencyTriage`，当前已改为 `EmergencyTriageDetailPage` | 两个 lazy 指向同一模块 `@/pages/emergency/triage-detail` |
| 删除 | lazy 备份 337 `const EmergencyTriage = lazy(() => import('@/pages/emergency/triage-detail'));` | 归并后无引用，随删除 |

防混淆核验：独立列表页 `emergency/triage`（当前 10508，`EmergencyTriagePage`，目录 `pages/emergency/triage`）与本链路无关，原样保留。

### 1.6 与基线口径的三处偏差（实测纠正）

1. `system/dict` 实测为 ×4（保留 1、删除 3），非基线所称 ×2。
2. `skills` 无重复 path，不构成去重对象。
3. `emergency/triage-detail` 的 path 只挂载 1 次，重复发生在同模块的第二个 lazy 别名上。

---

## 二、命名与引用一致性核对结果（任务二）

### 2.1 v2 病历版本对比链路（M628）——导入/导出名一致，无死引用

| 层 | 文件（绝对路径前缀 `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\src\`） | 命名 / 证据 |
|---|---|---|
| 路由 lazy / 挂载 | `router/index.tsx` lazy 3264；挂载 5068 `clinical/medical-record-version-compare-v2` | 本地别名 `MedicalRecordVersionCompareV2M628Page` |
| 页面 | `pages/clinical/medical-record-version-compare-v2/index.tsx` | 第 32 行默认导出 `MedicalRecordVersionCompareV2M628Page`；第 29 行导入 `useMedicalRecordVersionCompareV2M628Store`；第 30 行导入类型 `VersionCompareRow` |
| Store | `store/medicalRecordVersionCompareV2M628Store.ts` | 第 33 行导出 `useMedicalRecordVersionCompareV2M628Store`；从 service 导入 `diffStructured`、`fetchVersionsForCompare`、`RecordVersion`、`VersionCompareRow`，与 service 导出逐一对应 |
| Service | `services/api/medicalRecordVersionCompareV2M628.ts` | 导出 `VersionCompareRow`（interface）、`fetchVersionsForCompare`、`diffStructured`，并再导出类型 `RecordVersion` |

页面解构的 `recordId / versions / leftNo / rightNo / loading / error / demo / load / selectLeft / selectRight / rows` 全部在 `useEffect`、`useMemo` 与 JSX 中被使用，无未使用字段、无死引用。

### 2.2 两条院感 v2 链路——各自独立，未串混

| 链路 | 路由 lazy / 挂载 | 目录 | Store（hook） | Service 导出 | 页面默认导出 |
|---|---|---|---|---|---|
| M637 院感监测趋势 `clinical/infection-monitor-v2` | lazy 3282；挂载 5086 | `pages/clinical/infection-monitor-v2/index.tsx` | `store/infectionMonitorV2M637Store.ts` → `useInfectionMonitorV2M637Store` | `services/api/infectionMonitorV2M637.ts`：`fetchInfectionTrends`、`InfectionTrendBundle`、`DeptInfectionRate`、`InfectionTrendPoint`、`HandHygiene` | `InfectionMonitorV2M637Page` |
| M662 院感监测 `clinical/infection-monitoring-v2` | lazy 3332；挂载 5136 | `pages/clinical/infection-monitoring-v2/index.tsx` | `store/infectionMonitoringV2M662Store.ts` → `useInfectionMonitoringV2M662Store` | `services/api/infectionMonitoringV2M662.ts`：`fetchInfectionMonitoring`、`InfectionMonitoringBundle`、`InfectionMonitoringItem`、`ISOLATION_META` | `InfectionMonitoringV2M662Page` |

两条路由 path、目录名、store 文件名、service 文件名、hook 名、页面默认导出名互不交叉；Store 从 service 导入的符号均在导出清单内。

### 2.3 非 v2 旧目录 / 旧链路取证（只取证，未删除，供收口判定）

**v1 病历对比孤儿链（页面 → store → service 自闭合，无外部导入方，router 未挂载）：**

| 层 | 文件 | 证据 |
|---|---|---|
| 页面 | `pages/clinical/medical-record-version-compare/index.tsx` | 第 28 行默认导出 `MedicalRecordVersionCompareM615Page`；第 18–19 行导入 v1 store 与 v1 service |
| Store | `store/medicalRecordVersionCompareStore.ts` | 第 30 行导出 `useMedicalRecordVersionCompareStore`；第 8 行从 v1 service 导入 `fetchVersionDetail / loadVersionsForCompare / diffVersions / VersionDiffRow` |
| Service | `services/api/medicalRecordVersionCompare.ts` | 导出 `VersionDiffRow`、`diffVersions`、`loadVersionsForCompare`；第 11 行从 `./medicalRecordVersions` 导入 `fetchVersionDetail`、`RecordVersion`，第 52 行再导出 `fetchVersionDetail` |
| Router 侧证 | `router/index.tsx` | Grep `medical-record-version-compare` / `medicalRecordVersionCompare` 仅命中 v2 三行（3263 注释、3264 lazy、5068 挂载）；无 v1 路径挂载 |

共享 service `services/api/medicalRecordVersions.ts` 不属于孤儿：在线链路 `/clinical/medical-record-versions`（lazy 3218，挂载 5022）经 `store/medicalRecordVersionsStore.ts` 正常使用它。

**其他无引用遗留：**

- `pages/system/dict.tsx`（默认 `DictManagementPage`）：全 src 无导入方，见 §1.2。
- `router/outpatientRoutes.tsx`：导出 `outpatientRoutes: RouteObject[]` 与 default，主路由从未 import（`index.tsx` 本地导入仅 `./RequireAuth`、`./guards`、`@/components/layout/AppLayout`）；其内部指向 `@/pages/OutpatientPage`、`@/pages/OutpatientConsultPage`，与主路由 8888 `/outpatient` 链路并存，属独立未合并遗留模块。

### 2.4 待人工复核的候选未引用页面

`scratch/unreferenced-pages.txt` 列 21 个 `@/pages/` 导入未命中的候选目录/文件（清单见附录 A）。扫描器只匹配 `@/` 别名导入，未覆盖相对导入与组件内动态 import，结论为**候选待复核**，非确认孤儿；本轮未删除其中任何一项。

---

## 三、菜单 / 权限 / 路由一致性矩阵（任务三）

### 3.1 盘点口径与规模

- 业务菜单源：`web/src/components/layout/SideMenu.tsx`，共 132 项；`components/demo/Navbar.tsx` 8 项为演示站导航，不纳入业务矩阵。
- 路由：`web/src/router/index.tsx`，A2 快照挂载 3051 条，去重后 path 2846 个；收口时刻活树另含并行会话 M86-E 接入的 `consult-agent/chat` 1 条（§4.3），未纳入本矩阵快照。
- 后端权限目录：`src/bff/view/userView.ts`（只读核对，未修改），抽取权限码 302 个；并行会话 M86-E 的 `consult-agent:read/write/audit` 定义在 `src/bff/permissions.ts:208-210`，不在该目录快照内。
- 守卫实现：`router/guards.tsx`（`RequirePermission / PermissionWrapper / usePermission`，读 `store/authStore`）；`router/RequireAuth.tsx`（读 `store/userStore`）；`authStore.ts:338-341` 与 `userStore.ts:28-31` 的 `hasPermission` 均支持 `*` 通配 + 精确匹配。
- 只读盘点脚本：`scratch/analyze-menu-route.ps1`；全量明细：`scratch/menu-route-audit.md` A–H 节（A 表为菜单→路由→目录逐行对照）。

### 3.2 矩阵结论

| 分类 | 数量 | 说明 / 证据位置 |
|---|---|---|
| 菜单→路由→目录一致，菜单码与路由码匹配且已包裹 | 67 | audit A 表 Note 为空的行 |
| 菜单声明粗码、路由使用专用细码（分层差异，D 节） | 11 | audit D 节 150–160 行；两类码后端目录均存在 |
| 菜单声明权限但路由裸挂、未包裹 `RequirePermission`（E 节） | 53 | audit E 节 163–215 行；仅父级登录守卫生效 |
| 菜单未声明权限，路由裸挂、页面目录在位 | 1 | `/medmuse/approvals`（路由 8813，OK_DIR） |
| 菜单已声明但无对应路由 | 0 | audit B 节 `(none)` |
| 路由组件目录缺失 | 0 | audit C 节 `(none)` |
| 菜单权限码在后端目录缺失 | 0 | audit F 节 `(none)` |
| 路由守卫码在后端目录缺失 | 0 | audit G 节 `(none)` |

### 3.3 本轮已补齐 / 已修正项（真实改动）

不存在「菜单已声明但页面目录缺失」的真实缺口（C 节为 0），因此本轮**未新建任何 service / store / 页面三件套**，也未凭空新增菜单外业务模块。实际完成的权限接线修正共 2 处：

1. `/billing`（当前 8866）：守卫由后端目录不存在的 `billing:view` 更正为 `billing:read`。后端存在证据 `userView.ts:39 / 178 / 300 / 372 / 414`；菜单 `SideMenu.tsx:140` 即为 `billing:read`。注释 8865 同步更正。
2. `/nursing-admin`（当前 9709–9716 多行块，守卫 9712）：守卫由后端目录不存在的 `nursing_admin:view` 更正为 `nursing_admin:schedule:view`。后端存在证据 `userView.ts:52 / 190 / 318`；菜单 `SideMenu.tsx:195` 即为该码。注释 694、9708 同步更正。

### 3.4 待办项（超出本轮授权，未擅自批量整改）

**D 节 11 条粗 / 细码分层**（菜单显隐用粗分组码，路由守卫用专用细码；两类码后端均在册，是否为既定两层 RBAC 需收口确认）：

| 菜单 path | 菜单码 | 路由码 | 路由行号 |
|---|---|---|---|
| `/emr/terminal-qc` | `report:quality:read` | `terminal_qc:view` | 5640 |
| `/emr/drug-review` | `report:quality:read` | `drug_review:view` | 5649 |
| `/emr/level5` | `report:quality:read` | `emr_level5:view` | 5658 |
| `/drg-budget` | `report:finance:read` | `drg_budget:view` | 10247 |
| `/inpatient-cost-monitor` | `report:finance:read` | `inpatient_cost:view` | 10257 |
| `/cost-attribution` | `report:finance:read` | `drg_attribution:view` | 10267 |
| `/dip` | `report:finance:read` | `dip:view` | 10307 |
| `/payment-selection` | `report:finance:read` | `payment_select:view` | 10317 |
| `/settlement-report` | `report:finance:read` | `settlement_report:view` | 10327 |
| `/settlement-analytics` | `report:finance:read` | `settlement_analytics:view` | 10337 |
| `/settlement-drilldown` | `report:finance:read` | `settlement_drilldown:view` | 10347 |

**E 节 53 条菜单声明权限但路由裸挂**，完整行号清单以 A2 快照 `scratch/menu-route-audit.md` E 节 163–215 行为准（活树行号随 §3.1 所述并行插入后移 2–11 行）；代表性条目（活树实测行号）：`/interpret`（9701，菜单码 `lab:interpret:view`）、`/outpatient`（8888，菜单码 `emr:view`）、`/ward`（8894，裸挂；菜单 `SideMenu.tsx:89` 声明 OR 数组 `['emr:view','order:view','emg:view']`）、`/emergency`（8839，菜单码 `emg:view`）、`/system/config|dict|organization|knowledge|cds-rules|tools|agents|integration|notifications|monitor`（8899–8908，菜单码 `system:config`）、`/lis`（9697，菜单码 `lab:read`）、`/ris`（9699，菜单码 `imaging:read`）、`/alerts`（8838，菜单码 `patient:view`）等。本轮未批量补包裹，留收口决策。

**H 节其余 170 组重复挂载**：除 §一点名 5 组外的整批重复注册（security 28 组、fhir 12 组、tenants/tenant 12 组、emergency 7 组、cds 7 组、emr 6 组等），完整证据在 audit H 节 223–768 行；超出本轮授权，未动一行。

---

## 四、新增 / 修改文件绝对路径清单

### 4.1 本轮修改（唯一文件）

- `C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1\web\src\router\index.tsx`

改动明细：

- 删除 lazy 常量 3 个：备份 337 `EmergencyTriage`、备份 387 `DictManagementPage`、备份 1155 `EmergencyV2`；
- 删除重复 `<Route>` 块 5 个：备份 6017、8915、9180、9356、10596；
- 删除陈旧挂载注释 2 处：备份 6016、1154；
- 同步更正权限注释 3 处（当前 694 ↔ 备份 694、当前 8865 ↔ 备份 8860、当前 9708 ↔ 备份 9706）；
- 组件别名归并 2 处：当前 8840 动态路由 `EmergencyTriage` → `EmergencyTriageDetailPage`；当前 8900 `DictManagementPage` → `SystemDictPage`；
- 守卫权限码更正 2 处：当前 8866 `billing:view` → `billing:read`；当前 9712 `nursing_admin:view` → `nursing_admin:schedule:view`（备份 8861、9710）。

### 4.2 本轮新增文件

- 无（未新建任何 service / store / 页面 / 测试文件）。

### 4.3 工作树中存在、但非本轮改动（归属说明）

A2 本轮在 `web/src` 内仅实际改动 `router/index.tsx` 中本节 §4.1 列出的去重与权限接线条目；工作树其余改动均归属于更早会话或并行代理，本轮未读写、未回滚：

**更早会话遗留（2026-10-22，未跟踪或已修改）：**

- `web/src/store/cdrQueryV2M636Store.ts`：修改时间 2026-10-22 08:14，更早会话遗留改动，本轮未读写。
- `web/src/pages/clinical/infection-monitor-v2/`（目录，2026-10-22 08:07）；`web/src/pages/clinical/medical-record-version-compare/`（目录，2026-10-22 07:32）；`web/src/services/api/medicalRecordVersionCompare.ts`（2026-10-22 07:26）；`web/src/store/medicalRecordVersionCompareStore.ts`（2026-10-22 07:34）。

**并行会话 M86-E `consult-agent`（2026-10-25 17:26–17:35 落地，非 A2 产物）：**

- `web/src/router/index.tsx` 内并行插入：lazy `ConsultAgentChatPage`（当前 336，含 335 注释）与 `consult-agent/chat` 多行路由块（当前 8803 注释、8804 `<Route`、8805 `path`、8807 守卫、8811 `/>` 闭合），守卫码 `consult-agent:read`。
- `web/src/services/api/consultAgent.ts`（17:26:32）；`web/src/pages/consult-agent/`（`ConsultAgentChatPage.tsx`，17:31:55）。
- 该模块在本报告 §3 矩阵采集之后才接入：`SideMenu.tsx` 未声明对应菜单项；权限码 `consult-agent:read/write/audit` 定义在 `src/bff/permissions.ts:208-210`，不在 §3.1 的 `userView.ts` 302 码目录快照内。是否补菜单、是否纳入权限矩阵，属 M86-E 收口与后续代理决策，A2 未接线、未整改。

**依赖清单（禁止改动项，本轮未触碰）：**

- `web/package.json`、`web/package-lock.json`：工作树存在修改（mtime 2026-10-25 16:27，早于 A2 去重脚本 16:38），非本轮写入；本轮未执行 `npm install`、未升级任何依赖版本。

- `web/src` 之外的工作树改动（README、docker-compose、deploy、docs、`src/bff/**`、`tests/**`、`reports/**`、`.env` 等）属并行代理分工范围，不在 A2 归属内。

---

## 五、类型检查与前端测试实测结果（任务四门禁）

### 5.1 `tsc --noEmit`

- 命令（在 `web` 目录执行）：`.\node_modules\.bin\tsc.cmd --noEmit`（等价 `npm run typecheck`，脚本 `typecheck: tsc --noEmit`）。
- 改动前基线：基线档案 §1 实测 exit 0。
- 改动后首跑：`scratch/tsc-after.txt` 记录 `EXITCODE=0`，零诊断。
- 收口复跑：`scratch/tsc-final.txt` 记录 `EXITCODE=0`，零诊断；报告落盘后终检复跑 `TSC_EXIT=0`、`ESLINT_EXIT=0`，同文件追加留痕。
- 收口时刻活树复跑（含并行 M86-E `consult-agent` 模块）：`scratch/tsc-post-concurrent.txt` 记录 `EXITCODE=0`、0 条诊断。复跑过程中曾撞见并行代理保存中途的瞬时 `TS2345`（`ConsultAgentChatPage.tsx:479`，`ConsultDraft | null | undefined` 传入 `ConsultDraft` 形参，闭包内类型收窄丢失）；待其保存完整后复跑归零，该瞬时错误非 A2 改动引入，A2 改动文件 `router/index.tsx` 在三次 tsc 运行中均无诊断。
- 配置开启 `strict`、`noUnusedLocals`、`noUnusedParameters`；删除重复挂载后已同步移除不再被引用的 lazy 常量，未留下未用变量导致的类型错误。

### 5.2 vitest 实测

- 配置：`web/vitest.config.ts`，environment `jsdom`，`globals: true`，`setupFiles: ['./tests/setup.ts']`；include `tests/**/*.{test,spec}.{ts,tsx}`、`src/**/__tests__/**/*.{test,spec}.{ts,tsx}`；exclude `tests/e2e/**`、`node_modules/**`、`dist/**`；`testTimeout: 30000`。
- 命令（在 `web` 目录执行）：`.\node_modules\.bin\vitest.cmd run`（等价 `npm run test`，脚本 `test: vitest run`）；vitest 版本 v2.1.9。
- 真实测试文件盘点（按 include 口径）：可执行 **170 个**（`tests/components` 10、`tests/pages` 46、`tests/unit` 114）；`tests/e2e/**` 8 个被配置排除；`src/**/__tests__/**` 0 个。

**改动后即刻全量（A2 快照，原始输出 `scratch/vitest-after.txt`，1955 行）：**

| 指标 | 数值 |
|---|---|
| Test Files | 2 failed ｜ 168 passed (170) |
| Tests | 2 failed ｜ 1393 passed (1395) ｜ skipped 0 |
| Duration | 513.61s（transform 91.10s / setup 2254.26s / collect 666.87s / tests 3283.20s / environment 508.17s / prepare 86.97s） |
| 进程退出码 | 1（存在失败用例，vitest 以非零退出） |

**单独复跑当时两个失败文件（`scratch/vitest-failures-rerun.txt`）：** `Test Files 2 failed (2)`；`Tests 2 failed ｜ 11 passed (13)`；Duration 27.01s；`EXITCODE=1`。两条失败可确定性复现，非偶发。

**收口时刻活树全量复跑（原始输出 `scratch/vitest-post-concurrent.txt`，1967 行；命令同上前缀，17:38:20 启动）：**

| 指标 | 数值 |
|---|---|
| Test Files | 3 failed ｜ 167 passed (170) |
| Tests | 3 failed ｜ 1392 passed (1395) ｜ skipped 0 |
| Duration | 501.43s（transform 56.85s / setup 1897.48s / collect 469.75s / tests 3409.98s / environment 417.11s / prepare 68.26s） |
| 进程退出码 | 1 |

测试文件盘点复核：可执行仍为 **170 个**（`tests/components` 10、`tests/pages` 46、`tests/unit` 114）；`tests/e2e/**` 8 个被 exclude；`src/**/__tests__/**` 0 个；`web/tests` 内无 `consult-agent` 测试，既有测试零引用 `consultAgent / ConsultAgent`。

**失败 1（既有契约漂移，两轮全量均确定性复现，与本轮路由改动隔离）：**

- 用例：`tests/unit/components/pharmacyComponents.test.tsx > DispenseModal CDS block 红色警示与 override 必填 > 填写 override 原因后放行，提交携带批次/数量/override 并关闭`（断言点 `pharmacyComponents.test.tsx:255:41`）。
- 断言：`AssertionError: expected "spy" to be called at least once`（`api.dispense` 未被调用；隔离复跑同一文件时该用例仍失败）。
- 链路证据：组件 `components/pharmacy/DispenseModal.tsx:126 handleConfirm` → store `store/pharmacyStore.ts:152 dispense`（153 行先判 `dbUp`，159 行调 `pharmacyApi.dispense`）；测试 `beforeEach` 的 `resetStore()` 已置 `dbUp: true`（测试第 153 行），模块级 mock `@/services/api/pharmacy`（测试 25–36 行）；确认按钮按等待条件已使能（测试 243 行），点击后未进入 store → api 调用链。本轮未在授权范围内深挖具体早退点（候选：antd Modal `onOk` 在 jsdom 下的事件触发时机、store 动作前置状态与组件状态不同步）。
- 隔离性核验：该用例仅 import `DispenseModal / ReviewModal / pharmacyStore / api.pharmacy`；全 `web/tests` Grep 无 `router/index`、`AppRoutes`、`outpatientRoutes` 引用；本轮 diff 仅涉及 `router/index.tsx`，不构成该失败的输入。未修改测试、未修改被测组件。

**失败 2（既有契约漂移，两轮全量均确定性复现，与本轮路由改动隔离）：**

- 用例：`tests/unit/services/websocket.test.ts > M7-E WebSocket 重连补拉 > 收到带 seq 的消息更新 lastSeq，重连后按 lastSeq 补拉并分发错过事件`（测试 115:17）。
- 断言：期望 `get('/api/v1/outbox/events', { after_id: 5, limit: 100 })`；实际调用 `['/outbox/events', { after_id: 5, limit: 100 }]`，调用次数 1。
- 源码证据：`services/websocket.ts:137` 调相对路径 `/outbox/events`；136 行注释说明 baseURL 已带 `/api/v1`（`utils/config.ts`），刻意使用相对路径避免拼成 `/api/v1/api/v1/` 双前缀。测试 spy 断言全路径前缀，属测试与源码 baseURL 契约漂移。该用例不经过 router，与本轮改动隔离；未改测试、未改源码。

**失败 3（收口全量新现，隔离复跑通过，判定为并发负载超时抖动，非本轮改动引入）：**

- 用例：`tests/pages/transfusion-page.test.tsx > 新建申请：必填校验 + 提交调用 apply`（`tests/pages/transfusion-page.test.tsx:130`）。
- 报错：`Error: Test timed out in 30000ms`（配置 `testTimeout: 30_000`）。A2 快照同一用例通过（34441ms，见 `vitest-after.txt:800`，报告耗时含排队等待）；收口全量在多代理并发负载下触顶超时。
- 隔离复跑（`scratch/vitest-transfusion-rerun.txt`）：单独执行 `vitest run tests/pages/transfusion-page.test.tsx`，`Test Files 1 passed (1)`、`Tests 12 passed (12)`、Duration 64.64s、`VITEST_EXIT=0`；该用例本次 10830ms。文件内其余 11 条同时通过。
- 归因：全量运行 setup 累计 1897.48s、tests 累计 3409.98s，机器处于多会话并发压测状态，该长流程用例受调度抖动突破 30s 超时；用例链路不引用 router，A2 改动无法触达。未修改测试、未修改源码；建议收口时在空闲环境复跑全量，或将该长流程用例超时时间单独上调至 60s（属测试配置决策，本轮未越权改动 `tests/**`）。

**覆盖率口径：** plain `vitest run` 不采集覆盖率（未带 `--coverage`）。配置 `coverage.provider: 'v8'`，`all: false`，reporter `text/json/html/lcov`，`reportsDirectory: './coverage'`，include `src/**/*.{ts,tsx}`，exclude 测试目录、`src/mock/**`、`main.tsx`、`vite-env.d.ts`、`src/**/index.ts`、`src/router/**`、`src/types/**`；阈值 lines 80 / branches 70 / functions 80 / statements 80。采集命令为 `npm run test:coverage`（`vitest run --coverage`），本轮未执行，故无覆盖率数值可供上报。

### 5.3 ESLint / Prettier

- ESLint：`eslint src/router/index.tsx` 退出码 0；仅有 `.eslintignore` 已弃用的配置告警，非错误。
- Prettier：`prettier --check src/router/index.tsx` 退出码 1；改动前备份执行同一命令同样退出码 1，属基线遗留的全文件格式不合规。本轮未执行 `--write` 全量重排（10k+ 行遗留文件，重排会产生超大无关 diff）；新增 / 改动行沿用既有缩进风格。未升级任何依赖版本。

---

## 六、未解决风险与建议

### 6.1 53 条路由未做权限包裹（高优先）

这些路由只经过父级登录态守卫，已登录但未持有对应权限码的用户可直接键入 URL 进入对应页面。建议收口时按 E 节清单逐条补 `RequirePermission` 包裹；若决策为「菜单过滤即最终口径」，应在权限设计文档中明确记录该口径，并补齐对应测试用例。

### 6.2 170 组其余重复挂载（中优先）

H 节整批重复注册中，部分重复挂载使用的是不同组件（例：`operation/dashboard` 的 `OperationDashboardM480Page` 与 `OperationDashboardPage`；`emr/grade5` 的 `Grade5AssessmentPage` 与 `EMRGrade5V2`）。去重前必须先判定新旧版本权威关系、页面目录与菜单归属，不能按本轮 5 组的方式批量删除。

### 6.3 主布局闭合之后的游离路由批次（高优先）

根 `/` 父级路由（当前 4877–4884，`RequireAuth > AppLayout`）在当前 10403 处闭合；其后经 `/demo` 父级（10406–10415）与 `/m` 父级（10419–10434）两组独立布局后，10435–10829 共 **335 条** `<Route>` 位于顶层 `<Routes>` 之下，不在父级 `RequireAuth` 与 `AppLayout` 包裹内（§1.5 保留的 10665 `emergency/triage-detail` 即在该批次）。React Router v6 下这些相对 path 仍能匹配 URL，但页面不携带侧边栏 / 头部布局，且不经过父级登录守卫。建议收口将该批次迁回父级布局块内，或为其显式补 `AuthGuard` 与布局包裹。另：10830 `path="*"` 为顶层 NotFound 兄弟路由，10831 `</Routes>` 闭合，定位正确，不在风险批次内。

### 6.4 双守卫 / 双权限 store 并存（中优先）

`guards.tsx` 的 `AuthGuard / RequirePermission / PermissionWrapper / usePermission` 读 `store/authStore`（`isAuthenticated / permissions / roles`）；`RequireAuth.tsx` 读 `store/userStore`（`isLoggedIn / permissions`）。两套 `hasPermission` 判定逻辑一致（`*` 通配 + 精确匹配），但登录后需要保证两个 store 的权限数组同步，存在漂移风险。建议收口合并为单一权限 store 与单一守卫组件。

### 6.5 页面级权限码与后端目录不一致（低优先取证）

- 页面 `pages/clinical/medical-record-version-compare-v2/index.tsx:35` 内部按钮级判定 `medicalRecord:compare`，后端 `userView.ts` 权限目录中无此码；路由 5068 亦未挂路由级守卫。
- 建议收口统一页面级、路由级、后端三处权限码命名，并补路由级守卫。

### 6.6 候选孤儿目录待人工复核（中优先）

附录 A 21 个候选目录 / 文件需人工结合相对导入、动态 import、菜单与后端引用逐一确认后再决定是否删除；v1 病历对比链、`pages/system/dict.tsx`、`router/outpatientRoutes.tsx` 的取证见 §2.3，本轮按指令未删。

### 6.7 既有测试契约漂移 2 项 + 负载超时抖动 1 项（中优先）

药房 `DispenseModal` 提交链路、websocket 补拉路径前缀两项失败与本轮改动无关，两轮全量确定性复现，建议药房模块、消息通道模块分别做专项对齐（组件状态契约 / baseURL 断言口径）。另有输血页 `新建申请：必填校验 + 提交调用 apply` 在收口全量并发负载下触顶 30s 超时，隔离复跑 12/12 通过，判定为调度抖动而非回归（§5.2 失败 3）；建议空闲环境复跑全量，或将该长流程用例超时单独上调至 60s。本轮未修改测试来变绿，也未降级任何断言。

### 6.8 基线口径差异记录

基线档案 §4 记 router 为 10758 行、`system/dict ×2`、`skills ×2`、`triage-detail ×2`；实测改动前快照 10834 行，`system/dict` 为 ×4、`skills` 无 path 级重复、`triage-detail` 为 lazy 别名重复。本报告以实测证据为准。

---

## 附录 A. 候选未引用页面清单（待人工复核，扫描口径见 §2.4）

1. `pages/assets`
2. `pages/assistant`
3. `pages/brain`
4. `pages/emr-ai-defect-rootcause`
5. `pages/emr-ai-nursing-reco`
6. `pages/emr-ai-outpatient-record-gen`
7. `pages/emr-ai-preop-assess-reco`
8. `pages/emr-quality-trend`
9. `pages/emr-signature`
10. `pages/esignature`
11. `pages/help`
12. `pages/i18n`
13. `pages/im`
14. `pages/oa`
15. `pages/personal`
16. `pages/preventive`
17. `pages/procurement`
18. `pages/record`
19. `pages/superadmin`
20. `pages/user`
21. `pages/DashboardPage.tsx`

## 附录 B. 取证产物清单（本代理 scratch 目录）

| 文件 | 用途 |
|---|---|
| `router-index.backup.tsx` | 改动前 router 完整快照 |
| `analyze-menu-route.ps1` | 只读菜单 / 路由 / 权限 / 目录盘点脚本，可重跑复现矩阵 |
| `menu-route-audit.md` | A 菜单→路由→目录对照、B 无路由、C 目录缺失、D 权限不一致、E 未包裹、F/G 后端码缺失核验、H 170 组重复挂载明细 |
| `tsc-after.txt` | 改动后首次 `tsc --noEmit` 输出与 `EXITCODE=0` |
| `tsc-final.txt` | 收口复跑 `tsc --noEmit` 输出与 `EXITCODE=0`，含报告落盘后终检 `TSC_EXIT=0`、`ESLINT_EXIT=0` 追加留痕 |
| `tsc-post-concurrent.txt` | 收口时刻活树（含并行 M86-E 模块）复跑 `tsc --noEmit` 输出，`EXITCODE=0`、0 诊断 |
| `vitest-after.txt` | 改动后即刻全量原始输出（1955 行，2 failed 文件 / 2 failed 用例，含堆栈与 DOM 快照） |
| `vitest-failures-rerun.txt` | 两条确定性失败文件单独复跑输出与 `EXITCODE=1` |
| `vitest-post-concurrent.txt` | 收口时刻活树全量复跑原始输出（1967 行，3 failed 文件 / 3 failed 用例，含三条失败堆栈） |
| `vitest-transfusion-rerun.txt` | 输血页单文件隔离复跑输出，12/12 通过、`VITEST_EXIT=0`，用于排除失败 3 为回归 |
| `apply-dedupe.ps1` | 本轮 5 组重复路由去重执行脚本（A2 唯一源码改动的操作留痕） |
| `scan-unreferenced-pages.ps1` | 候选未引用页面扫描脚本 |
| `unreferenced-pages.txt` | 附录 A 清单原始输出 |
