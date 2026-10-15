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
import { userAdminRoutes } from './routes/admin/users';
import { roleAdminRoutes } from './routes/admin/roles';
import { auditLogRoutes } from './routes/admin/auditLogs';
import { loginLogRoutes } from './routes/admin/loginLogs';
import { maskConfigAdminRoutes } from './routes/adminMaskConfig';
import { adminPerformanceRoutes } from './routes/adminPerformance';
// 【移动端+性能优化】M128-D：性能优化索引建议 + BFF 缓存观测
import { adminDeptPerformanceRoutes } from './routes/adminDeptPerformance';
import { adminHealthRoutes } from './routes/adminHealth';
import { adminDashboardRoutes } from './routes/adminDashboard';
import { adminQualityMonitorRoutes } from './routes/adminQualityMonitor';
import { adminMigrationsRoutes } from './routes/adminMigrations';
import { adminTrendsRoutes } from './routes/adminTrends';
import { mobileQuickActionsRoutes } from './routes/mobileQuickActions';
import { recordRequestPerformance } from './aggregators/performanceMonitorAggregator';
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
import { timelinessRoutes } from './routes/timeliness';
import { emrAssessmentRoutes } from './routes/emrAssessment';
import { aiNoteDraftRoutes } from './routes/aiNoteDraft';
import { medReviewRoutes } from './routes/medReview';
import { diagnosisSuggestionRoutes } from './routes/diagnosisSuggestion';
import { pathwayRecommendationRoutes } from './routes/pathwayRecommendation';
import { losPredictionRoutes } from './routes/losPrediction';
import { voiceMedicalRoutes } from './routes/voiceMedical';
import { frontPageRoutes } from './routes/frontPage';
import { researchRoutes } from './routes/research';
import { researchExportRoutes } from './routes/researchExport';
import { empiRoutes } from './routes/empi';
import { dataWarehouseRoutes } from './routes/dataWarehouse';
import { dataGovernanceRoutes } from './routes/dataGovernance';
import { outboxRoutes } from './routes/outbox';
import { sessionAdminRoutes } from './routes/sessions';
import { billingRoutes } from './routes/billing';
import { billRoutes } from './routes/bill';
import { drgRoutes } from './routes/drg';
import { exportRoutes } from './routes/export';
import { labInterpretRoutes } from './routes/labInterpret';
import { imagingInterpretRoutes } from './routes/imagingInterpret';
import { criticalRoutes } from './routes/critical';
import { criticalValueClosureRoutes } from './routes/criticalValueClosure';
import { reconRoutes } from './routes/recon';
import { surgeryRoutes } from './routes/surgery';
import { surgeryScheduleRoutes } from './routes/surgerySchedule';
import { surgeryChecklistRoutes } from './routes/surgeryChecklist';
import { transfusionRoutes } from './routes/transfusion';
import { bloodQualityRoutes } from './routes/bloodQuality';
import { vteRoutes } from './routes/vte';
import { amsRoutes } from './routes/ams';
import { pathwayRoutes } from './routes/pathway';
import { pathwayVarianceRoutes } from './routes/pathwayVariance';
import { mobileNursingRoutes } from './routes/mobileNursing';
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
import { erGreenRoutes } from './routes/erGreen';
import { chronicRoutes } from './routes/chronicDisease';
import { patientChronicRoutes } from './routes/patientChronic';
import { healthCheckRoutes } from './routes/healthCheck';
import { healthCheckReferralRoutes } from './routes/healthCheckReferral';
import { oncologyRoutes } from './routes/oncology';
import { chemoReminderRoutes } from './routes/chemoReminder';
import { psychScreeningRoutes } from './routes/psychScreening';
import { nissRoutes } from './routes/nissReporting';
import { vteAnticoagRoutes } from './routes/vteAnticoag';
import { orderCdsRoutes } from './routes/orderCds';
import { nurseStationRoutes } from './routes/nurseStation';
import { scheduleSlotRoutes } from './routes/scheduleSlot';
import { reportPushRoutes } from './routes/reportPush';
import { patientNotificationRoutes } from './routes/patientNotification';
import { patientReminderRoutes } from './routes/patientReminders';
import { patientMobileHomeRoutes } from './routes/patientMobileHome';
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
import { alertsRoutes } from './routes/alerts';
import { renewalRoutes } from './routes/renewalFlow';
import { drgBudgetRoutes } from './routes/drgBudget';
import { inpatientCostMonitorRoutes } from './routes/inpatientCostMonitor';
import { costAttributionRoutes } from './routes/costAttribution';
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
import { terminalQcRoutes } from './routes/terminalQc';
import { deptCockpitRoutes } from './routes/deptCockpit';
import { drugReviewRoutes } from './routes/drugReview';
import { drugInventoryRoutes } from './routes/drugInventory';
import { prescriptionReviewRoutes } from './routes/prescriptionReview';
import { assistantPharmacyRoutes } from './routes/assistantPharmacy';
import { assistantDeepReviewRoutes } from './routes/assistantDeepReview';
import { assistantLabRoutes } from './routes/assistantLab';
import { assistantDiagnosisRoutes } from './routes/assistantDiagnosis';
import { assistantRecordDraftRoutes } from './routes/assistantRecordDraft';
import { emrLevel5Routes } from './routes/emrLevel5';
import { emrGrade5Routes } from './routes/emrGrade5';
import { deptKnowledgeRoutes } from './routes/deptKnowledge';
import { patientRoutes } from './routes/patient';
import { qualityRoutes } from './routes/quality';
import { rectificationRoutes } from './routes/rectification';
import { skillRoutes } from './routes/skills';
import { systemRoutes } from './routes/system';
import { systemHealthRoutes } from './routes/systemHealth';
import { agentHealthRoutes } from './routes/agentHealth';
import { notifyConfigRoutes } from './routes/notifyConfig';
import { insuranceAuditRoutes } from './routes/insuranceAudit';
import { drgAuditRoutes } from './routes/drgAudit';
import { qcRectificationRoutes } from './routes/qcRectification';
import { monthlyReportRoutes } from './routes/monthlyReport';
import { bedMapRoutes } from './routes/bedMap';
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
import { adminErrorsRoutes } from './routes/adminErrors';
import { adminConfigRoutes } from './routes/adminConfig';
import { strategyEvolutionRoutes } from './routes/strategyEvolution';
import { museSystemIntelligenceRoutes } from './routes/museSystemIntelligence';
import { operationalInsightRoutes } from './routes/operationalInsight';
import { inpatientInsightRoutes } from './routes/inpatientInsight';
import { assistantInpatientRoutes } from './routes/assistantInpatient';
import { assistantEmergencyRoutes } from './routes/assistantEmergency';
import { assistantSurgeryRoutes } from './routes/assistantSurgery';
import { assistantInsuranceRoutes } from './routes/assistantInsurance';
import { assistantKnowledgeRoutes } from './routes/assistantKnowledge';
import { patientGuideRoutes } from './routes/patientGuide';
import { doctorPreferenceRoutes } from './routes/doctorPreference';
import { learningDashboardRoutes } from './routes/learningDashboard';
import { museHomeRoutes } from './routes/museHome';
import { followupLearningRoutes } from './routes/followupLearning';
import { weightEvolutionRoutes } from './routes/weightEvolution';
import { referralKnowledgeRoutes } from './routes/referralKnowledge';
import { crossDeptKnowledgeRoutes } from './routes/crossDeptKnowledge';
import { museSearchRoutes } from './routes/museSearch';
import { museAskRoutes } from './routes/museAsk';
import { museRecommendRoutes } from './routes/museRecommend';
import { smokeTestRoutes } from './routes/smokeTest';
import { museOnboardingRoutes } from './routes/museOnboarding';
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
  ...rectificationRoutes,
  ...operationRoutes,
  ...outpatientRoutes,
  ...inpatientRoutes,
  ...inpatientCareRoutes,
  ...emergencyRoutes,
  ...pharmacyRoutes,
  ...pharmacyAuditLearningRoutes,
  ...medicalQcRoutes,
