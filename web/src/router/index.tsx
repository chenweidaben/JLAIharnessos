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
          {/* 影像 AI 辅诊（DAMO-RADAR）：查看需 imaging:view，复核签名需 imaging:ai:review */}
          <Route
            path="imaging/ai/report/:studyUid?"
            element={
              <RequirePermission permission="imaging:view">
                <ImagingAiReportPage />
              </RequirePermission>
            }
          />
          <Route path="agent" element={<AgentChat />} />
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
