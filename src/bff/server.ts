/**
 * 健澜科技数智医院智能�?- BFF HTTP/WebSocket 服务�? *
 * 基于 Bun 原生运行时，零额外依赖：
 *  - REST：统丢� /api/v1 前缀，聚合后端服务并适配前端
 *  - WS�?ws/chat 对话流式与告警推送（霢�鉴权�? *  - 中间件：认证 / 限流 / CSRF / 安全�?/ 日志 / 错误处理
 *
 * 启动：bun run src/bff/server.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { attachUser, newCtx, requireAuth, verifyJwt } from './middleware/auth';
import { verifyCsrf } from './middleware/csrf';
import { withErrorHandler } from './middleware/error';
import { auditOperation } from './middleware/audit';
import { logRequest } from './middleware/log';
import { rateLimit } from './middleware/rateLimit';
import { withSecurityHeaders } from './middleware/securityHeaders';
import { tenantContextMiddleware } from './middleware/tenant';
import { withIdempotency } from './middleware/idempotency';
import { enforceSession } from './middleware/sessionGuard';
import { runChatTurn } from './aggregators/chatAggregator';
import { metrics, recordHttpRequest, renderMetrics } from './observability/metrics';
import { setCriticalAlertSink } from './alertBus';
import { OutboxRelay } from './outboxRelay';
import { autoMigrate, closeDb, verifyDbConnection } from '@/db';
import {
  createConversation,
  getConversationById,
} from '@/db/repositories/conversationRepo';
import { authRoutes } from './routes/auth';
import { mfaLoginRoutes } from './routes/mfa';
import { permissionAdminRoutes } from './routes/admin/permissions';
import { tenantAdminRoutes } from './routes/admin/tenants';
// 【SaaS化+智慧度】M133-B：超管后台医院管理（仅 superadmin 角色）
import { superAdminHospitalsRoutes } from './routes/superAdminHospitals';
import { userAdminRoutes } from './routes/admin/users';
import { roleAdminRoutes } from './routes/admin/roles';
import { auditLogRoutes } from './routes/admin/auditLogs';
import { loginLogRoutes } from './routes/admin/loginLogs';
import { maskConfigAdminRoutes } from './routes/adminMaskConfig';
// 【质量与合规】M155-B：患者隐私深度脱敏 + 合规自检 GET /api/v1/admin/privacy/compliance
import { privacyDeepAdminRoutes } from './routes/privacyDeep';
import { adminPerformanceRoutes } from './routes/adminPerformance';
// 【移动端+性能优化】M128-D：性能优化索引建议 + BFF 缓存观测
import { adminPerformanceOptimizationsRoutes } from './routes/adminPerformanceOptimizations';
// 【质量补齐与新场景】M151-D：慢查询优化闭环 GET /api/v1/admin/performance/optimize
import { perfOptimizeRoutes } from './routes/perfOptimize';
// 【质量与体验】M180-D：性能优化 V2（索引/缓存/前端/服务器 + 基准对比 + 退化检测 + SLO）GET /api/v1/admin/performance/v2
import { perfOptV2Routes } from './routes/perfOptV2';
// 【CDSS与运营精细化】M165-D：性能深度审计（慢查询TOP10/大表/N+1/内存泄漏/前端渲染/熔断器/健康检查）GET /api/v1/admin/performance/deep-audit
import { perfDeepRoutes } from './routes/perfDeep';
// 【前端性能优化】M145-B：打包体积分析 + 路由懒加载报告 GET /api/v1/admin/performance/frontend
import { frontendPerformanceRoutes } from './routes/frontendPerformance';
// 【v4.x近期】M158-C：首屏与缓存优化（路由懒加载/缓存策略/FCP-LCP 测量）GET /api/v1/admin/performance/firstload
import { firstLoadRoutes } from './routes/firstLoad';
// 【AI深化与智能运营】M168-D：系统运维智能化（监控→异常检测→智能告警→自动修复闭环）GET /api/v1/admin/ops/monitoring
import { opsMonitorRoutes } from './routes/opsMonitor';
// 【UI 一致性与无障碍】M150-D：深海蓝 VI 五维度一致性 + WCAG AA 无障碍 GET /api/v1/admin/ui/consistency
import { uiConsistencyRoutes } from './routes/uiConsistency';
// 【质量补齐与新场景】M151-B：UI 无障碍对比度修复验证（#4A90D9→#2E6FB5 / #8C8C8C→#595959，WCAG AA）GET /api/v1/admin/ui/accessibility/verify
import { accessibilityVerifyRoutes } from './routes/accessibilityVerify';
// 【绩效与人才 · 系统安全深化】M166-D：渗透测试与漏洞扫描（SQL注入/XSS/CSRF/信息泄露/认证绕过）GET /api/v1/admin/security/scan
import { securityScanRoutes } from './routes/securityScan';
// 【安全修复与质量提升】M167-B：CSRF 与认证绕过修复验证 GET /api/v1/admin/security/auth-verify
import { authFixRoutes } from './routes/authFix';
// 【安全修复与质量提升】M167-A：SQL 注入参数化 + XSS 输出转义修复复验 GET /api/v1/admin/security/verify
import { securityFixRoutes } from './routes/securityFix';
// 【安全修复与质量提升】M167-C：信息泄露修复与日志安全（PII 脱敏 + 生产错误不泄堆栈/SQL）GET /api/v1/admin/security/log-verify
import { logSecurityRoutes } from './routes/logSecurity';
// 【性能优化 · 慢查询治理】M136-B：P95>300ms 慢路由识别 + SQL 静态优化建议 + 缓存命中观测
import { queryOptimizationRoutes } from './routes/queryOptimization';
// 【生产化收尾】M145-A：核心表慢查询目录 + 索引建议 GET /api/v1/admin/performance/slow-queries
import { dbPerformanceRoutes } from './routes/dbPerformance';
// 【代码质量提升】M150-B：any/ts-ignore/console-log/未使用变量/圈复杂度 五维治理 GET /api/v1/admin/code/quality
import { codeQualityRoutes } from './routes/codeQuality';
// 【质量提升与新场景】M173-B：深度代码质量（圈复杂度拆分/重复块/命名/JSDoc/死代码）GET /api/v1/admin/code/deep-quality
import { codeQualityDeepRoutes } from './routes/codeQualityDeep';
// 【200版本里程碑】M157-C：六项质量门禁复查 GET /api/v1/admin/quality-gate
import { qualityGateRoutes } from './routes/qualityGate';
// 【300版本里程碑】M181-C：八项质量门禁复查 V2 GET /api/v1/admin/quality-gate/v2
import { qualityGateV2Routes } from './routes/qualityGateV2';
import { adminDeptPerformanceRoutes } from './routes/adminDeptPerformance';
import { operationAnalysisRoutes } from './routes/operationAnalysis'; // M163-B：【安全与运营】GET /api/v1/admin/operation/analysis（收入/成本/效率/资源四维，数据支撑不拍脑袋）
// 【医院管理深化】M140-A：个人绩效考核五维评分 + 排名（公平透明，每分有据）
import { performanceReviewRoutes } from './routes/performanceReview';
import { adminHealthRoutes } from './routes/adminHealth';
import { adminDashboardRoutes } from './routes/adminDashboard';
import { adminQualityMonitorRoutes } from './routes/adminQualityMonitor';
import { adminInfectionAlertsRoutes } from './routes/adminInfectionAlerts';
import { infectionControlRoutes } from './routes/infectionControl'; // M141-D：院感实时上报/聚集追踪/月报
import { infectionRealtimeRoutes } from './routes/infectionRealtime'; // M153-C：院感实时监测大屏（超阈值即红色预警，不等月报）
import { aiBrainRoutes } from './routes/aiBrain'; // M156-B：AI 医院大脑实时大屏（门诊/住院/手术/预警 + AI 建议，演示模式轮询）
import { brainDeepRoutes } from './routes/brainDeep'; // M159-A：【中期路线图】AI 大脑深化 GET /api/v1/ai-brain/deep（智能预警/决策建议/7天趋势/根因分析）
import { deepAIAlertRoutes } from './routes/deepAIAlert'; // M175-B：【质量与新场景】AI 深度智能预警 GET /api/v1/ai-brain/deep-alert（四类12阈值/证据链/优先级/可落地处置/闭环）
import { aiDecisionRoutes } from './routes/aiDecision'; // M164-B：【数据中台与AI大脑】POST /api/v1/ai-brain/decision 智能决策支持（方案排序/ROI 评估/效果闭环）
import { aiBrainV2OutpatientRoutes } from './routes/aiBrainV2Outpatient'; // M182-C：【v5.0启动】AI 大脑 2.0 门诊试点 GET /api/v1/ai-brain/v2/outpatient（门诊量/医生负荷/高峰预测/优化建议/等待预警）
import { systemMapRoutes } from './routes/systemMap'; // M157-B：【200版本里程碑】GET /api/v1/admin/system-map 系统功能全景图（八大领域全覆盖）
import { systemMapV2Routes } from './routes/systemMapV2'; // M181-B：【300版本里程碑】GET /api/v1/admin/system-map/v2 系统功能全景图 V2（十大领域全覆盖）
import { adminMigrationsRoutes } from './routes/adminMigrations';
import { adminTrendsRoutes } from './routes/adminTrends';
// 【SaaS化+智慧度】M133-D：系统智慧度六维评分 + 趋势
import { adminIntelligenceScoreRoutes } from './routes/adminIntelligenceScore';
// 【M160-A · 全自学习闭环】GET /api/v1/admin/auto-learn/report 系统每周自动进化报告
import { autoLearnRoutes } from './routes/autoLearn';
// 【M170-A · 自学习与数字孪生】GET /api/v1/admin/auto-learn/deep 四维度深度自学习进化报告
import { autoLearnDeepRoutes } from './routes/autoLearnDeep';
import { resourceOptimizeRoutes } from './routes/resourceOptimize'; // M161-D：POST /api/v1/admin/resource/optimize 资源智能调配（公平轮班）
import { mobileQuickActionsRoutes } from './routes/mobileQuickActions';
// 【用户体验深化 · M134-D】工作台待办聚合：按角色聚合、按紧急度排序，进工作台即见今日最该做的事
import { todosRoutes } from './routes/todos';
import { recordRequestPerformance } from './aggregators/performanceMonitorAggregator';
// 【生产化收尾】M145-C：系统监控指标（七类指标 + 超阈值自动告警），GET /api/v1/admin/metrics
import { systemMetricsRoutes } from './routes/systemMetrics';
import { startSystemMetricSampler } from './aggregators/systemMetricsAggregator';
// 【越用越聪明深化】M146-A：医院智慧资产看板（五维资产 + 六维雷达 + 增长报告）
import { wisdomDashboardRoutes } from './routes/wisdomDashboard';
// 【智慧资产量化】M161-B：全院智慧资产看板（经验/知识/模型/数据四维 + 饱和折算 + 缺口识别 + 段位对标）
import { smartAssetRoutes } from './routes/smartAsset';
// 【自学习与数字孪生】M170-D：医院数据资产深化（四大域15类资产清单/价值评估/缺口识别/治理策略）GET /api/v1/admin/data-asset/inventory
import { dataAssetRoutes } from './routes/dataAsset';
// 【集团与科研】M156-A：医院集团多院管理（下属医院/核心指标对比/跨院资源调配/集团统一标准）
import { groupMultiHospitalRoutes } from './routes/groupMultiHospital';
// 【越用越聪明深化】M146-C：跨科室知识联邦（心内科→急诊/内分泌→营养/外科→麻醉，confidence<0.5 不推荐）
import { knowledgeFederationRoutes } from './routes/knowledgeFederation';
import { tenantService } from '@/tenant';
import { chatRoutes } from './routes/chat';
import { dashboardRoutes } from './routes/dashboard';
import { imagingRoutes } from './routes/imaging';
import { medicalRoutes } from './routes/medical';
import { operationRoutes } from './routes/operation';
import { outpatientRoutes } from './routes/outpatient';
import { inpatientRoutes } from './routes/inpatient';
import { inpatientCareRoutes } from './routes/inpatientCare';
import { emergencyRoutes } from './routes/emergency';
import { pharmacyRoutes } from './routes/pharmacy';
import { pharmacyAuditLearningRoutes } from './routes/pharmacyAuditLearning';
import { medicalQcRoutes } from './routes/medicalQc';
import { medicalGraphRoutes } from './routes/medicalGraph';
import { timelinessRoutes } from './routes/timeliness';
import { emrAssessmentRoutes } from './routes/emrAssessment';
import { aiNoteDraftRoutes } from './routes/aiNoteDraft';
import { medReviewRoutes } from './routes/medReview';
import { diagnosisSuggestionRoutes } from './routes/diagnosisSuggestion';
import { pathwayRecommendationRoutes } from './routes/pathwayRecommendation';
import { losPredictionRoutes } from './routes/losPrediction';
import { voiceMedicalRoutes } from './routes/voiceMedical';
import { voiceRecordRoutes } from './routes/voiceRecord'; // M152-B：病历 AI 语音录入与智能补全（语音转写+智能补全）
import { opsForecastRoutes } from './routes/opsForecast'; // M154-C：【AI深化与运营预测】GET /api/v1/admin/forecast
import { integrationHl7Routes } from './routes/integrationHl7'; // M155-C：【系统集成深化】HL7 v2.x/FHIR R4 接口 POST /api/v1/integration/hl7/parse + /fhir/build
import { integrationDeepRoutes } from './routes/integrationDeep'; // M174-B：【系统集成深化·二期】标准接口扩展 POST /api/v1/integration/deep/parse（ADT^A08/ORM^O02/ORU^R30 + FHIR R4 Encounter/Condition + DICOM + LIS 双向）
import { frontPageRoutes } from './routes/frontPage';
import { researchRoutes } from './routes/research';
import { researchExportRoutes } from './routes/researchExport';
import { researchAiRoutes } from './routes/researchAi'; // M156-C【集团与科研】医学科研智能化：GET /api/v1/research/smart-search + POST /api/v1/research/auto-stats
import { researchLitRoutes } from './routes/researchLit'; // M159-C【集团与科研】科研智能化深化：文献检索/摘要总结/IMRaD 大纲/基金框架
import { empiRoutes } from './routes/empi';
import { dataWarehouseRoutes } from './routes/dataWarehouse';
import { dataMartRoutes } from './routes/dataMart'; // M150-C：医院数据中台·数据集市
import { i18nRoutes } from './routes/i18n'; // M151-C：多语言支持框架 GET /api/v1/i18n（中文/英文，可扩展）
import { i18nDeepRoutes } from './routes/i18nDeep'; // M158-A：【多语言深化·v4.x近期】英文界面完善 GET /api/v1/i18n/translations + POST /api/v1/i18n/translate
import { dataGovernanceRoutes } from './routes/dataGovernance'; // M5-E：数据质量检测/隐私分级；M175-A：【质量与新场景】深度数据治理驾驶舱 GET /api/v1/admin/data/governance（四大治理域/真检查/周期报告/异常识别）
import { dataQualityRoutes } from './routes/dataQuality'; // M159-D：数据质量治理 GET /api/v1/admin/data-quality/report
// 【数据中台与AI大脑】M164-A：数据资产治理 GET /api/v1/admin/data-mart/catalog + /lineage（资产清单/血缘追踪/敏感分级/数据服务）
import { dataMartDeepRoutes } from './routes/dataMartDeep';
// 【CDSS与运营精细化】M165-A：CDSS 临床决策支持 POST /api/v1/cdss/evaluate（规则求值/优先级合并/防告警疲劳）
import { cdssDeepRoutes } from './routes/cdssDeep';
import { outboxRoutes } from './routes/outbox';
import { sessionAdminRoutes } from './routes/sessions';
import { billingRoutes } from './routes/billing';
import { billRoutes } from './routes/bill';
import { drgRoutes } from './routes/drg';
import { exportRoutes } from './routes/export';
import { labInterpretRoutes } from './routes/labInterpret';
import { imagingInterpretRoutes } from './routes/imagingInterpret';
import { imagingAiRoutes } from './routes/imagingAi';
import { imagingAiDeepRoutes } from './routes/imagingAiDeep';
import { criticalRoutes } from './routes/critical';
import { criticalValueClosureRoutes } from './routes/criticalValueClosure';
import { reconRoutes } from './routes/recon';
import { surgeryRoutes } from './routes/surgery';
import { surgeryScheduleRoutes } from './routes/surgerySchedule';
// 【核心业务深化】M130-D 手术排班优化（POST /admin/surgery/schedule/optimize）
import { adminSurgeryOptimizeRoutes } from './routes/adminSurgeryOptimize';
// 【AI深化与智能运营】M168-B 医院运营预测与调配（GET /admin/ops/predict 含置信区间 + POST /admin/ops/schedule-optimize）
import { opsPredictRoutes } from './routes/opsPredict';
import { surgeryChecklistRoutes } from './routes/surgeryChecklist';
import { transfusionRoutes } from './routes/transfusion';
import { bloodQualityRoutes } from './routes/bloodQuality';
import { vteRoutes } from './routes/vte';
import { amsRoutes } from './routes/ams';
import { pathwayRoutes } from './routes/pathway';
import { pathwayVarianceRoutes } from './routes/pathwayVariance';
import { mobileNursingRoutes } from './routes/mobileNursing';
import { mobileStaffRoutes } from './routes/mobileStaff';
import { nursingAdminRoutes } from './routes/nursingAdmin';
import { nursingRiskRoutes } from './routes/nursingRisk';
import { medAdminRoutes } from './routes/medAdmin';
import { tubeCareRoutes } from './routes/tubeCare';
import { nursingEventReviewRoutes } from './routes/nursingEventReview';
import { nursingIoRoutes } from './routes/nursingIo';
import { nursingNqiRoutes } from './routes/nursingNqi';
import { nursingRiskPatternRoutes } from './routes/nursingRiskPattern';
import { nutritionScreeningRoutes } from './routes/nutritionScreening';
import { painAssessmentRoutes } from './routes/painAssessment';
import { preopAssessmentRoutes } from './routes/preopAssessment';
import { pacuRecordRoutes } from './routes/pacuRecord';
import { postopFollowupRoutes } from './routes/postopFollowup';
import { icuSedationRoutes } from './routes/icuSedation';
import { postpartumRoutes } from './routes/postpartumVisit';
import { erTriageRoutes } from './routes/erTriage';
import { barthelRoutes } from './routes/barthel';
import { equipmentRoutes } from './routes/equipment';
import { equipmentDeepRoutes } from './routes/equipmentDeep'; // M177-C：【病案设备耗材】设备管理深化 GET /api/v1/equipment/deep（台账五段/维保预警/强检证书/折旧净值，账实一致）
import { logisticsRoutes } from './routes/logistics';
import { logisticsDeepRoutes } from './routes/logisticsDeep'; // M171-C：【科研教学后勤】后勤智能化深化 POST /api/v1/logistics/deep-dispatch（技能匹配派单/路线优化/需求预测/满意度闭环，不推诿）
import { regionalCoopRoutes } from './routes/regionalCoop'; // M143-D：区域医疗协同（互联网医院与远程医疗）
import { regionalCollabRoutes } from './routes/regionalCollab'; // M159-B：集团化扩展·区域医疗协同（跨院转诊/结果互认/号源共享/资源调配）
import { erGreenRoutes } from './routes/erGreen';
import { chronicRoutes } from './routes/chronicDisease';
import { patientChronicRoutes } from './routes/patientChronic';
import { healthCheckRoutes } from './routes/healthCheck';
import { healthCheckReferralRoutes } from './routes/healthCheckReferral';
import { healthCheckupRoutes } from './routes/healthCheckup'; // M142-A：健康体检管理（预防保健与患者服务）GET /patient/checkup/:id + GET /admin/checkup/list
import { oncologyRoutes } from './routes/oncology';
import { chemoReminderRoutes } from './routes/chemoReminder';
import { psychScreeningRoutes } from './routes/psychScreening';
import { nissRoutes } from './routes/nissReporting';
import { vteAnticoagRoutes } from './routes/vteAnticoag';
import { orderCdsRoutes } from './routes/orderCds';
import { nurseStationRoutes } from './routes/nurseStation';
import { scheduleSlotRoutes } from './routes/scheduleSlot';
import { smartScheduleRoutes } from './routes/smartSchedule'; // M152-C：医院智能排班（AI 能力深化）
import { reportPushRoutes } from './routes/reportPush';
import { patientNotificationRoutes } from './routes/patientNotification';
import { patientReminderRoutes } from './routes/patientReminders';
// M160-D：患者健康管理深化——个性化健康计划（运动/饮食/用药提醒/复查/红旗症状，不一刀切）
import { healthPlanRoutes } from './routes/healthPlan';
import { patientMobileHomeRoutes } from './routes/patientMobileHome';
// 【产品化收尾】M148-C：患者端 H5 一站式首页 GET /api/v1/patient/h5/home
import { patientH5Routes } from './routes/patientH5';
import { patientBillingRoutes } from './routes/patientBilling';
import { patientProfileRoutes } from './routes/patientProfile';
import { rehabTreatmentRoutes } from './routes/rehabTreatment';
import { painClinicRoutes } from './routes/painClinic';
import { cgaRoutes } from './routes/cga';
import { nutritionConsultRoutes } from './routes/nutritionConsult';
import { stopbangRoutes } from './routes/stopbang';
import { dischargePlanRoutes } from './routes/dischargePlan';
import { dischargeSummaryRoutes } from './routes/dischargeSummary';
import { vitalsTrendRoutes } from './routes/vitalsTrend';
import { medicalArchiveRoutes } from './routes/medicalArchive';
import { medicalCopyRoutes } from './routes/medicalCopy';
import { admissionNoteRoutes } from './routes/admissionNote';
import { progressNoteRoutes } from './routes/progressNote';
import { consultRequestRoutes } from './routes/consultRequest';
import { consentFormRoutes } from './routes/consentForm';
import { eSignRoutes } from './routes/eSign';
import { orderRoutes } from './routes/order';
import { nursingRecordRoutes } from './routes/nursingRecord';
import { nurseHandoffRoutes } from './routes/nurseHandoff';
import { assistantHandoverRoutes } from './routes/assistantHandover';
import { surgeryRecordRoutes } from './routes/surgeryRecord';
import { surgerySafetyLearningRoutes } from './routes/surgerySafetyLearning';
import { medicalHeaderRoutes } from './routes/medicalHeader';
import { followupApptRoutes } from './routes/followupAppt';
import { satisfactionSurveyRoutes } from './routes/satisfactionSurvey';
import { satisfactionReminderRoutes } from './routes/satisfactionReminder';
import { mdtRoutes } from './routes/mdt';
import { mdtTreatmentPlanRoutes } from './routes/mdtTreatmentPlan';
import { piccRoutes } from './routes/picc';
import { cdiRoutes } from './routes/cdi';
import { transfusionReactionRoutes } from './routes/transfusionReaction';
import { bloodClosureSlaRoutes } from './routes/bloodClosureSla';
import { sbarRoutes } from './routes/sbar';
import { edObservationRoutes } from './routes/edObservation';
import { infectionDashboardRoutes } from './routes/infectionDashboard';
import { amDashboardRoutes } from './routes/amDashboard';
import { doctorWorkbenchRoutes } from './routes/doctorWorkbench';
import { patientPortalRoutes } from './routes/patientPortal';
import { patientLabExplainRoutes } from './routes/patientLabExplain';
import { surgicalChecklistRoutes } from './routes/surgicalChecklist';
import { alertsRoutes, adminAlertsRoutes } from './routes/alerts';
import { renewalRoutes } from './routes/renewalFlow';
import { drgBudgetRoutes } from './routes/drgBudget';
import { inpatientCostMonitorRoutes } from './routes/inpatientCostMonitor';
import { costAttributionRoutes } from './routes/costAttribution';
import { financeRoutes } from './routes/finance'; // M139-D：医院财务管理 GET /admin/finance/report + POST /transaction
import { financeDeepRoutes } from './routes/financeDeep'; // M178-A：【财务人力行政党建】医院财务管理深化 GET /api/v1/finance/deep（预算执行/科室成本/收入结构/本量利/趋势预测，账实相符）
import { teachingRoutes } from './routes/teaching'; // M140-C：教学管理（医院管理深化）GET/POST /admin/teaching
import { disputeRoutes } from './routes/dispute'; // M141-C：医疗纠纷管理（质量与安全）GET/POST /admin/disputes
import { patientServiceRoutes } from './routes/patientService'; // M142-C：患者服务中心（预防保健与患者服务）POST /patient/service/create + GET /my + GET /admin/service/tickets
import { vaccinationRoutes } from './routes/vaccination'; // M142-B：预防接种（预防保健与患者服务）POST /vaccination/administer + GET /records/:patientId
import { onlineConsultRoutes } from './routes/onlineConsult'; // M143-A：互联网医院在线问诊（互联网医院与远程医疗）POST /consult/create + PUT /:id/accept + PUT /:id/end
import { remoteConsultRoutes } from './routes/remoteConsult'; // M143-B：远程会诊（互联网医院与远程医疗）POST /remote-consult/request + PUT /:id/accept + PUT /:id/report + GET /list
import { improvementTaskRoutes } from './routes/improvementTask';
import { improvementOutcomeRoutes } from './routes/improvementOutcome';
import { dipRoutes } from './routes/dip';
import { paymentSelectionRoutes } from './routes/paymentSelection';
import { settlementReportRoutes } from './routes/settlementReport';
import { settlementAnalyticsRoutes } from './routes/settlementAnalytics';
import { settlementDrilldownRoutes } from './routes/settlementDrilldown';
import { lisRoutes } from './routes/lis';
import { risRoutes } from './routes/ris';
import { apptRoutes } from './routes/appt';
import { internetHospitalRoutes } from './routes/internetHospital';
import { consultationRoutes } from './routes/consultation';
import { internetPrescriptionRoutes } from './routes/internetPrescription';
import { internetPaymentRoutes } from './routes/internetPayment';
import { internetDeliveryRoutes } from './routes/internetDelivery';
import { satisfactionRoutes } from './routes/satisfaction';
import { satisfactionAiRoutes } from './routes/satisfactionAi'; // M153-D：患者满意度智能化分析 GET /api/v1/admin/satisfaction/ai-report（临床决策支持）
import { satisfactionLoopRoutes } from './routes/satisfactionLoop'; // M165-C：【CDSS与运营精细化】患者满意度与服务改进闭环 GET /api/v1/patient/satisfaction/loop（收集→分析→改进→验证，真改进不只登记投诉）
import { satisfactionDeepRoutes } from './routes/satisfactionDeep'; // M174-D：【患者体验深化】满意度闭环 GET /api/v1/patient/satisfaction/deep（多渠道/情感分析/5Why/PDCA/NPS，真改进不只登记）
import { emrSmartScoreRoutes } from './routes/emrSmartScore'; // M154-B：电子病历智能化评分 POST /api/v1/emr/score（六维100分，实质内容公平评分）
import { smartTriageRoutes } from './routes/smartTriage';
import { delegationRoutes } from './routes/delegation';
import { referralRoutes } from './routes/referral';
import { knowledgeBaseRoutes } from './routes/knowledgeBase';
import { emrTemplateRoutes } from './routes/emrTemplate';
import { agentBuilderRoutes } from './routes/agentBuilder';
import { agentRuntimeRoutes } from './routes/agentRuntime';
import { medmuseRoutes } from './routes/medmuse';
import { medmuseRoundReportRoutes } from './routes/medmuseRoundReport';
import { medmuseStreamRoutes } from './routes/medmuseStream';
import { museLessonRoutes } from './routes/museLesson';
import { multimodalityRoutes } from './routes/multimodality';
import { aiNoteQcRoutes } from './routes/aiNoteQc';
import { aiNursingPlanRoutes } from './routes/aiNursingPlan';
import { aiRecordRoutes } from './routes/aiRecord'; // 【AI核心能力深化】M144-B：AI 病历自动生成 POST /api/v1/ai/generate-record
import { terminalQcRoutes } from './routes/terminalQc';
import { deptCockpitRoutes } from './routes/deptCockpit';
import { drugReviewRoutes } from './routes/drugReview';
import { aiDrugReviewRoutes } from './routes/aiDrugReview'; // M144-C
import { medicalQaRoutes } from './routes/medicalQa'; // M154-D：AI 知识问答 POST /api/v1/ai/ask
import { aiQualityRoutes } from './routes/aiQuality'; // M144-D：AI 质控智能审核 POST /api/v1/ai/quality-check
import { drugInventoryRoutes } from './routes/drugInventory';
import { drugLifecycleRoutes } from './routes/drugLifecycle'; // M153-B：药品全生命周期 批次追溯/近效期预警/批次召回
import { supplyRoutes } from './routes/supply';
import { prescriptionReviewRoutes } from './routes/prescriptionReview';
import { assistantPharmacyRoutes } from './routes/assistantPharmacy';
import { assistantDeepReviewRoutes } from './routes/assistantDeepReview';
import { assistantLabRoutes } from './routes/assistantLab';
import { assistantDiagnosisRoutes } from './routes/assistantDiagnosis';
// 【AI核心能力深化】M144-A：AI 辅助诊断增强 POST /api/v1/ai/diagnose（Top3带置信度/鉴别/检查/治疗方向，采纳驳回留痕）
import { aiDiagnoseRoutes } from './routes/aiDiagnose';
// 【AI核心能力深化】M161-C：AI 治疗方案推荐·个体化用药 POST /api/v1/ai/treatment/plan（一线/备选/剂量个体化/相互作用/疗程复查）
import { treatmentPlanRoutes } from './routes/treatmentPlan';
// 【AI深化与运营预测】M154-A：AI 辅助诊断深化 POST /api/v1/ai/diagnose/deep（16病种库/Top5/鉴别/检验影像建议）
import { deepDiagnoseRoutes } from './routes/deepDiagnose';
// 【AI能力深化】M163-C：更多病种与更准诊断 POST /api/v1/ai/diagnose/expand（神经/泌尿/血液/风湿免疫16病种库/反馈再校准/鉴别增补/检查推荐）
import { diseaseExpandRoutes } from './routes/diseaseExpand';
// 【AI深化与智能运营】M168-A：AI 辅助诊断深化·更多病种与鉴别诊断 POST /api/v1/ai/diagnose/expand-v2（消化/呼吸/心血管/内分泌 17 病种/鉴别深化/治疗方案/一致性核查）
import { diagnoseDeepRoutes } from './routes/diagnoseDeep';
// 【持续优化与新场景】M174-C：AI 辅助诊断深化·更多病种 V2 POST /api/v1/ai/diagnose/expand-v2（神经/泌尿/血液/风湿免疫 16 病种/鉴别深化/治疗方案推荐）
import { diagnoseV2Routes } from './routes/diagnoseV2';
// 【AI辅助诊断深化】M160-C：临床指南对齐 POST /api/v1/ai/diagnose/guide（高血压2024/CDS2024/ESC2024/IDSA-ATS2019）
import { guideDxRoutes } from './routes/guideDx';
import { assistantRecordDraftRoutes } from './routes/assistantRecordDraft';
import { emrLevel5Routes } from './routes/emrLevel5';
import { emrGrade5Routes } from './routes/emrGrade5';
import { deptKnowledgeRoutes } from './routes/deptKnowledge';
import { patientRoutes } from './routes/patient';
import { qualityRoutes } from './routes/quality';
import { qualityPdcaRoutes } from './routes/qualityPdca'; // M155-A：【质量与合规】PDCA 持续改进 POST /api/v1/quality/pdca
import { rectificationRoutes } from './routes/rectification';
import { skillRoutes } from './routes/skills';
import { systemRoutes } from './routes/system';
import { systemHealthRoutes } from './routes/systemHealth';
import { agentHealthRoutes } from './routes/agentHealth';
import { notifyConfigRoutes } from './routes/notifyConfig';
import { insuranceAuditRoutes } from './routes/insuranceAudit';
import { adminInsuranceReviewRoutes } from './routes/adminInsuranceReview';
import { drgAuditRoutes } from './routes/drgAudit';
import { drgDeepRoutes } from './routes/drgDeep'; // M176-A：【临床核心深化】DRG/DIP 付费深度分析 GET /api/v1/admin/drg/deep-analysis
import { insuranceDeepRoutes } from './routes/insuranceDeep'; // M179-C：【护理院感医保药事】医院医保管理深化 GET /api/v1/insurance/deep（政策目录甲乙丙/费用三道防线审核/门诊住院DRG-DIP结算/拒付申诉整改追回闭环，合规不骗保）
import { medicalRecordDeepRoutes } from './routes/medicalRecordDeep'; // M177-A：【病案设备耗材】医院病案管理深化 GET /api/v1/medical-record/deep（ICD-10诊断+ICD-9-CM-3手术编码校验/归档时限/首页合格率·编码准确率·缺项率/借阅跟踪）
import { qcRectificationRoutes } from './routes/qcRectification';
import { monthlyReportRoutes } from './routes/monthlyReport';
import { reportExportRoutes } from './routes/reportExport';
import { exportReportRoutes } from './routes/exportReport'; // M148-D：报表中心 PDF/Excel 打印级导出（产品化收尾）
import { bedMapRoutes } from './routes/bedMap';
import { digitalTwinRoutes } from './routes/digitalTwin'; // M160-B：医院数字孪生 2D GET /api/v1/admin/digital-twin/building/:building
import { digitalTwinDeepRoutes } from './routes/digitalTwinDeep'; // M161-A：数字孪生深化 GET /api/v1/admin/digital-twin/stream + POST /simulate（定时快照轮询/流程仿真/资源预测）
import { twinDeepRoutes } from './routes/twinDeep'; // M170-B：【自学习与数字孪生】多建筑与仿真 GET /api/v1/admin/digital-twin/multi（门诊/住院/医技/急诊四楼宇 2D 可视化 + 患者流仿真 + 密度预测 + 路线优化）
import { twin3DRoutes } from './routes/twin3D'; // M175-C：【质量与新场景】3D 数字孪生 GET /api/v1/admin/digital-twin/3d（三维挤出建模/床位四色/脱敏患者三维位置/等距投影渲染）
import { twin3DInpatientRoutes } from './routes/twin3DInpatient'; // v5.0启动 M182-D：数字孪生 3D 住院试点 GET /api/v1/admin/digital-twin/v2/inpatient（住院楼3D楼层图/床位四态映射/护士站负荷监控/住院流仿真，先住院不做全院重建）
import { anesthesiaDeepRoutes } from './routes/anesthesiaDeep'; // M176-C：【临床核心深化】手术麻醉管理深化 GET /api/v1/surgery/anesthesia/deep（术前 ASA/心肺风险评估 + 术中生命体征/BIS/出血监测告警 + 术后 PACU/疼痛/并发症 + 麻醉质量四级评价）
import { consumableSpdRoutes } from './routes/consumableSpd'; // M177-D：【病案设备耗材】SPD 物流 GET /api/v1/consumable/spd（采购/三级库位/扫码消耗计费/PPV 结算 + 高值耗材一物一码追溯不漏）
import { teachingDeepRoutes } from './routes/teachingDeep'; // M162-B：教学与培训深化 GET /api/v1/teaching/courses + POST /api/v1/teaching/exam（录播/直播/OSCE/规培出科/继教学分，考核公平不走过场）
import { teachingOnlineRoutes } from './routes/teachingOnline'; // M171-B：【科研教学后勤】在线学习与考核 GET /api/v1/teaching/courses?category= + POST /api/v1/teaching/quiz/submit（视频课程/自动出题/自动阅卷/学习路径/学分自动认定）
import { ceoDashboardRoutes } from './routes/ceoDashboard';
import { hrDeepRoutes } from './routes/hrDeep'; // M178-B：【财务人力行政党建】医院人力资源深化 GET /api/v1/hr/deep（编制公开+招聘≥3评委去两端取均+培训学分认规则+绩效KPI公式列化可复算，人力资源要公平不暗箱）
import { nursingDeepRoutes } from './routes/nursingDeep'; // M179-A：【护理院感医保药事】医院护理管理深化 GET /api/v1/nursing/deep（床护比公开+加班调休关怀+不良事件根因分析+三基三严培训+护理论文专利品管圈，护理管理要真关心护士不是监控）
import { opdWorkstationRoutes } from './routes/opdWorkstation';
import { assistantOutpatientRoutes } from './routes/assistantOutpatient';
import { recordSystemHttpRequest } from './aggregators/systemHealthAggregator';
import { healthRoutes } from './routes/health';
import { demoStatusRoutes } from './routes/demoStatus';
import { modelInfoRoutes } from './routes/modelInfo';
import { museLlmStatusRoutes } from './routes/museLlmStatus';
import { aiFeedbackRoutes } from './routes/aiFeedback';
import { patientFeedbackRoutes } from './routes/patientFeedback';
import { adminAuditLogRoutes } from './routes/adminAuditLog';
import { adminBackupRoutes } from './routes/adminBackup';
import { adminImportRoutes } from './routes/adminImport';
import { openApiRoutes } from './routes/openApi';
import { adminApiKeysRoutes } from './routes/adminApiKeys';
import { adminErrorsRoutes } from './routes/adminErrors';
import { errorStatsRoutes } from './routes/errorStats'; // M149-D：错误处理与日志完善 GET /api/v1/admin/errors/stats
import { adminConfigRoutes } from './routes/adminConfig';
import { deployConfigRoutes } from './routes/deployConfig'; // M145-D：部署配置生成（生产化收尾）
import { adminLogsRoutes } from './routes/adminLogs';
import { adminWebhooksRoutes } from './routes/adminWebhooks';
import { apiGatewayRoutes } from './routes/apiGateway'; // M164-D
import { budgetDeepRoutes } from './routes/budgetDeep'; // M165-B：【CDSS与运营精细化】医院预算与成本管理深化 GET /api/v1/admin/budget?dept=&year=（驱动因子测算/执行跟踪/超支预测）
import { performanceDeepRoutes } from './routes/performanceDeep'; // M166-A：【绩效与人才】医院科室绩效考核深化 GET /api/v1/admin/performance/kpi?dept=&period=（五维十三项加权百分制，不只看工作量）
import { opsDeepRoutes } from './routes/opsDeep'; // M172-C：【安全质量与运营】医院运营与管理深化 GET /api/v1/admin/ops/deep?dept=&period=（门诊/住院/手术/财务四域效率分析/对标/瓶颈识别，运营要有数据不拍脑袋）
import { opsAnalysisRoutes } from './routes/opsAnalysis'; // M180-B：【质量与体验】医院运营分析深化 GET /api/v1/admin/ops/analysis?dept=&period=&trendType=&days=（多期趋势/标杆对标/线性回归预测含置信区间，运营要有数据不拍脑袋）
import { officeDeepRoutes } from './routes/officeDeep'; // M178-C：【财务人力行政党建】医院行政办公深化 GET /api/v1/admin/office（公文/会议/档案/督办，节点到人不踢皮球）
import { strategyEvolutionRoutes } from './routes/strategyEvolution';
import { museSystemIntelligenceRoutes } from './routes/museSystemIntelligence';
import { operationalInsightRoutes } from './routes/operationalInsight';
import { inpatientInsightRoutes } from './routes/inpatientInsight';
import { assistantInpatientRoutes } from './routes/assistantInpatient';
import { assistantEmergencyRoutes } from './routes/assistantEmergency';
import { assistantSurgeryRoutes } from './routes/assistantSurgery';
import { assistantInsuranceRoutes } from './routes/assistantInsurance';
import { assistantKnowledgeRoutes } from './routes/assistantKnowledge';
import { assistantLlmChatRoutes } from './routes/assistantLlmChat';
import { patientGuideRoutes } from './routes/patientGuide';
import { doctorPreferenceRoutes } from './routes/doctorPreference';
// 【用户体验深化】M134-B：医生成长档案（月度快照表驱动，成长曲线+雷达+同科室对比）
import { doctorGrowthRoutes } from './routes/doctorGrowth';
import { userSettingsRoutes } from './routes/userSettings';
// 【用户体验深化】M158-D：个性化偏好与统一通知 GET/PUT /api/v1/user/preferences（v4.x近期，纯函数无新表）
import { userPrefRoutes } from './routes/userPref';
// 【越用越聪明深化】M146-B：个人智能体成长报告 GET /api/v1/user/muse/report（让每个员工有成就感）
import { personalGrowthRoutes } from './routes/personalGrowth';
import { notificationRoutes } from './routes/notifications';
// 【产品化收尾】M148-B：统一通知中心 GET /api/v1/notifications + PUT /:id/read（跨系统聚合，不各自发一条）
import { notificationCenterRoutes } from './routes/notificationCenter';
import { learningDashboardRoutes } from './routes/learningDashboard';
import { museHomeRoutes } from './routes/museHome';
import { followupLearningRoutes } from './routes/followupLearning';
import { followUpRoutes } from './routes/followUps';
// M152-D：患者随访智能化（AI能力深化）GET /api/v1/followup/auto-plan/:patientId + POST /api/v1/followup/send
import { smartFollowupRoutes } from './routes/smartFollowup';
// M153-A：临床路径智能推荐（临床决策支持 CDS）GET /api/v1/clinical-pathway/recommend + /cost/:pathwayId + /deviation
import { clinicalPathwayRoutes } from './routes/clinicalPathway';
import { weightEvolutionRoutes } from './routes/weightEvolution';
// M183-A：Doctor MUSE 推荐效果追踪 GET /api/v1/personal-agent/adoption-stats
import { personalAgentAdoptionRoutes } from './routes/personalAgentAdoption';
// M183-B：学习闭环数据飞轮 GET /api/v1/learning/flywheel
import { learningFlywheelRoutes } from './routes/learningFlywheel';
// M183-D：安全审计日志完善 GET /api/v1/admin/audit-log
import { auditLogQueryRoutes } from './routes/auditLogQuery';
// M184-A：护士智能排班优化 POST /api/v1/scheduling/optimize
import { nurseScheduleRoutes } from './routes/nurseSchedule';
// M184-B：智能随访 V2 GET /api/v1/followup/smart
import { smartFollowupV2Routes } from './routes/smartFollowupV2';
// M184-C：设备预测性维护 GET /api/v1/equipment/predictive
import { equipmentPredictiveRoutes } from './routes/equipmentPredictive';
// M184-D：备份容灾 GET /api/v1/admin/backup/strategy
import { backupStrategyRoutes } from './routes/backupStrategy';
// M185-A：AI大脑2.0住院试点 GET /api/v1/ai-brain/v2/inpatient
import { inpatientBrainV2Routes } from './routes/inpatientBrainV2';
// M185-B：数字孪生3D手术室 GET /api/v1/twin3d/or
import { orTwins3DRoutes } from './routes/orTwins3D';
// M185-C：Nurse MUSE V2 护理智能体 GET /api/v1/personal-agent/nurse-muse-v2
import { nurseMUSEV2Routes } from './routes/nurseMUSEV2';
// M185-D：Pharma MUSE V2 药事智能体 GET /api/v1/personal-agent/pharma-muse-v2
import { pharmaMUSEV2Routes } from './routes/pharmaMUSEV2';
// M186-A：Admin MUSE V2 管理智能体 GET /api/v1/personal-agent/admin-muse-v2
import { adminMUSEV2Routes } from './routes/adminMUSEV2';
// M186-B：Patient MUSE V2 患者智能体 GET /api/v1/personal-agent/patient-muse-v2
import { patientMUSEV2Routes } from './routes/patientMUSEV2';
// M186-C：区域协同分级诊疗 GET /api/v1/regional/collaboration
import { regionalCollaborationRoutes } from './routes/regionalCollaboration';
// M186-D：全自学习闭环深化 GET /api/v1/learning/self-loop
import { selfLearningLoopRoutes } from './routes/selfLearningLoop';
// M187-A：生产性能优化 GET /api/v1/admin/performance/report
import { performanceReportRoutes } from './routes/performanceReport';
// M187-B：安全加固 V2 GET /api/v1/admin/security/report-v2
import { securityReportV2Routes } from './routes/securityReportV2';
// M187-C：EMR 五级评审 V2 GET /api/v1/emr/grade5/assessment-v2
import { emrGrade5V2Routes } from './routes/emrGrade5V2';
// M187-D：DRG 智能审核 V2 GET /api/v1/drg/audit/report-v2
import { drgAuditV2Routes } from './routes/drgAuditV2';
// M188-A：临床路径管理 V2 GET /api/v1/clinical/pathway/report-v2
import { clinicalPathwayV2Routes } from './routes/clinicalPathwayV2';
// M188-B：合理用药监测 GET /api/v1/drug/rational/report
import { rationalDrugUseRoutes } from './routes/rationalDrugUse';
// M188-C：院感控制 V2 GET /api/v1/infection/control/report-v2
import { infectionControlV2Routes } from './routes/infectionControlV2';
// M188-D：医疗纠纷预警 GET /api/v1/dispute/warning/report
import { disputeWarningRoutes } from './routes/disputeWarning';
// M189-A：医院绩效管理 GET /api/v1/admin/performance-management/report
import { performanceManagementRoutes } from './routes/performanceManagement';
// M189-B：医院成本核算 GET /api/v1/admin/cost-accounting/report
import { costAccountingRoutes } from './routes/costAccounting';
// M189-C：医院质量管理 GET /api/v1/admin/quality-management/report
import { qualityManagementRoutes } from './routes/qualityManagement';
// M189-D：医院运营分析 GET /api/v1/admin/operations-analytics/report
import { operationsAnalyticsRoutes } from './routes/operationsAnalytics';
// M190-A：检验检查智能审核 GET /api/v1/lab-imaging/audit/report
import { labImagingAuditRoutes } from './routes/labImagingAudit';
// M190-B：输血管理 GET /api/v1/blood/transfusion/report
import { bloodTransfusionRoutes } from './routes/bloodTransfusion';
// M190-C：麻醉管理 GET /api/v1/anesthesia/report
import { anesthesiaRoutes } from './routes/anesthesia';
// M190-D：急诊管理 V2 报表 GET /api/v1/emergency/report
import { emergencyReportV2Routes } from './routes/emergencyReportV2';
// M191-A：科研管理 GET /api/v1/admin/research/report
import { researchManagementRoutes } from './routes/researchManagement';
// M191-B：教学管理 GET /api/v1/admin/teaching/report
import { teachingManagementRoutes } from './routes/teachingManagement';
// M191-C：人力资源管理 GET /api/v1/admin/hr/report
import { hrManagementRoutes } from './routes/hrManagement';
// M191-D：设备物资管理 GET /api/v1/admin/equipment-material/report
import { equipmentMaterialRoutes } from './routes/equipmentMaterial';
// M192-A：财务收费管理 GET /api/v1/admin/finance/report
import { financeBillingRoutes } from './routes/financeBilling';
// M192-B：医保管理深化 GET /api/v1/admin/insurance/report
import { insuranceManagementRoutes } from './routes/insuranceManagement';
// M192-C：公共卫生管理 GET /api/v1/admin/public-health/report
import { publicHealthRoutes } from './routes/publicHealth';
// M192-D：后勤管理 GET /api/v1/admin/logistics/report
import { logisticsManagementRoutes } from './routes/logisticsManagement';
// M193-A：性能压测 GET /api/v1/admin/performance/stress-test
import { performanceStressRoutes } from './routes/performanceStress';
// M193-B：安全渗透测试 GET /api/v1/admin/security/pen-test
import { securityPenTestRoutes } from './routes/securityPenTest';
// M193-C：质量管理体系 GET /api/v1/admin/quality-system/report
import { qualitySystemRoutes } from './routes/qualitySystem';
// M193-D：患者安全 GET /api/v1/admin/patient-safety/report
import { patientSafetyRoutes } from './routes/patientSafety';
// M194-A：党建管理 GET /api/v1/admin/party-building/report
import { partyBuildingRoutes } from './routes/partyBuilding';
// M194-B：纪检监察 GET /api/v1/admin/discipline/report
import { disciplineInspectionRoutes } from './routes/disciplineInspection';
// M194-C：工会管理 GET /api/v1/admin/labor-union/report
import { laborUnionRoutes } from './routes/laborUnion';
// M194-D：宣传管理 GET /api/v1/admin/publicity/report
import { publicityRoutes } from './routes/publicity';
// M195-A：互联网医院已在上方注册（避免重复 import）
// M195-A V2：互联网医院深化 GET /api/v1/internet-hospital/report
import { internetHospitalV2Routes } from './routes/internetHospitalV2';
// M195-B：远程医疗 GET /api/v1/telemedicine/report
import { telemedicineRoutes } from './routes/telemedicine';
// M195-C：移动医疗 GET /api/v1/mobile-health/report
import { mobileHealthRoutes } from './routes/mobileHealth';
// M195-D：智慧医疗 GET /api/v1/smart-healthcare/report
import { smartHealthcareRoutes } from './routes/smartHealthcare';
// M196-A：大数据平台 GET /api/v1/admin/big-data/report
import { bigDataPlatformRoutes } from './routes/bigDataPlatform';
// M196-B：AI 中台 GET /api/v1/admin/ai-platform/report
import { aiPlatformRoutes } from './routes/aiPlatform';
// M196-C：物联网平台 GET /api/v1/admin/iot-platform/report
import { iotPlatformRoutes } from './routes/iotPlatform';
// M196-D：区块链 GET /api/v1/admin/blockchain/report
import { blockchainRoutes } from './routes/blockchain';
// M197-A：云原生 GET /api/v1/admin/cloud-native/report
import { cloudNativeRoutes } from './routes/cloudNative';
// M197-B：微服务 GET /api/v1/admin/microservices/report
import { microservicesRoutes } from './routes/microservices';
// M197-C：DevOps GET /api/v1/admin/devops/report
import { devopsRoutes } from './routes/devops';
// M197-D：SRE GET /api/v1/admin/sre/report
import { sreRoutes } from './routes/sre';
// M198-A：数据安全 GET /api/v1/admin/data-security/report
import { dataSecurityRoutes } from './routes/dataSecurity';
// M198-B：合规 GET /api/v1/admin/compliance/report
import { complianceRoutes } from './routes/compliance';
// M198-C：审计管理 GET /api/v1/admin/audit/report
import { auditManagementRoutes } from './routes/auditManagement';
// M198-D：风险管理 GET /api/v1/admin/risk-management/report
import { riskManagementRoutes } from './routes/riskManagement';
// M199-A：用户体验 GET /api/v1/admin/user-experience/report
import { userExperienceRoutes } from './routes/userExperience';
// M199-B：无障碍 GET /api/v1/admin/accessibility/report
import { accessibilityRoutes } from './routes/accessibility';
// M199-C：适老化 GET /api/v1/admin/elderly-friendly/report
import { elderlyFriendlyRoutes } from './routes/elderlyFriendly';
// M199-D：国际化 GET /api/v1/admin/internationalization/report
import { internationalizationRoutes } from './routes/internationalization';
// M200-A：系统验收 GET /api/v1/admin/acceptance/report
import { systemAcceptanceRoutes } from './routes/systemAcceptance';
// M200-B：文档 GET /api/v1/admin/documentation/report
import { documentationRoutes } from './routes/documentation';
// M200-C：部署准备 GET /api/v1/admin/deployment/readiness
import { deploymentReadinessRoutes } from './routes/deploymentReadiness';
// M200-D：版本发布 GET /api/v1/admin/release/m200
import { m200ReleaseRoutes } from './routes/m200Release';
// M201-A：大模型集成 GET /api/v1/admin/llm/report
import { llmIntegrationRoutes } from './routes/llmIntegration';
// M201-B：多 Agent GET /api/v1/admin/multi-agent/report
import { multiAgentRoutes } from './routes/multiAgent';
// M201-C：专科 GET /api/v1/specialty/report
import { specialtyRoutes } from './routes/specialty';
// M201-D：生产运维 GET /api/v1/admin/production-ops/report
import { productionOpsRoutes } from './routes/productionOps';
// M202-A：康复专科 GET /api/v1/specialty/rehabilitation/report
import { rehabilitationRoutes } from './routes/rehabilitation';
// M202-B：精神心理 GET /api/v1/specialty/psychiatry/report
import { psychiatryRoutes } from './routes/psychiatry';
// M202-C：中医 GET /api/v1/specialty/tcm/report
import { tcmRoutes } from './routes/tcm';
// M202-D：临床试验科研 GET /api/v1/admin/research/report
import { clinicalResearchRoutes } from './routes/clinicalResearch';
// M203-A：ICU GET /api/v1/specialty/icu/report
import { criticalCareRoutes } from './routes/criticalCare';
// M203-B：介入内镜 GET /api/v1/specialty/interventional/report
import { interventionalRoutes } from './routes/interventional';
// M203-C：移植透析 GET /api/v1/specialty/transplant/report
import { transplantRoutes } from './routes/transplant';
// M203-D：AI 影像病理 GET /api/v1/specialty/ai-diagnosis/report
import { aiDiagnosisRoutes } from './routes/aiDiagnosis';
// M204-A：急诊 V3 GET /api/v1/emergency/report-v3
import { emergencyReportV3Routes } from './routes/emergencyReportV3';
// M204-B：手术 V3 GET /api/v1/surgery/report-v3
import { surgeryReportV3Routes } from './routes/surgeryReportV3';
// M204-C：药房 V3 GET /api/v1/pharmacy/report-v3
import { pharmacyReportV3Routes } from './routes/pharmacyReportV3';
// M204-D：检验检查 V3 GET /api/v1/lab-imaging/report-v3
import { labImagingReportV3Routes } from './routes/labImagingReportV3';
// M205-A：护理 V3 GET /api/v1/nursing/report-v3
import { nursingReportV3Routes } from './routes/nursingReportV3';
// M205-B：病案 V3 GET /api/v1/medical-record/report-v3
import { medicalRecordReportV3Routes } from './routes/medicalRecordReportV3';
// M205-C：医保 V3 GET /api/v1/insurance/report-v3
import { insuranceReportV3Routes } from './routes/insuranceReportV3';
// M205-D：等级评审 GET /api/v1/admin/accreditation/report
import { accreditationRoutes } from './routes/accreditation';
// M206-A：患者服务 V3 GET /api/v1/patient-service/report-v3
import { patientServiceReportV3Routes } from './routes/patientServiceReportV3';
// M206-B：健康管理 V3 GET /api/v1/health-management/report-v3
import { healthManagementReportV3Routes } from './routes/healthManagementReportV3';
// M206-C：区域医联体 GET /api/v1/regional/report
import { regionalHealthRoutes } from './routes/regionalHealth';
// M206-D：数据资产 V3 GET /api/v1/data-asset/report-v3
import { dataAssetReportV3Routes } from './routes/dataAssetReportV3';
// M207-A：运营 V3 GET /api/v1/operations/report-v3
import { operationsReportV3Routes } from './routes/operationsReportV3';
// M207-B：科研 V3 GET /api/v1/research/report-v3
import { researchReportV3Routes } from './routes/researchReportV3';
// M207-C：教学 V3 GET /api/v1/education/report-v3
import { educationReportV3Routes } from './routes/educationReportV3';
// M207-D：后勤 V3 GET /api/v1/logistics/report-v3
import { logisticsReportV3Routes } from './routes/logisticsReportV3';
// M208-A：AI 辅助 V2 GET /api/v1/ai-assist/report-v2
import { aiAssistReportV2Routes } from './routes/aiAssistReportV2';
// M208-B：智能预警 V2 GET /api/v1/smart-alert/report-v2
import { smartAlertReportV2Routes } from './routes/smartAlertReportV2';
// M208-C：患者画像 V2 GET /api/v1/patient-profile/report-v2
import { patientProfileReportV2Routes } from './routes/patientProfileReportV2';
// M208-D：知识图谱 V2 GET /api/v1/knowledge-graph/report-v2
import { knowledgeGraphReportV2Routes } from './routes/knowledgeGraphReportV2';
// M209-A：患者安全 V2 GET /api/v1/patient-safety/report-v2
import { patientSafetyReportV2Routes } from './routes/patientSafetyReportV2';
// M209-B：院感 V2 GET /api/v1/infection-control/report-v2
import { infectionControlReportV2Routes } from './routes/infectionControlReportV2';
// M209-C：病历质量 V2 GET /api/v1/mr-quality/report-v2
import { medicalRecordQualityReportV2Routes } from './routes/medicalRecordQualityReportV2';
// M209-D：药品供应链 V2 GET /api/v1/drug-supply/report-v2
import { drugSupplyReportV2Routes } from './routes/drugSupplyReportV2';
// M210-A：智慧医院评价 GET /api/v1/smart-hospital/report
import { smartHospitalReportRoutes } from './routes/smartHospitalReport';
// M210-B：互联互通 GET /api/v1/interoperability/report
import { interoperabilityReportRoutes } from './routes/interoperabilityReport';
// M210-C：EMR 评级 GET /api/v1/emr-rating/report
import { emrRatingReportRoutes } from './routes/emrRatingReport';
// M210-D：国考绩效 GET /api/v1/hospital-kpi/report
import { hospitalKPIReportRoutes } from './routes/hospitalKPIReport';
// M211-A：HRP V2 GET /api/v1/hrp/report-v2
import { hrpReportV2Routes } from './routes/hrpReportV2';
// M211-B：财务 V2 GET /api/v1/finance/report-v2
import { financeReportV2Routes } from './routes/financeReportV2';
// M211-C：人力资源 V2 GET /api/v1/hr/report-v2
import { hrReportV2Routes } from './routes/hrReportV2';
// M211-D：绩效 V2 GET /api/v1/performance/report-v2
import { performanceReportV2Routes } from './routes/performanceReportV2';
// M212-A：党建行政 GET /api/v1/party-admin/report
import { partyAdminReportRoutes } from './routes/partyAdminReport';
// M212-B：医务 V2 GET /api/v1/medical-affairs/report-v2
import { medicalAffairsReportV2Routes } from './routes/medicalAffairsReportV2';
// M212-C：护理 V2 GET /api/v1/nursing/report-v2
import { nursingReportV2Routes } from './routes/nursingReportV2';
// M212-D：药事 V2 GET /api/v1/pharmacy/report-v2
import { pharmacyReportV2Routes } from './routes/pharmacyReportV2';
// M213-A：设备 V2 GET /api/v1/equipment/report-v2
import { equipmentReportV2Routes } from './routes/equipmentReportV2';
// M213-B：后勤安全 GET /api/v1/logistics-safety/report
import { logisticsSafetyReportRoutes } from './routes/logisticsSafetyReport';
// M213-C：信息化 GET /api/v1/informatization/report
import { informatizationReportRoutes } from './routes/informatizationReport';
// M213-D：文化品牌 GET /api/v1/culture-brand/report
import { cultureBrandReportRoutes } from './routes/cultureBrandReport';
// M214-A：互联网医院 V2 GET /api/v1/internet-hospital/report-v2
import { internetHospitalReportV2Routes } from './routes/internetHospitalReportV2';
// M214-B：远程医疗 V2 GET /api/v1/telemedicine/report-v2
import { telemedicineReportV2Routes } from './routes/telemedicineReportV2';
// M214-C：移动医疗 V2 GET /api/v1/mobile-health/report-v2
import { mobileHealthReportV2Routes } from './routes/mobileHealthReportV2';
// M214-D：智慧药房 GET /api/v1/smart-pharmacy/report
import { smartPharmacyReportRoutes } from './routes/smartPharmacyReport';
// M215-A：大数据 V2 GET /api/v1/big-data/report-v2
import { bigDataReportV2Routes } from './routes/bigDataReportV2';
// M215-B：AI 中台 V2 GET /api/v1/ai-platform/report-v2
import { aiPlatformReportV2Routes } from './routes/aiPlatformReportV2';
// M215-C：物联网 GET /api/v1/iot/report
import { iotReportRoutes } from './routes/iotReport';
// M215-D：区块链 GET /api/v1/blockchain/report
import { blockchainReportRoutes } from './routes/blockchainReport';
// M216-A：云原生 V2 GET /api/v1/cloud-native/report-v2
import { cloudNativeReportV2Routes } from './routes/cloudNativeReportV2';
// M216-B：微服务 V2 GET /api/v1/microservice/report-v2
import { microserviceReportV2Routes } from './routes/microserviceReportV2';
// M216-C：DevOps V2 GET /api/v1/devops/report-v2
import { devOpsReportV2Routes } from './routes/devOpsReportV2';
// M216-D：SRE GET /api/v1/sre/report
import { sreReportRoutes } from './routes/sreReport';
// M217-A：数据安全 V2 GET /api/v1/data-security/report-v2
import { dataSecurityReportV2Routes } from './routes/dataSecurityReportV2';
// M217-B：合规管理 GET /api/v1/compliance/report
import { complianceReportRoutes } from './routes/complianceReport';
// M217-C：审计管理 GET /api/v1/audit/report
import { auditReportRoutes } from './routes/auditReport';
// M217-D：风险管理 GET /api/v1/risk/report
import { riskReportRoutes } from './routes/riskReport';
// M218-A：患者体验 V2 GET /api/v1/patient-experience/report-v2
import { patientExperienceReportV2Routes } from './routes/patientExperienceReportV2';
// M218-B：员工体验 V2 GET /api/v1/employee-experience/report-v2
import { employeeExperienceReportV2Routes } from './routes/employeeExperienceReportV2';
// M218-C：流程优化 GET /api/v1/process-optimization/report
import { processOptimizationReportRoutes } from './routes/processOptimizationReport';
// M218-D：智慧服务评级 GET /api/v1/smart-service/report
import { smartServiceRatingReportRoutes } from './routes/smartServiceRatingReport';
// M219-A：学科建设 V2 GET /api/v1/discipline/report-v2
import { disciplineReportV2Routes } from './routes/disciplineReportV2';
// M219-B：人才队伍 V2 GET /api/v1/talent/report-v2
import { talentReportV2Routes } from './routes/talentReportV2';
// M219-C：科研创新 V2 GET /api/v1/research/report-v2
import { researchReportV2Routes } from './routes/researchReportV2';
// M219-D：教学培训 V2 GET /api/v1/teaching/report-v2
import { teachingReportV2Routes } from './routes/teachingReportV2';
// M220-A：后勤基建 V2 GET /api/v1/logistics/report-v2
import { logisticsReportV2Routes } from './routes/logisticsReportV2';
// M220-B：环境保护 GET /api/v1/environment/report
import { environmentReportRoutes } from './routes/environmentReport';
// M220-C：营养膳食 GET /api/v1/nutrition/report
import { nutritionReportRoutes } from './routes/nutritionReport';
// M220-D：安宁疗护 GET /api/v1/hospice/report
import { hospiceReportRoutes } from './routes/hospiceReport';
// M221-A：传染病防控 V2 GET /api/v1/infectious-disease/report-v2
import { infectiousDiseaseReportV2Routes } from './routes/infectiousDiseaseReportV2';
// M221-B：妇幼健康 V2 GET /api/v1/maternal-child/report-v2
import { maternalChildReportV2Routes } from './routes/maternalChildReportV2';
// M221-C：老年健康 V2 GET /api/v1/geriatrics/report-v2
import { geriatricsReportV2Routes } from './routes/geriatricsReportV2';
// M221-D：职业病防治 GET /api/v1/occupational-health/report
import { occupationalHealthReportRoutes } from './routes/occupationalHealthReport';
// M222-A：康复医学 V2 GET /api/v1/rehabilitation/report-v2
import { rehabilitationReportV2Routes } from './routes/rehabilitationReportV2';
// M222-B：健康管理 V2 GET /api/v1/health-management/report-v2
import { healthManagementReportV2Routes } from './routes/healthManagementReportV2';
// M222-C：急救体系 V2 GET /api/v1/emergency/report-v2
import { emergencyDeepeningV2Routes } from './routes/emergencyDeepeningV2';
// M222-D：疼痛管理 GET /api/v1/pain/report
import { painReportRoutes } from './routes/painReport';
// M223-A：检验中心 V2 GET /api/v1/laboratory/report-v2
import { laboratoryReportV2Routes } from './routes/laboratoryReportV2';
// M223-B：影像中心 V2 GET /api/v1/imaging/report-v2
import { imagingReportV2Routes } from './routes/imagingReportV2';
// M223-C：病理中心 V2 GET /api/v1/pathology/report-v2
import { pathologyReportV2Routes } from './routes/pathologyReportV2';
// M223-D：功能检查中心 GET /api/v1/functional/report
import { functionalReportRoutes } from './routes/functionalReport';
// M224-A：手术中心 V2 GET /api/v1/surgery/report-v2
import { surgeryReportV2Routes } from './routes/surgeryReportV2';
// M224-B：麻醉中心 V2 GET /api/v1/anesthesia/report-v2
import { anesthesiaReportV2Routes } from './routes/anesthesiaReportV2';
// M224-C：输血管理 GET /api/v1/transfusion/report
import { transfusionReportRoutes } from './routes/transfusionReport';
// M224-D：重症医学 V2 GET /api/v1/icu/report-v2
import { icuReportV2Routes } from './routes/icuReportV2';
// M225-A：门诊管理 V2 GET /api/v1/outpatient/report-v2
import { outpatientReportV2Routes } from './routes/outpatientReportV2';
// M225-B：住院管理 V2 GET /api/v1/inpatient/report-v2
import { inpatientReportV2Routes } from './routes/inpatientReportV2';
// M225-C：急诊管理 V2 GET /api/v1/emergency/report-v2
import { emergencyMgmtReportV2Routes } from './routes/emergencyMgmtReportV2';
// M225-D：病案管理 V2 GET /api/v1/medical-record/report-v2
import { medRecordMgmtReportV2Routes } from './routes/medRecordMgmtReportV2';
// M226-A：医保管理 V2 GET /api/v1/insurance/report-v2
import { insuranceMgmtReportV2Routes } from './routes/insuranceMgmtReportV2';
// M226-B：物价收费 V2 GET /api/v1/pricing/report-v2
import { pricingReportV2Routes } from './routes/pricingReportV2';
// M226-C：财务核算 V2 GET /api/v1/finance/report-v2
import { financeMgmtReportV2Routes } from './routes/financeMgmtReportV2';
// M226-D：绩效管理 V2 GET /api/v1/performance/report-v2
import { performanceMgmtReportV2Routes } from './routes/performanceMgmtReportV2';
// M227-A：信息化规划 V2 GET /api/v1/informatization/report-v2
import { informatizationPlanReportV2Routes } from './routes/informatizationPlanReportV2';
// M227-B：数据治理 V2 GET /api/v1/data-governance/report-v2
import { dataGovernanceReportV2Routes } from './routes/dataGovernanceReportV2';
// M227-C：网络安全 V2 GET /api/v1/cybersecurity/report-v2
import { cybersecurityReportV2Routes } from './routes/cybersecurityReportV2';
// M227-D：运维管理 V2 GET /api/v1/ops/report-v2
import { opsReportV2Routes } from './routes/opsReportV2';
// M228-A：党建 V2 GET /api/v1/party-building/report-v2
import { partyBuildingReportV2Routes } from './routes/partyBuildingReportV2';
// M228-B：文化品牌 V2 GET /api/v1/culture-brand/report-v2
import { cultureBrandReportV2Routes } from './routes/cultureBrandReportV2';
// M228-C：行政办公 V2 GET /api/v1/administration/report-v2
import { administrationReportV2Routes } from './routes/administrationReportV2';
// M228-D：工会群团 V2 GET /api/v1/union/report-v2
import { unionReportV2Routes } from './routes/unionReportV2';
// M229-A：应急管理 V2 GET /api/v1/emergency-mgmt/report-v2
import { emergencyResponseV2Routes } from './routes/emergencyResponseV2';
// M229-B：消防安保 V2 GET /api/v1/fire-security/report-v2
import { fireSecurityReportV2Routes } from './routes/fireSecurityReportV2';
// M229-C：特种设备与危化品 GET /api/v1/special-equip-hazmat/report
import { specialEquipHazmatReportRoutes } from './routes/specialEquipHazmatReport';
// M229-D：院感控制 V3 GET /api/v1/infection-control/report-v3
import { infectionControlReportV3Routes } from './routes/infectionControlReportV3';
// M230-A：高质量发展 V2 GET /api/v1/high-quality-development/report-v2
import { highQualityDevelopmentReportV2Routes } from './routes/highQualityDevelopmentReportV2';
// M230-B：等级评审 V3 GET /api/v1/accreditation/report-v3
import { accreditationReportV3Routes } from './routes/accreditationReportV3';
// M230-C：DRG/DIP V2 GET /api/v1/drg-dip/report-v2
import { drgDIPReportV2Routes } from './routes/drgDIPReportV2';
// M230-D：学科评估 V3 GET /api/v1/discipline-assessment/report-v3
import { disciplineAssessmentReportV3Routes } from './routes/disciplineAssessmentReportV3';
// M231-A：智慧医院 V3 GET /api/v1/smart-hospital-v3/report
import { smartHospitalV3ReportRoutes } from './routes/smartHospitalV3Report';
// M231-B：互联互通 V3 GET /api/v1/interop-v3/report
import { interopV3ReportRoutes } from './routes/interopV3Report';
// M231-C：EMR 评级 V3 GET /api/v1/emr-rating-v3/report
import { emrRatingV3ReportRoutes } from './routes/emrRatingV3Report';
// M231-D：v4.0.0 里程碑 GET /api/v1/v4-milestone/report
import { v4MilestoneReportRoutes } from './routes/v4MilestoneReport';
// M232-A：AI 大脑 V3 GET /api/v1/ai-brain-v3/report
import { aiBrainV3ReportRoutes } from './routes/aiBrainV3Report';
// M232-B：Personal Agent V3 GET /api/v1/personal-agent-v3/report
import { personalAgentV3ReportRoutes } from './routes/personalAgentV3Report';
// M232-C：数字孪生 GET /api/v1/digital-twin/report
import { digitalTwinReportRoutes } from './routes/digitalTwinReport';
// M232-D：区域健康大脑 GET /api/v1/regional-brain/report
import { regionalBrainReportRoutes } from './routes/regionalBrainReport';
// M233-A：患者服务智能化 V2 GET /api/v1/patient-service-ai-v2/report
import { patientServiceIntelligentV2Routes } from './routes/patientServiceIntelligentV2';
// M233-B：临床科研智能化 V2 GET /api/v1/clinical-research-ai-v2/report
import { clinicalResearchIntelligentV2Routes } from './routes/clinicalResearchIntelligentV2';
// M233-C：运营决策智能化 V2 GET /api/v1/operations-ai-v2/report
import { operationsIntelligentV2Routes } from './routes/operationsIntelligentV2';
// M233-D：质量安全智能化 V2 GET /api/v1/quality-safety-ai-v2/report
import { qualitySafetyIntelligentV2Routes } from './routes/qualitySafetyIntelligentV2';
// M234-A：互联网医院 V3 GET /api/v1/internet-hospital-v3/report
import { internetHospitalV3ReportRoutes } from './routes/internetHospitalV3Report';
// M234-B：远程医疗 V3 GET /api/v1/telemedicine-v3/report
import { telemedicineV3ReportRoutes } from './routes/telemedicineV3Report';
// M234-C：移动医疗 V3 GET /api/v1/mobile-health-v3/report
import { mobileHealthV3ReportRoutes } from './routes/mobileHealthV3Report';
// M234-D：生态开放 GET /api/v1/ecosystem-open/report
import { ecosystemOpenReportRoutes } from './routes/ecosystemOpenReport';
// M235-A：患者体验智能化 V2 GET /api/v1/patient-experience-ai-v2/report
import { patientExperienceIntelligentV2Routes } from './routes/patientExperienceIntelligentV2';
// M235-B：医护工作智能化 V2 GET /api/v1/clinician-work-ai-v2/report
import { clinicianWorkIntelligentV2Routes } from './routes/clinicianWorkIntelligentV2';
// M235-C：数据中台智能化 V2 GET /api/v1/data-platform-ai-v2/report
import { dataPlatformIntelligentV2Routes } from './routes/dataPlatformIntelligentV2';
// M235-D：安全运营智能化 V2 GET /api/v1/security-ops-ai-v2/report
import { securityOpsIntelligentV2Routes } from './routes/securityOpsIntelligentV2';
// M236-A：绿色医院 V2 GET /api/v1/green-hospital/report
import { greenHospitalV2ReportRoutes } from './routes/greenHospitalV2Report';
// M236-B：供应链 V2 GET /api/v1/supply-chain-v2/report
import { supplyChainV2ReportRoutes } from './routes/supplyChainV2Report';
// M236-C：健康科普 GET /api/v1/health-media/report
import { healthMediaReportRoutes } from './routes/healthMediaReport';
// M236-D：国际医疗 V2 GET /api/v1/international-health-v2/report
import { internationalHealthV2ReportRoutes } from './routes/internationalHealthV2Report';
// M237-A：AI 药物研发 GET /api/v1/ai-drug/report
import { aiDrugDiscoveryReportRoutes } from './routes/aiDrugDiscoveryReport';
// M237-B：脑机接口与神经康复 GET /api/v1/bci-neuro-rehab/report
import { bciNeuroRehabReportRoutes } from './routes/bciNeuroRehabReport';
// M237-C：基因与精准医疗 GET /api/v1/genomic-precision/report
import { genomicPrecisionReportRoutes } from './routes/genomicPrecisionReport';
// M237-D：元宇宙医院 GET /api/v1/metaverse-hospital/report
import { metaverseHospitalReportRoutes } from './routes/metaverseHospitalReport';
// M238-A：CDSS V3 GET /api/v1/cdss-v3/report
import { cdssV3ReportRoutes } from './routes/cdssV3Report';
// M238-B：影像 AI V3 GET /api/v1/imaging-ai-v3/report
import { imagingAIV3ReportRoutes } from './routes/imagingAIV3Report';
// M238-C：病历智能 V3 GET /api/v1/emr-intelligent-v3/report
import { emrIntelligentV3ReportRoutes } from './routes/emrIntelligentV3Report';
// M238-D：知识图谱 V3 GET /api/v1/knowledge-graph-v3/report
import { knowledgeGraphV3ReportRoutes } from './routes/knowledgeGraphV3Report';
// M239-A：预防医学 V3 GET /api/v1/preventive-medicine-v3/report
import { preventiveMedicineV3ReportRoutes } from './routes/preventiveMedicineV3Report';
// M239-B：妇幼全周期 V3 GET /api/v1/maternal-child-lifecycle-v3/report
import { maternalChildLifecycleV3ReportRoutes } from './routes/maternalChildLifecycleV3Report';
// M239-C：老年全周期 V3 GET /api/v1/geriatrics-lifecycle-v3/report
import { geriatricsLifecycleV3ReportRoutes } from './routes/geriatricsLifecycleV3Report';
// M239-D：职业环境 V3 GET /api/v1/occupational-environmental-v3/report
import { occupationalEnvironmentalV3ReportRoutes } from './routes/occupationalEnvironmentalV3Report';
// M240-A：运营驾驶舱 V3 GET /api/v1/ops-dashboard-v3/report
import { opsDashboardV3ReportRoutes } from './routes/opsDashboardV3Report';
// M240-B：成本核算 V3 GET /api/v1/cost-accounting-v3/report
import { costAccountingV3ReportRoutes } from './routes/costAccountingV3Report';
// M240-C：绩效 V3 GET /api/v1/performance-v3/report
import { performanceV3ReportRoutes } from './routes/performanceV3Report';
// M240-D：HRP V3 GET /api/v1/hrp-v3/report
import { hrpV3ReportRoutes } from './routes/hrpV3Report';
// M241-A：患者安全 V3 GET /api/v1/patient-safety-v3/report
import { patientSafetyV3ReportRoutes } from './routes/patientSafetyV3Report';
// M241-B：医疗质量 V3 GET /api/v1/medical-quality-v3/report
import { medicalQualityV3ReportRoutes } from './routes/medicalQualityV3Report';
// M241-C：护理质量 V3 GET /api/v1/nursing-quality-v3/report
import { nursingQualityV3ReportRoutes } from './routes/nursingQualityV3Report';
// M241-D：患者体验 V3 GET /api/v1/patient-experience-v3/report
import { patientExperienceV3ReportRoutes } from './routes/patientExperienceV3Report';
// M242-A：学科建设 V3 GET /api/v1/discipline-v3/report
import { disciplineV3ReportRoutes } from './routes/disciplineV3Report';
// M242-B：人才队伍 V3 GET /api/v1/talent-v3/report
import { talentV3ReportRoutes } from './routes/talentV3Report';
// M242-C：科研创新 V3 GET /api/v1/research-v3/report
import { researchV3ReportRoutes } from './routes/researchV3Report';
// M242-D：教学培训 V3 GET /api/v1/teaching-v3/report
import { teachingV3ReportRoutes } from './routes/teachingV3Report';
// M243-A：后勤保障 V3 GET /api/v1/logistics-v3/report
import { logisticsV3ReportRoutes } from './routes/logisticsV3Report';
// M243-B：设备耗材 V3 GET /api/v1/equipment-supply-v3/report
import { equipmentSupplyV3ReportRoutes } from './routes/equipmentSupplyV3Report';
// M243-C：安全保卫 V3 GET /api/v1/security-v3/report
import { securityV3ReportRoutes } from './routes/securityV3Report';
// M243-D：应急管理 V3 GET /api/v1/emergency-mgmt-v3/report
import { emergencyMgmtV3ReportRoutes } from './routes/emergencyMgmtV3Report';
// M244-A：信息化规划 V3 GET /api/v1/informatization-v3/report
import { informatizationV3ReportRoutes } from './routes/informatizationV3Report';
// M244-B：数据治理 V3 GET /api/v1/data-governance-v3/report
import { dataGovernanceV3ReportRoutes } from './routes/dataGovernanceV3Report';
// M244-C：网络安全 V3 GET /api/v1/cybersecurity-v3/report
import { cybersecurityV3ReportRoutes } from './routes/cybersecurityV3Report';
// M244-D：运维管理 V3 GET /api/v1/ops-v3/report
import { opsV3ReportRoutes } from './routes/opsV3Report';
// M245-A：党建 V3 GET /api/v1/party-building-v3/report
import { partyBuildingV3ReportRoutes } from './routes/partyBuildingV3Report';
// M245-B：文化品牌 V3 GET /api/v1/culture-brand-v3/report
import { cultureBrandV3ReportRoutes } from './routes/cultureBrandV3Report';
// M245-C：行政办公 V3 GET /api/v1/administration-v3/report
import { administrationV3ReportRoutes } from './routes/administrationV3Report';
// M245-D：工会群团 V3 GET /api/v1/union-v3/report
import { unionV3ReportRoutes } from './routes/unionV3Report';
// M246-A：绿色医院 V3 GET /api/v1/green-hospital-v3/report
import { greenHospitalV3ReportRoutes } from './routes/greenHospitalV3Report';
// M246-B：供应链 V3 GET /api/v1/supply-chain-v3/report
import { supplyChainV3ReportRoutes } from './routes/supplyChainV3Report';
// M246-C：健康科普 V3 GET /api/v1/health-media-v3/report
import { healthMediaV3ReportRoutes } from './routes/healthMediaV3Report';
// M246-D：国际医疗 V3 GET /api/v1/international-health-v3/report
import { internationalHealthV3ReportRoutes } from './routes/internationalHealthV3Report';
// M247-A：AI 药物 V2 GET /api/v1/ai-drug-v2/report
import { aiDrugV2ReportRoutes } from './routes/aiDrugV2Report';
// M247-B：脑机接口 V2 GET /api/v1/bci-neuro-rehab-v2/report
import { bciNeuroRehabV2ReportRoutes } from './routes/bciNeuroRehabV2Report';
// M247-C：基因精准 V2 GET /api/v1/genomic-precision-v2/report
import { genomicPrecisionV2ReportRoutes } from './routes/genomicPrecisionV2Report';
// M247-D：元宇宙医院 V2 GET /api/v1/metaverse-hospital-v2/report
import { metaverseHospitalV2ReportRoutes } from './routes/metaverseHospitalV2Report';
// M248-A：CDSS V4 GET /api/v1/cdss-v4/report
import { cdssV4ReportRoutes } from './routes/cdssV4Report';
// M248-B：影像 AI V4 GET /api/v1/imaging-ai-v4/report
import { imagingAIV4ReportRoutes } from './routes/imagingAIV4Report';
// M248-C：病历智能 V4 GET /api/v1/emr-intelligent-v4/report
import { emrIntelligentV4ReportRoutes } from './routes/emrIntelligentV4Report';
// M248-D：知识图谱 V4 GET /api/v1/knowledge-graph-v4/report
import { knowledgeGraphV4ReportRoutes } from './routes/knowledgeGraphV4Report';
// M249-A：预防公卫 V4 GET /api/v1/preventive-medicine-v4/report
import { preventiveMedicineV4ReportRoutes } from './routes/preventiveMedicineV4Report';
// M249-B：妇幼 V4 GET /api/v1/maternal-child-lifecycle-v4/report
import { maternalChildLifecycleV4ReportRoutes } from './routes/maternalChildLifecycleV4Report';
// M249-C：老年 V4 GET /api/v1/geriatrics-lifecycle-v4/report
import { geriatricsLifecycleV4ReportRoutes } from './routes/geriatricsLifecycleV4Report';
// M249-D：职业环境 V4 GET /api/v1/occupational-environmental-v4/report
import { occupationalEnvironmentalV4ReportRoutes } from './routes/occupationalEnvironmentalV4Report';
// M250-A：运营驾驶舱 V4 GET /api/v1/ops-dashboard-v4/report
import { opsDashboardV4ReportRoutes } from './routes/opsDashboardV4Report';
// M250-B：成本核算 V4 GET /api/v1/cost-accounting-v4/report
import { costAccountingV4ReportRoutes } from './routes/costAccountingV4Report';
// M250-C：绩效 V4 GET /api/v1/performance-v4/report
import { performanceV4ReportRoutes } from './routes/performanceV4Report';
// M250-D：HRP V4 GET /api/v1/hrp-v4/report
import { hrpV4ReportRoutes } from './routes/hrpV4Report';
// M251-A：急诊 V4 GET /api/v1/emergency-v4/report
import { emergencyV4ReportRoutes } from './routes/emergencyV4Report';
// M251-B：手术麻醉 V4 GET /api/v1/surgery-anesthesia-v4/report
import { surgeryAnesthesiaV4ReportRoutes } from './routes/surgeryAnesthesiaV4Report';
// M251-C：药房 V4 GET /api/v1/pharmacy-v4/report
import { pharmacyV4ReportRoutes } from './routes/pharmacyV4Report';
// M251-D：检验 V4 GET /api/v1/laboratory-v4/report
import { laboratoryV4ReportRoutes } from './routes/laboratoryV4Report';
// M252-A：护理 V4 GET /api/v1/nursing-v4/report
import { nursingV4ReportRoutes } from './routes/nursingV4Report';
// M252-B：病案 V4 GET /api/v1/medical-record-v4/report
import { medicalRecordV4ReportRoutes } from './routes/medicalRecordV4Report';
// M252-C：医保 V4 GET /api/v1/insurance-v4/report
import { insuranceV4ReportRoutes } from './routes/insuranceV4Report';
// M252-D：门诊住院 V4 GET /api/v1/outpatient-inpatient-v4/report
import { outpatientInpatientV4ReportRoutes } from './routes/outpatientInpatientV4Report';
// M253-A：患者服务 V4 GET /api/v1/patient-service-v4/report
import { patientServiceV4ReportRoutes } from './routes/patientServiceV4Report';
// M253-B：健康管理 V4 GET /api/v1/health-management-v4/report
import { healthManagementV4ReportRoutes } from './routes/healthManagementV4Report';
// M253-C：区域医联体 V4 GET /api/v1/regional-alliance-v4/report
import { regionalMedicalAllianceV4ReportRoutes } from './routes/regionalMedicalAllianceV4Report';
// M253-D：数据资产 V4 GET /api/v1/data-asset-v4/report
import { dataAssetV4ReportRoutes } from './routes/dataAssetV4Report';
// M254-A：运营分析 V4 GET /api/v1/operations-analysis-v4/report
import { operationsAnalysisV4ReportRoutes } from './routes/operationsAnalysisV4Report';
// M254-B：科研管理 V4 GET /api/v1/research-management-v4/report
import { researchManagementV4ReportRoutes } from './routes/researchManagementV4Report';
// M254-C：教学培训 V4 GET /api/v1/teaching-training-v4/report
import { teachingTrainingV4ReportRoutes } from './routes/teachingTrainingV4Report';
// M254-D：后勤设备 V4 GET /api/v1/logistics-equipment-v4/report
import { logisticsEquipmentV4ReportRoutes } from './routes/logisticsEquipmentV4Report';
// M255-A：AI 辅助诊断 V3 GET /api/v1/ai-diagnosis-v3/report
import { aiDiagnosisV3ReportRoutes } from './routes/aiDiagnosisV3Report';
// M255-B：智能预警 V3 GET /api/v1/intelligent-alert-v3/report
import { intelligentAlertV3ReportRoutes } from './routes/intelligentAlertV3Report';
// M255-C：患者画像 V3 GET /api/v1/patient-profile-v3/report
import { patientProfileV3ReportRoutes } from './routes/patientProfileV3Report';
// M255-D：临床规则引擎 V3 GET /api/v1/clinical-rule-engine-v3/report
import { clinicalRuleEngineV3ReportRoutes } from './routes/clinicalRuleEngineV3Report';
// M256-A：患者安全 V3 已在上方注册（避免重复 import）
// M256-B：院感控制 V3 GET /api/v1/infection-control-v3/report
import { infectionControlV3ReportRoutes } from './routes/infectionControlV3Report';
// M256-C：病历质量 V3 GET /api/v1/record-quality-v3/report（里程碑 v5.00.0）
import { recordQualityV3ReportRoutes } from './routes/recordQualityV3Report';
// M256-D：药品供应链 V3 GET /api/v1/drug-supply-chain-v3/report
import { drugSupplyChainV3ReportRoutes } from './routes/drugSupplyChainV3Report';
// M257-A：医院 OS 底座 V5 GET /api/v1/hospital-os-v5/report
import { hospitalOSV5ReportRoutes } from './routes/hospitalOSV5Report';
// M257-B：Personal Agent 2.0 V5 GET /api/v1/personal-agent-v5/report
import { personalAgentV5ReportRoutes } from './routes/personalAgentV5Report';
// M257-C：AI 大脑 3.0 V5 GET /api/v1/ai-brain-v5/report
import { aiBrainV5ReportRoutes } from './routes/aiBrainV5Report';
// M257-D：数据飞轮 V5 GET /api/v1/data-flywheel-v5/report
import { dataFlywheelV5ReportRoutes } from './routes/dataFlywheelV5Report';
// M258-A：AI 门诊全流程闭环 V5 GET /api/v1/outpatient-ai-loop-v5/report
import { outpatientAIClosedLoopV5ReportRoutes } from './routes/outpatientAIClosedLoopV5Report';
// M258-B：AI 住院全流程闭环 V5 GET /api/v1/inpatient-ai-loop-v5/report
import { inpatientAIClosedLoopV5ReportRoutes } from './routes/inpatientAIClosedLoopV5Report';
// M258-C：AI 手术全流程闭环 V5 GET /api/v1/surgery-ai-loop-v5/report
import { surgeryAIClosedLoopV5ReportRoutes } from './routes/surgeryAIClosedLoopV5Report';
// M258-D：AI 药事全流程闭环 V5 GET /api/v1/pharmacy-ai-loop-v5/report
import { pharmacyAIClosedLoopV5ReportRoutes } from './routes/pharmacyAIClosedLoopV5Report';
// M259-A：AI 科研助手 V5 GET /api/v1/research-ai-v5/report
import { researchAIV5ReportRoutes } from './routes/researchAIV5Report';
// M259-B：AI 教学助手 V5 GET /api/v1/teaching-ai-v5/report
import { teachingAIV5ReportRoutes } from './routes/teachingAIV5Report';
// M259-C：AI 患者陪伴 V5 GET /api/v1/patient-companion-v5/report
import { patientCompanionV5ReportRoutes } from './routes/patientCompanionV5Report';
// M259-D：AI 管理决策助手 V5 GET /api/v1/management-ai-v5/report
import { managementAIV5ReportRoutes } from './routes/managementAIV5Report';
// M260-A：MLOps 模型工程 V5 GET /api/v1/mlops-v5/report
import { mlopsV5ReportRoutes } from './routes/mlopsV5Report';
// M260-B：数据 Mesh 与数据产品化 V5 GET /api/v1/data-mesh-v5/report
import { dataMeshV5ReportRoutes } from './routes/dataMeshV5Report';
// M260-C：云原生 SRE 深化 V5 GET /api/v1/cloud-native-sre-v5/report
import { cloudNativeSREV5ReportRoutes } from './routes/cloudNativeSREV5Report';
// M260-D：医院开发者平台 V5 GET /api/v1/dev-platform-v5/report
import { devPlatformV5ReportRoutes } from './routes/devPlatformV5Report';
// M261-A：零信任与身份安全 V5 GET /api/v1/zero-trust-v5/report
import { zeroTrustV5ReportRoutes } from './routes/zeroTrustV5Report';
// M261-B：隐私计算与数据要素流通 V5 GET /api/v1/privacy-compute-v5/report
import { privacyComputeV5ReportRoutes } from './routes/privacyComputeV5Report';
// M261-C：适老化与无障碍服务 V5 GET /api/v1/elderly-accessible-v5/report
import { elderlyAccessibleV5ReportRoutes } from './routes/elderlyAccessibleV5Report';
// M261-D：ESG 与可持续发展 V5 GET /api/v1/esg-v5/report
import { esgV5ReportRoutes } from './routes/esgV5Report';
// M262-A：互联网医院与处方流转 V5 GET /api/v1/internet-hospital-v5/report
import { internetHospitalV5ReportRoutes } from './routes/internetHospitalV5Report';
// M262-B：医联体分级诊疗智能化 V5 GET /api/v1/medical-alliance-v5/report
import { medicalAllianceV5ReportRoutes } from './routes/medicalAllianceV5Report';
// M262-C：家庭医生签约服务 V5 GET /api/v1/family-doctor-v5/report
import { familyDoctorV5ReportRoutes } from './routes/familyDoctorV5Report';
// M262-D：商业健康保险与惠民保 V5 GET /api/v1/commercial-insurance-v5/report
import { commercialInsuranceV5ReportRoutes } from './routes/commercialInsuranceV5Report';
// M263-A：胸痛中心智能化 V5 GET /api/v1/chest-pain-center-v5/report
import { chestPainCenterV5ReportRoutes } from './routes/chestPainCenterV5Report';
// M263-B：卒中中心智能化 V5 GET /api/v1/stroke-center-v5/report
import { strokeCenterV5ReportRoutes } from './routes/strokeCenterV5Report';
// M263-C：创伤中心智能化 V5 GET /api/v1/trauma-center-v5/report
import { traumaCenterV5ReportRoutes } from './routes/traumaCenterV5Report';
// M263-D：危重症中心智能化 V5 GET /api/v1/critical-care-center-v5/report
import { criticalCareCenterV5ReportRoutes } from './routes/criticalCareCenterV5Report';
// M264-A：肿瘤全程管理 V5 GET /api/v1/oncology-v5/report
import { oncologyV5ReportRoutes } from './routes/oncologyV5Report';
// M264-B：心血管疾病管理 V5 GET /api/v1/cardiology-v5/report
import { cardiologyV5ReportRoutes } from './routes/cardiologyV5Report';
// M264-C：呼吸系统疾病管理 V5 GET /api/v1/pulmonology-v5/report
import { pulmonologyV5ReportRoutes } from './routes/pulmonologyV5Report';
// M264-D：内分泌代谢疾病管理 V5 GET /api/v1/endocrinology-v5/report
import { endocrinologyV5ReportRoutes } from './routes/endocrinologyV5Report';
// M265-A：消化系统疾病管理 V5 GET /api/v1/gastroenterology-v5/report
import { gastroenterologyV5ReportRoutes } from './routes/gastroenterologyV5Report';
// M265-B：肾病与血液净化管理 V5 GET /api/v1/nephrology-v5/report
import { nephrologyV5ReportRoutes } from './routes/nephrologyV5Report';
// M265-C：风湿免疫与过敏性疾病 V5 GET /api/v1/rheumatology-v5/report
import { rheumatologyV5ReportRoutes } from './routes/rheumatologyV5Report';
// M265-D：神经与精神心理疾病 V5 GET /api/v1/neuro-psych-v5/report
import { neuroPsychV5ReportRoutes } from './routes/neuroPsychV5Report';
// M266-A：儿科与新生儿 V5 GET /api/v1/pediatrics-v5/report
import { pediatricsV5ReportRoutes } from './routes/pediatricsV5Report';
// M266-B：妇产科与围产 V5 GET /api/v1/ob-gyn-v5/report
import { obGynV5ReportRoutes } from './routes/obGynV5Report';
// M266-C：皮肤与感染性疾病 V5 GET /api/v1/derm-infectious-v5/report
import { dermInfectiousV5ReportRoutes } from './routes/dermInfectiousV5Report';
// M266-D：眼科耳鼻喉口腔 V5 GET /api/v1/ent-eye-dental-v5/report
import { entEyeDentalV5ReportRoutes } from './routes/entEyeDentalV5Report';
// M267-A：国考绩效 55 指标 V5 GET /api/v1/national-exam-v5/report
import { nationalExamV5ReportRoutes } from './routes/nationalExamV5Report';
// M267-B：电子病历分级评价 0-8 级 V5 GET /api/v1/emr-grade-v5/report
import { emrGradeV5ReportRoutes } from './routes/emrGradeV5Report';
// M267-C：互联互通标准化成熟度 V5 GET /api/v1/interop-v5/report
import { interopV5ReportRoutes } from './routes/interopV5Report';
// M267-D：智慧医院三位一体评级 V5 GET /api/v1/smart-hospital-v5/report
import { smartHospitalV5ReportRoutes } from './routes/smartHospitalV5Report';
// M268-A：智慧病房 IoT V5 GET /api/v1/smart-ward-iot-v5/report
import { smartWardIoTV5ReportRoutes } from './routes/smartWardIoTV5Report';
// M268-B：医院机器人与自动化 V5 GET /api/v1/hospital-robot-v5/report
import { hospitalRobotV5ReportRoutes } from './routes/hospitalRobotV5Report';
// M268-C：5G与边缘计算 V5 GET /api/v1/5g-edge-v5/report
import { edgeV5ReportRoutes } from './routes/edgeV5Report';
// M268-D：数字孪生可视化 V5 GET /api/v1/digital-twin-v5/report
import { digitalTwinV5ReportRoutes } from './routes/digitalTwinV5Report';
// M269-A：临床研究 RWD/RWE 平台 V5 GET /api/v1/rwd-platform-v5/report
import { rwdPlatformV5ReportRoutes } from './routes/rwdPlatformV5Report';
// M269-B：药物临床试验 GCP V5 GET /api/v1/gcp-v5/report
import { gcpV5ReportRoutes } from './routes/gcpV5Report';
// M269-C：生物样本库与科研数据 V5 GET /api/v1/biobank-v5/report
import { biobankV5ReportRoutes } from './routes/biobankV5Report';
// M269-D：住培教学考核 OSCE V5 GET /api/v1/residency-edu-v5/report
import { residencyEducationV5ReportRoutes } from './routes/residencyEducationV5Report';
// M270-A：院内智能导航 V5 GET /api/v1/indoor-navigation-v5/report
import { indoorNavigationV5ReportRoutes } from './routes/indoorNavigationV5Report';
// M270-B：住院一站式服务 V5 GET /api/v1/inpatient-onestop-v5/report
import { inpatientOneStopV5ReportRoutes } from './routes/inpatientOneStopV5Report';
// M270-C：多渠道服务整合 V5 GET /api/v1/omnichannel-v5/report
import { omnichannelV5ReportRoutes } from './routes/omnichannelV5Report';
// M270-D：患者体验监测与改进 V5 GET /api/v1/patient-experience-v5/report
import { patientExperienceV5ReportRoutes } from './routes/patientExperienceV5Report';
// M271-A：电子票据与移动支付 V5 GET /api/v1/e-invoice-payment-v5/report
import { eInvoicePaymentV5ReportRoutes } from './routes/eInvoicePaymentV5Report';
// M271-B：信用就医先诊后付 V5 GET /api/v1/credit-treatment-v5/report
import { creditTreatmentV5ReportRoutes } from './routes/creditTreatmentV5Report';
// M271-C：价格管理与收费合规 V5 GET /api/v1/price-compliance-v5/report
import { priceComplianceV5ReportRoutes } from './routes/priceComplianceV5Report';
// M271-D：对账清算与医保基金监管 V5 GET /api/v1/reconciliation-fund-v5/report
import { reconciliationFundV5ReportRoutes } from './routes/reconciliationFundV5Report';
// M272-A：安宁疗护与缓和医疗 V5 GET /api/v1/hospice-palliative-v5/report
import { hospicePalliativeV5ReportRoutes } from './routes/hospicePalliativeV5Report';
// M272-B：康复医学与日间康复 V5 GET /api/v1/rehabilitation-v5/report
import { rehabilitationV5ReportRoutes } from './routes/rehabilitationV5Report';
// M272-C：临床营养与膳食治疗 V5 GET /api/v1/clinical-nutrition-v5/report
import { clinicalNutritionV5ReportRoutes } from './routes/clinicalNutritionV5Report';
// M272-D：心理心身与 EAP V5 GET /api/v1/psych-eap-v5/report
import { psychEAPV5ReportRoutes } from './routes/psychEAPV5Report';
// M273-A：多院区一体化运行 V5 GET /api/v1/multi-campus-v5/report
import { multiCampusV5ReportRoutes } from './routes/multiCampusV5Report';
// M273-B：集团财务人力物资 V5 GET /api/v1/group-frh-v5/report
import { groupFRHV5ReportRoutes } from './routes/groupFRHV5Report';
// M273-C：集团质控与标准统一 V5 GET /api/v1/group-qa-v5/report
import { groupQAV5ReportRoutes } from './routes/groupQAV5Report';
// M273-D：集团患者转诊与资源调度 V5 GET /api/v1/group-referral-v5/report
import { groupReferralV5ReportRoutes } from './routes/groupReferralV5Report';
// M274-A：健康体检中心智能化 V5 GET /api/v1/health-checkup-v5/report
import { healthCheckupV5ReportRoutes } from './routes/healthCheckupV5Report';
// M274-B：月子中心与产后康复 V5 GET /api/v1/postpartum-care-v5/report
import { postpartumCareV5ReportRoutes } from './routes/postpartumCareV5Report';
// M274-C：医美口腔健康消费 V5 GET /api/v1/aesthetic-dental-v5/report
import { aestheticDentalV5ReportRoutes } from './routes/aestheticDentalV5Report';
// M274-D：健康管理 VIP 服务 V5 GET /api/v1/health-vip-v5/report
import { healthVIPV5ReportRoutes } from './routes/healthVIPV5Report';
// M275-A：MUSE 个人经验沉淀闭环 POST/GET /api/v1/muse-experience
import { museExperienceV5Routes } from './routes/museExperienceV5';
// M275-B：跨角色经验复用 POST/GET /api/v1/experience-share
import { experienceShareV5Routes } from './routes/experienceShareV5';
// M275-C：失败案例回灌学习飞轮 POST/GET /api/v1/failure-flywheel
import { failureFlywheelV5Routes } from './routes/failureFlywheelV5';
// M275-D：经验图谱与后继者继承 POST/GET /api/v1/experience-graph
import { experienceGraphV5Routes } from './routes/experienceGraphV5';
// M276-A：AI 建议全链路审计 POST/GET /api/v1/ai-advice-trace
import { aiAdviceTraceV5Routes } from './routes/aiAdviceTraceV5';
// M276-B：新知识自动入库与指南更新监测 POST/GET/PUT /api/v1/knowledge-intake
import { knowledgeIntakeV5Routes } from './routes/knowledgeIntakeV5';
// M276-C：虚拟病例演练与团队复盘 POST/GET /api/v1/drill-case
import { drillCaseV5Routes } from './routes/drillCaseV5';
// M276-D：医生能力画像与个性化学习路径 GET/PUT /api/v1/competency-profile
import { competencyProfileV5Routes } from './routes/competencyProfileV5';
// M277-A：门诊与手术量预测 V3 GET/POST /api/v1/volume-forecast
import { volumeForecastV3Routes } from './routes/volumeForecastV3';
// M277-B：床位需求与周转预测 V3 GET/POST /api/v1/bed-forecast
import { bedForecastV3Routes } from './routes/bedForecastV3';
// M277-C：耗材库存与供应预测 V3 GET/POST /api/v1/supply-forecast
import { supplyForecastV3Routes } from './routes/supplyForecastV3';
// M277-D：人力排班与调度优化 V3 GET/POST/PUT /api/v1/staff-schedule
import { staffScheduleV3Routes } from './routes/staffScheduleV3';
// M278-A：卫生健康统计与医改监测上报 V5 GET/POST /api/v1/reporting-stats
import { reportingStatsV5Routes } from './routes/reportingStatsV5';
// M278-B：医保智能监管与 DRG/DIP 上报 V5 GET/POST/PUT /api/v1/insurance-report
import { insuranceReportV5Routes } from './routes/insuranceReportV5';
// M278-C：疾控传染病与慢病直报 V5 POST/GET /api/v1/cdc-notification
import { cdcNotificationV5Routes } from './routes/cdcNotificationV5';
// M278-D：医院质量监测 HQMS V5 GET/POST /api/v1/hqms
import { hqmsV5Routes } from './routes/hqmsV5';
// M279-A：被服洗涤与织物管理 V5 GET/POST /api/v1/linen-management
import { linenManagementV5Routes } from './routes/linenManagementV5';
// M279-B：安保消防与应急指挥 V5 POST/GET /api/v1/security-emergency
import { securityEmergencyV5Routes } from './routes/securityEmergencyV5';
// M279-C：设备预测性维护 V5 GET/POST /api/v1/predictive-maintenance
import { predictiveMaintenanceV5Routes } from './routes/predictiveMaintenanceV5';
// M279-D：能源碳排放与绿色医院 V5 GET/POST /api/v1/energy-carbon
import { energyCarbonV5Routes } from './routes/energyCarbonV5';
// M280-A：多模型路由与降级 V5 GET/POST /api/v1/model-router
import { modelRouterV5Routes } from './routes/modelRouterV5';
// M280-B：Prompt 工程与模板治理 V5 GET/POST /api/v1/prompt-governance
import { promptGovernanceV5Routes } from './routes/promptGovernanceV5';
// M280-C：RAG 知识库检索优化 V5 GET/POST /api/v1/rag-tuning
import { ragTuningV5Routes } from './routes/ragTuningV5';
// M280-D：大模型微调与人在环反馈 V5 POST/GET /api/v1/finetune-loop
import { finetuneLoopV5Routes } from './routes/finetuneLoopV5';
// M281-A：FHIR 资源建模与网关 V5 GET/POST /api/v1/fhir-gateway
import { fhirGatewayV5Routes } from './routes/fhirGatewayV5';
// M281-B：HL7 / WS363 标准对接升级 V5 POST/GET /api/v1/hl7-integration
import { hl7IntegrationV5Routes } from './routes/hl7IntegrationV5';
// M281-C：院间数据共享授权 V5 POST/GET /api/v1/data-sharing
import { dataSharingV5Routes } from './routes/dataSharingV5';
// M281-D：第三方应用市场集成 V5 POST/DELETE/GET /api/v1/app-store
import { appStoreV5Routes } from './routes/appStoreV5';
// M282-A：数据分级分类与动态脱敏 V5 GET/POST /api/v1/data-classification
import { dataClassificationV5Routes } from './routes/dataClassificationV5';
// M282-B：零信任访问与权限最小化 V5 GET/POST /api/v1/zero-trust
import { zeroTrustV5Routes } from './routes/zeroTrustV5';
// M282-C：操作审计与数据防泄漏 DLP V5 GET/POST /api/v1/dlp
import { dlpV5Routes } from './routes/dlpV5';
// M282-D：隐私计算与联邦学习 V5 POST/GET /api/v1/federated-learning
import { federatedLearningV5Routes } from './routes/federatedLearningV5';
// M283-A：医生 MUSE 工作台 V5 GET/POST /api/v1/muse-doctor
import { museDoctorV5Routes } from './routes/museDoctorV5';
// M283-B：护士 MUSE 工作台 V5 GET/POST /api/v1/muse-nurse
import { museNurseV5Routes } from './routes/museNurseV5';
// M283-C：药师 MUSE 工作台 V5 GET/POST /api/v1/muse-pharmacist
import { musePharmacistV5Routes } from './routes/musePharmacistV5';
// M283-D：管理者 MUSE 工作台 V5 GET/POST /api/v1/muse-manager
import { museManagerV5Routes } from './routes/museManagerV5';
// M284-A：患者 MUSE 助手 V5 GET/POST /api/v1/muse-patient
import { musePatientV5Routes } from './routes/musePatientV5';
// M284-B：MUSE 跨角色任务流转 V5 POST/GET /api/v1/muse-handoff
import { museHandoffV5Routes } from './routes/museHandoffV5';
// M284-C：MUSE 主动提醒引擎 V5 POST/GET /api/v1/muse-reminder
import { museReminderV5Routes } from './routes/museReminderV5';
// M284-D：MUSE 能力市场与可插拔技能 V5 POST/GET /api/v1/muse-skills
import { museSkillsV5Routes } from './routes/museSkillsV5';
// M285-A：MUSE 采纳率与使用度量 V5 GET /api/v1/muse-value
import { museValueV5Routes } from './routes/museValueV5';
// M285-B：MUSE 错误拦截与风险避免 V5 GET /api/v1/muse-interception
import { museInterceptionV5Routes } from './routes/museInterceptionV5';
// M285-C：MUSE A/B 测试与效果评估 V5 POST/GET /api/v1/muse-ab
import { museAbV5Routes } from './routes/museAbV5';
// M285-D：MUSE 成本与 ROI 分析 V5 GET /api/v1/muse-roi
import { museRoiV5Routes } from './routes/museRoiV5';
// M286-A：全链路监控与告警 V5 GET/POST /api/v1/ops-monitoring
import { opsMonitoringV5Routes } from './routes/opsMonitoringV5';
// M286-B：灰度发布与回滚 V5 POST/GET /api/v1/ops-release
import { opsReleaseV5Routes } from './routes/opsReleaseV5';
// M286-C：性能与容量压测 V5 POST/GET /api/v1/ops-perf
import { opsPerfV5Routes } from './routes/opsPerfV5';
// M286-D：灾备与高可用 V5 GET/POST /api/v1/ops-dr
import { opsDrV5Routes } from './routes/opsDrV5';
// M287-A：院长驾驶舱 V5 GET/POST /api/v1/exec-dashboard
import { execDashboardV5Routes } from './routes/execDashboardV5';
// M287-B：科室运营画像 V5 GET/POST /api/v1/dept-profile
import { deptProfileV5Routes } from './routes/deptProfileV5';
// M287-C：病种/DRG 经营分析 V5 GET/POST /api/v1/drg-analysis
import { drgAnalysisV5Routes } from './routes/drgAnalysisV5';
// M287-D：趋势预测与经营预警 V5 GET/POST /api/v1/trend-forecast
import { trendForecastV5Routes } from './routes/trendForecastV5';
// M288-A：智能审批与工作流引擎 V6 GET/POST /api/v1/workflow
import { workflowV6Routes } from './routes/workflowV6';
// M288-B：通用表单引擎 V6 GET/POST /api/v1/form
import { formEngineV6Routes } from './routes/formEngineV6';
// M288-C：工作流节点流转与会签 V6 POST/GET /api/v1/workflow
import { workflowSignoffV6Routes } from './routes/workflowSignoffV6';
// M288-D：流程监控与效率分析 V6 GET/POST /api/v1/workflow/monitor
import { workflowMonitorV6Routes } from './routes/workflowMonitorV6';
// M289-A：处方前置审核规则引擎 V7 POST/GET /api/v1/cds
import { cdsRuleEngineV7Routes } from './routes/cdsRuleEngineV7';
// M289-B：处方点评与药师反馈 V7 GET/POST /api/v1/review
import { prescriptionReviewV7Routes } from './routes/prescriptionReviewV7';
// M289-C：用药知识沉淀与反馈学习 V7 GET/POST /api/v1/cds
import { cdsLearningV7Routes } from './routes/cdsLearningV7';
// M289-D：患者用药教育与依从性随访 V7 GET/POST /api/v1/med-adherence
import { medAdherenceV7Routes } from './routes/medAdherenceV7';
// M290-A：医生 Personal Agent 工作台 V8 GET/POST /api/v1/agent/doctor
import { agentDoctorV8Routes } from './routes/agentDoctorV8';
// M290-B：护士 Personal Agent（Nurse MUSE）工作台 V8 GET/POST /api/v1/agent/nurse
import { agentNurseV8Routes } from './routes/agentNurseV8';
// M290-C：药师 Personal Agent（Pharma MUSE）工作台 V8 GET/POST /api/v1/agent/pharma
import { agentPharmaV8Routes } from './routes/agentPharmaV8';
// M290-D：管理者 Personal Agent（Manager MUSE）工作台 V8 GET/POST /api/v1/agent/manager
import { agentManagerV8Routes } from './routes/agentManagerV8';
// M291-A：Agent 反馈与经验沉淀 V8 POST/GET /api/v1/agent
import { agentLearningV8Routes } from './routes/agentLearningV8';
// M291-B：从反馈沉淀个性化推荐规则 V9 GET/POST /api/v1/agent/rules
import { agentRuleV9Routes } from './routes/agentRuleV9';
// M291-C：Doctor MUSE 个人经验沉淀闭环 V9 POST/GET /api/v1/agent/case-lesson
import { caseLessonV9Routes } from './routes/caseLessonV9';
// M291-D：跨角色经验复用与学习飞轮 V9 POST/GET /api/v1/agent
import { learningFlywheelV9Routes } from './routes/learningFlywheelV9';
// M292-A：失败案例根因复盘与防再发机制 V10 POST/GET /api/v1/failure/postmortem
import { failurePostmortemV10Routes } from './routes/failurePostmortemV10';
// M292-B：成功案例蒸馏与最佳实践库 V10 GET/POST /api/v1/best-practice
import { bestPracticeV10Routes } from './routes/bestPracticeV10';
// M292-C：个人知识图谱与继任者交接 V10 GET/POST /api/v1/knowledge
import { knowledgeHandoverV10Routes } from './routes/knowledgeHandoverV10';
// M292-D：医院级 AI 知识资产大盘 V10 GET /api/v1/knowledge
import { knowledgeAssetV10Routes } from './routes/knowledgeAssetV10';
// M293-A：DOCTOR_MUSE 主动式晨间简报 V11 GET /api/v1/morning-brief
import { morningBriefV11Routes } from './routes/morningBriefV11';
// M293-B：NURSE_MUSE 主动式交接班简报 V11 GET /api/v1/shift-brief
import { shiftBriefV11Routes } from './routes/shiftBriefV11';
// M293-C：PHARMA_MUSE 主动式晨会简报 V11 GET /api/v1/pharma-brief
import { pharmaBriefV11Routes } from './routes/pharmaBriefV11';
// M293-D：MANAGER_MUSE 主动式周会简报 V11 GET /api/v1/manager-brief
import { managerBriefV11Routes } from './routes/managerBriefV11';
// M294-A：智能体采纳率反馈看板 V12 GET /api/v1/agent-adoption-board
import { adoptionBoardV12Routes } from './routes/adoptionBoardV12';
// M294-B：低采纳率规则自动复训提示 V12 GET /api/v1/retrain-tasks
import { retrainTaskV12Routes } from './routes/retrainTaskV12';
// M294-C：智能体健康度评分 V12 GET /api/v1/agent-health
import { agentHealthV12Routes } from './routes/agentHealthV12';
// M294-D：反馈闭环总览 V12 GET /api/v1/feedback-loop-dashboard
import { feedbackLoopDashboardV12Routes } from './routes/feedbackLoopDashboardV12';
// M295-A：跨角色经验安全复用 V13 GET /api/v1/cross-role-experience
import { crossRoleExperienceV13Routes } from './routes/crossRoleExperienceV13';
// M295-B：经验推送频控与免打扰 V13 GET /api/v1/experience-push
import { experiencePushV13Routes } from './routes/experiencePushV13';
// M295-C：患者侧经验转健康提示 V13 GET /api/v1/patient-tips
import { patientTipV13Routes } from './routes/patientTipV13';
// M295-D：经验复用效果度量 V13 GET /api/v1/reuse-roi
import { reuseRoiV13Routes } from './routes/reuseRoiV13';
// M296-A：经验时间衰减与新鲜度 V13 GET /api/v1/experience-freshness
import { experienceFreshnessV13Routes } from './routes/experienceFreshnessV13';
// M296-B：过期经验复核工作流 V13 GET /api/v1/experience-review
import { experienceReviewV13Routes } from './routes/experienceReviewV13';
// M296-C：经验更新与版本迭代 V13 POST /api/v1/experience/:id/new-version
import { experienceVersionV13Routes } from './routes/experienceVersionV13';
// M296-D：知识资产生命周期总览 V13 GET /api/v1/knowledge-lifecycle
import { knowledgeLifecycleV13Routes } from './routes/knowledgeLifecycleV13';
// M297-A：继任者经验传承交接 V13 GET /api/v1/handover
import { handoverV13Routes } from './routes/handoverV13';
// M297-B：交接后继任者学习计划 V13 GET /api/v1/learning-plan
import { learningPlanV13Routes } from './routes/learningPlanV13';
// M297-C：离任医生知识资产保留 V13 GET /api/v1/public-knowledge
import { publicKnowledgeV13Routes } from './routes/publicKnowledgeV13';
// M297-D：传承效果度量与院长报告 V13 GET /api/v1/succession-report
import { successionReportV13Routes } from './routes/successionReportV13';
// M298-A：专家经验贡献激励 V13 GET /api/v1/contribution-leaderboard
import { contributionLeaderboardV13Routes } from './routes/contributionLeaderboardV13';
// M298-B：贡献荣誉墙与月度之星 V13 GET /api/v1/honor-wall
import { honorWallV13Routes } from './routes/honorWallV13';
// M298-C：新手医生孵化与导师匹配 V13 GET /api/v1/mentor-match
import { mentorMatchV13Routes } from './routes/mentorMatchV13';
// M298-D：知识贡献生态总览 V13 GET /api/v1/ecosystem-dashboard
import { ecosystemDashboardV13Routes } from './routes/ecosystemDashboardV13';
// M299-A：经验质量同行评审 V13 GET /api/v1/review-queue
import { reviewQueueV13Routes } from './routes/reviewQueueV13';
// M299-B：错误经验拦截与回滚 V13 POST /api/v1/experience/:id/rollback
import { rollbackV13Routes } from './routes/rollbackV13';
// M299-C：评审专家资质与激励 V13 GET /api/v1/reviewer-roster
import { reviewerRosterV13Routes } from './routes/reviewerRosterV13';
// M299-D：质量门禁总览 V13 GET /api/v1/quality-gate
import { qualityGateV13Routes } from './routes/qualityGateV13';
// M300-A：经验与临床结局关联 V13 GET /api/v1/experience-outcome
import { experienceOutcomeV13Routes } from './routes/experienceOutcomeV13';
// M300-B：疗效证据反哺规则权重 V13 GET /api/v1/evidence-rules
import { evidenceRulesV13Routes } from './routes/evidenceRulesV13';
// M300-C：反向证据熔断 V13 GET /api/v1/circuit-breaker
import { circuitBreakerV13Routes } from './routes/circuitBreakerV13';
// M300-D：疗效证据总览 V13 GET /api/v1/evidence-overview
import { evidenceOverviewV13Routes } from './routes/evidenceOverviewV13';
// M301-A：医生显式反馈闭环 V13 POST /api/v1/feedback
import { doctorFeedbackV13Routes } from './routes/doctorFeedbackV13';
// M301-B：修改点归因与经验补丁 V13 GET /api/v1/experience-patches
import { experiencePatchesV13Routes } from './routes/experiencePatchesV13';
// M301-C：反馈信号看板与趋势 V13 GET /api/v1/feedback-trend
import { feedbackTrendV13Routes } from './routes/feedbackTrendV13';
// M301-D：反馈闭环总览 V13 GET /api/v1/feedback-loop-overview
import { feedbackLoopOverviewV13Routes } from './routes/feedbackLoopOverviewV13';
// M302-A：经验精准主动推送 V13 GET /api/v1/contextual-push
import { contextualPushV13Routes } from './routes/contextualPushV13';
// M302-B：推送时机与场景触发 V13 GET /api/v1/push-scene
import { pushSceneV13Routes } from './routes/pushSceneV13';
// M302-C：推送频控与免打扰 V13 GET /api/v1/push-quota
import { pushQuotaV13Routes } from './routes/pushQuotaV13';
// M302-D：推送效果与闭环总览 V13 GET /api/v1/push-effect-overview
import { pushEffectOverviewV13Routes } from './routes/pushEffectOverviewV13';
// M303-A：推送个人化学习 V13 GET /api/v1/doctor-preference
import { doctorPreferenceV13Routes } from './routes/doctorPreferenceV13';
// M303-B：相似医生协同推荐 V13 GET /api/v1/look-alike
import { lookAlikeV13Routes } from './routes/lookAlikeV13';
// M303-C：个人学习曲线 V13 GET /api/v1/learning-curve
import { learningCurveV13Routes } from './routes/learningCurveV13';
// M303-D：个人化学习效果总览 V13 GET /api/v1/personalized-learning-overview
import { personalizedLearningOverviewV13Routes } from './routes/personalizedLearningOverviewV13';
// M304-A：跨科室经验扩散 V13 GET /api/v1/cross-dept-broadcast
import { crossDeptBroadcastV13Routes } from './routes/crossDeptBroadcastV13';
// M304-B：跨科室采纳反馈 V13 GET /api/v1/diffusion-adoption
import { diffusionAdoptionV13Routes } from './routes/diffusionAdoptionV13';
// M304-C：扩散网络图谱 V13 GET /api/v1/diffusion-graph
import { diffusionGraphV13Routes } from './routes/diffusionGraphV13';
// M304-D：跨科室扩散总览 V13 GET /api/v1/diffusion-overview
import { diffusionOverviewV13Routes } from './routes/diffusionOverviewV13';
// M305-A：经验资产运营与退役 V13 GET /api/v1/experience-asset
import { experienceAssetV13Routes } from './routes/experienceAssetV13';
// M305-B：资产盘点周期 V13 GET /api/v1/asset-audit
import { assetAuditV13Routes } from './routes/assetAuditV13';
// M305-C：退役经验存档与复用 V13 GET /api/v1/archived-experience
import { archivedExperienceV13Routes } from './routes/archivedExperienceV13';
// M305-D：经验资产生命周期总览 V13 GET /api/v1/asset-lifecycle-overview
import { assetLifecycleOverviewV13Routes } from './routes/assetLifecycleOverviewV13';
// M306-A：医院 AI 学习飞轮成熟度 V13 GET /api/v1/flywheel-score
import { flywheelScoreV13Routes } from './routes/flywheelScoreV13';
// M306-B：六维指标明细下钻 V13 GET /api/v1/flywheel-drilldown
import { flywheelDrilldownV13Routes } from './routes/flywheelDrilldownV13';
// M306-C：飞轮改进建议 V13 GET /api/v1/flywheel-recommendation
import { flywheelRecommendationV13Routes } from './routes/flywheelRecommendationV13';
// M306-D：飞轮季度演进趋势 V13 GET /api/v1/flywheel-trend
import { flywheelTrendV13Routes } from './routes/flywheelTrendV13';
// M307-A：飞轮改进任务闭环 V13 GET/POST /api/v1/flywheel-tasks
import { flywheelTaskV13Routes } from './routes/flywheelTaskV13';
// M307-B：任务进度追踪与升级 V13 GET /api/v1/task-funnel
import { taskFunnelV13Routes } from './routes/taskFunnelV13';
// M307-C：任务验收与效果验证 V13 GET /api/v1/task-verification
import { taskVerificationV13Routes } from './routes/taskVerificationV13';
// M307-D：闭环回灌飞轮 V13 GET /api/v1/closed-loop-overview
import { closedLoopV13Routes } from './routes/closedLoopV13';
// M308-A：科室任务看板 V13 GET /api/v1/dept-task-board
import { deptTaskBoardV13Routes } from './routes/deptTaskBoardV13';
// M308-B：科室任务详情与督办 V13 GET /api/v1/dept-task-detail/:id
import { deptTaskDetailV13Routes } from './routes/deptTaskDetailV13';
// M308-C：科室经验 SOP 沉淀 V13 GET /api/v1/dept-sop
import { deptSopV13Routes } from './routes/deptSopV13';
// M308-D：科际协作与经验共享总览 V13 GET /api/v1/dept-collab-overview
import { deptCollabOverviewV13Routes } from './routes/deptCollabOverviewV13';
// M308-D（新规格）：科室间任务协作总览 V13 GET /api/v1/dept-task-collab
import { deptTaskCollabV13Routes } from './routes/deptTaskCollabV13';
// M309-A：改进建议采纳率追踪 V13 GET /api/v1/suggestion-adoption
import { suggestionAdoptionV13Routes } from './routes/suggestionAdoptionV13';
// M309-B：SOP 引用次数回灌飞轮分 V13 GET /api/v1/sop-usage
import { sopUsageV13Routes } from './routes/sopUsageV13';
// M309-C：跨科协作任务经验双沉淀 V13 GET /api/v1/cross-dept-learning
import { crossDeptLearningV13Routes } from './routes/crossDeptLearningV13';
// M309-D：个人学习曲线里程碑 V13 GET /api/v1/learning-milestone
import { learningMilestoneV13Routes } from './routes/learningMilestoneV13';
// M310-A：综合学习飞轮健康度仪表盘 V13 GET /api/v1/flywheel-health
import { flywheelHealthV13Routes } from './routes/flywheelHealthV13';
// M310-B：多科室横向对标 V13 GET /api/v1/dept-benchmark
import { deptBenchmarkV13Routes } from './routes/deptBenchmarkV13';
// M310-C：医生个人月度成长报告 V13 GET /api/v1/doctor-growth-report
import { doctorGrowthReportV13Routes } from './routes/doctorGrowthReportV13';
// M310-D：院长季度复盘报告 V13 GET /api/v1/quarterly-review
import { quarterlyReviewV13Routes } from './routes/quarterlyReviewV13';
// M311-A：患者满意度闭环 V13 GET /api/v1/patient-satisfaction
import { patientSatisfactionLoopV13Routes } from './routes/patientSatisfactionLoopV13';
// M311-B：医护工作量与疲劳度监测 V13 GET /api/v1/staff-workload
import { staffWorkloadV13Routes } from './routes/staffWorkloadV13';
// M311-C：不良事件根因分析 RCA 辅助 V13 GET /api/v1/quality-event-rca
import { qualityEventRcaV13Routes } from './routes/qualityEventRcaV13';
// M311-D：院长指挥中心一屏总览 V13 GET /api/v1/dean-command-center
import { deanCommandCenterV13Routes } from './routes/deanCommandCenterV13';
// M312-A：床位占用预测 V13 GET /api/v1/bed-occupancy-forecast
import { bedOccupancyForecastV13Routes } from './routes/bedOccupancyForecastV13';
// M312-B：药房库存预警 V13 GET /api/v1/pharmacy-inventory-alert
import { pharmacyInventoryAlertV13Routes } from './routes/pharmacyInventoryAlertV13';
// M312-C：手术排程冲突检测 V13 GET /api/v1/ot-scheduling-conflict
import { otSchedulingConflictV13Routes } from './routes/otSchedulingConflictV13';
// M312-D：急诊容量预警 V13 GET /api/v1/emergency-capacity
import { emergencyCapacityV13Routes } from './routes/emergencyCapacityV13';
// M313-A：DRG 费用超支预警 V13 GET /api/v1/drg-cost-overrun
import { drgCostOverrunV13Routes } from './routes/drgCostOverrunV13';
// M313-B：门诊流量预测与分时段建议 V13 GET /api/v1/outpatient-flow-forecast
import { outpatientFlowForecastV13Routes } from './routes/outpatientFlowForecastV13';
// M313-C：医疗设备维保到期提醒 V13 GET /api/v1/equipment-maintenance
import { equipmentMaintenanceV13Routes } from './routes/equipmentMaintenanceV13';
// M313-D：院感暴发早期预警 V13 GET /api/v1/infection-outbreak
import { infectionOutbreakV13Routes } from './routes/infectionOutbreakV13';
// M314-A：门诊爽约率分析 V13 GET /api/v1/no-show-rate
import { noShowRateV13Routes } from './routes/noShowRateV13';
// M314-B：31 天再入院风险预测 V13 GET /api/v1/readmission-risk
import { readmissionRiskV13Routes } from './routes/readmissionRiskV13';
// M314-C：出院用药重整 V13 GET /api/v1/medication-reconciliation
import { medicationReconciliationV13Routes } from './routes/medicationReconciliationV13';
// M314-D：出院小结质量评分 V13 GET /api/v1/discharge-summary-quality
import { dischargeSummaryQualityV13Routes } from './routes/dischargeSummaryQualityV13';
// M315-A：ICD 编码辅助推荐 V13 GET /api/v1/icd-coding-assist
import { icdCodingAssistV13Routes } from './routes/icdCodingAssistV13';
// M315-B：医嘱套餐规范 V13 GET /api/v1/order-set-compliance
import { orderSetComplianceV13Routes } from './routes/orderSetComplianceV13';
// M315-C：转科交接单完整度评分 V13 GET /api/v1/transfer-summary-completeness
import { transferSummaryCompletenessV13Routes } from './routes/transferSummaryCompletenessV13';
// M315-D：护理交班质量 V13 GET /api/v1/nursing-handover
import { nursingHandoverV13Routes } from './routes/nursingHandoverV13';
// M316-A：出院随访依从性 V13 GET /api/v1/follow-up-adherence
import { followUpAdherenceV13Routes } from './routes/followUpAdherenceV13';
// M316-B：慢病管理达标率 V13 GET /api/v1/chronic-disease-mgmt
import { chronicDiseaseMgmtV13Routes } from './routes/chronicDiseaseMgmtV13';
// M316-C：健教材料推送统计 V13 GET /api/v1/health-education-push
import { healthEducationPushV13Routes } from './routes/healthEducationPushV13';
// M316-D：患者门户使用度 V13 GET /api/v1/patient-portal-usage
import { patientPortalUsageV13Routes } from './routes/patientPortalUsageV13';
// M317-A：门诊次均费用 V13 GET /api/v1/outpatient-avg-cost
import { outpatientAvgCostV13Routes } from './routes/outpatientAvgCostV13';
// M317-B：住院床日成本 V13 GET /api/v1/inpatient-bed-day-cost
import { inpatientBedDayCostV13Routes } from './routes/inpatientBedDayCostV13';
// M317-C：采购周期预警 V13 GET /api/v1/procurement-lead-time
import { procurementLeadTimeV13Routes } from './routes/procurementLeadTimeV13';
// M317-D：人员流失率 V13 GET /api/v1/staff-turnover
import { staffTurnoverV13Routes } from './routes/staffTurnoverV13';
// M318-A：病历书写及时性 V13 GET /api/v1/medical-record-timeliness
import { medicalRecordTimelinessV13Routes } from './routes/medicalRecordTimelinessV13';
// M318-B：处方点评合格率 V13 GET /api/v1/prescription-audit
import { prescriptionAuditV13Routes } from './routes/prescriptionAuditV13';
// M318-C：手卫生依从性 V13 GET /api/v1/hand-hygiene-compliance
import { handHygieneComplianceV13Routes } from './routes/handHygieneComplianceV13';
// M318-D：数据访问审计异常 V13 GET /api/v1/data-access-audit
import { dataAccessAuditV13Routes } from './routes/dataAccessAuditV13';
// M319-A：Doctor MUSE 使用统计 V13 GET /api/v1/doctor-muse-usage
import { doctorMuseUsageV13Routes } from './routes/doctorMuseUsageV13';
// M319-B：MUSE 建议采纳反馈 V13 GET /api/v1/muse-feedback
import { museFeedbackV13Routes } from './routes/museFeedbackV13';
// M319-C：病历知识自动关联 V13 GET /api/v1/knowledge-link
import { knowledgeLinkV13Routes } from './routes/knowledgeLinkV13';
// M319-D：个人智能体训练数据沉淀 V13 GET /api/v1/muse-training-data
import { museTrainingDataV13Routes } from './routes/museTrainingDataV13';
// M320-A：护士个人智能体使用统计 V13 GET /api/v1/nurse-muse-usage
import { nurseMuseUsageV13Routes } from './routes/nurseMuseUsageV13';
// M320-B：药师个人智能体使用统计 V13 GET /api/v1/pharmacist-muse-usage
import { pharmacistMuseUsageV13Routes } from './routes/pharmacistMuseUsageV13';
// M320-C：行政个人智能体使用统计 V13 GET /api/v1/admin-muse-usage
import { adminMuseUsageV13Routes } from './routes/adminMuseUsageV13';
// M320-D：患者个人智能体使用统计 V13 GET /api/v1/patient-muse-usage
import { patientMuseUsageV13Routes } from './routes/patientMuseUsageV13';
// M321-A：五角色 MUSE 飞轮总览 V13 GET /api/v1/muse-flywheel-overview
import { museFlywheelOverviewV13Routes } from './routes/museFlywheelOverviewV13';
// M321-B：跨角色经验互鉴 V13 GET /api/v1/muse-cross-role-learning
import { museCrossRoleLearningV13Routes } from './routes/museCrossRoleLearningV13';
// M321-C：模型版本迭代记录 V13 GET /api/v1/muse-model-version
import { museModelVersionV13Routes } from './routes/museModelVersionV13';
// M321-D：MUSE 投入产出报告 V13 GET /api/v1/muse-roi-report
import { museRoiReportV13Routes } from './routes/museRoiReportV13';
// M322-A：医疗质量总仪表盘 V13 GET /api/v1/clinical-quality-dashboard
import { clinicalQualityDashboardV13Routes } from './routes/clinicalQualityDashboardV13';
// M322-B：患者安全事件总览 V13 GET /api/v1/patient-safety-overview
import { patientSafetyV13Routes } from './routes/patientSafetyV13';
// M322-C：员工满意度 V13 GET /api/v1/staff-satisfaction
import { staffSatisfactionV13Routes } from './routes/staffSatisfactionV13';
// M322-D：医院运营效率 V13 GET /api/v1/hospital-efficiency
import { hospitalEfficiencyV13Routes } from './routes/hospitalEfficiencyV13';
// M323-A：电子病历五级评级自评 V13 GET /api/v1/emr5-level
import { emr5LevelV13Routes } from './routes/emr5LevelV13';
// M323-B：互联互通四甲自评 V13 GET /api/v1/intercon4-level
import { intercon4LevelV13Routes } from './routes/intercon4LevelV13';
// M323-C：智慧医院评级自评 V13 GET /api/v1/smart-hospital-rating
import { smartHospitalRatingV13Routes } from './routes/smartHospitalRatingV13';
// M323-D：数据治理成熟度 V13 GET /api/v1/data-governance-maturity
import { dataGovernanceV13Routes } from './routes/dataGovernanceV13';
// M324-A：区域健康数据汇总 V13 GET /api/v1/regional-health-data
import { regionalHealthDataV13Routes } from './routes/regionalHealthDataV13';
// M324-B：基层医疗协同 V13 GET /api/v1/grassroots-medical
import { grassrootsMedicalV13Routes } from './routes/grassrootsMedicalV13';
// M324-C：远程会诊量 V13 GET /api/v1/telemedicine-overview
import { telemedicineV13Routes } from './routes/telemedicineV13';
// M324-D：公共卫生应急 V13 GET /api/v1/public-health-emergency
import { publicHealthEmergencyV13Routes } from './routes/publicHealthEmergencyV13';
// M325-A：影像 AI 使用统计 V13 GET /api/v1/imaging-ai-usage
import { imagingAiUsageV13Routes } from './routes/imagingAiUsageV13';
// M325-B：检验 AI 使用统计 V13 GET /api/v1/lab-ai-usage
import { labAiUsageV13Routes } from './routes/labAiUsageV13';
// M325-C：AI 模型漂移监控 V13 GET /api/v1/ai-model-drift
import { aiModelDriftV13Routes } from './routes/aiModelDriftV13';
// M325-D：AI 治理台账 V13 GET /api/v1/ai-governance
import { aiGovernanceV13Routes } from './routes/aiGovernanceV13';
// M326-A：患者等候时长 V13 GET /api/v1/patient-wait-time
import { patientWaitTimeV13Routes } from './routes/patientWaitTimeV13';
// M326-B：患者投诉处理 V13 GET /api/v1/patient-complaint
import { patientComplaintV13Routes } from './routes/patientComplaintV13';
// M326-C：随访完成率 V13 GET /api/v1/patient-follow-up
import { patientFollowUpV13Routes } from './routes/patientFollowUpV13';
// M326-D：健教材料推送 V13 GET /api/v1/patient-education-stats
import { patientEducationV13Routes } from './routes/patientEducationV13';
// M327-A：临床研究项目 V13 GET /api/v1/clinical-research-overview
import { clinicalResearchV13Routes } from './routes/clinicalResearchV13';
// M327-B：教学医院指标 V13 GET /api/v1/teaching-hospital
import { teachingHospitalV13Routes } from './routes/teachingHospitalV13';
// M327-C：继续教育学分 V13 GET /api/v1/continuing-education
import { continuingEducationV13Routes } from './routes/continuingEducationV13';
// M327-D：医学文献检索 V13 GET /api/v1/medical-literature
import { medicalLiteratureV13Routes } from './routes/medicalLiteratureV13';
// M328-A：设备运维 V13 GET /api/v1/equipment-ops-overview
import { equipmentOpsV13Routes } from './routes/equipmentOpsV13';
// M328-B：耗材库存 V13 GET /api/v1/consumable-inventory
import { consumableInventoryV13Routes } from './routes/consumableInventoryV13';
// M328-C：药品库存 V13 GET /api/v1/pharmacy-inventory
import { pharmacyInventoryV13Routes } from './routes/pharmacyInventoryV13';
// M328-D：血库库存 V13 GET /api/v1/blood-inventory
import { bloodInventoryV13Routes } from './routes/bloodInventoryV13';
// M329-A：医保对账 V13 GET /api/v1/billing-reconciliation
import { billingReconciliationV13Routes } from './routes/billingReconciliationV13';
// M329-B：单病种成本 V13 GET /api/v1/cost-per-patient
import { costPerPatientV13Routes } from './routes/costPerPatientV13';
// M329-C：收入结构 V13 GET /api/v1/revenue-structure
import { revenueStructureV13Routes } from './routes/revenueStructureV13';
// M329-D：医保结算 V13 GET /api/v1/insurance-settlement
import { insuranceSettlementV13Routes } from './routes/insuranceSettlementV13';
// M330-A：医生工作量 V13 GET /api/v1/doctor-workload
import { doctorWorkloadV13Routes } from './routes/doctorWorkloadV13';
// M330-B：护士工作量 V13 GET /api/v1/nurse-workload
import { nurseWorkloadV13Routes } from './routes/nurseWorkloadV13';
// M330-C：员工净流失率 V13 GET /api/v1/staff-turnover-net
import { staffTurnoverNetV13Routes } from './routes/staffTurnoverNetV13';
// M330-D：培训时长 V13 GET /api/v1/training-hours
import { trainingHoursV13Routes } from './routes/trainingHoursV13';
// M331-A：病房床位使用率 V13 GET /api/v1/ward-occupancy
import { wardOccupancyV13Routes } from './routes/wardOccupancyV13';
// M331-B：手术室利用率 V13 GET /api/v1/operating-room
import { operatingRoomV13Routes } from './routes/operatingRoomV13';
// M331-C：电梯等候时间 V13 GET /api/v1/elevator-wait-time
import { elevatorWaitTimeV13Routes } from './routes/elevatorWaitTimeV13';
// M331-D：停车场使用率 V13 GET /api/v1/parking
import { parkingV13Routes } from './routes/parkingV13';
// M332-A：患者满意度调研 V13 GET /api/v1/patient-satisfaction-survey
import { patientSatisfactionV13Routes } from './routes/patientSatisfactionV13';
// M332-B：医生满意度调研 V13 GET /api/v1/doctor-satisfaction
import { doctorSatisfactionV13Routes } from './routes/doctorSatisfactionV13';
// M332-C：护士满意度调研 V13 GET /api/v1/nurse-satisfaction
import { nurseSatisfactionV13Routes } from './routes/nurseSatisfactionV13';
// M332-D：员工满意度总览 V13 GET /api/v1/staff-satisfaction-overview
import { staffSatisfactionOverviewV13Routes } from './routes/staffSatisfactionOverviewV13';
// M333-A：临床路径执行率 V13 GET /api/v1/clinical-pathway-overview
import { clinicalPathwayV13Routes } from './routes/clinicalPathwayV13';
// M333-B：指南依从性 V13 GET /api/v1/guideline-compliance
import { guidelineComplianceV13Routes } from './routes/guidelineComplianceV13';
// M333-C：抗菌药物使用强度 V13 GET /api/v1/antibiotic-use
import { antibioticUseV13Routes } from './routes/antibioticUseV13';
// M333-D：用血合理率 V13 GET /api/v1/blood-use
import { bloodUseV13Routes } from './routes/bloodUseV13';
// M334-A：病案质量 V13 GET /api/v1/mrq-quality
import { mrqQualityV13Routes } from './routes/mrqQualityV13';
// M334-B：ICD 编码准确率 V13 GET /api/v1/icd-coding-accuracy
import { icdCodingV13Routes } from './routes/icdCodingV13';
// M334-C：DRG 分组 V13 GET /api/v1/drg-grouping
import { drgGroupingV13Routes } from './routes/drgGroupingV13';
// M334-D：平均住院日 V13 GET /api/v1/average-length-of-stay
import { averageLengthOfStayV13Routes } from './routes/averageLengthOfStayV13';
// M335-A：急诊分诊 V13 GET /api/v1/emergency-triage-stats
import { emergencyTriageV13Routes } from './routes/emergencyTriageV13';
// M335-B：ICU 床位 V13 GET /api/v1/icu-occupancy
import { icuOccupancyV13Routes } from './routes/icuOccupancyV13';
// M335-C：危急值 V13 GET /api/v1/critical-value-stats
import { criticalValueV13Routes } from './routes/criticalValueV13';
// M335-D：31 天再入院率 V13 GET /api/v1/readmission-stats
import { readmissionV13Routes } from './routes/readmissionV13';
// M336-A：药品短缺 V13 GET /api/v1/drug-shortage
import { drugShortageV13Routes } from './routes/drugShortageV13';
// M336-B：药品不良反应 V13 GET /api/v1/adverse-drug-event
import { adverseDrugEventV13Routes } from './routes/adverseDrugEventV13';
// M336-C：抗菌药物处方率 V13 GET /api/v1/antibiotic-rx
import { antibioticRxV13Routes } from './routes/antibioticRxV13';
// M336-D：静脉输液率 V13 GET /api/v1/iv-fluid
import { ivFluidV13Routes } from './routes/ivFluidV13';
// M337-A：门诊等候时长 V13 GET /api/v1/outpatient-wait
import { outpatientWaitV13Routes } from './routes/outpatientWaitV13';
// M337-B：预约诊疗 V13 GET /api/v1/appointment
import { appointmentV13Routes } from './routes/appointmentV13';
// M337-C：双向转诊 V13 GET /api/v1/referral-stats
import { referralV13Routes } from './routes/referralV13';
// M337-D：慢病管理 V13 GET /api/v1/chronic-disease-stats
import { chronicDiseaseV13Routes } from './routes/chronicDiseaseV13';
// M338-A：检验报告周转时间 V13 GET /api/v1/lab-turnaround
import { labTurnaroundV13Routes } from './routes/labTurnaroundV13';
// M338-B：影像报告周转时间 V13 GET /api/v1/imaging-turnaround
import { imagingTurnaroundV13Routes } from './routes/imagingTurnaroundV13';
// M338-C：检验差错率 V13 GET /api/v1/lab-error
import { labErrorV13Routes } from './routes/labErrorV13';
// M338-D：标本不合格率 V13 GET /api/v1/specimen-reject
import { specimenRejectV13Routes } from './routes/specimenRejectV13';
// M339-A：手术量分级 V13 GET /api/v1/surgery-volume
import { surgeryVolumeV13Routes } from './routes/surgeryVolumeV13';
// M339-B：麻醉相关并发症 V13 GET /api/v1/anesthesia-complication
import { anesthesiaComplicationV13Routes } from './routes/anesthesiaComplicationV13';
// M339-C：手术部位感染率 V13 GET /api/v1/ssi-rate
import { ssiRateV13Routes } from './routes/ssiRateV13';
// M339-D：术中冰冻病理与术后石蜡符合率 V13 GET /api/v1/intraop-frozen-section
import { intraOpFrozenSectionV13Routes } from './routes/intraOpFrozenSectionV13';
// M340-A：投诉处理 V13 GET /api/v1/complaint-handling
import { complaintHandlingV13Routes } from './routes/complaintHandlingV13';
// M340-B：医德医风考评 V13 GET /api/v1/medical-ethics
import { medicalEthicsV13Routes } from './routes/medicalEthicsV13';
// M340-C：知情同意书签署率 V13 GET /api/v1/informed-consent
import { informedConsentV13Routes } from './routes/informedConsentV13';
// M340-D：门诊病历书写合格率 V13 GET /api/v1/outpatient-record
import { outpatientRecordV13Routes } from './routes/outpatientRecordV13';
// M341-A：手卫生依从率 V13 GET /api/v1/hand-hygiene
import { handHygieneV13Routes } from './routes/handHygieneV13';
// M341-B：院感发生率 V13 GET /api/v1/nosocomial-infection
import { nosocomialInfectionV13Routes } from './routes/nosocomialInfectionV13';
// M341-C：隔离医嘱执行率 V13 GET /api/v1/isolation-order
import { isolationOrderV13Routes } from './routes/isolationOrderV13';
// M341-D：环境消毒合格率 V13 GET /api/v1/env-disinfection
import { envDisinfectionV13Routes } from './routes/envDisinfectionV13';
// M342-A：输血率 V13 GET /api/v1/blood-transfusion
import { bloodTransfusionV13Routes } from './routes/bloodTransfusionV13';
// M342-B：病理报告 TAT V13 GET /api/v1/pathology-turnaround
import { pathologyTurnaroundV13Routes } from './routes/pathologyTurnaroundV13';
// M342-C：内镜检查量 V13 GET /api/v1/endoscopy-volume
import { endoscopyVolumeV13Routes } from './routes/endoscopyVolumeV13';
// M342-D：超声检查量 V13 GET /api/v1/ultrasound-volume
import { ultrasoundVolumeV13Routes } from './routes/ultrasoundVolumeV13';
// M343-A：住院医师规范化培训 V13 GET /api/v1/resident-training
import { residentTrainingV13Routes } from './routes/residentTrainingV13';
// M343-B：继续医学教育 V13 GET /api/v1/continuing-edu
import { continuingEduV13Routes } from './routes/continuingEduV13';
// M343-C：科研项目 V13 GET /api/v1/research-project
import { researchProjectV13Routes } from './routes/researchProjectV13';
// M343-D：专利授权 V13 GET /api/v1/patent
import { patentV13Routes } from './routes/patentV13';
// M344-A：核心系统可用率 V13 GET /api/v1/system-availability
import { systemAvailabilityV13Routes } from './routes/systemAvailabilityV13';
// M344-B：信息安全事件 V13 GET /api/v1/security-incident
import { securityIncidentV13Routes } from './routes/securityIncidentV13';
// M344-C：数据质量 V13 GET /api/v1/data-quality
import { dataQualityV13Routes } from './routes/dataQualityV13';
// M344-D：API 调用量 V13 GET /api/v1/api-call
import { apiCallV13Routes } from './routes/apiCallV13';
// M345-A：医保结算 V13 GET /api/v1/insurance-settlement-stats（stats 避让 M329-D）
import { insuranceSettlementStatsV13Routes } from './routes/insuranceSettlementStatsV13';
// M345-B：业务收入结构 V13 GET /api/v1/revenue-structure-stats（stats 避让已有 revenueStructureV13）
import { revenueStructureStatsV13Routes } from './routes/revenueStructureStatsV13';
// M345-C：成本控制 V13 GET /api/v1/cost-control
import { costControlV13Routes } from './routes/costControlV13';
// M345-D：床位使用 V13 GET /api/v1/bed-occupancy
import { bedOccupancyV13Routes } from './routes/bedOccupancyV13';
// M346-A：员工流失率 V13 GET /api/v1/staff-turnover-stats（stats 避让已有 staffTurnoverV13）
import { staffTurnoverStatsV13Routes } from './routes/staffTurnoverStatsV13';
// M346-B：医师职称结构 V13 GET /api/v1/doctor-title-structure
import { doctorTitleStructureV13Routes } from './routes/doctorTitleStructureV13';
// M346-C：护患比 V13 GET /api/v1/nurse-patient-ratio
import { nursePatientRatioV13Routes } from './routes/nursePatientRatioV13';
// M346-D：员工培训学时 V13 GET /api/v1/staff-training-hours
import { staffTrainingHoursV13Routes } from './routes/staffTrainingHoursV13';
// M347-A：患者满意度 V13 GET /api/v1/patient-satisfaction-stats（stats 避让已有 patientSatisfactionV13）
import { patientSatisfactionStatsV13Routes } from './routes/patientSatisfactionStatsV13';
// M347-B：投诉率 V13 GET /api/v1/complaint-rate
import { complaintRateV13Routes } from './routes/complaintRateV13';
// M347-C：出院随访率 V13 GET /api/v1/follow-up-completion
import { followUpCompletionV13Routes } from './routes/followUpCompletionV13';
// M347-D：病历完整性 V13 GET /api/v1/medical-record-integrity
import { medicalRecordIntegrityV13Routes } from './routes/medicalRecordIntegrityV13';
// M348-A：急诊绿色通道 V13 GET /api/v1/emergency-greenway
import { emergencyGreenwayV13Routes } from './routes/emergencyGreenwayV13';
// M348-B：院前急救 V13 GET /api/v1/pre-hospital-care
import { preHospitalCareV13Routes } from './routes/preHospitalCareV13';
// M348-C：胸痛中心 V13 GET /api/v1/chest-pain-center
import { chestPainCenterV13Routes } from './routes/chestPainCenterV13';
// M348-D：卒中中心 V13 GET /api/v1/stroke-center
import { strokeCenterV13Routes } from './routes/strokeCenterV13';
// M349-A：产科质量 V13 GET /api/v1/maternity-quality
import { maternityQualityV13Routes } from './routes/maternityQualityV13';
// M349-B：新生儿 V13 GET /api/v1/newborn-care
import { newbornCareV13Routes } from './routes/newbornCareV13';
// M349-C：儿科诊疗 V13 GET /api/v1/pediatric-care
import { pediatricCareV13Routes } from './routes/pediatricCareV13';
// M349-D：预防接种 V13 GET /api/v1/immunization
import { immunizationV13Routes } from './routes/immunizationV13';
// M350-A：中医服务 V13 GET /api/v1/tcm-service
import { tcmServiceV13Routes } from './routes/tcmServiceV13';
// M350-B：康复医学 V13 GET /api/v1/rehabilitation-stats（stats 避让已有 rehabilitationV5/report-v2）
import { rehabilitationStatsV13Routes } from './routes/rehabilitationStatsV13';
// M350-C：老年综合评估 V13 GET /api/v1/geriatric-comprehensive
import { geriatricComprehensiveV13Routes } from './routes/geriatricComprehensiveV13';
// M350-D：安宁疗护 V13 GET /api/v1/palliative-care（M350 收官）
import { palliativeCareV13Routes } from './routes/palliativeCareV13';
// M351-A：消毒供应 V13 GET /api/v1/cssd
import { cssdV13Routes } from './routes/cssdV13';
// M351-B：大型设备开机率 V13 GET /api/v1/equipment-utilization
import { equipmentUtilizationV13Routes } from './routes/equipmentUtilizationV13';
// M351-C：氧气供应 V13 GET /api/v1/oxygen-supply
import { oxygenSupplyV13Routes } from './routes/oxygenSupplyV13';
// M351-D：医疗废物 V13 GET /api/v1/medical-waste（M351 收官）
import { medicalWasteV13Routes } from './routes/medicalWasteV13';
// M352-A：消防安全 V13 GET /api/v1/fire-safety
import { fireSafetyV13Routes } from './routes/fireSafetyV13';
// M352-B：能耗管理 V13 GET /api/v1/energy-consumption
import { energyConsumptionV13Routes } from './routes/energyConsumptionV13';
// M352-C：营养食堂 V13 GET /api/v1/nutrition-kitchen
import { nutritionKitchenV13Routes } from './routes/nutritionKitchenV13';
// M352-D：车辆管理 V13 GET /api/v1/parking-mgmt（M352 收官）
import { parkingMgmtV13Routes } from './routes/parkingMgmtV13';
// M353-A：信息安全 V13 GET /api/v1/info-security
import { infoSecurityV13Routes } from './routes/infoSecurityV13';
// M353-B：数据质量 V13 GET /api/v1/data-quality-stats（stats 避让已有 dataQualityV13）
import { dataQualityStatsV13Routes } from './routes/dataQualityStatsV13';
// M353-C：系统可用率 V13 GET /api/v1/system-availability-stats（stats 避让已有 systemAvailabilityV13）
import { systemAvailabilityStatsV13Routes } from './routes/systemAvailabilityStatsV13';
// M353-D：备份与容灾 V13 GET /api/v1/backup-dr（M353 收官）
import { backupDRV13Routes } from './routes/backupDRV13';
// M354-A：KPI 总览看板 V13 GET /api/v1/kpi-dashboard
import { kpiDashboardV13Routes } from './routes/kpiDashboardV13';
// M354-B：病案质量管理 V13 GET /api/v1/medical-record-quality
import { medicalRecordQualityV13Routes } from './routes/medicalRecordQualityV13';
// M354-C：投诉管理 V13 GET /api/v1/complaint-mgmt
import { complaintMgmtV13Routes } from './routes/complaintMgmtV13';
// M354-D：继续医学教育 V13 GET /api/v1/continuing-education-stats（stats 避让已有 continuingEduV13，M354 收官）
import { continuingEducationStatsV13Routes } from './routes/continuingEducationStatsV13';
// M355-A：重点专科建设 V13 GET /api/v1/specialty-development
import { specialtyDevelopmentV13Routes } from './routes/specialtyDevelopmentV13';
// M355-B：临床研究 V13 GET /api/v1/clinical-research-stats（stats 避让已有 clinicalResearchV13 / M327-A）
import { clinicalResearchStatsV13Routes } from './routes/clinicalResearchStatsV13';
// M355-C：教学工作 V13 GET /api/v1/teaching-workload
import { teachingWorkloadV13Routes } from './routes/teachingWorkloadV13';
// M355-D：医联体与分级诊疗 V13 GET /api/v1/medical-alliance（M355 收官）
import { medicalAllianceV13Routes } from './routes/medicalAllianceV13';
// M356-A：DRG 绩效 V13 GET /api/v1/drg-performance
import { drgPerformanceV13Routes } from './routes/drgPerformanceV13';
// M356-B：DIP 病种分值 V13 GET /api/v1/dip-score
import { dipScoreV13Routes } from './routes/dipScoreV13';
// M356-C：药耗占比 V13 GET /api/v1/drug-consumable-ratio
import { drugConsumableRatioV13Routes } from './routes/drugConsumableRatioV13';
// M356-D：收入结构（支出端） V13 GET /api/v1/expense-structure（expense 避让已有 revenueStructureV13 / revenueStructureStatsV13，M356 收官）
import { expenseStructureV13Routes } from './routes/expenseStructureV13';
// M357-A：患者安全目标 V13 GET /api/v1/patient-safety-stats（stats 避让已有 patientSafetyV13 / M322-B）
import { patientSafetyStatsV13Routes } from './routes/patientSafetyStatsV13';
// M357-B：医疗质量核心制度 V13 GET /api/v1/core-system
import { coreSystemV13Routes } from './routes/coreSystemV13';
// M357-C：手术部位感染 V13 GET /api/v1/surgical-infection
import { surgicalInfectionV13Routes } from './routes/surgicalInfectionV13';
// M357-D：抗菌药物管理 V13 GET /api/v1/antibiotic-mgmt（M357 收官）
import { antibioticMgmtV13Routes } from './routes/antibioticMgmtV13';
// M358-A：护理质量 V13 GET /api/v1/nursing-quality
import { nursingQualityV13Routes } from './routes/nursingQualityV13';
// M358-B：患者体验 V13 GET /api/v1/patient-experience
import { patientExperienceV13Routes } from './routes/patientExperienceV13';
// M358-C：护理人力配置 V13 GET /api/v1/nursing-staffing
import { nursingStaffingV13Routes } from './routes/nursingStaffingV13';
// M358-D：护理文书管理 V13 GET /api/v1/nursing-document（M358 收官）
import { nursingDocumentV13Routes } from './routes/nursingDocumentV13';
// M359-A：药学服务 V13 GET /api/v1/pharmacy-service
import { pharmacyServiceV13Routes } from './routes/pharmacyServiceV13';
// M359-B：合理用药 V13 GET /api/v1/rational-drug-use-stats（stats 避让已有 rationalDrugUse）
import { rationalDrugUseStatsV13Routes } from './routes/rationalDrugUseStatsV13';
// M359-C：药品库存管理 V13 GET /api/v1/drug-inventory-stats（stats 避让已有 drugInventory）
import { drugInventoryStatsV13Routes } from './routes/drugInventoryStatsV13';
// M359-D：输液管理 V13 GET /api/v1/infusion-mgmt（M359 收官）
import { infusionMgmtV13Routes } from './routes/infusionMgmtV13';
// M360-A：检验质量 V13 GET /api/v1/lab-quality（新规格：室内质控/室间质评/报告及时率）
import { labQualityV13Routes } from './routes/labQualityV13';
// M360-B：影像质量 V13 GET /api/v1/imaging-quality（新规格：报告及时率/阳性率/甲级片率）
import { imagingQualityV13Routes } from './routes/imagingQualityV13';
// M360-C：病理质量 V13 GET /api/v1/pathology-quality
import { pathologyQualityV13Routes } from './routes/pathologyQualityV13';
// M360-D：输血管理 V13 GET /api/v1/blood-mgmt（M360 收官）
import { bloodMgmtV13Routes } from './routes/bloodMgmtV13';
// M361-A：科研管理 V13 GET /api/v1/research-mgmt
import { researchMgmtV13Routes } from './routes/researchMgmtV13';
// M361-B：教学管理 V13 GET /api/v1/teaching-mgmt
import { teachingMgmtV13Routes } from './routes/teachingMgmtV13';
// M361-C：继续教育（覆盖率）V13 GET /api/v1/continuing-edu-coverage
import { continuingEduCoverageV13Routes } from './routes/continuingEduCoverageV13';
// M361-D：学术交流 V13 GET /api/v1/academic-exchange（M361 收官）
import { academicExchangeV13Routes } from './routes/academicExchangeV13';
// M362-A：人员管理 V13 GET /api/v1/staff-mgmt
import { staffMgmtV13Routes } from './routes/staffMgmtV13';
// M362-B：培训管理 V13 GET /api/v1/training-mgmt
import { trainingMgmtV13Routes } from './routes/trainingMgmtV13';
// M362-C：后勤管理 V13 GET /api/v1/logistics-mgmt
import { logisticsMgmtV13Routes } from './routes/logisticsMgmtV13';
// M362-D：安全管理 V13 GET /api/v1/safety-mgmt（M362 收官）
import { safetyMgmtV13Routes } from './routes/safetyMgmtV13';
// M363-A：信息安全（统计）V13 GET /api/v1/info-security-stats（stats避让）
import { infoSecurityStatsV13Routes } from './routes/infoSecurityStatsV13';
// M363-B：患者隐私保护 V13 GET /api/v1/patient-privacy
import { patientPrivacyV13Routes } from './routes/patientPrivacyV13';
// M363-C：网络安全 V13 GET /api/v1/network-security
import { networkSecurityV13Routes } from './routes/networkSecurityV13';
// M363-D：数据治理（统计）V13 GET /api/v1/data-governance-stats（stats避让）
import { dataGovernanceStatsV13Routes } from './routes/dataGovernanceStatsV13';
// M364-A：运营管理 V13 GET /api/v1/operation-mgmt
import { operationMgmtV13Routes } from './routes/operationMgmtV13';
// M364-B：财务管理 V13 GET /api/v1/finance-mgmt
import { financeMgmtV13Routes } from './routes/financeMgmtV13';
// M364-C：患者流量 V13 GET /api/v1/patient-flow
import { patientFlowV13Routes } from './routes/patientFlowV13';
// M364-D：资源利用 V13 GET /api/v1/resource-util（M364 收官）
import { resourceUtilV13Routes } from './routes/resourceUtilV13';
// M365-A：患者满意度（得分）V13 GET /api/v1/patient-satisfaction-score（score避让）
import { patientSatisfactionScoreV13Routes } from './routes/patientSatisfactionScoreV13';
// M365-B：投诉管理（统计）V13 GET /api/v1/complaint-mgmt-stats（stats避让）
import { complaintMgmtStatsV13Routes } from './routes/complaintMgmtStatsV13';
// M365-C：服务态度 V13 GET /api/v1/service-attitude
import { serviceAttitudeV13Routes } from './routes/serviceAttitudeV13';
// M365-D：就医体验（等候时间）V13 GET /api/v1/experience-wait-time（M365 收官）
import { experienceWaitTimeV13Routes } from './routes/experienceWaitTimeV13';
// M366-A：AI 辅助诊断（统计）V13 GET /api/v1/ai-diagnosis-stats（stats避让）
import { aiDiagnosisStatsV13Routes } from './routes/aiDiagnosisStatsV13';
// M366-B：AI 辅助治疗 V13 GET /api/v1/ai-treatment
import { aiTreatmentV13Routes } from './routes/aiTreatmentV13';
// M366-C：AI 管理应用 V13 GET /api/v1/ai-management
import { aiManagementV13Routes } from './routes/aiManagementV13';
// M366-D：AI 教学培训 V13 GET /api/v1/ai-education（M366 收官）
import { aiEducationV13Routes } from './routes/aiEducationV13';
// M367-A：互联网医院（统计）V13 GET /api/v1/internet-hospital-stats（stats避让）
import { internetHospitalStatsV13Routes } from './routes/internetHospitalStatsV13';
// M367-B：远程医疗（统计）V13 GET /api/v1/telemedicine-stats（stats避让）
import { telemedicineStatsV13Routes } from './routes/telemedicineStatsV13';
// M367-C：在线支付 V13 GET /api/v1/online-payment
import { onlinePaymentV13Routes } from './routes/onlinePaymentV13';
// M367-D：健康档案 V13 GET /api/v1/health-record（M367 收官）
import { healthRecordV13Routes } from './routes/healthRecordV13';
// M368-A：药品不良反应 V13 GET /api/v1/drug-adverse-reaction
import { drugAdverseReactionV13Routes } from './routes/drugAdverseReactionV13';
// M368-B：药物相互作用 V13 GET /api/v1/drug-interaction
import { drugInteractionV13Routes } from './routes/drugInteractionV13';
// M368-C：抗菌药物管理（统计）V13 GET /api/v1/antibiotic-mgmt-stats（stats避让）
import { antibioticMgmtStatsV13Routes } from './routes/antibioticMgmtStatsV13';
// M368-D：基本药物管理 V13 GET /api/v1/essential-drug（M368 收官）
import { essentialDrugV13Routes } from './routes/essentialDrugV13';
// M369-A：护理质量（统计）V13 GET /api/v1/nursing-quality-stats（stats避让）
import { nursingQualityStatsV13Routes } from './routes/nursingQualityStatsV13';
// M369-B：护理安全 V13 GET /api/v1/nursing-safety
import { nursingSafetyV13Routes } from './routes/nursingSafetyV13';
// M369-C：护理人员配置 V13 GET /api/v1/nursing-staff
import { nursingStaffV13Routes } from './routes/nursingStaffV13';
// M369-D：护理培训 V13 GET /api/v1/nursing-training（M369 收官）
import { nursingTrainingV13Routes } from './routes/nursingTrainingV13';
// M370-A：院感控制 V13 GET /api/v1/infection-control
import { infectionControlV13Routes } from './routes/infectionControlV13';
// M370-B：院感监测 V13 GET /api/v1/infection-surveillance
import { infectionSurveillanceV13Routes } from './routes/infectionSurveillanceV13';
// M370-C：环境卫生学 V13 GET /api/v1/environmental-hygiene
import { environmentalHygieneV13Routes } from './routes/environmentalHygieneV13';
// M370-D：传染病报告 V13 GET /api/v1/epidemic-report（M370 收官）
import { epidemicReportV13Routes } from './routes/epidemicReportV13';
// M371-A：医疗质量 V13 GET /api/v1/medical-quality
import { medicalQualityV13Routes } from './routes/medicalQualityV13';
// M371-B：医疗安全 V13 GET /api/v1/medical-safety
import { medicalSafetyV13Routes } from './routes/medicalSafetyV13';
// M371-C：手术质量 V13 GET /api/v1/surgery-quality
import { surgeryQualityV13Routes } from './routes/surgeryQualityV13';
// M371-D：麻醉质量 V13 GET /api/v1/anesthesia-quality（M371 收官）
import { anesthesiaQualityV13Routes } from './routes/anesthesiaQualityV13';
// M372-A：门诊服务 V13 GET /api/v1/outpatient-service
import { outpatientServiceV13Routes } from './routes/outpatientServiceV13';
// M372-B：急诊服务 V13 GET /api/v1/emergency-service
import { emergencyServiceV13Routes } from './routes/emergencyServiceV13';
// M372-C：门诊质量 V13 GET /api/v1/outpatient-quality
import { outpatientQualityV13Routes } from './routes/outpatientQualityV13';
// M372-D：绿色通道 V13 GET /api/v1/green-channel（M372 收官）
import { greenChannelV13Routes } from './routes/greenChannelV13';
// M373-A：住院服务 V13 GET /api/v1/inpatient-service
import { inpatientServiceV13Routes } from './routes/inpatientServiceV13';
// M373-B：床位管理 V13 GET /api/v1/bed-management
import { bedManagementV13Routes } from './routes/bedManagementV13';
// M373-C：住院质量 V13 GET /api/v1/inpatient-quality
import { inpatientQualityV13Routes } from './routes/inpatientQualityV13';
// M373-D：出院随访 V13 GET /api/v1/discharge-followup（M373 收官）
import { dischargeFollowupV13Routes } from './routes/dischargeFollowupV13';
// M374-A：检查服务 V13 GET /api/v1/examination-service
import { examinationServiceV13Routes } from './routes/examinationServiceV13';
// M374-B：检验服务 V13 GET /api/v1/lab-service
import { labServiceV13Routes } from './routes/labServiceV13';
// M374-C：病理服务 V13 GET /api/v1/pathology-service
import { pathologyServiceV13Routes } from './routes/pathologyServiceV13';
// M374-D：影像质量 V13 GET /api/v1/radiology-quality（M374 收官）
import { radiologyQualityV13Routes } from './routes/radiologyQualityV13';
// M375-A：医保结算明细 V13 GET /api/v1/insurance-settlement-detail（detail 避让）
import { insuranceSettlementDetailV13Routes } from './routes/insuranceSettlementDetailV13';
// M375-B：费用控制 V13 GET /api/v1/medical-cost-control
import { medicalCostControlV13Routes } from './routes/medicalCostControlV13';
// M375-C：DRG 管理 V13 GET /api/v1/drg-management
import { DRGmanagementV13Routes } from './routes/DRGmanagementV13';
// M375-D：价格管理 V13 GET /api/v1/price-management（M375 收官）
import { priceManagementV13Routes } from './routes/priceManagementV13';
// M376-A：护理服务 V13 GET /api/v1/nursing-service
import { nursingServiceV13Routes } from './routes/nursingServiceV13';
// M376-B：护理文书统计 V13 GET /api/v1/nursing-document-stats（stats 避让）
import { nursingDocumentStatsV13Routes } from './routes/nursingDocumentStatsV13';
// M376-C：护理敏感指标 V13 GET /api/v1/nursing-sensitive-index
import { nursingSensitiveIndexV13Routes } from './routes/nursingSensitiveIndexV13';
// M376-D：护理管理 V13 GET /api/v1/nursing-management（M376 收官）
import { nursingManagementV13Routes } from './routes/nursingManagementV13';
// M377-A：后勤服务 V13 GET /api/v1/logistics-service
import { logisticsServiceV13Routes } from './routes/logisticsServiceV13';
// M377-B：设备管理 V13 GET /api/v1/equipment-mgmt
import { equipmentMgmtV13Routes } from './routes/equipmentMgmtV13';
// M377-C：能源管理 V13 GET /api/v1/energy-mgmt
import { energyMgmtV13Routes } from './routes/energyMgmtV13';
// M377-D：环境管理 V13 GET /api/v1/environment-mgmt（M377 收官）
import { environmentMgmtV13Routes } from './routes/environmentMgmtV13';
// M378-A：预约服务统计 V13 GET /api/v1/appointment-stats（stats 避让）
import { appointmentStatsV13Routes } from './routes/appointmentStatsV13';
// M378-B：导医服务 V13 GET /api/v1/guide-service
import { guideServiceV13Routes } from './routes/guideServiceV13';
// M378-C：志愿服务 V13 GET /api/v1/volunteer-service
import { volunteerServiceV13Routes } from './routes/volunteerServiceV13';
// M378-D：便民服务 V13 GET /api/v1/convenience-service（M378 收官）
import { convenienceServiceV13Routes } from './routes/convenienceServiceV13';
// M379-A：安全事件统计 V13 GET /api/v1/security-incident-stats（stats 避让）
import { securityIncidentStatsV13Routes } from './routes/securityIncidentStatsV13';
// M379-B：备份管理 V13 GET /api/v1/backup-mgmt
import { backupMgmtV13Routes } from './routes/backupMgmtV13';
// M379-C：系统可用性明细 V13 GET /api/v1/system-availability-detail（detail 避让）
import { systemAvailabilityDetailV13Routes } from './routes/systemAvailabilityDetailV13';
// M379-D：数据质量明细 V13 GET /api/v1/data-quality-detail（detail 避让，M379 收官）
import { dataQualityDetailV13Routes } from './routes/dataQualityDetailV13';
// M380-A：制剂管理 V13 GET /api/v1/drug-preparation
import { drugPreparationV13Routes } from './routes/drugPreparationV13';
// M380-B：临床药学 V13 GET /api/v1/clinical-pharmacy
import { clinicalPharmacyV13Routes } from './routes/clinicalPharmacyV13';
// M380-C：药库管理 V13 GET /api/v1/drug-storage
import { drugStorageV13Routes } from './routes/drugStorageV13';
// M380-D：中药房 V13 GET /api/v1/tcm-pharmacy（M380 收官）
import { TCMpharmacyV13Routes } from './routes/TCMpharmacyV13';
// M381-A：运营看板 V13 GET /api/v1/operation-dashboard
import { operationDashboardV13Routes } from './routes/operationDashboardV13';
// M381-B：财务明细 V13 GET /api/v1/finance-detail
import { financeDetailV13Routes } from './routes/financeDetailV13';
// M381-C：患者流明细 V13 GET /api/v1/patient-flow-detail
import { patientFlowDetailV13Routes } from './routes/patientFlowDetailV13';
// M381-D：资源利用明细 V13 GET /api/v1/resource-util-detail（M381 收官）
import { resourceUtilDetailV13Routes } from './routes/resourceUtilDetailV13';
// M382-A：医保申报 V13 GET /api/v1/insurance-claim
import { insuranceClaimV13Routes } from './routes/insuranceClaimV13';
// M382-B：医保审核统计 V13 GET /api/v1/insurance-audit-stats（stats 避让）
import { insuranceAuditStatsV13Routes } from './routes/insuranceAuditStatsV13';
// M382-C：DRG分组统计 V13 GET /api/v1/drg-group-stats（stats 避让）
import { DRGgroupStatsV13Routes } from './routes/DRGgroupStatsV13';
// M382-D：价格监控 V13 GET /api/v1/price-monitor（M382 收官）
import { priceMonitorV13Routes } from './routes/priceMonitorV13';
// M383-A：科研项目统计 V13 GET /api/v1/research-project-stats（stats 避让）
import { researchProjectStatsV13Routes } from './routes/researchProjectStatsV13';
// M383-B：教学活动 V13 GET /api/v1/teaching-activity
import { teachingActivityV13Routes } from './routes/teachingActivityV13';
// M383-C：住培管理统计 V13 GET /api/v1/resident-training-stats（stats 避让）
import { residentTrainingStatsV13Routes } from './routes/residentTrainingStatsV13';
// M383-D：学术交流统计 V13 GET /api/v1/academic-exchange-stats（stats 避让，M383 收官）
import { academicExchangeStatsV13Routes } from './routes/academicExchangeStatsV13';
// M384-A：人员招聘 V13 GET /api/v1/staff-recruitment
import { staffRecruitmentV13Routes } from './routes/staffRecruitmentV13';
// M384-B：人员留存 V13 GET /api/v1/staff-retention
import { staffRetentionV13Routes } from './routes/staffRetentionV13';
// M384-C：绩效考核 V13 GET /api/v1/performance-eval
import { performanceEvalV13Routes } from './routes/performanceEvalV13';
// M384-D：培训计划 V13 GET /api/v1/training-plan（M384 收官）
import { trainingPlanV13Routes } from './routes/trainingPlanV13';
// M385-A：后勤保障 V13 GET /api/v1/logistics-support
import { logisticsSupportV13Routes } from './routes/logisticsSupportV13';
// M385-B：设备维护统计 V13 GET /api/v1/equipment-maintenance-stats（stats 避让）
import { equipmentMaintenanceStatsV13Routes } from './routes/equipmentMaintenanceStatsV13';
// M385-C：能源管理明细 V13 GET /api/v1/energy-mgmt-detail
import { energyMgmtDetailV13Routes } from './routes/energyMgmtDetailV13';
// M385-D：安全生产 V13 GET /api/v1/safety-production（M385 收官）
import { safetyProductionV13Routes } from './routes/safetyProductionV13';
// M386-A：患者体验统计 V13 GET /api/v1/patient-experience-stats（stats 避让）
import { patientExperienceStatsV13Routes } from './routes/patientExperienceStatsV13';
// M386-B：服务质量 V13 GET /api/v1/service-quality
import { serviceQualityV13Routes } from './routes/serviceQualityV13';
// M386-D：临床路径统计 V13 GET /api/v1/clinical-pathway-stats（stats 避让，M386 收官）
import { clinicalPathwayStatsV13Routes } from './routes/clinicalPathwayStatsV13';
// M387-A：核心制度落实 V13 GET /api/v1/core-system-compliance
import { coreSystemComplianceV13Routes } from './routes/coreSystemComplianceV13';
// M387-B：交接班管理 V13 GET /api/v1/handover-mgmt
import { handoverMgmtV13Routes } from './routes/handoverMgmtV13';
// M387-C：知情同意统计 V13 GET /api/v1/informed-consent-stats（stats 避让）
import { informedConsentStatsV13Routes } from './routes/informedConsentStatsV13';
// M387-D：不良事件上报 V13 GET /api/v1/adverse-event-report（M387 收官）
import { adverseEventReportV13Routes } from './routes/adverseEventReportV13';
// M388-A：处方点评统计 V13 GET /api/v1/prescription-review-stats（stats 避让）
import { prescriptionReviewStatsV13Routes } from './routes/prescriptionReviewStatsV13';
// M388-B：抗菌药物使用 V13 GET /api/v1/antibiotic-usage
import { antibioticUsageV13Routes } from './routes/antibioticUsageV13';
// M388-C：药品过敏管理 V13 GET /api/v1/drug-allergy-mgmt
import { drugAllergyMgmtV13Routes } from './routes/drugAllergyMgmtV13';
// M388-D：急救药品管理 V13 GET /api/v1/emergency-drug-mgmt（M388 收官）
import { emergencyDrugMgmtV13Routes } from './routes/emergencyDrugMgmtV13';
// M389-A：护理质量 V13 GET /api/v1/nursing-care-quality
import { nursingCareQualityV13Routes } from './routes/nursingCareQualityV13';
// M389-B：护理感控 V13 GET /api/v1/nursing-infection-control
import { nursingInfectionControlV13Routes } from './routes/nursingInfectionControlV13';
// M389-C：护理教育 V13 GET /api/v1/nursing-education
import { nursingEducationV13Routes } from './routes/nursingEducationV13';
// M389-D：护理人力统计 V13 GET /api/v1/nursing-staffing-stats（stats 避让，M389 收官）
import { nursingStaffingStatsV13Routes } from './routes/nursingStaffingStatsV13';
// M390-A：预约管理 V13 GET /api/v1/appointment-mgmt
import { appointmentMgmtV13Routes } from './routes/appointmentMgmtV13';
// M390-B：分诊管理 V13 GET /api/v1/triage-mgmt
import { triageMgmtV13Routes } from './routes/triageMgmtV13';
// M390-C：门诊药房 V13 GET /api/v1/outpatient-pharmacy
import { outpatientPharmacyV13Routes } from './routes/outpatientPharmacyV13';
// M390-D：急诊分级 V13 GET /api/v1/emergency-severity（M390 收官）
import { emergencySeverityV13Routes } from './routes/emergencySeverityV13';
// M391-A：手术过程 V13 GET /api/v1/surgery-process
import { surgeryProcessV13Routes } from './routes/surgeryProcessV13';
// M391-B：麻醉质量 V13 GET /api/v1/anesthesia-detail
import { anesthesiaDetailV13Routes } from './routes/anesthesiaDetailV13';
// M391-C：围手术期 V13 GET /api/v1/perioperative-mgmt
import { perioperativeMgmtV13Routes } from './routes/perioperativeMgmtV13';
// M391-D：器械管理 V13 GET /api/v1/instrument-mgmt（M391 收官）
import { instrumentMgmtV13Routes } from './routes/instrumentMgmtV13';
// M392-A：检验质控 V13 GET /api/v1/lab-quality-control
import { labQualityControlV13Routes } from './routes/labQualityControlV13';
// M392-B：影像质控 V13 GET /api/v1/imaging-quality-control
import { imagingQualityControlV13Routes } from './routes/imagingQualityControlV13';
// M392-C：病理质控 V13 GET /api/v1/pathology-quality-control
import { pathologyQualityControlV13Routes } from './routes/pathologyQualityControlV13';
// M392-D：输血管理 V13 GET /api/v1/blood-mgmt-detail（M392 收官）
import { bloodMgmtDetailV13Routes } from './routes/bloodMgmtDetailV13';
// M393-A：手卫生明细 V13 GET /api/v1/hand-hygiene-detail（避让旧版 handHygieneV13）
import { handHygieneDetailV13Routes } from './routes/handHygieneDetailV13';
// M393-B：隔离管理 V13 GET /api/v1/isolation-mgmt
import { isolationMgmtV13Routes } from './routes/isolationMgmtV13';
// M393-C：医疗废物 V13 GET /api/v1/medical-waste-mgmt
import { medicalWasteMgmtV13Routes } from './routes/medicalWasteMgmtV13';
// M393-D：疫苗接种 V13 GET /api/v1/vaccination-mgmt（M393 收官）
import { vaccinationMgmtV13Routes } from './routes/vaccinationMgmtV13';
// M394-A：跌倒预防 V13 GET /api/v1/fall-prevention
import { fallPreventionV13Routes } from './routes/fallPreventionV13';
// M394-B：压疮管理 V13 GET /api/v1/pressure-ulcer-mgmt
import { pressureUlcerMgmtV13Routes } from './routes/pressureUlcerMgmtV13';
// M394-C：患者身份识别 V13 GET /api/v1/patient-identification
import { patientIdentificationV13Routes } from './routes/patientIdentificationV13';
// M394-D：用药安全 V13 GET /api/v1/medication-safety（M394 收官）
import { medicationSafetyV13Routes } from './routes/medicationSafetyV13';
// M395-A：智慧医院分级 V13 GET /api/v1/smart-hospital-grade（避让旧版 smartHospitalRatingV13）
import { smartHospitalGradeV13Routes } from './routes/smartHospitalGradeV13';
// M395-B：等级评审 V13 GET /api/v1/grade-review
import { gradeReviewV13Routes } from './routes/gradeReviewV13';
// M395-C：质量管理体系 V13 GET /api/v1/quality-mgmt-system
import { qualityMgmtSystemV13Routes } from './routes/qualityMgmtSystemV13';
// M395-D：绩效管理 V13 GET /api/v1/performance-mgmt（M395 收官）
import { performanceMgmtV13Routes } from './routes/performanceMgmtV13';
// M396-A：床位利用 V13 GET /api/v1/bed-utilization
import { bedUtilizationV13Routes } from './routes/bedUtilizationV13';
// M396-B：收入结构明细 V13 GET /api/v1/revenue-structure-detail（避让旧版 revenueStructureV13/revenueStructureStatsV13）
import { revenueStructureDetailV13Routes } from './routes/revenueStructureDetailV13';
// M396-C：成本控制明细 V13 GET /api/v1/cost-control-detail（避让旧版 costControlV13/medicalCostControlV13）
import { costControlDetailV13Routes } from './routes/costControlDetailV13';
// M396-D：效率指标 V13 GET /api/v1/efficiency-indicator（M396 收官）
import { efficiencyIndicatorV13Routes } from './routes/efficiencyIndicatorV13';
// M397-A：学科建设 V13 GET /api/v1/discipline-construction
import { disciplineConstructionV13Routes } from './routes/disciplineConstructionV13';
// M397-B：人才发展 V13 GET /api/v1/talent-development
import { talentDevelopmentV13Routes } from './routes/talentDevelopmentV13';
// M397-C：临床研究明细 V13 GET /api/v1/clinical-research-detail（避让旧版 clinicalResearchV13/clinicalResearchStatsV13）
import { clinicalResearchDetailV13Routes } from './routes/clinicalResearchDetailV13';
// M397-D：继续教育明细 V13 GET /api/v1/continuing-education-detail（M397 收官，避让旧版 continuingEducationV13/continuingEducationStatsV13）
import { continuingEducationDetailV13Routes } from './routes/continuingEducationDetailV13';
// M398-A：投诉管理明细 V13 GET /api/v1/complaint-mgmt-detail（避让旧版 complaintMgmtV13/complaintMgmtStatsV13）
import { complaintMgmtDetailV13Routes } from './routes/complaintMgmtDetailV13';
// M398-B：医疗纠纷 V13 GET /api/v1/medical-dispute
import { medicalDisputeV13Routes } from './routes/medicalDisputeV13';
// M398-C：医保管理明细 V13 GET /api/v1/medical-insurance-detail
import { medicalInsuranceDetailV13Routes } from './routes/medicalInsuranceDetailV13';
// M398-D：公共关系 V13 GET /api/v1/public-relation（M398 收官）
import { publicRelationV13Routes } from './routes/publicRelationV13';
// M399-A：互联网医院明细 V13 GET /api/v1/internet-hospital-detail（避让旧版 internetHospital/internetHospitalStatsV13）
import { internetHospitalDetailV13Routes } from './routes/internetHospitalDetailV13';
// M399-B：远程医疗明细 V13 GET /api/v1/telemedicine-detail（避让旧版 telemedicineV13/telemedicineStatsV13）
import { telemedicineDetailV13Routes } from './routes/telemedicineDetailV13';
// M399-C：线上支付明细 V13 GET /api/v1/online-payment-detail（避让旧版 onlinePaymentV13）
import { onlinePaymentDetailV13Routes } from './routes/onlinePaymentDetailV13';
// M399-D：健康体检 V13 GET /api/v1/health-checkup（M399 收官）
import { healthCheckupV13Routes } from './routes/healthCheckupV13';
// M400-A：患者服务 V13 GET /api/v1/patient-service
import { patientServiceV13Routes } from './routes/patientServiceV13';
// M400-B：满意度调查明细 V13 GET /api/v1/satisfaction-survey-detail（避让旧版 satisfaction-survey）
import { satisfactionSurveyDetailV13Routes } from './routes/satisfactionSurveyDetailV13';
// M400-C：随访管理 V13 GET /api/v1/follow-up-mgmt
import { followUpMgmtV13Routes } from './routes/followUpMgmtV13';
// M400-D：患者教育明细 V13 GET /api/v1/patient-education-detail（M400 收官，避让旧版 patientEducationV13）
import { patientEducationDetailV13Routes } from './routes/patientEducationDetailV13';
// M401-A：病案管理 V13 GET /api/v1/medical-record
import { medicalRecordV13Routes } from './routes/medicalRecordV13';
// M401-B：数据治理明细 V13 GET /api/v1/data-governance-detail（避让旧版 dataGovernanceV13/dataGovernanceStatsV13）
import { dataGovernanceDetailV13Routes } from './routes/dataGovernanceDetailV13';
// M401-C：统计报表 V13 GET /api/v1/statistics-report
import { statisticsReportV13Routes } from './routes/statisticsReportV13';
// M401-D：编码质量 V13 GET /api/v1/coding-quality（M401 收官）
import { codingQualityV13Routes } from './routes/codingQualityV13';
// M402-A：排班管理 V13 GET /api/v1/scheduling-mgmt
import { schedulingMgmtV13Routes } from './routes/schedulingMgmtV13';
// M402-B：值班管理 V13 GET /api/v1/duty-roster
import { dutyRosterV13Routes } from './routes/dutyRosterV13';
// M402-C：考勤管理 V13 GET /api/v1/attendance-mgmt
import { attendanceMgmtV13Routes } from './routes/attendanceMgmtV13';
// M402-D：绩效考核 V13 GET /api/v1/performance-eval-detail（避让旧版 performanceEvalV13 M384，M402 收官）
import { performanceEvalDetailV13Routes } from './routes/performanceEvalDetailV13';
// M403-A：重点专科管理 V13 GET /api/v1/key-specialty-mgmt
import { keySpecialtyMgmtV13Routes } from './routes/keySpecialtyMgmtV13';
// M403-B：人才团队管理 V13 GET /api/v1/talent-team-mgmt
import { talentTeamMgmtV13Routes } from './routes/talentTeamMgmtV13';
// M403-C：学科竞赛 V13 GET /api/v1/discipline-competition
import { disciplineCompetitionV13Routes } from './routes/disciplineCompetitionV13';
// M403-D：学术水平 V13 GET /api/v1/academic-level（M403 收官）
import { academicLevelV13Routes } from './routes/academicLevelV13';
// M404-A：三级查房管理 V13 GET /api/v1/three-level-ward-round
import { threeLevelWardRoundV13Routes } from './routes/threeLevelWardRoundV13';
// M404-B：会诊管理 V13 GET /api/v1/consultation-mgmt
import { consultationMgmtV13Routes } from './routes/consultationMgmtV13';
// M404-C：病例讨论 V13 GET /api/v1/case-discussion
import { caseDiscussionV13Routes } from './routes/caseDiscussionV13';
// M404-D：分级护理 V13 GET /api/v1/grade-nursing（M404 收官）
import { gradeNursingV13Routes } from './routes/gradeNursingV13';
// M405-A：护理文书质量 V13 GET /api/v1/nursing-record-quality
import { nursingRecordQualityV13Routes } from './routes/nursingRecordQualityV13';
// M405-B：护患沟通 V13 GET /api/v1/nursing-communication
import { nursingCommunicationV13Routes } from './routes/nursingCommunicationV13';
// M405-C：护理管理明细 V13 GET /api/v1/nursing-management-detail（避让旧版 nursingManagementV13 M376-D）
import { nursingManagementDetailV13Routes } from './routes/nursingManagementDetailV13';
// M405-D：护理服务明细 V13 GET /api/v1/nursing-service-detail（M405 收官）
import { nursingServiceDetailV13Routes } from './routes/nursingServiceDetailV13';
// M406-A：处方点评 V13 GET /api/v1/pharmacy-prescription-review
import { pharmacyPrescriptionReviewV13Routes } from './routes/pharmacyPrescriptionReviewV13';
// M406-B：药品目录 V13 GET /api/v1/pharmacy-drug-catalog
import { pharmacyDrugCatalogV13Routes } from './routes/pharmacyDrugCatalogV13';
// M406-C：药品配送 V13 GET /api/v1/pharmacy-drug-delivery
import { pharmacyDrugDeliveryV13Routes } from './routes/pharmacyDrugDeliveryV13';
// M406-D：药品安全 V13 GET /api/v1/pharmacy-drug-safety（M406 收官）
import { pharmacyDrugSafetyV13Routes } from './routes/pharmacyDrugSafetyV13';
// M407-A：运营成本管理 V13 GET /api/v1/operating-cost-mgmt
import { operatingCostMgmtV13Routes } from './routes/operatingCostMgmtV13';
// M407-B：收入增长 V13 GET /api/v1/revenue-growth
import { revenueGrowthV13Routes } from './routes/revenueGrowthV13';
// M407-C：盈亏分析 V13 GET /api/v1/profit-analysis
import { profitAnalysisV13Routes } from './routes/profitAnalysisV13';
// M407-D：战略KPI V13 GET /api/v1/strategic-kpi（M407 收官）
import { strategicKpiV13Routes } from './routes/strategicKpiV13';
// M408-A：医疗器械管理 V13 GET /api/v1/medical-device-mgmt
import { medicalDeviceMgmtV13Routes } from './routes/medicalDeviceMgmtV13';
// M408-B：耗材供应 V13 GET /api/v1/consumable-supply
import { consumableSupplyV13Routes } from './routes/consumableSupplyV13';
// M408-C：消防安全明细 V13 GET /api/v1/fire-safety-detail（避让旧版 fireSafetyV13 M352-A）
import { fireSafetyDetailV13Routes } from './routes/fireSafetyDetailV13';
// M408-D：治安保卫 V13 GET /api/v1/security-mgmt（M408 收官）
import { securityMgmtV13Routes } from './routes/securityMgmtV13';
// M409-A：信息系统管理 V13 GET /api/v1/information-system-mgmt
import { informationSystemMgmtV13Routes } from './routes/informationSystemMgmtV13';
// M409-B：数据质量管理 V13 GET /api/v1/data-quality-mgmt
import { dataQualityMgmtV13Routes } from './routes/dataQualityMgmtV13';
// M409-C：网络安全管理 V13 GET /api/v1/cybersecurity-mgmt
import { cybersecurityMgmtV13Routes } from './routes/cybersecurityMgmtV13';
// M409-D：互联互通管理 V13 GET /api/v1/interop-mgmt（M409 收官）
import { interopMgmtV13Routes } from './routes/interopMgmtV13';
// M410-A：科室KPI V13 GET /api/v1/department-kpi
import { departmentKpiV13Routes } from './routes/departmentKpiV13';
// M410-B：个人KPI V13 GET /api/v1/individual-kpi
import { individualKpiV13Routes } from './routes/individualKpiV13';
// M410-C：绩效奖金 V13 GET /api/v1/performance-bonus
import { performanceBonusV13Routes } from './routes/performanceBonusV13';
// M410-D：绩效改进 V13 GET /api/v1/performance-improvement（M410 收官）
import { performanceImprovementV13Routes } from './routes/performanceImprovementV13';
// M411-A：危急值管理 V13 GET /api/v1/critical-value-mgmt
import { criticalValueMgmtV13Routes } from './routes/criticalValueMgmtV13';
// M411-B：再入院管理 V13 GET /api/v1/readmission-mgmt
import { readmissionMgmtV13Routes } from './routes/readmissionMgmtV13';
// M411-C：转科转院管理 V13 GET /api/v1/inpatient-transfer-mgmt
import { inpatientTransferMgmtV13Routes } from './routes/inpatientTransferMgmtV13';
// M411-D：出院小结管理 V13 GET /api/v1/discharge-summary-mgmt（M411 收官）
import { dischargeSummaryMgmtV13Routes } from './routes/dischargeSummaryMgmtV13';
// M412-A：死亡病例管理 V13 GET /api/v1/death-report-mgmt
import { deathReportMgmtV13Routes } from './routes/deathReportMgmtV13';
// M412-B：新生儿管理 V13 GET /api/v1/newborn-mgmt
import { newbornMgmtV13Routes } from './routes/newbornMgmtV13';
// M412-C：孕产妇管理 V13 GET /api/v1/maternal-mgmt
import { maternalMgmtV13Routes } from './routes/maternalMgmtV13';
// M412-D：院感报告管理 V13 GET /api/v1/infection-report-mgmt（M412 收官）
import { infectionReportMgmtV13Routes } from './routes/infectionReportMgmtV13';
// M413-A：病案质量管理 V13 GET /api/v1/medical-record-mgmt
import { medicalRecordMgmtV13Routes } from './routes/medicalRecordMgmtV13';
// M413-B：知情同意管理（细节）V13 GET /api/v1/informed-consent-detail（detail 避让旧版 informedConsentStatsV13）
import { informedConsentDetailV13Routes } from './routes/informedConsentDetailV13';
// M413-C：交接班管理（细节）V13 GET /api/v1/handover-detail（detail 避让旧版 handoverMgmtV13）
import { handoverDetailV13Routes } from './routes/handoverDetailV13';
// M413-D：不良事件管理（细节）V13 GET /api/v1/adverse-event-detail（M413 收官，detail 避让旧版 adverseEventReportV13）
import { adverseEventDetailV13Routes } from './routes/adverseEventDetailV13';
// M414-A：输血管理 V13 GET /api/v1/blood-transfusion-mgmt
import { bloodTransfusionMgmtV13Routes } from './routes/bloodTransfusionMgmtV13';
// M414-B：临床路径管理（细节）V13 GET /api/v1/clinical-pathway-detail（detail 避让旧版 clinicalPathwayMgmtV13）
import { clinicalPathwayDetailV13Routes } from './routes/clinicalPathwayDetailV13';
// M414-C：抗菌药物管理（细节）V13 GET /api/v1/antibiotic-mgmt-detail（detail 避让旧版 antibioticUseDensityV13）
import { antibioticMgmtDetailV13Routes } from './routes/antibioticMgmtDetailV13';
// M414-D：VTE 预防管理 V13 GET /api/v1/vte-prevention-mgmt（M414 收官）
import { vtePreventionMgmtV13Routes } from './routes/vtePreventionMgmtV13';
// M415-A：抢救管理 V13 GET /api/v1/rescue-mgmt
import { rescueMgmtV13Routes } from './routes/rescueMgmtV13';
// M415-B：医学影像管理（细节）V13 GET /api/v1/medical-imaging-detail（detail 避让旧版 imagingTurnaroundV13）
import { medicalImagingDetailV13Routes } from './routes/medicalImagingDetailV13';
// M415-C：病理管理 V13 GET /api/v1/pathology-mgmt
import { pathologyMgmtV13Routes } from './routes/pathologyMgmtV13';
// M415-D：营养管理 V13 GET /api/v1/nutrition-mgmt（M415 收官）
import { nutritionMgmtV13Routes } from './routes/nutritionMgmtV13';
// M416-A：ICU 管理 V13 GET /api/v1/icu-mgmt
import { icuMgmtV13Routes } from './routes/icuMgmtV13';
// M416-B：急诊管理 V13 GET /api/v1/er-mgmt
import { erMgmtV13Routes } from './routes/erMgmtV13';
// M416-C：门诊管理（细节）V13 GET /api/v1/outpatient-mgmt-detail（detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
import { outpatientMgmtDetailV13Routes } from './routes/outpatientMgmtDetailV13';
// M416-D：住院管理（细节）V13 GET /api/v1/inpatient-mgmt-detail（M416 收官，detail 避让旧版 inpatientBedMgmtV13）
import { inpatientMgmtDetailV13Routes } from './routes/inpatientMgmtDetailV13';
// M417-A：血液透析管理 V13 GET /api/v1/dialysis-mgmt
import { dialysisMgmtV13Routes } from './routes/dialysisMgmtV13';
// M417-B：内镜管理 V13 GET /api/v1/endoscopy-mgmt
import { endoscopyMgmtV13Routes } from './routes/endoscopyMgmtV13';
// M417-C：手术室管理 V13 GET /api/v1/operation-room-mgmt
import { operationRoomMgmtV13Routes } from './routes/operationRoomMgmtV13';
// M417-D：病房管理（细节）V13 GET /api/v1/ward-mgmt-detail（M417 收官，detail 避让旧版 inpatientBedMgmtV13）
import { wardMgmtDetailV13Routes } from './routes/wardMgmtDetailV13';
// M418-A：药事管理（细节）V13 GET /api/v1/pharmacy-mgmt-detail（detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
import { pharmacyMgmtDetailV13Routes } from './routes/pharmacyMgmtDetailV13';
// M418-B：医疗设备管理（细节）V13 GET /api/v1/medical-equipment-mgmt-detail（detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
import { medicalEquipmentMgmtDetailV13Routes } from './routes/medicalEquipmentMgmtDetailV13';
// M418-C：院感控制（细节）V13 GET /api/v1/infection-control-detail（detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
import { infectionControlDetailV13Routes } from './routes/infectionControlDetailV13';
// M418-D：患者安全管理 V13 GET /api/v1/patient-safety-mgmt（M418 收官）
import { patientSafetyMgmtV13Routes } from './routes/patientSafetyMgmtV13';
// M419-A：病案管理（细节）V13 GET /api/v1/medical-record-detail（detail 避让旧版 medicalRecordMgmtV13）
import { medicalRecordDetailV13Routes } from './routes/medicalRecordDetailV13';
// M419-B：信息安全管理 V13 GET /api/v1/information-security-mgmt
import { informationSecurityMgmtV13Routes } from './routes/informationSecurityMgmtV13';
// M419-C：培训管理（细节）V13 GET /api/v1/training-mgmt-detail（detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
import { trainingMgmtDetailV13Routes } from './routes/trainingMgmtDetailV13';
// M419-D：质控管理 V13 GET /api/v1/quality-control-mgmt（M419 收官）
import { qualityControlMgmtV13Routes } from './routes/qualityControlMgmtV13';
// M420-A：病案归档管理 V13 GET /api/v1/medical-record-archive-mgmt（archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
import { medicalRecordArchiveMgmtV13Routes } from './routes/medicalRecordArchiveMgmtV13';
// M420-B：健康教育管理 V13 GET /api/v1/health-education-mgmt
import { healthEducationMgmtV13Routes } from './routes/healthEducationMgmtV13';
// M420-C：医学伦理管理 V13 GET /api/v1/medical-ethics-mgmt
import { medicalEthicsMgmtV13Routes } from './routes/medicalEthicsMgmtV13';
// M420-D：医务社工管理 V13 GET /api/v1/medical-social-work-mgmt（M420 收官）
import { medicalSocialWorkMgmtV13Routes } from './routes/medicalSocialWorkMgmtV13';
// M421-A：院感监测（细节）V13 GET /api/v1/infection-surveillance-detail（detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
import { infectionSurveillanceDetailV13Routes } from './routes/infectionSurveillanceDetailV13';
// M421-B：抗菌药物使用管理 V13 GET /api/v1/antibiotic-usage-mgmt（换名避让旧版 antiInfectionDetailV13）
import { antibioticUsageMgmtV13Routes } from './routes/antibioticUsageMgmtV13';
// M421-C：输血管理（细节）V13 GET /api/v1/blood-transfusion-detail（detail 避让旧版 bloodTransfusionMgmtV13）
import { bloodTransfusionDetailV13Routes } from './routes/bloodTransfusionDetailV13';
// M421-D：临床路径管理 V13 GET /api/v1/clinical-pathway-mgmt（M421 收官，换名避让旧版 clinicalPathwayDetailV13）
import { clinicalPathwayMgmtV13Routes } from './routes/clinicalPathwayMgmtV13';
// M422-A：VTE 预防管理（细节）V13 GET /api/v1/vte-prevention-detail（detail 避让旧版 vtePreventionMgmtV13）
import { vtePreventionDetailV13Routes } from './routes/vtePreventionDetailV13';
// M422-B：压疮管理（细节）V13 GET /api/v1/pressure-ulcer-detail（detail 避让旧版 pressureUlcerMgmtV13（M394-B））
import { pressureUlcerDetailV13Routes } from './routes/pressureUlcerDetailV13';
// M422-C：跌倒管理 V13 GET /api/v1/fall-mgmt
import { fallMgmtV13Routes } from './routes/fallMgmtV13';
// M422-D：身体约束管理 V13 GET /api/v1/restraint-mgmt（M422 收官）
import { restraintMgmtV13Routes } from './routes/restraintMgmtV13';
// M423-A：手卫生督查 V13 GET /api/v1/hand-hygiene-audit（换名避让旧版 handHygieneComplianceV13（M418））
import { handHygieneAuditV13Routes } from './routes/handHygieneAuditV13';
// M423-B：隔离管理（细节）V13 GET /api/v1/isolation-detail（detail 避让旧版 isolationMgmtV13（M393-B））
import { isolationDetailV13Routes } from './routes/isolationDetailV13';
// M423-C：消毒灭菌管理 V13 GET /api/v1/sterilization-mgmt
import { sterilizationMgmtV13Routes } from './routes/sterilizationMgmtV13';
// M423-D：医废追溯管理 V13 GET /api/v1/medical-waste-tracking（M423 收官，换名避让旧版 infectionControlDetailV13（M418））
import { medicalWasteTrackingV13Routes } from './routes/medicalWasteTrackingV13';
// M424-A：用药错误上报 V13 GET /api/v1/medication-error-report（换名避让旧版 patientSafetyMgmtV13（M418））
import { medicationErrorReportV13Routes } from './routes/medicationErrorReportV13';
// M424-B：高危药品管理 V13 GET /api/v1/high-alert-med-mgmt
import { highAlertMedMgmtV13Routes } from './routes/highAlertMedMgmtV13';
// M424-C：输液管理（细节）V13 GET /api/v1/infusion-detail（detail 避让旧版 infusionMgmtV13（M359-D））
import { infusionDetailV13Routes } from './routes/infusionDetailV13';
// M424-D：血糖管理 V13 GET /api/v1/blood-glucose-mgmt（M424 收官）
import { bloodGlucoseMgmtV13Routes } from './routes/bloodGlucoseMgmtV13';
// M425-A：危急值管理（细节）V13 GET /api/v1/critical-value-detail（detail 避让旧版 criticalValueMgmtV13（M411））
import { criticalValueDetailV13Routes } from './routes/criticalValueDetailV13';
// M425-B：交接班沟通管理 V13 GET /api/v1/handover-communication-mgmt（换名避让旧版 handoverDetailV13（M413））
import { handoverCommunicationMgmtV13Routes } from './routes/handoverCommunicationMgmtV13';
// M425-C：知情同意管理 V13 GET /api/v1/consent-mgmt（换名避让旧版 consentDetailV13（M413））
import { consentMgmtV13Routes } from './routes/consentMgmtV13';
// M425-D：隐私保护管理 V13 GET /api/v1/privacy-mgmt（M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
import { privacyMgmtV13Routes } from './routes/privacyMgmtV13';
// M426-A：抢救记录管理 V13 GET /api/v1/rescue-record-mgmt（换名避让旧版 rescueMgmtV13（M415））
import { rescueRecordMgmtV13Routes } from './routes/rescueRecordMgmtV13';
// M426-B：麻醉记录管理 V13 GET /api/v1/anesthesia-record-mgmt（换名避让旧版 anesthesiaComplicationV13（M339））
import { anesthesiaRecordMgmtV13Routes } from './routes/anesthesiaRecordMgmtV13';
// M426-C：安全核查管理 V13 GET /api/v1/safety-check-mgmt（换名避让旧版 surgeryVolumeV13（M339））
import { safetyCheckMgmtV13Routes } from './routes/safetyCheckMgmtV13';
// M426-D：病房环境管理 V13 GET /api/v1/ward-environment-mgmt（M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
import { wardEnvironmentMgmtV13Routes } from './routes/wardEnvironmentMgmtV13';
// M427-A：出院小结管理（细节）V13 GET /api/v1/discharge-summary-detail（detail 避让旧版 dischargeSummaryMgmtV13（M411））
import { dischargeSummaryDetailV13Routes } from './routes/dischargeSummaryDetailV13';
// M427-B：转科管理（细节）V13 GET /api/v1/transfer-detail（detail 避让旧版 transferMgmtV13（M411））
import { transferDetailV13Routes } from './routes/transferDetailV13';
// M427-C：再入院分析管理 V13 GET /api/v1/readmission-analysis-mgmt（换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
import { readmissionAnalysisMgmtV13Routes } from './routes/readmissionAnalysisMgmtV13';
// M427-D：死亡病例管理（细节）V13 GET /api/v1/death-case-detail（M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
import { deathCaseDetailV13Routes } from './routes/deathCaseDetailV13';
// M428-A：新生儿护理管理 V13 GET /api/v1/neonatal-care-mgmt（换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
import { neonatalCareMgmtV13Routes } from './routes/neonatalCareMgmtV13';
// M428-B：孕产妇护理管理 V13 GET /api/v1/maternal-care-mgmt（换名避让旧版 maternalMgmtV13（M412，-care 后缀））
import { maternalCareMgmtV13Routes } from './routes/maternalCareMgmtV13';
// M428-C：急诊护理管理 V13 GET /api/v1/emergency-care-mgmt（换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
import { emergencyCareMgmtV13Routes } from './routes/emergencyCareMgmtV13';
// M428-D：ICU 护理管理 V13 GET /api/v1/icu-care-mgmt（M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
import { icuCareMgmtV13Routes } from './routes/icuCareMgmtV13';
// M429-A：透析质量管理 V13 GET /api/v1/dialysis-quality-mgmt（-quality 后缀避让旧版 dialysisMgmtV13（M417））
import { dialysisQualityMgmtV13Routes } from './routes/dialysisQualityMgmtV13';
// M429-B：内镜质量管理 V13 GET /api/v1/endoscopy-quality-mgmt（-quality 后缀避让旧版 endoscopyMgmtV13（M417））
import { endoscopyQualityMgmtV13Routes } from './routes/endoscopyQualityMgmtV13';
// M429-C：手术室质量管理 V13 GET /api/v1/operating-room-quality-mgmt（-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
import { operatingRoomQualityMgmtV13Routes } from './routes/operatingRoomQualityMgmtV13';
// M429-D：病房质量管理 V13 GET /api/v1/ward-quality-mgmt（M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
import { wardQualityMgmtV13Routes } from './routes/wardQualityMgmtV13';
// M166-B：【绩效与人才】医院人才管理深化 GET /api/v1/admin/talent/inventory（人才画像/梯队/培训/继任，发展人不监控人）
import { talentDeepRoutes } from './routes/talentDeep';
// M172-A：【安全质量与运营】医院应急管理深化 GET /api/v1/admin/emergency/deep（十类预案库/风险评估/演练排期/物资/响应自动化）
import { emergencyDeepRoutes } from './routes/emergencyDeep';
// M172-B：【安全质量与运营】医院质量与安全管理深化 GET /api/v1/admin/quality/deep（国家口径指标/趋势/风险/改进）
import { qualityDeepRoutes } from './routes/qualityDeep';
// M180-A：【质量与体验】医院质量与安全管理深化 GET /api/v1/quality/deep（国考20项/电子病历五级/互联互通四甲/十大安全目标/PDCA·QCC·DMAIC·Lean/三甲评审证据链）
import { qualitySafetyRoutes } from './routes/qualitySafety';
// 【越用越聪明深化】M146-D：推荐策略自学习 POST /optimize + GET /log（单次 ±20%、截断 [0.1,3.0]）
import { selfLearningRoutes } from './routes/selfLearning';
// M147-C：三级公立医院绩效考核（国考）GET /api/v1/admin/kpi（4维20项 · 红黄绿三色）
import { hospitalKpiRoutes } from './routes/hospitalKpi';
// M147-B：患者健康教育（知识图谱与患者教育）GET /api/v1/patient/education + POST /push
import { patientEducationRoutes } from './routes/patientEducation';
import { referralKnowledgeRoutes } from './routes/referralKnowledge';
import { crossDeptKnowledgeRoutes } from './routes/crossDeptKnowledge';
import { federatedKnowledgeRoutes } from './routes/federatedKnowledge';
import { museSearchRoutes } from './routes/museSearch';
import { museAskRoutes } from './routes/museAsk';
import { museRecommendRoutes } from './routes/museRecommend';
import { smokeTestRoutes } from './routes/smokeTest';
// 【测试覆盖率冲刺】M137-D：关键业务流程 E2E 红绿报告（仅 admin，质量门禁）
import { e2eTestRoutes } from './routes/e2eTest';
// 【核心业务深化】M136-C：核心 aggregator 测试覆盖率报告（仅 admin，质量门禁）
import { testCoverageRoutes } from './routes/testCoverage';
// 【测试覆盖率冲刺 80%→90%】M150-A：覆盖率报告 + 缺口识别（仅 admin，90% 门禁）
import { coverageReportRoutes } from './routes/coverageReport';
// 【质量补齐与新场景】M151-A：覆盖率明细 + 函数级缺口定位（仅 admin，90%+ 门禁）
import { coverageDetailRoutes } from './routes/coverageDetail';
// 【质量提升与新场景】M173-A：99% → 99.5%+ 覆盖率缺口/计划/进度闭环（仅 admin）
import { coverageGapRoutes } from './routes/coverageGap';
// 【v5.0启动】M182-B：测试覆盖率缺口修复（输血/医保/药事九大模块，GET /api/v1/admin/test/coverage-fix）
import { coverageFixRoutes } from './routes/coverageFix';
// 【200版本里程碑】M157-A：里程碑总结（仅 admin，GET /api/v1/admin/milestone/summary）
import { milestoneRoutes } from './routes/milestone';
// 【300版本里程碑】M181-A：300 版本预告总结（仅 admin，GET /api/v1/admin/milestone/v2）
import { milestoneV2Routes } from './routes/milestoneV2';
import { errorSanitizerRoutes } from './routes/errorSanitizer'; // M136-A：错误脱敏自检（替代 securityBaselineRoutes，错误项转绿）
// 【安全】M149-B：安全基线报告（七项：写认证/SQL/XSS/PII/错误/token/密码哈希/审计链）
import { securityReportRoutes } from './routes/securityReport';
// 【安全与运营】M163-A：等保三级 安全合规（五大类 15 项控制，仅 admin）
import { securityComplianceRoutes } from './routes/securityCompliance';
// 【安全与运营】M174-A：等保三级复查（整改证据核验 + 漂移检测 + 修复跟踪 + 趋势）
import { securityRecheckRoutes } from './routes/securityRecheck';
import { performanceBenchmarkRoutes } from './routes/performanceBenchmark';
import { museOnboardingRoutes } from './routes/museOnboarding';
import { onboardingRoutes } from './routes/onboarding';
import { museNurseRoutes } from './routes/museNurse';
import { nurseMuseRoutes } from './routes/nurseMuse'; // M169-C：知识图谱与Personal Agent GET /api/v1/nurse/muse/:staffId
import { museHospitalRoutes } from './routes/museHospital';
import { musePharmaRoutes } from './routes/musePharma';
import { museAdminRoutes } from './routes/museAdmin';
import { adminMuseRoutes } from './routes/adminMuse'; // M169-D：【知识图谱与Personal Agent】管理员个人管理智能体 GET /api/v1/admin/muse/:staffId
import { museMonthlyReportRoutes } from './routes/museMonthlyReport';
import { statReportRoutes } from './routes/statReport'; // M177-B：医院统计上报（国家口径，不凑数）POST /api/v1/admin/stat/submit
import { musePatternsRoutes } from './routes/musePatterns';
import { museGrowthRoutes } from './routes/museGrowth';
import { patientMuseRoutes } from './routes/patientMuse';
import { museDeptCurveRoutes } from './routes/museDeptCurve';
// 【知识图谱与Personal Agent】M169-B：Doctor MUSE 医生个人智能体（四维经验沉淀/本人经验推荐/同行聚合对比，不公开他人经验）
import { doctorMuseRoutes } from './routes/doctorMuse';
import { helpCenterRoutes } from './routes/helpCenter';
// 【系统集成】M129-A：统一 API 文档（Swagger UI + OpenAPI3 JSON）
import { apiDocsRoutes } from './routes/apiDocs';
// 【核心业务深化】M130-A：病历质控智能审核（仅 admin，结果为建议、人工确认）
import { adminRecordAuditRoutes } from './routes/adminRecordAudit';
// 【产品化收尾】M132-B：按角色用户操作手册
import { userManualRoutes } from './routes/userManual';
// 【新业务场景】M138-B：电子签名（病历/处方/手术同意书）
import { eSignatureRoutes } from './routes/eSignature';
// 【新业务场景】M138-C：医院内部即时通讯（IM）
import { imRoutes } from './routes/im';
// 【医院运营管理】M139-A：OA 多级审批（请假/报销/采购/用印，三级流转不可跳步）
import { oaApprovalRoutes } from './routes/oaApproval';
// 【医院管理深化】M140-D：党建工会活动留痕（党支部学习/主题党日/工会福利/职工文体/志愿服务）
import { partyUnionRoutes } from './routes/partyUnion';
// 【财务人力行政党建】M178-D：党建与文化深化（四维度 + 反形式主义校验 + 医德考评 + 文化问效）GET /api/v1/party/culture
import { partyCultureRoutes } from './routes/partyCulture';
// 【质量与安全】M141-A：三甲评审准备系统（七大类别核心条款检查清单 + 差距分析）
import { jciReviewRoutes } from './routes/jciReview';
import { patientServiceDeepRoutes } from './routes/patientServiceDeep'; // M156-D：【患者服务深化】一站式服务中心（老人友好）GET /api/v1/patient/service
import { patientExperienceRoutes } from './routes/patientExperience'; // M180-C：【质量与体验】患者体验深化（四大维度度量+痛点识别+改进闭环）GET /api/v1/patient/experience
import { researchDeepRoutes } from './routes/researchDeep'; // M162-C：【科研管理深化】课题/论文/成果转化/经费 GET /api/v1/research/projects + PUT /:id/milestone
import { researchPipelineRoutes } from './routes/researchPipeline'; // M171-A：【科研教学后勤】科研全流程辅助 POST /api/v1/research/full-pipeline（七步/样本量/统计推荐/偏倚识别）
import { roadmapRoutes } from './routes/roadmap'; // M157-D：v4.x 产品路线图（三阶段/优先级/工作量估算）GET /api/v1/admin/roadmap
import { roadmapV5Routes } from './routes/roadmapV5'; // M181-D：v5.0 产品路线图（300版本里程碑/区域协同/全自学习医院）GET /api/v1/admin/roadmap/v5
import { patientJourneyRoutes } from './routes/patientJourney'; // M168-C：【AI深化与智能运营】患者全旅程管理 GET /api/v1/patient/journey/:patientId（八节点时间线/瓶颈/流程优化/满意度预测）
import { patientDeepRoutes } from './routes/patientDeep'; // M172-D：【安全质量与运营】患者服务与体验深化 GET /api/v1/patient/deep（智能导诊/院内导航/智慧门诊/智慧住院，老人也能用）
import { pharmacyDeepRoutes } from './routes/pharmacyDeep'; // M173-C：【质量提升与新场景】医院智能药房深化 GET /api/v1/pharmacy/smart（智能摆药/智能审方/智能库存/智能用药，真减差错）
import { bloodDeepRoutes } from './routes/bloodDeep'; // M176-D：【临床核心深化】医院输血管理深化 GET /api/v1/blood/deep（适应症/前评估/过程监测/后评价，零差错人命关天）
import { antibioticDeepRoutes } from './routes/antibioticDeep'; // M176-B：【临床核心深化】医院抗菌药物管理深化 GET /api/v1/pharmacy/antibiotic/deep（分级/使用率/AUD/送检率/合理性评价，国卫办医发〔2015〕42号口径）
import { infectionDeepRoutes } from './routes/infectionDeep'; // M179-B：【护理院感医保药事】医院院感管理深化 GET /api/v1/infection/deep（手卫生依从率/72h聚集预警/同源性/四类国家指标，WS/T 312·313 口径）
import { pharmacyMgmtRoutes } from './routes/pharmacyMgmt'; // M179-D：【护理院感医保药事】医院药事管理深化 GET /api/v1/pharmacy/mgmt（采购四单/库存FEFO/处方点评/ADR上报/质量隔离，安全无差错）
import { getEnv } from './config/env';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from './types';

// ============================================================================
// 路由表与编译
// ============================================================================

const allRoutes: RouteDef[] = [
  ...healthRoutes,
  ...demoStatusRoutes,
  ...modelInfoRoutes,
  ...museLlmStatusRoutes,
  ...authRoutes,
  ...mfaLoginRoutes,
  ...patientRoutes,
  ...chatRoutes,
  ...medicalRoutes,
  ...dashboardRoutes,
  ...qualityRoutes,
  ...qualityPdcaRoutes, // M155-A：PDCA 持续改进（Plan/Do/Check/Act 闭环）
  ...rectificationRoutes,
  ...operationRoutes,
  ...outpatientRoutes,
  ...inpatientRoutes,
  ...inpatientCareRoutes,
  ...emergencyRoutes,
  ...pharmacyRoutes,
  ...pharmacyAuditLearningRoutes,
  ...medicalQcRoutes,
  ...medicalGraphRoutes, // M131-D 医学知识图谱；M147-A 深化：/api/v1/graph/disease/:id + /differential；M169-A 知识图谱与Personal Agent：GET /api/v1/medical-graph?disease=xxx&depth=2（深度图/相关疾病/药物相互作用/关系遍历）
...timelinessRoutes,
...emrAssessmentRoutes,
...aiNoteDraftRoutes,
...medReviewRoutes,
...diagnosisSuggestionRoutes,
...pathwayRecommendationRoutes,
...losPredictionRoutes,
  ...voiceMedicalRoutes,
  ...voiceRecordRoutes, // M152-B：病历 AI 语音录入与智能补全
  ...aiRecordRoutes, // M144-B：AI 病历自动生成（医生修改后用于模型优化）
  ...frontPageRoutes,
  ...researchRoutes,
  ...researchExportRoutes,
  ...researchAiRoutes, // M156-C【集团与科研】医学科研智能化
  ...researchLitRoutes, // M159-C【集团与科研】科研智能化深化：文献/论文/基金
  ...empiRoutes,
  ...dataWarehouseRoutes,
  ...dataMartRoutes, // M150-C：医院数据中台·数据集市（可刷新）
  ...i18nRoutes, // M151-C：多语言支持框架（GET /api/v1/i18n，中文/英文，可扩展）
  ...i18nDeepRoutes, // M158-A：【多语言深化·v4.x近期】英文界面完善 GET /api/v1/i18n/translations + POST /api/v1/i18n/translate
  ...dataGovernanceRoutes,
  ...dataQualityRoutes, // M159-D：数据质量五维报告
  ...dataMartDeepRoutes, // M164-A：数据资产治理（资产目录/血缘追踪）
  ...cdssDeepRoutes, // M165-A：CDSS 临床决策支持（POST /api/v1/cdss/evaluate，防告警疲劳）
  ...outboxRoutes,
  ...sessionAdminRoutes,
  ...billingRoutes,
  ...billRoutes,
  ...drgRoutes,
  ...exportRoutes,
  ...labInterpretRoutes,
  ...imagingInterpretRoutes,
  ...imagingAiRoutes,
  ...imagingAiDeepRoutes,
  ...criticalRoutes,
  ...criticalValueClosureRoutes,
  ...reconRoutes,
  ...surgeryRoutes,
  ...surgeryScheduleRoutes,
  ...surgeryChecklistRoutes,
  ...transfusionRoutes,
  ...bloodQualityRoutes,
  ...vteRoutes,
  ...amsRoutes,
  ...pathwayRoutes,
  ...pathwayVarianceRoutes,
  ...mobileNursingRoutes,
  ...mobileStaffRoutes,
  ...nursingAdminRoutes,
  ...nursingRiskRoutes,
  ...medAdminRoutes,
  ...tubeCareRoutes,
  ...nursingEventReviewRoutes,
  ...nursingIoRoutes,
  ...nursingNqiRoutes,
  ...nursingRiskPatternRoutes,
  ...nutritionScreeningRoutes,
  ...painAssessmentRoutes,
  ...preopAssessmentRoutes,
  ...pacuRecordRoutes,
  ...postopFollowupRoutes,
  ...icuSedationRoutes,
  ...postpartumRoutes,
  ...erTriageRoutes,
  ...barthelRoutes,
  ...equipmentRoutes,
  ...equipmentDeepRoutes, // M177-C：【病案设备耗材】设备管理深化（台账五段/维保预警/强检证书/折旧净值）
  ...logisticsRoutes,
  ...logisticsDeepRoutes, // M171-C：【科研教学后勤】后勤智能化深化（深度派单/路线优化/需求预测/满意度跟踪）
  ...regionalCoopRoutes, // M143-D：区域医疗协同（互联网医院与远程医疗）
  ...regionalCollabRoutes, // M159-B：集团化扩展·区域医疗协同（跨院转诊/结果互认/号源共享/资源调配）
  ...erGreenRoutes,
  ...chronicRoutes,
  ...patientChronicRoutes,
  ...healthCheckRoutes,
  ...healthCheckReferralRoutes,
  ...healthCheckupRoutes, // M142-A：健康体检管理（通俗版报告 + 异常标红建议）
  ...oncologyRoutes,
  ...chemoReminderRoutes,
  ...psychScreeningRoutes,
  ...nissRoutes,
  ...vteAnticoagRoutes,
  ...orderCdsRoutes,
  ...nurseStationRoutes,
  ...scheduleSlotRoutes,
  ...smartScheduleRoutes, // M152-C：医院智能排班 POST /admin/schedule/optimize + GET /admin/schedule
  ...reportPushRoutes,
  ...patientNotificationRoutes,
  ...patientReminderRoutes,
  ...healthPlanRoutes, // M160-D：个性化健康计划（GET /patient/health-plan/:id + POST track）
  ...patientMobileHomeRoutes,
  ...patientH5Routes,
  ...patientBillingRoutes,
  ...patientProfileRoutes,
  ...rehabTreatmentRoutes,
  ...painClinicRoutes,
...cgaRoutes,
...nutritionConsultRoutes,
...stopbangRoutes,
...dischargePlanRoutes,
...dischargeSummaryRoutes,
...vitalsTrendRoutes,
...medicalArchiveRoutes,
...medicalCopyRoutes,
...admissionNoteRoutes,
...progressNoteRoutes,
...consultRequestRoutes,
...consentFormRoutes,
...eSignRoutes,
...orderRoutes,
...nursingRecordRoutes,
...nurseHandoffRoutes,
...assistantHandoverRoutes,
...surgeryRecordRoutes,
...surgerySafetyLearningRoutes,
...medicalHeaderRoutes,
...medicalQcRoutes,
...timelinessRoutes,
...emrAssessmentRoutes,
...aiNoteDraftRoutes,
...medReviewRoutes,
...diagnosisSuggestionRoutes,
...pathwayRecommendationRoutes,
...losPredictionRoutes,
...followupApptRoutes,
...satisfactionSurveyRoutes,
...satisfactionReminderRoutes,
...mdtRoutes,
...mdtTreatmentPlanRoutes,
...piccRoutes,
...cdiRoutes,
...transfusionReactionRoutes,
...bloodClosureSlaRoutes,
...sbarRoutes,
...edObservationRoutes,
...infectionDashboardRoutes,
...amDashboardRoutes,
...doctorWorkbenchRoutes,
...patientPortalRoutes,
...patientLabExplainRoutes,
...surgicalChecklistRoutes,
...alertsRoutes,
// 【监控告警自动化】M136-D：运维监控告警中心 GET /api/v1/admin/alerts（仅 admin）
...adminAlertsRoutes,
  ...renewalRoutes,
  ...drgBudgetRoutes,
  ...inpatientCostMonitorRoutes,
  ...costAttributionRoutes,
  ...financeRoutes, // M139-D：医院财务管理（医院运营管理）
  ...financeDeepRoutes, // M178-A：【财务人力行政党建】医院财务管理深化 GET /api/v1/finance/deep（预算超支预警/科室成本/收入结构/本量利CVP/趋势外推）
  ...teachingRoutes, // M140-C：教学管理（医院管理深化：规培/实习/讲座/三基）
  ...disputeRoutes, // M141-C：医疗纠纷管理（质量与安全：登记→调查中→协商中→已解决/已诉讼）
  ...patientServiceRoutes, // M142-C：患者服务中心（预防保健与患者服务：诉求受理→分派→处理→满意度回访，48h 超时自动升级）
  ...vaccinationRoutes, // M142-B：预防接种（预防保健与患者服务：排程→接种→提前7天提醒，五类疫苗）
  ...onlineConsultRoutes, // M143-A：互联网医院在线问诊（互联网医院与远程医疗：待接单→咨询中→已结束/已取消，接单后30分钟超时自动关单）
  ...remoteConsultRoutes, // M143-B：远程会诊（互联网医院与远程医疗：MDT/院间/国际，急会诊2h未接受自动升级）
  ...improvementTaskRoutes,
  ...improvementOutcomeRoutes,
  ...dipRoutes,
  ...paymentSelectionRoutes,
  ...settlementReportRoutes,
  ...settlementAnalyticsRoutes,
  ...settlementDrilldownRoutes,
  ...lisRoutes,
  ...risRoutes,
  ...apptRoutes,
  ...internetHospitalRoutes, // M163-D/M173-D：互联网医院深化（处方流转 POST /prescription/route + 配送追踪 GET /delivery/track/:id + GET /api/v1/internet/deep 合规深化四件套）
  ...consultationRoutes,
  ...internetPrescriptionRoutes,
  ...internetPaymentRoutes,
  ...internetDeliveryRoutes,
  ...satisfactionRoutes,
  ...satisfactionAiRoutes, // M153-D：满意度智能分析报告（临床决策支持）
  ...satisfactionLoopRoutes, // M165-C：【CDSS与运营精细化】满意度改进闭环（收集→分析→改进→验证）
  ...satisfactionDeepRoutes, // M174-D：【患者体验深化】满意度闭环（多渠道/情感/5Why/PDCA/NPS）
  ...smartTriageRoutes, // M164-C：【患者服务深化】智能导诊 GET /api/v1/patient/smart-triage + GET /api/v1/patient/health-journey/:patientId（红旗症状硬编码直急诊）
  ...delegationRoutes,
  ...referralRoutes,
  ...knowledgeBaseRoutes,
  ...emrTemplateRoutes,
  ...agentBuilderRoutes,
  ...agentRuntimeRoutes,
  ...systemHealthRoutes,
  ...systemRoutes,
  ...notifyConfigRoutes,
  ...permissionAdminRoutes,
  ...skillRoutes,
  ...tenantAdminRoutes,
  ...superAdminHospitalsRoutes,
  ...userAdminRoutes,
  ...roleAdminRoutes,
  ...auditLogRoutes,
  ...loginLogRoutes,
  ...maskConfigAdminRoutes,
  ...privacyDeepAdminRoutes, // M155-B：GET /api/v1/admin/privacy/compliance（隐私深度脱敏 + 合规自检）
  ...adminPerformanceRoutes,
  ...systemMetricsRoutes, // M145-C：系统监控指标 GET /api/v1/admin/metrics（超阈值自动告警）
  ...adminPerformanceOptimizationsRoutes,
  ...perfOptimizeRoutes, // M151-D：慢查询优化闭环 GET /api/v1/admin/performance/optimize；M171-D（科研教学后勤）：深度性能优化 GET /api/v1/admin/performance/deep-optimize
  ...perfOptV2Routes, // M180-D：性能优化 V2（索引/缓存/前端/服务器 + 基准对比 + 退化检测 + SLO）GET /api/v1/admin/performance/v2
  ...perfDeepRoutes, // M165-D：性能深度审计（五维 + 索引建议 + 熔断器 + 健康检查）GET /api/v1/admin/performance/deep-audit
  ...opsMonitorRoutes, // M168-D：系统运维智能化 GET /api/v1/admin/ops/monitoring（监控/异常检测/智能告警/自动修复闭环）
  ...frontendPerformanceRoutes, // M145-B：GET /api/v1/admin/performance/frontend
  ...firstLoadRoutes, // M158-C：GET /api/v1/admin/performance/firstload（首屏懒加载 + 缓存策略 + FCP/LCP 测量）
  ...uiConsistencyRoutes, // M150-D：GET /api/v1/admin/ui/consistency（UI 一致性 + 无障碍）
  ...accessibilityVerifyRoutes, // M151-B：GET /api/v1/admin/ui/accessibility/verify（对比度修复 + WCAG AA 复验）
  ...securityScanRoutes, // M166-D：GET /api/v1/admin/security/scan（渗透测试 + 漏洞分级 + 修复建议）
  ...authFixRoutes, // M167-B：GET /api/v1/admin/security/auth-verify（CSRF 修复 + 认证守卫复验）
  ...securityFixRoutes, // M167-A：GET /api/v1/admin/security/verify（SQL注入参数化 + XSS转义修复复验）
  ...logSecurityRoutes, // M167-C：GET /api/v1/admin/security/log-verify（日志 PII 真检 + 脱敏证据 + 修复对照）
  ...qualityGateRoutes, // M157-C：GET /api/v1/admin/quality-gate（200版本六项质量门禁复查）
  ...qualityGateV2Routes, // M181-C：GET /api/v1/admin/quality-gate/v2（300版本八项质量门禁复查 V2）
  ...queryOptimizationRoutes,
  ...dbPerformanceRoutes, // M145-A：GET /api/v1/admin/performance/slow-queries（核心表慢查询 + 索引建议）
  ...codeQualityRoutes, // M150-B：GET /api/v1/admin/code/quality（五维治理报告）；M167-D：GET /api/v1/admin/quality/code（覆盖率冲刺 + any/ts-ignore/console.log 清零）
  ...codeQualityDeepRoutes, // M173-B：【质量提升与新场景】GET /api/v1/admin/code/deep-quality（圈复杂度拆分/重复块/命名/JSDoc/死代码 深度扫描）
  ...adminDeptPerformanceRoutes,
  ...operationAnalysisRoutes, // M163-B：GET /api/v1/admin/operation/analysis（运营四维分析 + 成本效益 + 对标 + 问题识别）
  ...performanceReviewRoutes, // M140-A：/api/v1/admin/performance/:period
  ...adminHealthRoutes,
  ...adminDashboardRoutes,
  ...adminQualityMonitorRoutes,
  ...adminInfectionAlertsRoutes,
  ...infectionControlRoutes, // M141-D：GET /admin/infection/events + POST /admin/infection/report
  ...infectionRealtimeRoutes, // M153-C：GET /api/v1/admin/infection/realtime 实时监测大屏
  ...aiBrainRoutes, // M156-B：GET /api/v1/ai-brain/realtime AI 医院大脑实时大屏
  ...brainDeepRoutes, // M159-A：GET /api/v1/ai-brain/deep AI 大脑深化（智能预警/决策建议/7天趋势/根因分析）
  ...deepAIAlertRoutes, // M175-B：GET /api/v1/ai-brain/deep-alert AI 深度智能预警（四类12阈值/证据链/优先级/可落地处置/闭环）
  ...aiDecisionRoutes, // M164-B：POST /api/v1/ai-brain/decision 智能决策支持（候选方案/四维排序/ROI 评估/效果闭环）
  ...aiBrainV2OutpatientRoutes, // M182-C：GET /api/v1/ai-brain/v2/outpatient AI 大脑 2.0 门诊试点（门诊量/医生负荷/高峰预测/优化建议/等待预警）
  ...systemMapRoutes, // M157-B：【200版本里程碑】GET /api/v1/admin/system-map 系统功能全景图
  ...systemMapV2Routes, // M181-B：【300版本里程碑】GET /api/v1/admin/system-map/v2 系统功能全景图 V2（十大领域全覆盖）
  ...adminMigrationsRoutes,
  ...adminTrendsRoutes,
  ...adminIntelligenceScoreRoutes,
  ...autoLearnRoutes, // M160-A：GET /api/v1/admin/auto-learn/report 全自学习闭环周度报告
  ...autoLearnDeepRoutes, // M170-A：GET /api/v1/admin/auto-learn/deep 四维度深度自学习进化报告（诊断/用药/护理/管理）
  ...resourceOptimizeRoutes, // M161-D：POST /api/v1/admin/resource/optimize 资源智能调配（床位/手术室/人员，公平轮班）
  ...mobileQuickActionsRoutes,
  ...todosRoutes,
  ...imagingRoutes,
  ...medmuseRoutes,
  ...agentHealthRoutes,
  ...medmuseRoundReportRoutes,
  ...medmuseStreamRoutes,
  ...museLessonRoutes,
  ...multimodalityRoutes,
  ...aiNoteQcRoutes,
  ...aiNursingPlanRoutes,
  ...terminalQcRoutes,
  ...aiQualityRoutes,
  ...deptCockpitRoutes,
  ...drugReviewRoutes,
  ...aiDrugReviewRoutes, // M144-C
  ...medicalQaRoutes, // M154-D
  ...drugInventoryRoutes,
  ...drugLifecycleRoutes, // M153-B：药品全生命周期
  ...supplyRoutes,
  ...prescriptionReviewRoutes,
  ...assistantPharmacyRoutes,
  ...assistantDeepReviewRoutes,
  ...assistantLabRoutes,
  ...assistantDiagnosisRoutes,
  ...aiDiagnoseRoutes, // M144-A：AI 辅助诊断增强
  ...treatmentPlanRoutes, // M161-C：AI 治疗方案推荐·个体化用药
  ...deepDiagnoseRoutes, // M154-A：AI 辅助诊断深化（Top5/鉴别/检验影像）
  ...diseaseExpandRoutes, // M163-C：更多病种与更准诊断（16新病种库/反馈再校准/鉴别增补/检查推荐）
  ...diagnoseV2Routes, // M174-C：AI 诊断深化 V2（神经/泌尿/血液/风湿免疫 16 病种/鉴别深化/治疗方案推荐）
  ...diagnoseDeepRoutes, // M168-A：AI 诊断深化 v2（17 病种/鉴别深化/治疗方案/一致性核查）
  ...guideDxRoutes, // M160-C：临床指南对齐（四部权威指南硬阈值）
  ...assistantRecordDraftRoutes,
  ...insuranceAuditRoutes,
  ...adminInsuranceReviewRoutes,
  ...drgAuditRoutes,
  ...drgDeepRoutes, // M176-A：DRG 分组正确性/费用偏差/盈亏/CMI/离群病例深度分析
  ...insuranceDeepRoutes, // M179-C：医保管理深化（政策目录/费用三道防线/结算结构/拒付申诉整改追回）
  ...medicalRecordDeepRoutes, // M177-A：病案 ICD 编码校验/归档时限/首页合格率·编码准确率·缺项率/借阅跟踪
  ...emrLevel5Routes,
  ...emrGrade5Routes,
  ...deptKnowledgeRoutes,
  ...qcRectificationRoutes,
  ...monthlyReportRoutes,
  ...reportExportRoutes,
  ...exportReportRoutes, // M148-D：报表中心 /api/v1/admin/export
  ...bedMapRoutes,
  ...digitalTwinRoutes, // M160-B：数字孪生 2D（科室/病房/手术室/急诊 + 床位四态）
  ...digitalTwinDeepRoutes, // M161-A：数字孪生深化（定时快照轮询模拟实时推送/流程仿真/资源预测）
  ...twinDeepRoutes, // M170-B：数字孪生多建筑与仿真（门诊/住院/医技/急诊 2D 可视化 + 患者流仿真 + 密度预测 + 路线优化）
  ...twin3DRoutes, // M175-C：3D 数字孪生（三维挤出建模/床位四色/脱敏患者三维位置/等距投影渲染）
  ...twin3DInpatientRoutes, // v5.0启动 M182-D：3D 住院试点（病房/护士站/治疗室/配药室 + 床位四态 + 护士站负荷 + 入院到出院流仿真）
  ...anesthesiaDeepRoutes, // M176-C：手术麻醉管理深化（术前 ASA/心肺风险 + 术中体征/BIS/出血告警 + 术后 PACU/疼痛 + 麻醉质量四级评价）
  ...consumableSpdRoutes, // M177-D：SPD 耗材物流（采购/三级库位/扫码消耗计费/PPV 结算 + 高值耗材一物一码追溯不漏）
  ...teachingOnlineRoutes, // M171-B：在线学习与考核（视频课程录播/直播/回放 + 自动出题 + 服务端阅卷 + 学习路径 + 学分自动认定）
  ...teachingDeepRoutes, // M162-B：教学与培训深化（在线课程/OSCE客观结构化考核/规培轮转出科/继教学分自动记录）
  ...hrDeepRoutes, // M178-B：人力资源深化阳光驾驶舱（编制公开+招聘≥3评委去两端取均+培训学分认规则+绩效KPI公式列化可复算）
  ...nursingDeepRoutes, // M179-A：护理管理深化（床护比公开+加班调休关怀+不良事件根因分析+三基三严培训+护理论文专利品管圈，真关心护士不是监控）
  ...ceoDashboardRoutes,
  ...opdWorkstationRoutes,
  ...assistantOutpatientRoutes,
  ...aiFeedbackRoutes,
  ...patientFeedbackRoutes,
  ...adminAuditLogRoutes,
  ...adminBackupRoutes,
  ...adminImportRoutes,
  ...openApiRoutes,
  ...adminApiKeysRoutes,
  ...adminErrorsRoutes,
  ...errorStatsRoutes, // M149-D：错误统计聚合（总量/分级/高频码/高频路径）
  ...adminConfigRoutes,
  ...deployConfigRoutes, // M145-D：部署配置生成（生产化收尾）
  ...wisdomDashboardRoutes, // M146-A：GET /api/v1/admin/wisdom/dashboard（越用越聪明深化）
  ...smartAssetRoutes, // M161-B：GET /api/v1/admin/smart-assets/dashboard（智慧资产量化）
  ...dataAssetRoutes, // M170-D：GET /api/v1/admin/data-asset/inventory（数据资产可治理清单）
  ...groupMultiHospitalRoutes, // M156-A：GET /api/v1/admin/group/dashboard（集团与科研·多院管理）
  ...adminLogsRoutes,
  ...adminWebhooksRoutes,
  ...strategyEvolutionRoutes,
  ...roadmapRoutes, // M157-D：v4.x 路线图 GET /api/v1/admin/roadmap
  ...roadmapV5Routes, // M181-D：v5.0 路线图 GET /api/v1/admin/roadmap/v5
  ...museSystemIntelligenceRoutes,
  ...operationalInsightRoutes,
  ...inpatientInsightRoutes,
  ...assistantInpatientRoutes,
  ...assistantEmergencyRoutes,
  ...assistantSurgeryRoutes,
  ...assistantInsuranceRoutes,
  ...assistantKnowledgeRoutes,
  ...assistantLlmChatRoutes,
  ...patientGuideRoutes,
  ...doctorPreferenceRoutes,
  ...doctorGrowthRoutes,
  ...userSettingsRoutes,
  ...userPrefRoutes, // M158-D：个性化偏好与统一通知 GET/PUT /api/v1/user/preferences
  ...personalGrowthRoutes, // M146-B：个人成长报告 GET /api/v1/user/muse/report
  ...notificationRoutes,
  ...notificationCenterRoutes, // M148-B：统一通知中心 GET /api/v1/notifications + PUT /:id/read
  ...learningDashboardRoutes,
  ...museHomeRoutes,
  ...followupLearningRoutes,
  ...followUpRoutes,
  ...smartFollowupRoutes, // M152-D：患者随访智能化 GET /api/v1/followup/auto-plan/:patientId + POST /send
  ...clinicalPathwayRoutes, // M153-A：临床路径智能推荐 GET /api/v1/clinical-pathway/recommend（CDS，医生可偏离）
  ...weightEvolutionRoutes,
  ...personalAgentAdoptionRoutes, // M183-A：Doctor MUSE 推荐采纳率 GET /api/v1/personal-agent/adoption-stats
  ...learningFlywheelRoutes, // M183-B：学习闭环数据飞轮 GET /api/v1/learning/flywheel
  ...auditLogQueryRoutes, // M183-D：安全审计日志 GET /api/v1/admin/audit-log
  ...nurseScheduleRoutes, // M184-A：护士排班优化 POST /api/v1/scheduling/optimize
  ...smartFollowupV2Routes, // M184-B：智能随访 GET /api/v1/followup/smart
  ...equipmentPredictiveRoutes, // M184-C：设备预测维护 GET /api/v1/equipment/predictive
  ...backupStrategyRoutes, // M184-D：备份容灾 GET /api/v1/admin/backup/strategy
  ...inpatientBrainV2Routes, // M185-A：AI大脑2.0住院 GET /api/v1/ai-brain/v2/inpatient
  ...orTwins3DRoutes, // M185-B：数字孪生3D手术室 GET /api/v1/twin3d/or
  ...nurseMUSEV2Routes, // M185-C：Nurse MUSE V2 GET /api/v1/personal-agent/nurse-muse-v2
  ...pharmaMUSEV2Routes, // M185-D：Pharma MUSE V2 GET /api/v1/personal-agent/pharma-muse-v2
  ...adminMUSEV2Routes, // M186-A：Admin MUSE V2 GET /api/v1/personal-agent/admin-muse-v2
  ...patientMUSEV2Routes, // M186-B：Patient MUSE V2 GET /api/v1/personal-agent/patient-muse-v2
  ...regionalCollaborationRoutes, // M186-C：区域协同 GET /api/v1/regional/collaboration
  ...selfLearningLoopRoutes, // M186-D：自学习闭环 GET /api/v1/learning/self-loop
  ...performanceReportRoutes, // M187-A：性能报告 GET /api/v1/admin/performance/report
  ...securityReportV2Routes, // M187-B：安全报告 V2 GET /api/v1/admin/security/report-v2
  ...emrGrade5V2Routes, // M187-C：EMR 五级评审 V2 GET /api/v1/emr/grade5/assessment-v2
  ...drgAuditV2Routes, // M187-D：DRG 审核 V2 GET /api/v1/drg/audit/report-v2
  ...clinicalPathwayV2Routes, // M188-A：临床路径 V2 GET /api/v1/clinical/pathway/report-v2
  ...rationalDrugUseRoutes, // M188-B：合理用药 GET /api/v1/drug/rational/report
  ...infectionControlV2Routes, // M188-C：院感控制 V2 GET /api/v1/infection/control/report-v2
  ...disputeWarningRoutes, // M188-D：纠纷预警 GET /api/v1/dispute/warning/report
  ...performanceManagementRoutes, // M189-A：绩效管理 GET /api/v1/admin/performance-management/report
  ...costAccountingRoutes, // M189-B：成本核算 GET /api/v1/admin/cost-accounting/report
  ...qualityManagementRoutes, // M189-C：质量管理 GET /api/v1/admin/quality-management/report
  ...operationsAnalyticsRoutes, // M189-D：运营分析 GET /api/v1/admin/operations-analytics/report
  ...labImagingAuditRoutes, // M190-A：检验审核 GET /api/v1/lab-imaging/audit/report
  ...bloodTransfusionRoutes, // M190-B：输血管理 GET /api/v1/blood/transfusion/report
  ...anesthesiaRoutes, // M190-C：麻醉管理 GET /api/v1/anesthesia/report
  ...emergencyReportV2Routes, // M190-D：急诊管理 V2 报表 GET /api/v1/emergency/report
  ...researchManagementRoutes, // M191-A：科研管理 GET /api/v1/admin/research/report
  ...teachingManagementRoutes, // M191-B：教学管理 GET /api/v1/admin/teaching/report
  ...hrManagementRoutes, // M191-C：人力资源管理 GET /api/v1/admin/hr/report
  ...equipmentMaterialRoutes, // M191-D：设备物资管理 GET /api/v1/admin/equipment-material/report
  ...financeBillingRoutes, // M192-A：财务收费管理 GET /api/v1/admin/finance/report
  ...insuranceManagementRoutes, // M192-B：医保管理深化 GET /api/v1/admin/insurance/report
  ...publicHealthRoutes, // M192-C：公共卫生管理 GET /api/v1/admin/public-health/report
  ...logisticsManagementRoutes, // M192-D：后勤管理 GET /api/v1/admin/logistics/report
  ...performanceStressRoutes, // M193-A：性能压测 GET /api/v1/admin/performance/stress-test
  ...securityPenTestRoutes, // M193-B：安全渗透测试 GET /api/v1/admin/security/pen-test
  ...qualitySystemRoutes, // M193-C：质量管理体系 GET /api/v1/admin/quality-system/report
  ...patientSafetyRoutes, // M193-D：患者安全 GET /api/v1/admin/patient-safety/report
  ...partyBuildingRoutes, // M194-A：党建管理 GET /api/v1/admin/party-building/report
  ...disciplineInspectionRoutes, // M194-B：纪检监察 GET /api/v1/admin/discipline/report
  ...laborUnionRoutes, // M194-C：工会管理 GET /api/v1/admin/labor-union/report
  ...publicityRoutes, // M194-D：宣传管理 GET /api/v1/admin/publicity/report
  // internetHospitalRoutes 已在上方注册，避免重复 spread
  ...internetHospitalV2Routes, // M195-A V2：互联网医院深化 GET /api/v1/internet-hospital/report
  ...telemedicineRoutes, // M195-B：远程医疗 GET /api/v1/telemedicine/report
  ...mobileHealthRoutes, // M195-C：移动医疗 GET /api/v1/mobile-health/report
  ...smartHealthcareRoutes, // M195-D：智慧医疗 GET /api/v1/smart-healthcare/report
  ...bigDataPlatformRoutes, // M196-A：大数据平台 GET /api/v1/admin/big-data/report
  ...aiPlatformRoutes, // M196-B：AI 中台 GET /api/v1/admin/ai-platform/report
  ...iotPlatformRoutes, // M196-C：物联网平台 GET /api/v1/admin/iot-platform/report
  ...blockchainRoutes, // M196-D：区块链 GET /api/v1/admin/blockchain/report
  ...cloudNativeRoutes, // M197-A：云原生 GET /api/v1/admin/cloud-native/report
  ...microservicesRoutes, // M197-B：微服务 GET /api/v1/admin/microservices/report
  ...devopsRoutes, // M197-C：DevOps GET /api/v1/admin/devops/report
  ...sreRoutes, // M197-D：SRE GET /api/v1/admin/sre/report
  ...dataSecurityRoutes, // M198-A：数据安全 GET /api/v1/admin/data-security/report
  ...complianceRoutes, // M198-B：合规 GET /api/v1/admin/compliance/report
  ...auditManagementRoutes, // M198-C：审计管理 GET /api/v1/admin/audit/report
  ...riskManagementRoutes, // M198-D：风险管理 GET /api/v1/admin/risk-management/report
  ...userExperienceRoutes, // M199-A：用户体验 GET /api/v1/admin/user-experience/report
  ...accessibilityRoutes, // M199-B：无障碍 GET /api/v1/admin/accessibility/report
  ...elderlyFriendlyRoutes, // M199-C：适老化 GET /api/v1/admin/elderly-friendly/report
  ...internationalizationRoutes, // M199-D：国际化 GET /api/v1/admin/internationalization/report
  ...systemAcceptanceRoutes, // M200-A：系统验收 GET /api/v1/admin/acceptance/report
  ...documentationRoutes, // M200-B：文档 GET /api/v1/admin/documentation/report
  ...deploymentReadinessRoutes, // M200-C：部署准备 GET /api/v1/admin/deployment/readiness
  ...m200ReleaseRoutes, // M200-D：版本发布 GET /api/v1/admin/release/m200
  ...llmIntegrationRoutes, // M201-A：大模型集成 GET /api/v1/admin/llm/report
  ...multiAgentRoutes, // M201-B：多 Agent GET /api/v1/admin/multi-agent/report
  ...specialtyRoutes, // M201-C：专科 GET /api/v1/specialty/report
  ...productionOpsRoutes, // M201-D：生产运维 GET /api/v1/admin/production-ops/report
  ...rehabilitationRoutes, // M202-A：康复专科 GET /api/v1/specialty/rehabilitation/report
  ...psychiatryRoutes, // M202-B：精神心理 GET /api/v1/specialty/psychiatry/report
  ...tcmRoutes, // M202-C：中医 GET /api/v1/specialty/tcm/report
  ...clinicalResearchRoutes, // M202-D：临床试验科研 GET /api/v1/admin/research/report
  ...criticalCareRoutes, // M203-A：ICU GET /api/v1/specialty/icu/report
  ...interventionalRoutes, // M203-B：介入内镜 GET /api/v1/specialty/interventional/report
  ...transplantRoutes, // M203-C：移植透析 GET /api/v1/specialty/transplant/report
  ...aiDiagnosisRoutes, // M203-D：AI 影像病理 GET /api/v1/specialty/ai-diagnosis/report
  ...emergencyReportV3Routes, // M204-A：急诊 V3 GET /api/v1/emergency/report-v3
  ...surgeryReportV3Routes, // M204-B：手术 V3 GET /api/v1/surgery/report-v3
  ...pharmacyReportV3Routes, // M204-C：药房 V3 GET /api/v1/pharmacy/report-v3
  ...labImagingReportV3Routes, // M204-D：检验检查 V3 GET /api/v1/lab-imaging/report-v3
  ...nursingReportV3Routes, // M205-A：护理 V3 GET /api/v1/nursing/report-v3
  ...medicalRecordReportV3Routes, // M205-B：病案 V3 GET /api/v1/medical-record/report-v3
  ...insuranceReportV3Routes, // M205-C：医保 V3 GET /api/v1/insurance/report-v3
  ...accreditationRoutes, // M205-D：等级评审 GET /api/v1/admin/accreditation/report
  ...patientServiceReportV3Routes, // M206-A：患者服务 V3 GET /api/v1/patient-service/report-v3
  ...healthManagementReportV3Routes, // M206-B：健康管理 V3 GET /api/v1/health-management/report-v3
  ...regionalHealthRoutes, // M206-C：区域医联体 GET /api/v1/regional/report
  ...dataAssetReportV3Routes, // M206-D：数据资产 V3 GET /api/v1/data-asset/report-v3
  ...operationsReportV3Routes, // M207-A：运营 V3 GET /api/v1/operations/report-v3
  ...researchReportV3Routes, // M207-B：科研 V3 GET /api/v1/research/report-v3
  ...educationReportV3Routes, // M207-C：教学 V3 GET /api/v1/education/report-v3
  ...logisticsReportV3Routes, // M207-D：后勤 V3 GET /api/v1/logistics/report-v3
  ...aiAssistReportV2Routes, // M208-A：AI 辅助 V2 GET /api/v1/ai-assist/report-v2
  ...smartAlertReportV2Routes, // M208-B：智能预警 V2 GET /api/v1/smart-alert/report-v2
  ...patientProfileReportV2Routes, // M208-C：患者画像 V2 GET /api/v1/patient-profile/report-v2
  ...knowledgeGraphReportV2Routes, // M208-D：知识图谱 V2 GET /api/v1/knowledge-graph/report-v2
  ...patientSafetyReportV2Routes, // M209-A：患者安全 V2 GET /api/v1/patient-safety/report-v2
  ...infectionControlReportV2Routes, // M209-B：院感 V2 GET /api/v1/infection-control/report-v2
  ...medicalRecordQualityReportV2Routes, // M209-C：病历质量 V2 GET /api/v1/mr-quality/report-v2
  ...drugSupplyReportV2Routes, // M209-D：药品供应链 V2 GET /api/v1/drug-supply/report-v2
  ...smartHospitalReportRoutes, // M210-A：智慧医院评价 GET /api/v1/smart-hospital/report
  ...interoperabilityReportRoutes, // M210-B：互联互通 GET /api/v1/interoperability/report
  ...emrRatingReportRoutes, // M210-C：EMR 评级 GET /api/v1/emr-rating/report
  ...hospitalKPIReportRoutes, // M210-D：国考绩效 GET /api/v1/hospital-kpi/report
  ...hrpReportV2Routes, // M211-A：HRP V2 GET /api/v1/hrp/report-v2
  ...financeReportV2Routes, // M211-B：财务 V2 GET /api/v1/finance/report-v2
  ...hrReportV2Routes, // M211-C：人力资源 V2 GET /api/v1/hr/report-v2
  ...performanceReportV2Routes, // M211-D：绩效 V2 GET /api/v1/performance/report-v2
  ...partyAdminReportRoutes, // M212-A：党建行政 GET /api/v1/party-admin/report
  ...medicalAffairsReportV2Routes, // M212-B：医务 V2 GET /api/v1/medical-affairs/report-v2
  ...nursingReportV2Routes, // M212-C：护理 V2 GET /api/v1/nursing/report-v2
  ...pharmacyReportV2Routes, // M212-D：药事 V2 GET /api/v1/pharmacy/report-v2
  ...equipmentReportV2Routes, // M213-A：设备 V2 GET /api/v1/equipment/report-v2
  ...logisticsSafetyReportRoutes, // M213-B：后勤安全 GET /api/v1/logistics-safety/report
  ...informatizationReportRoutes, // M213-C：信息化 GET /api/v1/informatization/report
  ...cultureBrandReportRoutes, // M213-D：文化品牌 GET /api/v1/culture-brand/report
  ...internetHospitalReportV2Routes, // M214-A：互联网医院 V2 GET /api/v1/internet-hospital/report-v2
  ...telemedicineReportV2Routes, // M214-B：远程医疗 V2 GET /api/v1/telemedicine/report-v2
  ...mobileHealthReportV2Routes, // M214-C：移动医疗 V2 GET /api/v1/mobile-health/report-v2
  ...smartPharmacyReportRoutes, // M214-D：智慧药房 GET /api/v1/smart-pharmacy/report
  ...bigDataReportV2Routes, // M215-A：大数据 V2 GET /api/v1/big-data/report-v2
  ...aiPlatformReportV2Routes, // M215-B：AI 中台 V2 GET /api/v1/ai-platform/report-v2
  ...iotReportRoutes, // M215-C：物联网 GET /api/v1/iot/report
  ...blockchainReportRoutes, // M215-D：区块链 GET /api/v1/blockchain/report
  ...cloudNativeReportV2Routes, // M216-A：云原生 V2 GET /api/v1/cloud-native/report-v2
  ...microserviceReportV2Routes, // M216-B：微服务 V2 GET /api/v1/microservice/report-v2
  ...devOpsReportV2Routes, // M216-C：DevOps V2 GET /api/v1/devops/report-v2
  ...sreReportRoutes, // M216-D：SRE GET /api/v1/sre/report
  ...dataSecurityReportV2Routes, // M217-A：数据安全 V2 GET /api/v1/data-security/report-v2
  ...complianceReportRoutes, // M217-B：合规管理 GET /api/v1/compliance/report
  ...auditReportRoutes, // M217-C：审计管理 GET /api/v1/audit/report
  ...riskReportRoutes, // M217-D：风险管理 GET /api/v1/risk/report
  ...patientExperienceReportV2Routes, // M218-A：患者体验 V2 GET /api/v1/patient-experience/report-v2
  ...employeeExperienceReportV2Routes, // M218-B：员工体验 V2 GET /api/v1/employee-experience/report-v2
  ...processOptimizationReportRoutes, // M218-C：流程优化 GET /api/v1/process-optimization/report
  ...smartServiceRatingReportRoutes, // M218-D：智慧服务评级 GET /api/v1/smart-service/report
  ...disciplineReportV2Routes, // M219-A：学科建设 V2 GET /api/v1/discipline/report-v2
  ...talentReportV2Routes, // M219-B：人才队伍 V2 GET /api/v1/talent/report-v2
  ...researchReportV2Routes, // M219-C：科研创新 V2 GET /api/v1/research/report-v2
  ...teachingReportV2Routes, // M219-D：教学培训 V2 GET /api/v1/teaching/report-v2
  ...logisticsReportV2Routes, // M220-A：后勤基建 V2 GET /api/v1/logistics/report-v2
  ...environmentReportRoutes, // M220-B：环境保护 GET /api/v1/environment/report
  ...nutritionReportRoutes, // M220-C：营养膳食 GET /api/v1/nutrition/report
  ...hospiceReportRoutes, // M220-D：安宁疗护 GET /api/v1/hospice/report
  ...infectiousDiseaseReportV2Routes, // M221-A：传染病防控 V2 GET /api/v1/infectious-disease/report-v2
  ...maternalChildReportV2Routes, // M221-B：妇幼健康 V2 GET /api/v1/maternal-child/report-v2
  ...geriatricsReportV2Routes, // M221-C：老年健康 V2 GET /api/v1/geriatrics/report-v2
  ...occupationalHealthReportRoutes, // M221-D：职业病防治 GET /api/v1/occupational-health/report
  ...rehabilitationReportV2Routes, // M222-A：康复医学 V2 GET /api/v1/rehabilitation/report-v2
  ...healthManagementReportV2Routes, // M222-B：健康管理 V2 GET /api/v1/health-management/report-v2
  ...emergencyDeepeningV2Routes, // M222-C：急救体系 V2 GET /api/v1/emergency/report-v2
  ...painReportRoutes, // M222-D：疼痛管理 GET /api/v1/pain/report
  ...laboratoryReportV2Routes, // M223-A：检验中心 V2 GET /api/v1/laboratory/report-v2
  ...imagingReportV2Routes, // M223-B：影像中心 V2 GET /api/v1/imaging/report-v2
  ...pathologyReportV2Routes, // M223-C：病理中心 V2 GET /api/v1/pathology/report-v2
  ...functionalReportRoutes, // M223-D：功能检查中心 GET /api/v1/functional/report
  ...surgeryReportV2Routes, // M224-A：手术中心 V2 GET /api/v1/surgery/report-v2
  ...anesthesiaReportV2Routes, // M224-B：麻醉中心 V2 GET /api/v1/anesthesia/report-v2
  ...transfusionReportRoutes, // M224-C：输血管理 GET /api/v1/transfusion/report
  ...icuReportV2Routes, // M224-D：重症医学 V2 GET /api/v1/icu/report-v2
  ...outpatientReportV2Routes, // M225-A：门诊管理 V2 GET /api/v1/outpatient/report-v2
  ...inpatientReportV2Routes, // M225-B：住院管理 V2 GET /api/v1/inpatient/report-v2
  ...emergencyMgmtReportV2Routes, // M225-C：急诊管理 V2 GET /api/v1/emergency/report-v2
  ...medRecordMgmtReportV2Routes, // M225-D：病案管理 V2 GET /api/v1/medical-record/report-v2
  ...insuranceMgmtReportV2Routes, // M226-A：医保管理 V2 GET /api/v1/insurance/report-v2
  ...pricingReportV2Routes, // M226-B：物价收费 V2 GET /api/v1/pricing/report-v2
  ...financeMgmtReportV2Routes, // M226-C：财务核算 V2 GET /api/v1/finance/report-v2
  ...performanceMgmtReportV2Routes, // M226-D：绩效管理 V2 GET /api/v1/performance/report-v2
  ...informatizationPlanReportV2Routes, // M227-A：信息化规划 V2 GET /api/v1/informatization/report-v2
  ...dataGovernanceReportV2Routes, // M227-B：数据治理 V2 GET /api/v1/data-governance/report-v2
  ...cybersecurityReportV2Routes, // M227-C：网络安全 V2 GET /api/v1/cybersecurity/report-v2
  ...opsReportV2Routes, // M227-D：运维管理 V2 GET /api/v1/ops/report-v2
  ...partyBuildingReportV2Routes, // M228-A：党建 V2 GET /api/v1/party-building/report-v2
  ...cultureBrandReportV2Routes, // M228-B：文化品牌 V2 GET /api/v1/culture-brand/report-v2
  ...administrationReportV2Routes, // M228-C：行政办公 V2 GET /api/v1/administration/report-v2
  ...unionReportV2Routes, // M228-D：工会群团 V2 GET /api/v1/union/report-v2
  ...emergencyResponseV2Routes, // M229-A：应急管理 V2 GET /api/v1/emergency-mgmt/report-v2
  ...fireSecurityReportV2Routes, // M229-B：消防安保 V2 GET /api/v1/fire-security/report-v2
  ...specialEquipHazmatReportRoutes, // M229-C：特种设备与危化品 GET /api/v1/special-equip-hazmat/report
  ...infectionControlReportV3Routes, // M229-D：院感控制 V3 GET /api/v1/infection-control/report-v3
  ...highQualityDevelopmentReportV2Routes, // M230-A：高质量发展 V2 GET /api/v1/high-quality-development/report-v2
  ...accreditationReportV3Routes, // M230-B：等级评审 V3 GET /api/v1/accreditation/report-v3
  ...drgDIPReportV2Routes, // M230-C：DRG/DIP V2 GET /api/v1/drg-dip/report-v2
  ...disciplineAssessmentReportV3Routes, // M230-D：学科评估 V3 GET /api/v1/discipline-assessment/report-v3
  ...smartHospitalV3ReportRoutes, // M231-A：智慧医院 V3 GET /api/v1/smart-hospital-v3/report
  ...interopV3ReportRoutes, // M231-B：互联互通 V3 GET /api/v1/interop-v3/report
  ...emrRatingV3ReportRoutes, // M231-C：EMR 评级 V3 GET /api/v1/emr-rating-v3/report
  ...v4MilestoneReportRoutes, // M231-D：v4.0.0 里程碑 GET /api/v1/v4-milestone/report
  ...aiBrainV3ReportRoutes, // M232-A：AI 大脑 V3 GET /api/v1/ai-brain-v3/report
  ...personalAgentV3ReportRoutes, // M232-B：Personal Agent V3 GET /api/v1/personal-agent-v3/report
  ...digitalTwinReportRoutes, // M232-C：数字孪生 GET /api/v1/digital-twin/report
  ...regionalBrainReportRoutes, // M232-D：区域健康大脑 GET /api/v1/regional-brain/report
  ...patientServiceIntelligentV2Routes, // M233-A：患者服务智能化 V2 GET /api/v1/patient-service-ai-v2/report
  ...clinicalResearchIntelligentV2Routes, // M233-B：临床科研智能化 V2 GET /api/v1/clinical-research-ai-v2/report
  ...operationsIntelligentV2Routes, // M233-C：运营决策智能化 V2 GET /api/v1/operations-ai-v2/report
  ...qualitySafetyIntelligentV2Routes, // M233-D：质量安全智能化 V2 GET /api/v1/quality-safety-ai-v2/report
  ...internetHospitalV3ReportRoutes, // M234-A：互联网医院 V3 GET /api/v1/internet-hospital-v3/report
  ...telemedicineV3ReportRoutes, // M234-B：远程医疗 V3 GET /api/v1/telemedicine-v3/report
  ...mobileHealthV3ReportRoutes, // M234-C：移动医疗 V3 GET /api/v1/mobile-health-v3/report
  ...ecosystemOpenReportRoutes, // M234-D：生态开放 GET /api/v1/ecosystem-open/report
  ...patientExperienceIntelligentV2Routes, // M235-A：患者体验智能化 V2 GET /api/v1/patient-experience-ai-v2/report
  ...clinicianWorkIntelligentV2Routes, // M235-B：医护工作智能化 V2 GET /api/v1/clinician-work-ai-v2/report
  ...dataPlatformIntelligentV2Routes, // M235-C：数据中台智能化 V2 GET /api/v1/data-platform-ai-v2/report
  ...securityOpsIntelligentV2Routes, // M235-D：安全运营智能化 V2 GET /api/v1/security-ops-ai-v2/report
  ...greenHospitalV2ReportRoutes, // M236-A：绿色医院 V2 GET /api/v1/green-hospital/report
  ...supplyChainV2ReportRoutes, // M236-B：供应链 V2 GET /api/v1/supply-chain-v2/report
  ...healthMediaReportRoutes, // M236-C：健康科普 GET /api/v1/health-media/report
  ...internationalHealthV2ReportRoutes, // M236-D：国际医疗 V2 GET /api/v1/international-health-v2/report
  ...aiDrugDiscoveryReportRoutes, // M237-A：AI 药物研发 GET /api/v1/ai-drug/report
  ...bciNeuroRehabReportRoutes, // M237-B：脑机接口与神经康复 GET /api/v1/bci-neuro-rehab/report
  ...genomicPrecisionReportRoutes, // M237-C：基因与精准医疗 GET /api/v1/genomic-precision/report
  ...metaverseHospitalReportRoutes, // M237-D：元宇宙医院 GET /api/v1/metaverse-hospital/report
  ...cdssV3ReportRoutes, // M238-A：CDSS V3 GET /api/v1/cdss-v3/report
  ...imagingAIV3ReportRoutes, // M238-B：影像 AI V3 GET /api/v1/imaging-ai-v3/report
  ...emrIntelligentV3ReportRoutes, // M238-C：病历智能 V3 GET /api/v1/emr-intelligent-v3/report
  ...knowledgeGraphV3ReportRoutes, // M238-D：知识图谱 V3 GET /api/v1/knowledge-graph-v3/report
  ...preventiveMedicineV3ReportRoutes, // M239-A：预防医学 V3 GET /api/v1/preventive-medicine-v3/report
  ...maternalChildLifecycleV3ReportRoutes, // M239-B：妇幼全周期 V3 GET /api/v1/maternal-child-lifecycle-v3/report
  ...geriatricsLifecycleV3ReportRoutes, // M239-C：老年全周期 V3 GET /api/v1/geriatrics-lifecycle-v3/report
  ...occupationalEnvironmentalV3ReportRoutes, // M239-D：职业环境 V3 GET /api/v1/occupational-environmental-v3/report
  ...opsDashboardV3ReportRoutes, // M240-A：运营驾驶舱 V3 GET /api/v1/ops-dashboard-v3/report
  ...costAccountingV3ReportRoutes, // M240-B：成本核算 V3 GET /api/v1/cost-accounting-v3/report
  ...performanceV3ReportRoutes, // M240-C：绩效 V3 GET /api/v1/performance-v3/report
  ...hrpV3ReportRoutes, // M240-D：HRP V3 GET /api/v1/hrp-v3/report
  ...patientSafetyV3ReportRoutes, // M241-A：患者安全 V3 GET /api/v1/patient-safety-v3/report
  ...medicalQualityV3ReportRoutes, // M241-B：医疗质量 V3 GET /api/v1/medical-quality-v3/report
  ...nursingQualityV3ReportRoutes, // M241-C：护理质量 V3 GET /api/v1/nursing-quality-v3/report
  ...patientExperienceV3ReportRoutes, // M241-D：患者体验 V3 GET /api/v1/patient-experience-v3/report
  ...disciplineV3ReportRoutes, // M242-A：学科建设 V3 GET /api/v1/discipline-v3/report
  ...talentV3ReportRoutes, // M242-B：人才队伍 V3 GET /api/v1/talent-v3/report
  ...researchV3ReportRoutes, // M242-C：科研创新 V3 GET /api/v1/research-v3/report
  ...teachingV3ReportRoutes, // M242-D：教学培训 V3 GET /api/v1/teaching-v3/report
  ...logisticsV3ReportRoutes, // M243-A：后勤保障 V3 GET /api/v1/logistics-v3/report
  ...equipmentSupplyV3ReportRoutes, // M243-B：设备耗材 V3 GET /api/v1/equipment-supply-v3/report
  ...securityV3ReportRoutes, // M243-C：安全保卫 V3 GET /api/v1/security-v3/report
  ...emergencyMgmtV3ReportRoutes, // M243-D：应急管理 V3 GET /api/v1/emergency-mgmt-v3/report
  ...informatizationV3ReportRoutes, // M244-A：信息化规划 V3 GET /api/v1/informatization-v3/report
  ...dataGovernanceV3ReportRoutes, // M244-B：数据治理 V3 GET /api/v1/data-governance-v3/report
  ...cybersecurityV3ReportRoutes, // M244-C：网络安全 V3 GET /api/v1/cybersecurity-v3/report
  ...opsV3ReportRoutes, // M244-D：运维管理 V3 GET /api/v1/ops-v3/report
  ...partyBuildingV3ReportRoutes, // M245-A：党建 V3 GET /api/v1/party-building-v3/report
  ...cultureBrandV3ReportRoutes, // M245-B：文化品牌 V3 GET /api/v1/culture-brand-v3/report
  ...administrationV3ReportRoutes, // M245-C：行政办公 V3 GET /api/v1/administration-v3/report
  ...unionV3ReportRoutes, // M245-D：工会群团 V3 GET /api/v1/union-v3/report
  ...greenHospitalV3ReportRoutes, // M246-A：绿色医院 V3 GET /api/v1/green-hospital-v3/report
  ...supplyChainV3ReportRoutes, // M246-B：供应链 V3 GET /api/v1/supply-chain-v3/report
  ...healthMediaV3ReportRoutes, // M246-C：健康科普 V3 GET /api/v1/health-media-v3/report
  ...internationalHealthV3ReportRoutes, // M246-D：国际医疗 V3 GET /api/v1/international-health-v3/report
  ...aiDrugV2ReportRoutes, // M247-A：AI 药物 V2 GET /api/v1/ai-drug-v2/report
  ...bciNeuroRehabV2ReportRoutes, // M247-B：脑机接口 V2 GET /api/v1/bci-neuro-rehab-v2/report
  ...genomicPrecisionV2ReportRoutes, // M247-C：基因精准 V2 GET /api/v1/genomic-precision-v2/report
  ...metaverseHospitalV2ReportRoutes, // M247-D：元宇宙医院 V2 GET /api/v1/metaverse-hospital-v2/report
  ...cdssV4ReportRoutes, // M248-A：CDSS V4 GET /api/v1/cdss-v4/report
  ...imagingAIV4ReportRoutes, // M248-B：影像 AI V4 GET /api/v1/imaging-ai-v4/report
  ...emrIntelligentV4ReportRoutes, // M248-C：病历智能 V4 GET /api/v1/emr-intelligent-v4/report
  ...knowledgeGraphV4ReportRoutes, // M248-D：知识图谱 V4 GET /api/v1/knowledge-graph-v4/report
  ...preventiveMedicineV4ReportRoutes, // M249-A：预防公卫 V4 GET /api/v1/preventive-medicine-v4/report
  ...maternalChildLifecycleV4ReportRoutes, // M249-B：妇幼 V4 GET /api/v1/maternal-child-lifecycle-v4/report
  ...geriatricsLifecycleV4ReportRoutes, // M249-C：老年 V4 GET /api/v1/geriatrics-lifecycle-v4/report
  ...occupationalEnvironmentalV4ReportRoutes, // M249-D：职业环境 V4 GET /api/v1/occupational-environmental-v4/report
  ...opsDashboardV4ReportRoutes, // M250-A：运营驾驶舱 V4 GET /api/v1/ops-dashboard-v4/report
  ...costAccountingV4ReportRoutes, // M250-B：成本核算 V4 GET /api/v1/cost-accounting-v4/report
  ...performanceV4ReportRoutes, // M250-C：绩效 V4 GET /api/v1/performance-v4/report
  ...hrpV4ReportRoutes, // M250-D：HRP V4 GET /api/v1/hrp-v4/report
  ...emergencyV4ReportRoutes, // M251-A：急诊 V4 GET /api/v1/emergency-v4/report
  ...surgeryAnesthesiaV4ReportRoutes, // M251-B：手术麻醉 V4 GET /api/v1/surgery-anesthesia-v4/report
  ...pharmacyV4ReportRoutes, // M251-C：药房 V4 GET /api/v1/pharmacy-v4/report
  ...laboratoryV4ReportRoutes, // M251-D：检验 V4 GET /api/v1/laboratory-v4/report
  ...nursingV4ReportRoutes, // M252-A：护理 V4 GET /api/v1/nursing-v4/report
  ...medicalRecordV4ReportRoutes, // M252-B：病案 V4 GET /api/v1/medical-record-v4/report
  ...insuranceV4ReportRoutes, // M252-C：医保 V4 GET /api/v1/insurance-v4/report
  ...outpatientInpatientV4ReportRoutes, // M252-D：门诊住院 V4 GET /api/v1/outpatient-inpatient-v4/report
  ...patientServiceV4ReportRoutes, // M253-A：患者服务 V4 GET /api/v1/patient-service-v4/report
  ...healthManagementV4ReportRoutes, // M253-B：健康管理 V4 GET /api/v1/health-management-v4/report
  ...regionalMedicalAllianceV4ReportRoutes, // M253-C：区域医联体 V4 GET /api/v1/regional-alliance-v4/report
  ...dataAssetV4ReportRoutes, // M253-D：数据资产 V4 GET /api/v1/data-asset-v4/report
  ...operationsAnalysisV4ReportRoutes, // M254-A：运营分析 V4 GET /api/v1/operations-analysis-v4/report
  ...researchManagementV4ReportRoutes, // M254-B：科研管理 V4 GET /api/v1/research-management-v4/report
  ...teachingTrainingV4ReportRoutes, // M254-C：教学培训 V4 GET /api/v1/teaching-training-v4/report
  ...logisticsEquipmentV4ReportRoutes, // M254-D：后勤设备 V4 GET /api/v1/logistics-equipment-v4/report
  ...aiDiagnosisV3ReportRoutes, // M255-A：AI 辅助诊断 V3 GET /api/v1/ai-diagnosis-v3/report
  ...intelligentAlertV3ReportRoutes, // M255-B：智能预警 V3 GET /api/v1/intelligent-alert-v3/report
  ...patientProfileV3ReportRoutes, // M255-C：患者画像 V3 GET /api/v1/patient-profile-v3/report
  ...clinicalRuleEngineV3ReportRoutes, // M255-D：临床规则引擎 V3 GET /api/v1/clinical-rule-engine-v3/report
  // patientSafetyV3ReportRoutes 已在上方注册，避免重复 spread
  ...infectionControlV3ReportRoutes, // M256-B：院感控制 V3 GET /api/v1/infection-control-v3/report
  ...recordQualityV3ReportRoutes, // M256-C：病历质量 V3 GET /api/v1/record-quality-v3/report（里程碑 v5.00.0）
  ...drugSupplyChainV3ReportRoutes, // M256-D：药品供应链 V3 GET /api/v1/drug-supply-chain-v3/report
  ...hospitalOSV5ReportRoutes, // M257-A：医院 OS 底座 V5 GET /api/v1/hospital-os-v5/report
  ...personalAgentV5ReportRoutes, // M257-B：Personal Agent 2.0 V5 GET /api/v1/personal-agent-v5/report
  ...aiBrainV5ReportRoutes, // M257-C：AI 大脑 3.0 V5 GET /api/v1/ai-brain-v5/report
  ...dataFlywheelV5ReportRoutes, // M257-D：数据飞轮 V5 GET /api/v1/data-flywheel-v5/report
  ...outpatientAIClosedLoopV5ReportRoutes, // M258-A：AI 门诊全流程闭环 V5 GET /api/v1/outpatient-ai-loop-v5/report
  ...inpatientAIClosedLoopV5ReportRoutes, // M258-B：AI 住院全流程闭环 V5 GET /api/v1/inpatient-ai-loop-v5/report
  ...surgeryAIClosedLoopV5ReportRoutes, // M258-C：AI 手术全流程闭环 V5 GET /api/v1/surgery-ai-loop-v5/report
  ...pharmacyAIClosedLoopV5ReportRoutes, // M258-D：AI 药事全流程闭环 V5 GET /api/v1/pharmacy-ai-loop-v5/report
  ...researchAIV5ReportRoutes, // M259-A：AI 科研助手 V5 GET /api/v1/research-ai-v5/report
  ...teachingAIV5ReportRoutes, // M259-B：AI 教学助手 V5 GET /api/v1/teaching-ai-v5/report
  ...patientCompanionV5ReportRoutes, // M259-C：AI 患者陪伴 V5 GET /api/v1/patient-companion-v5/report
  ...managementAIV5ReportRoutes, // M259-D：AI 管理决策助手 V5 GET /api/v1/management-ai-v5/report
  ...mlopsV5ReportRoutes, // M260-A：MLOps 模型工程 V5 GET /api/v1/mlops-v5/report
  ...dataMeshV5ReportRoutes, // M260-B：数据 Mesh 与数据产品化 V5 GET /api/v1/data-mesh-v5/report
  ...cloudNativeSREV5ReportRoutes, // M260-C：云原生 SRE 深化 V5 GET /api/v1/cloud-native-sre-v5/report
  ...devPlatformV5ReportRoutes, // M260-D：医院开发者平台 V5 GET /api/v1/dev-platform-v5/report
  ...zeroTrustV5ReportRoutes, // M261-A：零信任与身份安全 V5 GET /api/v1/zero-trust-v5/report
  ...privacyComputeV5ReportRoutes, // M261-B：隐私计算与数据要素流通 V5 GET /api/v1/privacy-compute-v5/report
  ...elderlyAccessibleV5ReportRoutes, // M261-C：适老化与无障碍服务 V5 GET /api/v1/elderly-accessible-v5/report
  ...esgV5ReportRoutes, // M261-D：ESG 与可持续发展 V5 GET /api/v1/esg-v5/report
  ...internetHospitalV5ReportRoutes, // M262-A：互联网医院与处方流转 V5 GET /api/v1/internet-hospital-v5/report
  ...medicalAllianceV5ReportRoutes, // M262-B：医联体分级诊疗智能化 V5 GET /api/v1/medical-alliance-v5/report
  ...familyDoctorV5ReportRoutes, // M262-C：家庭医生签约服务 V5 GET /api/v1/family-doctor-v5/report
  ...commercialInsuranceV5ReportRoutes, // M262-D：商业健康保险与惠民保 V5 GET /api/v1/commercial-insurance-v5/report
  ...chestPainCenterV5ReportRoutes, // M263-A：胸痛中心智能化 V5 GET /api/v1/chest-pain-center-v5/report
  ...strokeCenterV5ReportRoutes, // M263-B：卒中中心智能化 V5 GET /api/v1/stroke-center-v5/report
  ...traumaCenterV5ReportRoutes, // M263-C：创伤中心智能化 V5 GET /api/v1/trauma-center-v5/report
  ...criticalCareCenterV5ReportRoutes, // M263-D：危重症中心智能化 V5 GET /api/v1/critical-care-center-v5/report
  ...oncologyV5ReportRoutes, // M264-A：肿瘤全程管理 V5 GET /api/v1/oncology-v5/report
  ...cardiologyV5ReportRoutes, // M264-B：心血管疾病管理 V5 GET /api/v1/cardiology-v5/report
  ...pulmonologyV5ReportRoutes, // M264-C：呼吸系统疾病管理 V5 GET /api/v1/pulmonology-v5/report
  ...endocrinologyV5ReportRoutes, // M264-D：内分泌代谢疾病管理 V5 GET /api/v1/endocrinology-v5/report
  ...gastroenterologyV5ReportRoutes, // M265-A：消化系统疾病管理 V5 GET /api/v1/gastroenterology-v5/report
  ...nephrologyV5ReportRoutes, // M265-B：肾病与血液净化管理 V5 GET /api/v1/nephrology-v5/report
  ...rheumatologyV5ReportRoutes, // M265-C：风湿免疫与过敏性疾病 V5 GET /api/v1/rheumatology-v5/report
  ...neuroPsychV5ReportRoutes, // M265-D：神经与精神心理疾病 V5 GET /api/v1/neuro-psych-v5/report
  ...pediatricsV5ReportRoutes, // M266-A：儿科与新生儿 V5 GET /api/v1/pediatrics-v5/report
  ...obGynV5ReportRoutes, // M266-B：妇产科与围产 V5 GET /api/v1/ob-gyn-v5/report
  ...dermInfectiousV5ReportRoutes, // M266-C：皮肤与感染性疾病 V5 GET /api/v1/derm-infectious-v5/report
  ...entEyeDentalV5ReportRoutes, // M266-D：眼科耳鼻喉口腔 V5 GET /api/v1/ent-eye-dental-v5/report
  ...nationalExamV5ReportRoutes, // M267-A：国考绩效 55 指标 V5 GET /api/v1/national-exam-v5/report
  ...emrGradeV5ReportRoutes, // M267-B：电子病历分级评价 0-8 级 V5 GET /api/v1/emr-grade-v5/report
  ...interopV5ReportRoutes, // M267-C：互联互通标准化成熟度 V5 GET /api/v1/interop-v5/report
  ...smartHospitalV5ReportRoutes, // M267-D：智慧医院三位一体评级 V5 GET /api/v1/smart-hospital-v5/report
  ...smartWardIoTV5ReportRoutes, // M268-A：智慧病房 IoT V5 GET /api/v1/smart-ward-iot-v5/report
  ...hospitalRobotV5ReportRoutes, // M268-B：医院机器人与自动化 V5 GET /api/v1/hospital-robot-v5/report
  ...edgeV5ReportRoutes, // M268-C：5G与边缘计算 V5 GET /api/v1/5g-edge-v5/report
  ...digitalTwinV5ReportRoutes, // M268-D：数字孪生可视化 V5 GET /api/v1/digital-twin-v5/report
  ...rwdPlatformV5ReportRoutes, // M269-A：临床研究 RWD/RWE 平台 V5 GET /api/v1/rwd-platform-v5/report
  ...gcpV5ReportRoutes, // M269-B：药物临床试验 GCP V5 GET /api/v1/gcp-v5/report
  ...biobankV5ReportRoutes, // M269-C：生物样本库与科研数据 V5 GET /api/v1/biobank-v5/report
  ...residencyEducationV5ReportRoutes, // M269-D：住培教学考核 OSCE V5 GET /api/v1/residency-edu-v5/report
  ...indoorNavigationV5ReportRoutes, // M270-A：院内智能导航 V5 GET /api/v1/indoor-navigation-v5/report
  ...inpatientOneStopV5ReportRoutes, // M270-B：住院一站式服务 V5 GET /api/v1/inpatient-onestop-v5/report
  ...omnichannelV5ReportRoutes, // M270-C：多渠道服务整合 V5 GET /api/v1/omnichannel-v5/report
  ...patientExperienceV5ReportRoutes, // M270-D：患者体验监测与改进 V5 GET /api/v1/patient-experience-v5/report
  ...eInvoicePaymentV5ReportRoutes, // M271-A：电子票据与移动支付 V5 GET /api/v1/e-invoice-payment-v5/report
  ...creditTreatmentV5ReportRoutes, // M271-B：信用就医先诊后付 V5 GET /api/v1/credit-treatment-v5/report
  ...priceComplianceV5ReportRoutes, // M271-C：价格管理与收费合规 V5 GET /api/v1/price-compliance-v5/report
  ...reconciliationFundV5ReportRoutes, // M271-D：对账清算与医保基金监管 V5 GET /api/v1/reconciliation-fund-v5/report
  ...hospicePalliativeV5ReportRoutes, // M272-A：安宁疗护与缓和医疗 V5 GET /api/v1/hospice-palliative-v5/report
  ...rehabilitationV5ReportRoutes, // M272-B：康复医学与日间康复 V5 GET /api/v1/rehabilitation-v5/report
  ...clinicalNutritionV5ReportRoutes, // M272-C：临床营养与膳食治疗 V5 GET /api/v1/clinical-nutrition-v5/report
  ...psychEAPV5ReportRoutes, // M272-D：心理心身与 EAP V5 GET /api/v1/psych-eap-v5/report
  ...multiCampusV5ReportRoutes, // M273-A：多院区一体化运行 V5 GET /api/v1/multi-campus-v5/report
  ...groupFRHV5ReportRoutes, // M273-B：集团财务人力物资 V5 GET /api/v1/group-frh-v5/report
  ...groupQAV5ReportRoutes, // M273-C：集团质控与标准统一 V5 GET /api/v1/group-qa-v5/report
  ...groupReferralV5ReportRoutes, // M273-D：集团患者转诊与资源调度 V5 GET /api/v1/group-referral-v5/report
  ...healthCheckupV5ReportRoutes, // M274-A：健康体检中心智能化 V5 GET /api/v1/health-checkup-v5/report
  ...postpartumCareV5ReportRoutes, // M274-B：月子中心与产后康复 V5 GET /api/v1/postpartum-care-v5/report
  ...aestheticDentalV5ReportRoutes, // M274-C：医美口腔健康消费 V5 GET /api/v1/aesthetic-dental-v5/report
  ...healthVIPV5ReportRoutes, // M274-D：健康管理 VIP 服务 V5 GET /api/v1/health-vip-v5/report
  ...museExperienceV5Routes, // M275-A：MUSE 个人经验沉淀闭环 POST/GET /api/v1/muse-experience
  ...experienceShareV5Routes, // M275-B：跨角色经验复用 POST/GET /api/v1/experience-share
  ...failureFlywheelV5Routes, // M275-C：失败案例回灌学习飞轮 POST/GET /api/v1/failure-flywheel
  ...experienceGraphV5Routes, // M275-D：经验图谱与后继者继承 POST/GET /api/v1/experience-graph
  ...aiAdviceTraceV5Routes, // M276-A：AI 建议全链路审计 POST/GET /api/v1/ai-advice-trace
  ...knowledgeIntakeV5Routes, // M276-B：新知识自动入库与指南更新监测 POST/GET/PUT /api/v1/knowledge-intake
  ...drillCaseV5Routes, // M276-C：虚拟病例演练与团队复盘 POST/GET /api/v1/drill-case
  ...competencyProfileV5Routes, // M276-D：医生能力画像与个性化学习路径 GET/PUT /api/v1/competency-profile
  ...volumeForecastV3Routes, // M277-A：门诊与手术量预测 V3 GET/POST /api/v1/volume-forecast
  ...bedForecastV3Routes, // M277-B：床位需求与周转预测 V3 GET/POST /api/v1/bed-forecast
  ...supplyForecastV3Routes, // M277-C：耗材库存与供应预测 V3 GET/POST /api/v1/supply-forecast
  ...staffScheduleV3Routes, // M277-D：人力排班与调度优化 V3 GET/POST/PUT /api/v1/staff-schedule
  ...reportingStatsV5Routes, // M278-A：卫生健康统计与医改监测上报 V5 GET/POST /api/v1/reporting-stats
  ...insuranceReportV5Routes, // M278-B：医保智能监管与 DRG/DIP 上报 V5 GET/POST/PUT /api/v1/insurance-report
  ...cdcNotificationV5Routes, // M278-C：疾控传染病与慢病直报 V5 POST/GET /api/v1/cdc-notification
  ...hqmsV5Routes, // M278-D：医院质量监测 HQMS V5 GET/POST /api/v1/hqms
  ...linenManagementV5Routes, // M279-A：被服洗涤与织物管理 V5 GET/POST /api/v1/linen-management
  ...securityEmergencyV5Routes, // M279-B：安保消防与应急指挥 V5 POST/GET /api/v1/security-emergency
  ...predictiveMaintenanceV5Routes, // M279-C：设备预测性维护 V5 GET/POST /api/v1/predictive-maintenance
  ...energyCarbonV5Routes, // M279-D：能源碳排放与绿色医院 V5 GET/POST /api/v1/energy-carbon
  ...modelRouterV5Routes, // M280-A：多模型路由与降级 V5 GET/POST /api/v1/model-router
  ...promptGovernanceV5Routes, // M280-B：Prompt 工程与模板治理 V5 GET/POST /api/v1/prompt-governance
  ...ragTuningV5Routes, // M280-C：RAG 知识库检索优化 V5 GET/POST /api/v1/rag-tuning
  ...finetuneLoopV5Routes, // M280-D：大模型微调与人在环反馈 V5 POST/GET /api/v1/finetune-loop
  ...fhirGatewayV5Routes, // M281-A：FHIR 资源建模与网关 V5 GET/POST /api/v1/fhir-gateway
  ...hl7IntegrationV5Routes, // M281-B：HL7 / WS363 标准对接升级 V5 POST/GET /api/v1/hl7-integration
  ...dataSharingV5Routes, // M281-C：院间数据共享授权 V5 POST/GET /api/v1/data-sharing
  ...appStoreV5Routes, // M281-D：第三方应用市场集成 V5 POST/DELETE/GET /api/v1/app-store
  ...dataClassificationV5Routes, // M282-A：数据分级分类与动态脱敏 V5 GET/POST /api/v1/data-classification
  ...zeroTrustV5Routes, // M282-B：零信任访问与权限最小化 V5 GET/POST /api/v1/zero-trust
  ...dlpV5Routes, // M282-C：操作审计与数据防泄漏 DLP V5 GET/POST /api/v1/dlp
  ...federatedLearningV5Routes, // M282-D：隐私计算与联邦学习 V5 POST/GET /api/v1/federated-learning
  ...museDoctorV5Routes, // M283-A：医生 MUSE 工作台 V5 GET/POST /api/v1/muse-doctor
  ...museNurseV5Routes, // M283-B：护士 MUSE 工作台 V5 GET/POST /api/v1/muse-nurse
  ...musePharmacistV5Routes, // M283-C：药师 MUSE 工作台 V5 GET/POST /api/v1/muse-pharmacist
  ...museManagerV5Routes, // M283-D：管理者 MUSE 工作台 V5 GET/POST /api/v1/muse-manager
  ...musePatientV5Routes, // M284-A：患者 MUSE 助手 V5 GET/POST /api/v1/muse-patient
  ...museHandoffV5Routes, // M284-B：MUSE 跨角色任务流转 V5 POST/GET /api/v1/muse-handoff
  ...museReminderV5Routes, // M284-C：MUSE 主动提醒引擎 V5 POST/GET /api/v1/muse-reminder
  ...museSkillsV5Routes, // M284-D：MUSE 能力市场与可插拔技能 V5 POST/GET /api/v1/muse-skills
  ...museValueV5Routes, // M285-A：MUSE 采纳率与使用度量 V5 GET /api/v1/muse-value
  ...museInterceptionV5Routes, // M285-B：MUSE 错误拦截与风险避免 V5 GET /api/v1/muse-interception
  ...museAbV5Routes, // M285-C：MUSE A/B 测试与效果评估 V5 POST/GET /api/v1/muse-ab
  ...museRoiV5Routes, // M285-D：MUSE 成本与 ROI 分析 V5 GET /api/v1/muse-roi
  ...opsMonitoringV5Routes, // M286-A：全链路监控与告警 V5 GET/POST /api/v1/ops-monitoring
  ...opsReleaseV5Routes, // M286-B：灰度发布与回滚 V5 POST/GET /api/v1/ops-release
  ...opsPerfV5Routes, // M286-C：性能与容量压测 V5 POST/GET /api/v1/ops-perf
  ...opsDrV5Routes, // M286-D：灾备与高可用 V5 GET/POST /api/v1/ops-dr
  ...execDashboardV5Routes, // M287-A：院长驾驶舱 V5 GET/POST /api/v1/exec-dashboard
  ...deptProfileV5Routes, // M287-B：科室运营画像 V5 GET/POST /api/v1/dept-profile
  ...drgAnalysisV5Routes, // M287-C：病种/DRG 经营分析 V5 GET/POST /api/v1/drg-analysis
  ...trendForecastV5Routes, // M287-D：趋势预测与经营预警 V5 GET/POST /api/v1/trend-forecast
  ...workflowV6Routes, // M288-A：智能审批与工作流引擎 V6 GET/POST /api/v1/workflow
  ...formEngineV6Routes, // M288-B：通用表单引擎 V6 GET/POST /api/v1/form
  ...workflowSignoffV6Routes, // M288-C：工作流节点流转与会签 V6 POST/GET /api/v1/workflow
  ...workflowMonitorV6Routes, // M288-D：流程监控与效率分析 V6 GET/POST /api/v1/workflow/monitor
  ...cdsRuleEngineV7Routes, // M289-A：处方前置审核规则引擎 V7 POST/GET /api/v1/cds
  ...prescriptionReviewV7Routes, // M289-B：处方点评与药师反馈 V7 GET/POST /api/v1/review
  ...cdsLearningV7Routes, // M289-C：用药知识沉淀与反馈学习 V7 GET/POST /api/v1/cds
  ...medAdherenceV7Routes, // M289-D：患者用药教育与依从性随访 V7 GET/POST /api/v1/med-adherence
  ...agentDoctorV8Routes, // M290-A：医生 Personal Agent 工作台 V8 GET/POST /api/v1/agent/doctor
  ...agentNurseV8Routes, // M290-B：护士 Personal Agent（Nurse MUSE）工作台 V8 GET/POST /api/v1/agent/nurse
  ...agentPharmaV8Routes, // M290-C：药师 Personal Agent（Pharma MUSE）工作台 V8 GET/POST /api/v1/agent/pharma
  ...agentManagerV8Routes, // M290-D：管理者 Personal Agent（Manager MUSE）工作台 V8 GET/POST /api/v1/agent/manager
  ...agentLearningV8Routes, // M291-A：Agent 反馈与经验沉淀 V8 POST/GET /api/v1/agent
  ...agentRuleV9Routes, // M291-B：从反馈沉淀个性化推荐规则 V9 GET/POST /api/v1/agent/rules
  ...caseLessonV9Routes, // M291-C：Doctor MUSE 个人经验沉淀闭环 V9 POST/GET /api/v1/agent/case-lesson
  ...learningFlywheelV9Routes, // M291-D：跨角色经验复用与学习飞轮 V9 POST/GET /api/v1/agent
  ...failurePostmortemV10Routes, // M292-A：失败案例根因复盘与防再发机制 V10 POST/GET /api/v1/failure/postmortem
  ...bestPracticeV10Routes, // M292-B：成功案例蒸馏与最佳实践库 V10 GET/POST /api/v1/best-practice
  ...knowledgeHandoverV10Routes, // M292-C：个人知识图谱与继任者交接 V10 GET/POST /api/v1/knowledge
  ...knowledgeAssetV10Routes, // M292-D：医院级 AI 知识资产大盘 V10 GET /api/v1/knowledge
  ...morningBriefV11Routes, // M293-A：DOCTOR_MUSE 主动式晨间简报 V11 GET /api/v1/morning-brief
  ...shiftBriefV11Routes, // M293-B：NURSE_MUSE 主动式交接班简报 V11 GET /api/v1/shift-brief
  ...pharmaBriefV11Routes, // M293-C：PHARMA_MUSE 主动式晨会简报 V11 GET /api/v1/pharma-brief
  ...managerBriefV11Routes, // M293-D：MANAGER_MUSE 主动式周会简报 V11 GET /api/v1/manager-brief
  ...adoptionBoardV12Routes, // M294-A：智能体采纳率反馈看板 V12 GET /api/v1/agent-adoption-board
  ...retrainTaskV12Routes, // M294-B：低采纳率规则自动复训提示 V12 GET /api/v1/retrain-tasks
  ...agentHealthV12Routes, // M294-C：智能体健康度评分 V12 GET /api/v1/agent-health
  ...feedbackLoopDashboardV12Routes, // M294-D：反馈闭环总览 V12 GET /api/v1/feedback-loop-dashboard
  ...crossRoleExperienceV13Routes, // M295-A：跨角色经验安全复用 V13 GET /api/v1/cross-role-experience
  ...experiencePushV13Routes, // M295-B：经验推送频控与免打扰 V13 GET /api/v1/experience-push
  ...patientTipV13Routes, // M295-C：患者侧经验转健康提示 V13 GET /api/v1/patient-tips
  ...reuseRoiV13Routes, // M295-D：经验复用效果度量 V13 GET /api/v1/reuse-roi
  ...experienceFreshnessV13Routes, // M296-A：经验时间衰减与新鲜度 V13 GET /api/v1/experience-freshness
  ...experienceReviewV13Routes, // M296-B：过期经验复核工作流 V13 GET /api/v1/experience-review
  ...experienceVersionV13Routes, // M296-C：经验更新与版本迭代 V13 POST /api/v1/experience/:id/new-version
  ...knowledgeLifecycleV13Routes, // M296-D：知识资产生命周期总览 V13 GET /api/v1/knowledge-lifecycle
  ...handoverV13Routes, // M297-A：继任者经验传承交接 V13 GET /api/v1/handover
  ...learningPlanV13Routes, // M297-B：交接后继任者学习计划 V13 GET /api/v1/learning-plan
  ...publicKnowledgeV13Routes, // M297-C：离任医生知识资产保留 V13 GET /api/v1/public-knowledge
  ...successionReportV13Routes, // M297-D：传承效果度量与院长报告 V13 GET /api/v1/succession-report
  ...contributionLeaderboardV13Routes, // M298-A：专家经验贡献激励 V13 GET /api/v1/contribution-leaderboard
  ...honorWallV13Routes, // M298-B：贡献荣誉墙与月度之星 V13 GET /api/v1/honor-wall
  ...mentorMatchV13Routes, // M298-C：新手医生孵化与导师匹配 V13 GET /api/v1/mentor-match
  ...ecosystemDashboardV13Routes, // M298-D：知识贡献生态总览 V13 GET /api/v1/ecosystem-dashboard
  ...reviewQueueV13Routes, // M299-A：经验质量同行评审 V13 GET /api/v1/review-queue
  ...rollbackV13Routes, // M299-B：错误经验拦截与回滚 V13 POST /api/v1/experience/:id/rollback
  ...reviewerRosterV13Routes, // M299-C：评审专家资质与激励 V13 GET /api/v1/reviewer-roster
  ...qualityGateV13Routes, // M299-D：质量门禁总览 V13 GET /api/v1/quality-gate
  ...experienceOutcomeV13Routes, // M300-A：经验与临床结局关联 V13 GET /api/v1/experience-outcome
  ...evidenceRulesV13Routes, // M300-B：疗效证据反哺规则权重 V13 GET /api/v1/evidence-rules
  ...circuitBreakerV13Routes, // M300-C：反向证据熔断 V13 GET /api/v1/circuit-breaker
  ...evidenceOverviewV13Routes, // M300-D：疗效证据总览 V13 GET /api/v1/evidence-overview
  ...doctorFeedbackV13Routes, // M301-A：医生显式反馈闭环 V13 POST /api/v1/feedback
  ...experiencePatchesV13Routes, // M301-B：修改点归因与经验补丁 V13 GET /api/v1/experience-patches
  ...feedbackTrendV13Routes, // M301-C：反馈信号看板与趋势 V13 GET /api/v1/feedback-trend
  ...feedbackLoopOverviewV13Routes, // M301-D：反馈闭环总览 V13 GET /api/v1/feedback-loop-overview
  ...contextualPushV13Routes, // M302-A：经验精准主动推送 V13 GET /api/v1/contextual-push
  ...pushSceneV13Routes, // M302-B：推送时机与场景触发 V13 GET /api/v1/push-scene
  ...pushQuotaV13Routes, // M302-C：推送频控与免打扰 V13 GET /api/v1/push-quota
  ...pushEffectOverviewV13Routes, // M302-D：推送效果与闭环总览 V13 GET /api/v1/push-effect-overview
  ...doctorPreferenceV13Routes, // M303-A：推送个人化学习 V13 GET /api/v1/doctor-preference
  ...lookAlikeV13Routes, // M303-B：相似医生协同推荐 V13 GET /api/v1/look-alike
  ...learningCurveV13Routes, // M303-C：个人学习曲线 V13 GET /api/v1/learning-curve
  ...personalizedLearningOverviewV13Routes, // M303-D：个人化学习效果总览 V13 GET /api/v1/personalized-learning-overview
  ...crossDeptBroadcastV13Routes, // M304-A：跨科室经验扩散 V13 GET /api/v1/cross-dept-broadcast
  ...diffusionAdoptionV13Routes, // M304-B：跨科室采纳反馈 V13 GET /api/v1/diffusion-adoption
  ...diffusionGraphV13Routes, // M304-C：扩散网络图谱 V13 GET /api/v1/diffusion-graph
  ...diffusionOverviewV13Routes, // M304-D：跨科室扩散总览 V13 GET /api/v1/diffusion-overview
  ...experienceAssetV13Routes, // M305-A：经验资产运营与退役 V13 GET /api/v1/experience-asset
  ...assetAuditV13Routes, // M305-B：资产盘点周期 V13 GET /api/v1/asset-audit
  ...archivedExperienceV13Routes, // M305-C：退役经验存档与复用 V13 GET /api/v1/archived-experience
  ...assetLifecycleOverviewV13Routes, // M305-D：经验资产生命周期总览 V13 GET /api/v1/asset-lifecycle-overview
  ...flywheelScoreV13Routes, // M306-A：医院 AI 学习飞轮成熟度 V13 GET /api/v1/flywheel-score
  ...flywheelDrilldownV13Routes, // M306-B：六维指标明细下钻 V13 GET /api/v1/flywheel-drilldown
  ...flywheelRecommendationV13Routes, // M306-C：飞轮改进建议 V13 GET /api/v1/flywheel-recommendation
  ...flywheelTrendV13Routes, // M306-D：飞轮季度演进趋势 V13 GET /api/v1/flywheel-trend
  ...flywheelTaskV13Routes, // M307-A：飞轮改进任务闭环 V13 GET/POST /api/v1/flywheel-tasks
  ...taskFunnelV13Routes, // M307-B：任务进度追踪与升级 V13 GET /api/v1/task-funnel
  ...taskVerificationV13Routes, // M307-C：任务验收与效果验证 V13 GET /api/v1/task-verification
  ...closedLoopV13Routes, // M307-D：闭环回灌飞轮 V13 GET /api/v1/closed-loop-overview
  ...deptTaskBoardV13Routes, // M308-A：科室任务看板 V13 GET /api/v1/dept-task-board
  ...deptTaskDetailV13Routes, // M308-B：科室任务详情与督办 V13 GET /api/v1/dept-task-detail/:id
  ...deptSopV13Routes, // M308-C：科室经验 SOP 沉淀 V13 GET /api/v1/dept-sop
  ...deptCollabOverviewV13Routes, // M308-D：科际协作与经验共享总览 V13 GET /api/v1/dept-collab-overview
  ...deptTaskCollabV13Routes, // M308-D（新规格）：科室间任务协作总览 V13 GET /api/v1/dept-task-collab
  ...suggestionAdoptionV13Routes, // M309-A：改进建议采纳率追踪 V13 GET /api/v1/suggestion-adoption
  ...sopUsageV13Routes, // M309-B：SOP 引用次数回灌飞轮分 V13 GET /api/v1/sop-usage
  ...crossDeptLearningV13Routes, // M309-C：跨科协作任务经验双沉淀 V13 GET /api/v1/cross-dept-learning
  ...learningMilestoneV13Routes, // M309-D：个人学习曲线里程碑 V13 GET /api/v1/learning-milestone
  ...flywheelHealthV13Routes, // M310-A：综合学习飞轮健康度仪表盘 V13 GET /api/v1/flywheel-health
  ...deptBenchmarkV13Routes, // M310-B：多科室横向对标 V13 GET /api/v1/dept-benchmark
  ...doctorGrowthReportV13Routes, // M310-C：医生个人月度成长报告 V13 GET /api/v1/doctor-growth-report
  ...quarterlyReviewV13Routes, // M310-D：院长季度复盘报告 V13 GET /api/v1/quarterly-review
  ...patientSatisfactionLoopV13Routes, // M311-A：患者满意度闭环 V13 GET /api/v1/patient-satisfaction
  ...staffWorkloadV13Routes, // M311-B：医护工作量与疲劳度监测 V13 GET /api/v1/staff-workload
  ...qualityEventRcaV13Routes, // M311-C：不良事件根因分析 RCA 辅助 V13 GET /api/v1/quality-event-rca
  ...deanCommandCenterV13Routes, // M311-D：院长指挥中心一屏总览 V13 GET /api/v1/dean-command-center
  ...bedOccupancyForecastV13Routes, // M312-A：床位占用预测 V13 GET /api/v1/bed-occupancy-forecast
  ...pharmacyInventoryAlertV13Routes, // M312-B：药房库存预警 V13 GET /api/v1/pharmacy-inventory-alert
  ...otSchedulingConflictV13Routes, // M312-C：手术排程冲突检测 V13 GET /api/v1/ot-scheduling-conflict
  ...emergencyCapacityV13Routes, // M312-D：急诊容量预警 V13 GET /api/v1/emergency-capacity
  ...drgCostOverrunV13Routes, // M313-A：DRG 费用超支预警 V13 GET /api/v1/drg-cost-overrun
  ...outpatientFlowForecastV13Routes, // M313-B：门诊流量预测与分时段建议 V13 GET /api/v1/outpatient-flow-forecast
  ...equipmentMaintenanceV13Routes, // M313-C：医疗设备维保到期提醒 V13 GET /api/v1/equipment-maintenance
  ...infectionOutbreakV13Routes, // M313-D：院感暴发早期预警 V13 GET /api/v1/infection-outbreak
  ...noShowRateV13Routes, // M314-A：门诊爽约率分析 V13 GET /api/v1/no-show-rate
  ...readmissionRiskV13Routes, // M314-B：31 天再入院风险预测 V13 GET /api/v1/readmission-risk
  ...medicationReconciliationV13Routes, // M314-C：出院用药重整 V13 GET /api/v1/medication-reconciliation
  ...dischargeSummaryQualityV13Routes, // M314-D：出院小结质量评分 V13 GET /api/v1/discharge-summary-quality
  ...icdCodingAssistV13Routes, // M315-A：ICD 编码辅助推荐 V13 GET /api/v1/icd-coding-assist
  ...orderSetComplianceV13Routes, // M315-B：医嘱套餐规范 V13 GET /api/v1/order-set-compliance
  ...transferSummaryCompletenessV13Routes, // M315-C：转科交接单完整度评分 V13 GET /api/v1/transfer-summary-completeness
  ...nursingHandoverV13Routes, // M315-D：护理交班质量 V13 GET /api/v1/nursing-handover
  ...followUpAdherenceV13Routes, // M316-A：出院随访依从性 V13 GET /api/v1/follow-up-adherence
  ...chronicDiseaseMgmtV13Routes, // M316-B：慢病管理达标率 V13 GET /api/v1/chronic-disease-mgmt
  ...healthEducationPushV13Routes, // M316-C：健教材料推送统计 V13 GET /api/v1/health-education-push
  ...patientPortalUsageV13Routes, // M316-D：患者门户使用度 V13 GET /api/v1/patient-portal-usage
  ...outpatientAvgCostV13Routes, // M317-A：门诊次均费用 V13 GET /api/v1/outpatient-avg-cost
  ...inpatientBedDayCostV13Routes, // M317-B：住院床日成本 V13 GET /api/v1/inpatient-bed-day-cost
  ...procurementLeadTimeV13Routes, // M317-C：采购周期预警 V13 GET /api/v1/procurement-lead-time
  ...staffTurnoverV13Routes, // M317-D：人员流失率 V13 GET /api/v1/staff-turnover
  ...medicalRecordTimelinessV13Routes, // M318-A：病历书写及时性 V13 GET /api/v1/medical-record-timeliness
  ...prescriptionAuditV13Routes, // M318-B：处方点评合格率 V13 GET /api/v1/prescription-audit
  ...handHygieneComplianceV13Routes, // M318-C：手卫生依从性 V13 GET /api/v1/hand-hygiene-compliance
  ...dataAccessAuditV13Routes, // M318-D：数据访问审计异常 V13 GET /api/v1/data-access-audit
  ...doctorMuseUsageV13Routes, // M319-A：Doctor MUSE 使用统计 V13 GET /api/v1/doctor-muse-usage
  ...museFeedbackV13Routes, // M319-B：MUSE 建议采纳反馈 V13 GET /api/v1/muse-feedback
  ...knowledgeLinkV13Routes, // M319-C：病历知识自动关联 V13 GET /api/v1/knowledge-link
  ...museTrainingDataV13Routes, // M319-D：个人智能体训练数据沉淀 V13 GET /api/v1/muse-training-data
  ...nurseMuseUsageV13Routes, // M320-A：护士个人智能体使用统计 V13 GET /api/v1/nurse-muse-usage
  ...pharmacistMuseUsageV13Routes, // M320-B：药师个人智能体使用统计 V13 GET /api/v1/pharmacist-muse-usage
  ...adminMuseUsageV13Routes, // M320-C：行政个人智能体使用统计 V13 GET /api/v1/admin-muse-usage
  ...patientMuseUsageV13Routes, // M320-D：患者个人智能体使用统计 V13 GET /api/v1/patient-muse-usage
  ...museFlywheelOverviewV13Routes, // M321-A：五角色 MUSE 飞轮总览 V13 GET /api/v1/muse-flywheel-overview
  ...museCrossRoleLearningV13Routes, // M321-B：跨角色经验互鉴 V13 GET /api/v1/muse-cross-role-learning
  ...museModelVersionV13Routes, // M321-C：模型版本迭代记录 V13 GET /api/v1/muse-model-version
  ...museRoiReportV13Routes, // M321-D：MUSE 投入产出报告 V13 GET /api/v1/muse-roi-report
  ...clinicalQualityDashboardV13Routes, // M322-A：医疗质量总仪表盘 V13 GET /api/v1/clinical-quality-dashboard
  ...patientSafetyV13Routes, // M322-B：患者安全事件总览 V13 GET /api/v1/patient-safety-overview
  ...staffSatisfactionV13Routes, // M322-C：员工满意度 V13 GET /api/v1/staff-satisfaction
  ...hospitalEfficiencyV13Routes, // M322-D：医院运营效率 V13 GET /api/v1/hospital-efficiency
  ...emr5LevelV13Routes, // M323-A：电子病历五级评级自评 V13 GET /api/v1/emr5-level
  ...intercon4LevelV13Routes, // M323-B：互联互通四甲自评 V13 GET /api/v1/intercon4-level
  ...smartHospitalRatingV13Routes, // M323-C：智慧医院评级自评 V13 GET /api/v1/smart-hospital-rating
  ...dataGovernanceV13Routes, // M323-D：数据治理成熟度 V13 GET /api/v1/data-governance-maturity
  ...regionalHealthDataV13Routes, // M324-A：区域健康数据汇总 V13 GET /api/v1/regional-health-data
  ...grassrootsMedicalV13Routes, // M324-B：基层医疗协同 V13 GET /api/v1/grassroots-medical
  ...telemedicineV13Routes, // M324-C：远程会诊量 V13 GET /api/v1/telemedicine-overview
  ...publicHealthEmergencyV13Routes, // M324-D：公共卫生应急 V13 GET /api/v1/public-health-emergency
  ...imagingAiUsageV13Routes, // M325-A：影像 AI 使用统计 V13 GET /api/v1/imaging-ai-usage
  ...labAiUsageV13Routes, // M325-B：检验 AI 使用统计 V13 GET /api/v1/lab-ai-usage
  ...aiModelDriftV13Routes, // M325-C：AI 模型漂移监控 V13 GET /api/v1/ai-model-drift
  ...aiGovernanceV13Routes, // M325-D：AI 治理台账 V13 GET /api/v1/ai-governance
  ...patientWaitTimeV13Routes, // M326-A：患者等候时长 V13 GET /api/v1/patient-wait-time
  ...patientComplaintV13Routes, // M326-B：患者投诉处理 V13 GET /api/v1/patient-complaint
  ...patientFollowUpV13Routes, // M326-C：随访完成率 V13 GET /api/v1/patient-follow-up
  ...patientEducationV13Routes, // M326-D：健教材料推送 V13 GET /api/v1/patient-education-stats
  ...clinicalResearchV13Routes, // M327-A：临床研究项目 V13 GET /api/v1/clinical-research-overview
  ...teachingHospitalV13Routes, // M327-B：教学医院指标 V13 GET /api/v1/teaching-hospital
  ...continuingEducationV13Routes, // M327-C：继续教育学分 V13 GET /api/v1/continuing-education
  ...medicalLiteratureV13Routes, // M327-D：医学文献检索 V13 GET /api/v1/medical-literature
  ...equipmentOpsV13Routes, // M328-A：设备运维 V13 GET /api/v1/equipment-ops-overview
  ...consumableInventoryV13Routes, // M328-B：耗材库存 V13 GET /api/v1/consumable-inventory
  ...pharmacyInventoryV13Routes, // M328-C：药品库存 V13 GET /api/v1/pharmacy-inventory
  ...bloodInventoryV13Routes, // M328-D：血库库存 V13 GET /api/v1/blood-inventory
  ...billingReconciliationV13Routes, // M329-A：医保对账 V13 GET /api/v1/billing-reconciliation
  ...costPerPatientV13Routes, // M329-B：单病种成本 V13 GET /api/v1/cost-per-patient
  ...revenueStructureV13Routes, // M329-C：收入结构 V13 GET /api/v1/revenue-structure
  ...insuranceSettlementV13Routes, // M329-D：医保结算 V13 GET /api/v1/insurance-settlement
  ...doctorWorkloadV13Routes, // M330-A：医生工作量 V13 GET /api/v1/doctor-workload
  ...nurseWorkloadV13Routes, // M330-B：护士工作量 V13 GET /api/v1/nurse-workload
  ...staffTurnoverNetV13Routes, // M330-C：员工净流失率 V13 GET /api/v1/staff-turnover-net
  ...trainingHoursV13Routes, // M330-D：培训时长 V13 GET /api/v1/training-hours
  ...wardOccupancyV13Routes, // M331-A：病房床位使用率 V13 GET /api/v1/ward-occupancy
  ...operatingRoomV13Routes, // M331-B：手术室利用率 V13 GET /api/v1/operating-room
  ...elevatorWaitTimeV13Routes, // M331-C：电梯等候时间 V13 GET /api/v1/elevator-wait-time
  ...parkingV13Routes, // M331-D：停车场使用率 V13 GET /api/v1/parking
  ...patientSatisfactionV13Routes, // M332-A：患者满意度调研 V13 GET /api/v1/patient-satisfaction-survey
  ...doctorSatisfactionV13Routes, // M332-B：医生满意度调研 V13 GET /api/v1/doctor-satisfaction
  ...nurseSatisfactionV13Routes, // M332-C：护士满意度调研 V13 GET /api/v1/nurse-satisfaction
  ...staffSatisfactionOverviewV13Routes, // M332-D：员工满意度总览 V13 GET /api/v1/staff-satisfaction-overview
  ...clinicalPathwayV13Routes, // M333-A：临床路径执行率 V13 GET /api/v1/clinical-pathway-overview
  ...guidelineComplianceV13Routes, // M333-B：指南依从性 V13 GET /api/v1/guideline-compliance
  ...antibioticUseV13Routes, // M333-C：抗菌药物使用强度 V13 GET /api/v1/antibiotic-use
  ...bloodUseV13Routes, // M333-D：用血合理率 V13 GET /api/v1/blood-use
  ...mrqQualityV13Routes, // M334-A：病案质量 V13 GET /api/v1/mrq-quality
  ...icdCodingV13Routes, // M334-B：ICD 编码准确率 V13 GET /api/v1/icd-coding-accuracy
  ...drgGroupingV13Routes, // M334-C：DRG 分组 V13 GET /api/v1/drg-grouping
  ...averageLengthOfStayV13Routes, // M334-D：平均住院日 V13 GET /api/v1/average-length-of-stay
  ...emergencyTriageV13Routes, // M335-A：急诊分诊 V13 GET /api/v1/emergency-triage-stats
  ...icuOccupancyV13Routes, // M335-B：ICU 床位 V13 GET /api/v1/icu-occupancy
  ...criticalValueV13Routes, // M335-C：危急值 V13 GET /api/v1/critical-value-stats
  ...readmissionV13Routes, // M335-D：31 天再入院率 V13 GET /api/v1/readmission-stats
  ...drugShortageV13Routes, // M336-A：药品短缺 V13 GET /api/v1/drug-shortage
  ...adverseDrugEventV13Routes, // M336-B：药品不良反应 V13 GET /api/v1/adverse-drug-event
  ...antibioticRxV13Routes, // M336-C：抗菌药物处方率 V13 GET /api/v1/antibiotic-rx
  ...ivFluidV13Routes, // M336-D：静脉输液率 V13 GET /api/v1/iv-fluid
  ...outpatientWaitV13Routes, // M337-A：门诊等候时长 V13 GET /api/v1/outpatient-wait
  ...appointmentV13Routes, // M337-B：预约诊疗 V13 GET /api/v1/appointment
  ...referralV13Routes, // M337-C：双向转诊 V13 GET /api/v1/referral-stats
  ...chronicDiseaseV13Routes, // M337-D：慢病管理 V13 GET /api/v1/chronic-disease-stats
  ...labTurnaroundV13Routes, // M338-A：检验报告周转时间 V13 GET /api/v1/lab-turnaround
  ...imagingTurnaroundV13Routes, // M338-B：影像报告周转时间 V13 GET /api/v1/imaging-turnaround
  ...labErrorV13Routes, // M338-C：检验差错率 V13 GET /api/v1/lab-error
  ...specimenRejectV13Routes, // M338-D：标本不合格率 V13 GET /api/v1/specimen-reject
  ...surgeryVolumeV13Routes, // M339-A：手术量分级 V13 GET /api/v1/surgery-volume
  ...anesthesiaComplicationV13Routes, // M339-B：麻醉相关并发症 V13 GET /api/v1/anesthesia-complication
  ...ssiRateV13Routes, // M339-C：手术部位感染率 V13 GET /api/v1/ssi-rate
  ...intraOpFrozenSectionV13Routes, // M339-D：术中冰冻病理与术后石蜡符合率 V13 GET /api/v1/intraop-frozen-section
  ...complaintHandlingV13Routes, // M340-A：投诉处理 V13 GET /api/v1/complaint-handling
  ...medicalEthicsV13Routes, // M340-B：医德医风考评 V13 GET /api/v1/medical-ethics
  ...informedConsentV13Routes, // M340-C：知情同意书签署率 V13 GET /api/v1/informed-consent
  ...outpatientRecordV13Routes, // M340-D：门诊病历书写合格率 V13 GET /api/v1/outpatient-record
  ...handHygieneV13Routes, // M341-A：手卫生依从率 V13 GET /api/v1/hand-hygiene
  ...nosocomialInfectionV13Routes, // M341-B：院感发生率 V13 GET /api/v1/nosocomial-infection
  ...isolationOrderV13Routes, // M341-C：隔离医嘱执行率 V13 GET /api/v1/isolation-order
  ...envDisinfectionV13Routes, // M341-D：环境消毒合格率 V13 GET /api/v1/env-disinfection
  ...bloodTransfusionV13Routes, // M342-A：输血率 V13 GET /api/v1/blood-transfusion
  ...pathologyTurnaroundV13Routes, // M342-B：病理报告 TAT V13 GET /api/v1/pathology-turnaround
  ...endoscopyVolumeV13Routes, // M342-C：内镜检查量 V13 GET /api/v1/endoscopy-volume
  ...ultrasoundVolumeV13Routes, // M342-D：超声检查量 V13 GET /api/v1/ultrasound-volume
  ...residentTrainingV13Routes, // M343-A：住院医师规范化培训 V13 GET /api/v1/resident-training
  ...continuingEduV13Routes, // M343-B：继续医学教育 V13 GET /api/v1/continuing-edu
  ...researchProjectV13Routes, // M343-C：科研项目 V13 GET /api/v1/research-project
  ...patentV13Routes, // M343-D：专利授权 V13 GET /api/v1/patent
  ...systemAvailabilityV13Routes, // M344-A：核心系统可用率 V13 GET /api/v1/system-availability
  ...securityIncidentV13Routes, // M344-B：信息安全事件 V13 GET /api/v1/security-incident
  ...dataQualityV13Routes, // M344-C：数据质量 V13 GET /api/v1/data-quality
  ...apiCallV13Routes, // M344-D：API 调用量 V13 GET /api/v1/api-call
  ...insuranceSettlementStatsV13Routes, // M345-A：医保结算 V13 GET /api/v1/insurance-settlement-stats
  ...revenueStructureStatsV13Routes, // M345-B：业务收入结构 V13 GET /api/v1/revenue-structure-stats
  ...costControlV13Routes, // M345-C：成本控制 V13 GET /api/v1/cost-control
  ...bedOccupancyV13Routes, // M345-D：床位使用 V13 GET /api/v1/bed-occupancy
  ...staffTurnoverStatsV13Routes, // M346-A：员工流失率 V13 GET /api/v1/staff-turnover-stats
  ...doctorTitleStructureV13Routes, // M346-B：医师职称结构 V13 GET /api/v1/doctor-title-structure
  ...nursePatientRatioV13Routes, // M346-C：护患比 V13 GET /api/v1/nurse-patient-ratio
  ...staffTrainingHoursV13Routes, // M346-D：员工培训学时 V13 GET /api/v1/staff-training-hours
  ...patientSatisfactionStatsV13Routes, // M347-A：患者满意度 V13 GET /api/v1/patient-satisfaction-stats
  ...complaintRateV13Routes, // M347-B：投诉率 V13 GET /api/v1/complaint-rate
  ...followUpCompletionV13Routes, // M347-C：出院随访率 V13 GET /api/v1/follow-up-completion
  ...medicalRecordIntegrityV13Routes, // M347-D：病历完整性 V13 GET /api/v1/medical-record-integrity
  ...emergencyGreenwayV13Routes, // M348-A：急诊绿色通道 V13 GET /api/v1/emergency-greenway
  ...preHospitalCareV13Routes, // M348-B：院前急救 V13 GET /api/v1/pre-hospital-care
  ...chestPainCenterV13Routes, // M348-C：胸痛中心 V13 GET /api/v1/chest-pain-center
  ...strokeCenterV13Routes, // M348-D：卒中中心 V13 GET /api/v1/stroke-center
  ...maternityQualityV13Routes, // M349-A：产科质量 V13 GET /api/v1/maternity-quality
  ...newbornCareV13Routes, // M349-B：新生儿 V13 GET /api/v1/newborn-care
  ...pediatricCareV13Routes, // M349-C：儿科诊疗 V13 GET /api/v1/pediatric-care
  ...immunizationV13Routes, // M349-D：预防接种 V13 GET /api/v1/immunization
  ...tcmServiceV13Routes, // M350-A：中医服务 V13 GET /api/v1/tcm-service
  ...rehabilitationStatsV13Routes, // M350-B：康复医学 V13 GET /api/v1/rehabilitation-stats
  ...geriatricComprehensiveV13Routes, // M350-C：老年综合评估 V13 GET /api/v1/geriatric-comprehensive
  ...palliativeCareV13Routes, // M350-D：安宁疗护 V13 GET /api/v1/palliative-care（M350 收官）
  ...cssdV13Routes, // M351-A：消毒供应 V13 GET /api/v1/cssd
  ...equipmentUtilizationV13Routes, // M351-B：大型设备开机率 V13 GET /api/v1/equipment-utilization
  ...oxygenSupplyV13Routes, // M351-C：氧气供应 V13 GET /api/v1/oxygen-supply
  ...medicalWasteV13Routes, // M351-D：医疗废物 V13 GET /api/v1/medical-waste（M351 收官）
  ...fireSafetyV13Routes, // M352-A：消防安全 V13 GET /api/v1/fire-safety
  ...energyConsumptionV13Routes, // M352-B：能耗管理 V13 GET /api/v1/energy-consumption
  ...nutritionKitchenV13Routes, // M352-C：营养食堂 V13 GET /api/v1/nutrition-kitchen
  ...parkingMgmtV13Routes, // M352-D：车辆管理 V13 GET /api/v1/parking-mgmt（M352 收官）
  ...infoSecurityV13Routes, // M353-A：信息安全 V13 GET /api/v1/info-security
  ...dataQualityStatsV13Routes, // M353-B：数据质量 V13 GET /api/v1/data-quality-stats
  ...systemAvailabilityStatsV13Routes, // M353-C：系统可用率 V13 GET /api/v1/system-availability-stats
  ...backupDRV13Routes, // M353-D：备份与容灾 V13 GET /api/v1/backup-dr（M353 收官）
  ...kpiDashboardV13Routes, // M354-A：KPI 总览看板 V13 GET /api/v1/kpi-dashboard
  ...medicalRecordQualityV13Routes, // M354-B：病案质量管理 V13 GET /api/v1/medical-record-quality
  ...complaintMgmtV13Routes, // M354-C：投诉管理 V13 GET /api/v1/complaint-mgmt
  ...continuingEducationStatsV13Routes, // M354-D：继续医学教育 V13 GET /api/v1/continuing-education-stats（stats 避让已有 continuingEduV13，M354 收官）
  ...specialtyDevelopmentV13Routes, // M355-A：重点专科建设 V13 GET /api/v1/specialty-development
  ...clinicalResearchStatsV13Routes, // M355-B：临床研究 V13 GET /api/v1/clinical-research-stats（stats 避让已有 clinicalResearchV13 / M327-A）
  ...teachingWorkloadV13Routes, // M355-C：教学工作 V13 GET /api/v1/teaching-workload
  ...medicalAllianceV13Routes, // M355-D：医联体与分级诊疗 V13 GET /api/v1/medical-alliance（M355 收官）
  ...drgPerformanceV13Routes, // M356-A：DRG 绩效 V13 GET /api/v1/drg-performance
  ...dipScoreV13Routes, // M356-B：DIP 病种分值 V13 GET /api/v1/dip-score
  ...drugConsumableRatioV13Routes, // M356-C：药耗占比 V13 GET /api/v1/drug-consumable-ratio
  ...expenseStructureV13Routes, // M356-D：收入结构（支出端） V13 GET /api/v1/expense-structure（expense 避让已有 revenueStructureV13 / revenueStructureStatsV13，M356 收官）
  ...patientSafetyStatsV13Routes, // M357-A：患者安全目标 V13 GET /api/v1/patient-safety-stats（stats 避让已有 patientSafetyV13 / M322-B）
  ...coreSystemV13Routes, // M357-B：医疗质量核心制度 V13 GET /api/v1/core-system
  ...surgicalInfectionV13Routes, // M357-C：手术部位感染 V13 GET /api/v1/surgical-infection
  ...antibioticMgmtV13Routes, // M357-D：抗菌药物管理 V13 GET /api/v1/antibiotic-mgmt（M357 收官）
  ...nursingQualityV13Routes, // M358-A：护理质量 V13 GET /api/v1/nursing-quality
  ...patientExperienceV13Routes, // M358-B：患者体验 V13 GET /api/v1/patient-experience
  ...nursingStaffingV13Routes, // M358-C：护理人力配置 V13 GET /api/v1/nursing-staffing
  ...nursingDocumentV13Routes, // M358-D：护理文书管理 V13 GET /api/v1/nursing-document（M358 收官）
  ...pharmacyServiceV13Routes, // M359-A：药学服务 V13 GET /api/v1/pharmacy-service
  ...rationalDrugUseStatsV13Routes, // M359-B：合理用药 V13 GET /api/v1/rational-drug-use-stats（stats 避让已有 rationalDrugUse）
  ...drugInventoryStatsV13Routes, // M359-C：药品库存管理 V13 GET /api/v1/drug-inventory-stats（stats 避让已有 drugInventory）
  ...infusionMgmtV13Routes, // M359-D：输液管理 V13 GET /api/v1/infusion-mgmt（M359 收官）
  ...labQualityV13Routes, // M360-A：检验质量 V13 GET /api/v1/lab-quality（新规格：室内质控/室间质评/报告及时率）
  ...imagingQualityV13Routes, // M360-B：影像质量 V13 GET /api/v1/imaging-quality（新规格：报告及时率/阳性率/甲级片率）
  ...pathologyQualityV13Routes, // M360-C：病理质量 V13 GET /api/v1/pathology-quality
  ...bloodMgmtV13Routes, // M360-D：输血管理 V13 GET /api/v1/blood-mgmt（M360 收官）
  ...researchMgmtV13Routes, // M361-A：科研管理 V13 GET /api/v1/research-mgmt
  ...teachingMgmtV13Routes, // M361-B：教学管理 V13 GET /api/v1/teaching-mgmt
  ...continuingEduCoverageV13Routes, // M361-C：继续教育（覆盖率）V13 GET /api/v1/continuing-edu-coverage
  ...academicExchangeV13Routes, // M361-D：学术交流 V13 GET /api/v1/academic-exchange（M361 收官）
  ...staffMgmtV13Routes, // M362-A：人员管理 V13 GET /api/v1/staff-mgmt
  ...trainingMgmtV13Routes, // M362-B：培训管理 V13 GET /api/v1/training-mgmt
  ...logisticsMgmtV13Routes, // M362-C：后勤管理 V13 GET /api/v1/logistics-mgmt
  ...safetyMgmtV13Routes, // M362-D：安全管理 V13 GET /api/v1/safety-mgmt（M362 收官）
  ...infoSecurityStatsV13Routes, // M363-A：信息安全（统计）V13 GET /api/v1/info-security-stats（stats避让）
  ...patientPrivacyV13Routes, // M363-B：患者隐私保护 V13 GET /api/v1/patient-privacy
  ...networkSecurityV13Routes, // M363-C：网络安全 V13 GET /api/v1/network-security
  ...dataGovernanceStatsV13Routes, // M363-D：数据治理（统计）V13 GET /api/v1/data-governance-stats（stats避让）
  ...operationMgmtV13Routes, // M364-A：运营管理 V13 GET /api/v1/operation-mgmt
  ...financeMgmtV13Routes, // M364-B：财务管理 V13 GET /api/v1/finance-mgmt
  ...patientFlowV13Routes, // M364-C：患者流量 V13 GET /api/v1/patient-flow
  ...resourceUtilV13Routes, // M364-D：资源利用 V13 GET /api/v1/resource-util（M364 收官）
  ...patientSatisfactionScoreV13Routes, // M365-A：患者满意度（得分）V13 GET /api/v1/patient-satisfaction-score（score避让）
  ...complaintMgmtStatsV13Routes, // M365-B：投诉管理（统计）V13 GET /api/v1/complaint-mgmt-stats（stats避让）
  ...serviceAttitudeV13Routes, // M365-C：服务态度 V13 GET /api/v1/service-attitude
  ...experienceWaitTimeV13Routes, // M365-D：就医体验（等候时间）V13 GET /api/v1/experience-wait-time（M365 收官）
  ...aiDiagnosisStatsV13Routes, // M366-A：AI 辅助诊断（统计）V13 GET /api/v1/ai-diagnosis-stats（stats避让）
  ...aiTreatmentV13Routes, // M366-B：AI 辅助治疗 V13 GET /api/v1/ai-treatment
  ...aiManagementV13Routes, // M366-C：AI 管理应用 V13 GET /api/v1/ai-management
  ...aiEducationV13Routes, // M366-D：AI 教学培训 V13 GET /api/v1/ai-education（M366 收官）
  ...internetHospitalStatsV13Routes, // M367-A：互联网医院（统计）V13 GET /api/v1/internet-hospital-stats（stats避让）
  ...telemedicineStatsV13Routes, // M367-B：远程医疗（统计）V13 GET /api/v1/telemedicine-stats（stats避让）
  ...onlinePaymentV13Routes, // M367-C：在线支付 V13 GET /api/v1/online-payment
  ...healthRecordV13Routes, // M367-D：健康档案 V13 GET /api/v1/health-record（M367 收官）
  ...drugAdverseReactionV13Routes, // M368-A：药品不良反应 V13 GET /api/v1/drug-adverse-reaction
  ...drugInteractionV13Routes, // M368-B：药物相互作用 V13 GET /api/v1/drug-interaction
  ...antibioticMgmtStatsV13Routes, // M368-C：抗菌药物管理（统计）V13 GET /api/v1/antibiotic-mgmt-stats（stats避让）
  ...essentialDrugV13Routes, // M368-D：基本药物管理 V13 GET /api/v1/essential-drug（M368 收官）
  ...nursingQualityStatsV13Routes, // M369-A：护理质量（统计）V13 GET /api/v1/nursing-quality-stats（stats避让）
  ...nursingSafetyV13Routes, // M369-B：护理安全 V13 GET /api/v1/nursing-safety
  ...nursingStaffV13Routes, // M369-C：护理人员配置 V13 GET /api/v1/nursing-staff
  ...nursingTrainingV13Routes, // M369-D：护理培训 V13 GET /api/v1/nursing-training（M369 收官）
  ...infectionControlV13Routes, // M370-A：院感控制 V13 GET /api/v1/infection-control
  ...infectionSurveillanceV13Routes, // M370-B：院感监测 V13 GET /api/v1/infection-surveillance
  ...environmentalHygieneV13Routes, // M370-C：环境卫生学 V13 GET /api/v1/environmental-hygiene
  ...epidemicReportV13Routes, // M370-D：传染病报告 V13 GET /api/v1/epidemic-report（M370 收官）
  ...medicalQualityV13Routes, // M371-A：医疗质量 V13 GET /api/v1/medical-quality
  ...medicalSafetyV13Routes, // M371-B：医疗安全 V13 GET /api/v1/medical-safety
  ...surgeryQualityV13Routes, // M371-C：手术质量 V13 GET /api/v1/surgery-quality
  ...anesthesiaQualityV13Routes, // M371-D：麻醉质量 V13 GET /api/v1/anesthesia-quality（M371 收官）
  ...outpatientServiceV13Routes, // M372-A：门诊服务 V13 GET /api/v1/outpatient-service
  ...emergencyServiceV13Routes, // M372-B：急诊服务 V13 GET /api/v1/emergency-service
  ...outpatientQualityV13Routes, // M372-C：门诊质量 V13 GET /api/v1/outpatient-quality
  ...greenChannelV13Routes, // M372-D：绿色通道 V13 GET /api/v1/green-channel（M372 收官）
  ...inpatientServiceV13Routes, // M373-A：住院服务 V13 GET /api/v1/inpatient-service
  ...bedManagementV13Routes, // M373-B：床位管理 V13 GET /api/v1/bed-management
  ...inpatientQualityV13Routes, // M373-C：住院质量 V13 GET /api/v1/inpatient-quality
  ...dischargeFollowupV13Routes, // M373-D：出院随访 V13 GET /api/v1/discharge-followup（M373 收官）
  ...examinationServiceV13Routes, // M374-A：检查服务 V13 GET /api/v1/examination-service
  ...labServiceV13Routes, // M374-B：检验服务 V13 GET /api/v1/lab-service
  ...pathologyServiceV13Routes, // M374-C：病理服务 V13 GET /api/v1/pathology-service
  ...radiologyQualityV13Routes, // M374-D：影像质量 V13 GET /api/v1/radiology-quality（M374 收官）
  ...insuranceSettlementDetailV13Routes, // M375-A：医保结算明细 V13 GET /api/v1/insurance-settlement-detail（detail 避让）
  ...medicalCostControlV13Routes, // M375-B：费用控制 V13 GET /api/v1/medical-cost-control
  ...DRGmanagementV13Routes, // M375-C：DRG 管理 V13 GET /api/v1/drg-management
  ...priceManagementV13Routes, // M375-D：价格管理 V13 GET /api/v1/price-management（M375 收官）
  ...nursingServiceV13Routes, // M376-A：护理服务 V13 GET /api/v1/nursing-service
  ...nursingDocumentStatsV13Routes, // M376-B：护理文书统计 V13 GET /api/v1/nursing-document-stats（stats 避让）
  ...nursingSensitiveIndexV13Routes, // M376-C：护理敏感指标 V13 GET /api/v1/nursing-sensitive-index
  ...nursingManagementV13Routes, // M376-D：护理管理 V13 GET /api/v1/nursing-management（M376 收官）
  ...logisticsServiceV13Routes, // M377-A：后勤服务 V13 GET /api/v1/logistics-service
  ...equipmentMgmtV13Routes, // M377-B：设备管理 V13 GET /api/v1/equipment-mgmt
  ...energyMgmtV13Routes, // M377-C：能源管理 V13 GET /api/v1/energy-mgmt
  ...environmentMgmtV13Routes, // M377-D：环境管理 V13 GET /api/v1/environment-mgmt（M377 收官）
  ...appointmentStatsV13Routes, // M378-A：预约服务统计 V13 GET /api/v1/appointment-stats（stats 避让）
  ...guideServiceV13Routes, // M378-B：导医服务 V13 GET /api/v1/guide-service
  ...volunteerServiceV13Routes, // M378-C：志愿服务 V13 GET /api/v1/volunteer-service
  ...convenienceServiceV13Routes, // M378-D：便民服务 V13 GET /api/v1/convenience-service（M378 收官）
  ...securityIncidentStatsV13Routes, // M379-A：安全事件统计 V13 GET /api/v1/security-incident-stats（stats 避让）
  ...backupMgmtV13Routes, // M379-B：备份管理 V13 GET /api/v1/backup-mgmt
  ...systemAvailabilityDetailV13Routes, // M379-C：系统可用性明细 V13 GET /api/v1/system-availability-detail（detail 避让）
  ...dataQualityDetailV13Routes, // M379-D：数据质量明细 V13 GET /api/v1/data-quality-detail（detail 避让，M379 收官）
  ...drugPreparationV13Routes, // M380-A：制剂管理 V13 GET /api/v1/drug-preparation
  ...clinicalPharmacyV13Routes, // M380-B：临床药学 V13 GET /api/v1/clinical-pharmacy
  ...drugStorageV13Routes, // M380-C：药库管理 V13 GET /api/v1/drug-storage
  ...TCMpharmacyV13Routes, // M380-D：中药房 V13 GET /api/v1/tcm-pharmacy（M380 收官）
  ...operationDashboardV13Routes, // M381-A：运营看板 V13 GET /api/v1/operation-dashboard
  ...financeDetailV13Routes, // M381-B：财务明细 V13 GET /api/v1/finance-detail
  ...patientFlowDetailV13Routes, // M381-C：患者流明细 V13 GET /api/v1/patient-flow-detail
  ...resourceUtilDetailV13Routes, // M381-D：资源利用明细 V13 GET /api/v1/resource-util-detail（M381 收官）
  ...insuranceClaimV13Routes, // M382-A：医保申报 V13 GET /api/v1/insurance-claim
  ...insuranceAuditStatsV13Routes, // M382-B：医保审核统计 V13 GET /api/v1/insurance-audit-stats（stats 避让）
  ...DRGgroupStatsV13Routes, // M382-C：DRG分组统计 V13 GET /api/v1/drg-group-stats（stats 避让）
  ...priceMonitorV13Routes, // M382-D：价格监控 V13 GET /api/v1/price-monitor（M382 收官）
  ...researchProjectStatsV13Routes, // M383-A：科研项目统计 V13 GET /api/v1/research-project-stats（stats 避让）
  ...teachingActivityV13Routes, // M383-B：教学活动 V13 GET /api/v1/teaching-activity
  ...residentTrainingStatsV13Routes, // M383-C：住培管理统计 V13 GET /api/v1/resident-training-stats（stats 避让）
  ...academicExchangeStatsV13Routes, // M383-D：学术交流统计 V13 GET /api/v1/academic-exchange-stats（stats 避让，M383 收官）
  ...staffRecruitmentV13Routes, // M384-A：人员招聘 V13 GET /api/v1/staff-recruitment
  ...staffRetentionV13Routes, // M384-B：人员留存 V13 GET /api/v1/staff-retention
  ...performanceEvalV13Routes, // M384-C：绩效考核 V13 GET /api/v1/performance-eval
  ...trainingPlanV13Routes, // M384-D：培训计划 V13 GET /api/v1/training-plan（M384 收官）
  ...logisticsSupportV13Routes, // M385-A：后勤保障 V13 GET /api/v1/logistics-support
  ...equipmentMaintenanceStatsV13Routes, // M385-B：设备维护统计 V13 GET /api/v1/equipment-maintenance-stats（stats 避让）
  ...energyMgmtDetailV13Routes, // M385-C：能源管理明细 V13 GET /api/v1/energy-mgmt-detail
  ...safetyProductionV13Routes, // M385-D：安全生产 V13 GET /api/v1/safety-production（M385 收官）
  ...patientExperienceStatsV13Routes, // M386-A：患者体验统计 V13 GET /api/v1/patient-experience-stats（stats 避让）
  ...serviceQualityV13Routes, // M386-B：服务质量 V13 GET /api/v1/service-quality
  ...clinicalPathwayStatsV13Routes, // M386-D：临床路径统计 V13 GET /api/v1/clinical-pathway-stats（stats 避让，M386 收官）
  ...coreSystemComplianceV13Routes, // M387-A：核心制度落实 V13 GET /api/v1/core-system-compliance
  ...handoverMgmtV13Routes, // M387-B：交接班管理 V13 GET /api/v1/handover-mgmt
  ...informedConsentStatsV13Routes, // M387-C：知情同意统计 V13 GET /api/v1/informed-consent-stats（stats 避让）
  ...adverseEventReportV13Routes, // M387-D：不良事件上报 V13 GET /api/v1/adverse-event-report（M387 收官）
  ...prescriptionReviewStatsV13Routes, // M388-A：处方点评统计 V13 GET /api/v1/prescription-review-stats（stats 避让）
  ...antibioticUsageV13Routes, // M388-B：抗菌药物使用 V13 GET /api/v1/antibiotic-usage
  ...drugAllergyMgmtV13Routes, // M388-C：药品过敏管理 V13 GET /api/v1/drug-allergy-mgmt
  ...emergencyDrugMgmtV13Routes, // M388-D：急救药品管理 V13 GET /api/v1/emergency-drug-mgmt（M388 收官）
  ...nursingCareQualityV13Routes, // M389-A：护理质量 V13 GET /api/v1/nursing-care-quality
  ...nursingInfectionControlV13Routes, // M389-B：护理感控 V13 GET /api/v1/nursing-infection-control
  ...nursingEducationV13Routes, // M389-C：护理教育 V13 GET /api/v1/nursing-education
  ...nursingStaffingStatsV13Routes, // M389-D：护理人力统计 V13 GET /api/v1/nursing-staffing-stats（stats 避让，M389 收官）
  ...appointmentMgmtV13Routes, // M390-A：预约管理 V13 GET /api/v1/appointment-mgmt
  ...triageMgmtV13Routes, // M390-B：分诊管理 V13 GET /api/v1/triage-mgmt
  ...outpatientPharmacyV13Routes, // M390-C：门诊药房 V13 GET /api/v1/outpatient-pharmacy
  ...emergencySeverityV13Routes, // M390-D：急诊分级 V13 GET /api/v1/emergency-severity（M390 收官）
  ...surgeryProcessV13Routes, // M391-A：手术过程 V13 GET /api/v1/surgery-process
  ...anesthesiaDetailV13Routes, // M391-B：麻醉质量 V13 GET /api/v1/anesthesia-detail
  ...perioperativeMgmtV13Routes, // M391-C：围手术期 V13 GET /api/v1/perioperative-mgmt
  ...instrumentMgmtV13Routes, // M391-D：器械管理 V13 GET /api/v1/instrument-mgmt（M391 收官）
  ...labQualityControlV13Routes, // M392-A：检验质控 V13 GET /api/v1/lab-quality-control
  ...imagingQualityControlV13Routes, // M392-B：影像质控 V13 GET /api/v1/imaging-quality-control
  ...pathologyQualityControlV13Routes, // M392-C：病理质控 V13 GET /api/v1/pathology-quality-control
  ...bloodMgmtDetailV13Routes, // M392-D：输血管理 V13 GET /api/v1/blood-mgmt-detail（M392 收官）
  ...handHygieneDetailV13Routes, // M393-A：手卫生明细 V13 GET /api/v1/hand-hygiene-detail（避让旧版 handHygieneV13）
  ...isolationMgmtV13Routes, // M393-B：隔离管理 V13 GET /api/v1/isolation-mgmt
  ...medicalWasteMgmtV13Routes, // M393-C：医疗废物 V13 GET /api/v1/medical-waste-mgmt
  ...vaccinationMgmtV13Routes, // M393-D：疫苗接种 V13 GET /api/v1/vaccination-mgmt（M393 收官）
  ...fallPreventionV13Routes, // M394-A：跌倒预防 V13 GET /api/v1/fall-prevention
  ...pressureUlcerMgmtV13Routes, // M394-B：压疮管理 V13 GET /api/v1/pressure-ulcer-mgmt
  ...patientIdentificationV13Routes, // M394-C：患者身份识别 V13 GET /api/v1/patient-identification
  ...medicationSafetyV13Routes, // M394-D：用药安全 V13 GET /api/v1/medication-safety（M394 收官）
  ...smartHospitalGradeV13Routes, // M395-A：智慧医院分级 V13 GET /api/v1/smart-hospital-grade（避让旧版 smartHospitalRatingV13）
  ...gradeReviewV13Routes, // M395-B：等级评审 V13 GET /api/v1/grade-review
  ...qualityMgmtSystemV13Routes, // M395-C：质量管理体系 V13 GET /api/v1/quality-mgmt-system
  ...performanceMgmtV13Routes, // M395-D：绩效管理 V13 GET /api/v1/performance-mgmt（M395 收官）
  ...bedUtilizationV13Routes, // M396-A：床位利用 V13 GET /api/v1/bed-utilization
  ...revenueStructureDetailV13Routes, // M396-B：收入结构明细 V13 GET /api/v1/revenue-structure-detail（避让旧版 revenueStructureV13/revenueStructureStatsV13）
  ...costControlDetailV13Routes, // M396-C：成本控制明细 V13 GET /api/v1/cost-control-detail（避让旧版 costControlV13/medicalCostControlV13）
  ...efficiencyIndicatorV13Routes, // M396-D：效率指标 V13 GET /api/v1/efficiency-indicator（M396 收官）
  ...disciplineConstructionV13Routes, // M397-A：学科建设 V13 GET /api/v1/discipline-construction
  ...talentDevelopmentV13Routes, // M397-B：人才发展 V13 GET /api/v1/talent-development
  ...clinicalResearchDetailV13Routes, // M397-C：临床研究明细 V13 GET /api/v1/clinical-research-detail（避让旧版 clinicalResearchV13/clinicalResearchStatsV13）
  ...continuingEducationDetailV13Routes, // M397-D：继续教育明细 V13 GET /api/v1/continuing-education-detail（M397 收官，避让旧版 continuingEducationV13/continuingEducationStatsV13）
  ...complaintMgmtDetailV13Routes, // M398-A：投诉管理明细 V13 GET /api/v1/complaint-mgmt-detail（避让旧版 complaintMgmtV13/complaintMgmtStatsV13）
  ...medicalDisputeV13Routes, // M398-B：医疗纠纷 V13 GET /api/v1/medical-dispute
  ...medicalInsuranceDetailV13Routes, // M398-C：医保管理明细 V13 GET /api/v1/medical-insurance-detail
  ...publicRelationV13Routes, // M398-D：公共关系 V13 GET /api/v1/public-relation（M398 收官）
  ...internetHospitalDetailV13Routes, // M399-A：互联网医院明细 V13 GET /api/v1/internet-hospital-detail（避让旧版 internetHospital/internetHospitalStatsV13）
  ...telemedicineDetailV13Routes, // M399-B：远程医疗明细 V13 GET /api/v1/telemedicine-detail（避让旧版 telemedicineV13/telemedicineStatsV13）
  ...onlinePaymentDetailV13Routes, // M399-C：线上支付明细 V13 GET /api/v1/online-payment-detail（避让旧版 onlinePaymentV13）
  ...healthCheckupV13Routes, // M399-D：健康体检 V13 GET /api/v1/health-checkup（M399 收官）
  ...patientServiceV13Routes, // M400-A：患者服务 V13 GET /api/v1/patient-service
  ...satisfactionSurveyDetailV13Routes, // M400-B：满意度调查明细 V13 GET /api/v1/satisfaction-survey-detail（避让旧版 satisfaction-survey）
  ...followUpMgmtV13Routes, // M400-C：随访管理 V13 GET /api/v1/follow-up-mgmt
  ...patientEducationDetailV13Routes, // M400-D：患者教育明细 V13 GET /api/v1/patient-education-detail（M400 收官，避让旧版 patientEducationV13）
  ...medicalRecordV13Routes, // M401-A：病案管理 V13 GET /api/v1/medical-record
  ...dataGovernanceDetailV13Routes, // M401-B：数据治理明细 V13 GET /api/v1/data-governance-detail（避让旧版 dataGovernanceV13/dataGovernanceStatsV13）
  ...statisticsReportV13Routes, // M401-C：统计报表 V13 GET /api/v1/statistics-report
  ...codingQualityV13Routes, // M401-D：编码质量 V13 GET /api/v1/coding-quality（M401 收官）
  ...schedulingMgmtV13Routes, // M402-A：排班管理 V13 GET /api/v1/scheduling-mgmt
  ...dutyRosterV13Routes, // M402-B：值班管理 V13 GET /api/v1/duty-roster
  ...attendanceMgmtV13Routes, // M402-C：考勤管理 V13 GET /api/v1/attendance-mgmt
  ...performanceEvalDetailV13Routes, // M402-D：绩效考核 V13 GET /api/v1/performance-eval-detail（避让旧版 performanceEvalV13 M384，M402 收官）
  ...keySpecialtyMgmtV13Routes, // M403-A：重点专科管理 V13 GET /api/v1/key-specialty-mgmt
  ...talentTeamMgmtV13Routes, // M403-B：人才团队管理 V13 GET /api/v1/talent-team-mgmt
  ...disciplineCompetitionV13Routes, // M403-C：学科竞赛 V13 GET /api/v1/discipline-competition
  ...academicLevelV13Routes, // M403-D：学术水平 V13 GET /api/v1/academic-level（M403 收官）
  ...threeLevelWardRoundV13Routes, // M404-A：三级查房管理 V13 GET /api/v1/three-level-ward-round
  ...consultationMgmtV13Routes, // M404-B：会诊管理 V13 GET /api/v1/consultation-mgmt
  ...caseDiscussionV13Routes, // M404-C：病例讨论 V13 GET /api/v1/case-discussion
  ...gradeNursingV13Routes, // M404-D：分级护理 V13 GET /api/v1/grade-nursing（M404 收官）
  ...nursingRecordQualityV13Routes, // M405-A：护理文书质量 V13 GET /api/v1/nursing-record-quality
  ...nursingCommunicationV13Routes, // M405-B：护患沟通 V13 GET /api/v1/nursing-communication
  ...nursingManagementDetailV13Routes, // M405-C：护理管理明细 V13 GET /api/v1/nursing-management-detail（避让旧版 nursingManagementV13 M376-D）
  ...nursingServiceDetailV13Routes, // M405-D：护理服务明细 V13 GET /api/v1/nursing-service-detail（M405 收官）
  ...pharmacyPrescriptionReviewV13Routes, // M406-A：处方点评 V13 GET /api/v1/pharmacy-prescription-review
  ...pharmacyDrugCatalogV13Routes, // M406-B：药品目录 V13 GET /api/v1/pharmacy-drug-catalog
  ...pharmacyDrugDeliveryV13Routes, // M406-C：药品配送 V13 GET /api/v1/pharmacy-drug-delivery
  ...pharmacyDrugSafetyV13Routes, // M406-D：药品安全 V13 GET /api/v1/pharmacy-drug-safety（M406 收官）
  ...operatingCostMgmtV13Routes, // M407-A：运营成本管理 V13 GET /api/v1/operating-cost-mgmt
  ...revenueGrowthV13Routes, // M407-B：收入增长 V13 GET /api/v1/revenue-growth
  ...profitAnalysisV13Routes, // M407-C：盈亏分析 V13 GET /api/v1/profit-analysis
  ...strategicKpiV13Routes, // M407-D：战略KPI V13 GET /api/v1/strategic-kpi（M407 收官）
  ...medicalDeviceMgmtV13Routes, // M408-A：医疗器械管理 V13 GET /api/v1/medical-device-mgmt
  ...consumableSupplyV13Routes, // M408-B：耗材供应 V13 GET /api/v1/consumable-supply
  ...fireSafetyDetailV13Routes, // M408-C：消防安全明细 V13 GET /api/v1/fire-safety-detail（避让旧版 fireSafetyV13 M352-A）
  ...securityMgmtV13Routes, // M408-D：治安保卫 V13 GET /api/v1/security-mgmt（M408 收官）
  ...informationSystemMgmtV13Routes, // M409-A：信息系统管理 V13 GET /api/v1/information-system-mgmt
  ...dataQualityMgmtV13Routes, // M409-B：数据质量管理 V13 GET /api/v1/data-quality-mgmt
  ...cybersecurityMgmtV13Routes, // M409-C：网络安全管理 V13 GET /api/v1/cybersecurity-mgmt
  ...interopMgmtV13Routes, // M409-D：互联互通管理 V13 GET /api/v1/interop-mgmt（M409 收官）
  ...departmentKpiV13Routes, // M410-A：科室KPI V13 GET /api/v1/department-kpi
  ...individualKpiV13Routes, // M410-B：个人KPI V13 GET /api/v1/individual-kpi
  ...performanceBonusV13Routes, // M410-C：绩效奖金 V13 GET /api/v1/performance-bonus
  ...performanceImprovementV13Routes, // M410-D：绩效改进 V13 GET /api/v1/performance-improvement（M410 收官）
  ...criticalValueMgmtV13Routes, // M411-A：危急值管理 V13 GET /api/v1/critical-value-mgmt
  ...readmissionMgmtV13Routes, // M411-B：再入院管理 V13 GET /api/v1/readmission-mgmt
  ...inpatientTransferMgmtV13Routes, // M411-C：转科转院管理 V13 GET /api/v1/inpatient-transfer-mgmt
  ...dischargeSummaryMgmtV13Routes, // M411-D：出院小结管理 V13 GET /api/v1/discharge-summary-mgmt（M411 收官）
  ...deathReportMgmtV13Routes, // M412-A：死亡病例管理 V13 GET /api/v1/death-report-mgmt
  ...newbornMgmtV13Routes, // M412-B：新生儿管理 V13 GET /api/v1/newborn-mgmt
  ...maternalMgmtV13Routes, // M412-C：孕产妇管理 V13 GET /api/v1/maternal-mgmt
  ...infectionReportMgmtV13Routes, // M412-D：院感报告管理 V13 GET /api/v1/infection-report-mgmt（M412 收官）
  ...medicalRecordMgmtV13Routes, // M413-A：病案质量管理 V13 GET /api/v1/medical-record-mgmt
  ...informedConsentDetailV13Routes, // M413-B：知情同意管理（细节）V13 GET /api/v1/informed-consent-detail（detail 避让旧版 informedConsentStatsV13）
  ...handoverDetailV13Routes, // M413-C：交接班管理（细节）V13 GET /api/v1/handover-detail（detail 避让旧版 handoverMgmtV13）
  ...adverseEventDetailV13Routes, // M413-D：不良事件管理（细节）V13 GET /api/v1/adverse-event-detail（M413 收官，detail 避让旧版 adverseEventReportV13）
  ...bloodTransfusionMgmtV13Routes, // M414-A：输血管理 V13 GET /api/v1/blood-transfusion-mgmt
  ...clinicalPathwayDetailV13Routes, // M414-B：临床路径管理（细节）V13 GET /api/v1/clinical-pathway-detail（detail 避让旧版 clinicalPathwayMgmtV13）
  ...antibioticMgmtDetailV13Routes, // M414-C：抗菌药物管理（细节）V13 GET /api/v1/antibiotic-mgmt-detail（detail 避让旧版 antibioticUseDensityV13）
  ...vtePreventionMgmtV13Routes, // M414-D：VTE 预防管理 V13 GET /api/v1/vte-prevention-mgmt（M414 收官）
  ...rescueMgmtV13Routes, // M415-A：抢救管理 V13 GET /api/v1/rescue-mgmt
  ...medicalImagingDetailV13Routes, // M415-B：医学影像管理（细节）V13 GET /api/v1/medical-imaging-detail（detail 避让旧版 imagingTurnaroundV13）
  ...pathologyMgmtV13Routes, // M415-C：病理管理 V13 GET /api/v1/pathology-mgmt
  ...nutritionMgmtV13Routes, // M415-D：营养管理 V13 GET /api/v1/nutrition-mgmt（M415 收官）
  ...icuMgmtV13Routes, // M416-A：ICU 管理 V13 GET /api/v1/icu-mgmt
  ...erMgmtV13Routes, // M416-B：急诊管理 V13 GET /api/v1/er-mgmt
  ...outpatientMgmtDetailV13Routes, // M416-C：门诊管理（细节）V13 GET /api/v1/outpatient-mgmt-detail（detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
  ...inpatientMgmtDetailV13Routes, // M416-D：住院管理（细节）V13 GET /api/v1/inpatient-mgmt-detail（M416 收官，detail 避让旧版 inpatientBedMgmtV13）
  ...dialysisMgmtV13Routes, // M417-A：血液透析管理 V13 GET /api/v1/dialysis-mgmt
  ...endoscopyMgmtV13Routes, // M417-B：内镜管理 V13 GET /api/v1/endoscopy-mgmt
  ...operationRoomMgmtV13Routes, // M417-C：手术室管理 V13 GET /api/v1/operation-room-mgmt
  ...wardMgmtDetailV13Routes, // M417-D：病房管理（细节）V13 GET /api/v1/ward-mgmt-detail（M417 收官，detail 避让旧版 inpatientBedMgmtV13）
  ...pharmacyMgmtDetailV13Routes, // M418-A：药事管理（细节）V13 GET /api/v1/pharmacy-mgmt-detail（detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
  ...medicalEquipmentMgmtDetailV13Routes, // M418-B：医疗设备管理（细节）V13 GET /api/v1/medical-equipment-mgmt-detail（detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
  ...infectionControlDetailV13Routes, // M418-C：院感控制（细节）V13 GET /api/v1/infection-control-detail（detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
  ...patientSafetyMgmtV13Routes, // M418-D：患者安全管理 V13 GET /api/v1/patient-safety-mgmt（M418 收官）
  ...medicalRecordDetailV13Routes, // M419-A：病案管理（细节）V13 GET /api/v1/medical-record-detail（detail 避让旧版 medicalRecordMgmtV13）
  ...informationSecurityMgmtV13Routes, // M419-B：信息安全管理 V13 GET /api/v1/information-security-mgmt
  ...trainingMgmtDetailV13Routes, // M419-C：培训管理（细节）V13 GET /api/v1/training-mgmt-detail（detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
  ...qualityControlMgmtV13Routes, // M419-D：质控管理 V13 GET /api/v1/quality-control-mgmt（M419 收官）
  ...medicalRecordArchiveMgmtV13Routes, // M420-A：病案归档管理 V13 GET /api/v1/medical-record-archive-mgmt（archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
  ...healthEducationMgmtV13Routes, // M420-B：健康教育管理 V13 GET /api/v1/health-education-mgmt
  ...medicalEthicsMgmtV13Routes, // M420-C：医学伦理管理 V13 GET /api/v1/medical-ethics-mgmt
  ...medicalSocialWorkMgmtV13Routes, // M420-D：医务社工管理 V13 GET /api/v1/medical-social-work-mgmt（M420 收官）
  ...infectionSurveillanceDetailV13Routes, // M421-A：院感监测（细节）V13 GET /api/v1/infection-surveillance-detail（detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
  ...antibioticUsageMgmtV13Routes, // M421-B：抗菌药物使用管理 V13 GET /api/v1/antibiotic-usage-mgmt（换名避让旧版 antiInfectionDetailV13）
  ...bloodTransfusionDetailV13Routes, // M421-C：输血管理（细节）V13 GET /api/v1/blood-transfusion-detail（detail 避让旧版 bloodTransfusionMgmtV13）
  ...clinicalPathwayMgmtV13Routes, // M421-D：临床路径管理 V13 GET /api/v1/clinical-pathway-mgmt（M421 收官，换名避让旧版 clinicalPathwayDetailV13）
  ...vtePreventionDetailV13Routes, // M422-A：VTE 预防管理（细节）V13 GET /api/v1/vte-prevention-detail（detail 避让旧版 vtePreventionMgmtV13）
  ...pressureUlcerDetailV13Routes, // M422-B：压疮管理（细节）V13 GET /api/v1/pressure-ulcer-detail（detail 避让旧版 pressureUlcerMgmtV13（M394-B））
  ...fallMgmtV13Routes, // M422-C：跌倒管理 V13 GET /api/v1/fall-mgmt
  ...restraintMgmtV13Routes, // M422-D：身体约束管理 V13 GET /api/v1/restraint-mgmt（M422 收官）
  ...handHygieneAuditV13Routes, // M423-A：手卫生督查 V13 GET /api/v1/hand-hygiene-audit（换名避让旧版 handHygieneComplianceV13（M418））
  ...isolationDetailV13Routes, // M423-B：隔离管理（细节）V13 GET /api/v1/isolation-detail（detail 避让旧版 isolationMgmtV13（M393-B））
  ...sterilizationMgmtV13Routes, // M423-C：消毒灭菌管理 V13 GET /api/v1/sterilization-mgmt
  ...medicalWasteTrackingV13Routes, // M423-D：医废追溯管理 V13 GET /api/v1/medical-waste-tracking（M423 收官，换名避让旧版 infectionControlDetailV13（M418））
  ...medicationErrorReportV13Routes, // M424-A：用药错误上报 V13 GET /api/v1/medication-error-report（换名避让旧版 patientSafetyMgmtV13（M418））
  ...highAlertMedMgmtV13Routes, // M424-B：高危药品管理 V13 GET /api/v1/high-alert-med-mgmt
  ...infusionDetailV13Routes, // M424-C：输液管理（细节）V13 GET /api/v1/infusion-detail（detail 避让旧版 infusionMgmtV13（M359-D））
  ...bloodGlucoseMgmtV13Routes, // M424-D：血糖管理 V13 GET /api/v1/blood-glucose-mgmt（M424 收官）
  ...criticalValueDetailV13Routes, // M425-A：危急值管理（细节）V13 GET /api/v1/critical-value-detail（detail 避让旧版 criticalValueMgmtV13（M411））
  ...handoverCommunicationMgmtV13Routes, // M425-B：交接班沟通管理 V13 GET /api/v1/handover-communication-mgmt（换名避让旧版 handoverDetailV13（M413））
  ...consentMgmtV13Routes, // M425-C：知情同意管理 V13 GET /api/v1/consent-mgmt（换名避让旧版 consentDetailV13（M413））
  ...privacyMgmtV13Routes, // M425-D：隐私保护管理 V13 GET /api/v1/privacy-mgmt（M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
  ...rescueRecordMgmtV13Routes, // M426-A：抢救记录管理 V13 GET /api/v1/rescue-record-mgmt（换名避让旧版 rescueMgmtV13（M415））
  ...anesthesiaRecordMgmtV13Routes, // M426-B：麻醉记录管理 V13 GET /api/v1/anesthesia-record-mgmt（换名避让旧版 anesthesiaComplicationV13（M339））
  ...safetyCheckMgmtV13Routes, // M426-C：安全核查管理 V13 GET /api/v1/safety-check-mgmt（换名避让旧版 surgeryVolumeV13（M339））
  ...wardEnvironmentMgmtV13Routes, // M426-D：病房环境管理 V13 GET /api/v1/ward-environment-mgmt（M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
  ...dischargeSummaryDetailV13Routes, // M427-A：出院小结管理（细节）V13 GET /api/v1/discharge-summary-detail（detail 避让旧版 dischargeSummaryMgmtV13（M411））
  ...transferDetailV13Routes, // M427-B：转科管理（细节）V13 GET /api/v1/transfer-detail（detail 避让旧版 transferMgmtV13（M411））
  ...readmissionAnalysisMgmtV13Routes, // M427-C：再入院分析管理 V13 GET /api/v1/readmission-analysis-mgmt（换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
  ...deathCaseDetailV13Routes, // M427-D：死亡病例管理（细节）V13 GET /api/v1/death-case-detail（M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
  ...neonatalCareMgmtV13Routes, // M428-A：新生儿护理管理 V13 GET /api/v1/neonatal-care-mgmt（换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
  ...maternalCareMgmtV13Routes, // M428-B：孕产妇护理管理 V13 GET /api/v1/maternal-care-mgmt（换名避让旧版 maternalMgmtV13（M412，-care 后缀））
  ...emergencyCareMgmtV13Routes, // M428-C：急诊护理管理 V13 GET /api/v1/emergency-care-mgmt（换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
  ...icuCareMgmtV13Routes, // M428-D：ICU 护理管理 V13 GET /api/v1/icu-care-mgmt（M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
  ...dialysisQualityMgmtV13Routes, // M429-A：透析质量管理 V13 GET /api/v1/dialysis-quality-mgmt（-quality 后缀避让旧版 dialysisMgmtV13（M417））
  ...endoscopyQualityMgmtV13Routes, // M429-B：内镜质量管理 V13 GET /api/v1/endoscopy-quality-mgmt（-quality 后缀避让旧版 endoscopyMgmtV13（M417））
  ...operatingRoomQualityMgmtV13Routes, // M429-C：手术室质量管理 V13 GET /api/v1/operating-room-quality-mgmt（-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
  ...wardQualityMgmtV13Routes, // M429-D：病房质量管理 V13 GET /api/v1/ward-quality-mgmt（M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
  ...talentDeepRoutes, // M166-B：【绩效与人才】人才盘点 GET /api/v1/admin/talent/inventory（画像/缺口/培训/继任）
  ...emergencyDeepRoutes, // M172-A：【安全质量与运营】应急管理深化 GET /api/v1/admin/emergency/deep（十类预案/风险/演练排期/物资/响应自动化）
  ...qualityDeepRoutes, // M172-B：【安全质量与运营】质量与安全深化 GET /api/v1/admin/quality/deep（国家口径指标/趋势外推/风险/改进）
  ...qualitySafetyRoutes, // M180-A：【质量与体验】质量与安全深化 GET /api/v1/quality/deep（国考/电子病历五级/互联互通四甲/十大安全目标/PDCA·QCC·DMAIC·Lean/三甲证据链）
  ...selfLearningRoutes, // M146-D：推荐策略自学习 POST /optimize + GET /log
  ...hospitalKpiRoutes, // M147-C：三级公立医院绩效考核（国考）GET /api/v1/admin/kpi
  ...patientEducationRoutes, // M147-B：患者健康教育 GET /api/v1/patient/education + POST /push
  ...referralKnowledgeRoutes,
  ...crossDeptKnowledgeRoutes,
  ...federatedKnowledgeRoutes,
  ...knowledgeFederationRoutes, // M146-C：跨科室知识联邦 GET /api/v1/knowledge/federate
  ...museSearchRoutes,
  ...museAskRoutes,
  ...museRecommendRoutes,
  ...smokeTestRoutes,
  ...e2eTestRoutes, // M137-D：GET /api/v1/admin/test/e2e 关键业务流程 E2E
  ...coverageReportRoutes, // M150-A：GET /api/v1/admin/test/coverage（90% 冲刺报告，先于旧 testCoverage 路由命中）
  ...coverageDetailRoutes, // M151-A：GET /api/v1/admin/test/coverage/detailed（函数级缺口定位）
  ...coverageGapRoutes, // M173-A：GET /api/v1/admin/test/coverage-gap（99%→99.5%+ 缺口/计划/进度）
  ...coverageFixRoutes, // 【v5.0启动】M182-B：GET /api/v1/admin/test/coverage-fix（输血/医保/药事缺口识别→补测→复验）
  ...milestoneRoutes, // 【200版本里程碑】M157-A：GET /api/v1/admin/milestone/summary（仅 admin）
  ...milestoneV2Routes, // 【300版本里程碑】M181-A：GET /api/v1/admin/milestone/v2（仅 admin）
  ...testCoverageRoutes,
  ...errorSanitizerRoutes, // M136-A：GET /api/v1/admin/test/security（错误脱敏 green）
  ...securityReportRoutes, // M149-B：GET /api/v1/admin/security/report（七项安全基线）
  ...securityComplianceRoutes, // M163-A：GET /api/v1/admin/security/compliance（等保三级）
  ...securityRecheckRoutes, // M174-A：GET /api/v1/admin/security/recheck（等保三级复查）
  ...eSignatureRoutes, // M138-B：电子签名 POST /sign + GET /verify/:id
  ...imRoutes, // M138-C：医院内部即时通讯 send / conversation / unread-count
  ...oaApprovalRoutes, // M139-A：OA 多级审批 POST/GET/PUT /api/v1/oa/approvals
  ...partyUnionRoutes, // M140-D：党建工会活动留痕 GET/POST /api/v1/admin/party-union
  ...partyCultureRoutes, // M178-D：【财务人力行政党建】党建与文化深化 GET /api/v1/party/culture
  ...jciReviewRoutes, // M141-A：三甲评审准备 GET /api/v1/admin/review/checklist
  ...performanceBenchmarkRoutes,
  ...museOnboardingRoutes,
  ...onboardingRoutes,
  ...museNurseRoutes,
  ...nurseMuseRoutes, // M169-C：护士 Personal Agent 深化（画像/推荐/成长）
  ...museHospitalRoutes,
  ...musePharmaRoutes,
  ...museAdminRoutes,
  ...museMonthlyReportRoutes,
  ...statReportRoutes,
  ...musePatternsRoutes,
  ...museGrowthRoutes,
  ...patientMuseRoutes,
  ...museDeptCurveRoutes,
  ...doctorMuseRoutes, // M169-B：GET /api/v1/doctor/muse/:staffId 医生个人智能体（本人经验沉淀，隐私安全）
  ...helpCenterRoutes,
  ...apiDocsRoutes,
  ...adminRecordAuditRoutes,
  ...userManualRoutes,
  ...emrSmartScoreRoutes, // M154-B：电子病历智能化评分 POST /api/v1/emr/score（六维100分，重实质不抠格式）
  ...opsForecastRoutes, // M154-C：【AI深化与运营预测】GET /api/v1/admin/forecast（移动平均+季节因子+趋势外推，含残差置信区间）
  ...integrationHl7Routes, // M155-C：【系统集成深化】HL7 v2.x/FHIR R4 接口 POST /api/v1/integration/hl7/parse + /fhir/build（|^~\& 分隔，FHIR R4 Patient/Observation/MedicationRequest）
  ...integrationDeepRoutes, // M174-B：【系统集成深化·二期】标准接口扩展 POST /api/v1/integration/deep/parse（HL7 ADT^A08/ORM^O02/ORU^R30 + FHIR R4 Encounter/Condition + DICOM SOP + LIS 双向）
  ...patientServiceDeepRoutes, // M156-D：【患者服务深化】一站式服务中心（老人友好六卡片）GET /api/v1/patient/service
  ...patientExperienceRoutes, // M180-C：【质量与体验】患者体验深化（四大维度度量+痛点识别+改进闭环）GET /api/v1/patient/experience
  ...researchDeepRoutes, // M162-C：【科研管理深化】科研全生命周期 GET /api/v1/research/projects?dept= + PUT /api/v1/research/projects/:id/milestone
  ...researchPipelineRoutes, // M171-A：【科研教学后勤】科研全流程辅助 POST /api/v1/research/full-pipeline（七步/样本量/统计推荐/偏倚识别）
  ...apiGatewayRoutes, // M164-D：【数据中台与AI大脑】API 网关 POST /api/v1/api-gateway/route + /external
  ...budgetDeepRoutes, // M165-B：【CDSS与运营精细化】GET /api/v1/admin/budget?dept=&year=（预算编制/执行跟踪/超支预测/结构优化）
  ...performanceDeepRoutes, // M166-A：【绩效与人才】GET /api/v1/admin/performance/kpi?dept=&period=（五维十三项加权百分制/全院对标/差距识别）
  ...opsPredictRoutes, // M168-B：【AI深化与智能运营】GET /api/v1/admin/ops/predict（门诊/床位预测含95%置信区间）+ POST /api/v1/admin/ops/schedule-optimize（手术排程+资源调配）
  ...opsDeepRoutes, // M172-C：【安全质量与运营】GET /api/v1/admin/ops/deep?dept=&period=（四域效率评分/标杆对标/瓶颈识别）
  ...opsAnalysisRoutes, // M180-B：【质量与体验】GET /api/v1/admin/ops/analysis?dept=&period=（多期趋势/对标/未来N期线性回归预测）
  ...patientJourneyRoutes, // M168-C：【AI深化与智能运营】患者全旅程管理 GET /api/v1/patient/journey/:patientId（八节点时间线/瓶颈/流程优化/满意度预测）
  ...patientDeepRoutes, // M172-D：【安全质量与运营】患者服务与体验深化 GET /api/v1/patient/deep（智能导诊/院内导航/智慧门诊/智慧住院，老人也能用）
  ...pharmacyDeepRoutes, // M173-C：【质量提升与新场景】医院智能药房深化 GET /api/v1/pharmacy/smart（智能摆药/智能审方/智能库存/智能用药，摆药四码复核真减差错）
  ...bloodDeepRoutes, // M176-D：【临床核心深化】医院输血管理深化 GET /api/v1/blood/deep（适应症/前评估/过程监测/后评价，零差错人命关天）
  ...antibioticDeepRoutes, // M176-B：【临床核心深化】医院抗菌药物管理深化 GET /api/v1/pharmacy/antibiotic/deep（分级/使用率/AUD/送检率/合理性评价，国卫办医发〔2015〕42号口径）
  ...infectionDeepRoutes, // M179-B：【护理院感医保药事】医院院感管理深化 GET /api/v1/infection/deep（手卫生依从率/72h聚集预警/同源性/四类国家指标，WS/T 312·313 口径）
  ...adminMuseRoutes, // M169-D：【知识图谱与Personal Agent】管理员个人管理智能体 GET /api/v1/admin/muse/:staffId
  ...officeDeepRoutes, // M178-C：【财务人力行政党建】GET /api/v1/admin/office（公文审批流转/会议预订冲突/档案/督办跟踪，节点到人不踢皮球）
  ...pharmacyMgmtRoutes, // M179-D：【护理院感医保药事】医院药事管理深化 GET /api/v1/pharmacy/mgmt（采购四单匹配/库存FEFO/处方点评闭环/ADR 24h上报/不合格隔离退货）
];

interface Compiled {
  method: string;
  regex: RegExp;
  keys: string[];
  def: RouteDef;
}

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re =
    '^' +
    pattern.replace(/:([^/]+)/g, (_m, k: string) => {
      keys.push(k);
      return '([^/]+)';
    }) +
    '$';
  return { regex: new RegExp(re), keys };
}

const compiled: Compiled[] = allRoutes.map((def) => {
  const { regex, keys } = compile(def.path);
  return { method: def.method.toUpperCase(), regex, keys, def };
});

import { startMedmuseScheduler } from './jobs/medmuseScheduler';
startMedmuseScheduler();

// 【生产化收尾】M145-C：系统指标周期采样（内存/CPU + 派生 API 延迟/错误率），
// 超阈值（P95>1s / 错误率>1% / 内存>90%）由仪表盘接口实时评估并告警。
// ============================================================================
// WebSocket�?ws/chat）��?鉴权后升�?// ============================================================================

const chatClients = new Set<Bun.ServerWebSocket<unknown>>();

function broadcast(event: string, payload: unknown, seq?: number): void {
  // seq �?outbox 数字主键（仅经发件箱发布的事件携带），客户端据此重连补拉
  const frame = JSON.stringify({
    event,
    timestamp: Date.now(),
    payload,
    ...(seq !== undefined ? { seq } : {}),
  });
  for (const ws of chatClients) {
    try {
      ws.send(frame);
    } catch {
      chatClients.delete(ws);
    }
  }
}

// 影像 AI critical 发现复用同一 /ws/chat critical:alert 通道推送危急值
setCriticalAlertSink(broadcast);

// M7-C 事务性发件箱中继：业务事务写 event_outbox，Relay 轮询发布到 WebSocket
// publisher 复用 broadcast（同 /ws/chat 通道）；发布失败仅记录，不影响业务事务
const outboxRelay = new OutboxRelay(
  (event, payload, meta) => broadcast(event, payload, meta.seq),
  {
    batchSize: 50,
    pollIntervalMs: 500,
    onPublishError: (ev, err) =>
      // eslint-disable-next-line no-console
      console.error(`[outbox-relay] 发布事件 ${ev.eventType}#${ev.id} 失败:`, err),
  },
);
outboxRelay.start();

/** 校验 WebSocket 升级请求�?Token（query 参数 ?token= �?Sec-WebSocket-Protocol�?*/
function wsAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    (req.headers.get('sec-websocket-protocol') ?? '').replace(/^bearer\./i, '');
  if (!token) return false;
  // JWT 格式
  if (token.split('.').length === 3) return verifyJwt(token) !== null;
  // 弢�发��演�?token
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    return true;
  }
  return false;
}

/** 前端�?/ws/chat 下发的帧（兼�?event / action、顶�?/ payload 两种位置�?*/
interface IncomingFrame {
  event?: string;
  action?: string;
  conversationId?: string;
  content?: string;
  payload?: { conversationId?: string; content?: string };
}

/**
 * agent:start 处理：会话不存在则创建，调用 chatAggregator.runChatTurn 跑真�?LLM�? * 流式增量�?agent:delta 推��，结束�?agent:done（失败推 agent:error）��? * 扢�有消息在 runChatTurn 内部落库�? */
async function handleAgentStart(
  ws: Bun.ServerWebSocket<unknown>,
  frame: IncomingFrame,
): Promise<void> {
  const messageId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  let conversationId = frame.conversationId ?? frame.payload?.conversationId ?? '';
  // 前端 agent:start 通常只带 conversationId；缺省让 LLM 产出真实问候，避免空消息报错
  const content = (frame.payload?.content ?? frame.content ?? '').trim() || '您好，请介绍一下健澜数智医院智能体可以为我提供哪些临床辅助能力。';

  const send = (event: string, payload: unknown): void => {
    try {
      ws.send(JSON.stringify({ event, timestamp: Date.now(), payload }));
    } catch {
      /* ws 已关�?*/
    }
  };

  try {
    // 会话不存在则先创建
    let conv = conversationId ? await getConversationById(conversationId) : null;
    if (!conv) {
      conv = await createConversation({ userId: 'ws-user', title: 'WebSocket 会话' });
      conversationId = conv.id;
      send('agent:conversation', { conversationId });
    }

    const result = await runChatTurn(conversationId, content, {
      onDelta: (delta) =>
        send('agent:delta', { conversationId, messageId, delta, done: false }),
      onToolEvent: (ev) => send('agent:tool', { conversationId, messageId, ...ev }),
    });

    if (result.error) {
      send('agent:error', {
        conversationId,
        messageId,
        code: result.error.code,
        message: result.error.message,
      });
    }
    send('agent:done', { conversationId, messageId });
  } catch (e) {
    send('agent:error', {
      conversationId,
      messageId,
      code: 'AGENT_FAILED',
      message: e instanceof Error ? e.message : String(e),
    });
    send('agent:done', { conversationId, messageId });
  }
}

// ============================================================================
// Fetch 入口
// ============================================================================

async function handleFetch(
  req: Request,
  server: Bun.Server<unknown>,
): Promise<Response | undefined> {
  const url = new URL(req.url);
  const startedAt = Date.now();

  // WebSocket 升级（需鉴权）
  if (url.pathname === '/ws/chat' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    if (!wsAuthorized(req)) {
      return new Response('unauthorized', { status: 401 });
    }
    if (server.upgrade(req, { data: { path: '/ws/chat' } })) return undefined;
    return new Response('upgrade failed', { status: 426 });
  }

  // Prometheus 指标端点。默认依赖内网网络策略隔离（不对公网暴露）；
  // 配置 METRICS_TOKEN 后强制校验 Authorization: Bearer <token>
  if (url.pathname === '/metrics' && req.method === 'GET') {
    const expectedToken = process.env.METRICS_TOKEN;
    if (expectedToken) {
      const auth = req.headers.get('authorization') ?? '';
      if (auth !== `Bearer ${expectedToken}`) {
        return new Response('unauthorized', { status: 401 });
      }
    }
    return new Response(renderMetrics(), {
      status: 200,
      headers: { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' },
    });
  }

  // 预读取请求体（写请求），供幂等指纹与 handler 复用同一份数据
  const mayHaveBody = req.method !== 'GET' && req.method !== 'HEAD';
  const rawBody = mayHaveBody ? await req.text() : null;
  // 直连客户�?IP（Bun 运行时从 socket 解析）；经反向代理时各路由以
  // x-forwarded-for 首段为准，此值仅作直连兜底
  const socketIp = server.requestIP(req)?.address ?? null;
  const ctx: Ctx = newCtx(req, {}, url.searchParams, rawBody, socketIp);
  attachUser(ctx);
  // M7-F：校验会话是否已登出/被吊锢�（异步，�?jti 查会话台账）
  await enforceSession(ctx);

  let status = 200;
  let routeLabel = 'unmatched';
  try {
    // 限流
    const limited = rateLimit(ctx);
    if (limited) {
      status = 429;
      return withSecurityHeaders(limited);
    }

    // CSRF 校验（状态变更请求）
    const csrfDenied = verifyCsrf(ctx);
    if (csrfDenied) {
      status = 403;
      return withSecurityHeaders(csrfDenied);
    }

    // 多租户/院区上下文解析（无显式租户头时回退默认租户；未授权/停用/越权院区短路 403）
    const tenantDenied = tenantContextMiddleware(ctx);
    if (tenantDenied) {
      status = 403;
      return withSecurityHeaders(tenantDenied);
    }

    for (const r of compiled) {
      if (r.method !== req.method.toUpperCase()) continue;
      const m = url.pathname.match(r.regex);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      ctx.params = params;
      routeLabel = r.def.path;

      if (r.def.auth) {
        const denied = requireAuth(ctx);
        if (denied) {
          status = 401;
          return withSecurityHeaders(denied);
        }
      }
      const handler = r.def.handle;
      // 错误处理在外、幂等在内：beginProcessing �?handler 任何阶段抛错
      // 都转结构化错误信封（带 traceId），不返回 HTML 错误页
      const wrapped = withErrorHandler((c: Ctx) =>
        withIdempotency(c, () => handler(c)));
      const res = await wrapped(ctx);
      status = res.status;
      return withSecurityHeaders(res);
    }

    status = 404;
    return withSecurityHeaders(
      json(
        fail(ErrorCode.NOT_FOUND, `路由不存在： `, ctx.traceId),
        404,
      ),
    );
  } finally {
    logRequest(ctx, status, startedAt);
    // 操作审计（POST/PUT/DELETE 才留痕，fire-and-forget，失败不影响主请求）
    auditOperation(ctx);
    recordHttpRequest({
      method: req.method,
      route: routeLabel,
      code: status,
      durationSeconds: (Date.now() - startedAt) / 1000,
    });
    recordSystemHttpRequest();
    // M123-D 性能采样（内存环形缓冲，仅 route 模板 + 状态码，不含 PII）
    recordRequestPerformance(routeLabel, startedAt, Date.now(), status);
  }
}

// ============================================================================
// 数据库初始化（真实模式：连接 + 自动迁移；演示模式：跳过并明确告警）
// ============================================================================

const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

async function initDatabase(): Promise<void> {
  if (isDemoMode) {
    console.warn('[db] DEMO_MODE=1：跳过 PostgreSQL 连接，使用内存演示数据（不持久化）');
    return;
  }
  try {
    await verifyDbConnection(5, 2000);
    console.log('[db] PostgreSQL 连接成功');
    await autoMigrate();
    console.log('[db] 数据库迁移完成');
    // 加载租户/院区注册表到内存（运行时解析保持内存级，写操作写穿透回库））
    const tenantCount = await tenantService.hydrate();
    console.log(`[db] 租户/院区注册表已加载�?{tenantCount} 个节点）`);
  } catch (err) {
    console.error('[db] 数据库初始化失败，服务无法启动：', String(err));
    console.error('[db] 如需无 DB 演示，请设置 DEMO_MODE=1');
    process.exit(1);
  }
}

// ============================================================================
// 启动
// ============================================================================

const port = Number(process.env.HTTP_PORT ?? 8080);

// 启动横幅：明确打印 DEMO_MODE 状态，便于运维在日志第一行识别运行模式
// eslint-disable-next-line no-console
console.log(
  `[jianlan-bff] starting  nodeEnv=${(process.env.NODE_ENV ?? 'development')}  ` +
    `DEMO_MODE=${getEnv().demoMode ? 'ON (内存演示数据，不连 PG)' : 'OFF (连 PostgreSQL)'}`,
);

void initDatabase().then(() => {
  // eslint-disable-next-line no-console
  console.log(
    `[jianlan-bff] listening on http://0.0.0.0:${port}  (WebSocket /ws/chat [auth required])`,
  );
});

startSystemMetricSampler();

const server = Bun.serve({
  port,
  async fetch(req, bunServer) {
    return (await handleFetch(req, bunServer)) ?? new Response(null, { status: 101 });
  },
  websocket: {
    open(ws) {
      chatClients.add(ws);
      metrics.wsConnections.inc();
    },
    message(ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) {
      let parsed: IncomingFrame = {};
      try {
        parsed = JSON.parse(String(raw)) as IncomingFrame;
      } catch {
        /* ignore */
      }
      // 兼容前端事件帧（event）与早期 action
      const kind = parsed.event ?? parsed.action;

      if (kind === 'heartbeat' || kind === 'ping') {
        ws.send(
          JSON.stringify({ event: 'heartbeat', timestamp: Date.now(), payload: { ok: true } }),
        );
        return;
      }

      if (kind === 'agent:start' || kind === 'start_stream') {
        // 真实 LLM 流式：会话不存在则创建，runChatTurn 内部落库并回调推送
        void handleAgentStart(ws, parsed);
      }
    },
    close(ws) {
      chatClients.delete(ws);
      metrics.wsConnections.dec();
    },
  },
});

// 演示用：非生产环境周期性推送模拟危急值告警
const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
const demoAlertTimer = isProduction || isDemoMode
  ? null
  : setInterval(() => {
      broadcast('critical:alert', {
        id: 'al-demo-critical-cTni',
        type: 'critical-value',
        level: 'critical',
        title: '肌钙蛋白危急值',
        content: '患者（P100086）cTnI 升高达危急值，请立即复核并按危急值流程处置（10 分钟内处理 + 双人复核 + 系统登记）',
        patientId: 'P100086',
        patientName: '张*',
        createdAt: new Date().toISOString(),
        acknowledged: false,
      });
    }, 30_000);

// 优雅停机
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[jianlan-bff] 收到 ${signal}，开始优雅停机...`);
  if (demoAlertTimer) clearInterval(demoAlertTimer);
  outboxRelay.stop();
  for (const ws of chatClients) {
    try {
      ws.close(1001, 'server shutting down');
    } catch {
      /* already closed */
    }
  }
  void server.stop(false);
  void closeDb().catch(() => { /* ignore */ });
  // 给在途同步响应一个极短收尾窗口后逢��?  setTimeout(() => process.exit(0), 500);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { broadcast, ok, server };
