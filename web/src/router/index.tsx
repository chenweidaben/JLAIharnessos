/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 路由配置：React Router 6 + 路由懒加载 + 守卫
 */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Spin } from 'antd';

import { RequireAuth } from './RequireAuth';
import { RequirePermission, SessionTimeoutWatcher } from './guards';
import AppLayout from '@/components/layout/AppLayout';

const Login = lazy(() => import('@/pages/login'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'));
const RoleManagementPage = lazy(() => import('@/pages/RoleManagementPage'));
const PermissionManagementPage = lazy(() => import('@/pages/PermissionManagementPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const LoginLogPage = lazy(() => import('@/pages/LoginLogPage'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const PatientList = lazy(() => import('@/pages/patients'));
const PatientDetail = lazy(() => import('@/pages/patients/detail'));
const AgentChat = lazy(() => import('@/pages/agent'));
const MedMuseChatPage = lazy(() => import('@/pages/agent/MedMuseChatPage'));
const Alerts = lazy(() => import('@/pages/alerts'));
const Emergency = lazy(() => import('@/pages/emergency'));
const EmergencyTriage = lazy(() => import('@/pages/emergency/triage-detail'));
// 药房调剂发药工作站（M2-A）
const Pharmacy = lazy(() => import('@/pages/pharmacy'));
// 运行病历质控工作站（M2-B）
const MedicalQc = lazy(() => import('@/pages/medicalQc'));
// 语音电子病历工作站（M2-C）
const VoiceMedical = lazy(() => import('@/pages/voiceMedical'));
// 病案首页工作站（M3-A）
const FrontPage = lazy(() => import('@/pages/frontPage'));
// 科研专病队列（M5-B）
const Research = lazy(() => import('@/pages/research'));
// 患者主索引 EMPI（M5-C）
const Empi = lazy(() => import('@/pages/empi'));
const DataWarehouse = lazy(() => import('@/pages/dataWarehouse'));
const DataGovernance = lazy(() => import('@/pages/dataGovernance'));
// 会话管理与强制下线（M7-F）
const Sessions = lazy(() => import('@/pages/sessions'));
// 收费结算工作站（M3-B）
const Billing = lazy(() => import('@/pages/billing'));
const Appt = lazy(() => import('@/pages/appt'));
const Satisfaction = lazy(() => import('@/pages/satisfaction'));
const SmartTriage = lazy(() => import('@/pages/smartTriage'));
const DigitalCompanion = lazy(() => import('@/pages/digitalCompanion'));
const Referral = lazy(() => import('@/pages/referral'));
const KnowledgeBase = lazy(() => import('@/pages/knowledgeBase'));
// 互联网医院管理端（M3-J）
const InternetHospital = lazy(() => import('@/pages/internetHospital'));
const ConsultationWorkbench = lazy(() => import('@/pages/consultation'));
// 互联网电子处方（M3-L）
const InternetPrescriptionWorkbench = lazy(() => import('@/pages/internetPrescription'));
// 互联网在线支付 / 电子票据（M3-M）
const InternetPaymentWorkbench = lazy(() => import('@/pages/internetPayment'));
// 互联网处方配送 / 在线报告（M3-N）
const InternetDeliveryWorkbench = lazy(() => import('@/pages/internetDelivery'));
const InternetReportsWorkbench = lazy(() => import('@/pages/internetReports'));
// 临床业务：门诊 / 住院
const OutpatientPage = lazy(() => import('@/pages/OutpatientPage'));
const OutpatientConsultPage = lazy(() => import('@/pages/OutpatientConsultPage'));
const WardWorkbench = lazy(() => import('@/pages/ward/WardWorkbench'));
const QualityWorkbench = lazy(() => import('@/pages/quality'));
const QualityRecordDetail = lazy(() => import('@/pages/quality/RecordDetail'));
const QualityRulesPage = lazy(() => import('@/pages/quality/Rules'));
// 系统管理
const SystemConfigPage = lazy(() => import('@/pages/system/config'));
const DictManagementPage = lazy(() => import('@/pages/system/dict'));
const OrganizationPage = lazy(() => import('@/pages/system/organization'));
const KnowledgePage = lazy(() => import('@/pages/system/knowledge'));
const CDSRulesPage = lazy(() => import('@/pages/system/cds-rules'));
const ToolsPage = lazy(() => import('@/pages/system/tools'));
const AgentsPage = lazy(() => import('@/pages/system/agents'));
const IntegrationPage = lazy(() => import('@/pages/system/integration'));
const NotificationsPage = lazy(() => import('@/pages/system/notifications'));
const SystemMonitorPage = lazy(() => import('@/pages/system/monitor'));
const Forbidden = lazy(() => import('@/pages/403'));
const NotFound = lazy(() => import('@/pages/404'));

// 产品演示页（独立布局，无需登录）
const DemoLayout = lazy(() => import('@/components/demo/DemoLayout'));
const DemoHome = lazy(() => import('@/pages/demo/HomePage'));
const DemoFeatures = lazy(() => import('@/pages/demo/FeaturesPage'));
const DemoScenarios = lazy(() => import('@/pages/demo/ScenariosPage'));
const DemoChat = lazy(() => import('@/pages/demo/ChatDemoPage'));
const DemoPatient = lazy(() => import('@/pages/demo/PatientDemoPage'));
const DemoData = lazy(() => import('@/pages/demo/DataDemoPage'));
const DemoArchitecture = lazy(() => import('@/pages/demo/ArchitecturePage'));
const DemoAbout = lazy(() => import('@/pages/demo/AboutPage'));

// 科室管理与运营
const OperationOverview = lazy(() => import('@/pages/operation'));
const OperationAnalysisPage = lazy(() => import('@/pages/operation/analysis'));
const OperationDrg = lazy(() => import('@/pages/operation/drg'));
const OperationQuality = lazy(() => import('@/pages/operation/quality'));
const OperationStaff = lazy(() => import('@/pages/operation/staff'));
const OperationEquipment = lazy(() => import('@/pages/operation/equipment'));
// 手术麻醉管理（M9-C）
const SurgeryPage = lazy(() => import('@/pages/surgery'));
// 输血管理（M10-A）
const TransfusionPage = lazy(() => import('@/pages/transfusion'));
// 临床用血质量（M10-B）
const BloodQualityPage = lazy(() => import('@/pages/bloodQuality'));
// 检验管理 LIS（M11-A）
const LisPage = lazy(() => import('@/pages/lis'));
// 检查管理 RIS/PACS（M11-B）
const RisPage = lazy(() => import('@/pages/ris'));
// 检查检验结果 AI 智能解读工作站（M12-A）：查看 lab:interpret:view，写操作按 sign 细分
const InterpretPage = lazy(() => import('@/pages/interpret'));
// VTE 智能防治闭环（M13-A）：查看 vte:read，评估 vte:assess / 药物确认 vte:prevent / 机械执行 vte:execute
const VtePage = lazy(() => import('@/pages/vte'));
// 抗菌药物管理 AMS 闭环（M14-A）：查看 ams:read，开方 ams:prescribe / 点评 ams:review / 审批 ams:approve / 质控 ams:audit
const AmsPage = lazy(() => import('@/pages/ams'));
// 临床路径管理闭环（M15-A）：查看 pathway:read，入径/执行/变异/出径 pathway:manage/execute，质控 pathway:audit
const PathwayPage = lazy(() => import('@/pages/pathway'));
// 护理管理后台（M16-B）：查看 nursing_admin:view，排班/指标写操作按 nursing_admin:schedule/indicator 细分
const NursingAdminPage = lazy(() => import('@/pages/nursingAdmin'));
// 压疮/跌倒风险预警（M17-A）：查看 nursing_risk:read，评估 assess/预防 execute 按权限细分
const NursingRiskPage = lazy(() => import('@/pages/nursingRisk'));
const MedAdminPage = lazy(() => import('@/pages/medAdmin'));
const TubeCarePage = lazy(() => import('@/pages/tubeCare'));
const EventReviewPage = lazy(() => import('@/pages/eventReview'));
const NursingIoPage = lazy(() => import('@/pages/nursingIo'));
const NutritionScreeningPage = lazy(() => import('@/pages/nutritionScreening'));
const PainAssessmentPage = lazy(() => import('@/pages/painAssessment'));
const PreopAssessmentPage = lazy(() => import('@/pages/preopAssessment'));
const PacuRecordPage = lazy(() => import('@/pages/pacuRecord'));
const PostopFollowupPage = lazy(() => import('@/pages/postopFollowup'));
const IcuSedationPage = lazy(() => import('@/pages/icuSedation'));
const PostpartumVisitPage = lazy(() => import('@/pages/postpartumVisit'));
const ErTriagePage = lazy(() => import('@/pages/erTriage'));
const BarthelPage = lazy(() => import('@/pages/barthel'));
const ErGreenPage = lazy(() => import('@/pages/erGreen'));
const ChronicPage = lazy(() => import('@/pages/chronicDisease'));
const PatientChronicPage = lazy(() => import('@/pages/patientChronic'));
const HealthCheckPage = lazy(() => import('@/pages/healthCheck'));
const HealthCheckReferralPage = lazy(() => import('@/pages/healthCheckReferral'));
const OncologyPage = lazy(() => import('@/pages/oncology'));
const ChemoReminderPage = lazy(() => import('@/pages/chemoReminder'));
const PsychScreeningPage = lazy(() => import('@/pages/psychScreening'));
const NissReportingPage = lazy(() => import('@/pages/nissReporting'));
const VteAnticoagPage = lazy(() => import('@/pages/vteAnticoag'));
const CdsOverridePage = lazy(() => import('@/pages/cdsOverride'));
const NurseStationPage = lazy(() => import('@/pages/nurseStation'));
const ScheduleSlotPage = lazy(() => import('@/pages/scheduleSlot'));
const ReportPushPage = lazy(() => import('@/pages/reportPush'));
const NotificationPage = lazy(() => import('@/pages/notification'));
const RenewalPage = lazy(() => import('@/pages/renewalFlow'));
const PatientBillingPage = lazy(() => import('@/pages/patientBilling'));
const RehabTreatmentPage = lazy(() => import('@/pages/rehabTreatment'));
const PainClinicPage = lazy(() => import('@/pages/painClinic'));
const CgaPage = lazy(() => import('@/pages/cgaAssessment'));
const NutritionConsultPage = lazy(() => import('@/pages/nutritionConsult'));
const StopbangPage = lazy(() => import('@/pages/stopbang'));
const DischargePlanPage = lazy(() => import('@/pages/dischargePlan'));
const FollowupAppointmentPage = lazy(() => import('@/pages/followupAppointment'));
const SatisfactionSurveyPage = lazy(() => import('@/pages/satisfactionSurvey'));
const SatisfactionReminderPage = lazy(() => import('@/pages/satisfactionReminder'));
const MdtConsultPage = lazy(() => import('@/pages/mdtConsult'));
const MdtTreatmentPlanPage = lazy(() => import('@/pages/mdtTreatmentPlan'));
const PiccMaintenancePage = lazy(() => import('@/pages/piccMaintenance'));
const CdiReviewPage = lazy(() => import('@/pages/cdiReview'));
const TransfusionReactionPage = lazy(() => import('@/pages/transfusionReaction'));
const SbarHandoffPage = lazy(() => import('@/pages/sbarHandoff'));
const EdObservationPage = lazy(() => import('@/pages/edObservation'));
const InfectionDashboardPage = lazy(() => import('@/pages/infectionDashboard'));
const AmDashboardPage = lazy(() => import('@/pages/amDashboard'));
const DoctorWorkbenchPage = lazy(() => import('@/pages/doctorWorkbench'));
const PatientPortalPage = lazy(() => import('@/pages/patientPortal'));
const SurgicalChecklistPage = lazy(() => import('@/pages/surgicalChecklist'));
const PharmacyTaskPage = lazy(() => import('@/pages/pharmacyTask'));
const DrgBudgetPage = lazy(() => import('@/pages/drgBudget'));
const InpatientCostMonitorPage = lazy(() => import('@/pages/inpatientCostMonitor'));
const CostAttributionPage = lazy(() => import('@/pages/costAttribution'));
const ImprovementTaskPage = lazy(() => import('@/pages/improvementTask'));
const ImprovementOutcomePage = lazy(() => import('@/pages/improvementOutcome'));
const EscalationPage = lazy(() => import('@/pages/escalation'));
const DipPage = lazy(() => import('@/pages/dip'));
const PaymentSelectionPage = lazy(() => import('@/pages/paymentSelection'));
const SettlementReportPage = lazy(() => import('@/pages/settlementReport'));
const SettlementAnalyticsPage = lazy(() => import('@/pages/settlementAnalytics'));
const SettlementDrilldownPage = lazy(() => import('@/pages/settlementDrilldown'));
// 低代码智能体编排平台
const BuilderMarket = lazy(() => import('@/pages/builder/MarketPage'));
const BuilderEditor = lazy(() => import('@/pages/builder/BuilderPage'));
// 智能体运行台（M4-C）：执行已发布智能体 + 实例/节点记录 + 结果回放
const AgentRuntime = lazy(() => import('@/pages/agentRuntime'));
const HumanTask = lazy(() => import('@/pages/humanTask'));
// 技能体系（jlmedaios SKILLS）：技能市场 + 技能工作室
const SkillMarket = lazy(() =>
  import('@/pages/skills').then((m) => ({ default: m.SkillMarketPage })),
);
const SkillStudio = lazy(() =>
  import('@/pages/skills').then((m) => ({ default: m.SkillStudioPage })),
);
// 影像 AI 辅诊（DAMO-RADAR）
const ImagingAiReportPage = lazy(() => import('@/pages/imaging/AiReportPage'));
// AI 原生五剑客（M88-A~E）
const AiNoteDraftPage = lazy(() => import('@/pages/aiNative/noteDraft'));
const MedReviewPage = lazy(() => import('@/pages/aiNative/medReview'));
const DiagnosisSuggestionPage = lazy(() => import('@/pages/aiNative/diagnosis'));
const PathwayRecommendationPage = lazy(() => import('@/pages/aiNative/pathwayRec'));
const LosPredictionPage = lazy(() => import('@/pages/aiNative/losPrediction'));
// EMR 文书缺口（出院小结 / M87-C 时效监控 / M87-D 评级自评）
const EmrDischargeSummaryPage = lazy(() => import('@/pages/emrGap/dischargeSummary'));
const EmrTimelinessPage = lazy(() => import('@/pages/emrGap/timeliness'));
const EmrAssessmentPage = lazy(() => import('@/pages/emrGap/emrAssessment'));
// AI 病历质控（M90-A）
const AiQcPage = lazy(() => import('@/pages/emrGap/aiQc'));
// AI 护理计划推荐（M90-B）
const AiNursingPlanPage = lazy(() => import('@/pages/emrGap/aiNursingPlan'));
// MEDMUSE 审批中心（M93-A）
const MedmuseApprovalsPage = lazy(() => import('@/pages/medmuse/Approvals'));
// AI 病历终末质控（M93-B）
const TerminalQcPage = lazy(() => import('@/pages/emrGap/terminalQc'));
// MEDMUSE 科主任驾驶舱（M94-A）
const DeptCockpitPage = lazy(() => import('@/pages/medmuse/DeptCockpit'));
// AI 第八剑客合理用药实时审查（M94-B）
const DrugReviewPage = lazy(() => import('@/pages/emrGap/drugReview'));
// 电子病历五级评审自评仪表盘（M94-C）
const EmrLevel5Page = lazy(() => import('@/pages/emrGap/level5'));
// 患者 360 综合时间线（M96-C）
const Patient360Timeline = lazy(() => import('@/pages/patients/Patient360'));
// 系统健康监控仪表盘（M96-D）
const SystemHealthPage = lazy(() => import('@/pages/system/Health'));
// 互联网医院患者端简化工作台（M97-C）
const PatientWorkbenchPage = lazy(() => import('@/pages/patientPortal/Workbench'));
// 数据导出中心（M97-D）
const SystemExportPage = lazy(() => import('@/pages/system/Export'));
// 通知 webhook 配置（M98-D）
const NotifyConfigPage = lazy(() => import('@/pages/system/NotifyConfig'));

// AI 移动护理 PDA 执行端（M16-A）：独立移动布局 /m/*，不套 PC AppLayout/SideMenu
const MobileLogin = lazy(() => import('@/pages/mobile/login'));
const MobileLayout = lazy(() => import('@/components/mobile/MobileLayout'));
const MobilePatients = lazy(() => import('@/pages/mobile/Patients'));
const MobileBedSide = lazy(() => import('@/pages/mobile/BedSide'));
const MobileTasks = lazy(() => import('@/pages/mobile/Tasks'));
const MobileHandoff = lazy(() => import('@/pages/mobile/Handoff'));
const MobileMe = lazy(() => import('@/pages/mobile/Me'));

function PageLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/login-legacy" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />
        {/* 低代码编排画布：全屏沉浸编辑，画布内可返回市场 */}
        <Route
          path="/builder/edit/:agentId"
          element={
            <RequireAuth>
              <BuilderEditor />
            </RequireAuth>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="patients" element={<PatientList />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          {/* 患者 360 综合时间线（M96-C） */}
          <Route path="patients/360/:id" element={<Patient360Timeline />} />
          {/* 影像 AI 辅诊（DAMO-RADAR）：查看需 imaging:view，复核签名需 imaging:ai:review */}
          <Route
            path="imaging/ai/report/:studyUid?"
            element={
              <RequirePermission permission="imaging:view">
                <ImagingAiReportPage />
              </RequirePermission>
            }
          />
          {/* AI 原生五剑客（M88-A~E） */}
          <Route
            path="ai/note-draft"
            element={
              <RequirePermission permission="ai_note:generate">
                <AiNoteDraftPage />
              </RequirePermission>
            }
          />
          <Route
            path="ai/med-review"
            element={
              <RequirePermission permission="med_review:view">
                <MedReviewPage />
              </RequirePermission>
            }
          />
          <Route
            path="ai/diagnosis"
            element={
              <RequirePermission permission="ai_diagnosis:view">
                <DiagnosisSuggestionPage />
              </RequirePermission>
            }
          />
          <Route
            path="ai/pathway-rec"
            element={
              <RequirePermission permission="ai_pathway:view">
                <PathwayRecommendationPage />
              </RequirePermission>
            }
          />
          <Route
            path="ai/los-prediction"
            element={
              <RequirePermission permission="ai_los_pred:view">
                <LosPredictionPage />
              </RequirePermission>
            }
          />
          {/* 出院小结：登录即可查询，写/审按钮级权限控制 */}
          <Route path="emr/discharge-summary" element={<EmrDischargeSummaryPage />} />
          {/* 文书时效监控（M87-C） */}
          <Route
            path="emr/timeliness"
            element={
              <RequirePermission permission="timeliness:view">
                <EmrTimelinessPage />
              </RequirePermission>
            }
          />
          {/* 电子病历评级自评（M87-D） */}
          <Route
            path="emr/assessment"
            element={
              <RequirePermission permission="emr_assessment:view">
                <EmrAssessmentPage />
              </RequirePermission>
            }
          />
          {/* AI 病历质控（M90-A） */}
          <Route
            path="emr/ai-qc"
            element={
              <RequirePermission permission="ai_note_qc:view">
                <AiQcPage />
              </RequirePermission>
            }
          />
          {/* AI 护理计划推荐（M90-B） */}
          <Route
            path="nursing/ai-plan"
            element={
              <RequirePermission permission="ai_nursing_plan:view">
                <AiNursingPlanPage />
              </RequirePermission>
            }
          />
          {/* AI 病历终末质控（M93-B）：甲/乙/丙级判定 */}
          <Route
            path="emr/terminal-qc"
            element={
              <RequirePermission permission="terminal_qc:view">
                <TerminalQcPage />
              </RequirePermission>
            }
          />
          {/* AI 第八剑客合理用药实时审查（M94-B） */}
          <Route
            path="emr/drug-review"
            element={
              <RequirePermission permission="drug_review:view">
                <DrugReviewPage />
              </RequirePermission>
            }
          />
          {/* 电子病历五级评审自评仪表盘（M94-C） */}
          <Route
            path="emr/level5"
            element={
              <RequirePermission permission="emr_level5:view">
                <EmrLevel5Page />
              </RequirePermission>
            }
          />
          {/* 系统健康监控仪表盘（M96-D） */}
          <Route
            path="system/health"
            element={
              <RequirePermission permission="system:view">
                <SystemHealthPage />
              </RequirePermission>
            }
          />
          {/* 互联网医院患者端简化工作台（M97-C） */}
          <Route
            path="portal/workbench"
            element={
              <RequirePermission permission="patient_portal:view">
                <PatientWorkbenchPage />
              </RequirePermission>
            }
          />
          {/* 数据导出中心（M97-D） */}
          <Route
            path="system/export"
            element={
              <RequirePermission permission="system:view">
                <SystemExportPage />
              </RequirePermission>
            }
          />
          {/* 通知 webhook 配置（M98-D） */}
          <Route
            path="system/notify"
            element={
              <RequirePermission permission="system:view">
                <NotifyConfigPage />
              </RequirePermission>
            }
          />
          <Route path="agent" element={<AgentChat />} />
          {/* MEDMUSE 多岗位智能体聊天（M89-H）：confidence + 免责声明 + 审批卡片 */}
          <Route path="medmuse" element={<MedMuseChatPage />} />
          {/* MEDMUSE 审批中心（M93-A）：待审批工单列表 + approve/reject */}
          <Route path="medmuse/approvals" element={<MedmuseApprovalsPage />} />
          {/* MEDMUSE 科主任驾驶舱（M94-A）：科室 KPI 日报 + 质量预警 */}
          <Route
            path="medmuse/dept-cockpit"
            element={
              <RequirePermission permission="dept_cockpit:view">
                <DeptCockpitPage />
              </RequirePermission>
            }
          />
          <Route path="builder/market" element={<BuilderMarket />} />
          {/* 智能体运行台（M4-C）：执行已发布智能体 + 实例/节点回放 */}
          <Route path="agent-runtime" element={<AgentRuntime />} />
          <Route path="human-tasks" element={<HumanTask />} />
          {/* 技能体系：技能市场（浏览）与技能工作室（低代码编排） */}
          <Route path="skills/market" element={<SkillMarket />} />
          <Route path="skills/studio" element={<SkillStudio />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="emergency/triage/:visitId" element={<EmergencyTriage />} />
          {/* 药房调剂发药工作站（M2-A） */}
          <Route path="pharmacy" element={<Pharmacy />} />
          {/* 运行病历质控工作站（M2-B） */}
          <Route path="medical-qc" element={<MedicalQc />} />
          {/* 语音电子病历工作站（M2-C） */}
          <Route path="voice-medical" element={<VoiceMedical />} />
          {/* 病案首页工作站（M3-A）：队列/详情 front_page:read，编码 code，质控归档 audit */}
          <Route path="front-page" element={<FrontPage />} />
          {/* 科研专病队列（M5-B）：research:read/write */}
          <Route path="research" element={<Research />} />
          {/* 患者主索引 EMPI（M5-C）：empi:read/write */}
          <Route path="empi" element={<Empi />} />
          {/* 数据湖仓（M5-D）：data_warehouse:read/admin */}
          <Route path="data-warehouse" element={<DataWarehouse />} />
          {/* 数据治理（M5-E）：data_governance:read/admin */}
          <Route path="data-governance" element={<DataGovernance />} />
          {/* 会话管理（M7-F）：session:manage 查看在线会话、强制下线 */}
          <Route path="sessions" element={<Sessions />} />
          {/* 收费结算工作站（M3-B）：计费/收款 billing:charge，退费 billing:refund */}
          <Route path="billing" element={<Billing />} />
          {/* 预约随访工作站（M3-I）：appt:view 查看，appt:confirm 确认，appt:followup 随访 */}
          <Route path="appt" element={<Appt />} />
          {/* 满意度评价（M3-O）：satisfaction:view 统计，satisfaction:submit 评价 */}
          <Route path="satisfaction" element={<Satisfaction />} />
          {/* 智能导诊/预问诊（M3-P）：triage:use 患者端，triage:view 医护端 */}
          <Route path="smart-triage" element={<SmartTriage />} />
          <Route path="digital-companion" element={<DigitalCompanion />} />
          {/* 双向转诊（M3-R）：referral:manage/view/accept */}
          <Route path="referral" element={<Referral />} />
          {/* 知识库管理（M4-A）：knowledge:read/manage */}
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          {/* 互联网医院管理端（M3-J）：医护线上资质审核 */}
          <Route path="internet-hospital" element={<InternetHospital />} />
          {/* 互联网问诊工作站（M3-K）：医生接诊/图文回复 */}
          <Route path="consultation" element={<ConsultationWorkbench />} />
          {/* 互联网电子处方工作站（M3-L）：医生开方 / 药师审方 */}
          <Route path="internet-prescription" element={<InternetPrescriptionWorkbench />} />
          <Route path="internet-payment" element={<InternetPaymentWorkbench />} />
          <Route path="internet-delivery" element={<InternetDeliveryWorkbench />} />
          <Route path="internet-reports" element={<InternetReportsWorkbench />} />
          {/* 临床业务：门诊 / 住院 */}
          <Route path="outpatient" element={<OutpatientPage />} />
          <Route path="outpatient/consult/:encounterId" element={<OutpatientConsultPage />} />
          <Route path="ward" element={<WardWorkbench />} />
          <Route path="quality" element={<QualityWorkbench />} />
          <Route path="quality/record/:recordId" element={<QualityRecordDetail />} />
          <Route path="quality/rules" element={<QualityRulesPage />} />
          {/* 系统管理 */}
          <Route path="system/config" element={<SystemConfigPage />} />
          <Route path="system/dict" element={<DictManagementPage />} />
          <Route path="system/organization" element={<OrganizationPage />} />
          <Route path="system/knowledge" element={<KnowledgePage />} />
          <Route path="system/cds-rules" element={<CDSRulesPage />} />
          <Route path="system/tools" element={<ToolsPage />} />
          <Route path="system/agents" element={<AgentsPage />} />
          <Route path="system/integration" element={<IntegrationPage />} />
          <Route path="system/notifications" element={<NotificationsPage />} />
          <Route path="system/monitor" element={<SystemMonitorPage />} />
          {/* 科室管理与运营 */}
          <Route path="operation" element={<OperationOverview />} />
          <Route path="operation/analysis" element={<OperationAnalysisPage />} />
          <Route path="operation/drg" element={<OperationDrg />} />
          <Route path="operation/quality" element={<OperationQuality />} />
          <Route path="operation/staff" element={<OperationStaff />} />
          <Route path="operation/equipment" element={<OperationEquipment />} />
          <Route path="surgery" element={<SurgeryPage />} />
          <Route path="transfusion" element={<TransfusionPage />} />
          <Route path="blood-quality" element={<BloodQualityPage />} />
          {/* 检验管理 LIS（M11-A）：查看 lab:read，写操作按 lis:* 细分 */}
          <Route path="lis" element={<LisPage />} />
          {/* 检查管理 RIS/PACS（M11-B）：查询 imaging:read，写操作按 ris:* 细分 */}
          <Route path="ris" element={<RisPage />} />
          {/* 检查检验结果 AI 智能解读（M12-A）：查看 lab:interpret:view，写/签名按 lab/imaging:interpret:sign */}
          <Route path="interpret" element={<InterpretPage />} />
          {/* VTE 智能防治（M13-A）：查看 vte:read，评估/药物确认/机械执行按权限细分 */}
          <Route path="vte" element={<VtePage />} />
          {/* 抗菌药物管理 AMS（M14-A）：查看 ams:read，开方/点评/审批/质控按权限细分 */}
          <Route path="ams" element={<AmsPage />} />
          {/* 临床路径管理（M15-A）：查看 pathway:read，入径/执行/变异/出径按权限细分 */}
          <Route path="pathway" element={<PathwayPage />} />
          {/* 护理管理后台（M16-B）：查看 nursing_admin:view，排班/指标写操作按权限细分 */}
          <Route
            path="nursing-admin"
            element={
              <RequirePermission permission="nursing_admin:view">
                <NursingAdminPage />
              </RequirePermission>
            }
          />
          {/* 压疮/跌倒风险预警闭环（M17-A）：查看 nursing_risk:read，评估/预防写操作按权限细分 */}
          <Route
            path="nursing-risk"
            element={
              <RequirePermission permission="nursing_risk:read">
                <NursingRiskPage />
              </RequirePermission>
            }
          />
          {/* 给药三查七对 MAR（M17-B）：查看 med_admin:read，给药执行按权限细分 */}
          <Route
            path="med-admin"
            element={
              <RequirePermission permission="med_admin:read">
                <MedAdminPage />
              </RequirePermission>
            }
          />

          {/* 管路护理 + 非计划拔管（M17-C） */}
          <Route
            path="tube-care"
            element={
              <RequirePermission permission="tube_care:read">
                <TubeCarePage />
              </RequirePermission>
            }
          />

          {/* 不良事件后结构化评估（M17-D） */}
          <Route
            path="event-review"
            element={
              <RequirePermission permission="event_review:read">
                <EventReviewPage />
              </RequirePermission>
            }
          />

          {/* 护理出入量（M17-E） */}
          <Route
            path="nursing-io"
            element={
              <RequirePermission permission="nursing_io:read">
                <NursingIoPage />
              </RequirePermission>
            }
          />

          {/* 入院营养风险筛查 NRS-2002（M29-A） */}
          <Route
            path="nutrition-screening"
            element={
              <RequirePermission permission="nutrition:view">
                <NutritionScreeningPage />
              </RequirePermission>
            }
          />

          {/* 疼痛评估 NRS（M29-B） */}
          <Route
            path="pain-assessment"
            element={
              <RequirePermission permission="pain:view">
                <PainAssessmentPage />
              </RequirePermission>
            }
          />

          {/* 术前访视 ASA（M31-A） */}
          <Route
            path="preop-assessment"
            element={
              <RequirePermission permission="preop:view">
                <PreopAssessmentPage />
              </RequirePermission>
            }
          />

          {/* PACU 复苏记录（M31-B） */}
          <Route
            path="pacu-record"
            element={
              <RequirePermission permission="pacu:view">
                <PacuRecordPage />
              </RequirePermission>
            }
          />

          {/* 术后镇痛随访（M31-C） */}
          <Route
            path="postop-followup"
            element={
              <RequirePermission permission="postop_followup:view">
                <PostopFollowupPage />
              </RequirePermission>
            }
          />

          {/* ICU RASS 镇静评分（M33-A） */}
          <Route
            path="icu-sedation"
            element={
              <RequirePermission permission="icu_sedation:view">
                <IcuSedationPage />
              </RequirePermission>
            }
          />

          {/* 产后访视（M34-A） */}
          <Route
            path="postpartum"
            element={
              <RequirePermission permission="postpartum:view">
                <PostpartumVisitPage />
              </RequirePermission>
            }
          />

          {/* 急诊分诊（M35-A） */}
          <Route
            path="er-triage"
            element={
              <RequirePermission permission="er_triage:view">
                <ErTriagePage />
              </RequirePermission>
            }
          />

          {/* Barthel ADL（M35-B） */}
          <Route
            path="barthel"
            element={
              <RequirePermission permission="barthel:view">
                <BarthelPage />
              </RequirePermission>
            }
          />

          {/* 绿色通道催办（M37-A） */}
          <Route
            path="er-green"
            element={
              <RequirePermission permission="er_triage:view">
                <ErGreenPage />
              </RequirePermission>
            }
          />

          {/* 慢病随访（M39-A） */}
          <Route
            path="chronic"
            element={
              <RequirePermission permission="chronic:view">
                <ChronicPage />
              </RequirePermission>
            }
          />

          {/* 患者端慢病（M39-B） */}
          <Route
            path="patient-chronic"
            element={
              <RequirePermission permission="patient_chronic:view">
                <PatientChronicPage />
              </RequirePermission>
            }
          />

          {/* 体检中心（M40-A） */}
          <Route
            path="healthcheck"
            element={
              <RequirePermission permission="healthcheck:view">
                <HealthCheckPage />
              </RequirePermission>
            }
          />

          {/* 体检转诊（M40-B） */}
          <Route
            path="healthcheck-referrals"
            element={
              <RequirePermission permission="healthcheck:referral">
                <HealthCheckReferralPage />
              </RequirePermission>
            }
          />

          {/* 肿瘤随访（M41-A） */}
          <Route
            path="oncology"
            element={
              <RequirePermission permission="oncology:view">
                <OncologyPage />
              </RequirePermission>
            }
          />

          {/* 化疗提醒（M43-A） */}
          <Route
            path="chemo-reminder"
            element={
              <RequirePermission permission="oncology:view">
                <ChemoReminderPage />
              </RequirePermission>
            }
          />

          {/* 心理筛查（M44-A） */}
          <Route
            path="psych-screening"
            element={
              <RequirePermission permission="psych:view">
                <PsychScreeningPage />
              </RequirePermission>
            }
          />

          {/* 院感上报（M45-A） */}
          <Route
            path="niss"
            element={
              <RequirePermission permission="infection:view">
                <NissReportingPage />
              </RequirePermission>
            }
          />

          {/* VTE 抗凝（M46-A） */}
          <Route
            path="vte-anticoag"
            element={
              <RequirePermission permission="vte:view">
                <VteAnticoagPage />
              </RequirePermission>
            }
          />

          {/* 医嘱开方 CDS（M18-A） */}
          <Route
            path="cds-override"
            element={
              <RequirePermission permission="cds:read">
                <CdsOverridePage />
              </RequirePermission>
            }
          />

          {/* 护士站四合一屏（M18-B） */}
          <Route
            path="nurse-station"
            element={
              <RequirePermission permission="nurse_station:read">
                <NurseStationPage />
              </RequirePermission>
            }
          />

          {/* 号源排班选号（M19-A） */}
          <Route
            path="schedule-slots"
            element={
              <RequirePermission permission="schedule:book">
                <ScheduleSlotPage />
              </RequirePermission>
            }
          />

          {/* 我的报告推送（M19-B） */}
          <Route
            path="report-pushes"
            element={
              <RequirePermission permission="report:view_patient">
                <ReportPushPage />
              </RequirePermission>
            }
          />

          {/* 通知中心（M20-A） */}
          <Route
            path="notifications"
            element={
              <RequirePermission permission="notification:read">
                <NotificationPage />
              </RequirePermission>
            }
          />

          {/* 续方流转（M21-A） */}
          <Route
            path="renewal"
            element={
              <RequirePermission permission="renewal:pay">
                <RenewalPage />
              </RequirePermission>
            }
          />

          {/* 患者端住院费用（M50-A） */}
          <Route
            path="patient-billing"
            element={
              <RequirePermission permission="patient_billing:view">
                <PatientBillingPage />
              </RequirePermission>
            }
          />

          {/* 康复治疗执行（M51-A） */}
          <Route
            path="rehab-treatment"
            element={
              <RequirePermission permission="rehab_treatment:view">
                <RehabTreatmentPage />
              </RequirePermission>
            }
          />

          {/* 疼痛门诊（M52-A） */}
          <Route
            path="pain-clinic"
            element={
              <RequirePermission permission="pain_clinic:view">
                <PainClinicPage />
              </RequirePermission>
            }
          />

          {/* 老年综合评估 CGA（M56-A） */}
          <Route
            path="cga"
            element={
              <RequirePermission permission="cga:view">
                <CgaPage />
              </RequirePermission>
            }
          />

          {/* 营养科会诊（M58-A） */}
          <Route
            path="nutrition-consults"
            element={
              <RequirePermission permission="nutrition_consult:view">
                <NutritionConsultPage />
              </RequirePermission>
            }
          />

          {/* STOP-BANG 睡眠筛查（M59-A） */}
          <Route
            path="stopbang"
            element={
              <RequirePermission permission="stopbang:view">
                <StopbangPage />
              </RequirePermission>
            }
          />

          {/* 出院计划与随访（M61-A） */}
          <Route
            path="discharge-plan"
            element={
              <RequirePermission permission="discharge_plan:view">
                <DischargePlanPage />
              </RequirePermission>
            }
          />

          {/* 复诊号源预约（M62-A） */}
          <Route
            path="followup-appointment"
            element={
              <RequirePermission permission="followup_appt:view">
                <FollowupAppointmentPage />
              </RequirePermission>
            }
          />

          {/* 患者满意度调查（M63-A） */}
          <Route
            path="satisfaction-survey"
            element={
              <RequirePermission permission="satisfaction:view">
                <SatisfactionSurveyPage />
              </RequirePermission>
            }
          />

          {/* 满意度提醒推送（M64-A） */}
          <Route
            path="satisfaction-reminder"
            element={
              <RequirePermission permission="satisfaction:notify">
                <SatisfactionReminderPage />
              </RequirePermission>
            }
          />

          {/* MDT 多学科会诊（M66-A） */}
          <Route
            path="mdt-consult"
            element={
              <RequirePermission permission="mdt:view">
                <MdtConsultPage />
              </RequirePermission>
            }
          />

          {/* MDT 结论转治疗方案（M67-A） */}
          <Route
            path="mdt-treatment-plan"
            element={
              <RequirePermission permission="treatment_plan:view">
                <MdtTreatmentPlanPage />
              </RequirePermission>
            }
          />

          {/* PICC/输液港维护（M68-A） */}
          <Route
            path="picc-maintenance"
            element={
              <RequirePermission permission="picc:view">
                <PiccMaintenancePage />
              </RequirePermission>
            }
          />

          {/* 合理用药审查 CDI（M70-A） */}
          <Route
            path="cdi-review"
            element={
              <RequirePermission permission="cdi:view">
                <CdiReviewPage />
              </RequirePermission>
            }
          />

          {/* 输血反应监控（M71-A） */}
          <Route
            path="transfusion-reaction"
            element={
              <RequirePermission permission="transfusion:view">
                <TransfusionReactionPage />
              </RequirePermission>
            }
          />

          {/* 院内转运交接 SBAR（M73-A） */}
          <Route
            path="sbar-handoff"
            element={
              <RequirePermission permission="sbar:view">
                <SbarHandoffPage />
              </RequirePermission>
            }
          />

          {/* 急诊留观登记（M74-A） */}
          <Route
            path="ed-observation"
            element={
              <RequirePermission permission="ed_obs:view">
                <EdObservationPage />
              </RequirePermission>
            }
          />

          {/* 院感监测看板（M76-A） */}
          <Route
            path="infection-dashboard"
            element={
              <RequirePermission permission="infection_dash:view">
                <InfectionDashboardPage />
              </RequirePermission>
            }
          />

          {/* 合理用药看板（M77-A） */}
          <Route
            path="am-dashboard"
            element={
              <RequirePermission permission="am_dash:view">
                <AmDashboardPage />
              </RequirePermission>
            }
          />

          {/* 医生站工作台（M79-A） */}
          <Route
            path="doctor-workbench"
            element={
              <RequirePermission permission="workbench:view">
                <DoctorWorkbenchPage />
              </RequirePermission>
            }
          />

          {/* 患者端门户（M80-A） */}
          <Route
            path="patient-portal"
            element={
              <RequirePermission permission="patient_portal:view">
                <PatientPortalPage />
              </RequirePermission>
            }
          />

          {/* WHO 手术核查表（M82-A） */}
          <Route
            path="surgical-checklist"
            element={
              <RequirePermission permission="surgical_check:view">
                <SurgicalChecklistPage />
              </RequirePermission>
            }
          />

          {/* 待配药任务（M21-B） */}
          <Route
            path="pharmacy-tasks"
            element={
              <RequirePermission permission="pharmacy:dispense">
                <PharmacyTaskPage />
              </RequirePermission>
            }
          />

          {/* DRG 预算预警（M22-A） */}
          <Route
            path="drg-budget"
            element={
              <RequirePermission permission="drg_budget:view">
                <DrgBudgetPage />
              </RequirePermission>
            }
          />

          {/* 在院费用监控（M22-B） */}
          <Route
            path="inpatient-cost-monitor"
            element={
              <RequirePermission permission="inpatient_cost:view">
                <InpatientCostMonitorPage />
              </RequirePermission>
            }
          />

          {/* 成本归因（M22-C） */}
          <Route
            path="cost-attribution"
            element={
              <RequirePermission permission="drg_attribution:view">
                <CostAttributionPage />
              </RequirePermission>
            }
          />

          {/* 改进任务（M22-D） */}
          <Route
            path="improvement-tasks"
            element={
              <RequirePermission permission="improvement_task:handle">
                <ImprovementTaskPage />
              </RequirePermission>
            }
          />

          {/* 效果回看（M22-E） */}
          <Route
            path="improvement-outcome"
            element={
              <RequirePermission permission="improvement_outcome:view">
                <ImprovementOutcomePage />
              </RequirePermission>
            }
          />

          {/* 升级链（M22-F） */}
          <Route
            path="escalation"
            element={
              <RequirePermission permission="improvement_task:handle">
                <EscalationPage />
              </RequirePermission>
            }
          />

          {/* DIP 点值（M23-A） */}
          <Route
            path="dip"
            element={
              <RequirePermission permission="dip:view">
                <DipPage />
              </RequirePermission>
            }
          />

          {/* 病组双轨选择（M23-B） */}
          <Route
            path="payment-selection"
            element={
              <RequirePermission permission="payment_select:view">
                <PaymentSelectionPage />
              </RequirePermission>
            }
          />

          {/* 月度结算报表（M23-C） */}
          <Route
            path="settlement-report"
            element={
              <RequirePermission permission="settlement_report:view">
                <SettlementReportPage />
              </RequirePermission>
            }
          />

          {/* 医保驾驶舱（M23-D） */}
          <Route
            path="settlement-analytics"
            element={
              <RequirePermission permission="settlement_analytics:view">
                <SettlementAnalyticsPage />
              </RequirePermission>
            }
          />

          {/* 结算下钻（M23-E） */}
          <Route
            path="settlement-drilldown"
            element={
              <RequirePermission permission="settlement_drilldown:view">
                <SettlementDrilldownPage />
              </RequirePermission>
            }
          />

          {/* 认证与权限体系（健澜科技 RBAC） */}
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="system/users"
            element={
              <RequirePermission permission="system:user:view">
                <UserManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="system/roles"
            element={
              <RequirePermission permission="system:role:view">
                <RoleManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="system/permissions"
            element={
              <RequirePermission permission="system:perm:manage">
                <PermissionManagementPage />
              </RequirePermission>
            }
          />
          <Route
            path="system/audit-logs"
            element={
              <RequirePermission permission="system:audit:view">
                <AuditLogPage />
              </RequirePermission>
            }
          />
          <Route
            path="system/login-logs"
            element={
              <RequirePermission permission="system:loginlog:view">
                <LoginLogPage />
              </RequirePermission>
            }
          />
        </Route>

        {/* 产品演示页（独立布局，无需登录） */}
        <Route path="/demo" element={<DemoLayout />}>
          <Route index element={<DemoHome />} />
          <Route path="features" element={<DemoFeatures />} />
          <Route path="scenarios" element={<DemoScenarios />} />
          <Route path="chat" element={<DemoChat />} />
          <Route path="patient" element={<DemoPatient />} />
          <Route path="data" element={<DemoData />} />
          <Route path="architecture" element={<DemoArchitecture />} />
          <Route path="about" element={<DemoAbout />} />
        </Route>

        {/* AI 移动护理 PDA 执行端（M16-A）：独立移动布局，需 mobile_nursing:execute */}
        <Route path="/m/login" element={<MobileLogin />} />
        <Route
          path="/m"
          element={
            <RequirePermission permission="mobile_nursing:execute">
              <MobileLayout />
            </RequirePermission>
          }
        >
          <Route index element={<Navigate to="/m/patients" replace />} />
          <Route path="patients" element={<MobilePatients />} />
          <Route path="bed/:visitId" element={<MobileBedSide />} />
          <Route path="tasks" element={<MobileTasks />} />
          <Route path="handoff" element={<MobileHandoff />} />
          <Route path="me" element={<MobileMe />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <SessionTimeoutWatcher />
    </Suspense>
  );
}
