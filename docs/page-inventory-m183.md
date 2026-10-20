# M183 web/src/pages 页面数据渲染盘点

- 盘点时间：2026-10-19
- 盘点范围：`web/src/pages/**/index.tsx`，共 **1923** 个页面
- 判定依据：
  - 是否存在 `useEffect` + `get/fetch/post/useRequest` 或 `@/services` / `@/store` / health-store 钩子调用；
  - 调用的 `/api/v1/*` 路径是否在 `src/bff/routes` 注册表（含 `:param` 参数模板）中真实存在；
  - 后端路由是否含硬编码 demo records（即“demo 分支”）；
  - 空值状态（`useState<X \| null>(null)`）是否存在未保护访问（`data.field` 且全文无 `data &&` / `if (!data)` / `data !== null` 保护）。
- 方法：Python 静态正则扫描（只读代码，未改动任何业务代码、未走 git、未新增依赖）。

## 一、总览统计

| 类型 | 数量 | 占比 |
|---|---:|---:|
| 真实数据渲染（接真实 API / store 钩子 / 内置 demo 列表） | 1909 | 99.3% |
| 空壳（无数据获取、无内置列表） | 5 | 0.3% |
| 崩溃风险（空值未保护 / API 未注册） | 9 | 0.5% |

## 二、按目录分组明细

### 5g-edge-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| 5g-edge-v5/report/index.tsx | EdgeV5Page | 真实数据 | /api/v1/5g-edge-v5/report；路由含硬编码 demo records | 107行 |

### academic-exchange/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| academic-exchange/index.tsx | AcademicExchangePage | 真实数据 | /api/v1/academic-exchange；路由含硬编码 demo records | 63行 |

### academic-exchange-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| academic-exchange-mgmt/index.tsx | AcademicExchangeMgmtPage | 真实数据 | /api/v1/academic-exchange-mgmt；路由含硬编码 demo records | 63行 |

### academic-exchange-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| academic-exchange-stats/index.tsx | AcademicExchangeStatsPage | 真实数据 | /api/v1/academic-exchange-stats；路由含硬编码 demo records | 63行 |

### academic-level/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| academic-level/index.tsx | AcademicLevelPage | 真实数据 | /api/v1/academic-level；路由含硬编码 demo records | 63行 |

### accreditation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| accreditation/report-v3/index.tsx | AccreditationV3Page | 真实数据 | /api/v1/accreditation/report-v3；路由含硬编码 demo records | 107行 |

### admin/ （193 页：OK 187 / SHELL 0 / RISK 6）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| admin/AIBrainV2Outpatient/index.tsx | AIBrainV2OutpatientPage | 真实数据 | /api/v1/ai-brain/v2/outpatient；路由含硬编码 demo records | 386行 |
| admin/APIGateway/index.tsx | APIGatewayAdminPage | 真实数据 | /api/v1/api-gateway/route；路由含硬编码 demo records | 253行 |
| admin/Alerts/index.tsx | AlertsPage | 真实数据 | /api/v1/admin/alerts；路由含硬编码 demo records | 276行 |
| admin/AnesthesiaDeep/index.tsx | AnesthesiaDeepPage | 真实数据 | /api/v1/surgery/anesthesia/deep；路由含硬编码 demo records | 344行 |
| admin/AntibioticDeep/index.tsx | AntibioticDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 404行 |
| admin/ApiDocs/index.tsx | ApiDocsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 206行 |
| admin/ApiKeys/index.tsx | ApiKeysPage | 真实数据 | /api/v1/admin/api-keys；路由含硬编码 demo records | 301行 |
| admin/AuditLog/index.tsx | AuditLogPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 234行 |
| admin/AuthFix/index.tsx | AuthFixPage | 真实数据 | /api/v1/admin/security/auth-verify；路由含硬编码 demo records | 389行 |
| admin/AutoLearn/index.tsx | AutoLearnPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 359行 |
| admin/AutoLearnDeep/index.tsx | AutoLearnDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 443行 |
| admin/Backup/index.tsx | BackupPage | 真实数据 | /api/v1/admin/backup/export；路由含硬编码 demo records | 201行 |
| admin/BloodClosureSla/index.tsx | BloodClosureSlaPage | 真实数据 | /api/v1/blood/closure-sla；路由含硬编码 demo records | 217行 |
| admin/BloodDeep/index.tsx | BloodDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 290行 |
| admin/BudgetDeep/index.tsx | BudgetDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 344行 |
| admin/CDSSDeep/index.tsx | CDSSDeepPage | 真实数据 | /api/v1/cdss/evaluate；路由含硬编码 demo records | 351行 |
| admin/CodeQuality/index.tsx | CodeQualityPage | 真实数据 | /api/v1/admin/quality/code；路由含硬编码 demo records | 325行 |
| admin/CodeQualityDeep/index.tsx | CodeQualityDeepPage | 真实数据 | /api/v1/admin/code/deep-quality；路由含硬编码 demo records | 359行 |
| admin/Config/index.tsx | SystemConfigPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 275行 |
| admin/ConsumableSpd/index.tsx | ConsumableSpdPage | 真实数据 | /api/v1/consumable/spd；路由含硬编码 demo records | 485行 |
| admin/CoverageFix/index.tsx | CoverageFixPage | 真实数据 | /api/v1/admin/test/coverage-fix；路由含硬编码 demo records | 459行 |
| admin/CoverageGap/index.tsx | CoverageGapPage | 真实数据 | /api/v1/admin/test/coverage-gap | 469行 |
| admin/Dashboard/index.tsx | AdminDashboardPage | 真实数据 | /api/v1/admin/dashboard；路由含硬编码 demo records | 321行 |
| admin/DataAsset/index.tsx | DataAssetPage | 真实数据 | /api/v1/admin/data-asset/inventory；路由含硬编码 demo records | 431行 |
| admin/DataGovernance/index.tsx | DataGovernancePage | 真实数据 | /api/v1/admin/data/governance；路由含硬编码 demo records | 377行 |
| admin/DataMartDeep/index.tsx | DataMartDeepPage | 真实数据 | /api/v1/admin/data-mart/catalog；路由含硬编码 demo records | 412行 |
| admin/DataQuality/index.tsx | DataQualityAdminPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 310行 |
| admin/DeptPerformance/index.tsx | DeptPerformancePage | 真实数据 | /api/v1/admin/performance/dept；路由含硬编码 demo records | 344行 |
| admin/DigitalTwin/index.tsx | DigitalTwinPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 436行 |
| admin/DigitalTwinDeep/index.tsx | DigitalTwinDeepPage | 真实数据 | /api/v1/admin/digital-twin/simulate；路由含硬编码 demo records | 455行 |
| admin/DrgDeep/index.tsx | DrgDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 361行 |
| admin/Emergency/index.tsx | AdminEmergencyPage | 崩溃风险 | 空值状态未保护访问: data.schedule；API /api/v1/admin/emergency/drill | 377行 |
| admin/EmergencyDeep/index.tsx | EmergencyDeepPage | 真实数据 | /api/v1/admin/emergency/deep；路由含硬编码 demo records | 326行 |
| admin/EquipmentDeep/index.tsx | EquipmentDeepPage | 真实数据 | /api/v1/equipment/deep；路由含硬编码 demo records | 300行 |
| admin/Errors/Monitor/index.tsx | ErrorMonitorPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 304行 |
| admin/Errors/index.tsx | AdminErrorsPage | 真实数据 | /api/v1/admin/errors；路由含硬编码 demo records | 274行 |
| admin/FeedbackAnalysis/index.tsx | FeedbackAnalysisPage | 真实数据 | /api/v1/admin/feedback/analysis；路由含硬编码 demo records | 137行 |
| admin/FinanceDeep/index.tsx | FinanceDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 397行 |
| admin/Health/index.tsx | HealthPage | 真实数据 | /api/v1/admin/health；路由含硬编码 demo records | 222行 |
| admin/HrDeep/index.tsx | HrDeepPage | 真实数据 | /api/v1/hr/deep；路由含硬编码 demo records | 350行 |
| admin/I18nManage/index.tsx | I18nManagePage | 真实数据 | /api/v1/i18n/translate；路由含硬编码 demo records | 355行 |
| admin/Import/index.tsx | ImportPage | 真实数据 | /api/v1/admin/import/template；路由含硬编码 demo records | 241行 |
| admin/InfectionAlerts/index.tsx | InfectionAlertsPage | 真实数据 | /api/v1/admin/infection/alerts；路由含硬编码 demo records | 252行 |
| admin/InfectionDeep/index.tsx | InfectionDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 326行 |
| admin/InsuranceDeep/index.tsx | InsuranceDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 313行 |
| admin/InsuranceReview/index.tsx | InsuranceReviewPage | 真实数据 | /api/v1/admin/insurance/review；路由含硬编码 demo records | 277行 |
| admin/IntegrationDeep/index.tsx | IntegrationDeepPage | 真实数据 | /api/v1/integration/deep/parse；路由含硬编码 demo records | 341行 |
| admin/IntelligenceScore/index.tsx | IntelligenceScorePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 349行 |
| admin/LogSecurity/index.tsx | LogSecurityPage | 真实数据 | /api/v1/admin/security/log-verify；路由含硬编码 demo records | 299行 |
| admin/LogisticsDeep/index.tsx | LogisticsDeepPage | 真实数据 | /api/v1/logistics/deep-dispatch；路由含硬编码 demo records | 355行 |
| admin/Logs/index.tsx | AdminLogsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 265行 |
| admin/MaskConfig/index.tsx | MaskConfigPage | 真实数据 | /api/v1/admin/security/mask-config；路由含硬编码 demo records | 221行 |
| admin/MedicalRecordDeep/index.tsx | MedicalRecordDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 339行 |
| admin/Migrations/index.tsx | MigrationsPage | 真实数据 | /api/v1/admin/migrations；路由含硬编码 demo records | 289行 |
| admin/NursingDeep/index.tsx | NursingDeepPage | 真实数据 | /api/v1/nursing/deep；路由含硬编码 demo records | 355行 |
| admin/OfficeDeep/index.tsx | OfficeDeepPage | 真实数据 | /api/v1/admin/office；路由含硬编码 demo records | 316行 |
| admin/OperationAnalysis/index.tsx | OperationAnalysisPage | 真实数据 | /api/v1/admin/operation/analysis；路由含硬编码 demo records | 499行 |
| admin/OpsAnalysis/index.tsx | OpsAnalysisPage | 崩溃风险 | 空值状态未保护访问: data.benchmark, data.forecast, data.trend；API (store/本地) | 262行 |
| admin/OpsDeep/index.tsx | OpsDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 346行 |
| admin/OpsMonitor/index.tsx | OpsMonitorPage | 真实数据 | /api/v1/admin/ops/monitoring；路由含硬编码 demo records | 456行 |
| admin/OpsPredict/index.tsx | OpsPredictPage | 真实数据 | /api/v1/admin/ops/schedule-optimize；路由含硬编码 demo records | 519行 |
| admin/PartyCulture/index.tsx | PartyCulturePage | 真实数据 | /api/v1/party/culture；路由含硬编码 demo records | 286行 |
| admin/PatientExperience/index.tsx | PatientExperiencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 340行 |
| admin/PerfDeep/index.tsx | PerfDeepPage | 真实数据 | /api/v1/admin/performance/deep-audit；路由含硬编码 demo records | 608行 |
| admin/PerfOptV2/index.tsx | PerfOptV2Page | 真实数据 | /api/v1/admin/performance/v2；路由含硬编码 demo records | 646行 |
| admin/PerfOptimize/index.tsx | PerfOptimizePage | 真实数据 | /api/v1/admin/performance/deep-optimize；路由含硬编码 demo records | 538行 |
| admin/Performance/Benchmark/index.tsx | PerformanceBenchmarkPage | 真实数据 | /api/v1/admin/performance/benchmark；路由含硬编码 demo records | 306行 |
| admin/Performance/FirstLoad/index.tsx | FirstLoadPage | 真实数据 | /api/v1/admin/performance/firstload；路由含硬编码 demo records | 419行 |
| admin/Performance/Frontend/index.tsx | FrontendPerformancePage | 真实数据 | /api/v1/admin/performance/frontend；路由含硬编码 demo records | 278行 |
| admin/Performance/Optimize/index.tsx | PerfOptimizePage | 真实数据 | /api/v1/admin/performance/optimize；路由含硬编码 demo records | 350行 |
| admin/Performance/Review/index.tsx | PerformanceReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 384行 |
| admin/Performance/SlowQueries/index.tsx | SlowQueriesPage | 真实数据 | /api/v1/admin/performance/slow-queries；路由含硬编码 demo records | 252行 |
| admin/Performance/index.tsx | PerformancePage | 真实数据 | /api/v1/admin/performance；路由含硬编码 demo records | 230行 |
| admin/PerformanceDeep/index.tsx | PerformanceDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 385行 |
| admin/PerformanceOptimizations/index.tsx | PerformanceOptimizationsPage | 真实数据 | /api/v1/admin/performance/optimizations；路由含硬编码 demo records | 181行 |
| admin/PharmacyDeep/index.tsx | PharmacyDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 376行 |
| admin/PharmacyMgmt/index.tsx | PharmacyMgmtPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 378行 |
| admin/QualityDeep/index.tsx | QualityDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 358行 |
| admin/QualityGate/index.tsx | QualityGatePage | 真实数据 | /api/v1/admin/quality-gate；路由含硬编码 demo records | 334行 |
| admin/QualityGateV2/index.tsx | QualityGateV2Page | 真实数据 | /api/v1/admin/quality-gate/v2；路由含硬编码 demo records | 345行 |
| admin/QualityMonitor/index.tsx | QualityMonitorPage | 真实数据 | /api/v1/admin/quality/monitor；路由含硬编码 demo records | 235行 |
| admin/QualitySafety/index.tsx | QualitySafetyPage | 崩溃风险 | 空值状态未保护访问: data.improvement；API (store/本地) | 351行 |
| admin/RecordQuality/index.tsx | RecordQualityAdminPage | 真实数据 | /api/v1/admin/records/audit；路由含硬编码 demo records | 326行 |
| admin/ResourceOptimize/index.tsx | ResourceOptimizePage | 真实数据 | /api/v1/admin/resource/optimize；路由含硬编码 demo records | 366行 |
| admin/Roadmap/index.tsx | RoadmapPage | 真实数据 | /api/v1/admin/roadmap；路由含硬编码 demo records | 283行 |
| admin/RoadmapV5/index.tsx | RoadmapV5Page | 真实数据 | /api/v1/admin/roadmap/v5；路由含硬编码 demo records | 290行 |
| admin/SecurityCompliance/index.tsx | SecurityCompliancePage | 真实数据 | /api/v1/admin/security/compliance；路由含硬编码 demo records | 266行 |
| admin/SecurityFix/index.tsx | SecurityFixPage | 真实数据 | /api/v1/admin/security/verify；路由含硬编码 demo records | 341行 |
| admin/SecurityRecheck/index.tsx | SecurityRecheckPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 473行 |
| admin/SecurityScan/index.tsx | SecurityScanPage | 真实数据 | /api/v1/admin/security/scan；路由含硬编码 demo records | 293行 |
| admin/SmartAssets/index.tsx | SmartAssetsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 407行 |
| admin/StatReport/index.tsx | StatReportPage | 真实数据 | /api/v1/admin/stat/system；路由含硬编码 demo records | 240行 |
| admin/SurgerySchedule/index.tsx | SurgerySchedulePage | 真实数据 | /api/v1/admin/surgery/schedule/optimize；路由含硬编码 demo records | 288行 |
| admin/SystemMap/index.tsx | SystemMapPage | 真实数据 | /api/v1/admin/system-map；路由含硬编码 demo records | 260行 |
| admin/SystemMapV2/index.tsx | SystemMapV2Page | 真实数据 | /api/v1/admin/system-map/v2；路由含硬编码 demo records | 264行 |
| admin/TalentDeep/index.tsx | TalentDeepPage | 崩溃风险 | 空值状态未保护访问: data.successors；API (store/本地) | 386行 |
| admin/Trends/index.tsx | TrendsPage | 真实数据 | /api/v1/admin/trends/analysis；路由含硬编码 demo records | 353行 |
| admin/Twin3D/index.tsx | Twin3DPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 385行 |
| admin/Twin3DInpatient/index.tsx | Twin3DInpatientPage | 真实数据 | /api/v1/admin/digital-twin/v2/inpatient；路由含硬编码 demo records | 498行 |
| admin/TwinDeep/index.tsx | TwinDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 463行 |
| admin/Webhooks/index.tsx | WebhooksAdminPage | 真实数据 | /api/v1/admin/webhooks；路由含硬编码 demo records | 339行 |
| admin/acceptance/index.tsx | AcceptancePage | 真实数据 | /api/v1/admin/acceptance/report；路由含硬编码 demo records | 117行 |
| admin/accessibility/index.tsx | AccessibilityPage | 真实数据 | /api/v1/admin/accessibility/report；路由含硬编码 demo records | 117行 |
| admin/accreditation/index.tsx | AccreditationPage | 真实数据 | /api/v1/admin/accreditation/report；路由含硬编码 demo records | 105行 |
| admin/ai-platform/index.tsx | AIPlatformPage | 真实数据 | /api/v1/admin/ai-platform/report；路由含硬编码 demo records | 107行 |
| admin/audit-log/index.tsx | AdminAuditLogPage | 真实数据 | /api/v1/admin/audit-log；路由含硬编码 demo records | 195行 |
| admin/audit/index.tsx | AuditPage | 真实数据 | /api/v1/admin/audit/report；路由含硬编码 demo records | 107行 |
| admin/backup-strategy/index.tsx | BackupStrategyPage | 真实数据 | /api/v1/admin/backup/strategy；路由含硬编码 demo records | 150行 |
| admin/big-data/index.tsx | BigDataPlatformPage | 真实数据 | /api/v1/admin/big-data/report；路由含硬编码 demo records | 103行 |
| admin/blockchain/index.tsx | BlockchainPage | 真实数据 | /api/v1/admin/blockchain/report；路由含硬编码 demo records | 114行 |
| admin/clinical-research/index.tsx | ClinicalResearchPage | 真实数据 | /api/v1/admin/research/report；路由含硬编码 demo records | 104行 |
| admin/cloud-native/index.tsx | CloudNativePage | 真实数据 | /api/v1/admin/cloud-native/report；路由含硬编码 demo records | 115行 |
| admin/code/Quality/index.tsx | CodeQualityPage | 真实数据 | /api/v1/admin/code/quality；路由含硬编码 demo records | 311行 |
| admin/compliance/index.tsx | CompliancePage | 真实数据 | /api/v1/admin/compliance/report；路由含硬编码 demo records | 113行 |
| admin/cost-accounting/index.tsx | CostAccountingPage | 真实数据 | /api/v1/admin/cost-accounting/report；路由含硬编码 demo records | 118行 |
| admin/data-security/index.tsx | DataSecurityPage | 真实数据 | /api/v1/admin/data-security/report；路由含硬编码 demo records | 108行 |
| admin/dataMart/List/index.tsx | DataMartListPage | 真实数据 | /api/v1/admin/data-mart；路由含硬编码 demo records | 334行 |
| admin/deploy/ConfigGenerator/index.tsx | ConfigGeneratorPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 222行 |
| admin/deployment-readiness/index.tsx | DeploymentReadinessPage | 真实数据 | /api/v1/admin/deployment/readiness；路由含硬编码 demo records | 119行 |
| admin/devops/index.tsx | DevOpsPage | 真实数据 | /api/v1/admin/devops/report；路由含硬编码 demo records | 114行 |
| admin/discipline/index.tsx | DisciplinePage | 真实数据 | /api/v1/admin/discipline/report；路由含硬编码 demo records | 107行 |
| admin/dispute/List/index.tsx | DisputeListPage | 真实数据 | /api/v1/admin/disputes；路由含硬编码 demo records | 363行 |
| admin/documentation/index.tsx | DocumentationPage | 真实数据 | /api/v1/admin/documentation/report；路由含硬编码 demo records | 106行 |
| admin/elderly-friendly/index.tsx | ElderlyFriendlyPage | 真实数据 | /api/v1/admin/elderly-friendly/report；路由含硬编码 demo records | 109行 |
| admin/equipment-material/index.tsx | EquipmentMaterialPage | 真实数据 | /api/v1/admin/equipment-material/report；路由含硬编码 demo records | 119行 |
| admin/equipment/List/index.tsx | EquipmentListPage | 真实数据 | /api/v1/admin/equipment；路由含硬编码 demo records | 217行 |
| admin/export/Center/index.tsx | ReportCenterPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 241行 |
| admin/finance/Report/index.tsx | FinanceReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 310行 |
| admin/finance/index.tsx | FinanceBillingPage | 真实数据 | /api/v1/admin/finance/report；路由含硬编码 demo records | 106行 |
| admin/forecast/Trend/index.tsx | OpsForecastTrendPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 293行 |
| admin/group/Dashboard/index.tsx | GroupMultiHospitalDashboardPage | 真实数据 | /api/v1/admin/group/dashboard；路由含硬编码 demo records | 489行 |
| admin/healthCheckup/Report/index.tsx | HealthCheckupReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 256行 |
| admin/hr/index.tsx | HRManagementPage | 真实数据 | /api/v1/admin/hr/report；路由含硬编码 demo records | 114行 |
| admin/infection/Realtime/index.tsx | InfectionRealtimePage | 真实数据 | /api/v1/admin/infection/realtime；路由含硬编码 demo records | 308行 |
| admin/infectionControl/Monitor/index.tsx | InfectionControlMonitorPage | 真实数据 | /api/v1/admin/infection/events；路由含硬编码 demo records | 332行 |
| admin/insurance/index.tsx | InsuranceManagementPage | 真实数据 | /api/v1/admin/insurance/report；路由含硬编码 demo records | 119行 |
| admin/internationalization/index.tsx | InternationalizationPage | 真实数据 | /api/v1/admin/internationalization/report；路由含硬编码 demo records | 109行 |
| admin/iot-platform/index.tsx | IoTPlatformPage | 真实数据 | /api/v1/admin/iot-platform/report；路由含硬编码 demo records | 112行 |
| admin/jciReview/Checklist/index.tsx | JciReviewChecklistPage | 真实数据 | /api/v1/admin/review/checklist；路由含硬编码 demo records | 307行 |
| admin/kpi/Dashboard/index.tsx | HospitalKpiDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 371行 |
| admin/labor-union/index.tsx | LaborUnionPage | 真实数据 | /api/v1/admin/labor-union/report；路由含硬编码 demo records | 107行 |
| admin/llm/index.tsx | LLMIntegrationPage | 真实数据 | /api/v1/admin/llm/report；路由含硬编码 demo records | 107行 |
| admin/logistics-report-v2/index.tsx | LogisticsReportV2Page | 真实数据 | /api/v1/admin/logistics/report；路由含硬编码 demo records | 116行 |
| admin/logistics/Request/index.tsx | LogisticsRequestPage | 真实数据 | /api/v1/logistics/my-requests；路由含硬编码 demo records | 236行 |
| admin/logistics/index.tsx | LogisticsAdminPage | 真实数据 | /api/v1/logistics/route；路由含硬编码 demo records | 257行 |
| admin/metrics/Dashboard/index.tsx | SystemMetricsDashboard | 真实数据 | /api/v1/admin/metrics；路由含硬编码 demo records | 301行 |
| admin/microservices/index.tsx | MicroservicesPage | 真实数据 | /api/v1/admin/microservices/report；路由含硬编码 demo records | 106行 |
| admin/multi-agent/index.tsx | MultiAgentPage | 真实数据 | /api/v1/admin/multi-agent/report；路由含硬编码 demo records | 109行 |
| admin/operations-analytics/index.tsx |  | 真实数据 | /api/v1/admin/operations-analytics/report；路由含硬编码 demo records | 133行 |
| admin/party-building/index.tsx | PartyBuildingPage | 真实数据 | /api/v1/admin/party-building/report；路由含硬编码 demo records | 110行 |
| admin/partyUnion/List/index.tsx | PartyUnionListPage | 真实数据 | /api/v1/admin/party-union；路由含硬编码 demo records | 234行 |
| admin/patient-safety/index.tsx | PatientSafetyPage | 真实数据 | /api/v1/admin/patient-safety/report；路由含硬编码 demo records | 139行 |
| admin/performance-management/index.tsx | PerformanceManagementPage | 真实数据 | /api/v1/admin/performance-management/report；路由含硬编码 demo records | 130行 |
| admin/performance-stress/index.tsx | PerformanceStressPage | 真实数据 | /api/v1/admin/performance/stress-test；路由含硬编码 demo records | 118行 |
| admin/performance-v2/index.tsx | PerformanceReportV2Page | 真实数据 | /api/v1/admin/performance/report；路由含硬编码 demo records | 111行 |
| admin/privacy/Compliance/index.tsx | PrivacyCompliancePage | 真实数据 | /api/v1/admin/privacy/compliance；路由含硬编码 demo records | 234行 |
| admin/production-ops/index.tsx | ProductionOpsPage | 真实数据 | /api/v1/admin/production-ops/report；路由含硬编码 demo records | 107行 |
| admin/public-health/index.tsx | PublicHealthPage | 真实数据 | /api/v1/admin/public-health/report；路由含硬编码 demo records | 113行 |
| admin/publicity/index.tsx | PublicityPage | 真实数据 | /api/v1/admin/publicity/report；路由含硬编码 demo records | 115行 |
| admin/quality-management/index.tsx | QualityManagementPage | 真实数据 | /api/v1/admin/quality-management/report；路由含硬编码 demo records | 100行 |
| admin/quality-system/index.tsx | QualitySystemPage | 真实数据 | /api/v1/admin/quality-system/report；路由含硬编码 demo records | 126行 |
| admin/referral/List/index.tsx | ReferralListPage | 真实数据 | /api/v1/referral/incoming；路由含硬编码 demo records | 250行 |
| admin/regionalCoop/Map/index.tsx | RegionalCoopMapPage | 真实数据 | /api/v1/regional/hospitals；路由含硬编码 demo records | 226行 |
| admin/release-m200/index.tsx | ReleaseM200Page | 真实数据 | /api/v1/admin/release/m200；路由含硬编码 demo records | 119行 |
| admin/remoteConsult/List/index.tsx | RemoteConsultListPage | 真实数据 | /api/v1/remote-consult/list；路由含硬编码 demo records | 408行 |
| admin/reports/Export/index.tsx | ReportExportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 257行 |
| admin/research/List/index.tsx | ResearchListPage | 真实数据 | /api/v1/admin/research；路由含硬编码 demo records | 353行 |
| admin/research/index.tsx | ResearchManagementPage | 真实数据 | /api/v1/admin/research/report；路由含硬编码 demo records | 109行 |
| admin/risk-management/index.tsx | RiskManagementPage | 真实数据 | /api/v1/admin/risk-management/report；路由含硬编码 demo records | 108行 |
| admin/satisfaction/AiReport/index.tsx | SatisfactionAiReportPage | 真实数据 | /api/v1/admin/satisfaction/ai-report；路由含硬编码 demo records | 303行 |
| admin/satisfaction/Report/index.tsx | SatisfactionReportPage | 崩溃风险 | 空值状态未保护访问: data.suggestions；API (store/本地) | 267行 |
| admin/schedule/Calendar/index.tsx | SmartScheduleCalendarPage | 真实数据 | /api/v1/admin/schedule/optimize；路由含硬编码 demo records | 274行 |
| admin/security-pen/index.tsx | SecurityPenTestPage | 真实数据 | /api/v1/admin/security/pen-test；路由含硬编码 demo records | 122行 |
| admin/security-v2/index.tsx | SecurityReportV2Page | 真实数据 | /api/v1/admin/security/report-v2；路由含硬编码 demo records | 123行 |
| admin/security/Report/index.tsx | SecurityReportPage | 真实数据 | /api/v1/admin/security/report；路由含硬编码 demo records | 249行 |
| admin/selfLearning/Monitor/index.tsx | SelfLearningMonitorPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 298行 |
| admin/sre/index.tsx | SREPage | 真实数据 | /api/v1/admin/sre/report；路由含硬编码 demo records | 115行 |
| admin/supply/List/index.tsx | SupplyListPage | 真实数据 | /api/v1/admin/supply；路由含硬编码 demo records | 290行 |
| admin/teaching/List/index.tsx | TeachingListPage | 真实数据 | /api/v1/admin/teaching；路由含硬编码 demo records | 338行 |
| admin/teaching/index.tsx | TeachingManagementPage | 真实数据 | /api/v1/admin/teaching/report；路由含硬编码 demo records | 92行 |
| admin/test/Coverage/index.tsx | CoveragePage | 真实数据 | /api/v1/admin/test/coverage | 443行 |
| admin/test/CoverageDetail/index.tsx | CoverageDetailPage | 真实数据 | /api/v1/admin/test/coverage/detailed | 478行 |
| admin/test/E2E/index.tsx | E2EPage | 真实数据 | /api/v1/admin/test/e2e | 335行 |
| admin/test/Optimizations/index.tsx | QueryOptimizationsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 346行 |
| admin/test/Performance/index.tsx | PerformanceBenchmarkPage | 真实数据 | /api/v1/admin/test/performance；路由含硬编码 demo records | 331行 |
| admin/test/Security/index.tsx | SecurityBaselinePage | 真实数据 | /api/v1/admin/test/security；路由含硬编码 demo records | 295行 |
| admin/test/Smoke/index.tsx | SmokePage | 真实数据 | /api/v1/admin/test/smoke | 363行 |
| admin/test/UI/index.tsx | UIConsistencyPage | 崩溃风险 | API 未注册: /api/v1/admin/ui-consistency | 357行 |
| admin/ui/AccessibilityVerify/index.tsx | AccessibilityVerifyPage | 真实数据 | /api/v1/admin/ui/accessibility/verify；路由含硬编码 demo records | 298行 |
| admin/ui/Consistency/index.tsx | UiConsistencyPage | 真实数据 | /api/v1/admin/ui/consistency；路由含硬编码 demo records | 402行 |
| admin/user-experience/index.tsx | UserExperiencePage | 真实数据 | /api/v1/admin/user-experience/report；路由含硬编码 demo records | 110行 |
| admin/vaccination/Records/index.tsx | VaccinationRecordsPage | 真实数据 | /api/v1/vaccination/administer；路由含硬编码 demo records | 372行 |
| admin/wisdom/Dashboard/index.tsx | WisdomDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 514行 |

### admin-muse-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| admin-muse-usage/index.tsx | AdminMuseUsagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 64行 |

### administration/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| administration/report-v2/index.tsx | AdministrationV2Page | 真实数据 | /api/v1/administration/report-v2；路由含硬编码 demo records | 107行 |

### administration-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| administration-v3/report/index.tsx | AdministrationV3Page | 真实数据 | /api/v1/administration-v3/report；路由含硬编码 demo records | 103行 |

### adr-reporting/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| adr-reporting/index.tsx | AdrReportingPage | 真实数据 | /api/v1/adr-reporting；路由含硬编码 demo records | 63行 |

### adverse-drug-event/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| adverse-drug-event/index.tsx | AdverseDrugEventPage | 真实数据 | /api/v1/adverse-drug-event；路由含硬编码 demo records | 63行 |

### adverse-event-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| adverse-event-detail/index.tsx | AdverseEventDetailPage | 真实数据 | /api/v1/adverse-event-detail；路由含硬编码 demo records | 63行 |

### adverse-event-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| adverse-event-report/index.tsx | AdverseEventReportPage | 真实数据 | /api/v1/adverse-event-report；路由含硬编码 demo records | 63行 |

### adverse-event-reporting/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| adverse-event-reporting/index.tsx | AdverseEventReportingPage | 真实数据 | /api/v1/adverse-event-reporting；路由含硬编码 demo records | 63行 |

### aesthetic-dental-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| aesthetic-dental-v5/report/index.tsx | AestheticDentalV5Page | 真实数据 | /api/v1/aesthetic-dental-v5/report；路由含硬编码 demo records | 52行 |

### agent/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent/index.tsx | AgentChat | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 394行 |

### agent-adoption/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-adoption/index.tsx | AgentAdoptionPage | 真实数据 | /api/v1/agent-adoption-board；路由含硬编码 demo records | 92行 |

### agent-doctor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-doctor/index.tsx | AgentDoctorPage | 真实数据 | /api/v1/agent/doctor/todos；路由含硬编码 demo records | 85行 |

### agent-health/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-health/index.tsx | AgentHealthPage | 真实数据 | /api/v1/agent-health；路由含硬编码 demo records | 77行 |

### agent-learning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-learning/index.tsx | AgentLearningPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 71行 |

### agent-manager/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-manager/index.tsx | AgentManagerPage | 真实数据 | /api/v1/agent/manager/todos；路由含硬编码 demo records | 83行 |

### agent-nurse/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-nurse/index.tsx | AgentNursePage | 真实数据 | /api/v1/agent/nurse/todos；路由含硬编码 demo records | 83行 |

### agent-pharma/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-pharma/index.tsx | AgentPharmaPage | 真实数据 | /api/v1/agent/pharma/todos；路由含硬编码 demo records | 83行 |

### agent-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agent-rules/index.tsx | AgentRulesPage | 真实数据 | /api/v1/agent/rules；路由含硬编码 demo records | 88行 |

### agentRuntime/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| agentRuntime/index.tsx | AgentRuntimePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 122行 |

### ai/ （7 页：OK 7 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai/DeepDiagnose/index.tsx | DeepDiagnosePage | 真实数据 | /api/v1/ai/diagnose/deep；路由含硬编码 demo records | 366行 |
| ai/DiagnoseDeep/index.tsx | DiagnoseDeepPage | 真实数据 | /api/v1/ai/diagnose/expand-v2；路由含硬编码 demo records | 428行 |
| ai/DiagnoseV2/index.tsx | DiagnoseV2Page | 真实数据 | /api/v1/ai/diagnose/expand-v2；路由含硬编码 demo records | 382行 |
| ai/DiseaseExpand/index.tsx | DiseaseExpandPage | 真实数据 | /api/v1/ai/diagnose/expand；路由含硬编码 demo records | 451行 |
| ai/GuideDx/index.tsx | GuideDxPage | 真实数据 | /api/v1/ai/diagnose/guide；路由含硬编码 demo records | 305行 |
| ai/MedicalQa/index.tsx | MedicalQaPage | 真实数据 | /api/v1/ai/ask；路由含硬编码 demo records | 280行 |
| ai/TreatmentPlan/index.tsx | TreatmentPlanPage | 真实数据 | /api/v1/ai/treatment/plan；路由含硬编码 demo records | 297行 |

### ai-advice-trace/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-advice-trace/index.tsx | AIAdviceTracePage | 真实数据 | /api/v1/ai-advice-trace；路由含硬编码 demo records | 51行 |

### ai-assist/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-assist/report-v2/index.tsx | AIAssistV2Page | 真实数据 | /api/v1/ai-assist/report-v2；路由含硬编码 demo records | 106行 |

### ai-brain/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-brain/v2/inpatient/index.tsx | InpatientBrainV2Page | 真实数据 | /api/v1/ai-brain/v2/inpatient；路由含硬编码 demo records | 180行 |

### ai-brain-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-brain-v3/report/index.tsx | AIBrainV3Page | 真实数据 | /api/v1/ai-brain-v3/report；路由含硬编码 demo records | 107行 |

### ai-brain-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-brain-v5/report/index.tsx | AIBrainV5Page | 真实数据 | /api/v1/ai-brain-v5/report；路由含硬编码 demo records | 107行 |

### ai-diagnosis-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-diagnosis-stats/index.tsx | AiDiagnosisStatsPage | 真实数据 | /api/v1/ai-diagnosis-stats；路由含硬编码 demo records | 63行 |

### ai-diagnosis-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-diagnosis-v3/report/index.tsx | AIDiagnosisV3Page | 真实数据 | /api/v1/ai-diagnosis-v3/report；路由含硬编码 demo records | 106行 |

### ai-drug/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-drug/report/index.tsx | AIDrugDiscoveryPage | 真实数据 | /api/v1/ai-drug/report；路由含硬编码 demo records | 103行 |

### ai-drug-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-drug-v2/report/index.tsx | AIDrugV2Page | 真实数据 | /api/v1/ai-drug-v2/report；路由含硬编码 demo records | 102行 |

### ai-education/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-education/index.tsx | AiEducationPage | 真实数据 | /api/v1/ai-education；路由含硬编码 demo records | 63行 |

### ai-governance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-governance/index.tsx | AiGovernancePage | 真实数据 | /api/v1/ai-governance；路由含硬编码 demo records | 76行 |

### ai-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-management/index.tsx | AiManagementPage | 真实数据 | /api/v1/ai-management；路由含硬编码 demo records | 63行 |

### ai-model-drift/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-model-drift/index.tsx | AiModelDriftPage | 真实数据 | /api/v1/ai-model-drift；路由含硬编码 demo records | 53行 |

### ai-platform/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-platform/report-v2/index.tsx | AIPlatformV2Page | 真实数据 | /api/v1/ai-platform/report-v2；路由含硬编码 demo records | 107行 |

### ai-treatment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ai-treatment/index.tsx | AiTreatmentPage | 真实数据 | /api/v1/ai-treatment；路由含硬编码 demo records | 63行 |

### aiNative/ （5 页：OK 4 / SHELL 0 / RISK 1）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| aiNative/diagnosis/index.tsx | DiagnosisSuggestionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 138行 |
| aiNative/losPrediction/index.tsx | LosPredictionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 113行 |
| aiNative/medReview/index.tsx | MedReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 155行 |
| aiNative/noteDraft/index.tsx | AiNoteDraftPage | 崩溃风险 | 空值状态未保护访问: editingDraft.id；API (store/本地) | 177行 |
| aiNative/pathwayRec/index.tsx | PathwayRecommendationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 117行 |

### alerts/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| alerts/index.tsx | Alerts | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 56行 |

### amDashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| amDashboard/index.tsx | AmDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 66行 |

### ams/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ams/index.tsx | AmsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 704行 |

### anesthesia/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| anesthesia/index.tsx | AnesthesiaPage | 真实数据 | /api/v1/anesthesia/report；路由含硬编码 demo records | 115行 |
| anesthesia/report-v2/index.tsx | AnesthesiaV2Page | 真实数据 | /api/v1/anesthesia/report-v2；路由含硬编码 demo records | 107行 |

### anesthesia-complication/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| anesthesia-complication/index.tsx | AnesthesiaComplicationPage | 真实数据 | /api/v1/anesthesia-complication；路由含硬编码 demo records | 57行 |

### anesthesia-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| anesthesia-detail/index.tsx | AnesthesiaDetailPage | 真实数据 | /api/v1/anesthesia-detail；路由含硬编码 demo records | 63行 |

### anesthesia-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| anesthesia-quality/index.tsx | AnesthesiaQualityPage | 真实数据 | /api/v1/anesthesia-quality；路由含硬编码 demo records | 63行 |

### anesthesia-record-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| anesthesia-record-mgmt/index.tsx | AnesthesiaRecordMgmtPage | 真实数据 | /api/v1/anesthesia-record-mgmt；路由含硬编码 demo records | 63行 |

### antibiotic-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-mgmt/index.tsx | AntibioticMgmtPage | 真实数据 | /api/v1/antibiotic-mgmt；路由含硬编码 demo records | 63行 |

### antibiotic-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-mgmt-detail/index.tsx | AntibioticMgmtDetailPage | 真实数据 | /api/v1/antibiotic-mgmt-detail；路由含硬编码 demo records | 63行 |

### antibiotic-mgmt-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-mgmt-stats/index.tsx | AntibioticMgmtStatsPage | 真实数据 | /api/v1/antibiotic-mgmt-stats；路由含硬编码 demo records | 63行 |

### antibiotic-rx/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-rx/index.tsx | AntibioticRxPage | 真实数据 | /api/v1/antibiotic-rx；路由含硬编码 demo records | 63行 |

### antibiotic-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-usage/index.tsx | AntibioticUsagePage | 真实数据 | /api/v1/antibiotic-usage；路由含硬编码 demo records | 63行 |

### antibiotic-usage-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-usage-mgmt/index.tsx | AntibioticUsageMgmtPage | 真实数据 | /api/v1/antibiotic-usage-mgmt；路由含硬编码 demo records | 63行 |

### antibiotic-use/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-use/index.tsx | AntibioticUsePage | 真实数据 | /api/v1/antibiotic-use；路由含硬编码 demo records | 57行 |

### antibiotic-use-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| antibiotic-use-quality/index.tsx | AntibioticUseQualityPage | 真实数据 | /api/v1/antibiotic-use-quality；路由含硬编码 demo records | 63行 |

### api-call/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| api-call/index.tsx | ApiCallPage | 真实数据 | /api/v1/api-call；路由含硬编码 demo records | 63行 |

### app-store/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| app-store/index.tsx | AppStorePage | 真实数据 | /api/v1/app-store；路由含硬编码 demo records | 54行 |

### appointment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| appointment/index.tsx | AppointmentPage | 真实数据 | /api/v1/appointment；路由含硬编码 demo records | 63行 |

### appointment-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| appointment-mgmt/index.tsx | AppointmentMgmtPage | 真实数据 | /api/v1/appointment-mgmt；路由含硬编码 demo records | 63行 |

### appointment-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| appointment-stats/index.tsx | AppointmentStatsPage | 真实数据 | /api/v1/appointment-stats；路由含硬编码 demo records | 63行 |

### appt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| appt/index.tsx | ApptPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 91行 |

### archive-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| archive-mgmt/index.tsx | ArchiveMgmtPage | 真实数据 | /api/v1/archive-mgmt；路由含硬编码 demo records | 63行 |

### archived-experience/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| archived-experience/index.tsx | ArchivedExperiencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 75行 |

### asset-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| asset-audit/index.tsx | AssetAuditPage | 真实数据 | /api/v1/asset-audit；路由含硬编码 demo records | 77行 |

### asset-lifecycle-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| asset-lifecycle-overview/index.tsx | AssetLifecycleOverviewPage | 真实数据 | /api/v1/asset-lifecycle-overview；路由含硬编码 demo records | 65行 |

### assistant/ （13 页：OK 13 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| assistant/DeepReview/index.tsx | DeepReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 347行 |
| assistant/Diagnosis/index.tsx | DiagnosisSuggestionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 302行 |
| assistant/Emergency/index.tsx | EmergencyAssistantPanel | 真实数据 | /api/v1/assistant/emergency；路由含硬编码 demo records | 288行 |
| assistant/Handover/index.tsx | AssistantHandoverPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 341行 |
| assistant/Inpatient/index.tsx | InpatientAssistant | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 307行 |
| assistant/Insurance/index.tsx | InsuranceAssistantPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 249行 |
| assistant/Knowledge/index.tsx | AssistantKnowledgePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 310行 |
| assistant/Lab/index.tsx | LabInterpretationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 356行 |
| assistant/LlmChat/index.tsx | AssistantLlmChatPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 319行 |
| assistant/Outpatient/index.tsx | OutpatientAssistantPanel | 真实数据 | /api/v1/assistant/outpatient；路由含硬编码 demo records | 244行 |
| assistant/Pharmacy/index.tsx | PharmacyAssistantPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 253行 |
| assistant/RecordDraft/index.tsx | RecordDraftPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 291行 |
| assistant/Surgery/index.tsx | SurgeryAssistant | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 332行 |

### attendance-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| attendance-mgmt/index.tsx | AttendanceMgmtPage | 真实数据 | /api/v1/attendance-mgmt；路由含硬编码 demo records | 63行 |

### audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| audit/report/index.tsx | AuditReportPage | 真实数据 | /api/v1/audit/report；路由含硬编码 demo records | 107行 |

### average-length-of-stay/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| average-length-of-stay/index.tsx | AverageLengthOfStayPage | 真实数据 | /api/v1/average-length-of-stay；路由含硬编码 demo records | 81行 |

### backup-dr/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| backup-dr/index.tsx | BackupDRPage | 真实数据 | /api/v1/backup-dr；路由含硬编码 demo records | 63行 |

### backup-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| backup-mgmt/index.tsx | BackupMgmtPage | 真实数据 | /api/v1/backup-mgmt；路由含硬编码 demo records | 63行 |

### barthel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| barthel/index.tsx | BarthelPage | 真实数据 | /api/v1/barthel；路由含硬编码 demo records | 52行 |

### bci-neuro-rehab/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bci-neuro-rehab/report/index.tsx | BCINeuroRehabPage | 真实数据 | /api/v1/bci-neuro-rehab/report；路由含硬编码 demo records | 104行 |

### bci-neuro-rehab-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bci-neuro-rehab-v2/report/index.tsx | BCINeuroRehabV2Page | 真实数据 | /api/v1/bci-neuro-rehab-v2/report；路由含硬编码 demo records | 102行 |

### bed-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bed-forecast/index.tsx | BedForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 55行 |

### bed-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bed-management/index.tsx | BedManagementPage | 真实数据 | /api/v1/bed-management；路由含硬编码 demo records | 63行 |

### bed-occupancy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bed-occupancy/index.tsx | BedOccupancyPage | 真实数据 | /api/v1/bed-occupancy；路由含硬编码 demo records | 63行 |

### bed-occupancy-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bed-occupancy-forecast/index.tsx | BedOccupancyForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 81行 |

### bed-utilization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bed-utilization/index.tsx | BedUtilizationPage | 真实数据 | /api/v1/bed-utilization；路由含硬编码 demo records | 63行 |

### best-practice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| best-practice/index.tsx | BestPracticePage | 真实数据 | /api/v1/best-practice；路由含硬编码 demo records | 84行 |

### big-data/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| big-data/report-v2/index.tsx | BigDataV2Page | 真实数据 | /api/v1/big-data/report-v2；路由含硬编码 demo records | 106行 |

### billing/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| billing/BillList/index.tsx | BillListPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 177行 |
| billing/index.tsx | BillingPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 102行 |

### billing-reconciliation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| billing-reconciliation/index.tsx | BillingReconciliationPage | 真实数据 | /api/v1/billing-reconciliation；路由含硬编码 demo records | 63行 |

### biobank-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| biobank-v5/report/index.tsx | BiobankV5Page | 真实数据 | /api/v1/biobank-v5/report；路由含硬编码 demo records | 107行 |

### birth-defect-monitoring/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| birth-defect-monitoring/index.tsx | BirthDefectMonitoringPage | 真实数据 | /api/v1/birth-defect-monitoring；路由含硬编码 demo records | 63行 |

### blockchain/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blockchain/report/index.tsx | BlockchainReportPage | 真实数据 | /api/v1/blockchain/report；路由含硬编码 demo records | 107行 |

### blood/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood/transfusion/index.tsx | BloodTransfusionPage | 真实数据 | /api/v1/blood/transfusion/report；路由含硬编码 demo records | 119行 |

### blood-glucose-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-glucose-mgmt/index.tsx | BloodGlucoseMgmtPage | 真实数据 | /api/v1/blood-glucose-mgmt；路由含硬编码 demo records | 63行 |

### blood-inventory/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-inventory/index.tsx | BloodInventoryPage | 真实数据 | /api/v1/blood-inventory；路由含硬编码 demo records | 82行 |

### blood-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-mgmt/index.tsx | BloodMgmtPage | 真实数据 | /api/v1/blood-mgmt；路由含硬编码 demo records | 63行 |

### blood-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-mgmt-detail/index.tsx | BloodMgmtDetailPage | 真实数据 | /api/v1/blood-mgmt-detail；路由含硬编码 demo records | 63行 |

### blood-transfusion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-transfusion/index.tsx | BloodTransfusionPage | 真实数据 | /api/v1/blood-transfusion；路由含硬编码 demo records | 51行 |

### blood-transfusion-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-transfusion-detail/index.tsx | BloodTransfusionDetailPage | 真实数据 | /api/v1/blood-transfusion-detail；路由含硬编码 demo records | 63行 |

### blood-transfusion-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-transfusion-mgmt/index.tsx | BloodTransfusionMgmtPage | 真实数据 | /api/v1/blood-transfusion-mgmt；路由含硬编码 demo records | 63行 |

### blood-transfusion-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-transfusion-quality-mgmt/index.tsx | BloodTransfusionQualityMgmtPage | 真实数据 | /api/v1/blood-transfusion-quality-mgmt；路由含硬编码 demo records | 63行 |

### blood-use/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| blood-use/index.tsx | BloodUsePage | 真实数据 | /api/v1/blood-use；路由含硬编码 demo records | 57行 |

### bloodQuality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bloodQuality/index.tsx | BloodQualityPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 444行 |

### bonus-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| bonus-quality-mgmt/index.tsx | BonusQualityMgmtPage | 真实数据 | /api/v1/bonus-quality-mgmt；路由含硬编码 demo records | 63行 |

### brain/ （5 页：OK 5 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| brain/BrainDeep/index.tsx | AIBrainDeepExpandPage | 真实数据 | /api/v1/ai-brain/expand；路由含硬编码 demo records | 402行 |
| brain/Decision/index.tsx | AIDecisionPage | 真实数据 | /api/v1/ai-brain/decision；路由含硬编码 demo records | 415行 |
| brain/Deep/index.tsx | AIBrainDeepPage | 真实数据 | /api/v1/ai-brain/deep；路由含硬编码 demo records | 415行 |
| brain/DeepAIAlert/index.tsx | DeepAIAlertPage | 真实数据 | /api/v1/ai-brain/deep-alert；路由含硬编码 demo records | 349行 |
| brain/Realtime/index.tsx | AIBrainRealtimePage | 真实数据 | /api/v1/ai-brain/realtime；路由含硬编码 demo records | 293行 |

### budget-execution-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| budget-execution-quality-mgmt/index.tsx | BudgetExecutionQualityMgmtPage | 真实数据 | /api/v1/budget-execution-quality-mgmt；路由含硬编码 demo records | 63行 |

### budget-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| budget-mgmt/index.tsx | BudgetMgmtPage | 真实数据 | /api/v1/budget-mgmt；路由含硬编码 demo records | 63行 |

### cardiology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cardiology-v5/report/index.tsx | CardiologyV5Page | 真实数据 | /api/v1/cardiology-v5/report；路由含硬编码 demo records | 107行 |

### case-discussion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| case-discussion/index.tsx | CaseDiscussionPage | 真实数据 | /api/v1/case-discussion；路由含硬编码 demo records | 63行 |

### case-lesson/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| case-lesson/index.tsx | CaseLessonPage | 真实数据 | /api/v1/agent/case-lesson；路由含硬编码 demo records | 88行 |

### catering-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| catering-quality-mgmt/index.tsx | CateringQualityMgmtPage | 真实数据 | /api/v1/catering-quality-mgmt；路由含硬编码 demo records | 63行 |

### cdc-notification/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cdc-notification/index.tsx | CDCANotificationPage | 真实数据 | /api/v1/cdc-notification；路由含硬编码 demo records | 50行 |

### cdiReview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cdiReview/index.tsx | CdiReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### cds/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cds/index.tsx | CdsPage | 真实数据 | /api/v1/cds/rules；路由含硬编码 demo records | 85行 |

### cds-learning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cds-learning/index.tsx | CdsLearningPage | 真实数据 | /api/v1/cds/suggestions；路由含硬编码 demo records | 66行 |

### cdsOverride/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cdsOverride/index.tsx | CdsOverridePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 53行 |

### cdss-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cdss-v3/report/index.tsx | CDSSV3Page | 真实数据 | /api/v1/cdss-v3/report；路由含硬编码 demo records | 104行 |

### cdss-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cdss-v4/report/index.tsx | CDSSV4Page | 真实数据 | /api/v1/cdss-v4/report；路由含硬编码 demo records | 104行 |

### cgaAssessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cgaAssessment/index.tsx | CgaPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 84行 |

### chemoReminder/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chemoReminder/index.tsx | ChemoReminderPage | 真实数据 | /api/v1/chemo/reminders/upcoming；路由含硬编码 demo records | 32行 |

### chest-pain-center/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chest-pain-center/index.tsx | ChestPainCenterPage | 真实数据 | /api/v1/chest-pain-center；路由含硬编码 demo records | 63行 |

### chest-pain-center-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chest-pain-center-v5/report/index.tsx | ChestPainCenterV5Page | 真实数据 | /api/v1/chest-pain-center-v5/report；路由含硬编码 demo records | 107行 |

### child-health-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| child-health-mgmt/index.tsx | ChildHealthMgmtPage | 真实数据 | /api/v1/child-health-mgmt；路由含硬编码 demo records | 63行 |

### chronic-disease-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chronic-disease-mgmt/index.tsx | ChronicDiseaseMgmtPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 79行 |

### chronic-disease-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chronic-disease-stats/index.tsx | ChronicDiseaseStatsPage | 真实数据 | /api/v1/chronic-disease-stats；路由含硬编码 demo records | 57行 |

### chronicDisease/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| chronicDisease/index.tsx | ChronicPage | 真实数据 | /api/v1/chronic/vitals；路由含硬编码 demo records | 42行 |

### circuit-breaker/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| circuit-breaker/index.tsx | CircuitBreakerPage | 真实数据 | /api/v1/circuit-breaker；路由含硬编码 demo records | 81行 |

### clinical/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical/Pathway/index.tsx | ClinicalPathwayPage | 真实数据 | /api/v1/clinical-pathway/recommend；路由含硬编码 demo records | 262行 |
| clinical/pathway-v2/index.tsx | ClinicalPathwayV2Page | 真实数据 | /api/v1/clinical/pathway/report-v2；路由含硬编码 demo records | 135行 |

### clinical-nutrition-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-nutrition-v5/report/index.tsx | ClinicalNutritionV5Page | 真实数据 | /api/v1/clinical-nutrition-v5/report；路由含硬编码 demo records | 52行 |

### clinical-pathway-coverage-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pathway-coverage-mgmt/index.tsx | ClinicalPathwayCoverageMgmtPage | 真实数据 | /api/v1/clinical-pathway-coverage-mgmt；路由含硬编码 demo records | 63行 |

### clinical-pathway-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pathway-detail/index.tsx | ClinicalPathwayDetailPage | 真实数据 | /api/v1/clinical-pathway-detail；路由含硬编码 demo records | 63行 |

### clinical-pathway-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pathway-mgmt/index.tsx | ClinicalPathwayMgmtPage | 真实数据 | /api/v1/clinical-pathway-mgmt；路由含硬编码 demo records | 63行 |

### clinical-pathway-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pathway-overview/index.tsx | ClinicalPathwayOverviewPage | 真实数据 | /api/v1/clinical-pathway-overview；路由含硬编码 demo records | 63行 |

### clinical-pathway-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pathway-stats/index.tsx | ClinicalPathwayStatsPage | 真实数据 | /api/v1/clinical-pathway-stats；路由含硬编码 demo records | 63行 |

### clinical-pharmacy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pharmacy/index.tsx | ClinicalPharmacyPage | 真实数据 | /api/v1/clinical-pharmacy；路由含硬编码 demo records | 63行 |

### clinical-pharmacy-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-pharmacy-quality/index.tsx | ClinicalPharmacyQualityPage | 真实数据 | /api/v1/clinical-pharmacy-quality；路由含硬编码 demo records | 63行 |

### clinical-quality-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-quality-dashboard/index.tsx | ClinicalQualityDashboardPage | 真实数据 | /api/v1/clinical-quality-dashboard；路由含硬编码 demo records | 78行 |

### clinical-research-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-research-ai-v2/report/index.tsx | ClinicalResearchAIV2Page | 真实数据 | /api/v1/clinical-research-ai-v2/report；路由含硬编码 demo records | 104行 |

### clinical-research-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-research-detail/index.tsx | ClinicalResearchDetailPage | 真实数据 | /api/v1/clinical-research-detail；路由含硬编码 demo records | 63行 |

### clinical-research-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-research-overview/index.tsx | ClinicalResearchOverviewPage | 真实数据 | /api/v1/clinical-research-overview；路由含硬编码 demo records | 73行 |

### clinical-research-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-research-stats/index.tsx | ClinicalResearchStatsPage | 真实数据 | /api/v1/clinical-research-stats；路由含硬编码 demo records | 63行 |

### clinical-rule-engine-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinical-rule-engine-v3/report/index.tsx | ClinicalRuleEngineV3Page | 真实数据 | /api/v1/clinical-rule-engine-v3/report；路由含硬编码 demo records | 107行 |

### clinician-work-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| clinician-work-ai-v2/report/index.tsx | ClinicianWorkAIV2Page | 真实数据 | /api/v1/clinician-work-ai-v2/report；路由含硬编码 demo records | 103行 |

### closed-loop-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| closed-loop-overview/index.tsx | ClosedLoopOverviewPage | 真实数据 | /api/v1/closed-loop-overview；路由含硬编码 demo records | 58行 |

### cloud-native/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cloud-native/report-v2/index.tsx | CloudNativeV2Page | 真实数据 | /api/v1/cloud-native/report-v2；路由含硬编码 demo records | 107行 |

### cloud-native-sre-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cloud-native-sre-v5/report/index.tsx | CloudNativeSREV5Page | 真实数据 | /api/v1/cloud-native-sre-v5/report；路由含硬编码 demo records | 107行 |

### coding-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| coding-quality/index.tsx | CodingQualityPage | 真实数据 | /api/v1/coding-quality；路由含硬编码 demo records | 63行 |

### commercial-bribery-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| commercial-bribery-quality-mgmt/index.tsx | CommercialBriberyQualityMgmtPage | 真实数据 | /api/v1/commercial-bribery-quality-mgmt；路由含硬编码 demo records | 63行 |

### commercial-insurance-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| commercial-insurance-v5/report/index.tsx | CommercialInsuranceV5Page | 真实数据 | /api/v1/commercial-insurance-v5/report；路由含硬编码 demo records | 107行 |

### competency-profile/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| competency-profile/index.tsx | CompetencyProfilePage | 真实数据 | /api/v1/competency-profile；路由含硬编码 demo records | 50行 |

### complaint-handling/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-handling/index.tsx | ComplaintHandlingPage | 真实数据 | /api/v1/complaint-handling；路由含硬编码 demo records | 63行 |

### complaint-handling-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-handling-mgmt/index.tsx | ComplaintHandlingMgmtPage | 真实数据 | /api/v1/complaint-handling-mgmt；路由含硬编码 demo records | 63行 |

### complaint-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-mgmt/index.tsx | ComplaintMgmtPage | 真实数据 | /api/v1/complaint-mgmt；路由含硬编码 demo records | 63行 |

### complaint-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-mgmt-detail/index.tsx | ComplaintMgmtDetailPage | 真实数据 | /api/v1/complaint-mgmt-detail；路由含硬编码 demo records | 63行 |

### complaint-mgmt-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-mgmt-stats/index.tsx | ComplaintMgmtStatsPage | 真实数据 | /api/v1/complaint-mgmt-stats；路由含硬编码 demo records | 63行 |

### complaint-rate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| complaint-rate/index.tsx | ComplaintRatePage | 真实数据 | /api/v1/complaint-rate；路由含硬编码 demo records | 57行 |

### compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| compliance/report/index.tsx | ComplianceReportPage | 真实数据 | /api/v1/compliance/report；路由含硬编码 demo records | 105行 |

### consent-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| consent-mgmt/index.tsx | ConsentMgmtPage | 真实数据 | /api/v1/consent-mgmt；路由含硬编码 demo records | 63行 |

### consultation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| consultation/index.tsx | ConsultationWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### consultation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| consultation-mgmt/index.tsx | ConsultationMgmtPage | 真实数据 | /api/v1/consultation-mgmt；路由含硬编码 demo records | 63行 |

### consumable-inventory/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| consumable-inventory/index.tsx | ConsumableInventoryPage | 真实数据 | /api/v1/consumable-inventory；路由含硬编码 demo records | 63行 |

### consumable-supply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| consumable-supply/index.tsx | ConsumableSupplyPage | 真实数据 | /api/v1/consumable-supply；路由含硬编码 demo records | 63行 |

### contextual-push/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| contextual-push/index.tsx | ContextualPushPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 60行 |

### continuing-edu/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-edu/index.tsx | ContinuingEduPage | 真实数据 | /api/v1/continuing-edu；路由含硬编码 demo records | 63行 |

### continuing-edu-coverage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-edu-coverage/index.tsx | ContinuingEduCoveragePage | 真实数据 | /api/v1/continuing-edu-coverage；路由含硬编码 demo records | 63行 |

### continuing-education/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-education/index.tsx | ContinuingEducationPage | 真实数据 | /api/v1/continuing-education；路由含硬编码 demo records | 57行 |

### continuing-education-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-education-detail/index.tsx | ContinuingEducationDetailPage | 真实数据 | /api/v1/continuing-education-detail；路由含硬编码 demo records | 63行 |

### continuing-education-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-education-mgmt/index.tsx | ContinuingEducationMgmtPage | 真实数据 | /api/v1/continuing-education-mgmt；路由含硬编码 demo records | 63行 |

### continuing-education-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-education-quality-mgmt/index.tsx | ContinuingEducationQualityMgmtPage | 真实数据 | /api/v1/continuing-education-quality-mgmt；路由含硬编码 demo records | 63行 |

### continuing-education-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| continuing-education-stats/index.tsx | ContinuingEducationStatsPage | 真实数据 | /api/v1/continuing-education-stats；路由含硬编码 demo records | 63行 |

### contribution-leaderboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| contribution-leaderboard/index.tsx | ContributionLeaderboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### convenience-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| convenience-service/index.tsx | ConvenienceServicePage | 真实数据 | /api/v1/convenience-service；路由含硬编码 demo records | 63行 |

### core-system/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| core-system/index.tsx | CoreSystemPage | 真实数据 | /api/v1/core-system；路由含硬编码 demo records | 63行 |

### core-system-compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| core-system-compliance/index.tsx | CoreSystemCompliancePage | 真实数据 | /api/v1/core-system-compliance；路由含硬编码 demo records | 63行 |

### cost-accounting-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cost-accounting-v3/report/index.tsx | CostAccountingV3Page | 真实数据 | /api/v1/cost-accounting-v3/report；路由含硬编码 demo records | 103行 |

### cost-accounting-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cost-accounting-v4/report/index.tsx | CostAccountingV4Page | 真实数据 | /api/v1/cost-accounting-v4/report；路由含硬编码 demo records | 104行 |

### cost-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cost-control/index.tsx | CostControlPage | 真实数据 | /api/v1/cost-control；路由含硬编码 demo records | 63行 |

### cost-control-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cost-control-detail/index.tsx | CostControlDetailPage | 真实数据 | /api/v1/cost-control-detail；路由含硬编码 demo records | 63行 |

### cost-per-patient/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cost-per-patient/index.tsx | CostPerPatientPage | 真实数据 | /api/v1/cost-per-patient；路由含硬编码 demo records | 78行 |

### costAttribution/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| costAttribution/index.tsx | CostAttributionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 64行 |

### credit-treatment-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| credit-treatment-v5/report/index.tsx | CreditTreatmentV5Page | 真实数据 | /api/v1/credit-treatment-v5/report；路由含硬编码 demo records | 52行 |

### critical-care-center-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| critical-care-center-v5/report/index.tsx | CriticalCareCenterV5Page | 真实数据 | /api/v1/critical-care-center-v5/report；路由含硬编码 demo records | 108行 |

### critical-value-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| critical-value-detail/index.tsx | CriticalValueDetailPage | 真实数据 | /api/v1/critical-value-detail；路由含硬编码 demo records | 63行 |

### critical-value-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| critical-value-mgmt/index.tsx | CriticalValueMgmtPage | 真实数据 | /api/v1/critical-value-mgmt；路由含硬编码 demo records | 63行 |

### critical-value-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| critical-value-stats/index.tsx | CriticalValueStatsPage | 真实数据 | /api/v1/critical-value-stats；路由含硬编码 demo records | 63行 |

### cross-dept-broadcast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cross-dept-broadcast/index.tsx | CrossDeptBroadcastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 70行 |

### cross-dept-learning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cross-dept-learning/index.tsx | CrossDeptLearningPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 76行 |

### cross-role-experience/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cross-role-experience/index.tsx | CrossRoleExperiencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### cssd/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cssd/index.tsx | CssdPage | 真实数据 | /api/v1/cssd；路由含硬编码 demo records | 63行 |

### culture-brand/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| culture-brand/report-v2/index.tsx | CultureBrandV2Page | 真实数据 | /api/v1/culture-brand/report-v2；路由含硬编码 demo records | 107行 |
| culture-brand/report/index.tsx | CultureBrandPage | 真实数据 | /api/v1/culture-brand/report；路由含硬编码 demo records | 106行 |

### culture-brand-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| culture-brand-v3/report/index.tsx | CultureBrandV3Page | 真实数据 | /api/v1/culture-brand-v3/report；路由含硬编码 demo records | 103行 |

### cybersecurity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cybersecurity/report-v2/index.tsx | CybersecurityV2Page | 真实数据 | /api/v1/cybersecurity/report-v2；路由含硬编码 demo records | 107行 |

### cybersecurity-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cybersecurity-mgmt/index.tsx | CybersecurityMgmtPage | 真实数据 | /api/v1/cybersecurity-mgmt；路由含硬编码 demo records | 63行 |

### cybersecurity-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| cybersecurity-v3/report/index.tsx | CybersecurityV3Page | 真实数据 | /api/v1/cybersecurity-v3/report；路由含硬编码 demo records | 103行 |

### dashboard/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dashboard/CeoBoard/index.tsx | CeoBoard | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 284行 |
| dashboard/index.tsx | Dashboard | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 342行 |

### data-access-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-access-audit/index.tsx | DataAccessAuditPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 90行 |

### data-asset/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-asset/report-v3/index.tsx | DataAssetV3Page | 真实数据 | /api/v1/data-asset/report-v3；路由含硬编码 demo records | 107行 |

### data-asset-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-asset-v4/report/index.tsx | DataAssetV4Page | 真实数据 | /api/v1/data-asset-v4/report；路由含硬编码 demo records | 107行 |

### data-classification/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-classification/index.tsx | DataClassificationPage | 真实数据 | /api/v1/data-classification；路由含硬编码 demo records | 54行 |

### data-flywheel-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-flywheel-v5/report/index.tsx | DataFlywheelV5Page | 真实数据 | /api/v1/data-flywheel-v5/report；路由含硬编码 demo records | 107行 |

### data-governance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-governance/report-v2/index.tsx | DataGovernanceV2Page | 真实数据 | /api/v1/data-governance/report-v2；路由含硬编码 demo records | 107行 |

### data-governance-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-governance-detail/index.tsx | DataGovernanceDetailPage | 真实数据 | /api/v1/data-governance-detail；路由含硬编码 demo records | 63行 |

### data-governance-maturity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-governance-maturity/index.tsx | DataGovernanceMaturityPage | 真实数据 | /api/v1/data-governance-maturity；路由含硬编码 demo records | 93行 |

### data-governance-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-governance-stats/index.tsx | DataGovernanceStatsPage | 真实数据 | /api/v1/data-governance-stats；路由含硬编码 demo records | 63行 |

### data-governance-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-governance-v3/report/index.tsx | DataGovernanceV3Page | 真实数据 | /api/v1/data-governance-v3/report；路由含硬编码 demo records | 103行 |

### data-mesh-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-mesh-v5/report/index.tsx | DataMeshV5Page | 真实数据 | /api/v1/data-mesh-v5/report；路由含硬编码 demo records | 107行 |

### data-platform-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-platform-ai-v2/report/index.tsx | DataPlatformAIV2Page | 真实数据 | /api/v1/data-platform-ai-v2/report；路由含硬编码 demo records | 103行 |

### data-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-quality/index.tsx | DataQualityPage | 真实数据 | /api/v1/data-quality；路由含硬编码 demo records | 69行 |

### data-quality-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-quality-detail/index.tsx | DataQualityDetailPage | 真实数据 | /api/v1/data-quality-detail；路由含硬编码 demo records | 63行 |

### data-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-quality-mgmt/index.tsx | DataQualityMgmtPage | 真实数据 | /api/v1/data-quality-mgmt；路由含硬编码 demo records | 63行 |

### data-quality-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-quality-stats/index.tsx | DataQualityStatsPage | 真实数据 | /api/v1/data-quality-stats；路由含硬编码 demo records | 63行 |

### data-report-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-report-quality-mgmt/index.tsx | DataReportQualityMgmtPage | 真实数据 | /api/v1/data-report-quality-mgmt；路由含硬编码 demo records | 63行 |

### data-security/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-security/report-v2/index.tsx | DataSecurityV2Page | 真实数据 | /api/v1/data-security/report-v2；路由含硬编码 demo records | 108行 |

### data-security-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-security-mgmt/index.tsx | DataSecurityMgmtPage | 真实数据 | /api/v1/data-security-mgmt；路由含硬编码 demo records | 63行 |

### data-sharing/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| data-sharing/index.tsx | DataSharingPage | 真实数据 | /api/v1/data-sharing/audit；路由含硬编码 demo records | 54行 |

### dataGovernance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dataGovernance/index.tsx | DataGovernancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 497行 |

### dataWarehouse/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dataWarehouse/index.tsx | DataWarehousePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 339行 |

### day-surgery-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| day-surgery-mgmt/index.tsx | DaySurgeryMgmtPage | 真实数据 | /api/v1/day-surgery-mgmt；路由含硬编码 demo records | 63行 |

### dean-command-center/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dean-command-center/index.tsx | DeanCommandCenterPage | 真实数据 | /api/v1/dean-command-center；路由含硬编码 demo records | 77行 |

### death-case-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| death-case-detail/index.tsx | DeathCaseDetailPage | 真实数据 | /api/v1/death-case-detail；路由含硬编码 demo records | 63行 |

### death-report-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| death-report-mgmt/index.tsx | DeathReportMgmtPage | 真实数据 | /api/v1/death-report-mgmt；路由含硬编码 demo records | 63行 |

### demo/ （1 页：OK 0 / SHELL 1 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| demo/Watermark/index.tsx | Watermark | 空壳 | 无数据获取、无内置列表 | 102行 |

### department-kpi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| department-kpi/index.tsx | DepartmentKpiPage | 真实数据 | /api/v1/department-kpi；路由含硬编码 demo records | 63行 |

### dept-benchmark/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-benchmark/index.tsx | DeptBenchmarkPage | 真实数据 | /api/v1/dept-benchmark；路由含硬编码 demo records | 71行 |

### dept-collab-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-collab-overview/index.tsx | DeptCollabOverviewPage | 真实数据 | /api/v1/dept-collab-overview；路由含硬编码 demo records | 70行 |

### dept-kpi-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-kpi-quality-mgmt/index.tsx | DeptKpiQualityMgmtPage | 真实数据 | /api/v1/dept-kpi-quality-mgmt；路由含硬编码 demo records | 63行 |

### dept-profile/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-profile/index.tsx | DeptProfilePage | 真实数据 | /api/v1/dept-profile；路由含硬编码 demo records | 68行 |

### dept-sop/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-sop/index.tsx | DeptSopPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### dept-task-board/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-task-board/index.tsx | DeptTaskBoardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 105行 |

### dept-task-collab/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-task-collab/index.tsx | DeptTaskCollabPage | 真实数据 | /api/v1/dept-task-collab；路由含硬编码 demo records | 92行 |

### dept-task-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dept-task-detail/index.tsx | DeptTaskDetailPage | 真实数据 | /api/v1/dept-task-detail/t1 | 85行 |

### derm-infectious-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| derm-infectious-v5/report/index.tsx | DermInfectiousV5Page | 真实数据 | /api/v1/derm-infectious-v5/report；路由含硬编码 demo records | 107行 |

### dev-platform-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dev-platform-v5/report/index.tsx | DevPlatformV5Page | 真实数据 | /api/v1/dev-platform-v5/report；路由含硬编码 demo records | 107行 |

### device-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| device-quality-mgmt/index.tsx | DeviceQualityMgmtPage | 真实数据 | /api/v1/device-quality-mgmt；路由含硬编码 demo records | 63行 |

### devops/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| devops/report-v2/index.tsx | DevOpsV2Page | 真实数据 | /api/v1/devops/report-v2；路由含硬编码 demo records | 107行 |

### dialysis-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dialysis-mgmt/index.tsx | DialysisMgmtPage | 真实数据 | /api/v1/dialysis-mgmt；路由含硬编码 demo records | 63行 |

### dialysis-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dialysis-quality-mgmt/index.tsx | DialysisQualityMgmtPage | 真实数据 | /api/v1/dialysis-quality-mgmt；路由含硬编码 demo records | 63行 |

### diffusion-adoption/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| diffusion-adoption/index.tsx | DiffusionAdoptionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 74行 |

### diffusion-graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| diffusion-graph/index.tsx | DiffusionGraphPage | 真实数据 | /api/v1/diffusion-graph；路由含硬编码 demo records | 84行 |

### diffusion-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| diffusion-overview/index.tsx | DiffusionOverviewPage | 真实数据 | /api/v1/diffusion-overview；路由含硬编码 demo records | 65行 |

### digital-twin/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| digital-twin/report/index.tsx | DigitalTwinPage | 真实数据 | /api/v1/digital-twin/report；路由含硬编码 demo records | 104行 |

### digital-twin-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| digital-twin-v5/report/index.tsx | DigitalTwinV5Page | 真实数据 | /api/v1/digital-twin-v5/report；路由含硬编码 demo records | 107行 |

### digitalCompanion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| digitalCompanion/index.tsx | DigitalCompanionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 255行 |

### dip/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dip/index.tsx | DipPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 59行 |

### dip-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dip-score/index.tsx | DipScorePage | 真实数据 | /api/v1/dip-score；路由含硬编码 demo records | 63行 |

### discharge-followup/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discharge-followup/index.tsx | DischargeFollowupPage | 真实数据 | /api/v1/discharge-followup；路由含硬编码 demo records | 63行 |

### discharge-summary-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discharge-summary-detail/index.tsx | DischargeSummaryDetailPage | 真实数据 | /api/v1/discharge-summary-detail；路由含硬编码 demo records | 63行 |

### discharge-summary-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discharge-summary-mgmt/index.tsx | DischargeSummaryMgmtPage | 真实数据 | /api/v1/discharge-summary-mgmt；路由含硬编码 demo records | 63行 |

### discharge-summary-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discharge-summary-quality/index.tsx | DischargeSummaryQualityPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 92行 |

### dischargePlan/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dischargePlan/index.tsx | DischargePlanPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 85行 |

### discipline/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline/report-v2/index.tsx | DisciplineV2Page | 真实数据 | /api/v1/discipline/report-v2；路由含硬编码 demo records | 106行 |

### discipline-assessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-assessment/report-v3/index.tsx | DisciplineAssessmentV3Page | 真实数据 | /api/v1/discipline-assessment/report-v3；路由含硬编码 demo records | 107行 |

### discipline-competition/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-competition/index.tsx | DisciplineCompetitionPage | 真实数据 | /api/v1/discipline-competition；路由含硬编码 demo records | 63行 |

### discipline-construction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-construction/index.tsx | DisciplineConstructionPage | 真实数据 | /api/v1/discipline-construction；路由含硬编码 demo records | 65行 |

### discipline-construction-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-construction-mgmt/index.tsx | DisciplineConstructionMgmtPage | 真实数据 | /api/v1/discipline-construction-mgmt；路由含硬编码 demo records | 63行 |

### discipline-construction-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-construction-quality-mgmt/index.tsx | DisciplineConstructionQualityMgmtPage | 真实数据 | /api/v1/discipline-construction-quality-mgmt；路由含硬编码 demo records | 63行 |

### discipline-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| discipline-v3/report/index.tsx | DisciplineV3Page | 真实数据 | /api/v1/discipline-v3/report；路由含硬编码 demo records | 104行 |

### disinfection-sterilization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| disinfection-sterilization/index.tsx | DisinfectionSterilizationPage | 真实数据 | /api/v1/disinfection-sterilization；路由含硬编码 demo records | 63行 |

### dispute/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dispute/warning/index.tsx | DisputeWarningPage | 真实数据 | /api/v1/dispute/warning/report；路由含硬编码 demo records | 158行 |

### dlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| dlp/index.tsx | DlpPage | 真实数据 | /api/v1/dlp；路由含硬编码 demo records | 54行 |

### doctor/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor/Growth/index.tsx | DoctorGrowthPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 458行 |
| doctor/aiDiagnosis/Sidebar/index.tsx | AiDiagnosisSidebar | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 325行 |
| doctor/aiRecord/Editor/index.tsx | AiRecordEditorPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 329行 |

### doctor-growth-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-growth-report/index.tsx | DoctorGrowthReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### doctor-muse-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-muse-usage/index.tsx | DoctorMuseUsagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 79行 |

### doctor-patient-communication-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-patient-communication-mgmt/index.tsx | DoctorPatientCommunicationMgmtPage | 真实数据 | /api/v1/doctor-patient-communication-mgmt；路由含硬编码 demo records | 63行 |

### doctor-preference/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-preference/index.tsx | DoctorPreferencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 74行 |

### doctor-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-satisfaction/index.tsx | DoctorSatisfactionPage | 真实数据 | /api/v1/doctor-satisfaction；路由含硬编码 demo records | 58行 |

### doctor-title-structure/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-title-structure/index.tsx | DoctorTitleStructurePage | 真实数据 | /api/v1/doctor-title-structure；路由含硬编码 demo records | 69行 |

### doctor-workload/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctor-workload/index.tsx | DoctorWorkloadPage | 真实数据 | /api/v1/doctor-workload；路由含硬编码 demo records | 63行 |

### doctorWorkbench/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| doctorWorkbench/index.tsx | DoctorWorkbenchPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 46行 |

### drg/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg/audit/index.tsx | DRGAuditV2Page | 真实数据 | /api/v1/drg/audit/report-v2；路由含硬编码 demo records | 124行 |

### drg-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-analysis/index.tsx | DrgAnalysisPage | 真实数据 | /api/v1/drg-analysis；路由含硬编码 demo records | 80行 |

### drg-cost-overrun/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-cost-overrun/index.tsx | DrgCostOverrunPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 96行 |

### drg-dip/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-dip/report-v2/index.tsx | DRGDIPV2Page | 真实数据 | /api/v1/drg-dip/report-v2；路由含硬编码 demo records | 107行 |

### drg-dip-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-dip-mgmt/index.tsx | DrgDipMgmtPage | 真实数据 | /api/v1/drg-dip-mgmt；路由含硬编码 demo records | 63行 |

### drg-group-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-group-stats/index.tsx | DRGGroupStatsPage | 真实数据 | /api/v1/drg-group-stats；路由含硬编码 demo records | 63行 |

### drg-grouping/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-grouping/index.tsx | DrgGroupingPage | 真实数据 | /api/v1/drg-grouping；路由含硬编码 demo records | 63行 |

### drg-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-management/index.tsx | DrgManagementPage | 真实数据 | /api/v1/drg-management；路由含硬编码 demo records | 63行 |

### drg-performance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drg-performance/index.tsx | DrgPerformancePage | 真实数据 | /api/v1/drg-performance；路由含硬编码 demo records | 69行 |

### drgBudget/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drgBudget/index.tsx | DrgBudgetPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 64行 |

### drill-case/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drill-case/index.tsx | DrillCasePage | 真实数据 | /api/v1/drill-case；路由含硬编码 demo records | 52行 |

### drug/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug/rational/index.tsx | RationalDrugUsePage | 真实数据 | /api/v1/drug/rational/report；路由含硬编码 demo records | 136行 |

### drug-adverse-reaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-adverse-reaction/index.tsx | DrugAdverseReactionPage | 真实数据 | /api/v1/drug-adverse-reaction；路由含硬编码 demo records | 63行 |

### drug-allergy-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-allergy-mgmt/index.tsx | DrugAllergyMgmtPage | 真实数据 | /api/v1/drug-allergy-mgmt；路由含硬编码 demo records | 63行 |

### drug-consumable-ratio/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-consumable-ratio/index.tsx | DrugConsumableRatioPage | 真实数据 | /api/v1/drug-consumable-ratio；路由含硬编码 demo records | 63行 |

### drug-expiry-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-expiry-mgmt/index.tsx | DrugExpiryMgmtPage | 真实数据 | /api/v1/drug-expiry-mgmt；路由含硬编码 demo records | 63行 |

### drug-interaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-interaction/index.tsx | DrugInteractionPage | 真实数据 | /api/v1/drug-interaction；路由含硬编码 demo records | 63行 |

### drug-inventory-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-inventory-mgmt/index.tsx | DrugInventoryMgmtPage | 真实数据 | /api/v1/drug-inventory-mgmt；路由含硬编码 demo records | 63行 |

### drug-inventory-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-inventory-stats/index.tsx | DrugInventoryStatsPage | 真实数据 | /api/v1/drug-inventory-stats；路由含硬编码 demo records | 63行 |

### drug-preparation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-preparation/index.tsx | DrugPreparationPage | 真实数据 | /api/v1/drug-preparation；路由含硬编码 demo records | 63行 |

### drug-purchase-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-purchase-mgmt/index.tsx | DrugPurchaseMgmtPage | 真实数据 | /api/v1/drug-purchase-mgmt；路由含硬编码 demo records | 63行 |

### drug-shortage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-shortage/index.tsx | DrugShortagePage | 真实数据 | /api/v1/drug-shortage；路由含硬编码 demo records | 63行 |

### drug-storage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-storage/index.tsx | DrugStoragePage | 真实数据 | /api/v1/drug-storage；路由含硬编码 demo records | 63行 |

### drug-supply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-supply/report-v2/index.tsx | DrugSupplyV2Page | 真实数据 | /api/v1/drug-supply/report-v2；路由含硬编码 demo records | 104行 |

### drug-supply-chain-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drug-supply-chain-v3/report/index.tsx | DrugSupplyChainV3Page | 真实数据 | /api/v1/drug-supply-chain-v3/report；路由含硬编码 demo records | 107行 |

### drugReview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| drugReview/PrescriptionReview/index.tsx | PrescriptionReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 154行 |

### duty-roster/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| duty-roster/index.tsx | DutyRosterPage | 真实数据 | /api/v1/duty-roster；路由含硬编码 demo records | 63行 |

### e-invoice-payment-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| e-invoice-payment-v5/report/index.tsx | EInvoicePaymentV5Page | 真实数据 | /api/v1/e-invoice-payment-v5/report；路由含硬编码 demo records | 53行 |

### ecosystem-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ecosystem-dashboard/index.tsx | EcosystemDashboardPage | 真实数据 | /api/v1/ecosystem-dashboard；路由含硬编码 demo records | 71行 |

### ecosystem-open/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ecosystem-open/report/index.tsx | EcosystemOpenPage | 真实数据 | /api/v1/ecosystem-open/report；路由含硬编码 demo records | 105行 |

### edObservation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| edObservation/index.tsx | EdObservationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 77行 |

### education/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| education/report-v3/index.tsx | EducationV3Page | 真实数据 | /api/v1/education/report-v3；路由含硬编码 demo records | 107行 |

### efficiency-indicator/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| efficiency-indicator/index.tsx | EfficiencyIndicatorPage | 真实数据 | /api/v1/efficiency-indicator；路由含硬编码 demo records | 63行 |

### elderly-accessible-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| elderly-accessible-v5/report/index.tsx | ElderlyAccessibleV5Page | 真实数据 | /api/v1/elderly-accessible-v5/report；路由含硬编码 demo records | 107行 |

### elevator-wait-time/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| elevator-wait-time/index.tsx | ElevatorWaitTimePage | 真实数据 | /api/v1/elevator-wait-time；路由含硬编码 demo records | 51行 |

### emergency/ （4 页：OK 4 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency/index.tsx | EmergencyPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 118行 |
| emergency/report-v2/index.tsx | EmergencyMgmtV2Page | 真实数据 | /api/v1/emergency/report-v2；路由含硬编码 demo records | 107行 |
| emergency/report-v3/index.tsx | EmergencyV3Page | 真实数据 | /api/v1/emergency/report-v3；路由含硬编码 demo records | 104行 |
| emergency/report/index.tsx | EmergencyReportPage | 真实数据 | /api/v1/emergency/report；路由含硬编码 demo records | 132行 |

### emergency-capacity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-capacity/index.tsx | EmergencyCapacityPage | 真实数据 | /api/v1/emergency-capacity；路由含硬编码 demo records | 63行 |

### emergency-care-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-care-mgmt/index.tsx | EmergencyCareMgmtPage | 真实数据 | /api/v1/emergency-care-mgmt；路由含硬编码 demo records | 63行 |

### emergency-drill-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-drill-mgmt/index.tsx | EmergencyDrillMgmtPage | 真实数据 | /api/v1/emergency-drill-mgmt；路由含硬编码 demo records | 63行 |

### emergency-drug-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-drug-mgmt/index.tsx | EmergencyDrugMgmtPage | 真实数据 | /api/v1/emergency-drug-mgmt；路由含硬编码 demo records | 63行 |

### emergency-green-channel-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-green-channel-mgmt/index.tsx | EmergencyGreenChannelMgmtPage | 真实数据 | /api/v1/emergency-green-channel-mgmt；路由含硬编码 demo records | 63行 |

### emergency-greenway/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-greenway/index.tsx | EmergencyGreenwayPage | 真实数据 | /api/v1/emergency-greenway；路由含硬编码 demo records | 63行 |

### emergency-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-mgmt/report-v2/index.tsx | EmergencyMgmtV2Page | 真实数据 | /api/v1/emergency-mgmt/report-v2；路由含硬编码 demo records | 107行 |

### emergency-mgmt-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-mgmt-v3/report/index.tsx | EmergencyMgmtV3Page | 真实数据 | /api/v1/emergency-mgmt-v3/report；路由含硬编码 demo records | 104行 |

### emergency-response-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-response-mgmt/index.tsx | EmergencyResponseMgmtPage | 真实数据 | /api/v1/emergency-response-mgmt；路由含硬编码 demo records | 63行 |

### emergency-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-service/index.tsx | EmergencyServicePage | 真实数据 | /api/v1/emergency-service；路由含硬编码 demo records | 63行 |

### emergency-severity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-severity/index.tsx | EmergencySeverityPage | 真实数据 | /api/v1/emergency-severity；路由含硬编码 demo records | 63行 |

### emergency-triage-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-triage-stats/index.tsx | EmergencyTriageStatsPage | 真实数据 | /api/v1/emergency-triage-stats；路由含硬编码 demo records | 72行 |

### emergency-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emergency-v4/report/index.tsx | EmergencyV4Page | 真实数据 | /api/v1/emergency-v4/report；路由含硬编码 demo records | 104行 |

### empi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| empi/index.tsx | EmpiPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 105行 |

### employee-experience/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| employee-experience/report-v2/index.tsx | EmployeeExperienceV2Page | 真实数据 | /api/v1/employee-experience/report-v2；路由含硬编码 demo records | 107行 |

### emr/ （4 页：OK 4 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr/Grade5Assessment/index.tsx | Grade5AssessmentPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 209行 |
| emr/SmartScore/index.tsx | EmrSmartScorePage | 真实数据 | /api/v1/emr/score；路由含硬编码 demo records | 252行 |
| emr/Template/index.tsx | EmrTemplatePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 289行 |
| emr/grade5/index.tsx | EMRGrade5V2Page | 真实数据 | /api/v1/emr/grade5/assessment-v2；路由含硬编码 demo records | 127行 |

### emr-access-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-access-audit/index.tsx | EmrAccessAuditPage | 真实数据 | /api/v1/emr-access-audit；路由含硬编码 demo records | 144行 |

### emr-access-audit-log/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-access-audit-log/index.tsx | EmrAccessAuditLogPage | 真实数据 | /api/v1/emr-access-audit-log；路由含硬编码 demo records | 145行 |

### emr-access-request/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-access-request/index.tsx | EmrAccessRequestPage | 真实数据 | /api/v1/emr-access-request；路由含硬编码 demo records | 143行 |

### emr-ai-adverse-event-detect/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-adverse-event-detect/index.tsx | EmrAiAdverseEventDetectPage | 真实数据 | /api/v1/emr-ai-adverse-event-detect；路由含硬编码 demo records | 142行 |

### emr-ai-anesthesia-depth-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-anesthesia-depth-suggest/index.tsx | EmrAiAnesthesiaDepthSuggestPage | 真实数据 | /api/v1/emr-ai-anesthesia-depth-suggest；路由含硬编码 demo records | 125行 |

### emr-ai-archive-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-archive-check/index.tsx | EmrAiArchiveCheckPage | 真实数据 | /api/v1/emr-ai-archive-check；路由含硬编码 demo records | 131行 |

### emr-ai-assistant/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-assistant/index.tsx | EmrAiAssistantPage | 真实数据 | /api/v1/emr-ai-assistant/suggest；路由含硬编码 demo records | 85行 |

### emr-ai-chronic-care-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-chronic-care-plan-reco/index.tsx | EmrAiChronicCarePlanRecoPage | 真实数据 | /api/v1/emr-ai-chronic-care-plan-reco；路由含硬编码 demo records | 138行 |

### emr-ai-clinical-graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-clinical-graph/index.tsx | EmrAiClinicalGraphPage | 真实数据 | /api/v1/emr-ai-clinical-graph；路由含硬编码 demo records | 134行 |

### emr-ai-clinical-guideline-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-clinical-guideline-reco/index.tsx | EmrAiClinicalGuidelineRecoPage | 真实数据 | /api/v1/emr-ai-clinical-guideline-reco；路由含硬编码 demo records | 137行 |

### emr-ai-clinical-pathway-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-clinical-pathway-reco/index.tsx | EmrAiClinicalPathwayRecoPage | 真实数据 | /api/v1/emr-ai-clinical-pathway-reco；路由含硬编码 demo records | 135行 |

### emr-ai-clinical-qa/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-clinical-qa/index.tsx | EmrAiClinicalQaPage | 真实数据 | /api/v1/emr-ai-clinical-qa；路由含硬编码 demo records | 126行 |

### emr-ai-cost-rational-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-cost-rational-audit/index.tsx | EmrAiCostRationalAuditPage | 真实数据 | /api/v1/emr-ai-cost-rational-audit；路由含硬编码 demo records | 140行 |

### emr-ai-defect-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-defect-predict/index.tsx | EmrAiDefectPredictPage | 真实数据 | /api/v1/emr-ai-defect-predict；路由含硬编码 demo records | 142行 |

### emr-ai-defect-root-cause/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-defect-root-cause/index.tsx | EmrAiDefectRootCausePage | 真实数据 | /api/v1/emr-ai-defect-root-cause；路由含硬编码 demo records | 140行 |

### emr-ai-defect-rootcause/ （1 页：OK 0 / SHELL 0 / RISK 1）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-defect-rootcause/index.tsx | EmrAiDefectRootcausePage | 崩溃风险 | API 未注册: /api/v1/emr-ai-defect-rootcause, /api/v1/emr-ai-defect-rootcause | 144行 |

### emr-ai-diagnosis-diff/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-diagnosis-diff/index.tsx | EmrAiDiagnosisDiffPage | 真实数据 | /api/v1/emr-ai-diagnosis-diff；路由含硬编码 demo records | 142行 |

### emr-ai-diet-script-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-diet-script-reco/index.tsx | EmrAiDietScriptRecoPage | 真实数据 | /api/v1/emr-ai-diet-script-reco；路由含硬编码 demo records | 133行 |

### emr-ai-diff-dx/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-diff-dx/index.tsx | EmrAiDiffDxPage | 真实数据 | /api/v1/emr-ai-diff-dx；路由含硬编码 demo records | 130行 |

### emr-ai-dip-group-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-dip-group-predict/index.tsx | EmrAiDipGroupPredictPage | 真实数据 | /api/v1/emr-ai-dip-group-predict；路由含硬编码 demo records | 140行 |

### emr-ai-discharge-followup-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-discharge-followup-reco/index.tsx | EmrAiDischargeFollowupRecoPage | 真实数据 | /api/v1/emr-ai-discharge-followup-reco；路由含硬编码 demo records | 131行 |

### emr-ai-discharge-med-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-discharge-med-reco/index.tsx | EmrAiDischargeMedRecoPage | 真实数据 | /api/v1/emr-ai-discharge-med-reco；路由含硬编码 demo records | 133行 |

### emr-ai-discharge-summary/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-discharge-summary/index.tsx | EmrAiDischargeSummaryPage | 真实数据 | /api/v1/emr-ai-discharge-summary；路由含硬编码 demo records | 130行 |

### emr-ai-discharge-summary-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-discharge-summary-gen/index.tsx | EmrAiDischargeSummaryGenPage | 真实数据 | /api/v1/emr-ai-discharge-summary-gen；路由含硬编码 demo records | 131行 |

### emr-ai-drg-group-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-drg-group-predict/index.tsx | EmrAiDrgGroupPredictPage | 真实数据 | /api/v1/emr-ai-drg-group-predict；路由含硬编码 demo records | 136行 |

### emr-ai-drg-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-drg-predict/index.tsx | EmrAiDrgPredictPage | 真实数据 | /api/v1/emr-ai-drg-predict；路由含硬编码 demo records | 137行 |

### emr-ai-drug-interaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-drug-interaction/index.tsx | EmrAiDrugInteractionPage | 真实数据 | /api/v1/emr-ai-drug-interaction；路由含硬编码 demo records | 146行 |

### emr-ai-drug-interaction-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-drug-interaction-detail/index.tsx | EmrAiDrugInteractionDetailPage | 真实数据 | /api/v1/emr-ai-drug-interaction-detail；路由含硬编码 demo records | 128行 |

### emr-ai-dx-coding/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-dx-coding/index.tsx | EmrAiDxCodingPage | 真实数据 | /api/v1/emr-ai-dx-coding；路由含硬编码 demo records | 124行 |

### emr-ai-emergency-obs-note-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-emergency-obs-note-gen/index.tsx | EmrAiEmergencyObsNoteGenPage | 真实数据 | /api/v1/emr-ai-emergency-obs-note-gen；路由含硬编码 demo records | 126行 |

### emr-ai-emergency-triage-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-emergency-triage-reco/index.tsx | EmrAiEmergencyTriageRecoPage | 真实数据 | /api/v1/emr-ai-emergency-triage-reco；路由含硬编码 demo records | 129行 |

### emr-ai-enteral-nutrition-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-enteral-nutrition-suggest/index.tsx | EmrAiEnteralNutritionSuggestPage | 真实数据 | /api/v1/emr-ai-enteral-nutrition-suggest；路由含硬编码 demo records | 134行 |

### emr-ai-exam-apply-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-exam-apply-reco/index.tsx | EmrAiExamApplyRecoPage | 真实数据 | /api/v1/emr-ai-exam-apply-reco；路由含硬编码 demo records | 128行 |

### emr-ai-exam-report-summary/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-exam-report-summary/index.tsx | EmrAiExamReportSummaryPage | 真实数据 | /api/v1/emr-ai-exam-report-summary；路由含硬编码 demo records | 125行 |

### emr-ai-fall-risk-assess/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-fall-risk-assess/index.tsx | EmrAiFallRiskAssessPage | 真实数据 | /api/v1/emr-ai-fall-risk-assess；路由含硬编码 demo records | 143行 |

### emr-ai-followup-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-followup-plan-reco/index.tsx | EmrAiFollowupPlanRecoPage | 真实数据 | /api/v1/emr-ai-followup-plan-reco；路由含硬编码 demo records | 136行 |

### emr-ai-followup-remind/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-followup-remind/index.tsx | EmrAiFollowupRemindPage | 真实数据 | /api/v1/emr-ai-followup-remind；路由含硬编码 demo records | 144行 |

### emr-ai-frontpage-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-frontpage-qc/index.tsx | EmrAiFrontpageQcPage | 真实数据 | /api/v1/emr-ai-frontpage-qc；路由含硬编码 demo records | 136行 |

### emr-ai-frontpage-qc-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-frontpage-qc-check/index.tsx | EmrAiFrontpageQcCheckPage | 真实数据 | /api/v1/emr-ai-frontpage-qc-check；路由含硬编码 demo records | 136行 |

### emr-ai-frontpage-smart-coding/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-frontpage-smart-coding/index.tsx | EmrAiFrontpageSmartCodingPage | 真实数据 | /api/v1/emr-ai-frontpage-smart-coding；路由含硬编码 demo records | 130行 |

### emr-ai-generation-assist/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-generation-assist/index.tsx | EmrAiGenerationAssistPage | 真实数据 | /api/v1/emr-ai-generation-assist；路由含硬编码 demo records | 126行 |

### emr-ai-hai-risk-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-hai-risk-alert/index.tsx | EmrAiHaiRiskAlertPage | 真实数据 | /api/v1/emr-ai-hai-risk-alert；路由含硬编码 demo records | 143行 |

### emr-ai-icd-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-icd-reco/index.tsx | EmrAiIcdRecoPage | 真实数据 | /api/v1/emr-ai-icd-reco；路由含硬编码 demo records | 127行 |

### emr-ai-keyword/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-keyword/index.tsx | EmrAiKeywordPage | 真实数据 | /api/v1/emr-ai-keyword；路由含硬编码 demo records | 82行 |

### emr-ai-kgraph-reasoning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-kgraph-reasoning/index.tsx | EmrAiKGraphReasoningPage | 真实数据 | /api/v1/emr-ai-kgraph-reasoning；路由含硬编码 demo records | 133行 |

### emr-ai-knowledge-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-knowledge-reco/index.tsx | EmrAiKnowledgeRecoPage | 真实数据 | /api/v1/emr-ai-knowledge-reco；路由含硬编码 demo records | 137行 |

### emr-ai-lab-apply-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-lab-apply-audit/index.tsx | EmrAiLabApplyAuditPage | 真实数据 | /api/v1/emr-ai-lab-apply-audit；路由含硬编码 demo records | 131行 |

### emr-ai-lab-critical-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-lab-critical-alert/index.tsx | EmrAiLabCriticalAlertPage | 真实数据 | /api/v1/emr-ai-lab-critical-alert；路由含硬编码 demo records | 147行 |

### emr-ai-lab-interpret/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-lab-interpret/index.tsx | EmrAiLabInterpretPage | 真实数据 | /api/v1/emr-ai-lab-interpret；路由含硬编码 demo records | 147行 |

### emr-ai-lab-interpret-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-lab-interpret-detail/index.tsx | EmrAiLabInterpretDetailPage | 真实数据 | /api/v1/emr-ai-lab-interpret-detail；路由含硬编码 demo records | 164行 |

### emr-ai-med-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-med-reco/index.tsx | EmrAiMedRecoPage | 真实数据 | /api/v1/emr-ai-med-reco；路由含硬编码 demo records | 145行 |

### emr-ai-medication-consult-reply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-medication-consult-reply/index.tsx | EmrAiMedicationConsultReplyPage | 真实数据 | /api/v1/emr-ai-medication-consult-reply；路由含硬编码 demo records | 126行 |

### emr-ai-medication-error-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-medication-error-alert/index.tsx | EmrAiMedicationErrorAlertPage | 真实数据 | /api/v1/emr-ai-medication-error-alert；路由含硬编码 demo records | 137行 |

### emr-ai-nursing-note-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nursing-note-gen/index.tsx | EmrAiNursingNoteGenPage | 真实数据 | /api/v1/emr-ai-nursing-note-gen；路由含硬编码 demo records | 131行 |

### emr-ai-nursing-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nursing-plan-reco/index.tsx | EmrAiNursingPlanRecoPage | 真实数据 | /api/v1/emr-ai-nursing-plan-reco；路由含硬编码 demo records | 133行 |

### emr-ai-nursing-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nursing-reco/index.tsx | EmrAiNursingRecoPage | 真实数据 | /api/v1/emr-ai-nursing-reco；路由含硬编码 demo records | 150行 |

### emr-ai-nursing-risk-assess/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nursing-risk-assess/index.tsx | EmrAiNursingRiskAssessPage | 真实数据 | /api/v1/emr-ai-nursing-risk-assess；路由含硬编码 demo records | 143行 |

### emr-ai-nursing-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nursing-suggest/index.tsx | EmrAiNursingSuggestPage | 真实数据 | /api/v1/emr-ai-nursing-suggest；路由含硬编码 demo records | 150行 |

### emr-ai-nutrition-risk-screen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-nutrition-risk-screen/index.tsx | EmrAiNutritionRiskScreenPage | 真实数据 | /api/v1/emr-ai-nutrition-risk-screen；路由含硬编码 demo records | 134行 |

### emr-ai-op-coding/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-op-coding/index.tsx | EmrAiOpCodingPage | 真实数据 | /api/v1/emr-ai-op-coding；路由含硬编码 demo records | 124行 |

### emr-ai-op-record-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-op-record-qc/index.tsx | EmrAiOpRecordQcPage | 真实数据 | /api/v1/emr-ai-op-record-qc；路由含硬编码 demo records | 141行 |

### emr-ai-order-exec-track/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-order-exec-track/index.tsx | EmrAiOrderExecTrackPage | 真实数据 | /api/v1/emr-ai-order-exec-track；路由含硬编码 demo records | 139行 |

### emr-ai-order-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-order-reco/index.tsx | EmrAiOrderRecoPage | 真实数据 | /api/v1/emr-ai-order-reco；路由含硬编码 demo records | 130行 |

### emr-ai-order-smart-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-order-smart-review/index.tsx | EmrAiOrderSmartReviewPage | 真实数据 | /api/v1/emr-ai-order-smart-review；路由含硬编码 demo records | 131行 |

### emr-ai-outpatient-followup-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-outpatient-followup-reco/index.tsx | EmrAiOutpatientFollowupRecoPage | 真实数据 | /api/v1/emr-ai-outpatient-followup-reco；路由含硬编码 demo records | 128行 |

### emr-ai-outpatient-pre-triage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-outpatient-pre-triage/index.tsx | EmrAiOutpatientPreTriagePage | 真实数据 | /api/v1/emr-ai-outpatient-pre-triage；路由含硬编码 demo records | 128行 |

### emr-ai-outpatient-record-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-outpatient-record-gen/index.tsx | EmrAiOutpatientRecordGenPage | 真实数据 | /api/v1/emr-ai-outpatient-record-gen；路由含硬编码 demo records | 131行 |

### emr-ai-parenteral-nutrition-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-parenteral-nutrition-reco/index.tsx | EmrAiParenteralNutritionRecoPage | 真实数据 | /api/v1/emr-ai-parenteral-nutrition-reco；路由含硬编码 demo records | 128行 |

### emr-ai-pathway-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-pathway-reco/index.tsx | EmrAiPathwayRecoPage | 真实数据 | /api/v1/emr-ai-pathway-reco；路由含硬编码 demo records | 124行 |

### emr-ai-patient-edu/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-patient-edu/index.tsx | EmrAiPatientEduPage | 真实数据 | /api/v1/emr-ai-patient-edu；路由含硬编码 demo records | 115行 |

### emr-ai-postop-analgesia-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-postop-analgesia-reco/index.tsx | EmrAiPostopAnalgesiaRecoPage | 真实数据 | /api/v1/emr-ai-postop-analgesia-reco；路由含硬编码 demo records | 129行 |

### emr-ai-postop-progress-track/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-postop-progress-track/index.tsx | EmrAiPostopProgressTrackPage | 真实数据 | /api/v1/emr-ai-postop-progress-track；路由含硬编码 demo records | 134行 |

### emr-ai-pre-prescription-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-pre-prescription-review/index.tsx | EmrAiPrePrescriptionReviewPage | 真实数据 | /api/v1/emr-ai-pre-prescription-review；路由含硬编码 demo records | 131行 |

### emr-ai-preop-assess-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-preop-assess-reco/index.tsx | EmrAiPreopAssessRecoPage | 真实数据 | /api/v1/emr-ai-preop-assess-reco；路由含硬编码 demo records | 148行 |

### emr-ai-preop-assessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-preop-assessment/index.tsx | EmrAiPreopAssessmentPage | 真实数据 | /api/v1/emr-ai-preop-assessment；路由含硬编码 demo records | 137行 |

### emr-ai-preop-risk-assess/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-preop-risk-assess/index.tsx | EmrAiPreopRiskAssessPage | 真实数据 | /api/v1/emr-ai-preop-risk-assess；路由含硬编码 demo records | 141行 |

### emr-ai-prescription-rational-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-prescription-rational-audit/index.tsx | EmrAiPrescriptionRationalAuditPage | 真实数据 | /api/v1/emr-ai-prescription-rational-audit；路由含硬编码 demo records | 131行 |

### emr-ai-qc-annual-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-annual-report/index.tsx | EmrAiQcAnnualReportPage | 真实数据 | /api/v1/emr-ai-qc-annual-report；路由含硬编码 demo records | 162行 |

### emr-ai-qc-anomaly-monitor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-anomaly-monitor/index.tsx | EmrAiQcAnomalyMonitorPage | 真实数据 | /api/v1/emr-ai-qc-anomaly-monitor；路由含硬编码 demo records | 151行 |

### emr-ai-qc-monthly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-monthly-report/index.tsx | EmrAiQcMonthlyReportPage | 真实数据 | /api/v1/emr-ai-qc-monthly-report；路由含硬编码 demo records | 162行 |

### emr-ai-qc-quarterly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-quarterly-report/index.tsx | EmrAiQcQuarterlyReportPage | 真实数据 | /api/v1/emr-ai-qc-quarterly-report；路由含硬编码 demo records | 157行 |

### emr-ai-qc-realtime-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-realtime-alert/index.tsx | EmrAiQcRealtimeAlertPage | 真实数据 | /api/v1/emr-ai-qc-realtime-alert；路由含硬编码 demo records | 155行 |

### emr-ai-qc-risk-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-risk-score/index.tsx | EmrAiQcRiskScorePage | 真实数据 | /api/v1/emr-ai-qc-risk-score；路由含硬编码 demo records | 157行 |

### emr-ai-qc-trend-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-trend-forecast/index.tsx | EmrAiQcTrendForecastPage | 真实数据 | /api/v1/emr-ai-qc-trend-forecast；路由含硬编码 demo records | 161行 |

### emr-ai-qc-weekly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-qc-weekly-report/index.tsx | EmrAiQcWeeklyReportPage | 真实数据 | /api/v1/emr-ai-qc-weekly-report；路由含硬编码 demo records | 136行 |

### emr-ai-quality-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-quality-predict/index.tsx | EmrAiQualityPredictPage | 真实数据 | /api/v1/emr-ai-quality-predict；路由含硬编码 demo records | 135行 |

### emr-ai-rational-medication-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-rational-medication-audit/index.tsx | EmrAiRationalMedicationAuditPage | 真实数据 | /api/v1/emr-ai-rational-medication-audit；路由含硬编码 demo records | 141行 |

### emr-ai-record-completeness-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-completeness-check/index.tsx | EmrAiRecordCompletenessCheckPage | 真实数据 | /api/v1/emr-ai-record-completeness-check；路由含硬编码 demo records | 137行 |

### emr-ai-record-consistency-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-consistency-check/index.tsx | EmrAiRecordConsistencyCheckPage | 真实数据 | /api/v1/emr-ai-record-consistency-check；路由含硬编码 demo records | 133行 |

### emr-ai-record-defect-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-defect-alert/index.tsx | EmrAiRecordDefectAlertPage | 真实数据 | /api/v1/emr-ai-record-defect-alert；路由含硬编码 demo records | 142行 |

### emr-ai-record-homogeneity-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-homogeneity-compare/index.tsx | EmrAiRecordHomogeneityComparePage | 真实数据 | /api/v1/emr-ai-record-homogeneity-compare；路由含硬编码 demo records | 145行 |

### emr-ai-record-quality-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-quality-score/index.tsx | EmrAiRecordQualityScorePage | 真实数据 | /api/v1/emr-ai-record-quality-score；路由含硬编码 demo records | 135行 |

### emr-ai-record-utilization-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-record-utilization-analysis/index.tsx | EmrAiRecordUtilizationAnalysisPage | 真实数据 | /api/v1/emr-ai-record-utilization-analysis；路由含硬编码 demo records | 139行 |

### emr-ai-referral-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-referral-suggest/index.tsx | EmrAiReferralSuggestPage | 真实数据 | /api/v1/emr-ai-referral-suggest；路由含硬编码 demo records | 144行 |

### emr-ai-rehab-assess-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-rehab-assess-reco/index.tsx | EmrAiRehabAssessRecoPage | 真实数据 | /api/v1/emr-ai-rehab-assess-reco；路由含硬编码 demo records | 140行 |

### emr-ai-rehab-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-rehab-plan-reco/index.tsx | EmrAiRehabPlanRecoPage | 真实数据 | /api/v1/emr-ai-rehab-plan-reco；路由含硬编码 demo records | 138行 |

### emr-ai-risk-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-risk-predict/index.tsx | EmrAiRiskPredictPage | 真实数据 | /api/v1/emr-ai-risk-predict；路由含硬编码 demo records | 82行 |

### emr-ai-scoring/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-scoring/index.tsx | EmrAiScoringPage | 真实数据 | /api/v1/emr-ai-scoring；路由含硬编码 demo records | 158行 |

### emr-ai-settlement-list-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-settlement-list-qc/index.tsx | EmrAiSettlementListQcPage | 真实数据 | /api/v1/emr-ai-settlement-list-qc；路由含硬编码 demo records | 135行 |

### emr-ai-shift-report-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-shift-report-gen/index.tsx | EmrAiShiftReportGenPage | 真实数据 | /api/v1/emr-ai-shift-report-gen；路由含硬编码 demo records | 133行 |

### emr-ai-similar/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-similar/index.tsx | EmrAiSimilarPage | 真实数据 | /api/v1/emr-ai-similar；路由含硬编码 demo records | 91行 |

### emr-ai-special-population-med-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-special-population-med-reco/index.tsx | EmrAiSpecialPopulationMedRecoPage | 真实数据 | /api/v1/emr-ai-special-population-med-reco；路由含硬编码 demo records | 135行 |

### emr-ai-suggestion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-suggestion/index.tsx | EmrAiSuggestionPage | 真实数据 | /api/v1/emr-ai-suggestion；路由含硬编码 demo records | 129行 |

### emr-ai-summary/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-summary/index.tsx | EmrAiSummaryPage | 真实数据 | /api/v1/emr-ai-summary；路由含硬编码 demo records | 82行 |

### emr-ai-surgery-code-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-surgery-code-reco/index.tsx | EmrAiSurgeryCodeRecoPage | 真实数据 | /api/v1/emr-ai-surgery-code-reco；路由含硬编码 demo records | 127行 |

### emr-ai-surgery-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-surgery-plan-reco/index.tsx | EmrAiSurgeryPlanRecoPage | 真实数据 | /api/v1/emr-ai-surgery-plan-reco；路由含硬编码 demo records | 131行 |

### emr-ai-treatment-plan-reco/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-treatment-plan-reco/index.tsx | EmrAiTreatmentPlanRecoPage | 真实数据 | /api/v1/emr-ai-treatment-plan-reco；路由含硬编码 demo records | 138行 |

### emr-ai-writing-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-ai-writing-suggest/index.tsx | EmrAiWritingSuggestPage | 真实数据 | /api/v1/emr-ai-writing-suggest；路由含硬编码 demo records | 141行 |

### emr-alert-threshold/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-alert-threshold/index.tsx | EmrAlertThresholdPage | 真实数据 | /api/v1/emr-alert-threshold；路由含硬编码 demo records | 79行 |

### emr-allergy-history-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-allergy-history-nlp/index.tsx | EmrAllergyHistoryNlpPage | 真实数据 | /api/v1/emr-allergy-history-nlp；路由含硬编码 demo records | 138行 |

### emr-annual-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-annual-report/index.tsx | EmrAnnualReportPage | 真实数据 | /api/v1/emr-annual-report；路由含硬编码 demo records | 90行 |

### emr-archive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive/index.tsx | EmrArchivePage | 真实数据 | /api/v1/emr-archive；路由含硬编码 demo records | 108行 |

### emr-archive-appoint/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-appoint/index.tsx | EmrArchiveAppointPage | 真实数据 | /api/v1/emr-archive-appoint；路由含硬编码 demo records | 129行 |

### emr-archive-auto-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-auto-check/index.tsx | EmrArchiveAutoCheckPage | 真实数据 | /api/v1/emr-archive-auto-check；路由含硬编码 demo records | 143行 |

### emr-archive-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-check/index.tsx | EmrArchiveCheckPage | 真实数据 | /api/v1/emr-archive-check；路由含硬编码 demo records | 132行 |

### emr-archive-index/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-index/index.tsx | EmrArchiveIndexPage | 真实数据 | /api/v1/emr-archive-index；路由含硬编码 demo records | 133行 |

### emr-archive-integrity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-integrity/index.tsx | EmrArchiveIntegrityPage | 真实数据 | /api/v1/emr-archive-integrity；路由含硬编码 demo records | 137行 |

### emr-archive-rule/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-rule/index.tsx | EmrArchiveRulePage | 真实数据 | /api/v1/emr-archive-rule；路由含硬编码 demo records | 92行 |

### emr-archive-search/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-archive-search/index.tsx | EmrArchiveSearchPage | 真实数据 | /api/v1/emr-archive-search；路由含硬编码 demo records | 145行 |

### emr-benchmark/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-benchmark/index.tsx | EmrBenchmarkPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 86行 |

### emr-borrow/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-borrow/index.tsx | EmrBorrowPage | 真实数据 | /api/v1/emr-borrow；路由含硬编码 demo records | 123行 |

### emr-borrow-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-borrow-record/index.tsx | EmrBorrowRecordPage | 真实数据 | /api/v1/emr-borrow-record；路由含硬编码 demo records | 133行 |

### emr-borrow-register/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-borrow-register/index.tsx | EmrBorrowRegisterPage | 真实数据 | /api/v1/emr-borrow-register；路由含硬编码 demo records | 72行 |

### emr-chief-complaint-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-chief-complaint-nlp/index.tsx | EmrChiefComplaintNlpPage | 真实数据 | /api/v1/emr-chief-complaint-nlp；路由含硬编码 demo records | 134行 |

### emr-clinical-path-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-clinical-path-qc/index.tsx | EmrClinicalPathQcPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 93行 |

### emr-completeness-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-completeness-check/index.tsx | EmrCompletenessCheckPage | 真实数据 | /api/v1/emr-completeness-check；路由含硬编码 demo records | 103行 |

### emr-consistency-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-consistency-check/index.tsx | EmrConsistencyCheckPage | 真实数据 | /api/v1/emr-consistency-check；路由含硬编码 demo records | 90行 |

### emr-copy-request/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-copy-request/index.tsx | EmrCopyRequestPage | 真实数据 | /api/v1/emr-copy-request；路由含硬编码 demo records | 115行 |

### emr-copy-request-apply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-copy-request-apply/index.tsx | EmrCopyRequestApplyPage | 真实数据 | /api/v1/emr-copy-request-apply；路由含硬编码 demo records | 135行 |

### emr-copy-request-manage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-copy-request-manage/index.tsx | EmrCopyRequestManagePage | 真实数据 | /api/v1/emr-copy-request-manage；路由含硬编码 demo records | 138行 |

### emr-copy-trace/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-copy-trace/index.tsx | EmrCopyTracePage | 真实数据 | /api/v1/emr-copy-trace/demo001 | 73行 |

### emr-course-node/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-course-node/index.tsx | EmrCourseNodePage | 真实数据 | /api/v1/emr-course-node；路由含硬编码 demo records | 141行 |

### emr-data-dict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-data-dict/index.tsx | EmrDataDictPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 91行 |

### emr-data-export/ （1 页：OK 0 / SHELL 1 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-data-export/index.tsx | EmrDataExportPage | 空壳 | 无数据获取、无内置列表 | 70行 |

### emr-defect-classifier/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-defect-classifier/index.tsx | EmrDefectClassifierPage | 真实数据 | /api/v1/emr-defect-classifier；路由含硬编码 demo records | 78行 |

### emr-defect-closed-loop/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-defect-closed-loop/index.tsx | EmrDefectClosedLoopPage | 真实数据 | /api/v1/emr-defect-closed-loop；路由含硬编码 demo records | 150行 |

### emr-defect-feedback/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-defect-feedback/index.tsx | EmrDefectFeedbackPage | 真实数据 | /api/v1/emr-defect-feedback/demo001 | 85行 |

### emr-defect-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-defect-stats/index.tsx | EmrDefectStatsPage | 真实数据 | /api/v1/emr-defect-stats；路由含硬编码 demo records | 88行 |

### emr-deidentify-output/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-deidentify-output/index.tsx | EmrDeidentifyOutputPage | 真实数据 | /api/v1/emr-deidentify-output；路由含硬编码 demo records | 121行 |

### emr-dept-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-dept-compare/index.tsx | EmrDeptComparePage | 真实数据 | /api/v1/emr-dept-compare；路由含硬编码 demo records | 85行 |

### emr-dept-qc-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-dept-qc-report/index.tsx | EmrDeptQcReportPage | 真实数据 | /api/v1/emr-dept-qc-report；路由含硬编码 demo records | 80行 |

### emr-dept-self-check/ （1 页：OK 0 / SHELL 1 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-dept-self-check/index.tsx | EmrDeptSelfCheckPage | 空壳 | 无数据获取、无内置列表 | 66行 |

### emr-destroy-apply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-destroy-apply/index.tsx | EmrDestroyApplyPage | 真实数据 | /api/v1/emr-destroy-apply；路由含硬编码 demo records | 131行 |

### emr-destroy-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-destroy-record/index.tsx | EmrDestroyRecordPage | 真实数据 | /api/v1/emr-destroy-record；路由含硬编码 demo records | 71行 |

### emr-diagnosis-complete/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-diagnosis-complete/index.tsx | EmrDiagnosisCompletePage | 真实数据 | /api/v1/emr-diagnosis-complete；路由含硬编码 demo records | 132行 |

### emr-diagnosis-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-diagnosis-nlp/index.tsx | EmrDiagnosisNlpPage | 真实数据 | /api/v1/emr-diagnosis-nlp；路由含硬编码 demo records | 137行 |

### emr-dip-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-dip-predict/index.tsx | EmrDipPredictPage | 真实数据 | /api/v1/emr-dip-predict；路由含硬编码 demo records | 142行 |

### emr-discharge-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-discharge-qc/index.tsx | EmrDischargeQcPage | 真实数据 | /api/v1/emr-discharge-qc；路由含硬编码 demo records | 91行 |

### emr-draft-gen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-draft-gen/index.tsx | EmrDraftGenPage | 真实数据 | /api/v1/emr-draft-gen；路由含硬编码 demo records | 84行 |

### emr-drg-predict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-drg-predict/index.tsx | EmrDrgPredictPage | 真实数据 | /api/v1/emr-drg-predict；路由含硬编码 demo records | 135行 |

### emr-drg-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-drg-qc/index.tsx | EmrDrgQcPage | 真实数据 | /api/v1/emr-drg-qc；路由含硬编码 demo records | 94行 |

### emr-event-timeline/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-event-timeline/index.tsx | EmrEventTimelinePage | 真实数据 | /api/v1/emr-event-timeline；路由含硬编码 demo records | 133行 |

### emr-expert-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-expert-review/index.tsx | EmrExpertReviewPage | 真实数据 | /api/v1/emr-expert-review；路由含硬编码 demo records | 83行 |

### emr-export/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-export/index.tsx | EmrExportPage | 真实数据 | /api/v1/emr-export；路由含硬编码 demo records | 74行 |

### emr-external-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-external-audit/index.tsx | EmrExternalAuditPage | 真实数据 | /api/v1/emr-external-audit；路由含硬编码 demo records | 131行 |

### emr-final-qc-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-final-qc-score/index.tsx | EmrFinalQcScorePage | 真实数据 | /api/v1/emr-final-qc-score；路由含硬编码 demo records | 139行 |

### emr-fine-grained-auth/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-fine-grained-auth/index.tsx | EmrFineGrainedAuthPage | 真实数据 | /api/v1/emr-fine-grained-auth；路由含硬编码 demo records | 152行 |

### emr-front-page-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-front-page-qc/index.tsx | EmrFrontPageQcPage | 真实数据 | /api/v1/emr-front-page-qc；路由含硬编码 demo records | 105行 |

### emr-grade-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-grade-dashboard/index.tsx | EmrGradeDashboardPage | 真实数据 | /api/v1/emr-grade-dashboard；路由含硬编码 demo records | 87行 |

### emr-grade-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-grade-v5/report/index.tsx | EMRGradeV5Page | 真实数据 | /api/v1/emr-grade-v5/report；路由含硬编码 demo records | 108行 |

### emr-homepage-complete/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-homepage-complete/index.tsx | EmrHomepageCompletePage | 真实数据 | /api/v1/emr-homepage-complete；路由含硬编码 demo records | 137行 |

### emr-homepage-logic/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-homepage-logic/index.tsx | EmrHomepageLogicPage | 真实数据 | /api/v1/emr-homepage-logic；路由含硬编码 demo records | 153行 |

### emr-hpi-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-hpi-nlp/index.tsx | EmrHpiNlpPage | 真实数据 | /api/v1/emr-hpi-nlp；路由含硬编码 demo records | 139行 |

### emr-icd-coding/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-icd-coding/index.tsx | EmrIcdCodingPage | 真实数据 | /api/v1/emr-icd-coding；路由含硬编码 demo records | 84行 |

### emr-indicator-dict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-indicator-dict/index.tsx | EmrIndicatorDictPage | 真实数据 | /api/v1/emr-indicator-dict；路由含硬编码 demo records | 87行 |

### emr-intelligent-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-intelligent-v3/report/index.tsx | EMRIntelligentV3Page | 真实数据 | /api/v1/emr-intelligent-v3/report；路由含硬编码 demo records | 103行 |

### emr-intelligent-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-intelligent-v4/report/index.tsx | EMRIntelligentV4Page | 真实数据 | /api/v1/emr-intelligent-v4/report；路由含硬编码 demo records | 103行 |

### emr-intrinsic-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-intrinsic-qc/index.tsx | EmrIntrinsicQcPage | 真实数据 | /api/v1/emr-intrinsic-qc；路由含硬编码 demo records | 86行 |

### emr-lab-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-lab-alert/index.tsx | EmrLabAlertPage | 真实数据 | /api/v1/emr-lab-alert；路由含硬编码 demo records | 163行 |

### emr-lab-exam-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-lab-exam-nlp/index.tsx | EmrLabExamNlpPage | 真实数据 | /api/v1/emr-lab-exam-nlp；路由含硬编码 demo records | 134行 |

### emr-loan-return/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-loan-return/index.tsx | EmrLoanReturnPage | 真实数据 | /api/v1/emr-loan-return；路由含硬编码 demo records | 143行 |

### emr-logic-relation-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-logic-relation-check/index.tsx | EmrLogicRelationCheckPage | 真实数据 | /api/v1/emr-logic-relation-check；路由含硬编码 demo records | 92行 |

### emr-logic-validation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-logic-validation/index.tsx | EmrLogicValidationPage | 真实数据 | /api/v1/emr-logic-validation；路由含硬编码 demo records | 97行 |

### emr-masking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-masking/index.tsx | EmrMaskingPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### emr-medication-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-medication-nlp/index.tsx | EmrMedicationNlpPage | 真实数据 | /api/v1/emr-medication-nlp；路由含硬编码 demo records | 138行 |

### emr-medication-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-medication-review/index.tsx | EmrMedicationReviewPage | 真实数据 | /api/v1/emr-medication-review；路由含硬编码 demo records | 148行 |

### emr-monthly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-monthly-report/index.tsx | EmrMonthlyReportPage | 真实数据 | /api/v1/emr-monthly-report/2026-10 | 83行 |

### emr-nlp-correction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-correction/index.tsx | EmrNlpCorrectionPage | 真实数据 | /api/v1/emr-nlp-correction；路由含硬编码 demo records | 86行 |

### emr-nlp-deduplication/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-deduplication/index.tsx | EmrNlpDeduplicationPage | 真实数据 | /api/v1/emr-nlp-deduplication；路由含硬编码 demo records | 93行 |

### emr-nlp-entity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-entity/index.tsx | EmrNlpEntityPage | 真实数据 | /api/v1/emr-nlp-entity；路由含硬编码 demo records | 88行 |

### emr-nlp-entity-normalize/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-entity-normalize/index.tsx | EmrNlpEntityNormalizePage | 真实数据 | /api/v1/emr-nlp-entity-normalize；路由含硬编码 demo records | 142行 |

### emr-nlp-event/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-event/index.tsx | EmrNlpEventPage | 真实数据 | /api/v1/emr-nlp-event；路由含硬编码 demo records | 87行 |

### emr-nlp-negation-detect/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-negation-detect/index.tsx | EmrNlpNegationDetectPage | 真实数据 | /api/v1/emr-nlp-negation-detect；路由含硬编码 demo records | 136行 |

### emr-nlp-normalization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-normalization/index.tsx | EmrNlpNormalizationPage | 真实数据 | /api/v1/emr-nlp-normalization；路由含硬编码 demo records | 86行 |

### emr-nlp-relation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-relation/index.tsx | EmrNlpRelationPage | 真实数据 | /api/v1/emr-nlp-relation；路由含硬编码 demo records | 86行 |

### emr-nlp-similarity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-similarity/index.tsx | EmrNlpSimilarityPage | 真实数据 | /api/v1/emr-nlp-similarity；路由含硬编码 demo records | 86行 |

### emr-nlp-term-standardize/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-term-standardize/index.tsx | EmrNlpTermStandardizePage | 真实数据 | /api/v1/emr-nlp-term-standardize；路由含硬编码 demo records | 140行 |

### emr-nlp-time-relation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-time-relation/index.tsx | EmrNlpTimeRelationPage | 真实数据 | /api/v1/emr-nlp-time-relation；路由含硬编码 demo records | 139行 |

### emr-nlp-timeline/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-nlp-timeline/index.tsx | EmrNlpTimelinePage | 真实数据 | /api/v1/emr-nlp-timeline；路由含硬编码 demo records | 91行 |

### emr-normativity-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-normativity-check/index.tsx | EmrNormativityCheckPage | 真实数据 | /api/v1/emr-normativity-check；路由含硬编码 demo records | 88行 |

### emr-past-history-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-past-history-nlp/index.tsx | EmrPastHistoryNlpPage | 真实数据 | /api/v1/emr-past-history-nlp；路由含硬编码 demo records | 138行 |

### emr-pathway-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-pathway-check/index.tsx | EmrPathwayCheckPage | 真实数据 | /api/v1/emr-pathway-check；路由含硬编码 demo records | 147行 |

### emr-patient-360/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-patient-360/index.tsx | EmrPatient360Page | 真实数据 | /api/v1/emr-patient-360/demo001 | 97行 |

### emr-patient-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-patient-satisfaction/index.tsx | EmrPatientSatisfactionPage | 真实数据 | /api/v1/emr-patient-satisfaction；路由含硬编码 demo records | 86行 |

### emr-pdca/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-pdca/index.tsx | EmrPdcaPage | 真实数据 | /api/v1/emr-pdca；路由含硬编码 demo records | 84行 |

### emr-physical-exam-nlp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-physical-exam-nlp/index.tsx | EmrPhysicalExamNlpPage | 真实数据 | /api/v1/emr-physical-exam-nlp；路由含硬编码 demo records | 139行 |

### emr-print-layout/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-print-layout/index.tsx | EmrPrintLayoutPage | 真实数据 | /api/v1/emr-print-layout/render；路由含硬编码 demo records | 67行 |

### emr-print-spec/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-print-spec/index.tsx | EmrPrintSpecPage | 真实数据 | /api/v1/emr-print-spec；路由含硬编码 demo records | 84行 |

### emr-qc-ai-defect-classify/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-defect-classify/index.tsx | EmrQcAiDefectClassifyPage | 真实数据 | /api/v1/emr-qc-ai-defect-classify；路由含硬编码 demo records | 95行 |

### emr-qc-ai-defect-classify-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-defect-classify-detail/index.tsx | EmrQcAiDefectClassifyDetailPage | 真实数据 | /api/v1/emr-qc-ai-defect-classify-detail；路由含硬编码 demo records | 91行 |

### emr-qc-ai-qa/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-qa/index.tsx | EmrQcAiQaPage | 真实数据 | /api/v1/emr-qc-ai-qa；路由含硬编码 demo records | 93行 |

### emr-qc-ai-qa-assistant/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-qa-assistant/index.tsx | EmrQcAiQaAssistantPage | 真实数据 | /api/v1/emr-qc-ai-qa-assistant；路由含硬编码 demo records | 108行 |

### emr-qc-ai-similar-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-similar-record/index.tsx | EmrQcAiSimilarRecordPage | 真实数据 | /api/v1/emr-qc-ai-similar-record；路由含硬编码 demo records | 77行 |

### emr-qc-ai-similar-record-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-similar-record-detail/index.tsx | EmrQcAiSimilarRecordDetailPage | 真实数据 | /api/v1/emr-qc-ai-similar-record-detail；路由含硬编码 demo records | 106行 |

### emr-qc-ai-writing-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-writing-suggest/index.tsx | EmrQcAiWritingSuggestPage | 真实数据 | /api/v1/emr-qc-ai-writing-suggest；路由含硬编码 demo records | 98行 |

### emr-qc-ai-writing-suggest-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ai-writing-suggest-detail/index.tsx | EmrQcAiWritingSuggestDetailPage | 真实数据 | /api/v1/emr-qc-ai-writing-suggest-detail；路由含硬编码 demo records | 99行 |

### emr-qc-alert-threshold/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-alert-threshold/index.tsx | EmrQcAlertThresholdPage | 真实数据 | /api/v1/emr-qc-alert-threshold；路由含硬编码 demo records | 116行 |

### emr-qc-anesthesia-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-anesthesia-rules/index.tsx | EmrQcAnesthesiaRulesPage | 真实数据 | /api/v1/emr-qc-anesthesia-rules；路由含硬编码 demo records | 129行 |

### emr-qc-annual-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-annual-report/index.tsx | EmrQcAnnualReportPage | 真实数据 | /api/v1/emr-qc-annual-report；路由含硬编码 demo records | 82行 |

### emr-qc-annual-summary-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-annual-summary-report/index.tsx | EmrQcAnnualSummaryReportPage | 真实数据 | /api/v1/emr-qc-annual-summary-report；路由含硬编码 demo records | 92行 |

### emr-qc-antibiotic-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-antibiotic-link/index.tsx | EmrQcAntibioticLinkPage | 真实数据 | /api/v1/emr-qc-antibiotic-link；路由含硬编码 demo records | 133行 |

### emr-qc-audit-log/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-audit-log/index.tsx | EmrQcAuditLogPage | 真实数据 | /api/v1/emr-qc-audit-log；路由含硬编码 demo records | 86行 |

### emr-qc-audit-log-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-audit-log-detail/index.tsx | EmrQcAuditLogDetailPage | 真实数据 | /api/v1/emr-qc-audit-log-detail；路由含硬编码 demo records | 81行 |

### emr-qc-audit-log-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-audit-log-record/index.tsx | EmrQcAuditLogRecordPage | 真实数据 | /api/v1/emr-qc-audit-log-record；路由含硬编码 demo records | 88行 |

### emr-qc-auto-archive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-auto-archive/index.tsx | EmrQcAutoArchivePage | 真实数据 | /api/v1/emr-qc-auto-archive；路由含硬编码 demo records | 141行 |

### emr-qc-auto-dispatch/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-auto-dispatch/index.tsx | EmrQcAutoDispatchPage | 真实数据 | /api/v1/emr-qc-auto-dispatch；路由含硬编码 demo records | 134行 |

### emr-qc-benchmarking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-benchmarking/index.tsx | EmrQcBenchmarkingPage | 真实数据 | /api/v1/emr-qc-benchmarking；路由含硬编码 demo records | 87行 |

### emr-qc-best-practice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-best-practice/index.tsx | EmrQcBestPracticePage | 真实数据 | /api/v1/emr-qc-best-practice；路由含硬编码 demo records | 149行 |

### emr-qc-clinical-pathway-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-clinical-pathway-link/index.tsx | EmrQcClinicalPathwayLinkPage | 真实数据 | /api/v1/emr-qc-clinical-pathway-link；路由含硬编码 demo records | 134行 |

### emr-qc-complaint-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-complaint-link/index.tsx | EmrQcComplaintLinkPage | 真实数据 | /api/v1/emr-qc-complaint-link；路由含硬编码 demo records | 134行 |

### emr-qc-comprehensive-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-comprehensive-dashboard/index.tsx | EmrQcComprehensiveDashboardPage | 真实数据 | /api/v1/emr-qc-comprehensive-dashboard；路由含硬编码 demo records | 146行 |

### emr-qc-confidence/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-confidence/index.tsx | EmrQcConfidencePage | 真实数据 | /api/v1/emr-qc-confidence；路由含硬编码 demo records | 84行 |

### emr-qc-config/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-config/index.tsx | EmrQcConfigPage | 真实数据 | /api/v1/emr-qc-config；路由含硬编码 demo records | 101行 |

### emr-qc-consult-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-consult-link/index.tsx | EmrQcConsultLinkPage | 真实数据 | /api/v1/emr-qc-consult-link；路由含硬编码 demo records | 134行 |

### emr-qc-continuous-improve/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-continuous-improve/index.tsx | EmrQcContinuousImprovePage | 真实数据 | /api/v1/emr-qc-continuous-improve；路由含硬编码 demo records | 73行 |

### emr-qc-critical-value-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-critical-value-link/index.tsx | EmrQcCriticalValueLinkPage | 真实数据 | /api/v1/emr-qc-critical-value-link；路由含硬编码 demo records | 134行 |

### emr-qc-daily-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-daily-report/index.tsx | EmrQcDailyReportPage | 真实数据 | /api/v1/emr-qc-daily-report；路由含硬编码 demo records | 79行 |

### emr-qc-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dashboard/index.tsx | EmrQcDashboardPage | 真实数据 | /api/v1/emr-qc-dashboard；路由含硬编码 demo records | 87行 |

### emr-qc-data-dict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-data-dict/index.tsx | EmrQcDataDictPage | 真实数据 | /api/v1/emr-qc-data-dict；路由含硬编码 demo records | 95行 |

### emr-qc-data-dict-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-data-dict-detail/index.tsx | EmrQcDataDictDetailPage | 真实数据 | /api/v1/emr-qc-data-dict-detail；路由含硬编码 demo records | 117行 |

### emr-qc-defect-auto-route/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-defect-auto-route/index.tsx | EmrQcDefectAutoRoutePage | 真实数据 | /api/v1/emr-qc-defect-auto-route；路由含硬编码 demo records | 134行 |

### emr-qc-defect-case-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-defect-case-library/index.tsx | EmrQcDefectCaseLibraryPage | 真实数据 | /api/v1/emr-qc-defect-case-library；路由含硬编码 demo records | 149行 |

### emr-qc-defect-stat/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-defect-stat/index.tsx | EmrQcDefectStatPage | 真实数据 | /api/v1/emr-qc-defect-stat；路由含硬编码 demo records | 82行 |

### emr-qc-defect-trend-chart/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-defect-trend-chart/index.tsx | EmrQcDefectTrendChartPage | 真实数据 | /api/v1/emr-qc-defect-trend-chart；路由含硬编码 demo records | 82行 |

### emr-qc-dentistry-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dentistry-rules/index.tsx | EmrQcDentistryRulesPage | 真实数据 | /api/v1/emr-qc-dentistry-rules；路由含硬编码 demo records | 129行 |

### emr-qc-dept-assess-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-assess-score/index.tsx | EmrQcDeptAssessScorePage | 真实数据 | /api/v1/emr-qc-dept-assess-score；路由含硬编码 demo records | 92行 |

### emr-qc-dept-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-compare/index.tsx | EmrQcDeptComparePage | 真实数据 | /api/v1/emr-qc-dept-compare；路由含硬编码 demo records | 86行 |

### emr-qc-dept-compare-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-compare-analysis/index.tsx | EmrQcDeptCompareAnalysisPage | 真实数据 | /api/v1/emr-qc-dept-compare-analysis；路由含硬编码 demo records | 84行 |

### emr-qc-dept-dashboard/ （1 页：OK 0 / SHELL 0 / RISK 1）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-dashboard/index.tsx | EmrQcDeptDashboardPage | 崩溃风险 | 空值状态未保护访问: dashboard.dept；API /api/v1/emr-qc-dept-dashboard | 81行 |

### emr-qc-dept-improve-suggest/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-improve-suggest/index.tsx | EmrQcDeptImproveSuggestPage | 真实数据 | /api/v1/emr-qc-dept-improve-suggest；路由含硬编码 demo records | 105行 |

### emr-qc-dept-monthly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-monthly-report/index.tsx | EmrQcDeptMonthlyReportPage | 真实数据 | /api/v1/emr-qc-dept-monthly-report；路由含硬编码 demo records | 168行 |

### emr-qc-dept-radar-chart/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-radar-chart/index.tsx | EmrQcDeptRadarChartPage | 真实数据 | /api/v1/emr-qc-dept-radar-chart；路由含硬编码 demo records | 89行 |

### emr-qc-dept-rank-list/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-rank-list/index.tsx | EmrQcDeptRankListPage | 真实数据 | /api/v1/emr-qc-dept-rank-list；路由含硬编码 demo records | 133行 |

### emr-qc-dept-ranking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-ranking/index.tsx | EmrQcDeptRankingPage | 真实数据 | /api/v1/emr-qc-dept-ranking；路由含硬编码 demo records | 76行 |

### emr-qc-dept-rectify/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-rectify/index.tsx | EmrQcDeptRectifyPage | 真实数据 | /api/v1/emr-qc-dept-rectify；路由含硬编码 demo records | 85行 |

### emr-qc-dept-trend-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dept-trend-analysis/index.tsx | EmrQcDeptTrendAnalysisPage | 真实数据 | /api/v1/emr-qc-dept-trend-analysis；路由含硬编码 demo records | 86行 |

### emr-qc-dermatology-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-dermatology-rules/index.tsx | EmrQcDermatologyRulesPage | 真实数据 | /api/v1/emr-qc-dermatology-rules；路由含硬编码 demo records | 129行 |

### emr-qc-director-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-director-score/index.tsx | EmrQcDirectorScorePage | 真实数据 | /api/v1/emr-qc-director-score；路由含硬编码 demo records | 80行 |

### emr-qc-discharge-summary-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-discharge-summary-link/index.tsx | EmrQcDischargeSummaryLinkPage | 真实数据 | /api/v1/emr-qc-discharge-summary-link；路由含硬编码 demo records | 133行 |

### emr-qc-doctor-profile/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-doctor-profile/index.tsx | EmrQcDoctorProfilePage | 真实数据 | /api/v1/emr-qc-doctor-profile；路由含硬编码 demo records | 164行 |

### emr-qc-doctor-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-doctor-score/index.tsx | EmrQcDoctorScorePage | 真实数据 | /api/v1/emr-qc-doctor-score；路由含硬编码 demo records | 80行 |

### emr-qc-emergency-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-emergency-rules/index.tsx | EmrQcEmergencyRulesPage | 真实数据 | /api/v1/emr-qc-emergency-rules；路由含硬编码 demo records | 129行 |

### emr-qc-ent-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ent-rules/index.tsx | EmrQcEntRulesPage | 真实数据 | /api/v1/emr-qc-ent-rules；路由含硬编码 demo records | 129行 |

### emr-qc-exam-certificate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-exam-certificate/index.tsx | EmrQcExamCertificatePage | 真实数据 | /api/v1/emr-qc-exam-certificate；路由含硬编码 demo records | 92行 |

### emr-qc-expert-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-expert-library/index.tsx | EmrQcExpertLibraryPage | 真实数据 | /api/v1/emr-qc-expert-library；路由含硬编码 demo records | 117行 |

### emr-qc-expert-online-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-expert-online-review/index.tsx | EmrQcExpertOnlineReviewPage | 真实数据 | /api/v1/emr-qc-expert-online-review；路由含硬编码 demo records | 98行 |

### emr-qc-expert-performance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-expert-performance/index.tsx | EmrQcExpertPerformancePage | 真实数据 | /api/v1/emr-qc-expert-performance；路由含硬编码 demo records | 97行 |

### emr-qc-expert-pool/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-expert-pool/index.tsx | EmrQcExpertPoolPage | 真实数据 | /api/v1/emr-qc-expert-pool；路由含硬编码 demo records | 85行 |

### emr-qc-export-csv/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-export-csv/index.tsx | EmrQcExportCsvPage | 真实数据 | /api/v1/emr-qc-export-csv；路由含硬编码 demo records | 87行 |

### emr-qc-export-excel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-export-excel/index.tsx | EmrQcExportExcelPage | 真实数据 | /api/v1/emr-qc-export-excel；路由含硬编码 demo records | 91行 |

### emr-qc-export-pdf/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-export-pdf/index.tsx | EmrQcExportPdfPage | 真实数据 | /api/v1/emr-qc-export-pdf；路由含硬编码 demo records | 87行 |

### emr-qc-export-region/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-export-region/index.tsx | EmrQcExportRegionPage | 真实数据 | /api/v1/emr-qc-export-region；路由含硬编码 demo records | 114行 |

### emr-qc-feedback-loop/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-feedback-loop/index.tsx | EmrQcFeedbackLoopPage | 真实数据 | /api/v1/emr-qc-feedback-loop；路由含硬编码 demo records | 100行 |

### emr-qc-grade/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-grade/index.tsx | EmrQcGradePage | 真实数据 | /api/v1/emr-qc-grade；路由含硬编码 demo records | 85行 |

### emr-qc-graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-graph/index.tsx | EmrQcGraphPage | 真实数据 | /api/v1/emr-qc-graph；路由含硬编码 demo records | 96行 |

### emr-qc-guideline-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-guideline-library/index.tsx | EmrQcGuidelineLibraryPage | 真实数据 | /api/v1/emr-qc-guideline-library；路由含硬编码 demo records | 79行 |

### emr-qc-homepage-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-homepage-link/index.tsx | EmrQcHomepageLinkPage | 真实数据 | /api/v1/emr-qc-homepage-link；路由含硬编码 demo records | 133行 |

### emr-qc-icu-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-icu-rules/index.tsx | EmrQcIcuRulesPage | 真实数据 | /api/v1/emr-qc-icu-rules；路由含硬编码 demo records | 129行 |

### emr-qc-internal-med-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-internal-med-rules/index.tsx | EmrQcInternalMedRulesPage | 真实数据 | /api/v1/emr-qc-internal-med-rules；路由含硬编码 demo records | 129行 |

### emr-qc-intervention/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-intervention/index.tsx | EmrQcInterventionPage | 真实数据 | /api/v1/emr-qc-intervention；路由含硬编码 demo records | 93行 |

### emr-qc-knowledge/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-knowledge/index.tsx | EmrQcKnowledgePage | 真实数据 | /api/v1/emr-qc-knowledge；路由含硬编码 demo records | 90行 |

### emr-qc-knowledge-node/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-knowledge-node/index.tsx | EmrQcKnowledgeNodePage | 真实数据 | /api/v1/emr-qc-knowledge-node；路由含硬编码 demo records | 83行 |

### emr-qc-knowledge-relation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-knowledge-relation/index.tsx | EmrQcKnowledgeRelationPage | 真实数据 | /api/v1/emr-qc-knowledge-relation；路由含硬编码 demo records | 85行 |

### emr-qc-lab-exam-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-lab-exam-link/index.tsx | EmrQcLabExamLinkPage | 真实数据 | /api/v1/emr-qc-lab-exam-link；路由含硬编码 demo records | 133行 |

### emr-qc-metric-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-alert/index.tsx | EmrQcMetricAlertPage | 真实数据 | /api/v1/emr-qc-metric-alert；路由含硬编码 demo records | 90行 |

### emr-qc-metric-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-analysis/index.tsx | EmrQcMetricAnalysisPage | 真实数据 | /api/v1/emr-qc-metric-analysis；路由含硬编码 demo records | 80行 |

### emr-qc-metric-benchmark/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-benchmark/index.tsx | EmrQcMetricBenchmarkPage | 真实数据 | /api/v1/emr-qc-metric-benchmark；路由含硬编码 demo records | 97行 |

### emr-qc-metric-calc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-calc/index.tsx | EmrQcMetricCalcPage | 真实数据 | /api/v1/emr-qc-metric-calc；路由含硬编码 demo records | 66行 |

### emr-qc-metric-collect/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-collect/index.tsx | EmrQcMetricCollectPage | 真实数据 | /api/v1/emr-qc-metric-collect；路由含硬编码 demo records | 105行 |

### emr-qc-metric-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-dashboard/index.tsx | EmrQcMetricDashboardPage | 真实数据 | /api/v1/emr-qc-metric-dashboard；路由含硬编码 demo records | 79行 |

### emr-qc-metric-drilldown/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-drilldown/index.tsx | EmrQcMetricDrilldownPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 87行 |

### emr-qc-metric-export/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-metric-export/index.tsx | EmrQcMetricExportPage | 真实数据 | /api/v1/emr-qc-metric-export；路由含硬编码 demo records | 67行 |

### emr-qc-mobile-approval/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-mobile-approval/index.tsx | EmrQcMobileApprovalPage | 真实数据 | /api/v1/emr-qc-mobile-approval；路由含硬编码 demo records | 142行 |

### emr-qc-mobile-notify/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-mobile-notify/index.tsx | EmrQcMobileNotifyPage | 真实数据 | /api/v1/emr-qc-mobile-notify；路由含硬编码 demo records | 133行 |

### emr-qc-mobile-rectify/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-mobile-rectify/index.tsx | EmrQcMobileRectifyPage | 真实数据 | /api/v1/emr-qc-mobile-rectify；路由含硬编码 demo records | 142行 |

### emr-qc-mobile-view/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-mobile-view/index.tsx | EmrQcMobileViewPage | 真实数据 | /api/v1/emr-qc-mobile-view；路由含硬编码 demo records | 121行 |

### emr-qc-monitor-board/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-monitor-board/index.tsx | EmrQcMonitorBoardPage | 真实数据 | /api/v1/emr-qc-monitor-board；路由含硬编码 demo records | 103行 |

### emr-qc-monthly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-monthly-report/index.tsx | EmrQcMonthlyReportPage | 真实数据 | /api/v1/emr-qc-monthly-report；路由含硬编码 demo records | 100行 |

### emr-qc-norm-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-norm-library/index.tsx | EmrQcNormLibraryPage | 真实数据 | /api/v1/emr-qc-norm-library；路由含硬编码 demo records | 117行 |

### emr-qc-notice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-notice/index.tsx | EmrQcNoticePage | 真实数据 | /api/v1/emr-qc-notice；路由含硬编码 demo records | 97行 |

### emr-qc-nurse-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-nurse-score/index.tsx | EmrQcNurseScorePage | 真实数据 | /api/v1/emr-qc-nurse-score；路由含硬编码 demo records | 80行 |

### emr-qc-nursing-assessment-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-nursing-assessment-link/index.tsx | EmrQcNursingAssessmentLinkPage | 真实数据 | /api/v1/emr-qc-nursing-assessment-link；路由含硬编码 demo records | 134行 |

### emr-qc-nursing-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-nursing-link/index.tsx | EmrQcNursingLinkPage | 真实数据 | /api/v1/emr-qc-nursing-link；路由含硬编码 demo records | 133行 |

### emr-qc-nutrition-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-nutrition-rules/index.tsx | EmrQcNutritionRulesPage | 真实数据 | /api/v1/emr-qc-nutrition-rules；路由含硬编码 demo records | 129行 |

### emr-qc-nutrition-screen-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-nutrition-screen-link/index.tsx | EmrQcNutritionScreenLinkPage | 真实数据 | /api/v1/emr-qc-nutrition-screen-link；路由含硬编码 demo records | 134行 |

### emr-qc-obgyn-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-obgyn-rules/index.tsx | EmrQcObgynRulesPage | 真实数据 | /api/v1/emr-qc-obgyn-rules；路由含硬编码 demo records | 129行 |

### emr-qc-online-exam/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-online-exam/index.tsx | EmrQcOnlineExamPage | 真实数据 | /api/v1/emr-qc-online-exam；路由含硬编码 demo records | 120行 |

### emr-qc-op-log/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-op-log/index.tsx | EmrQcOpLogPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 93行 |

### emr-qc-ophthalmology-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ophthalmology-rules/index.tsx | EmrQcOphthalmologyRulesPage | 真实数据 | /api/v1/emr-qc-ophthalmology-rules；路由含硬编码 demo records | 129行 |

### emr-qc-order-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-order-link/index.tsx | EmrQcOrderLinkPage | 真实数据 | /api/v1/emr-qc-order-link；路由含硬编码 demo records | 134行 |

### emr-qc-pain-assessment-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pain-assessment-link/index.tsx | EmrQcPainAssessmentLinkPage | 真实数据 | /api/v1/emr-qc-pain-assessment-link；路由含硬编码 demo records | 134行 |

### emr-qc-pain-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pain-rules/index.tsx | EmrQcPainRulesPage | 真实数据 | /api/v1/emr-qc-pain-rules；路由含硬编码 demo records | 129行 |

### emr-qc-pass-rate-stat/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pass-rate-stat/index.tsx | EmrQcPassRateStatPage | 真实数据 | /api/v1/emr-qc-pass-rate-stat；路由含硬编码 demo records | 85行 |

### emr-qc-pathology-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pathology-rules/index.tsx | EmrQcPathologyRulesPage | 真实数据 | /api/v1/emr-qc-pathology-rules；路由含硬编码 demo records | 129行 |

### emr-qc-patient-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-patient-satisfaction/index.tsx | EmrQcPatientSatisfactionPage | 真实数据 | /api/v1/emr-qc-patient-satisfaction；路由含硬编码 demo records | 155行 |

### emr-qc-pdca-auto-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pdca-auto-report/index.tsx | EmrQcPdcaReportAutoPage | 真实数据 | /api/v1/emr-qc-pdca-auto-report；路由含硬编码 demo records | 157行 |

### emr-qc-pdca-plan/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pdca-plan/index.tsx | EmrQcPdcaPlanPage | 真实数据 | /api/v1/emr-qc-pdca-plan；路由含硬编码 demo records | 109行 |

### emr-qc-pdca-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pdca-report/index.tsx | EmrQcPdcaReportPage | 真实数据 | /api/v1/emr-qc-pdca-report；路由含硬编码 demo records | 88行 |

### emr-qc-pediatrics-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pediatrics-rules/index.tsx | EmrQcPediatricsRulesPage | 真实数据 | /api/v1/emr-qc-pediatrics-rules；路由含硬编码 demo records | 129行 |

### emr-qc-permission/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-permission/index.tsx | EmrQcPermissionPage | 真实数据 | /api/v1/emr-qc-permission；路由含硬编码 demo records | 83行 |

### emr-qc-permission-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-permission-detail/index.tsx | EmrQcPermissionDetailPage | 真实数据 | /api/v1/emr-qc-permission-detail；路由含硬编码 demo records | 123行 |

### emr-qc-permission-manage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-permission-manage/index.tsx | EmrQcPermissionManagePage | 真实数据 | /api/v1/emr-qc-permission-manage；路由含硬编码 demo records | 76行 |

### emr-qc-personal-profile/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-personal-profile/index.tsx | EmrQcPersonalProfilePage | 真实数据 | /api/v1/emr-qc-personal-profile；路由含硬编码 demo records | 165行 |

### emr-qc-policy-query/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-policy-query/index.tsx | EmrQcPolicyQueryPage | 真实数据 | /api/v1/emr-qc-policy-query；路由含硬编码 demo records | 78行 |

### emr-qc-pressure-ulcer-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-pressure-ulcer-link/index.tsx | EmrQcPressureUlcerLinkPage | 真实数据 | /api/v1/emr-qc-pressure-ulcer-link；路由含硬编码 demo records | 134行 |

### emr-qc-quality-project/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-quality-project/index.tsx | EmrQcQualityProjectPage | 真实数据 | /api/v1/emr-qc-quality-project；路由含硬编码 demo records | 127行 |

### emr-qc-quarterly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-quarterly-report/index.tsx | EmrQcQuarterlyReportPage | 真实数据 | /api/v1/emr-qc-quarterly-report；路由含硬编码 demo records | 82行 |

### emr-qc-ranking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ranking/index.tsx | EmrQcRankingPage | 真实数据 | /api/v1/emr-qc-ranking；路由含硬编码 demo records | 74行 |

### emr-qc-ranking-board/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-ranking-board/index.tsx | EmrQcRankingBoardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 85行 |

### emr-qc-reasoning-path/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-reasoning-path/index.tsx | EmrQcReasoningPathPage | 真实数据 | /api/v1/emr-qc-reasoning-path；路由含硬编码 demo records | 76行 |

### emr-qc-rectification-notice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rectification-notice/index.tsx | EmrQcRectificationNoticePage | 真实数据 | /api/v1/emr-qc-rectification-notice；路由含硬编码 demo records | 173行 |

### emr-qc-rectification-tracking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rectification-tracking/index.tsx | EmrQcRectificationTrackingPage | 真实数据 | /api/v1/emr-qc-rectification-tracking；路由含硬编码 demo records | 133行 |

### emr-qc-rectify-verify/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rectify-verify/index.tsx | EmrQcRectifyVerifyPage | 真实数据 | /api/v1/emr-qc-rectify-verify；路由含硬编码 demo records | 106行 |

### emr-qc-recurrence/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-recurrence/index.tsx | EmrQcRecurrencePage | 真实数据 | /api/v1/emr-qc-recurrence；路由含硬编码 demo records | 83行 |

### emr-qc-regulation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-regulation/index.tsx | EmrQcRegulationPage | 真实数据 | /api/v1/emr-qc-regulation；路由含硬编码 demo records | 87行 |

### emr-qc-rehab-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rehab-rules/index.tsx | EmrQcRehabRulesPage | 真实数据 | /api/v1/emr-qc-rehab-rules；路由含硬编码 demo records | 129行 |

### emr-qc-report-center/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-report-center/index.tsx | EmrQcReportCenterPage | 真实数据 | /api/v1/emr-qc-report-center；路由含硬编码 demo records | 102行 |

### emr-qc-review-summary/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-review-summary/index.tsx | EmrQcReviewSummaryPage | 真实数据 | /api/v1/emr-qc-review-summary；路由含硬编码 demo records | 91行 |

### emr-qc-risk-level/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-risk-level/index.tsx | EmrQcRiskLevelPage | 真实数据 | /api/v1/emr-qc-risk-level；路由含硬编码 demo records | 80行 |

### emr-qc-rule-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rule-compare/index.tsx | EmrQcRuleComparePage | 真实数据 | /api/v1/emr-qc-rule-compare；路由含硬编码 demo records | 163行 |

### emr-qc-rule-editor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rule-editor/index.tsx | EmrQcRuleEditorPage | 真实数据 | /api/v1/emr-qc-rule-editor；路由含硬编码 demo records | 147行 |

### emr-qc-rule-recommendation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rule-recommendation/index.tsx | EmrQcRuleRecommendationPage | 真实数据 | /api/v1/emr-qc-rule-recommendation；路由含硬编码 demo records | 126行 |

### emr-qc-rule-simulator/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rule-simulator/index.tsx | EmrQcRuleSimulatorPage | 真实数据 | /api/v1/emr-qc-rule-simulator；路由含硬编码 demo records | 131行 |

### emr-qc-rule-version/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-rule-version/index.tsx | EmrQcRuleVersionPage | 真实数据 | /api/v1/emr-qc-rule-version；路由含硬编码 demo records | 149行 |

### emr-qc-score-calc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-score-calc/index.tsx | EmrQcScoreCalcPage | 真实数据 | /api/v1/emr-qc-score-calc；路由含硬编码 demo records | 82行 |

### emr-qc-score-history/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-score-history/index.tsx | EmrQcScoreHistoryPage | 真实数据 | /api/v1/emr-qc-score-history；路由含硬编码 demo records | 93行 |

### emr-qc-score-model/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-score-model/index.tsx | EmrQcScoreModelPage | 真实数据 | /api/v1/emr-qc-score-model；路由含硬编码 demo records | 77行 |

### emr-qc-score-rule/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-score-rule/index.tsx | EmrQcScoreRulePage | 真实数据 | /api/v1/emr-qc-score-rule；路由含硬编码 demo records | 82行 |

### emr-qc-score-suggestion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-score-suggestion/index.tsx | EmrQcScoreSuggestionPage | 真实数据 | /api/v1/emr-qc-score-suggestion；路由含硬编码 demo records | 91行 |

### emr-qc-signature-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-signature-link/index.tsx | EmrQcSignatureLinkPage | 真实数据 | /api/v1/emr-qc-signature-link；路由含硬编码 demo records | 134行 |

### emr-qc-staff-ranking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-staff-ranking/index.tsx | EmrQcStaffRankingPage | 真实数据 | /api/v1/emr-qc-staff-ranking；路由含硬编码 demo records | 76行 |

### emr-qc-standard-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-standard-library/index.tsx | EmrQcStandardLibraryPage | 真实数据 | /api/v1/emr-qc-standard-library；路由含硬编码 demo records | 149行 |

### emr-qc-stat-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-stat-dashboard/index.tsx | EmrQcStatDashboardPage | 真实数据 | /api/v1/emr-qc-stat-dashboard；路由含硬编码 demo records | 88行 |

### emr-qc-surgery-auth-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-surgery-auth-link/index.tsx | EmrQcSurgeryAuthLinkPage | 真实数据 | /api/v1/emr-qc-surgery-auth-link；路由含硬编码 demo records | 134行 |

### emr-qc-surgery-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-surgery-link/index.tsx | EmrQcSurgeryLinkPage | 真实数据 | /api/v1/emr-qc-surgery-link；路由含硬编码 demo records | 134行 |

### emr-qc-surgery-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-surgery-rules/index.tsx | EmrQcSurgeryRulesPage | 真实数据 | /api/v1/emr-qc-surgery-rules；路由含硬编码 demo records | 129行 |

### emr-qc-sys-param/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-sys-param/index.tsx | EmrQcSysParamPage | 真实数据 | /api/v1/emr-qc-sys-param；路由含硬编码 demo records | 112行 |

### emr-qc-sys-param-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-sys-param-detail/index.tsx | EmrQcSysParamDetailPage | 真实数据 | /api/v1/emr-qc-sys-param-detail；路由含硬编码 demo records | 117行 |

### emr-qc-task-archive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-task-archive/index.tsx | EmrQcTaskArchivePage | 真实数据 | /api/v1/emr-qc-task-archive；路由含硬编码 demo records | 84行 |

### emr-qc-task-dispatch/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-task-dispatch/index.tsx | EmrQcTaskDispatchPage | 真实数据 | /api/v1/emr-qc-task-dispatch；路由含硬编码 demo records | 91行 |

### emr-qc-task-receive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-task-receive/index.tsx | EmrQcTaskReceivePage | 真实数据 | /api/v1/emr-qc-task-receive；路由含硬编码 demo records | 83行 |

### emr-qc-task-return/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-task-return/index.tsx | EmrQcTaskReturnPage | 真实数据 | /api/v1/emr-qc-task-return；路由含硬编码 demo records | 80行 |

### emr-qc-tcm-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-tcm-rules/index.tsx | EmrQcTcmRulesPage | 真实数据 | /api/v1/emr-qc-tcm-rules；路由含硬编码 demo records | 129行 |

### emr-qc-timeliness-stat/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-timeliness-stat/index.tsx | EmrQcTimelinessStatPage | 真实数据 | /api/v1/emr-qc-timeliness-stat；路由含硬编码 demo records | 81行 |

### emr-qc-training-course/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-training-course/index.tsx | EmrQcTrainingCoursePage | 真实数据 | /api/v1/emr-qc-training-course；路由含硬编码 demo records | 122行 |

### emr-qc-training-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-training-record/index.tsx | EmrQcTrainingRecordPage | 真实数据 | /api/v1/emr-qc-training-record；路由含硬编码 demo records | 86行 |

### emr-qc-transfer-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-transfer-link/index.tsx | EmrQcTransferLinkPage | 真实数据 | /api/v1/emr-qc-transfer-link；路由含硬编码 demo records | 133行 |

### emr-qc-transfusion-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-transfusion-link/index.tsx | EmrQcTransfusionLinkPage | 真实数据 | /api/v1/emr-qc-transfusion-link；路由含硬编码 demo records | 133行 |

### emr-qc-trend-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-trend-alert/index.tsx | EmrQcTrendAlertPage | 真实数据 | /api/v1/emr-qc-trend-alert；路由含硬编码 demo records | 79行 |

### emr-qc-trend-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-trend-analysis/index.tsx | EmrQcTrendAnalysisPage | 真实数据 | /api/v1/emr-qc-trend-analysis；路由含硬编码 demo records | 138行 |

### emr-qc-trend-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-trend-forecast/index.tsx | EmrQcTrendForecastPage | 真实数据 | /api/v1/emr-qc-trend-forecast；路由含硬编码 demo records | 84行 |

### emr-qc-vte-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-vte-link/index.tsx | EmrQcVteLinkPage | 真实数据 | /api/v1/emr-qc-vte-link；路由含硬编码 demo records | 135行 |

### emr-qc-weekly-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-weekly-report/index.tsx | EmrQcWeeklyReportPage | 真实数据 | /api/v1/emr-qc-weekly-report；路由含硬编码 demo records | 82行 |

### emr-qc-weight-config/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-weight-config/index.tsx | EmrQcWeightConfigPage | 真实数据 | /api/v1/emr-qc-weight-config；路由含硬编码 demo records | 87行 |

### emr-qc-workbench/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-workbench/index.tsx | EmrQcWorkbenchPage | 真实数据 | /api/v1/emr-qc-workbench；路由含硬编码 demo records | 119行 |

### emr-qc-workbench-desk/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-qc-workbench-desk/index.tsx | EmrQcWorkbenchDeskPage | 真实数据 | /api/v1/emr-qc-workbench-desk；路由含硬编码 demo records | 103行 |

### emr-quality-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-compare/index.tsx | EmrQualityComparePage | 真实数据 | /api/v1/emr-quality-compare；路由含硬编码 demo records | 135行 |

### emr-quality-improve/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-improve/index.tsx | EmrQualityImprovePage | 真实数据 | /api/v1/emr-quality-improve；路由含硬编码 demo records | 164行 |

### emr-quality-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-score/index.tsx | EmrQualityScorePage | 真实数据 | /api/v1/emr-quality-score；路由含硬编码 demo records | 88行 |

### emr-quality-score-comprehensive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-score-comprehensive/index.tsx | EmrQualityScoreComprehensivePage | 真实数据 | /api/v1/emr-quality-score-comprehensive；路由含硬编码 demo records | 148行 |

### emr-quality-score-summary/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-score-summary/index.tsx | EmrQualityScoreSummaryPage | 真实数据 | /api/v1/emr-quality-score-summary；路由含硬编码 demo records | 71行 |

### emr-quality-trend/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quality-trend/index.tsx | EmrQualityTrendPage | 真实数据 | /api/v1/emr-quality-trend；路由含硬编码 demo records | 126行 |

### emr-quick-phrase/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-quick-phrase/index.tsx | EmrQuickPhrasePage | 真实数据 | /api/v1/emr-quick-phrase；路由含硬编码 demo records | 139行 |

### emr-rating/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-rating/report/index.tsx | EMRRatingReportPage | 真实数据 | /api/v1/emr-rating/report；路由含硬编码 demo records | 104行 |

### emr-rating-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-rating-v3/report/index.tsx | EMRRatingV3Page | 真实数据 | /api/v1/emr-rating-v3/report；路由含硬编码 demo records | 107行 |

### emr-rectification-order/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-rectification-order/index.tsx | EmrRectificationOrderPage | 真实数据 | /api/v1/emr-rectification-order；路由含硬编码 demo records | 91行 |

### emr-retention-remind/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-retention-remind/index.tsx | EmrRetentionRemindPage | 真实数据 | /api/v1/emr-retention-remind；路由含硬编码 demo records | 138行 |

### emr-return-remind/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-return-remind/index.tsx | EmrReturnRemindPage | 真实数据 | /api/v1/emr-return-remind；路由含硬编码 demo records | 138行 |

### emr-review-workflow/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-review-workflow/index.tsx | EmrReviewWorkflowPage | 真实数据 | /api/v1/emr-review-workflow/transition；路由含硬编码 demo records | 83行 |

### emr-root-cause/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-root-cause/index.tsx | EmrRootCausePage | 真实数据 | /api/v1/emr-root-cause；路由含硬编码 demo records | 79行 |

### emr-rule-engine/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-rule-engine/index.tsx | EmrRuleEnginePage | 真实数据 | /api/v1/emr-rule-engine/execute；路由含硬编码 demo records | 74行 |

### emr-rule-version/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-rule-version/index.tsx | EmrRuleVersionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### emr-running-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-running-qc/index.tsx | EmrRunningQcPage | 真实数据 | /api/v1/emr-running-qc；路由含硬编码 demo records | 72行 |

### emr-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-satisfaction/index.tsx | EmrSatisfactionPage | 真实数据 | /api/v1/emr-satisfaction；路由含硬编码 demo records | 101行 |

### emr-seal-unseal/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-seal-unseal/index.tsx | EmrSealUnsealPage | 真实数据 | /api/v1/emr-seal-unseal；路由含硬编码 demo records | 86行 |

### emr-signature/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-signature/index.tsx | EmrSignaturePage | 真实数据 | /api/v1/emr-signature/demo001 | 112行 |

### emr-sla-monitor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-sla-monitor/index.tsx | EmrSlaMonitorPage | 真实数据 | /api/v1/emr-sla-monitor；路由含硬编码 demo records | 87行 |

### emr-smart-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-smart-report/index.tsx | EmrSmartReportPage | 真实数据 | /api/v1/emr-smart-report；路由含硬编码 demo records | 104行 |

### emr-stage-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-stage-qc/index.tsx | EmrStageQcPage | 真实数据 | /api/v1/emr-stage-qc；路由含硬编码 demo records | 92行 |

### emr-struct-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-struct-compare/index.tsx | EmrStructComparePage | 真实数据 | /api/v1/emr-struct-compare；路由含硬编码 demo records | 135行 |

### emr-struct-export/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-struct-export/index.tsx | EmrStructExportPage | 真实数据 | /api/v1/emr-struct-export；路由含硬编码 demo records | 136行 |

### emr-struct-query/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-struct-query/index.tsx | EmrStructQueryPage | 真实数据 | /api/v1/emr-struct-query；路由含硬编码 demo records | 158行 |

### emr-struct-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-struct-stats/index.tsx | EmrStructStatsPage | 真实数据 | /api/v1/emr-struct-stats；路由含硬编码 demo records | 132行 |

### emr-structured-input/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-structured-input/index.tsx | EmrStructuredInputPage | 真实数据 | /api/v1/emr-structured-input；路由含硬编码 demo records | 136行 |

### emr-template-admission-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-admission-detail/index.tsx | EmrTemplateAdmissionDetailPage | 真实数据 | /api/v1/emr-template-admission-detail；路由含硬编码 demo records | 131行 |

### emr-template-approval/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-approval/index.tsx | EmrTemplateApprovalPage | 真实数据 | /api/v1/emr-template-approval；路由含硬编码 demo records | 129行 |

### emr-template-clinical-path/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-clinical-path/index.tsx | EmrTemplateClinicalPathPage | 真实数据 | /api/v1/emr-template-clinical-path；路由含硬编码 demo records | 142行 |

### emr-template-dept-personal/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-dept-personal/index.tsx | EmrTemplateDeptPersonalPage | 真实数据 | /api/v1/emr-template-dept-personal；路由含硬编码 demo records | 141行 |

### emr-template-diff/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-diff/index.tsx | EmrTemplateDiffPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 79行 |

### emr-template-discharge-std/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-discharge-std/index.tsx | EmrTemplateDischargeStdPage | 真实数据 | /api/v1/emr-template-discharge-std；路由含硬编码 demo records | 144行 |

### emr-template-disease-recommend/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-disease-recommend/index.tsx | EmrTemplateDiseaseRecommendPage | 真实数据 | /api/v1/emr-template-disease-recommend；路由含硬编码 demo records | 138行 |

### emr-template-doctor-pref/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-doctor-pref/index.tsx | EmrTemplateDoctorPrefPage | 真实数据 | /api/v1/emr-template-doctor-pref；路由含硬编码 demo records | 143行 |

### emr-template-editor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-editor/index.tsx | EmrTemplateEditorPage | 真实数据 | /api/v1/emr-template-editor；路由含硬编码 demo records | 138行 |

### emr-template-effect-eval/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-effect-eval/index.tsx | EmrTemplateEffectEvalPage | 真实数据 | /api/v1/emr-template-effect-eval；路由含硬编码 demo records | 129行 |

### emr-template-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-management/index.tsx | EmrTemplateManagementPage | 真实数据 | /api/v1/emr-template | 253行 |

### emr-template-outpatient-library/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-outpatient-library/index.tsx | EmrTemplateOutpatientLibraryPage | 真实数据 | /api/v1/emr-template-outpatient-library；路由含硬编码 demo records | 142行 |

### emr-template-qc-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-qc-link/index.tsx | EmrTemplateQcLinkPage | 真实数据 | /api/v1/emr-template-qc-link；路由含硬编码 demo records | 82行 |

### emr-template-recommend/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-recommend/index.tsx | EmrTemplateRecommendPage | 真实数据 | /api/v1/emr-template-recommend；路由含硬编码 demo records | 140行 |

### emr-template-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-review/index.tsx | EmrTemplateReviewPage | 真实数据 | /api/v1/emr-template-review；路由含硬编码 demo records | 109行 |

### emr-template-surgery-spec/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-surgery-spec/index.tsx | EmrTemplateSurgerySpecPage | 真实数据 | /api/v1/emr-template-surgery-spec；路由含硬编码 demo records | 140行 |

### emr-template-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-usage/index.tsx | EmrTemplateUsagePage | 真实数据 | /api/v1/emr-template-usage；路由含硬编码 demo records | 72行 |

### emr-template-usage-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-usage-stats/index.tsx | EmrTemplateUsageStatsPage | 真实数据 | /api/v1/emr-template-usage-stats；路由含硬编码 demo records | 131行 |

### emr-template-version/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-version/index.tsx | EmrTemplateVersionPage | 真实数据 | /api/v1/emr-template-version；路由含硬编码 demo records | 133行 |

### emr-template-version-compare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-template-version-compare/index.tsx | EmrTemplateVersionComparePage | 真实数据 | /api/v1/emr-template-version-compare；路由含硬编码 demo records | 142行 |

### emr-term-dict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-term-dict/index.tsx | EmrTermDictPage | 真实数据 | /api/v1/emr-term-dict；路由含硬编码 demo records | 120行 |

### emr-terminal-qc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-terminal-qc/index.tsx | EmrTerminalQcPage | 真实数据 | /api/v1/emr-terminal-qc；路由含硬编码 demo records | 101行 |

### emr-terminology/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-terminology/index.tsx | EmrTerminologyPage | 真实数据 | /api/v1/emr-terminology；路由含硬编码 demo records | 93行 |

### emr-terminology-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-terminology-check/index.tsx | EmrTerminologyCheckPage | 真实数据 | /api/v1/emr-terminology-check；路由含硬编码 demo records | 85行 |

### emr-timeline-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-timeline-detail/index.tsx | EmrTimelineDetailPage | 真实数据 | /api/v1/emr-timeline-detail/demo001 | 91行 |

### emr-timeline-export/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-timeline-export/index.tsx | EmrTimelineExportPage | 真实数据 | /api/v1/emr-timeline-export；路由含硬编码 demo records | 146行 |

### emr-timeline-generate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-timeline-generate/index.tsx | EmrTimelineGeneratePage | 真实数据 | /api/v1/emr-timeline-generate；路由含硬编码 demo records | 137行 |

### emr-timeliness-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-timeliness-check/index.tsx | EmrTimelinessCheckPage | 真实数据 | /api/v1/emr-timeliness-check；路由含硬编码 demo records | 99行 |

### emr-timeliness-compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-timeliness-compliance/index.tsx | EmrTimelinessCompliancePage | 真实数据 | /api/v1/emr-timeliness-compliance；路由含硬编码 demo records | 99行 |

### emr-training/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-training/index.tsx | EmrTrainingPage | 真实数据 | /api/v1/emr-training/submit；路由含硬编码 demo records | 99行 |

### emr-trend-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-trend-forecast/index.tsx | EmrTrendForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 67行 |

### emr-warehouse-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-warehouse-check/index.tsx | EmrWarehouseCheckPage | 真实数据 | /api/v1/emr-warehouse-check；路由含硬编码 demo records | 143行 |

### emr-watermark-trace/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-watermark-trace/index.tsx | EmrWatermarkTracePage | 真实数据 | /api/v1/emr-watermark-trace；路由含硬编码 demo records | 118行 |

### emr-writing-standard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-writing-standard/index.tsx | EmrWritingStandardPage | 真实数据 | /api/v1/emr-writing-standard；路由含硬编码 demo records | 83行 |

### emr-writing-standard-check/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-writing-standard-check/index.tsx | EmrWritingStandardCheckPage | 真实数据 | /api/v1/emr-writing-standard-check；路由含硬编码 demo records | 85行 |

### emr-writing-time-limit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr-writing-time-limit/index.tsx | EmrWritingTimeLimitPage | 真实数据 | /api/v1/emr-writing-time-limit；路由含硬编码 demo records | 139行 |

### emr5-level/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emr5-level/index.tsx | Emr5LevelPage | 真实数据 | /api/v1/emr5-level；路由含硬编码 demo records | 83行 |

### emrGap/ （9 页：OK 9 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| emrGap/aiNursingPlan/index.tsx | AiNursingPlanPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 126行 |
| emrGap/aiQc/index.tsx | AiQcPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 116行 |
| emrGap/dischargeSummary/index.tsx | DischargeSummaryPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 210行 |
| emrGap/drugReview/index.tsx | DrugReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 109行 |
| emrGap/emrAssessment/index.tsx | EmrAssessmentPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 100行 |
| emrGap/level5/index.tsx | EmrLevel5Page | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 208行 |
| emrGap/pathwayVariance/index.tsx | PathwayVariancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 173行 |
| emrGap/terminalQc/index.tsx | TerminalQcPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 118行 |
| emrGap/timeliness/index.tsx | TimelinessPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 104行 |

### endocrinology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| endocrinology-v5/report/index.tsx | EndocrinologyV5Page | 真实数据 | /api/v1/endocrinology-v5/report；路由含硬编码 demo records | 107行 |

### endoscopy-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| endoscopy-mgmt/index.tsx | EndoscopyMgmtPage | 真实数据 | /api/v1/endoscopy-mgmt；路由含硬编码 demo records | 63行 |

### endoscopy-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| endoscopy-quality-mgmt/index.tsx | EndoscopyQualityMgmtPage | 真实数据 | /api/v1/endoscopy-quality-mgmt；路由含硬编码 demo records | 63行 |

### endoscopy-volume/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| endoscopy-volume/index.tsx | EndoscopyVolumePage | 真实数据 | /api/v1/endoscopy-volume；路由含硬编码 demo records | 63行 |

### energy-carbon/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| energy-carbon/index.tsx | EnergyCarbonPage | 真实数据 | /api/v1/energy-carbon；路由含硬编码 demo records | 54行 |

### energy-consumption/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| energy-consumption/index.tsx | EnergyConsumptionPage | 真实数据 | /api/v1/energy-consumption；路由含硬编码 demo records | 63行 |

### energy-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| energy-mgmt/index.tsx | EnergyMgmtPage | 真实数据 | /api/v1/energy-mgmt；路由含硬编码 demo records | 63行 |

### energy-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| energy-mgmt-detail/index.tsx | EnergyMgmtDetailPage | 真实数据 | /api/v1/energy-mgmt-detail；路由含硬编码 demo records | 63行 |

### energy-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| energy-quality-mgmt/index.tsx | EnergyQualityMgmtPage | 真实数据 | /api/v1/energy-quality-mgmt；路由含硬编码 demo records | 63行 |

### ent-eye-dental-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ent-eye-dental-v5/report/index.tsx | ENTEyeDentalV5Page | 真实数据 | /api/v1/ent-eye-dental-v5/report；路由含硬编码 demo records | 107行 |

### env-disinfection/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| env-disinfection/index.tsx | EnvDisinfectionPage | 真实数据 | /api/v1/env-disinfection；路由含硬编码 demo records | 51行 |

### environment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| environment/report/index.tsx | EnvironmentReportPage | 真实数据 | /api/v1/environment/report；路由含硬编码 demo records | 107行 |

### environment-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| environment-mgmt/index.tsx | EnvironmentMgmtPage | 真实数据 | /api/v1/environment-mgmt；路由含硬编码 demo records | 63行 |

### environmental-hygiene/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| environmental-hygiene/index.tsx | EnvironmentalHygienePage | 真实数据 | /api/v1/environmental-hygiene；路由含硬编码 demo records | 63行 |

### environmental-hygiene-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| environmental-hygiene-quality-mgmt/index.tsx | EnvironmentalHygieneQualityMgmtPage | 真实数据 | /api/v1/environmental-hygiene-quality-mgmt；路由含硬编码 demo records | 63行 |

### epidemic-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| epidemic-report/index.tsx | EpidemicReportPage | 真实数据 | /api/v1/epidemic-report；路由含硬编码 demo records | 63行 |

### equipment/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment/predictive/index.tsx | EquipmentPredictivePage | 真实数据 | /api/v1/equipment/predictive；路由含硬编码 demo records | 161行 |
| equipment/report-v2/index.tsx | EquipmentV2Page | 真实数据 | /api/v1/equipment/report-v2；路由含硬编码 demo records | 106行 |

### equipment-calibration-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-calibration-mgmt/index.tsx | EquipmentCalibrationMgmtPage | 真实数据 | /api/v1/equipment-calibration-mgmt；路由含硬编码 demo records | 63行 |

### equipment-disposal-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-disposal-mgmt/index.tsx | EquipmentDisposalMgmtPage | 真实数据 | /api/v1/equipment-disposal-mgmt；路由含硬编码 demo records | 63行 |

### equipment-maintenance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-maintenance/index.tsx | EquipmentMaintenancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 78行 |

### equipment-maintenance-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-maintenance-mgmt/index.tsx | EquipmentMaintenanceMgmtPage | 真实数据 | /api/v1/equipment-maintenance-mgmt；路由含硬编码 demo records | 63行 |

### equipment-maintenance-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-maintenance-stats/index.tsx | EquipmentMaintenanceStatsPage | 真实数据 | /api/v1/equipment-maintenance-stats；路由含硬编码 demo records | 63行 |

### equipment-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-mgmt/index.tsx | EquipmentMgmtPage | 真实数据 | /api/v1/equipment-mgmt；路由含硬编码 demo records | 63行 |

### equipment-ops-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-ops-overview/index.tsx | EquipmentOpsOverviewPage | 真实数据 | /api/v1/equipment-ops-overview；路由含硬编码 demo records | 63行 |

### equipment-supply-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-supply-v3/report/index.tsx | EquipmentSupplyV3Page | 真实数据 | /api/v1/equipment-supply-v3/report；路由含硬编码 demo records | 103行 |

### equipment-utilization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| equipment-utilization/index.tsx | EquipmentUtilizationPage | 真实数据 | /api/v1/equipment-utilization；路由含硬编码 demo records | 63行 |

### er-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| er-mgmt/index.tsx | ErMgmtPage | 真实数据 | /api/v1/er-mgmt；路由含硬编码 demo records | 63行 |

### erGreen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| erGreen/index.tsx | ErGreenPage | 真实数据 | /api/v1/er-green/overdue；路由含硬编码 demo records | 42行 |

### erTriage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| erTriage/index.tsx | ErTriagePage | 真实数据 | /api/v1/er-triage；路由含硬编码 demo records | 165行 |

### escalation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| escalation/index.tsx | EscalationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 53行 |

### esg-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| esg-v5/report/index.tsx | ESGV5Page | 真实数据 | /api/v1/esg-v5/report；路由含硬编码 demo records | 107行 |

### esignature/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| esignature/Sign/index.tsx | SignPage | 真实数据 | /api/v1/esignature/sign；路由含硬编码 demo records | 222行 |

### essential-drug/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| essential-drug/index.tsx | EssentialDrugPage | 真实数据 | /api/v1/essential-drug；路由含硬编码 demo records | 63行 |

### eventReview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| eventReview/index.tsx | EventReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 110行 |

### evidence-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| evidence-overview/index.tsx | EvidenceOverviewPage | 真实数据 | /api/v1/evidence-overview；路由含硬编码 demo records | 65行 |

### evidence-rules/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| evidence-rules/index.tsx | EvidenceRulesPage | 真实数据 | /api/v1/evidence-rules；路由含硬编码 demo records | 74行 |

### examination-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| examination-service/index.tsx | ExaminationServicePage | 真实数据 | /api/v1/examination-service；路由含硬编码 demo records | 63行 |

### exec-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| exec-dashboard/index.tsx | ExecDashboardPage | 真实数据 | /api/v1/exec-dashboard；路由含硬编码 demo records | 101行 |

### expense-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| expense-audit/index.tsx | ExpenseAuditPage | 真实数据 | /api/v1/expense-audit；路由含硬编码 demo records | 63行 |

### expense-structure/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| expense-structure/index.tsx | ExpenseStructurePage | 真实数据 | /api/v1/expense-structure；路由含硬编码 demo records | 63行 |

### experience-asset/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-asset/index.tsx | ExperienceAssetPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 67行 |

### experience-freshness/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-freshness/index.tsx | ExperienceFreshnessPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 72行 |

### experience-graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-graph/index.tsx | ExperienceGraphPage | 真实数据 | /api/v1/experience-graph；路由含硬编码 demo records | 55行 |

### experience-outcome/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-outcome/index.tsx | ExperienceOutcomePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### experience-patches/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-patches/index.tsx | ExperiencePatchesPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 70行 |

### experience-push/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-push/index.tsx | ExperiencePushPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 72行 |

### experience-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-review/index.tsx | ExperienceReviewPage | 真实数据 | /api/v1/experience-review；路由含硬编码 demo records | 84行 |

### experience-share/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-share/index.tsx | ExperienceSharePage | 真实数据 | /api/v1/experience-share；路由含硬编码 demo records | 51行 |

### experience-versions/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-versions/index.tsx | ExperienceVersionsPage | 真实数据 | /api/v1/experience/e-1/versions | 68行 |

### experience-wait-time/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| experience-wait-time/index.tsx | ExperienceWaitTimePage | 真实数据 | /api/v1/experience-wait-time；路由含硬编码 demo records | 63行 |

### failure-flywheel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| failure-flywheel/index.tsx | FailureFlywheelPage | 真实数据 | /api/v1/failure-flywheel；路由含硬编码 demo records | 54行 |

### failure-postmortem/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| failure-postmortem/index.tsx | FailurePostmortemPage | 真实数据 | /api/v1/failure/postmortem；路由含硬编码 demo records | 83行 |

### fall-incident/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fall-incident/index.tsx | FallIncidentPage | 真实数据 | /api/v1/fall-incident；路由含硬编码 demo records | 63行 |

### fall-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fall-mgmt/index.tsx | FallMgmtPage | 真实数据 | /api/v1/fall-mgmt；路由含硬编码 demo records | 63行 |

### fall-prevention/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fall-prevention/index.tsx | FallPreventionPage | 真实数据 | /api/v1/fall-prevention；路由含硬编码 demo records | 68行 |

### family-doctor-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| family-doctor-v5/report/index.tsx | FamilyDoctorV5Page | 真实数据 | /api/v1/family-doctor-v5/report；路由含硬编码 demo records | 107行 |

### family-planning-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| family-planning-mgmt/index.tsx | FamilyPlanningMgmtPage | 真实数据 | /api/v1/family-planning-mgmt；路由含硬编码 demo records | 63行 |

### federated/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| federated/Knowledge/index.tsx | FederatedKnowledgePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 200行 |

### federated-learning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| federated-learning/index.tsx | FederatedLearningPage | 真实数据 | /api/v1/federated-learning/metrics；路由含硬编码 demo records | 52行 |

### feedback/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| feedback/index.tsx | FeedbackPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### feedback-loop/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| feedback-loop/index.tsx | FeedbackLoopPage | 真实数据 | /api/v1/feedback-loop-dashboard；路由含硬编码 demo records | 67行 |

### feedback-loop-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| feedback-loop-overview/index.tsx | FeedbackLoopOverviewPage | 真实数据 | /api/v1/feedback-loop-overview；路由含硬编码 demo records | 72行 |

### feedback-trend/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| feedback-trend/index.tsx | FeedbackTrendPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 79行 |

### fhir-gateway/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fhir-gateway/index.tsx | FhirGatewayPage | 真实数据 | /api/v1/fhir-gateway；路由含硬编码 demo records | 52行 |

### finance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| finance/report-v2/index.tsx | FinanceMgmtV2Page | 真实数据 | /api/v1/finance/report-v2；路由含硬编码 demo records | 107行 |

### finance-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| finance-detail/index.tsx | FinanceDetailPage | 真实数据 | /api/v1/finance-detail；路由含硬编码 demo records | 63行 |

### finance-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| finance-mgmt/index.tsx | FinanceMgmtPage | 真实数据 | /api/v1/finance-mgmt；路由含硬编码 demo records | 63行 |

### finetune-loop/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| finetune-loop/index.tsx | FinetuneLoopPage | 真实数据 | /api/v1/finetune-loop/report；路由含硬编码 demo records | 54行 |

### fire-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fire-safety/index.tsx | FireSafetyPage | 真实数据 | /api/v1/fire-safety；路由含硬编码 demo records | 63行 |

### fire-safety-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fire-safety-detail/index.tsx | FireSafetyDetailPage | 真实数据 | /api/v1/fire-safety-detail；路由含硬编码 demo records | 63行 |

### fire-safety-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fire-safety-mgmt/index.tsx | FireSafetyMgmtPage | 真实数据 | /api/v1/fire-safety-mgmt；路由含硬编码 demo records | 63行 |

### fire-safety-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fire-safety-quality-mgmt/index.tsx | FireSafetyQualityMgmtPage | 真实数据 | /api/v1/fire-safety-quality-mgmt；路由含硬编码 demo records | 63行 |

### fire-security/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fire-security/report-v2/index.tsx | FireSecurityV2Page | 真实数据 | /api/v1/fire-security/report-v2；路由含硬编码 demo records | 107行 |

### fixed-asset-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| fixed-asset-quality-mgmt/index.tsx | FixedAssetQualityMgmtPage | 真实数据 | /api/v1/fixed-asset-quality-mgmt；路由含硬编码 demo records | 63行 |

### flywheel-drilldown/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-drilldown/index.tsx | FlywheelDrilldownPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### flywheel-health/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-health/index.tsx | FlywheelHealthPage | 真实数据 | /api/v1/flywheel-health；路由含硬编码 demo records | 76行 |

### flywheel-recommendation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-recommendation/index.tsx | FlywheelRecommendationPage | 真实数据 | /api/v1/flywheel-recommendation；路由含硬编码 demo records | 66行 |

### flywheel-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-score/index.tsx | FlywheelScorePage | 真实数据 | /api/v1/flywheel-score；路由含硬编码 demo records | 73行 |

### flywheel-tasks/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-tasks/index.tsx | FlywheelTasksPage | 真实数据 | /api/v1/flywheel-tasks；路由含硬编码 demo records | 67行 |

### flywheel-trend/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| flywheel-trend/index.tsx | FlywheelTrendPage | 真实数据 | /api/v1/flywheel-trend；路由含硬编码 demo records | 71行 |

### follow-up-adherence/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| follow-up-adherence/index.tsx | FollowUpAdherencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 71行 |

### follow-up-completion/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| follow-up-completion/index.tsx | FollowUpCompletionPage | 真实数据 | /api/v1/follow-up-completion；路由含硬编码 demo records | 63行 |

### follow-up-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| follow-up-mgmt/index.tsx | FollowUpMgmtPage | 真实数据 | /api/v1/follow-up-mgmt；路由含硬编码 demo records | 63行 |

### followUp/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| followUp/Calendar/index.tsx | FollowUpCalendarPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 186行 |
| followUp/SmartManage/index.tsx | SmartFollowupManagePage | 真实数据 | /api/v1/followup/send；路由含硬编码 demo records | 273行 |
| followUp/smart/index.tsx | SmartFollowupPage | 真实数据 | /api/v1/followup/smart；路由含硬编码 demo records | 147行 |

### followupAppointment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| followupAppointment/index.tsx | FollowupAppointmentPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 74行 |

### form-engine/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| form-engine/index.tsx | FormEnginePage | 真实数据 | /api/v1/form/templates；路由含硬编码 demo records | 88行 |

### frontPage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| frontPage/index.tsx | FrontPagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 89行 |

### functional/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| functional/report/index.tsx | FunctionalReportPage | 真实数据 | /api/v1/functional/report；路由含硬编码 demo records | 106行 |

### gastroenterology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| gastroenterology-v5/report/index.tsx | GastroenterologyV5Page | 真实数据 | /api/v1/gastroenterology-v5/report；路由含硬编码 demo records | 107行 |

### gcp-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| gcp-v5/report/index.tsx | GCPV5Page | 真实数据 | /api/v1/gcp-v5/report；路由含硬编码 demo records | 107行 |

### genomic-precision/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| genomic-precision/report/index.tsx | GenomicPrecisionPage | 真实数据 | /api/v1/genomic-precision/report；路由含硬编码 demo records | 103行 |

### genomic-precision-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| genomic-precision-v2/report/index.tsx | GenomicPrecisionV2Page | 真实数据 | /api/v1/genomic-precision-v2/report；路由含硬编码 demo records | 102行 |

### geriatric-comprehensive/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| geriatric-comprehensive/index.tsx | GeriatricComprehensivePage | 真实数据 | /api/v1/geriatric-comprehensive；路由含硬编码 demo records | 63行 |

### geriatrics/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| geriatrics/report-v2/index.tsx | GeriatricsV2Page | 真实数据 | /api/v1/geriatrics/report-v2；路由含硬编码 demo records | 107行 |

### geriatrics-lifecycle-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| geriatrics-lifecycle-v3/report/index.tsx | GeriatricsLifecycleV3Page | 真实数据 | /api/v1/geriatrics-lifecycle-v3/report；路由含硬编码 demo records | 106行 |

### geriatrics-lifecycle-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| geriatrics-lifecycle-v4/report/index.tsx | GeriatricsLifecycleV4Page | 真实数据 | /api/v1/geriatrics-lifecycle-v4/report；路由含硬编码 demo records | 104行 |

### grade-nursing/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| grade-nursing/index.tsx | GradeNursingPage | 真实数据 | /api/v1/grade-nursing；路由含硬编码 demo records | 63行 |

### grade-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| grade-review/index.tsx | GradeReviewPage | 真实数据 | /api/v1/grade-review；路由含硬编码 demo records | 63行 |

### graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| graph/Visualizer/index.tsx | MedicalGraphVisualizer | 真实数据 | /api/v1/graph/differential；路由含硬编码 demo records | 362行 |

### grassroots-medical/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| grassroots-medical/index.tsx | GrassrootsMedicalPage | 真实数据 | /api/v1/grassroots-medical；路由含硬编码 demo records | 63行 |

### green-channel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| green-channel/index.tsx | GreenChannelPage | 真实数据 | /api/v1/green-channel；路由含硬编码 demo records | 63行 |

### green-hospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| green-hospital/report/index.tsx | GreenHospitalV2Page | 真实数据 | /api/v1/green-hospital/report；路由含硬编码 demo records | 104行 |

### green-hospital-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| green-hospital-v3/report/index.tsx | GreenHospitalV3Page | 真实数据 | /api/v1/green-hospital-v3/report；路由含硬编码 demo records | 102行 |

### group-frh-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| group-frh-v5/report/index.tsx | GroupFRHV5Page | 真实数据 | /api/v1/group-frh-v5/report；路由含硬编码 demo records | 52行 |

### group-qa-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| group-qa-v5/report/index.tsx | GroupQAV5Page | 真实数据 | /api/v1/group-qa-v5/report；路由含硬编码 demo records | 52行 |

### group-referral-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| group-referral-v5/report/index.tsx | GroupReferralV5Page | 真实数据 | /api/v1/group-referral-v5/report；路由含硬编码 demo records | 52行 |

### guide-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| guide-service/index.tsx | GuideServicePage | 真实数据 | /api/v1/guide-service；路由含硬编码 demo records | 63行 |

### guideline-compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| guideline-compliance/index.tsx | GuidelineCompliancePage | 真实数据 | /api/v1/guideline-compliance；路由含硬编码 demo records | 63行 |

### hand-hygiene/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hand-hygiene/index.tsx | HandHygienePage | 真实数据 | /api/v1/hand-hygiene；路由含硬编码 demo records | 63行 |

### hand-hygiene-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hand-hygiene-audit/index.tsx | HandHygieneAuditPage | 真实数据 | /api/v1/hand-hygiene-audit；路由含硬编码 demo records | 63行 |

### hand-hygiene-compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hand-hygiene-compliance/index.tsx | HandHygieneCompliancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 76行 |

### hand-hygiene-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hand-hygiene-detail/index.tsx | HandHygieneDetailPage | 真实数据 | /api/v1/hand-hygiene-detail；路由含硬编码 demo records | 63行 |

### hand-hygiene-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hand-hygiene-quality/index.tsx | HandHygieneQualityPage | 真实数据 | /api/v1/hand-hygiene-quality；路由含硬编码 demo records | 63行 |

### handover/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| handover/index.tsx | HandoverPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 71行 |

### handover-communication-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| handover-communication-mgmt/index.tsx | HandoverCommunicationMgmtPage | 真实数据 | /api/v1/handover-communication-mgmt；路由含硬编码 demo records | 63行 |

### handover-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| handover-detail/index.tsx | HandoverDetailPage | 真实数据 | /api/v1/handover-detail；路由含硬编码 demo records | 63行 |

### handover-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| handover-mgmt/index.tsx | HandoverMgmtPage | 真实数据 | /api/v1/handover-mgmt；路由含硬编码 demo records | 63行 |

### health-checkup/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-checkup/index.tsx | HealthCheckupPage | 真实数据 | /api/v1/health-checkup；路由含硬编码 demo records | 63行 |

### health-checkup-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-checkup-mgmt/index.tsx | HealthCheckupMgmtPage | 真实数据 | /api/v1/health-checkup-mgmt；路由含硬编码 demo records | 63行 |

### health-checkup-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-checkup-v5/report/index.tsx | HealthCheckupV5Page | 真实数据 | /api/v1/health-checkup-v5/report；路由含硬编码 demo records | 52行 |

### health-education-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-education-mgmt/index.tsx | HealthEducationMgmtPage | 真实数据 | /api/v1/health-education-mgmt；路由含硬编码 demo records | 63行 |

### health-education-push/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-education-push/index.tsx | HealthEducationPushPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### health-education-stats-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-education-stats-mgmt/index.tsx | HealthEducationStatsMgmtPage | 真实数据 | /api/v1/health-education-stats-mgmt；路由含硬编码 demo records | 63行 |

### health-management/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-management/report-v2/index.tsx | HealthManagementV2Page | 真实数据 | /api/v1/health-management/report-v2；路由含硬编码 demo records | 107行 |
| health-management/report-v3/index.tsx | HealthManagementV3Page | 真实数据 | /api/v1/health-management/report-v3；路由含硬编码 demo records | 108行 |

### health-management-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-management-v4/report/index.tsx | HealthManagementV4Page | 真实数据 | /api/v1/health-management-v4/report；路由含硬编码 demo records | 107行 |

### health-media/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-media/report/index.tsx | HealthMediaPage | 真实数据 | /api/v1/health-media/report；路由含硬编码 demo records | 104行 |

### health-media-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-media-v3/report/index.tsx | HealthMediaV3Page | 真实数据 | /api/v1/health-media-v3/report；路由含硬编码 demo records | 103行 |

### health-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-record/index.tsx | HealthRecordPage | 真实数据 | /api/v1/health-record；路由含硬编码 demo records | 63行 |

### health-vip-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| health-vip-v5/report/index.tsx | HealthVIPV5Page | 真实数据 | /api/v1/health-vip-v5/report；路由含硬编码 demo records | 52行 |

### healthCheck/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| healthCheck/index.tsx | HealthCheckPage | 真实数据 | /api/v1/healthcheck/packages；路由含硬编码 demo records | 54行 |

### healthCheckReferral/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| healthCheckReferral/index.tsx | HealthCheckReferralPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 39行 |

### help/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| help/Center/index.tsx | HelpCenterPage | 真实数据 | /api/v1/help；路由含硬编码 demo records | 376行 |
| help/Manual/index.tsx | HelpManualPage | 真实数据 | /api/v1/help/manual；路由含硬编码 demo records | 273行 |

### high-alert-med-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| high-alert-med-mgmt/index.tsx | HighAlertMedMgmtPage | 真实数据 | /api/v1/high-alert-med-mgmt；路由含硬编码 demo records | 63行 |

### high-quality-development/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| high-quality-development/report-v2/index.tsx | HighQualityDevelopmentV2Page | 真实数据 | /api/v1/high-quality-development/report-v2；路由含硬编码 demo records | 107行 |

### hl7-integration/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hl7-integration/index.tsx | Hl7IntegrationPage | 真实数据 | /api/v1/hl7-integration/report；路由含硬编码 demo records | 50行 |

### honor-wall/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| honor-wall/index.tsx | HonorWallPage | 真实数据 | /api/v1/honor-wall；路由含硬编码 demo records | 88行 |

### hospice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospice/report/index.tsx | HospiceReportPage | 真实数据 | /api/v1/hospice/report；路由含硬编码 demo records | 107行 |

### hospice-palliative-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospice-palliative-v5/report/index.tsx | HospicePalliativeV5Page | 真实数据 | /api/v1/hospice-palliative-v5/report；路由含硬编码 demo records | 52行 |

### hospital-accreditation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-accreditation-mgmt/index.tsx | HospitalAccreditationMgmtPage | 真实数据 | /api/v1/hospital-accreditation-mgmt；路由含硬编码 demo records | 63行 |

### hospital-culture-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-culture-mgmt/index.tsx | HospitalCultureMgmtPage | 真实数据 | /api/v1/hospital-culture-mgmt；路由含硬编码 demo records | 63行 |

### hospital-efficiency/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-efficiency/index.tsx | HospitalEfficiencyPage | 真实数据 | /api/v1/hospital-efficiency；路由含硬编码 demo records | 63行 |

### hospital-infection-surveillance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-infection-surveillance/index.tsx | HospitalInfectionSurveillancePage | 真实数据 | /api/v1/hospital-infection-surveillance；路由含硬编码 demo records | 63行 |

### hospital-kpi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-kpi/report/index.tsx | HospitalKPIReportPage | 真实数据 | /api/v1/hospital-kpi/report；路由含硬编码 demo records | 104行 |

### hospital-operations-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-operations-mgmt/index.tsx | HospitalOperationsMgmtPage | 真实数据 | /api/v1/hospital-operations-mgmt；路由含硬编码 demo records | 63行 |

### hospital-os-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-os-v5/report/index.tsx | HospitalOSV5Page | 真实数据 | /api/v1/hospital-os-v5/report；路由含硬编码 demo records | 107行 |

### hospital-robot-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hospital-robot-v5/report/index.tsx | HospitalRobotV5Page | 真实数据 | /api/v1/hospital-robot-v5/report；路由含硬编码 demo records | 107行 |

### hqms/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hqms/index.tsx | HQMSPage | 真实数据 | /api/v1/hqms；路由含硬编码 demo records | 54行 |

### hr/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hr/report-v2/index.tsx | HRV2Page | 真实数据 | /api/v1/hr/report-v2；路由含硬编码 demo records | 106行 |

### hrp/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hrp/report-v2/index.tsx | HRPV2Page | 真实数据 | /api/v1/hrp/report-v2；路由含硬编码 demo records | 107行 |

### hrp-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hrp-v3/report/index.tsx | HRPV3Page | 真实数据 | /api/v1/hrp-v3/report；路由含硬编码 demo records | 104行 |

### hrp-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| hrp-v4/report/index.tsx | HRPV4Page | 真实数据 | /api/v1/hrp-v4/report；路由含硬编码 demo records | 105行 |

### humanTask/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| humanTask/index.tsx | HumanTaskPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 119行 |

### i18n/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| i18n/LanguageSwitcher/index.tsx |  | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 168行 |

### icd-coding-accuracy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icd-coding-accuracy/index.tsx | IcdCodingAccuracyPage | 真实数据 | /api/v1/icd-coding-accuracy；路由含硬编码 demo records | 57行 |

### icd-coding-assist/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icd-coding-assist/index.tsx | IcdCodingAssistPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### icu/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icu/report-v2/index.tsx | ICUV2Page | 真实数据 | /api/v1/icu/report-v2；路由含硬编码 demo records | 107行 |

### icu-care-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icu-care-mgmt/index.tsx | IcuCareMgmtPage | 真实数据 | /api/v1/icu-care-mgmt；路由含硬编码 demo records | 63行 |

### icu-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icu-mgmt/index.tsx | IcuMgmtPage | 真实数据 | /api/v1/icu-mgmt；路由含硬编码 demo records | 63行 |

### icu-occupancy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icu-occupancy/index.tsx | IcuOccupancyPage | 真实数据 | /api/v1/icu-occupancy；路由含硬编码 demo records | 63行 |

### icu-stats-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icu-stats-mgmt/index.tsx | IcuStatsMgmtPage | 真实数据 | /api/v1/icu-stats-mgmt；路由含硬编码 demo records | 63行 |

### icuSedation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| icuSedation/index.tsx | IcuSedationPage | 真实数据 | /api/v1/icu-sedation；路由含硬编码 demo records | 56行 |

### im/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| im/Messages/index.tsx | ImMessagesPage | 真实数据 | /api/v1/im/unread-count | 255行 |

### imaging/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging/Ai/index.tsx | ImagingAiPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 264行 |
| imaging/AiReview/index.tsx | ImagingAiReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 285行 |
| imaging/report-v2/index.tsx | ImagingV2Page | 真实数据 | /api/v1/imaging/report-v2；路由含硬编码 demo records | 107行 |

### imaging-ai-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-ai-usage/index.tsx | ImagingAiUsagePage | 真实数据 | /api/v1/imaging-ai-usage；路由含硬编码 demo records | 75行 |

### imaging-ai-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-ai-v3/report/index.tsx | ImagingAIV3Page | 真实数据 | /api/v1/imaging-ai-v3/report；路由含硬编码 demo records | 105行 |

### imaging-ai-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-ai-v4/report/index.tsx | ImagingAIV4Page | 真实数据 | /api/v1/imaging-ai-v4/report；路由含硬编码 demo records | 103行 |

### imaging-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-quality/index.tsx | ImagingQualityPage | 真实数据 | /api/v1/imaging-quality；路由含硬编码 demo records | 63行 |

### imaging-quality-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-quality-control/index.tsx | ImagingQualityControlPage | 真实数据 | /api/v1/imaging-quality-control；路由含硬编码 demo records | 63行 |

### imaging-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-quality-mgmt/index.tsx | ImagingQualityMgmtPage | 真实数据 | /api/v1/imaging-quality-mgmt；路由含硬编码 demo records | 63行 |

### imaging-turnaround/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| imaging-turnaround/index.tsx | ImagingTurnaroundPage | 真实数据 | /api/v1/imaging-turnaround；路由含硬编码 demo records | 63行 |

### immunization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| immunization/index.tsx | ImmunizationPage | 真实数据 | /api/v1/immunization；路由含硬编码 demo records | 63行 |

### improvementOutcome/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| improvementOutcome/index.tsx | ImprovementOutcomePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 57行 |

### improvementTask/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| improvementTask/index.tsx | ImprovementTaskPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 54行 |

### individual-kpi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| individual-kpi/index.tsx | IndividualKpiPage | 真实数据 | /api/v1/individual-kpi；路由含硬编码 demo records | 63行 |

### indoor-navigation-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| indoor-navigation-v5/report/index.tsx | IndoorNavigationV5Page | 真实数据 | /api/v1/indoor-navigation-v5/report；路由含硬编码 demo records | 107行 |

### industry-style-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| industry-style-quality-mgmt/index.tsx | IndustryStyleQualityMgmtPage | 真实数据 | /api/v1/industry-style-quality-mgmt；路由含硬编码 demo records | 63行 |

### infection/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection/control/index.tsx | InfectionControlV2Page | 真实数据 | /api/v1/infection/control/report-v2；路由含硬编码 demo records | 113行 |

### infection-control/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-control/index.tsx | InfectionControlPage | 真实数据 | /api/v1/infection-control；路由含硬编码 demo records | 63行 |
| infection-control/report-v2/index.tsx | InfectionControlV2Page | 真实数据 | /api/v1/infection-control/report-v2；路由含硬编码 demo records | 104行 |
| infection-control/report-v3/index.tsx | InfectionControlV3Page | 真实数据 | /api/v1/infection-control/report-v3；路由含硬编码 demo records | 107行 |

### infection-control-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-control-detail/index.tsx | InfectionControlDetailPage | 真实数据 | /api/v1/infection-control-detail；路由含硬编码 demo records | 63行 |

### infection-control-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-control-v3/report/index.tsx | InfectionControlV3Page | 真实数据 | /api/v1/infection-control-v3/report；路由含硬编码 demo records | 107行 |

### infection-outbreak/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-outbreak/index.tsx | InfectionOutbreakPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 86行 |

### infection-report-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-report-mgmt/index.tsx | InfectionReportMgmtPage | 真实数据 | /api/v1/infection-report-mgmt；路由含硬编码 demo records | 63行 |

### infection-surveillance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-surveillance/index.tsx | InfectionSurveillancePage | 真实数据 | /api/v1/infection-surveillance；路由含硬编码 demo records | 63行 |

### infection-surveillance-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infection-surveillance-detail/index.tsx | InfectionSurveillanceDetailPage | 真实数据 | /api/v1/infection-surveillance-detail；路由含硬编码 demo records | 63行 |

### infectionDashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infectionDashboard/index.tsx | InfectionDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### infectious-disease/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infectious-disease/report-v2/index.tsx | InfectiousDiseaseV2Page | 真实数据 | /api/v1/infectious-disease/report-v2；路由含硬编码 demo records | 107行 |

### info-security/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| info-security/index.tsx | InfoSecurityPage | 真实数据 | /api/v1/info-security；路由含硬编码 demo records | 63行 |

### info-security-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| info-security-stats/index.tsx | InfoSecurityStatsPage | 真实数据 | /api/v1/info-security-stats；路由含硬编码 demo records | 63行 |

### information-security-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| information-security-mgmt/index.tsx | InformationSecurityMgmtPage | 真实数据 | /api/v1/information-security-mgmt；路由含硬编码 demo records | 63行 |

### information-system-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| information-system-mgmt/index.tsx | InformationSystemMgmtPage | 真实数据 | /api/v1/information-system-mgmt；路由含硬编码 demo records | 63行 |

### information-system-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| information-system-quality-mgmt/index.tsx | InformationSystemQualityMgmtPage | 真实数据 | /api/v1/information-system-quality-mgmt；路由含硬编码 demo records | 63行 |

### informatization/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| informatization/report-v2/index.tsx | InformatizationPlanV2Page | 真实数据 | /api/v1/informatization/report-v2；路由含硬编码 demo records | 107行 |
| informatization/report/index.tsx | InformatizationPage | 真实数据 | /api/v1/informatization/report；路由含硬编码 demo records | 107行 |

### informatization-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| informatization-v3/report/index.tsx | InformatizationV3Page | 真实数据 | /api/v1/informatization-v3/report；路由含硬编码 demo records | 103行 |

### informed-consent/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| informed-consent/index.tsx | InformedConsentPage | 真实数据 | /api/v1/informed-consent；路由含硬编码 demo records | 63行 |

### informed-consent-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| informed-consent-detail/index.tsx | InformedConsentDetailPage | 真实数据 | /api/v1/informed-consent-detail；路由含硬编码 demo records | 63行 |

### informed-consent-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| informed-consent-stats/index.tsx | InformedConsentStatsPage | 真实数据 | /api/v1/informed-consent-stats；路由含硬编码 demo records | 63行 |

### infusion-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infusion-detail/index.tsx | InfusionDetailPage | 真实数据 | /api/v1/infusion-detail；路由含硬编码 demo records | 63行 |

### infusion-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| infusion-mgmt/index.tsx | InfusionMgmtPage | 真实数据 | /api/v1/infusion-mgmt；路由含硬编码 demo records | 63行 |

### inpatient/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient/report-v2/index.tsx | InpatientV2Page | 真实数据 | /api/v1/inpatient/report-v2；路由含硬编码 demo records | 107行 |

### inpatient-ai-loop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-ai-loop-v5/report/index.tsx | InpatientAILoopV5Page | 真实数据 | /api/v1/inpatient-ai-loop-v5/report；路由含硬编码 demo records | 104行 |

### inpatient-bed-day-cost/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-bed-day-cost/index.tsx | InpatientBedDayCostPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 70行 |

### inpatient-billing-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-billing-mgmt/index.tsx | InpatientBillingMgmtPage | 真实数据 | /api/v1/inpatient-billing-mgmt；路由含硬编码 demo records | 63行 |

### inpatient-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-mgmt-detail/index.tsx | InpatientMgmtDetailPage | 真实数据 | /api/v1/inpatient-mgmt-detail；路由含硬编码 demo records | 63行 |

### inpatient-onestop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-onestop-v5/report/index.tsx | InpatientOneStopV5Page | 真实数据 | /api/v1/inpatient-onestop-v5/report；路由含硬编码 demo records | 107行 |

### inpatient-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-quality/index.tsx | InpatientQualityPage | 真实数据 | /api/v1/inpatient-quality；路由含硬编码 demo records | 63行 |

### inpatient-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-service/index.tsx | InpatientServicePage | 真实数据 | /api/v1/inpatient-service；路由含硬编码 demo records | 63行 |

### inpatient-transfer-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatient-transfer-mgmt/index.tsx | InpatientTransferMgmtPage | 真实数据 | /api/v1/inpatient-transfer-mgmt；路由含硬编码 demo records | 63行 |

### inpatientCostMonitor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| inpatientCostMonitor/index.tsx | InpatientCostMonitorPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 58行 |

### instrument-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| instrument-mgmt/index.tsx | InstrumentMgmtPage | 真实数据 | /api/v1/instrument-mgmt；路由含硬编码 demo records | 63行 |

### insurance/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance/report-v2/index.tsx | InsuranceMgmtV2Page | 真实数据 | /api/v1/insurance/report-v2；路由含硬编码 demo records | 107行 |
| insurance/report-v3/index.tsx | InsuranceV3Page | 真实数据 | /api/v1/insurance/report-v3；路由含硬编码 demo records | 105行 |

### insurance-audit-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-audit-stats/index.tsx | InsuranceAuditStatsPage | 真实数据 | /api/v1/insurance-audit-stats；路由含硬编码 demo records | 63行 |

### insurance-claim/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-claim/index.tsx | InsuranceClaimPage | 真实数据 | /api/v1/insurance-claim；路由含硬编码 demo records | 63行 |

### insurance-cost-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-cost-control/index.tsx | InsuranceCostControlPage | 真实数据 | /api/v1/insurance-cost-control；路由含硬编码 demo records | 63行 |

### insurance-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-report/index.tsx | InsuranceReportPage | 真实数据 | /api/v1/insurance-report；路由含硬编码 demo records | 54行 |

### insurance-settlement/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-settlement/index.tsx | InsuranceSettlementPage | 真实数据 | /api/v1/insurance-settlement；路由含硬编码 demo records | 63行 |

### insurance-settlement-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-settlement-detail/index.tsx | InsuranceSettlementDetailPage | 真实数据 | /api/v1/insurance-settlement-detail；路由含硬编码 demo records | 63行 |

### insurance-settlement-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-settlement-stats/index.tsx | InsuranceSettlementStatsPage | 真实数据 | /api/v1/insurance-settlement-stats；路由含硬编码 demo records | 63行 |

### insurance-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| insurance-v4/report/index.tsx | InsuranceV4Page | 真实数据 | /api/v1/insurance-v4/report；路由含硬编码 demo records | 105行 |

### integration/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| integration/Hl7Test/index.tsx | Hl7TestPage | 真实数据 | /api/v1/integration/hl7/parse；路由含硬编码 demo records | 385行 |

### integrity-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| integrity-quality-mgmt/index.tsx | IntegrityQualityMgmtPage | 真实数据 | /api/v1/integrity-quality-mgmt；路由含硬编码 demo records | 63行 |

### intelligent-alert-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| intelligent-alert-v3/report/index.tsx | IntelligentAlertV3Page | 真实数据 | /api/v1/intelligent-alert-v3/report；路由含硬编码 demo records | 107行 |

### intercon4-level/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| intercon4-level/index.tsx | Intercon4LevelPage | 真实数据 | /api/v1/intercon4-level；路由含硬编码 demo records | 75行 |

### international-health-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| international-health-v2/report/index.tsx | InternationalHealthV2Page | 真实数据 | /api/v1/international-health-v2/report；路由含硬编码 demo records | 104行 |

### international-health-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| international-health-v3/report/index.tsx | InternationalHealthV3Page | 真实数据 | /api/v1/international-health-v3/report；路由含硬编码 demo records | 103行 |

### internet/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet/Deep/index.tsx | InternetDeepPage | 真实数据 | /api/v1/internet/consultation-flow；路由含硬编码 demo records | 421行 |
| internet/InternetHospitalDeep/index.tsx | InternetHospitalDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 402行 |

### internet-hospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital/report-v2/index.tsx | InternetHospitalV2Page | 真实数据 | /api/v1/internet-hospital/report-v2；路由含硬编码 demo records | 107行 |

### internet-hospital-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-detail/index.tsx | InternetHospitalDetailPage | 真实数据 | /api/v1/internet-hospital-detail；路由含硬编码 demo records | 63行 |

### internet-hospital-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-mgmt/index.tsx | InternetHospitalMgmtPage | 真实数据 | /api/v1/internet-hospital-mgmt；路由含硬编码 demo records | 63行 |

### internet-hospital-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-stats/index.tsx | InternetHospitalStatsPage | 真实数据 | /api/v1/internet-hospital-stats；路由含硬编码 demo records | 63行 |

### internet-hospital-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-v2/index.tsx | InternetHospitalV2Page | 真实数据 | /api/v1/internet-hospital/report；路由含硬编码 demo records | 115行 |

### internet-hospital-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-v3/report/index.tsx | InternetHospitalV3Page | 真实数据 | /api/v1/internet-hospital-v3/report；路由含硬编码 demo records | 104行 |

### internet-hospital-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internet-hospital-v5/report/index.tsx | InternetHospitalV5Page | 真实数据 | /api/v1/internet-hospital-v5/report；路由含硬编码 demo records | 107行 |

### internetDelivery/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internetDelivery/index.tsx | InternetDeliveryWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### internetHospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internetHospital/index.tsx | InternetHospitalPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 86行 |

### internetPayment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internetPayment/index.tsx | InternetPaymentWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 98行 |

### internetPrescription/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internetPrescription/index.tsx | InternetPrescriptionWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 133行 |

### internetReports/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| internetReports/index.tsx | InternetReportsWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 222行 |

### interop-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interop-mgmt/index.tsx | InteropMgmtPage | 真实数据 | /api/v1/interop-mgmt；路由含硬编码 demo records | 63行 |

### interop-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interop-v3/report/index.tsx | InteropV3Page | 真实数据 | /api/v1/interop-v3/report；路由含硬编码 demo records | 106行 |

### interop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interop-v5/report/index.tsx | InteropV5Page | 真实数据 | /api/v1/interop-v5/report；路由含硬编码 demo records | 108行 |

### interoperability/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interoperability/report/index.tsx | InteroperabilityReportPage | 真实数据 | /api/v1/interoperability/report；路由含硬编码 demo records | 105行 |

### interoperability-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interoperability-quality-mgmt/index.tsx | InteroperabilityQualityMgmtPage | 真实数据 | /api/v1/interoperability-quality-mgmt；路由含硬编码 demo records | 63行 |

### interpret/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| interpret/index.tsx | InterpretPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 645行 |

### intraop-frozen-section/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| intraop-frozen-section/index.tsx | IntraopFrozenSectionPage | 真实数据 | /api/v1/intraop-frozen-section；路由含硬编码 demo records | 51行 |

### invoice-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| invoice-mgmt/index.tsx | InvoiceMgmtPage | 真实数据 | /api/v1/invoice-mgmt；路由含硬编码 demo records | 63行 |

### iot/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| iot/report/index.tsx | IoTReportPage | 真实数据 | /api/v1/iot/report；路由含硬编码 demo records | 107行 |

### isolation-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| isolation-detail/index.tsx | IsolationDetailPage | 真实数据 | /api/v1/isolation-detail；路由含硬编码 demo records | 63行 |

### isolation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| isolation-mgmt/index.tsx | IsolationMgmtPage | 真实数据 | /api/v1/isolation-mgmt；路由含硬编码 demo records | 63行 |

### isolation-order/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| isolation-order/index.tsx | IsolationOrderPage | 真实数据 | /api/v1/isolation-order；路由含硬编码 demo records | 51行 |

### it-service-desk-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| it-service-desk-mgmt/index.tsx | ItServiceDeskMgmtPage | 真实数据 | /api/v1/it-service-desk-mgmt；路由含硬编码 demo records | 63行 |

### iv-fluid/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| iv-fluid/index.tsx | IvFluidPage | 真实数据 | /api/v1/iv-fluid；路由含硬编码 demo records | 57行 |

### key-specialty-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| key-specialty-mgmt/index.tsx | KeySpecialtyMgmtPage | 真实数据 | /api/v1/key-specialty-mgmt；路由含硬编码 demo records | 63行 |

### knowledge/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge/Federation/index.tsx | KnowledgeFederationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 330行 |
| knowledge/index.tsx | KnowledgePage | 真实数据 | /api/v1/knowledge/handover-priority；路由含硬编码 demo records | 72行 |

### knowledge-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-dashboard/index.tsx | KnowledgeDashboardPage | 真实数据 | /api/v1/knowledge/asset-dashboard；路由含硬编码 demo records | 88行 |

### knowledge-graph/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-graph/report-v2/index.tsx | KnowledgeGraphV2Page | 真实数据 | /api/v1/knowledge-graph/report-v2；路由含硬编码 demo records | 107行 |

### knowledge-graph-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-graph-v3/report/index.tsx | KnowledgeGraphV3Page | 真实数据 | /api/v1/knowledge-graph-v3/report；路由含硬编码 demo records | 103行 |

### knowledge-graph-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-graph-v4/report/index.tsx | KnowledgeGraphV4Page | 真实数据 | /api/v1/knowledge-graph-v4/report；路由含硬编码 demo records | 102行 |

### knowledge-intake/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-intake/index.tsx | KnowledgeIntakePage | 真实数据 | /api/v1/knowledge-intake；路由含硬编码 demo records | 54行 |

### knowledge-lifecycle/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-lifecycle/index.tsx | KnowledgeLifecyclePage | 真实数据 | /api/v1/knowledge-lifecycle；路由含硬编码 demo records | 67行 |

### knowledge-link/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledge-link/index.tsx | KnowledgeLinkPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 85行 |

### knowledgeBase/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| knowledgeBase/index.tsx | KnowledgeBasePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 428行 |

### kpi-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| kpi-dashboard/index.tsx | KpiDashboardPage | 真实数据 | /api/v1/kpi-dashboard；路由含硬编码 demo records | 69行 |

### lab-ai-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-ai-usage/index.tsx | LabAiUsagePage | 真实数据 | /api/v1/lab-ai-usage；路由含硬编码 demo records | 57行 |

### lab-biosafety-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-biosafety-quality-mgmt/index.tsx | LabBiosafetyQualityMgmtPage | 真实数据 | /api/v1/lab-biosafety-quality-mgmt；路由含硬编码 demo records | 63行 |

### lab-error/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-error/index.tsx | LabErrorPage | 真实数据 | /api/v1/lab-error；路由含硬编码 demo records | 57行 |

### lab-imaging/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-imaging/audit/index.tsx | LabImagingAuditPage | 真实数据 | /api/v1/lab-imaging/audit/report；路由含硬编码 demo records | 101行 |
| lab-imaging/report-v3/index.tsx | LabImagingV3Page | 真实数据 | /api/v1/lab-imaging/report-v3；路由含硬编码 demo records | 108行 |

### lab-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-quality/index.tsx | LabQualityPage | 真实数据 | /api/v1/lab-quality；路由含硬编码 demo records | 63行 |

### lab-quality-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-quality-control/index.tsx | LabQualityControlPage | 真实数据 | /api/v1/lab-quality-control；路由含硬编码 demo records | 63行 |

### lab-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-service/index.tsx | LabServicePage | 真实数据 | /api/v1/lab-service；路由含硬编码 demo records | 63行 |

### lab-turnaround/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lab-turnaround/index.tsx | LabTurnaroundPage | 真实数据 | /api/v1/lab-turnaround；路由含硬编码 demo records | 63行 |

### laboratory/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| laboratory/report-v2/index.tsx | LaboratoryV2Page | 真实数据 | /api/v1/laboratory/report-v2；路由含硬编码 demo records | 107行 |

### laboratory-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| laboratory-v4/report/index.tsx | LaboratoryV4Page | 真实数据 | /api/v1/laboratory-v4/report；路由含硬编码 demo records | 105行 |

### laundry-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| laundry-mgmt/index.tsx | LaundryMgmtPage | 真实数据 | /api/v1/laundry-mgmt；路由含硬编码 demo records | 63行 |

### learning/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| learning/Dashboard/index.tsx | LearningDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 299行 |
| learning/flywheel/index.tsx | LearningFlywheelPage | 真实数据 | /api/v1/learning/flywheel；路由含硬编码 demo records | 231行 |
| learning/self-loop/index.tsx | SelfLearningLoopPage | 真实数据 | /api/v1/learning/self-loop；路由含硬编码 demo records | 119行 |

### learning-curve/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| learning-curve/index.tsx | LearningCurvePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### learning-flywheel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| learning-flywheel/index.tsx | LearningFlywheelPage | 真实数据 | /api/v1/agent/flywheel；路由含硬编码 demo records | 84行 |

### learning-milestone/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| learning-milestone/index.tsx | LearningMilestonePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 72行 |

### learning-plan/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| learning-plan/index.tsx | LearningPlanPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 85行 |

### linen-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| linen-management/index.tsx | LinenManagementPage | 真实数据 | /api/v1/linen-management；路由含硬编码 demo records | 54行 |

### lis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| lis/index.tsx | LisPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 665行 |

### login/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| login/index.tsx | Login | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 131行 |

### logistics/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics/report-v2/index.tsx | LogisticsV2Page | 真实数据 | /api/v1/logistics/report-v2；路由含硬编码 demo records | 107行 |
| logistics/report-v3/index.tsx | LogisticsV3Page | 真实数据 | /api/v1/logistics/report-v3；路由含硬编码 demo records | 106行 |

### logistics-equipment-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-equipment-v4/report/index.tsx | LogisticsEquipmentV4Page | 真实数据 | /api/v1/logistics-equipment-v4/report；路由含硬编码 demo records | 107行 |

### logistics-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-mgmt/index.tsx | LogisticsMgmtPage | 真实数据 | /api/v1/logistics-mgmt；路由含硬编码 demo records | 63行 |

### logistics-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-safety/report/index.tsx | LogisticsSafetyPage | 真实数据 | /api/v1/logistics-safety/report；路由含硬编码 demo records | 107行 |

### logistics-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-service/index.tsx | LogisticsServicePage | 真实数据 | /api/v1/logistics-service；路由含硬编码 demo records | 63行 |

### logistics-support/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-support/index.tsx | LogisticsSupportPage | 真实数据 | /api/v1/logistics-support；路由含硬编码 demo records | 63行 |

### logistics-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| logistics-v3/report/index.tsx | LogisticsV3Page | 真实数据 | /api/v1/logistics-v3/report；路由含硬编码 demo records | 104行 |

### look-alike/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| look-alike/index.tsx | LookAlikePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### management-ai-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| management-ai-v5/report/index.tsx | ManagementAIV5Page | 真实数据 | /api/v1/management-ai-v5/report；路由含硬编码 demo records | 106行 |

### manager-brief/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| manager-brief/index.tsx | ManagerBriefPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### maternal-care-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-care-mgmt/index.tsx | MaternalCareMgmtPage | 真实数据 | /api/v1/maternal-care-mgmt；路由含硬编码 demo records | 63行 |

### maternal-child/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-child/report-v2/index.tsx | MaternalChildV2Page | 真实数据 | /api/v1/maternal-child/report-v2；路由含硬编码 demo records | 107行 |

### maternal-child-lifecycle-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-child-lifecycle-v3/report/index.tsx | MaternalChildLifecycleV3Page | 真实数据 | /api/v1/maternal-child-lifecycle-v3/report；路由含硬编码 demo records | 105行 |

### maternal-child-lifecycle-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-child-lifecycle-v4/report/index.tsx | MaternalChildLifecycleV4Page | 真实数据 | /api/v1/maternal-child-lifecycle-v4/report；路由含硬编码 demo records | 104行 |

### maternal-health-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-health-mgmt/index.tsx | MaternalHealthMgmtPage | 真实数据 | /api/v1/maternal-health-mgmt；路由含硬编码 demo records | 63行 |

### maternal-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternal-mgmt/index.tsx | MaternalMgmtPage | 真实数据 | /api/v1/maternal-mgmt；路由含硬编码 demo records | 63行 |

### maternity-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| maternity-quality/index.tsx | MaternityQualityPage | 真实数据 | /api/v1/maternity-quality；路由含硬编码 demo records | 63行 |

### mdt-consultation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mdt-consultation-mgmt/index.tsx | MdtConsultationMgmtPage | 真实数据 | /api/v1/mdt-consultation-mgmt；路由含硬编码 demo records | 63行 |

### mdtConsult/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mdtConsult/index.tsx | MdtConsultPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### mdtTreatmentPlan/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mdtTreatmentPlan/index.tsx | MdtTreatmentPlanPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 65行 |

### med-adherence/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| med-adherence/index.tsx | MedAdherencePage | 真实数据 | /api/v1/med-adherence；路由含硬编码 demo records | 66行 |

### medAdmin/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medAdmin/index.tsx | MedAdminPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 221行 |

### medical/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical/Graph/index.tsx | MedicalGraphPage | 真实数据 | /api/v1/medical/graph/query；路由含硬编码 demo records | 315行 |
| medical/MedicalGraph/index.tsx | MedicalGraphDeepPage | 真实数据 | /api/v1/medical-graph；路由含硬编码 demo records | 376行 |

### medical-affairs/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-affairs/report-v2/index.tsx | MedicalAffairsV2Page | 真实数据 | /api/v1/medical-affairs/report-v2；路由含硬编码 demo records | 104行 |

### medical-alliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-alliance/index.tsx | MedicalAlliancePage | 真实数据 | /api/v1/medical-alliance；路由含硬编码 demo records | 63行 |

### medical-alliance-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-alliance-v5/report/index.tsx | MedicalAllianceV5Page | 真实数据 | /api/v1/medical-alliance-v5/report；路由含硬编码 demo records | 107行 |

### medical-cost-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-cost-control/index.tsx | MedicalCostControlPage | 真实数据 | /api/v1/medical-cost-control；路由含硬编码 demo records | 63行 |

### medical-device-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-device-mgmt/index.tsx | MedicalDeviceMgmtPage | 真实数据 | /api/v1/medical-device-mgmt；路由含硬编码 demo records | 63行 |

### medical-dispute/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-dispute/index.tsx | MedicalDisputePage | 真实数据 | /api/v1/medical-dispute；路由含硬编码 demo records | 63行 |

### medical-dispute-mediation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-dispute-mediation-mgmt/index.tsx | MedicalDisputeMediationMgmtPage | 真实数据 | /api/v1/medical-dispute-mediation-mgmt；路由含硬编码 demo records | 63行 |

### medical-equipment-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-equipment-mgmt-detail/index.tsx | MedicalEquipmentMgmtDetailPage | 真实数据 | /api/v1/medical-equipment-mgmt-detail；路由含硬编码 demo records | 63行 |

### medical-equipment-purchase-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-equipment-purchase-mgmt/index.tsx | MedicalEquipmentPurchaseMgmtPage | 真实数据 | /api/v1/medical-equipment-purchase-mgmt；路由含硬编码 demo records | 63行 |

### medical-ethics/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-ethics/index.tsx | MedicalEthicsPage | 真实数据 | /api/v1/medical-ethics；路由含硬编码 demo records | 57行 |

### medical-ethics-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-ethics-mgmt/index.tsx | MedicalEthicsMgmtPage | 真实数据 | /api/v1/medical-ethics-mgmt；路由含硬编码 demo records | 63行 |

### medical-ethics-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-ethics-quality-mgmt/index.tsx | MedicalEthicsQualityMgmtPage | 真实数据 | /api/v1/medical-ethics-quality-mgmt；路由含硬编码 demo records | 63行 |

### medical-imaging-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-imaging-detail/index.tsx | MedicalImagingDetailPage | 真实数据 | /api/v1/medical-imaging-detail；路由含硬编码 demo records | 63行 |

### medical-insurance-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-insurance-detail/index.tsx | MedicalInsuranceDetailPage | 真实数据 | /api/v1/medical-insurance-detail；路由含硬编码 demo records | 63行 |

### medical-literature/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-literature/index.tsx | MedicalLiteraturePage | 真实数据 | /api/v1/medical-literature；路由含硬编码 demo records | 78行 |

### medical-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-quality/index.tsx | MedicalQualityPage | 真实数据 | /api/v1/medical-quality；路由含硬编码 demo records | 63行 |

### medical-quality-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-quality-v3/report/index.tsx | MedicalQualityV3Page | 真实数据 | /api/v1/medical-quality-v3/report；路由含硬编码 demo records | 103行 |

### medical-record/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record/index.tsx | MedicalRecordPage | 真实数据 | /api/v1/medical-record；路由含硬编码 demo records | 63行 |
| medical-record/report-v2/index.tsx | MedRecordMgmtV2Page | 真实数据 | /api/v1/medical-record/report-v2；路由含硬编码 demo records | 107行 |
| medical-record/report-v3/index.tsx | MedicalRecordV3Page | 真实数据 | /api/v1/medical-record/report-v3；路由含硬编码 demo records | 106行 |

### medical-record-archive-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-archive-mgmt/index.tsx | MedicalRecordArchiveMgmtPage | 真实数据 | /api/v1/medical-record-archive-mgmt；路由含硬编码 demo records | 63行 |

### medical-record-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-detail/index.tsx | MedicalRecordDetailPage | 真实数据 | /api/v1/medical-record-detail；路由含硬编码 demo records | 63行 |

### medical-record-integrity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-integrity/index.tsx | MedicalRecordIntegrityPage | 真实数据 | /api/v1/medical-record-integrity；路由含硬编码 demo records | 63行 |

### medical-record-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-mgmt/index.tsx | MedicalRecordMgmtPage | 真实数据 | /api/v1/medical-record-mgmt；路由含硬编码 demo records | 63行 |

### medical-record-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-quality/index.tsx | MedicalRecordQualityPage | 真实数据 | /api/v1/medical-record-quality；路由含硬编码 demo records | 63行 |

### medical-record-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-quality-mgmt/index.tsx | MedicalRecordQualityMgmtPage | 真实数据 | /api/v1/medical-record-quality-mgmt；路由含硬编码 demo records | 63行 |

### medical-record-timeliness/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-timeliness/index.tsx | MedicalRecordTimelinessPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 70行 |

### medical-record-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-record-v4/report/index.tsx | MedicalRecordV4Page | 真实数据 | /api/v1/medical-record-v4/report；路由含硬编码 demo records | 105行 |

### medical-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-safety/index.tsx | MedicalSafetyPage | 真实数据 | /api/v1/medical-safety；路由含硬编码 demo records | 63行 |

### medical-social-work-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-social-work-mgmt/index.tsx | MedicalSocialWorkMgmtPage | 真实数据 | /api/v1/medical-social-work-mgmt；路由含硬编码 demo records | 63行 |

### medical-waste/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-waste/index.tsx | MedicalWastePage | 真实数据 | /api/v1/medical-waste；路由含硬编码 demo records | 63行 |

### medical-waste-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-waste-mgmt/index.tsx | MedicalWasteMgmtPage | 真实数据 | /api/v1/medical-waste-mgmt；路由含硬编码 demo records | 63行 |

### medical-waste-mgmt-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-waste-mgmt-quality/index.tsx | MedicalWasteMgmtQualityPage | 真实数据 | /api/v1/medical-waste-mgmt-quality；路由含硬编码 demo records | 63行 |

### medical-waste-traceability-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-waste-traceability-quality-mgmt/index.tsx | MedicalWasteTraceabilityQualityMgmtPage | 真实数据 | /api/v1/medical-waste-traceability-quality-mgmt；路由含硬编码 demo records | 63行 |

### medical-waste-tracking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medical-waste-tracking/index.tsx | MedicalWasteTrackingPage | 真实数据 | /api/v1/medical-waste-tracking；路由含硬编码 demo records | 63行 |

### medicalQc/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medicalQc/index.tsx | MedicalQcPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 97行 |

### medication-error-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medication-error-report/index.tsx | MedicationErrorReportPage | 真实数据 | /api/v1/medication-error-report；路由含硬编码 demo records | 63行 |

### medication-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medication-quality-mgmt/index.tsx | MedicationQualityMgmtPage | 真实数据 | /api/v1/medication-quality-mgmt；路由含硬编码 demo records | 63行 |

### medication-reconciliation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medication-reconciliation/index.tsx | MedicationReconciliationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 110行 |

### medication-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medication-safety/index.tsx | MedicationSafetyPage | 真实数据 | /api/v1/medication-safety；路由含硬编码 demo records | 63行 |

### medmuse/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| medmuse/AgentHealth/index.tsx | AgentHealthPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 157行 |
| medmuse/Approvals/index.tsx | MedmuseApprovalsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 219行 |
| medmuse/DeptCockpit/index.tsx | DeptCockpitPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 119行 |

### meeting-room-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| meeting-room-mgmt/index.tsx | MeetingRoomMgmtPage | 真实数据 | /api/v1/meeting-room-mgmt；路由含硬编码 demo records | 63行 |

### mentor-match/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mentor-match/index.tsx | MentorMatchPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### metaverse-hospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| metaverse-hospital/report/index.tsx | MetaverseHospitalPage | 真实数据 | /api/v1/metaverse-hospital/report；路由含硬编码 demo records | 103行 |

### metaverse-hospital-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| metaverse-hospital-v2/report/index.tsx | MetaverseHospitalV2Page | 真实数据 | /api/v1/metaverse-hospital-v2/report；路由含硬编码 demo records | 102行 |

### microservice/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| microservice/report-v2/index.tsx | MicroserviceV2Page | 真实数据 | /api/v1/microservice/report-v2；路由含硬编码 demo records | 106行 |

### mlops-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mlops-v5/report/index.tsx | MLOpsV5Page | 真实数据 | /api/v1/mlops-v5/report；路由含硬编码 demo records | 107行 |

### mobile/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mobile/QuickActions/index.tsx | MobileQuickActions | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 170行 |
| mobile/StaffHome/index.tsx | MobileStaffHome | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 434行 |

### mobile-health/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mobile-health/index.tsx | MobileHealthPage | 真实数据 | /api/v1/mobile-health/report；路由含硬编码 demo records | 113行 |
| mobile-health/report-v2/index.tsx | MobileHealthV2Page | 真实数据 | /api/v1/mobile-health/report-v2；路由含硬编码 demo records | 106行 |

### mobile-health-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mobile-health-v3/report/index.tsx | MobileHealthV3Page | 真实数据 | /api/v1/mobile-health-v3/report；路由含硬编码 demo records | 104行 |

### model-router/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| model-router/index.tsx | ModelRouterPage | 真实数据 | /api/v1/model-router；路由含硬编码 demo records | 54行 |

### morning-brief/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| morning-brief/index.tsx | MorningBriefPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### mr-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mr-quality/report-v2/index.tsx | MRQualityV2Page | 真实数据 | /api/v1/mr-quality/report-v2；路由含硬编码 demo records | 105行 |

### mrq-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| mrq-quality/index.tsx | MrqQualityPage | 真实数据 | /api/v1/mrq-quality；路由含硬编码 demo records | 63行 |

### multi-campus-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| multi-campus-v5/report/index.tsx | MultiCampusV5Page | 真实数据 | /api/v1/multi-campus-v5/report；路由含硬编码 demo records | 52行 |

### muse/ （17 页：OK 17 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse/Admin/index.tsx | AdminMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 334行 |
| muse/AdminMuse/index.tsx | AdminMuseAgentPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 376行 |
| muse/Ask/index.tsx | MuseAskPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 288行 |
| muse/DeptCurve/index.tsx | DeptCurvePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 405行 |
| muse/DoctorMuse/index.tsx | DoctorMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 471行 |
| muse/Growth/index.tsx | DoctorGrowthPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 415行 |
| muse/Home/index.tsx | MuseHomePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 322行 |
| muse/Hospital/index.tsx | HospitalWisdomPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 368行 |
| muse/LessonNew/index.tsx | LessonNewPage | 真实数据 | /api/v1/muse/lesson | 222行 |
| muse/MonthlyReport/index.tsx | MonthlyReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 362行 |
| muse/Nurse/index.tsx | MuseNursePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 290行 |
| muse/NurseMuse/index.tsx | NurseMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 352行 |
| muse/Onboarding/index.tsx | OnboardingPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 274行 |
| muse/Patterns/index.tsx | ExperiencePatternsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 304行 |
| muse/Pharma/index.tsx | PharmaMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 302行 |
| muse/Search/index.tsx | MuseSearchPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 211行 |
| muse/SystemIntelligence/index.tsx | SystemIntelligencePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 363行 |

### muse-ab/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-ab/index.tsx | MuseAbPage | 真实数据 | /api/v1/muse-ab；路由含硬编码 demo records | 52行 |

### muse-cross-role-learning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-cross-role-learning/index.tsx | MuseCrossRoleLearningPage | 真实数据 | /api/v1/muse-cross-role-learning；路由含硬编码 demo records | 63行 |

### muse-doctor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-doctor/index.tsx | MuseDoctorPage | 真实数据 | /api/v1/muse-doctor；路由含硬编码 demo records | 66行 |

### muse-experience/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-experience/index.tsx | MUSEExperiencePage | 真实数据 | /api/v1/muse-experience；路由含硬编码 demo records | 75行 |

### muse-feedback/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-feedback/index.tsx | MuseFeedbackPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### muse-flywheel-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-flywheel-overview/index.tsx | MuseFlywheelOverviewPage | 真实数据 | /api/v1/muse-flywheel-overview；路由含硬编码 demo records | 82行 |

### muse-handoff/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-handoff/index.tsx | MuseHandoffPage | 真实数据 | /api/v1/muse-handoff/pending；路由含硬编码 demo records | 52行 |

### muse-interception/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-interception/index.tsx | MuseInterceptionPage | 真实数据 | /api/v1/muse-interception；路由含硬编码 demo records | 54行 |

### muse-manager/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-manager/index.tsx | MuseManagerPage | 真实数据 | /api/v1/muse-manager；路由含硬编码 demo records | 52行 |

### muse-model-version/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-model-version/index.tsx | MuseModelVersionPage | 真实数据 | /api/v1/muse-model-version；路由含硬编码 demo records | 77行 |

### muse-nurse/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-nurse/index.tsx | MuseNursePage | 真实数据 | /api/v1/muse-nurse；路由含硬编码 demo records | 52行 |

### muse-patient/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-patient/index.tsx | MusePatientPage | 真实数据 | /api/v1/muse-patient；路由含硬编码 demo records | 50行 |

### muse-pharmacist/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-pharmacist/index.tsx | MusePharmacistPage | 真实数据 | /api/v1/muse-pharmacist；路由含硬编码 demo records | 52行 |

### muse-reminder/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-reminder/index.tsx | MuseReminderPage | 真实数据 | /api/v1/muse-reminder/logs；路由含硬编码 demo records | 52行 |

### muse-roi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-roi/index.tsx | MuseRoiPage | 真实数据 | /api/v1/muse-roi；路由含硬编码 demo records | 54行 |

### muse-roi-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-roi-report/index.tsx | MuseRoiReportPage | 真实数据 | /api/v1/muse-roi-report；路由含硬编码 demo records | 74行 |

### muse-skills/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-skills/index.tsx | MuseSkillsPage | 真实数据 | /api/v1/muse-skills；路由含硬编码 demo records | 50行 |

### muse-training-data/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-training-data/index.tsx | MuseTrainingDataPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### muse-value/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| muse-value/index.tsx | MuseValuePage | 真实数据 | /api/v1/muse-value；路由含硬编码 demo records | 54行 |

### national-exam-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| national-exam-v5/report/index.tsx | NationalExamV5Page | 真实数据 | /api/v1/national-exam-v5/report；路由含硬编码 demo records | 108行 |

### neonatal-care-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| neonatal-care-mgmt/index.tsx | NeonatalCareMgmtPage | 真实数据 | /api/v1/neonatal-care-mgmt；路由含硬编码 demo records | 63行 |

### nephrology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nephrology-v5/report/index.tsx | NephrologyV5Page | 真实数据 | /api/v1/nephrology-v5/report；路由含硬编码 demo records | 107行 |

### network-security/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| network-security/index.tsx | NetworkSecurityPage | 真实数据 | /api/v1/network-security；路由含硬编码 demo records | 63行 |

### network-security-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| network-security-mgmt/index.tsx | NetworkSecurityMgmtPage | 真实数据 | /api/v1/network-security-mgmt；路由含硬编码 demo records | 63行 |

### network-security-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| network-security-quality-mgmt/index.tsx | NetworkSecurityQualityMgmtPage | 真实数据 | /api/v1/network-security-quality-mgmt；路由含硬编码 demo records | 63行 |

### neuro-psych-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| neuro-psych-v5/report/index.tsx | NeuroPsychV5Page | 真实数据 | /api/v1/neuro-psych-v5/report；路由含硬编码 demo records | 106行 |

### newborn-care/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| newborn-care/index.tsx | NewbornCarePage | 真实数据 | /api/v1/newborn-care；路由含硬编码 demo records | 63行 |

### newborn-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| newborn-mgmt/index.tsx | NewbornMgmtPage | 真实数据 | /api/v1/newborn-mgmt；路由含硬编码 demo records | 63行 |

### nissReporting/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nissReporting/index.tsx | NissReportingPage | 真实数据 | /api/v1/niss；路由含硬编码 demo records | 57行 |

### no-show-rate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| no-show-rate/index.tsx | NoShowRatePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 86行 |

### nosocomial-infection/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nosocomial-infection/index.tsx | NosocomialInfectionPage | 真实数据 | /api/v1/nosocomial-infection；路由含硬编码 demo records | 51行 |

### notification/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| notification/Center/index.tsx | NotificationCenterPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 337行 |
| notification/index.tsx | NotificationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 54行 |

### nurse-muse-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nurse-muse-usage/index.tsx | NurseMuseUsagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 64行 |

### nurse-patient-ratio/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nurse-patient-ratio/index.tsx | NursePatientRatioPage | 真实数据 | /api/v1/nurse-patient-ratio；路由含硬编码 demo records | 63行 |

### nurse-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nurse-satisfaction/index.tsx | NurseSatisfactionPage | 真实数据 | /api/v1/nurse-satisfaction；路由含硬编码 demo records | 58行 |

### nurse-workload/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nurse-workload/index.tsx | NurseWorkloadPage | 真实数据 | /api/v1/nurse-workload；路由含硬编码 demo records | 57行 |

### nurseStation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nurseStation/index.tsx | NurseStationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 95行 |

### nursing/ （5 页：OK 5 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing/BedMap/index.tsx | BedMapPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 191行 |
| nursing/Handoff/index.tsx | NurseHandoffPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 181行 |
| nursing/NqiDashboard/index.tsx | NqiDashboardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 100行 |
| nursing/report-v2/index.tsx | NursingV2Page | 真实数据 | /api/v1/nursing/report-v2；路由含硬编码 demo records | 105行 |
| nursing/report-v3/index.tsx | NursingV3Page | 真实数据 | /api/v1/nursing/report-v3；路由含硬编码 demo records | 107行 |

### nursing-care-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-care-quality/index.tsx | NursingCareQualityPage | 真实数据 | /api/v1/nursing-care-quality；路由含硬编码 demo records | 63行 |

### nursing-communication/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-communication/index.tsx | NursingCommunicationPage | 真实数据 | /api/v1/nursing-communication；路由含硬编码 demo records | 63行 |

### nursing-document/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-document/index.tsx | NursingDocumentPage | 真实数据 | /api/v1/nursing-document；路由含硬编码 demo records | 63行 |

### nursing-document-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-document-stats/index.tsx | NursingDocumentStatsPage | 真实数据 | /api/v1/nursing-document-stats；路由含硬编码 demo records | 63行 |

### nursing-education/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-education/index.tsx | NursingEducationPage | 真实数据 | /api/v1/nursing-education；路由含硬编码 demo records | 63行 |

### nursing-handover/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-handover/index.tsx | NursingHandoverPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### nursing-infection-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-infection-control/index.tsx | NursingInfectionControlPage | 真实数据 | /api/v1/nursing-infection-control；路由含硬编码 demo records | 63行 |

### nursing-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-management/index.tsx | NursingManagementPage | 真实数据 | /api/v1/nursing-management；路由含硬编码 demo records | 63行 |

### nursing-management-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-management-detail/index.tsx | NursingManagementDetailPage | 真实数据 | /api/v1/nursing-management-detail；路由含硬编码 demo records | 63行 |

### nursing-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-quality/index.tsx | NursingQualityPage | 真实数据 | /api/v1/nursing-quality；路由含硬编码 demo records | 63行 |

### nursing-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-quality-mgmt/index.tsx | NursingQualityMgmtPage | 真实数据 | /api/v1/nursing-quality-mgmt；路由含硬编码 demo records | 63行 |

### nursing-quality-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-quality-stats/index.tsx | NursingQualityStatsPage | 真实数据 | /api/v1/nursing-quality-stats；路由含硬编码 demo records | 63行 |

### nursing-quality-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-quality-v3/report/index.tsx | NursingQualityV3Page | 真实数据 | /api/v1/nursing-quality-v3/report；路由含硬编码 demo records | 103行 |

### nursing-record-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-record-quality/index.tsx | NursingRecordQualityPage | 真实数据 | /api/v1/nursing-record-quality；路由含硬编码 demo records | 63行 |

### nursing-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-safety/index.tsx | NursingSafetyPage | 真实数据 | /api/v1/nursing-safety；路由含硬编码 demo records | 63行 |

### nursing-sensitive-index/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-sensitive-index/index.tsx | NursingSensitiveIndexPage | 真实数据 | /api/v1/nursing-sensitive-index；路由含硬编码 demo records | 63行 |

### nursing-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-service/index.tsx | NursingServicePage | 真实数据 | /api/v1/nursing-service；路由含硬编码 demo records | 63行 |

### nursing-service-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-service-detail/index.tsx | NursingServiceDetailPage | 真实数据 | /api/v1/nursing-service-detail；路由含硬编码 demo records | 63行 |

### nursing-service-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-service-mgmt/index.tsx | NursingServiceMgmtPage | 真实数据 | /api/v1/nursing-service-mgmt；路由含硬编码 demo records | 63行 |

### nursing-staff/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-staff/index.tsx | NursingStaffPage | 真实数据 | /api/v1/nursing-staff；路由含硬编码 demo records | 63行 |

### nursing-staffing/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-staffing/index.tsx | NursingStaffingPage | 真实数据 | /api/v1/nursing-staffing；路由含硬编码 demo records | 63行 |

### nursing-staffing-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-staffing-mgmt/index.tsx | NursingStaffingMgmtPage | 真实数据 | /api/v1/nursing-staffing-mgmt；路由含硬编码 demo records | 63行 |

### nursing-staffing-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-staffing-stats/index.tsx | NursingStaffingStatsPage | 真实数据 | /api/v1/nursing-staffing-stats；路由含硬编码 demo records | 63行 |

### nursing-training/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-training/index.tsx | NursingTrainingPage | 真实数据 | /api/v1/nursing-training；路由含硬编码 demo records | 63行 |

### nursing-training-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-training-mgmt/index.tsx | NursingTrainingMgmtPage | 真实数据 | /api/v1/nursing-training-mgmt；路由含硬编码 demo records | 63行 |

### nursing-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursing-v4/report/index.tsx | NursingV4Page | 真实数据 | /api/v1/nursing-v4/report；路由含硬编码 demo records | 105行 |

### nursingAdmin/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursingAdmin/index.tsx | NursingAdminPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 516行 |

### nursingIo/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursingIo/index.tsx | NursingIoPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 77行 |

### nursingRisk/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nursingRisk/index.tsx | NursingRiskPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 509行 |

### nutrition/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutrition/report/index.tsx | NutritionReportPage | 真实数据 | /api/v1/nutrition/report；路由含硬编码 demo records | 106行 |

### nutrition-kitchen/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutrition-kitchen/index.tsx | NutritionKitchenPage | 真实数据 | /api/v1/nutrition-kitchen；路由含硬编码 demo records | 63行 |

### nutrition-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutrition-mgmt/index.tsx | NutritionMgmtPage | 真实数据 | /api/v1/nutrition-mgmt；路由含硬编码 demo records | 63行 |

### nutrition-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutrition-quality-mgmt/index.tsx | NutritionQualityMgmtPage | 真实数据 | /api/v1/nutrition-quality-mgmt；路由含硬编码 demo records | 63行 |

### nutritionConsult/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutritionConsult/index.tsx | NutritionConsultPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 76行 |

### nutritionScreening/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| nutritionScreening/index.tsx | NutritionScreeningPage | 真实数据 | /api/v1/nutrition-screenings；路由含硬编码 demo records | 70行 |

### oa/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| oa/Approvals/index.tsx | ApprovalsPage | 真实数据 | /api/v1/oa/approvals；路由含硬编码 demo records | 279行 |

### ob-gyn-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ob-gyn-v5/report/index.tsx | ObGynV5Page | 真实数据 | /api/v1/ob-gyn-v5/report；路由含硬编码 demo records | 107行 |

### occupational-environmental-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| occupational-environmental-v3/report/index.tsx | OccupationalEnvironmentalV3Page | 真实数据 | /api/v1/occupational-environmental-v3/report；路由含硬编码 demo records | 104行 |

### occupational-environmental-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| occupational-environmental-v4/report/index.tsx | OccupationalEnvironmentalV4Page | 真实数据 | /api/v1/occupational-environmental-v4/report；路由含硬编码 demo records | 104行 |

### occupational-health/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| occupational-health/report/index.tsx | OccupationalHealthPage | 真实数据 | /api/v1/occupational-health/report；路由含硬编码 demo records | 107行 |

### omnichannel-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| omnichannel-v5/report/index.tsx | OmnichannelV5Page | 真实数据 | /api/v1/omnichannel-v5/report；路由含硬编码 demo records | 107行 |

### oncology/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| oncology/index.tsx | OncologyPage | 真实数据 | /api/v1/oncology/cycles；路由含硬编码 demo records | 44行 |

### oncology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| oncology-v5/report/index.tsx | OncologyV5Page | 真实数据 | /api/v1/oncology-v5/report；路由含硬编码 demo records | 108行 |

### online-payment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| online-payment/index.tsx | OnlinePaymentPage | 真实数据 | /api/v1/online-payment；路由含硬编码 demo records | 63行 |

### online-payment-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| online-payment-detail/index.tsx | OnlinePaymentDetailPage | 真实数据 | /api/v1/online-payment-detail；路由含硬编码 demo records | 63行 |

### opd/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| opd/Workstation/index.tsx | OpdWorkstationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 203行 |

### operating-cost-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operating-cost-mgmt/index.tsx | OperatingCostMgmtPage | 真实数据 | /api/v1/operating-cost-mgmt；路由含硬编码 demo records | 63行 |

### operating-room/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operating-room/index.tsx | OperatingRoomPage | 真实数据 | /api/v1/operating-room；路由含硬编码 demo records | 65行 |

### operating-room-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operating-room-quality-mgmt/index.tsx | OperatingRoomQualityMgmtPage | 真实数据 | /api/v1/operating-room-quality-mgmt；路由含硬编码 demo records | 63行 |

### operation/ （1 页：OK 0 / SHELL 1 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operation/index.tsx | OperationOverviewPage | 空壳 | 无数据获取、无内置列表 | 14行 |

### operation-dashboard/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operation-dashboard/index.tsx | OperationDashboardPage | 真实数据 | /api/v1/operation-dashboard；路由含硬编码 demo records | 63行 |

### operation-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operation-mgmt/index.tsx | OperationMgmtPage | 真实数据 | /api/v1/operation-mgmt；路由含硬编码 demo records | 63行 |

### operation-room-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operation-room-mgmt/index.tsx | OperationRoomMgmtPage | 真实数据 | /api/v1/operation-room-mgmt；路由含硬编码 demo records | 63行 |

### operations/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operations/report-v3/index.tsx | OperationsV3Page | 真实数据 | /api/v1/operations/report-v3；路由含硬编码 demo records | 107行 |

### operations-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operations-ai-v2/report/index.tsx | OperationsAIV2Page | 真实数据 | /api/v1/operations-ai-v2/report；路由含硬编码 demo records | 105行 |

### operations-analysis-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| operations-analysis-v4/report/index.tsx | OperationsAnalysisV4Page | 真实数据 | /api/v1/operations-analysis-v4/report；路由含硬编码 demo records | 107行 |

### ops/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops/MonthlyReport/index.tsx | MonthlyReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 98行 |
| ops/report-v2/index.tsx | OpsV2Page | 真实数据 | /api/v1/ops/report-v2；路由含硬编码 demo records | 107行 |

### ops-dashboard-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-dashboard-v3/report/index.tsx | OpsDashboardV3Page | 真实数据 | /api/v1/ops-dashboard-v3/report；路由含硬编码 demo records | 103行 |

### ops-dashboard-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-dashboard-v4/report/index.tsx | OpsDashboardV4Page | 真实数据 | /api/v1/ops-dashboard-v4/report；路由含硬编码 demo records | 103行 |

### ops-dr/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-dr/index.tsx | OpsDrPage | 真实数据 | /api/v1/ops-dr；路由含硬编码 demo records | 77行 |

### ops-monitoring/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-monitoring/index.tsx | OpsMonitoringPage | 真实数据 | /api/v1/ops-monitoring；路由含硬编码 demo records | 52行 |

### ops-perf/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-perf/index.tsx | OpsPerfPage | 真实数据 | /api/v1/ops-perf；路由含硬编码 demo records | 76行 |

### ops-release/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-release/index.tsx | OpsReleasePage | 真实数据 | /api/v1/ops-release；路由含硬编码 demo records | 77行 |

### ops-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ops-v3/report/index.tsx | OpsV3Page | 真实数据 | /api/v1/ops-v3/report；路由含硬编码 demo records | 104行 |

### order-set-compliance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| order-set-compliance/index.tsx | OrderSetCompliancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### ot-scheduling-conflict/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ot-scheduling-conflict/index.tsx | OtSchedulingConflictPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 88行 |

### outpatient/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient/report-v2/index.tsx | OutpatientV2Page | 真实数据 | /api/v1/outpatient/report-v2；路由含硬编码 demo records | 106行 |

### outpatient-ai-loop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-ai-loop-v5/report/index.tsx | OutpatientAILoopV5Page | 真实数据 | /api/v1/outpatient-ai-loop-v5/report；路由含硬编码 demo records | 104行 |

### outpatient-avg-cost/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-avg-cost/index.tsx | OutpatientAvgCostPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 76行 |

### outpatient-billing-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-billing-mgmt/index.tsx | OutpatientBillingMgmtPage | 真实数据 | /api/v1/outpatient-billing-mgmt；路由含硬编码 demo records | 63行 |

### outpatient-dressing-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-dressing-mgmt/index.tsx | OutpatientDressingMgmtPage | 真实数据 | /api/v1/outpatient-dressing-mgmt；路由含硬编码 demo records | 63行 |

### outpatient-flow-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-flow-forecast/index.tsx | OutpatientFlowForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 96行 |

### outpatient-inpatient-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-inpatient-v4/report/index.tsx | OutpatientInpatientV4Page | 真实数据 | /api/v1/outpatient-inpatient-v4/report；路由含硬编码 demo records | 106行 |

### outpatient-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-mgmt-detail/index.tsx | OutpatientMgmtDetailPage | 真实数据 | /api/v1/outpatient-mgmt-detail；路由含硬编码 demo records | 63行 |

### outpatient-minor-surgery-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-minor-surgery-mgmt/index.tsx | OutpatientMinorSurgeryMgmtPage | 真实数据 | /api/v1/outpatient-minor-surgery-mgmt；路由含硬编码 demo records | 63行 |

### outpatient-pharmacy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-pharmacy/index.tsx | OutpatientPharmacyPage | 真实数据 | /api/v1/outpatient-pharmacy；路由含硬编码 demo records | 63行 |

### outpatient-process-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-process-mgmt/index.tsx | OutpatientProcessMgmtPage | 真实数据 | /api/v1/outpatient-process-mgmt；路由含硬编码 demo records | 63行 |

### outpatient-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-quality/index.tsx | OutpatientQualityPage | 真实数据 | /api/v1/outpatient-quality；路由含硬编码 demo records | 63行 |

### outpatient-record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-record/index.tsx | OutpatientRecordPage | 真实数据 | /api/v1/outpatient-record；路由含硬编码 demo records | 51行 |

### outpatient-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-service/index.tsx | OutpatientServicePage | 真实数据 | /api/v1/outpatient-service；路由含硬编码 demo records | 63行 |

### outpatient-treatment-room-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-treatment-room-mgmt/index.tsx | OutpatientTreatmentRoomMgmtPage | 真实数据 | /api/v1/outpatient-treatment-room-mgmt；路由含硬编码 demo records | 63行 |

### outpatient-wait/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| outpatient-wait/index.tsx | OutpatientWaitPage | 真实数据 | /api/v1/outpatient-wait；路由含硬编码 demo records | 69行 |

### oxygen-supply/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| oxygen-supply/index.tsx | OxygenSupplyPage | 真实数据 | /api/v1/oxygen-supply；路由含硬编码 demo records | 63行 |

### pacuRecord/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pacuRecord/index.tsx | PacuRecordPage | 真实数据 | /api/v1/pacu-records；路由含硬编码 demo records | 55行 |

### pain/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pain/report/index.tsx | PainReportPage | 真实数据 | /api/v1/pain/report；路由含硬编码 demo records | 107行 |

### painAssessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| painAssessment/index.tsx | PainAssessmentPage | 真实数据 | /api/v1/pain-assessments；路由含硬编码 demo records | 47行 |

### painClinic/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| painClinic/index.tsx | PainClinicPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 77行 |

### palliative-care/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| palliative-care/index.tsx | PalliativeCarePage | 真实数据 | /api/v1/palliative-care；路由含硬编码 demo records | 63行 |

### parking/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| parking/index.tsx | ParkingPage | 真实数据 | /api/v1/parking；路由含硬编码 demo records | 57行 |

### parking-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| parking-mgmt/index.tsx | ParkingMgmtPage | 真实数据 | /api/v1/parking-mgmt；路由含硬编码 demo records | 63行 |

### party-admin/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| party-admin/report/index.tsx | PartyAdminReportPage | 真实数据 | /api/v1/party-admin/report；路由含硬编码 demo records | 107行 |

### party-building/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| party-building/report-v2/index.tsx | PartyBuildingV2Page | 真实数据 | /api/v1/party-building/report-v2；路由含硬编码 demo records | 107行 |

### party-building-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| party-building-mgmt/index.tsx | PartyBuildingMgmtPage | 真实数据 | /api/v1/party-building-mgmt；路由含硬编码 demo records | 63行 |

### party-building-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| party-building-v3/report/index.tsx | PartyBuildingV3Page | 真实数据 | /api/v1/party-building-v3/report；路由含硬编码 demo records | 103行 |

### patent/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patent/index.tsx | PatentPage | 真实数据 | /api/v1/patent；路由含硬编码 demo records | 63行 |

### pathology/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology/report-v2/index.tsx | PathologyV2Page | 真实数据 | /api/v1/pathology/report-v2；路由含硬编码 demo records | 107行 |

### pathology-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-mgmt/index.tsx | PathologyMgmtPage | 真实数据 | /api/v1/pathology-mgmt；路由含硬编码 demo records | 63行 |

### pathology-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-quality/index.tsx | PathologyQualityPage | 真实数据 | /api/v1/pathology-quality；路由含硬编码 demo records | 63行 |

### pathology-quality-control/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-quality-control/index.tsx | PathologyQualityControlPage | 真实数据 | /api/v1/pathology-quality-control；路由含硬编码 demo records | 63行 |

### pathology-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-quality-mgmt/index.tsx | PathologyQualityMgmtPage | 真实数据 | /api/v1/pathology-quality-mgmt；路由含硬编码 demo records | 63行 |

### pathology-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-service/index.tsx | PathologyServicePage | 真实数据 | /api/v1/pathology-service；路由含硬编码 demo records | 63行 |

### pathology-turnaround/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathology-turnaround/index.tsx | PathologyTurnaroundPage | 真实数据 | /api/v1/pathology-turnaround；路由含硬编码 demo records | 63行 |

### pathway/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pathway/index.tsx | PathwayPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 665行 |

### patient/ （19 页：OK 19 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient/Chronic/index.tsx | ChronicManagementPage | 真实数据 | /api/v1/patient/chronic/overview；路由含硬编码 demo records | 259行 |
| patient/Feedback/index.tsx | PatientFeedbackPage | 真实数据 | /api/v1/patient/feedback；路由含硬编码 demo records | 171行 |
| patient/Guide/index.tsx | PatientGuidePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 354行 |
| patient/HealthPlan/index.tsx | HealthPlanPage | 真实数据 | /api/v1/patient/health-plan/track | 369行 |
| patient/LabExplain/index.tsx | LabExplainPage | 真实数据 | /api/v1/patient/lab-explain；路由含硬编码 demo records | 213行 |
| patient/Mobile/index.tsx | PatientMobileHomePage | 真实数据 | /api/v1/patient/mobile/home；路由含硬编码 demo records | 251行 |
| patient/Muse/index.tsx | PatientMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 275行 |
| patient/PatientDeep/index.tsx | PatientDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 370行 |
| patient/PatientJourney/index.tsx | PatientJourneyPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 434行 |
| patient/PatientMuse/index.tsx | PatientMusePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 363行 |
| patient/Reminders/index.tsx | PatientRemindersPage | 真实数据 | /api/v1/patient/reminders；路由含硬编码 demo records | 139行 |
| patient/SatisfactionDeep/index.tsx | SatisfactionDeepPage | 真实数据 | /api/v1/patient/satisfaction/deep；路由含硬编码 demo records | 462行 |
| patient/SatisfactionLoop/index.tsx | SatisfactionLoopPage | 真实数据 | /api/v1/patient/satisfaction/loop；路由含硬编码 demo records | 341行 |
| patient/ServiceCenter/index.tsx | PatientServiceCenterPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 356行 |
| patient/SmartTriage/index.tsx | SmartTriagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 281行 |
| patient/consult/Online/index.tsx | OnlineConsultPage | 真实数据 | /api/v1/consult/create；路由含硬编码 demo records | 309行 |
| patient/education/List/index.tsx | PatientEducationListPage | 真实数据 | /api/v1/patient/education/push；路由含硬编码 demo records | 278行 |
| patient/h5/Home/index.tsx | PatientH5HomePage | 真实数据 | /api/v1/patient/h5/home；路由含硬编码 demo records | 448行 |
| patient/service/Center/index.tsx | PatientServiceCenterPage | 真实数据 | /api/v1/patient/service/create；路由含硬编码 demo records | 247行 |

### patient-companion-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-companion-v5/report/index.tsx | PatientCompanionV5Page | 真实数据 | /api/v1/patient-companion-v5/report；路由含硬编码 demo records | 106行 |

### patient-complaint/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-complaint/index.tsx | PatientComplaintPage | 真实数据 | /api/v1/patient-complaint；路由含硬编码 demo records | 75行 |

### patient-education-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-education-detail/index.tsx | PatientEducationDetailPage | 真实数据 | /api/v1/patient-education-detail；路由含硬编码 demo records | 63行 |

### patient-education-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-education-stats/index.tsx | PatientEducationStatsPage | 真实数据 | /api/v1/patient-education-stats；路由含硬编码 demo records | 75行 |

### patient-experience/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-experience/index.tsx | PatientExperiencePage | 真实数据 | /api/v1/patient-experience；路由含硬编码 demo records | 63行 |
| patient-experience/report-v2/index.tsx | PatientExperienceV2Page | 真实数据 | /api/v1/patient-experience/report-v2；路由含硬编码 demo records | 106行 |

### patient-experience-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-experience-ai-v2/report/index.tsx | PatientExperienceAIV2Page | 真实数据 | /api/v1/patient-experience-ai-v2/report；路由含硬编码 demo records | 104行 |

### patient-experience-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-experience-stats/index.tsx | PatientExperienceStatsPage | 真实数据 | /api/v1/patient-experience-stats；路由含硬编码 demo records | 63行 |

### patient-experience-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-experience-v3/report/index.tsx | PatientExperienceV3Page | 真实数据 | /api/v1/patient-experience-v3/report；路由含硬编码 demo records | 103行 |

### patient-experience-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-experience-v5/report/index.tsx | PatientExperienceV5Page | 真实数据 | /api/v1/patient-experience-v5/report；路由含硬编码 demo records | 107行 |

### patient-flow/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-flow/index.tsx | PatientFlowPage | 真实数据 | /api/v1/patient-flow；路由含硬编码 demo records | 63行 |

### patient-flow-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-flow-detail/index.tsx | PatientFlowDetailPage | 真实数据 | /api/v1/patient-flow-detail；路由含硬编码 demo records | 63行 |

### patient-follow-up/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-follow-up/index.tsx | PatientFollowUpPage | 真实数据 | /api/v1/patient-follow-up；路由含硬编码 demo records | 66行 |

### patient-identification/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-identification/index.tsx | PatientIdentificationPage | 真实数据 | /api/v1/patient-identification；路由含硬编码 demo records | 63行 |

### patient-muse-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-muse-usage/index.tsx | PatientMuseUsagePage | 真实数据 | /api/v1/patient-muse-usage；路由含硬编码 demo records | 65行 |

### patient-portal-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-portal-usage/index.tsx | PatientPortalUsagePage | 真实数据 | /api/v1/patient-portal-usage；路由含硬编码 demo records | 74行 |

### patient-privacy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-privacy/index.tsx | PatientPrivacyPage | 真实数据 | /api/v1/patient-privacy；路由含硬编码 demo records | 63行 |

### patient-profile/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-profile/report-v2/index.tsx | PatientProfileV2Page | 真实数据 | /api/v1/patient-profile/report-v2；路由含硬编码 demo records | 106行 |

### patient-profile-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-profile-v3/report/index.tsx | PatientProfileV3Page | 真实数据 | /api/v1/patient-profile-v3/report；路由含硬编码 demo records | 107行 |

### patient-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-safety/report-v2/index.tsx | PatientSafetyV2Page | 真实数据 | /api/v1/patient-safety/report-v2；路由含硬编码 demo records | 106行 |

### patient-safety-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-safety-mgmt/index.tsx | PatientSafetyMgmtPage | 真实数据 | /api/v1/patient-safety-mgmt；路由含硬编码 demo records | 63行 |

### patient-safety-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-safety-overview/index.tsx | PatientSafetyOverviewPage | 真实数据 | /api/v1/patient-safety-overview；路由含硬编码 demo records | 78行 |

### patient-safety-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-safety-stats/index.tsx | PatientSafetyStatsPage | 真实数据 | /api/v1/patient-safety-stats；路由含硬编码 demo records | 63行 |

### patient-safety-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-safety-v3/report/index.tsx | PatientSafetyV3Page | 真实数据 | /api/v1/patient-safety-v3/report；路由含硬编码 demo records | 107行 |

### patient-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-satisfaction/index.tsx | PatientSatisfactionPage | 真实数据 | /api/v1/patient-satisfaction；路由含硬编码 demo records | 69行 |

### patient-satisfaction-score/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-satisfaction-score/index.tsx | PatientSatisfactionScorePage | 真实数据 | /api/v1/patient-satisfaction-score；路由含硬编码 demo records | 63行 |

### patient-satisfaction-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-satisfaction-stats/index.tsx | PatientSatisfactionStatsPage | 真实数据 | /api/v1/patient-satisfaction-stats；路由含硬编码 demo records | 57行 |

### patient-satisfaction-survey/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-satisfaction-survey/index.tsx | PatientSatisfactionSurveyPage | 真实数据 | /api/v1/patient-satisfaction-survey；路由含硬编码 demo records | 85行 |

### patient-service/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-service/index.tsx | PatientServicePage | 真实数据 | /api/v1/patient-service；路由含硬编码 demo records | 63行 |
| patient-service/report-v3/index.tsx | PatientServiceV3Page | 真实数据 | /api/v1/patient-service/report-v3；路由含硬编码 demo records | 106行 |

### patient-service-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-service-ai-v2/report/index.tsx | PatientServiceAIV2Page | 真实数据 | /api/v1/patient-service-ai-v2/report；路由含硬编码 demo records | 107行 |

### patient-service-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-service-v4/report/index.tsx | PatientServiceV4Page | 真实数据 | /api/v1/patient-service-v4/report；路由含硬编码 demo records | 107行 |

### patient-tips/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-tips/index.tsx | PatientTipsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 62行 |

### patient-wait-time/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patient-wait-time/index.tsx | PatientWaitTimePage | 真实数据 | /api/v1/patient-wait-time；路由含硬编码 demo records | 64行 |

### patientBilling/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patientBilling/index.tsx | PatientBillingPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### patientChronic/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patientChronic/index.tsx | PatientChronicPage | 真实数据 | /api/v1/patient/chronic；路由含硬编码 demo records | 36行 |

### patientPortal/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patientPortal/Workbench/index.tsx | PatientWorkbenchPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 240行 |
| patientPortal/index.tsx | PatientPortalPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 36行 |

### patients/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| patients/Patient360/index.tsx | Patient360TimelinePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 248行 |
| patients/index.tsx | PatientList | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 121行 |

### paymentSelection/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| paymentSelection/index.tsx | PaymentSelectionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 51行 |

### pediatric-care/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pediatric-care/index.tsx | PediatricCarePage | 真实数据 | /api/v1/pediatric-care；路由含硬编码 demo records | 63行 |

### pediatrics-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pediatrics-v5/report/index.tsx | PediatricsV5Page | 真实数据 | /api/v1/pediatrics-v5/report；路由含硬编码 demo records | 107行 |

### performance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance/report-v2/index.tsx | PerformanceMgmtV2Page | 真实数据 | /api/v1/performance/report-v2；路由含硬编码 demo records | 107行 |

### performance-appraisal-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-appraisal-mgmt/index.tsx | PerformanceAppraisalMgmtPage | 真实数据 | /api/v1/performance-appraisal-mgmt；路由含硬编码 demo records | 63行 |

### performance-bonus/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-bonus/index.tsx | PerformanceBonusPage | 真实数据 | /api/v1/performance-bonus；路由含硬编码 demo records | 63行 |

### performance-eval/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-eval/index.tsx | PerformanceEvalPage | 真实数据 | /api/v1/performance-eval；路由含硬编码 demo records | 63行 |

### performance-eval-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-eval-detail/index.tsx | PerformanceEvalDetailPage | 真实数据 | /api/v1/performance-eval-detail；路由含硬编码 demo records | 63行 |

### performance-improvement/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-improvement/index.tsx | PerformanceImprovementPage | 真实数据 | /api/v1/performance-improvement；路由含硬编码 demo records | 63行 |

### performance-improvement-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-improvement-quality-mgmt/index.tsx | PerformanceImprovementQualityMgmtPage | 真实数据 | /api/v1/performance-improvement-quality-mgmt；路由含硬编码 demo records | 63行 |

### performance-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-mgmt/index.tsx | PerformanceMgmtPage | 真实数据 | /api/v1/performance-mgmt；路由含硬编码 demo records | 63行 |

### performance-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-v3/report/index.tsx | PerformanceV3Page | 真实数据 | /api/v1/performance-v3/report；路由含硬编码 demo records | 103行 |

### performance-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| performance-v4/report/index.tsx | PerformanceV4Page | 真实数据 | /api/v1/performance-v4/report；路由含硬编码 demo records | 104行 |

### perioperative-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| perioperative-mgmt/index.tsx | PerioperativeMgmtPage | 真实数据 | /api/v1/perioperative-mgmt；路由含硬编码 demo records | 63行 |

### personal/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| personal/growth/Report/index.tsx | PersonalGrowthReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 458行 |

### personal-agent/ （5 页：OK 5 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| personal-agent/admin-muse/index.tsx | AdminMUSEV2Page | 真实数据 | /api/v1/personal-agent/admin-muse-v2；路由含硬编码 demo records | 127行 |
| personal-agent/adoption/index.tsx | PersonalAgentAdoptionPage | 真实数据 | /api/v1/personal-agent/adoption-stats；路由含硬编码 demo records | 274行 |
| personal-agent/nurse-muse/index.tsx | NurseMUSEV2Page | 真实数据 | /api/v1/personal-agent/nurse-muse-v2；路由含硬编码 demo records | 138行 |
| personal-agent/patient-muse/index.tsx | PatientMUSEV2Page | 真实数据 | /api/v1/personal-agent/patient-muse-v2；路由含硬编码 demo records | 124行 |
| personal-agent/pharma-muse/index.tsx | PharmaMUSEV2Page | 真实数据 | /api/v1/personal-agent/pharma-muse-v2；路由含硬编码 demo records | 149行 |

### personal-agent-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| personal-agent-v3/report/index.tsx | PersonalAgentV3Page | 真实数据 | /api/v1/personal-agent-v3/report；路由含硬编码 demo records | 104行 |

### personal-agent-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| personal-agent-v5/report/index.tsx | PersonalAgentV5Page | 真实数据 | /api/v1/personal-agent-v5/report；路由含硬编码 demo records | 107行 |

### personalized-learning-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| personalized-learning-overview/index.tsx | PersonalizedLearningOverviewPage | 真实数据 | /api/v1/personalized-learning-overview；路由含硬编码 demo records | 65行 |

### pharma-brief/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharma-brief/index.tsx | PharmaBriefPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 81行 |

### pharmacist-muse-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacist-muse-usage/index.tsx | PharmacistMuseUsagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 64行 |

### pharmacy/ （6 页：OK 6 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy/InventoryAlert/index.tsx | InventoryAlertPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 136行 |
| pharmacy/Lifecycle/index.tsx | DrugLifecyclePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 254行 |
| pharmacy/aiReview/Result/index.tsx | AiDrugReviewResultPage | 真实数据 | /api/v1/ai/drug-review；路由含硬编码 demo records | 249行 |
| pharmacy/index.tsx | PharmacyWorkbench | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 370行 |
| pharmacy/report-v2/index.tsx | PharmacyV2Page | 真实数据 | /api/v1/pharmacy/report-v2；路由含硬编码 demo records | 106行 |
| pharmacy/report-v3/index.tsx | PharmacyV3Page | 真实数据 | /api/v1/pharmacy/report-v3；路由含硬编码 demo records | 106行 |

### pharmacy-ai-loop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-ai-loop-v5/report/index.tsx | PharmacyAILoopV5Page | 真实数据 | /api/v1/pharmacy-ai-loop-v5/report；路由含硬编码 demo records | 105行 |

### pharmacy-drug-catalog/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-drug-catalog/index.tsx | PharmacyDrugCatalogPage | 真实数据 | /api/v1/pharmacy-drug-catalog；路由含硬编码 demo records | 63行 |

### pharmacy-drug-delivery/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-drug-delivery/index.tsx | PharmacyDrugDeliveryPage | 真实数据 | /api/v1/pharmacy-drug-delivery；路由含硬编码 demo records | 63行 |

### pharmacy-drug-safety/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-drug-safety/index.tsx | PharmacyDrugSafetyPage | 真实数据 | /api/v1/pharmacy-drug-safety；路由含硬编码 demo records | 63行 |

### pharmacy-inventory/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-inventory/index.tsx | PharmacyInventoryPage | 真实数据 | /api/v1/pharmacy-inventory；路由含硬编码 demo records | 63行 |

### pharmacy-inventory-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-inventory-alert/index.tsx | PharmacyInventoryAlertPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 90行 |

### pharmacy-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-mgmt-detail/index.tsx | PharmacyMgmtDetailPage | 真实数据 | /api/v1/pharmacy-mgmt-detail；路由含硬编码 demo records | 63行 |

### pharmacy-prescription-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-prescription-review/index.tsx | PharmacyPrescriptionReviewPage | 真实数据 | /api/v1/pharmacy-prescription-review；路由含硬编码 demo records | 63行 |

### pharmacy-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-service/index.tsx | PharmacyServicePage | 真实数据 | /api/v1/pharmacy-service；路由含硬编码 demo records | 63行 |

### pharmacy-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacy-v4/report/index.tsx | PharmacyV4Page | 真实数据 | /api/v1/pharmacy-v4/report；路由含硬编码 demo records | 105行 |

### pharmacyTask/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pharmacyTask/index.tsx | PharmacyTaskPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 49行 |

### piccMaintenance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| piccMaintenance/index.tsx | PiccMaintenancePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 70行 |

### postopFollowup/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| postopFollowup/index.tsx | PostopFollowupPage | 真实数据 | /api/v1/postop-followups/schedule；路由含硬编码 demo records | 61行 |

### postpartum-care-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| postpartum-care-v5/report/index.tsx | PostpartumCareV5Page | 真实数据 | /api/v1/postpartum-care-v5/report；路由含硬编码 demo records | 52行 |

### postpartumVisit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| postpartumVisit/index.tsx | PostpartumVisitPage | 真实数据 | /api/v1/postpartum-visits；路由含硬编码 demo records | 63行 |

### pre-hospital-care/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pre-hospital-care/index.tsx | PreHospitalCarePage | 真实数据 | /api/v1/pre-hospital-care；路由含硬编码 demo records | 63行 |

### predictive-maintenance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| predictive-maintenance/index.tsx | PredictiveMaintenancePage | 真实数据 | /api/v1/predictive-maintenance；路由含硬编码 demo records | 54行 |

### preopAssessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| preopAssessment/index.tsx | PreopAssessmentPage | 真实数据 | /api/v1/preop-assessments；路由含硬编码 demo records | 47行 |

### prescription-audit/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| prescription-audit/index.tsx | PrescriptionAuditPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 87行 |

### prescription-review-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| prescription-review-quality/index.tsx | PrescriptionReviewQualityPage | 真实数据 | /api/v1/prescription-review-quality；路由含硬编码 demo records | 63行 |

### prescription-review-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| prescription-review-stats/index.tsx | PrescriptionReviewStatsPage | 真实数据 | /api/v1/prescription-review-stats；路由含硬编码 demo records | 63行 |

### pressure-ulcer/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pressure-ulcer/index.tsx | PressureUlcerPage | 真实数据 | /api/v1/pressure-ulcer；路由含硬编码 demo records | 63行 |

### pressure-ulcer-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pressure-ulcer-detail/index.tsx | PressureUlcerDetailPage | 真实数据 | /api/v1/pressure-ulcer-detail；路由含硬编码 demo records | 63行 |

### pressure-ulcer-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pressure-ulcer-mgmt/index.tsx | PressureUlcerMgmtPage | 真实数据 | /api/v1/pressure-ulcer-mgmt；路由含硬编码 demo records | 63行 |

### preventive-medicine-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| preventive-medicine-v3/report/index.tsx | PreventiveMedicineV3Page | 真实数据 | /api/v1/preventive-medicine-v3/report；路由含硬编码 demo records | 104行 |

### preventive-medicine-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| preventive-medicine-v4/report/index.tsx | PreventiveMedicineV4Page | 真实数据 | /api/v1/preventive-medicine-v4/report；路由含硬编码 demo records | 103行 |

### price-compliance-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| price-compliance-v5/report/index.tsx | PriceComplianceV5Page | 真实数据 | /api/v1/price-compliance-v5/report；路由含硬编码 demo records | 52行 |

### price-management/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| price-management/index.tsx | PriceManagementPage | 真实数据 | /api/v1/price-management；路由含硬编码 demo records | 63行 |

### price-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| price-mgmt/index.tsx | PriceMgmtPage | 真实数据 | /api/v1/price-mgmt；路由含硬编码 demo records | 63行 |

### price-monitor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| price-monitor/index.tsx | PriceMonitorPage | 真实数据 | /api/v1/price-monitor；路由含硬编码 demo records | 63行 |

### pricing/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pricing/report-v2/index.tsx | PricingV2Page | 真实数据 | /api/v1/pricing/report-v2；路由含硬编码 demo records | 107行 |

### privacy-compute-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| privacy-compute-v5/report/index.tsx | PrivacyComputeV5Page | 真实数据 | /api/v1/privacy-compute-v5/report；路由含硬编码 demo records | 107行 |

### privacy-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| privacy-mgmt/index.tsx | PrivacyMgmtPage | 真实数据 | /api/v1/privacy-mgmt；路由含硬编码 demo records | 63行 |

### process-optimization/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| process-optimization/report/index.tsx | ProcessOptimizationPage | 真实数据 | /api/v1/process-optimization/report；路由含硬编码 demo records | 107行 |

### procurement-lead-time/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| procurement-lead-time/index.tsx | ProcurementLeadTimePage | 真实数据 | /api/v1/procurement-lead-time；路由含硬编码 demo records | 74行 |

### procurement-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| procurement-quality-mgmt/index.tsx | ProcurementQualityMgmtPage | 真实数据 | /api/v1/procurement-quality-mgmt；路由含硬编码 demo records | 63行 |

### profit-analysis/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| profit-analysis/index.tsx | ProfitAnalysisPage | 真实数据 | /api/v1/profit-analysis；路由含硬编码 demo records | 63行 |

### prompt-governance/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| prompt-governance/index.tsx | PromptGovernancePage | 真实数据 | /api/v1/prompt-governance；路由含硬编码 demo records | 54行 |

### psych-eap-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| psych-eap-v5/report/index.tsx | PsychEAPV5Page | 真实数据 | /api/v1/psych-eap-v5/report；路由含硬编码 demo records | 52行 |

### psychScreening/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| psychScreening/index.tsx | PsychScreeningPage | 真实数据 | /api/v1/psych-screenings；路由含硬编码 demo records | 45行 |

### public-health-emergency/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| public-health-emergency/index.tsx | PublicHealthEmergencyPage | 真实数据 | /api/v1/public-health-emergency；路由含硬编码 demo records | 63行 |

### public-knowledge/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| public-knowledge/index.tsx | PublicKnowledgePage | 真实数据 | /api/v1/public-knowledge；路由含硬编码 demo records | 75行 |

### public-relation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| public-relation/index.tsx | PublicRelationPage | 真实数据 | /api/v1/public-relation；路由含硬编码 demo records | 63行 |

### publicity-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| publicity-mgmt/index.tsx | PublicityMgmtPage | 真实数据 | /api/v1/publicity-mgmt；路由含硬编码 demo records | 63行 |

### pulmonology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| pulmonology-v5/report/index.tsx | PulmonologyV5Page | 真实数据 | /api/v1/pulmonology-v5/report；路由含硬编码 demo records | 107行 |

### push-effect-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| push-effect-overview/index.tsx | PushEffectOverviewPage | 真实数据 | /api/v1/push-effect-overview；路由含硬编码 demo records | 63行 |

### push-quota/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| push-quota/index.tsx | PushQuotaPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 75行 |

### push-scene/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| push-scene/index.tsx | PushScenePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 85行 |

### qc/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| qc/Rectification/index.tsx | QcRectificationBoardPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 128行 |
| qc/aiReview/List/index.tsx | AiQualityReviewListPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 263行 |

### qc-rule-config/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| qc-rule-config/index.tsx | QcRuleConfigPage | 真实数据 | /api/v1/qc-rule-config；路由含硬编码 demo records | 161行 |

### quality/ （2 页：OK 1 / SHELL 1 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality/Pdca/index.tsx | PdcaWorkbench | 真实数据 | /api/v1/quality/pdca；路由含硬编码 demo records | 311行 |
| quality/index.tsx | QualityWorkbench | 空壳 | 无数据获取、无内置列表 | 95行 |

### quality-control-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality-control-mgmt/index.tsx | QualityControlMgmtPage | 真实数据 | /api/v1/quality-control-mgmt；路由含硬编码 demo records | 63行 |

### quality-event-rca/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality-event-rca/index.tsx | QualityEventRcaPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 81行 |

### quality-gate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality-gate/index.tsx | QualityGatePage | 真实数据 | /api/v1/quality-gate；路由含硬编码 demo records | 65行 |

### quality-mgmt-system/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality-mgmt-system/index.tsx | QualityMgmtSystemPage | 真实数据 | /api/v1/quality-mgmt-system；路由含硬编码 demo records | 63行 |

### quality-safety-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quality-safety-ai-v2/report/index.tsx | QualitySafetyAIV2Page | 真实数据 | /api/v1/quality-safety-ai-v2/report；路由含硬编码 demo records | 104行 |

### quarterly-review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| quarterly-review/index.tsx | QuarterlyReviewPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 69行 |

### radiation-safety-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| radiation-safety-quality-mgmt/index.tsx | RadiationSafetyQualityMgmtPage | 真实数据 | /api/v1/radiation-safety-quality-mgmt；路由含硬编码 demo records | 63行 |

### radiology-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| radiology-quality/index.tsx | RadiologyQualityPage | 真实数据 | /api/v1/radiology-quality；路由含硬编码 demo records | 63行 |

### rag-tuning/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rag-tuning/index.tsx | RagTuningPage | 真实数据 | /api/v1/rag-tuning/hit-rate；路由含硬编码 demo records | 52行 |

### rational-drug-use-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rational-drug-use-stats/index.tsx | RationalDrugUseStatsPage | 真实数据 | /api/v1/rational-drug-use-stats；路由含硬编码 demo records | 63行 |

### readmission-analysis-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| readmission-analysis-mgmt/index.tsx | ReadmissionAnalysisMgmtPage | 真实数据 | /api/v1/readmission-analysis-mgmt；路由含硬编码 demo records | 63行 |

### readmission-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| readmission-mgmt/index.tsx | ReadmissionMgmtPage | 真实数据 | /api/v1/readmission-mgmt；路由含硬编码 demo records | 63行 |

### readmission-risk/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| readmission-risk/index.tsx | ReadmissionRiskPage | 真实数据 | /api/v1/readmission-risk；路由含硬编码 demo records | 82行 |

### readmission-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| readmission-stats/index.tsx | ReadmissionStatsPage | 真实数据 | /api/v1/readmission-stats；路由含硬编码 demo records | 72行 |

### reconciliation-fund-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| reconciliation-fund-v5/report/index.tsx | ReconciliationFundV5Page | 真实数据 | /api/v1/reconciliation-fund-v5/report；路由含硬编码 demo records | 52行 |

### record/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| record/VoiceEditor/index.tsx | VoiceEditorPage | 真实数据 | /api/v1/record/voice-transcribe；路由含硬编码 demo records | 240行 |

### record-quality-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| record-quality-v3/report/index.tsx | RecordQualityV3Page | 真实数据 | /api/v1/record-quality-v3/report；路由含硬编码 demo records | 107行 |

### recruitment-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| recruitment-mgmt/index.tsx | RecruitmentMgmtPage | 真实数据 | /api/v1/recruitment-mgmt；路由含硬编码 demo records | 63行 |

### referral/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| referral/index.tsx | ReferralPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 114行 |

### referral-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| referral-stats/index.tsx | ReferralStatsPage | 真实数据 | /api/v1/referral-stats；路由含硬编码 demo records | 63行 |

### regional/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| regional/Collaboration/index.tsx | RegionalCollaborationPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 340行 |
| regional/collaboration-v2/index.tsx | RegionalCollaborationV2Page | 真实数据 | /api/v1/regional/collaboration；路由含硬编码 demo records | 140行 |
| regional/report/index.tsx | RegionalHealthPage | 真实数据 | /api/v1/regional/report；路由含硬编码 demo records | 106行 |

### regional-alliance-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| regional-alliance-v4/report/index.tsx | RegionalAllianceV4Page | 真实数据 | /api/v1/regional-alliance-v4/report；路由含硬编码 demo records | 107行 |

### regional-brain/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| regional-brain/report/index.tsx | RegionalBrainPage | 真实数据 | /api/v1/regional-brain/report；路由含硬编码 demo records | 103行 |

### regional-health-data/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| regional-health-data/index.tsx | RegionalHealthDataPage | 真实数据 | /api/v1/regional-health-data；路由含硬编码 demo records | 70行 |

### rehabTreatment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rehabTreatment/index.tsx | RehabTreatmentPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 81行 |

### rehabilitation/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rehabilitation/report-v2/index.tsx | RehabilitationV2Page | 真实数据 | /api/v1/rehabilitation/report-v2；路由含硬编码 demo records | 105行 |

### rehabilitation-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rehabilitation-stats/index.tsx | RehabilitationStatsPage | 真实数据 | /api/v1/rehabilitation-stats；路由含硬编码 demo records | 63行 |

### rehabilitation-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rehabilitation-v5/report/index.tsx | RehabilitationV5Page | 真实数据 | /api/v1/rehabilitation-v5/report；路由含硬编码 demo records | 52行 |

### renewalFlow/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| renewalFlow/index.tsx | RenewalPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 54行 |

### reportPush/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| reportPush/index.tsx | ReportPushPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 49行 |

### reporting-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| reporting-stats/index.tsx | ReportingStatsPage | 真实数据 | /api/v1/reporting-stats；路由含硬编码 demo records | 55行 |

### rescue-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rescue-mgmt/index.tsx | RescueMgmtPage | 真实数据 | /api/v1/rescue-mgmt；路由含硬编码 demo records | 63行 |

### rescue-record-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rescue-record-mgmt/index.tsx | RescueRecordMgmtPage | 真实数据 | /api/v1/rescue-record-mgmt；路由含硬编码 demo records | 63行 |

### research/ （9 页：OK 9 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research/AiAssistant/index.tsx | ResearchAiAssistantPage | 真实数据 | /api/v1/research/auto-stats；路由含硬编码 demo records | 243行 |
| research/CohortExport/index.tsx | CohortExportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 174行 |
| research/Deep/index.tsx | ResearchDeepPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 440行 |
| research/Literature/index.tsx | ResearchLiteraturePage | 真实数据 | /api/v1/research/literature/summarize；路由含硬编码 demo records | 528行 |
| research/ResearchAssistant/index.tsx | ResearchAssistantPage | 真实数据 | /api/v1/research/literature-review；路由含硬编码 demo records | 400行 |
| research/ResearchPipeline/index.tsx | ResearchPipelinePage | 真实数据 | /api/v1/research/full-pipeline；路由含硬编码 demo records | 429行 |
| research/index.tsx | ResearchPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 89行 |
| research/report-v2/index.tsx | ResearchV2Page | 真实数据 | /api/v1/research/report-v2；路由含硬编码 demo records | 107行 |
| research/report-v3/index.tsx | ResearchV3Page | 真实数据 | /api/v1/research/report-v3；路由含硬编码 demo records | 107行 |

### research-achievement-transform-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-achievement-transform-mgmt/index.tsx | ResearchAchievementTransformMgmtPage | 真实数据 | /api/v1/research-achievement-transform-mgmt；路由含硬编码 demo records | 63行 |

### research-ai-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-ai-v5/report/index.tsx | ResearchAIV5Page | 真实数据 | /api/v1/research-ai-v5/report；路由含硬编码 demo records | 106行 |

### research-management-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-management-v4/report/index.tsx | ResearchManagementV4Page | 真实数据 | /api/v1/research-management-v4/report；路由含硬编码 demo records | 107行 |

### research-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-mgmt/index.tsx | ResearchMgmtPage | 真实数据 | /api/v1/research-mgmt；路由含硬编码 demo records | 63行 |

### research-platform-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-platform-mgmt/index.tsx | ResearchPlatformMgmtPage | 真实数据 | /api/v1/research-platform-mgmt；路由含硬编码 demo records | 63行 |

### research-project/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-project/index.tsx | ResearchProjectPage | 真实数据 | /api/v1/research-project；路由含硬编码 demo records | 63行 |

### research-project-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-project-mgmt/index.tsx | ResearchProjectMgmtPage | 真实数据 | /api/v1/research-project-mgmt；路由含硬编码 demo records | 63行 |

### research-project-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-project-stats/index.tsx | ResearchProjectStatsPage | 真实数据 | /api/v1/research-project-stats；路由含硬编码 demo records | 63行 |

### research-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-quality-mgmt/index.tsx | ResearchQualityMgmtPage | 真实数据 | /api/v1/research-quality-mgmt；路由含硬编码 demo records | 63行 |

### research-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| research-v3/report/index.tsx | ResearchV3Page | 真实数据 | /api/v1/research-v3/report；路由含硬编码 demo records | 104行 |

### residency-edu-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| residency-edu-v5/report/index.tsx | ResidencyEducationV5Page | 真实数据 | /api/v1/residency-edu-v5/report；路由含硬编码 demo records | 107行 |

### residency-training-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| residency-training-mgmt/index.tsx | ResidencyTrainingMgmtPage | 真实数据 | /api/v1/residency-training-mgmt；路由含硬编码 demo records | 63行 |

### resident-training/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| resident-training/index.tsx | ResidentTrainingPage | 真实数据 | /api/v1/resident-training；路由含硬编码 demo records | 63行 |

### resident-training-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| resident-training-stats/index.tsx | ResidentTrainingStatsPage | 真实数据 | /api/v1/resident-training-stats；路由含硬编码 demo records | 63行 |

### resource-util/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| resource-util/index.tsx | ResourceUtilPage | 真实数据 | /api/v1/resource-util；路由含硬编码 demo records | 63行 |

### resource-util-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| resource-util-detail/index.tsx | ResourceUtilDetailPage | 真实数据 | /api/v1/resource-util-detail；路由含硬编码 demo records | 63行 |

### restraint-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| restraint-mgmt/index.tsx | RestraintMgmtPage | 真实数据 | /api/v1/restraint-mgmt；路由含硬编码 demo records | 63行 |

### retrain-tasks/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| retrain-tasks/index.tsx | RetrainTasksPage | 真实数据 | /api/v1/retrain-tasks；路由含硬编码 demo records | 90行 |

### reuse-roi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| reuse-roi/index.tsx | ReuseRoiPage | 真实数据 | /api/v1/reuse-roi；路由含硬编码 demo records | 65行 |

### revenue-growth/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| revenue-growth/index.tsx | RevenueGrowthPage | 真实数据 | /api/v1/revenue-growth；路由含硬编码 demo records | 63行 |

### revenue-structure/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| revenue-structure/index.tsx | RevenueStructurePage | 真实数据 | /api/v1/revenue-structure；路由含硬编码 demo records | 72行 |

### revenue-structure-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| revenue-structure-detail/index.tsx | RevenueStructureDetailPage | 真实数据 | /api/v1/revenue-structure-detail；路由含硬编码 demo records | 63行 |

### revenue-structure-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| revenue-structure-stats/index.tsx | RevenueStructureStatsPage | 真实数据 | /api/v1/revenue-structure-stats；路由含硬编码 demo records | 69行 |

### review/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| review/index.tsx | ReviewPage | 真实数据 | /api/v1/review/prescriptions；路由含硬编码 demo records | 97行 |

### review-queue/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| review-queue/index.tsx | ReviewQueuePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 77行 |

### reviewer-roster/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| reviewer-roster/index.tsx | ReviewerRosterPage | 真实数据 | /api/v1/reviewer-roster；路由含硬编码 demo records | 61行 |

### rheumatology-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rheumatology-v5/report/index.tsx | RheumatologyV5Page | 真实数据 | /api/v1/rheumatology-v5/report；路由含硬编码 demo records | 107行 |

### ris/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ris/index.tsx | RisPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 808行 |

### risk/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| risk/report/index.tsx | RiskReportPage | 真实数据 | /api/v1/risk/report；路由含硬编码 demo records | 107行 |

### rollback/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rollback/index.tsx | RollbackPage | 真实数据 | /api/v1/rollback-report；路由含硬编码 demo records | 53行 |

### rwd-platform-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| rwd-platform-v5/report/index.tsx | RWDPlatformV5Page | 真实数据 | /api/v1/rwd-platform-v5/report；路由含硬编码 demo records | 107行 |

### safety-check-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| safety-check-mgmt/index.tsx | SafetyCheckMgmtPage | 真实数据 | /api/v1/safety-check-mgmt；路由含硬编码 demo records | 63行 |

### safety-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| safety-mgmt/index.tsx | SafetyMgmtPage | 真实数据 | /api/v1/safety-mgmt；路由含硬编码 demo records | 63行 |

### safety-production/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| safety-production/index.tsx | SafetyProductionPage | 真实数据 | /api/v1/safety-production；路由含硬编码 demo records | 63行 |

### safety-production-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| safety-production-mgmt/index.tsx | SafetyProductionMgmtPage | 真实数据 | /api/v1/safety-production-mgmt；路由含硬编码 demo records | 63行 |

### salary-distribution-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| salary-distribution-mgmt/index.tsx | SalaryDistributionMgmtPage | 真实数据 | /api/v1/salary-distribution-mgmt；路由含硬编码 demo records | 63行 |

### satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| satisfaction/index.tsx | SatisfactionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 114行 |

### satisfaction-survey-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| satisfaction-survey-detail/index.tsx | SatisfactionSurveyDetailPage | 真实数据 | /api/v1/satisfaction-survey-detail；路由含硬编码 demo records | 63行 |

### satisfaction-survey-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| satisfaction-survey-mgmt/index.tsx | SatisfactionSurveyMgmtPage | 真实数据 | /api/v1/satisfaction-survey-mgmt；路由含硬编码 demo records | 63行 |

### satisfactionReminder/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| satisfactionReminder/index.tsx | SatisfactionReminderPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 49行 |

### satisfactionSurvey/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| satisfactionSurvey/index.tsx | SatisfactionSurveyPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 59行 |

### sbarHandoff/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sbarHandoff/index.tsx | SbarHandoffPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 84行 |

### scheduleSlot/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| scheduleSlot/index.tsx | ScheduleSlotPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 58行 |

### scheduling/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| scheduling/optimize/index.tsx | NurseScheduleOptimizePage | 真实数据 | /api/v1/scheduling/optimize；路由含硬编码 demo records | 201行 |

### scheduling-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| scheduling-mgmt/index.tsx | SchedulingMgmtPage | 真实数据 | /api/v1/scheduling-mgmt；路由含硬编码 demo records | 63行 |

### security-emergency/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-emergency/index.tsx | SecurityEmergencyPage | 真实数据 | /api/v1/security-emergency；路由含硬编码 demo records | 54行 |

### security-incident/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-incident/index.tsx | SecurityIncidentPage | 真实数据 | /api/v1/security-incident；路由含硬编码 demo records | 63行 |

### security-incident-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-incident-stats/index.tsx | SecurityIncidentStatsPage | 真实数据 | /api/v1/security-incident-stats；路由含硬编码 demo records | 63行 |

### security-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-mgmt/index.tsx | SecurityMgmtPage | 真实数据 | /api/v1/security-mgmt；路由含硬编码 demo records | 63行 |

### security-ops-ai-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-ops-ai-v2/report/index.tsx | SecurityOpsAIV2Page | 真实数据 | /api/v1/security-ops-ai-v2/report；路由含硬编码 demo records | 105行 |

### security-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-quality-mgmt/index.tsx | SecurityQualityMgmtPage | 真实数据 | /api/v1/security-quality-mgmt；路由含硬编码 demo records | 63行 |

### security-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| security-v3/report/index.tsx | SecurityV3Page | 真实数据 | /api/v1/security-v3/report；路由含硬编码 demo records | 103行 |

### service-attitude/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| service-attitude/index.tsx | ServiceAttitudePage | 真实数据 | /api/v1/service-attitude；路由含硬编码 demo records | 63行 |

### service-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| service-quality/index.tsx | ServiceQualityPage | 真实数据 | /api/v1/service-quality；路由含硬编码 demo records | 63行 |

### sessions/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sessions/index.tsx | SessionsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 183行 |

### settlementAnalytics/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| settlementAnalytics/index.tsx | SettlementAnalyticsPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 51行 |

### settlementDrilldown/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| settlementDrilldown/index.tsx | SettlementDrilldownPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 51行 |

### settlementReport/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| settlementReport/index.tsx | SettlementReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 51行 |

### sewage-treatment-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sewage-treatment-quality-mgmt/index.tsx | SewageTreatmentQualityMgmtPage | 真实数据 | /api/v1/sewage-treatment-quality-mgmt；路由含硬编码 demo records | 63行 |

### shift-brief/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| shift-brief/index.tsx | ShiftBriefPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 83行 |

### single-disease-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| single-disease-quality-mgmt/index.tsx | SingleDiseaseQualityMgmtPage | 真实数据 | /api/v1/single-disease-quality-mgmt；路由含硬编码 demo records | 63行 |

### smart-alert/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-alert/report-v2/index.tsx | SmartAlertV2Page | 真实数据 | /api/v1/smart-alert/report-v2；路由含硬编码 demo records | 107行 |

### smart-healthcare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-healthcare/index.tsx | SmartHealthcarePage | 真实数据 | /api/v1/smart-healthcare/report；路由含硬编码 demo records | 111行 |

### smart-hospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-hospital/report/index.tsx | SmartHospitalReportPage | 真实数据 | /api/v1/smart-hospital/report；路由含硬编码 demo records | 103行 |

### smart-hospital-grade/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-hospital-grade/index.tsx | SmartHospitalGradePage | 真实数据 | /api/v1/smart-hospital-grade；路由含硬编码 demo records | 67行 |

### smart-hospital-rating/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-hospital-rating/index.tsx | SmartHospitalRatingPage | 真实数据 | /api/v1/smart-hospital-rating；路由含硬编码 demo records | 75行 |

### smart-hospital-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-hospital-v3/report/index.tsx | SmartHospitalV3Page | 真实数据 | /api/v1/smart-hospital-v3/report；路由含硬编码 demo records | 107行 |

### smart-hospital-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-hospital-v5/report/index.tsx | SmartHospitalV5Page | 真实数据 | /api/v1/smart-hospital-v5/report；路由含硬编码 demo records | 108行 |

### smart-pharmacy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-pharmacy/report/index.tsx | SmartPharmacyPage | 真实数据 | /api/v1/smart-pharmacy/report；路由含硬编码 demo records | 106行 |

### smart-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-service/report/index.tsx | SmartServiceRatingPage | 真实数据 | /api/v1/smart-service/report；路由含硬编码 demo records | 106行 |

### smart-ward-iot-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smart-ward-iot-v5/report/index.tsx | SmartWardIoTV5Page | 真实数据 | /api/v1/smart-ward-iot-v5/report；路由含硬编码 demo records | 107行 |

### smartTriage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| smartTriage/index.tsx | SmartTriagePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 147行 |

### social-work-service-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| social-work-service-mgmt/index.tsx | SocialWorkServiceMgmtPage | 真实数据 | /api/v1/social-work-service-mgmt；路由含硬编码 demo records | 63行 |

### sop-usage/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sop-usage/index.tsx | SopUsagePage | 真实数据 | /api/v1/sop-usage；路由含硬编码 demo records | 71行 |

### special-drug-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| special-drug-mgmt/index.tsx | SpecialDrugMgmtPage | 真实数据 | /api/v1/special-drug-mgmt；路由含硬编码 demo records | 63行 |

### special-equip-hazmat/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| special-equip-hazmat/report/index.tsx | SpecialEquipHazmatReportPage | 真实数据 | /api/v1/special-equip-hazmat/report；路由含硬编码 demo records | 107行 |

### specialty/ （8 页：OK 8 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| specialty/ai-diagnosis/index.tsx | AIDiagnosisPage | 真实数据 | /api/v1/specialty/ai-diagnosis/report；路由含硬编码 demo records | 105行 |
| specialty/icu/index.tsx | ICUPage | 真实数据 | /api/v1/specialty/icu/report；路由含硬编码 demo records | 105行 |
| specialty/index.tsx | SpecialtyPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 106行 |
| specialty/interventional/index.tsx | InterventionalPage | 真实数据 | /api/v1/specialty/interventional/report；路由含硬编码 demo records | 104行 |
| specialty/psychiatry/index.tsx | PsychiatryPage | 真实数据 | /api/v1/specialty/psychiatry/report；路由含硬编码 demo records | 106行 |
| specialty/rehabilitation/index.tsx | RehabilitationPage | 真实数据 | /api/v1/specialty/rehabilitation/report；路由含硬编码 demo records | 104行 |
| specialty/tcm/index.tsx | TCMPage | 真实数据 | /api/v1/specialty/tcm/report；路由含硬编码 demo records | 105行 |
| specialty/transplant/index.tsx | TransplantPage | 真实数据 | /api/v1/specialty/transplant/report；路由含硬编码 demo records | 106行 |

### specialty-development/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| specialty-development/index.tsx | SpecialtyDevelopmentPage | 真实数据 | /api/v1/specialty-development；路由含硬编码 demo records | 63行 |

### specimen-reject/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| specimen-reject/index.tsx | SpecimenRejectPage | 真实数据 | /api/v1/specimen-reject；路由含硬编码 demo records | 51行 |

### sre/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sre/report/index.tsx | SREReportPage | 真实数据 | /api/v1/sre/report；路由含硬编码 demo records | 106行 |

### ssi-rate/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ssi-rate/index.tsx | SsiRatePage | 真实数据 | /api/v1/ssi-rate；路由含硬编码 demo records | 51行 |

### staff-kpi-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-kpi-quality-mgmt/index.tsx | StaffKpiQualityMgmtPage | 真实数据 | /api/v1/staff-kpi-quality-mgmt；路由含硬编码 demo records | 63行 |

### staff-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-mgmt/index.tsx | StaffMgmtPage | 真实数据 | /api/v1/staff-mgmt；路由含硬编码 demo records | 63行 |

### staff-recruitment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-recruitment/index.tsx | StaffRecruitmentPage | 真实数据 | /api/v1/staff-recruitment；路由含硬编码 demo records | 63行 |

### staff-retention/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-retention/index.tsx | StaffRetentionPage | 真实数据 | /api/v1/staff-retention；路由含硬编码 demo records | 63行 |

### staff-satisfaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-satisfaction/index.tsx | StaffSatisfactionPage | 真实数据 | /api/v1/staff-satisfaction；路由含硬编码 demo records | 73行 |

### staff-satisfaction-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-satisfaction-overview/index.tsx | StaffSatisfactionOverviewPage | 真实数据 | /api/v1/staff-satisfaction-overview；路由含硬编码 demo records | 72行 |

### staff-schedule/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-schedule/index.tsx | StaffSchedulePage | 真实数据 | /api/v1/staff-schedule；路由含硬编码 demo records | 54行 |

### staff-training-development-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-training-development-mgmt/index.tsx | StaffTrainingDevelopmentMgmtPage | 真实数据 | /api/v1/staff-training-development-mgmt；路由含硬编码 demo records | 63行 |

### staff-training-hours/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-training-hours/index.tsx | StaffTrainingHoursPage | 真实数据 | /api/v1/staff-training-hours；路由含硬编码 demo records | 57行 |

### staff-turnover/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-turnover/index.tsx | StaffTurnoverPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 76行 |

### staff-turnover-net/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-turnover-net/index.tsx | StaffTurnoverNetPage | 真实数据 | /api/v1/staff-turnover-net；路由含硬编码 demo records | 63行 |

### staff-turnover-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-turnover-stats/index.tsx | StaffTurnoverStatsPage | 真实数据 | /api/v1/staff-turnover-stats；路由含硬编码 demo records | 63行 |

### staff-workload/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| staff-workload/index.tsx | StaffWorkloadPage | 真实数据 | /api/v1/staff-workload；路由含硬编码 demo records | 80行 |

### statistics-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| statistics-mgmt/index.tsx | StatisticsMgmtPage | 真实数据 | /api/v1/statistics-mgmt；路由含硬编码 demo records | 63行 |

### statistics-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| statistics-report/index.tsx | StatisticsReportPage | 真实数据 | /api/v1/statistics-report；路由含硬编码 demo records | 63行 |

### sterilization-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| sterilization-mgmt/index.tsx | SterilizationMgmtPage | 真实数据 | /api/v1/sterilization-mgmt；路由含硬编码 demo records | 63行 |

### stopbang/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| stopbang/index.tsx | StopbangPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### strategic-kpi/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| strategic-kpi/index.tsx | StrategicKpiPage | 真实数据 | /api/v1/strategic-kpi；路由含硬编码 demo records | 63行 |

### stroke-center/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| stroke-center/index.tsx | StrokeCenterPage | 真实数据 | /api/v1/stroke-center；路由含硬编码 demo records | 63行 |

### stroke-center-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| stroke-center-v5/report/index.tsx | StrokeCenterV5Page | 真实数据 | /api/v1/stroke-center-v5/report；路由含硬编码 demo records | 108行 |

### succession-report/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| succession-report/index.tsx | SuccessionReportPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 65行 |

### suggestion-adoption/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| suggestion-adoption/index.tsx | SuggestionAdoptionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 75行 |

### superadmin/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| superadmin/Hospitals/index.tsx | SuperAdminHospitalsPage | 真实数据 | /api/v1/superadmin/hospitals | 453行 |

### supply-chain-v2/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| supply-chain-v2/report/index.tsx | SupplyChainV2Page | 真实数据 | /api/v1/supply-chain-v2/report；路由含硬编码 demo records | 104行 |

### supply-chain-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| supply-chain-v3/report/index.tsx | SupplyChainV3Page | 真实数据 | /api/v1/supply-chain-v3/report；路由含硬编码 demo records | 103行 |

### supply-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| supply-forecast/index.tsx | SupplyForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 55行 |

### surgery/ （5 页：OK 5 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery/Checklist/index.tsx | SurgeryChecklistPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 158行 |
| surgery/Schedule/index.tsx | SurgerySchedulePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 235行 |
| surgery/index.tsx | SurgeryPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 166行 |
| surgery/report-v2/index.tsx | SurgeryV2Page | 真实数据 | /api/v1/surgery/report-v2；路由含硬编码 demo records | 107行 |
| surgery/report-v3/index.tsx | SurgeryV3Page | 真实数据 | /api/v1/surgery/report-v3；路由含硬编码 demo records | 105行 |

### surgery-ai-loop-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-ai-loop-v5/report/index.tsx | SurgeryAILoopV5Page | 真实数据 | /api/v1/surgery-ai-loop-v5/report；路由含硬编码 demo records | 104行 |

### surgery-anesthesia-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-anesthesia-mgmt/index.tsx | SurgeryAnesthesiaMgmtPage | 真实数据 | /api/v1/surgery-anesthesia-mgmt；路由含硬编码 demo records | 63行 |

### surgery-anesthesia-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-anesthesia-v4/report/index.tsx | SurgeryAnesthesiaV4Page | 真实数据 | /api/v1/surgery-anesthesia-v4/report；路由含硬编码 demo records | 104行 |

### surgery-process/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-process/index.tsx | SurgeryProcessPage | 真实数据 | /api/v1/surgery-process；路由含硬编码 demo records | 63行 |

### surgery-quality/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-quality/index.tsx | SurgeryQualityPage | 真实数据 | /api/v1/surgery-quality；路由含硬编码 demo records | 63行 |

### surgery-volume/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgery-volume/index.tsx | SurgeryVolumePage | 真实数据 | /api/v1/surgery-volume；路由含硬编码 demo records | 63行 |

### surgical-infection/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgical-infection/index.tsx | SurgicalInfectionPage | 真实数据 | /api/v1/surgical-infection；路由含硬编码 demo records | 63行 |

### surgicalChecklist/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| surgicalChecklist/index.tsx | SurgicalChecklistPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 47行 |

### system/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| system/Export/index.tsx | ExportCenterPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 172行 |
| system/Health/index.tsx | SystemHealthPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 240行 |
| system/NotifyConfig/index.tsx | NotifyConfigPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 119行 |

### system-availability/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| system-availability/index.tsx | SystemAvailabilityPage | 真实数据 | /api/v1/system-availability；路由含硬编码 demo records | 69行 |

### system-availability-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| system-availability-detail/index.tsx | SystemAvailabilityDetailPage | 真实数据 | /api/v1/system-availability-detail；路由含硬编码 demo records | 63行 |

### system-availability-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| system-availability-mgmt/index.tsx | SystemAvailabilityMgmtPage | 真实数据 | /api/v1/system-availability-mgmt；路由含硬编码 demo records | 63行 |

### system-availability-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| system-availability-stats/index.tsx | SystemAvailabilityStatsPage | 真实数据 | /api/v1/system-availability-stats；路由含硬编码 demo records | 63行 |

### talent/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| talent/report-v2/index.tsx | TalentV2Page | 真实数据 | /api/v1/talent/report-v2；路由含硬编码 demo records | 107行 |

### talent-development/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| talent-development/index.tsx | TalentDevelopmentPage | 真实数据 | /api/v1/talent-development；路由含硬编码 demo records | 67行 |

### talent-team-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| talent-team-mgmt/index.tsx | TalentTeamMgmtPage | 真实数据 | /api/v1/talent-team-mgmt；路由含硬编码 demo records | 63行 |

### talent-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| talent-v3/report/index.tsx | TalentV3Page | 真实数据 | /api/v1/talent-v3/report；路由含硬编码 demo records | 103行 |

### task-funnel/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| task-funnel/index.tsx | TaskFunnelPage | 真实数据 | /api/v1/task-funnel；路由含硬编码 demo records | 78行 |

### task-verification/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| task-verification/index.tsx | TaskVerificationPage | 真实数据 | /api/v1/task-verification；路由含硬编码 demo records | 80行 |

### tcm-pharmacy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| tcm-pharmacy/index.tsx | TCMPharmacyPage | 真实数据 | /api/v1/tcm-pharmacy；路由含硬编码 demo records | 63行 |

### tcm-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| tcm-service/index.tsx | TcmServicePage | 真实数据 | /api/v1/tcm-service；路由含硬编码 demo records | 63行 |

### teaching/ （3 页：OK 3 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching/Deep/index.tsx | TeachingDeepPage | 真实数据 | /api/v1/teaching/exam；路由含硬编码 demo records | 329行 |
| teaching/TeachingOnline/index.tsx | TeachingOnlinePage | 真实数据 | /api/v1/teaching/quiz/submit；路由含硬编码 demo records | 389行 |
| teaching/report-v2/index.tsx | TeachingV2Page | 真实数据 | /api/v1/teaching/report-v2；路由含硬编码 demo records | 107行 |

### teaching-activity/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-activity/index.tsx | TeachingActivityPage | 真实数据 | /api/v1/teaching-activity；路由含硬编码 demo records | 63行 |

### teaching-ai-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-ai-v5/report/index.tsx | TeachingAIV5Page | 真实数据 | /api/v1/teaching-ai-v5/report；路由含硬编码 demo records | 106行 |

### teaching-hospital/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-hospital/index.tsx | TeachingHospitalPage | 真实数据 | /api/v1/teaching-hospital；路由含硬编码 demo records | 63行 |

### teaching-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-mgmt/index.tsx | TeachingMgmtPage | 真实数据 | /api/v1/teaching-mgmt；路由含硬编码 demo records | 63行 |

### teaching-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-quality-mgmt/index.tsx | TeachingQualityMgmtPage | 真实数据 | /api/v1/teaching-quality-mgmt；路由含硬编码 demo records | 63行 |

### teaching-quality-mgmt-assessment/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-quality-mgmt-assessment/index.tsx | TeachingQualityMgmtAssessmentPage | 真实数据 | /api/v1/teaching-quality-mgmt-assessment；路由含硬编码 demo records | 63行 |

### teaching-training-v4/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-training-v4/report/index.tsx | TeachingTrainingV4Page | 真实数据 | /api/v1/teaching-training-v4/report；路由含硬编码 demo records | 107行 |

### teaching-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-v3/report/index.tsx | TeachingV3Page | 真实数据 | /api/v1/teaching-v3/report；路由含硬编码 demo records | 103行 |

### teaching-workload/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| teaching-workload/index.tsx | TeachingWorkloadPage | 真实数据 | /api/v1/teaching-workload；路由含硬编码 demo records | 63行 |

### telemedicine/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| telemedicine/index.tsx | TelemedicinePage | 真实数据 | /api/v1/telemedicine/report；路由含硬编码 demo records | 109行 |
| telemedicine/report-v2/index.tsx | TelemedicineV2Page | 真实数据 | /api/v1/telemedicine/report-v2；路由含硬编码 demo records | 103行 |

### telemedicine-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| telemedicine-detail/index.tsx | TelemedicineDetailPage | 真实数据 | /api/v1/telemedicine-detail；路由含硬编码 demo records | 63行 |

### telemedicine-overview/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| telemedicine-overview/index.tsx | TelemedicineOverviewPage | 真实数据 | /api/v1/telemedicine-overview；路由含硬编码 demo records | 75行 |

### telemedicine-stats/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| telemedicine-stats/index.tsx | TelemedicineStatsPage | 真实数据 | /api/v1/telemedicine-stats；路由含硬编码 demo records | 63行 |

### telemedicine-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| telemedicine-v3/report/index.tsx | TelemedicineV3Page | 真实数据 | /api/v1/telemedicine-v3/report；路由含硬编码 demo records | 106行 |

### three-level-ward-round/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| three-level-ward-round/index.tsx | ThreeLevelWardRoundPage | 真实数据 | /api/v1/three-level-ward-round；路由含硬编码 demo records | 63行 |

### training-hours/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| training-hours/index.tsx | TrainingHoursPage | 真实数据 | /api/v1/training-hours；路由含硬编码 demo records | 57行 |

### training-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| training-mgmt/index.tsx | TrainingMgmtPage | 真实数据 | /api/v1/training-mgmt；路由含硬编码 demo records | 63行 |

### training-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| training-mgmt-detail/index.tsx | TrainingMgmtDetailPage | 真实数据 | /api/v1/training-mgmt-detail；路由含硬编码 demo records | 63行 |

### training-plan/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| training-plan/index.tsx | TrainingPlanPage | 真实数据 | /api/v1/training-plan；路由含硬编码 demo records | 63行 |

### transfer-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| transfer-detail/index.tsx | TransferDetailPage | 真实数据 | /api/v1/transfer-detail；路由含硬编码 demo records | 63行 |

### transfer-summary-completeness/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| transfer-summary-completeness/index.tsx | TransferSummaryCompletenessPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 68行 |

### transfusion/ （2 页：OK 2 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| transfusion/index.tsx | TransfusionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 220行 |
| transfusion/report/index.tsx | TransfusionReportPage | 真实数据 | /api/v1/transfusion/report；路由含硬编码 demo records | 107行 |

### transfusionReaction/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| transfusionReaction/index.tsx | TransfusionReactionPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 73行 |

### trauma-center-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| trauma-center-v5/report/index.tsx | TraumaCenterV5Page | 真实数据 | /api/v1/trauma-center-v5/report；路由含硬编码 demo records | 108行 |

### trend-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| trend-forecast/index.tsx | TrendForecastPage | 真实数据 | /api/v1/trend-forecast；路由含硬编码 demo records | 65行 |

### triage-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| triage-mgmt/index.tsx | TriageMgmtPage | 真实数据 | /api/v1/triage-mgmt；路由含硬编码 demo records | 63行 |

### tube-dislodgement/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| tube-dislodgement/index.tsx | TubeDislodgementPage | 真实数据 | /api/v1/tube-dislodgement；路由含硬编码 demo records | 63行 |

### tubeCare/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| tubeCare/index.tsx | TubeCarePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 91行 |

### twin3d/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| twin3d/or/index.tsx | ORTwins3DPage | 真实数据 | /api/v1/twin3d/or；路由含硬编码 demo records | 163行 |

### ultrasound-volume/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ultrasound-volume/index.tsx | UltrasoundVolumePage | 真实数据 | /api/v1/ultrasound-volume；路由含硬编码 demo records | 63行 |

### union/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| union/report-v2/index.tsx | UnionV2Page | 真实数据 | /api/v1/union/report-v2；路由含硬编码 demo records | 107行 |

### union-v3/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| union-v3/report/index.tsx | UnionV3Page | 真实数据 | /api/v1/union-v3/report；路由含硬编码 demo records | 103行 |

### user/ （4 页：OK 4 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| user/Notifications/index.tsx | NotificationsPage | 真实数据 | /api/v1/user/notifications | 299行 |
| user/Onboarding/index.tsx | UserOnboardingPage | 真实数据 | /api/v1/user/onboarding；路由含硬编码 demo records | 521行 |
| user/Settings/index.tsx | UserSettingsPage | 真实数据 | /api/v1/user/preferences | 360行 |
| user/Todos/index.tsx | UserTodosPage | 真实数据 | /api/v1/user/todos；路由含硬编码 demo records | 179行 |

### v4-milestone/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| v4-milestone/report/index.tsx | V4MilestonePage | 真实数据 | /api/v1/v4-milestone/report；路由含硬编码 demo records | 107行 |

### vaccination-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| vaccination-mgmt/index.tsx | VaccinationMgmtPage | 真实数据 | /api/v1/vaccination-mgmt；路由含硬编码 demo records | 63行 |

### voiceMedical/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| voiceMedical/index.tsx | VoiceMedicalPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 125行 |

### volume-forecast/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| volume-forecast/index.tsx | VolumeForecastPage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 54行 |

### volunteer-service/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| volunteer-service/index.tsx | VolunteerServicePage | 真实数据 | /api/v1/volunteer-service；路由含硬编码 demo records | 63行 |

### volunteer-service-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| volunteer-service-mgmt/index.tsx | VolunteerServiceMgmtPage | 真实数据 | /api/v1/volunteer-service-mgmt；路由含硬编码 demo records | 63行 |

### vte/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| vte/index.tsx | VtePage | 真实数据 | store/health 钩子驱动（无直接 /api/v1 字面量） | 681行 |

### vte-prevention-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| vte-prevention-detail/index.tsx | VtePreventionDetailPage | 真实数据 | /api/v1/vte-prevention-detail；路由含硬编码 demo records | 63行 |

### vte-prevention-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| vte-prevention-mgmt/index.tsx | VtePreventionMgmtPage | 真实数据 | /api/v1/vte-prevention-mgmt；路由含硬编码 demo records | 63行 |

### vteAnticoag/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| vteAnticoag/index.tsx | VteAnticoagPage | 真实数据 | /api/v1/vte-anticoag；路由含硬编码 demo records | 58行 |

### ward-environment-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ward-environment-mgmt/index.tsx | WardEnvironmentMgmtPage | 真实数据 | /api/v1/ward-environment-mgmt；路由含硬编码 demo records | 63行 |

### ward-mgmt-detail/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ward-mgmt-detail/index.tsx | WardMgmtDetailPage | 真实数据 | /api/v1/ward-mgmt-detail；路由含硬编码 demo records | 63行 |

### ward-occupancy/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ward-occupancy/index.tsx | WardOccupancyPage | 真实数据 | /api/v1/ward-occupancy；路由含硬编码 demo records | 75行 |

### ward-quality-mgmt/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| ward-quality-mgmt/index.tsx | WardQualityMgmtPage | 真实数据 | /api/v1/ward-quality-mgmt；路由含硬编码 demo records | 63行 |

### workflow/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| workflow/index.tsx | WorkflowPage | 真实数据 | /api/v1/workflow/definitions；路由含硬编码 demo records | 82行 |

### workflow-monitor/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| workflow-monitor/index.tsx | WorkflowMonitorPage | 真实数据 | /api/v1/workflow/monitor；路由含硬编码 demo records | 94行 |

### zero-trust/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| zero-trust/index.tsx | ZeroTrustPage | 真实数据 | /api/v1/zero-trust；路由含硬编码 demo records | 52行 |

### zero-trust-v5/ （1 页：OK 1 / SHELL 0 / RISK 0）

| 路径 | 页面名 | 类型 | 对应 API / 数据源 | 备注 |
|---|---|---|---|---|
| zero-trust-v5/report/index.tsx | ZeroTrustV5Page | 真实数据 | /api/v1/zero-trust-v5/report；路由含硬编码 demo records | 107行 |

## 三、空壳页面清单（优先补 demo 数据的候选）

共 5 个：

| 路径 | 页面名 | 行数 | 说明 | 补 demo 优先级 |
|---|---|---:|---|---|
| demo/Watermark/index.tsx | Watermark | 102 | 无数据获取、无内置列表 | 高 |
| emr-data-export/index.tsx | EmrDataExportPage | 70 | 无数据获取、无内置列表 | 高 |
| emr-dept-self-check/index.tsx | EmrDeptSelfCheckPage | 66 | 无数据获取、无内置列表 | 高 |
| operation/index.tsx | OperationOverviewPage | 14 | 无数据获取、无内置列表 | 高 |
| quality/index.tsx | QualityWorkbench | 95 | 无数据获取、无内置列表 | 高 |

## 四、崩溃风险复查清单

| 路径 | 页面名 | 风险点 | 建议动作 |
|---|---|---|---|
| admin/Emergency/index.tsx | AdminEmergencyPage | 空值状态未保护访问: data.schedule；API /api/v1/admin/emergency/drill | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| admin/OpsAnalysis/index.tsx | OpsAnalysisPage | 空值状态未保护访问: data.benchmark, data.forecast, data.trend；API (store/本地) | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| admin/QualitySafety/index.tsx | QualitySafetyPage | 空值状态未保护访问: data.improvement；API (store/本地) | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| admin/satisfaction/Report/index.tsx | SatisfactionReportPage | 空值状态未保护访问: data.suggestions；API (store/本地) | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| admin/TalentDeep/index.tsx | TalentDeepPage | 空值状态未保护访问: data.successors；API (store/本地) | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| admin/test/UI/index.tsx | UIConsistencyPage | API 未注册: /api/v1/admin/ui-consistency | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| aiNative/noteDraft/index.tsx | AiNoteDraftPage | 空值状态未保护访问: editingDraft.id；API (store/本地) | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| emr-ai-defect-rootcause/index.tsx | EmrAiDefectRootcausePage | API 未注册: /api/v1/emr-ai-defect-rootcause, /api/v1/emr-ai-defect-rootcause | 人工复查后补 `?.` / 空值兜底或补注册路由 |
| emr-qc-dept-dashboard/index.tsx | EmrQcDeptDashboardPage | 空值状态未保护访问: dashboard.dept；API /api/v1/emr-qc-dept-dashboard | 人工复查后补 `?.` / 空值兜底或补注册路由 |

## 五、结论

1. **1909/1923（99.3%）页面已具备数据渲染能力**，绝大多数通过 `useEffect + get('/api/v1/...')` 对接 BFF 路由，且路由层普遍带硬编码 demo records，断库时也能出数。
2. **空壳仅 5 个**：`demo/Watermark`（水印演示组件）、`emr-data-export`（静态导出入口列表）、`emr-dept-self-check`（内置静态检查项）、`operation`（14 行桩页）、`quality`（静态导航工作台），业务影响面小，见第三节。
3. **崩溃风险 9 个**：7 个为可空状态未保护访问（A 轮修复后残余），2 个为前端调用的 `/api/v1/admin/ui-consistency`、`/api/v1/emr-ai-defect-rootcause` 在路由注册表中不存在（会 404），见第四节。
