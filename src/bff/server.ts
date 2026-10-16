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
// 【CDSS与运营精细化】M165-D：性能深度审计（慢查询TOP10/大表/N+1/内存泄漏/前端渲染/熔断器/健康检查）GET /api/v1/admin/performance/deep-audit
// 【前端性能优化】M145-B：打包体积分析 + 路由懒加载报告 GET /api/v1/admin/performance/frontend
import { frontendPerformanceRoutes } from './routes/frontendPerformance';
// 【v4.x近期】M158-C：首屏与缓存优化（路由懒加载/缓存策略/FCP-LCP 测量）GET /api/v1/admin/performance/firstload
import { firstLoadRoutes } from './routes/firstLoad';
// 【UI 一致性与无障碍】M150-D：深海蓝 VI 五维度一致性 + WCAG AA 无障碍 GET /api/v1/admin/ui/consistency
import { uiConsistencyRoutes } from './routes/uiConsistency';
// 【质量补齐与新场景】M151-B：UI 无障碍对比度修复验证（#4A90D9→#2E6FB5 / #8C8C8C→#595959，WCAG AA）GET /api/v1/admin/ui/accessibility/verify
import { accessibilityVerifyRoutes } from './routes/accessibilityVerify';
// 【性能优化 · 慢查询治理】M136-B：P95>300ms 慢路由识别 + SQL 静态优化建议 + 缓存命中观测
import { queryOptimizationRoutes } from './routes/queryOptimization';
// 【生产化收尾】M145-A：核心表慢查询目录 + 索引建议 GET /api/v1/admin/performance/slow-queries
import { dbPerformanceRoutes } from './routes/dbPerformance';
// 【代码质量提升】M150-B：any/ts-ignore/console-log/未使用变量/圈复杂度 五维治理 GET /api/v1/admin/code/quality
import { codeQualityRoutes } from './routes/codeQuality';
// 【200版本里程碑】M157-C：六项质量门禁复查 GET /api/v1/admin/quality-gate
import { qualityGateRoutes } from './routes/qualityGate';
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
import { aiDecisionRoutes } from './routes/aiDecision'; // M164-B：【数据中台与AI大脑】POST /api/v1/ai-brain/decision 智能决策支持（方案排序/ROI 评估/效果闭环）
import { systemMapRoutes } from './routes/systemMap'; // M157-B：【200版本里程碑】GET /api/v1/admin/system-map 系统功能全景图（八大领域全覆盖）
import { adminMigrationsRoutes } from './routes/adminMigrations';
import { adminTrendsRoutes } from './routes/adminTrends';
// 【SaaS化+智慧度】M133-D：系统智慧度六维评分 + 趋势
import { adminIntelligenceScoreRoutes } from './routes/adminIntelligenceScore';
// 【M160-A · 全自学习闭环】GET /api/v1/admin/auto-learn/report 系统每周自动进化报告
import { autoLearnRoutes } from './routes/autoLearn';
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
import { dataGovernanceRoutes } from './routes/dataGovernance';
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
import { logisticsRoutes } from './routes/logistics';
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
import { qcRectificationRoutes } from './routes/qcRectification';
import { monthlyReportRoutes } from './routes/monthlyReport';
import { reportExportRoutes } from './routes/reportExport';
import { exportReportRoutes } from './routes/exportReport'; // M148-D：报表中心 PDF/Excel 打印级导出（产品化收尾）
import { bedMapRoutes } from './routes/bedMap';
import { digitalTwinRoutes } from './routes/digitalTwin'; // M160-B：医院数字孪生 2D GET /api/v1/admin/digital-twin/building/:building
import { digitalTwinDeepRoutes } from './routes/digitalTwinDeep'; // M161-A：数字孪生深化 GET /api/v1/admin/digital-twin/stream + POST /simulate（定时快照轮询/流程仿真/资源预测）
import { teachingDeepRoutes } from './routes/teachingDeep'; // M162-B：教学与培训深化 GET /api/v1/teaching/courses + POST /api/v1/teaching/exam（录播/直播/OSCE/规培出科/继教学分，考核公平不走过场）
import { ceoDashboardRoutes } from './routes/ceoDashboard';
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
// 【200版本里程碑】M157-A：里程碑总结（仅 admin，GET /api/v1/admin/milestone/summary）
import { milestoneRoutes } from './routes/milestone';
import { errorSanitizerRoutes } from './routes/errorSanitizer'; // M136-A：错误脱敏自检（替代 securityBaselineRoutes，错误项转绿）
// 【安全】M149-B：安全基线报告（七项：写认证/SQL/XSS/PII/错误/token/密码哈希/审计链）
import { securityReportRoutes } from './routes/securityReport';
// 【安全与运营】M163-A：等保三级 安全合规（五大类 15 项控制，仅 admin）
import { securityComplianceRoutes } from './routes/securityCompliance';
import { performanceBenchmarkRoutes } from './routes/performanceBenchmark';
import { museOnboardingRoutes } from './routes/museOnboarding';
import { onboardingRoutes } from './routes/onboarding';
import { museNurseRoutes } from './routes/museNurse';
import { museHospitalRoutes } from './routes/museHospital';
import { musePharmaRoutes } from './routes/musePharma';
import { museAdminRoutes } from './routes/museAdmin';
import { museMonthlyReportRoutes } from './routes/museMonthlyReport';
import { musePatternsRoutes } from './routes/musePatterns';
import { museGrowthRoutes } from './routes/museGrowth';
import { patientMuseRoutes } from './routes/patientMuse';
import { museDeptCurveRoutes } from './routes/museDeptCurve';
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
// 【质量与安全】M141-A：三甲评审准备系统（七大类别核心条款检查清单 + 差距分析）
import { jciReviewRoutes } from './routes/jciReview';
import { patientServiceDeepRoutes } from './routes/patientServiceDeep'; // M156-D：【患者服务深化】一站式服务中心（老人友好）GET /api/v1/patient/service
import { researchDeepRoutes } from './routes/researchDeep'; // M162-C：【科研管理深化】课题/论文/成果转化/经费 GET /api/v1/research/projects + PUT /:id/milestone
import { roadmapRoutes } from './routes/roadmap'; // M157-D：v4.x 产品路线图（三阶段/优先级/工作量估算）GET /api/v1/admin/roadmap
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
  ...medicalGraphRoutes, // M131-D 医学知识图谱；M147-A 深化：/api/v1/graph/disease/:id + /differential（知识图谱与患者教育）
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
  ...logisticsRoutes,
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
  ...internetHospitalRoutes, // M163-D：互联网医院深化（处方流转 POST /prescription/route + 配送追踪 GET /delivery/track/:id）
  ...consultationRoutes,
  ...internetPrescriptionRoutes,
  ...internetPaymentRoutes,
  ...internetDeliveryRoutes,
  ...satisfactionRoutes,
  ...satisfactionAiRoutes, // M153-D：满意度智能分析报告（临床决策支持）
  ...satisfactionLoopRoutes, // M165-C：【CDSS与运营精细化】满意度改进闭环（收集→分析→改进→验证）
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
  ...perfOptimizeRoutes, // M151-D：慢查询优化闭环（N+1/索引/物化视图）GET /api/v1/admin/performance/optimize
  ...frontendPerformanceRoutes, // M145-B：GET /api/v1/admin/performance/frontend
  ...firstLoadRoutes, // M158-C：GET /api/v1/admin/performance/firstload（首屏懒加载 + 缓存策略 + FCP/LCP 测量）
  ...uiConsistencyRoutes, // M150-D：GET /api/v1/admin/ui/consistency（UI 一致性 + 无障碍）
  ...accessibilityVerifyRoutes, // M151-B：GET /api/v1/admin/ui/accessibility/verify（对比度修复 + WCAG AA 复验）
  ...qualityGateRoutes, // M157-C：GET /api/v1/admin/quality-gate（200版本六项质量门禁复查）
  ...queryOptimizationRoutes,
  ...dbPerformanceRoutes, // M145-A：GET /api/v1/admin/performance/slow-queries（核心表慢查询 + 索引建议）
  ...codeQualityRoutes, // M150-B：GET /api/v1/admin/code/quality（代码质量五维治理报告）
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
  ...aiDecisionRoutes, // M164-B：POST /api/v1/ai-brain/decision 智能决策支持（候选方案/四维排序/ROI 评估/效果闭环）
  ...systemMapRoutes, // M157-B：【200版本里程碑】GET /api/v1/admin/system-map 系统功能全景图
  ...adminMigrationsRoutes,
  ...adminTrendsRoutes,
  ...adminIntelligenceScoreRoutes,
  ...autoLearnRoutes, // M160-A：GET /api/v1/admin/auto-learn/report 全自学习闭环周度报告
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
  ...guideDxRoutes, // M160-C：临床指南对齐（四部权威指南硬阈值）
  ...assistantRecordDraftRoutes,
  ...insuranceAuditRoutes,
  ...adminInsuranceReviewRoutes,
  ...drgAuditRoutes,
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
  ...teachingDeepRoutes, // M162-B：教学与培训深化（在线课程/OSCE客观结构化考核/规培轮转出科/继教学分自动记录）
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
  ...groupMultiHospitalRoutes, // M156-A：GET /api/v1/admin/group/dashboard（集团与科研·多院管理）
  ...adminLogsRoutes,
  ...adminWebhooksRoutes,
  ...strategyEvolutionRoutes,
  ...roadmapRoutes, // M157-D：v4.x 路线图 GET /api/v1/admin/roadmap
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
  ...milestoneRoutes, // 【200版本里程碑】M157-A：GET /api/v1/admin/milestone/summary（仅 admin）
  ...testCoverageRoutes,
  ...errorSanitizerRoutes, // M136-A：GET /api/v1/admin/test/security（错误脱敏 green）
  ...securityReportRoutes, // M149-B：GET /api/v1/admin/security/report（七项安全基线）
  ...securityComplianceRoutes, // M163-A：GET /api/v1/admin/security/compliance（等保三级）
  ...eSignatureRoutes, // M138-B：电子签名 POST /sign + GET /verify/:id
  ...imRoutes, // M138-C：医院内部即时通讯 send / conversation / unread-count
  ...oaApprovalRoutes, // M139-A：OA 多级审批 POST/GET/PUT /api/v1/oa/approvals
  ...partyUnionRoutes, // M140-D：党建工会活动留痕 GET/POST /api/v1/admin/party-union
  ...jciReviewRoutes, // M141-A：三甲评审准备 GET /api/v1/admin/review/checklist
  ...performanceBenchmarkRoutes,
  ...museOnboardingRoutes,
  ...onboardingRoutes,
  ...museNurseRoutes,
  ...museHospitalRoutes,
  ...musePharmaRoutes,
  ...museAdminRoutes,
  ...museMonthlyReportRoutes,
  ...musePatternsRoutes,
  ...museGrowthRoutes,
  ...patientMuseRoutes,
  ...museDeptCurveRoutes,
  ...helpCenterRoutes,
  ...apiDocsRoutes,
  ...adminRecordAuditRoutes,
  ...userManualRoutes,
  ...emrSmartScoreRoutes, // M154-B：电子病历智能化评分 POST /api/v1/emr/score（六维100分，重实质不抠格式）
  ...opsForecastRoutes, // M154-C：【AI深化与运营预测】GET /api/v1/admin/forecast（移动平均+季节因子+趋势外推，含残差置信区间）
  ...integrationHl7Routes, // M155-C：【系统集成深化】HL7 v2.x/FHIR R4 接口 POST /api/v1/integration/hl7/parse + /fhir/build（|^~\& 分隔，FHIR R4 Patient/Observation/MedicationRequest）
  ...patientServiceDeepRoutes, // M156-D：【患者服务深化】一站式服务中心（老人友好六卡片）GET /api/v1/patient/service
  ...researchDeepRoutes, // M162-C：【科研管理深化】科研全生命周期 GET /api/v1/research/projects?dept= + PUT /api/v1/research/projects/:id/milestone
  ...apiGatewayRoutes, // M164-D：【数据中台与AI大脑】API 网关 POST /api/v1/api-gateway/route + /external
  ...budgetDeepRoutes, // M165-B：【CDSS与运营精细化】GET /api/v1/admin/budget?dept=&year=（预算编制/执行跟踪/超支预测/结构优化）
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