...timelinessRoutes,
...emrAssessmentRoutes,
...aiNoteDraftRoutes,
...medReviewRoutes,
...diagnosisSuggestionRoutes,
...pathwayRecommendationRoutes,
...losPredictionRoutes,
  ...voiceMedicalRoutes,
  ...frontPageRoutes,
  ...researchRoutes,
  ...researchExportRoutes,
  ...empiRoutes,
  ...dataWarehouseRoutes,
  ...dataGovernanceRoutes,
  ...outboxRoutes,
  ...sessionAdminRoutes,
  ...billingRoutes,
  ...billRoutes,
  ...drgRoutes,
  ...exportRoutes,
  ...labInterpretRoutes,
  ...imagingInterpretRoutes,
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
  ...erGreenRoutes,
  ...chronicRoutes,
  ...patientChronicRoutes,
  ...healthCheckRoutes,
  ...healthCheckReferralRoutes,
  ...oncologyRoutes,
  ...chemoReminderRoutes,
  ...psychScreeningRoutes,
  ...nissRoutes,
  ...vteAnticoagRoutes,
  ...orderCdsRoutes,
  ...nurseStationRoutes,
  ...scheduleSlotRoutes,
  ...reportPushRoutes,
  ...patientNotificationRoutes,
  ...patientReminderRoutes,
  ...patientMobileHomeRoutes,
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
  ...renewalRoutes,
  ...drgBudgetRoutes,
  ...inpatientCostMonitorRoutes,
  ...costAttributionRoutes,
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
  ...internetHospitalRoutes,
  ...consultationRoutes,
  ...internetPrescriptionRoutes,
  ...internetPaymentRoutes,
  ...internetDeliveryRoutes,
  ...satisfactionRoutes,
  ...smartTriageRoutes,
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
  ...userAdminRoutes,
  ...roleAdminRoutes,
  ...auditLogRoutes,
  ...loginLogRoutes,
  ...maskConfigAdminRoutes,
  ...adminPerformanceRoutes,
  ...adminDeptPerformanceRoutes,
  ...adminHealthRoutes,
  ...adminDashboardRoutes,
  ...adminQualityMonitorRoutes,
  ...adminMigrationsRoutes,
  ...adminTrendsRoutes,
  ...mobileQuickActionsRoutes,
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
  ...deptCockpitRoutes,
  ...drugReviewRoutes,
  ...drugInventoryRoutes,
  ...prescriptionReviewRoutes,
  ...assistantPharmacyRoutes,
  ...assistantDeepReviewRoutes,
  ...assistantLabRoutes,
  ...assistantDiagnosisRoutes,
  ...assistantRecordDraftRoutes,
  ...insuranceAuditRoutes,
  ...drgAuditRoutes,
  ...emrLevel5Routes,
  ...emrGrade5Routes,
  ...deptKnowledgeRoutes,
  ...qcRectificationRoutes,
  ...monthlyReportRoutes,
  ...bedMapRoutes,
  ...ceoDashboardRoutes,
  ...opdWorkstationRoutes,
  ...assistantOutpatientRoutes,
  ...aiFeedbackRoutes,
  ...patientFeedbackRoutes,
  ...adminAuditLogRoutes,
  ...adminBackupRoutes,
  ...adminErrorsRoutes,
  ...adminConfigRoutes,
  ...strategyEvolutionRoutes,
  ...museSystemIntelligenceRoutes,
  ...operationalInsightRoutes,
  ...inpatientInsightRoutes,
  ...assistantInpatientRoutes,
  ...assistantEmergencyRoutes,
  ...assistantSurgeryRoutes,
  ...assistantInsuranceRoutes,
  ...assistantKnowledgeRoutes,
  ...patientGuideRoutes,
  ...doctorPreferenceRoutes,
  ...learningDashboardRoutes,
  ...museHomeRoutes,
  ...followupLearningRoutes,
  ...weightEvolutionRoutes,
  ...referralKnowledgeRoutes,
  ...crossDeptKnowledgeRoutes,
  ...museSearchRoutes,
  ...museAskRoutes,
  ...museRecommendRoutes,
  ...smokeTestRoutes,
  ...museOnboardingRoutes,
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
