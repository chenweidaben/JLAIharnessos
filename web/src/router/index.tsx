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
// 院长数据驾驶舱（院长版）：六大核心指标大屏
const CeoBoard = lazy(() => import('@/pages/dashboard/CeoBoard'));
const PatientList = lazy(() => import('@/pages/patients'));
const PatientDetail = lazy(() => import('@/pages/patients/detail'));
const AgentChat = lazy(() => import('@/pages/agent'));
const MedMuseChatPage = lazy(() => import('@/pages/agent/MedMuseChatPage'));
const Alerts = lazy(() => import('@/pages/alerts'));
const Emergency = lazy(() => import('@/pages/emergency'));
const EmergencyTriage = lazy(() => import('@/pages/emergency/triage-detail'));
// 药房调剂发药工作站（M2-A）
const Pharmacy = lazy(() => import('@/pages/pharmacy'));
// 药品库存预警（低库存 + 建议采购量）
const InventoryAlert = lazy(() => import('@/pages/pharmacy/InventoryAlert'));
// 运行病历质控工作站（M2-B）
const MedicalQc = lazy(() => import('@/pages/medicalQc'));
// 语音电子病历工作站（M2-C）
const VoiceMedical = lazy(() => import('@/pages/voiceMedical'));
// 病案首页工作站（M3-A）
const FrontPage = lazy(() => import('@/pages/frontPage'));
// 科研专病队列（M5-B）
const Research = lazy(() => import('@/pages/research'));
// 科研专病队列导出（纳排筛选 + CSV 导出）
const CohortExport = lazy(() => import('@/pages/research/CohortExport'));
// AI 辅助科研助手（M166-C）：文献综述/实验设计/统计方案/论文初稿
const ResearchAssistant = lazy(() => import('@/pages/research/ResearchAssistant'));
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
// 全院知识检索 Hospital Muse 搜索（M115-D）
const MuseSearchPage = lazy(() => import('@/pages/muse/Search'));
// AI 第八剑客合理用药实时审查（M94-B）
const DrugReviewPage = lazy(() => import('@/pages/emrGap/drugReview'));
// 电子病历五级评审自评仪表盘（M94-C）
const EmrLevel5Page = lazy(() => import('@/pages/emrGap/level5'));
// 电子病历五级评审八维自评闭环（M106-A）
const Grade5AssessmentPage = lazy(() => import('@/pages/emr/Grade5Assessment'));
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
// MEDMUSE agent 健康度看板（M99-A）
const AgentHealthPage = lazy(() => import('@/pages/medmuse/AgentHealth'));
// 经验/教训主动录入（M115-B，依据宪法第七章）
const LessonNewPage = lazy(() => import('@/pages/muse/LessonNew'));
// 个人 MUSE 主页（M115-A，依据宪法第七章）
const MuseHomePage = lazy(() => import('@/pages/muse/Home'));
// 临床路径变异管理（M99-B）
const PathwayVariancePage = lazy(() => import('@/pages/emrGap/pathwayVariance'));
// 手术排程看板（M99-C）
const SurgerySchedulePage = lazy(() => import('@/pages/surgery/Schedule'));
// 护士交接班记录（M100-B）
const NurseHandoffPage = lazy(() => import('@/pages/nursing/Handoff'));
// 住院费用清单（M101-A）
const BillListPage = lazy(() => import('@/pages/billing/BillList'));
// 质控整改闭环看板（M101-B）
const QcRectificationPage = lazy(() => import('@/pages/qc/Rectification'));
// 床位管理可视化（M102-C）
const BedMapPage = lazy(() => import('@/pages/nursing/BedMap'));
// 护理敏感质量指标（NQI）月度趋势看板
const NqiDashboardPage = lazy(() => import('@/pages/nursing/NqiDashboard'));
// 科室月度运营报表（M102-D）
const MonthlyReportPage = lazy(() => import('@/pages/ops/MonthlyReport'));
// M183-A：Doctor MUSE 推荐效果追踪
const PersonalAgentAdoption = lazy(() => import('@/pages/personal-agent/adoption'));
// M183-B：学习闭环数据飞轮
const LearningFlywheel = lazy(() => import('@/pages/learning/flywheel'));
// M183-D：安全审计日志
const AdminAuditLog = lazy(() => import('@/pages/admin/audit-log'));
// M184-A：护士智能排班优化
const NurseScheduleOptimize = lazy(() => import('@/pages/scheduling/optimize'));
// M184-B：智能随访
const SmartFollowup = lazy(() => import('@/pages/followup/smart'));
// M184-C：设备预测性维护
const EquipmentPredictive = lazy(() => import('@/pages/equipment/predictive'));
// M184-D：备份容灾策略
const BackupStrategy = lazy(() => import('@/pages/admin/backup-strategy'));
// M185-A：AI大脑2.0住院试点
const InpatientBrainV2 = lazy(() => import('@/pages/ai-brain/v2/inpatient'));
// M185-B：数字孪生3D手术室
const ORTwins3D = lazy(() => import('@/pages/twin3d/or'));
// M185-C：Nurse MUSE V2
const NurseMUSEV2 = lazy(() => import('@/pages/personal-agent/nurse-muse'));
// M185-D：Pharma MUSE V2
const PharmaMUSEV2 = lazy(() => import('@/pages/personal-agent/pharma-muse'));
// M186-A：Admin MUSE V2
const AdminMUSEV2 = lazy(() => import('@/pages/personal-agent/admin-muse'));
// M186-B：Patient MUSE V2
const PatientMUSEV2 = lazy(() => import('@/pages/personal-agent/patient-muse'));
// M186-C：区域协同分级诊疗 V2
const RegionalCollaborationV2 = lazy(() => import('@/pages/regional/collaboration-v2'));
// M186-D：全自学习闭环深化
const SelfLearningLoop = lazy(() => import('@/pages/learning/self-loop'));
// M187-A：生产性能优化 V2
const PerformanceReportV2 = lazy(() => import('@/pages/admin/performance-v2'));
// M187-B：安全加固 V2
const SecurityReportV2 = lazy(() => import('@/pages/admin/security-v2'));
// M187-C：EMR 五级评审 V2
const EMRGrade5V2 = lazy(() => import('@/pages/emr/grade5'));
// M187-D：DRG 智能审核 V2
const DRGAuditV2 = lazy(() => import('@/pages/drg/audit'));
// M188-A：临床路径 V2
const ClinicalPathwayV2 = lazy(() => import('@/pages/clinical/pathway-v2'));
// M188-B：合理用药监测
const RationalDrugUse = lazy(() => import('@/pages/drug/rational'));
// M188-C：院感控制 V2
const InfectionControlV2 = lazy(() => import('@/pages/infection/control'));
// M188-D：医疗纠纷预警
const DisputeWarning = lazy(() => import('@/pages/dispute/warning'));
// M189-A：绩效管理
const PerformanceManagement = lazy(() => import('@/pages/admin/performance-management'));
// M189-B：成本核算
const CostAccounting = lazy(() => import('@/pages/admin/cost-accounting'));
// M189-C：质量管理
const QualityManagement = lazy(() => import('@/pages/admin/quality-management'));
// M189-D：运营分析
const OperationsAnalytics = lazy(() => import('@/pages/admin/operations-analytics'));
// M190-A：检验检查审核
const LabImagingAudit = lazy(() => import('@/pages/lab-imaging/audit'));
// M190-B：输血管理
const BloodTransfusion = lazy(() => import('@/pages/blood/transfusion'));
// M190-C：麻醉管理
const Anesthesia = lazy(() => import('@/pages/anesthesia'));
// M190-D：急诊管理报表
const EmergencyReport = lazy(() => import('@/pages/emergency/report'));
// M191-A：科研管理
const ResearchManagement = lazy(() => import('@/pages/admin/research'));
// M191-B：教学管理
const TeachingManagement = lazy(() => import('@/pages/admin/teaching'));
// M191-C：人力资源管理
const HRManagement = lazy(() => import('@/pages/admin/hr'));
// M191-D：设备物资管理
const EquipmentMaterial = lazy(() => import('@/pages/admin/equipment-material'));
// M192-A：财务收费管理
const FinanceBilling = lazy(() => import('@/pages/admin/finance'));
// M192-B：医保管理
const InsuranceManagement = lazy(() => import('@/pages/admin/insurance'));
// M192-C：公共卫生管理
const PublicHealth = lazy(() => import('@/pages/admin/public-health'));
// M192-D：后勤管理
const LogisticsManagement = lazy(() => import('@/pages/admin/logistics'));
// M192-D V2：后勤管理报表
const LogisticsReportV2 = lazy(() => import('@/pages/admin/logistics-report-v2'));
// M193-A：性能压测
const PerformanceStress = lazy(() => import('@/pages/admin/performance-stress'));
// M193-B：安全渗透测试
const SecurityPenTest = lazy(() => import('@/pages/admin/security-pen'));
// M193-C：质量管理体系
const QualitySystem = lazy(() => import('@/pages/admin/quality-system'));
// M193-D：患者安全
const PatientSafety = lazy(() => import('@/pages/admin/patient-safety'));
// M194-A：党建管理
const PartyBuilding = lazy(() => import('@/pages/admin/party-building'));
// M194-B：纪检监察
const Discipline = lazy(() => import('@/pages/admin/discipline'));
// M194-C：工会管理
const LaborUnion = lazy(() => import('@/pages/admin/labor-union'));
// M194-D：宣传管理
const Publicity = lazy(() => import('@/pages/admin/publicity'));
// M195-A V2：互联网医院深化
const InternetHospitalV2 = lazy(() => import('@/pages/internet-hospital-v2'));
// M195-B：远程医疗
const Telemedicine = lazy(() => import('@/pages/telemedicine'));
// M195-C：移动医疗
const MobileHealth = lazy(() => import('@/pages/mobile-health'));
// M195-D：智慧医疗
const SmartHealthcare = lazy(() => import('@/pages/smart-healthcare'));
// M196-A：大数据平台
const BigDataPlatform = lazy(() => import('@/pages/admin/big-data'));
// M196-B：AI 中台
const AIPlatform = lazy(() => import('@/pages/admin/ai-platform'));
// M196-C：物联网平台
const IoTPlatform = lazy(() => import('@/pages/admin/iot-platform'));
// M196-D：区块链
const Blockchain = lazy(() => import('@/pages/admin/blockchain'));
// M197-A：云原生
const CloudNative = lazy(() => import('@/pages/admin/cloud-native'));
// M197-B：微服务
const Microservices = lazy(() => import('@/pages/admin/microservices'));
// M197-C：DevOps
const DevOps = lazy(() => import('@/pages/admin/devops'));
// M197-D：SRE
const SRE = lazy(() => import('@/pages/admin/sre'));
// M198-A：数据安全
const DataSecurity = lazy(() => import('@/pages/admin/data-security'));
// M198-B：合规
const Compliance = lazy(() => import('@/pages/admin/compliance'));
// M198-C：审计管理
const Audit = lazy(() => import('@/pages/admin/audit'));
// 电子病历模板管理（M103-A）
const EmrTemplatePage = lazy(() => import('@/pages/emr/Template'));
// 处方点评系统（M103-B）
const PrescriptionReviewPage = lazy(() => import('@/pages/drugReview/PrescriptionReview'));
// 门诊医生工作站（M105-B）
const OpdWorkstationPage = lazy(() => import('@/pages/opd/Workstation'));
// 手术安全核查表（M105-D）
const SurgeryChecklistPage = lazy(() => import('@/pages/surgery/Checklist'));
// 医学知识图谱可视化（M147-A 知识图谱与患者教育）
const MedicalGraphVisualizer = lazy(() => import('@/pages/graph/Visualizer'));

// AI 移动护理 PDA 执行端（M16-A）：独立移动布局 /m/*，不套 PC AppLayout/SideMenu
const MobileLogin = lazy(() => import('@/pages/mobile/login'));
const MobileLayout = lazy(() => import('@/components/mobile/MobileLayout'));
const MobilePatients = lazy(() => import('@/pages/mobile/Patients'));
const MobileBedSide = lazy(() => import('@/pages/mobile/BedSide'));
const MobileTasks = lazy(() => import('@/pages/mobile/Tasks'));
const MobileHandoff = lazy(() => import('@/pages/mobile/Handoff'));
const MobileMe = lazy(() => import('@/pages/mobile/Me'));
const MobileQuickActions = lazy(() => import('@/pages/mobile/QuickActions'));

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
          {/* 院长数据驾驶舱（院长版）：登录即可，六大核心指标大屏 */}
          <Route path="dashboard/ceo-board" element={<CeoBoard />} />
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
          {/* 电子病历五级评审八维自评闭环（M106-A） */}
          <Route
            path="emr/grade5"
            element={
              <RequirePermission permission="emr_level5:view">
                <Grade5AssessmentPage />
              </RequirePermission>
            }
          />
          {/* 临床路径变异管理（M99-B） */}
          <Route
            path="emr/pathway-variance"
            element={
              <RequirePermission permission="pathway:read">
                <PathwayVariancePage />
              </RequirePermission>
            }
          />
          {/* 手术排程看板（M99-C） */}
          <Route path="surgery/schedule" element={<SurgerySchedulePage />} />
          {/* 护士交接班记录（M100-B） */}
          <Route path="nursing/handoff" element={<NurseHandoffPage />} />
          {/* 住院费用清单（M101-A） */}
          <Route path="billing/bill-list" element={<BillListPage />} />
          {/* 质控整改闭环看板（M101-B） */}
          <Route path="qc/rectification" element={<QcRectificationPage />} />
          {/* 床位管理可视化（M102-C） */}
          <Route path="nursing/bed-map" element={<BedMapPage />} />
          {/* 护理敏感质量指标（NQI）月度趋势看板 */}
          <Route path="nursing/nqi-dashboard" element={<NqiDashboardPage />} />
          {/* 科室月度运营报表（M102-D） */}
          <Route path="ops/monthly-report" element={<MonthlyReportPage />} />
          {/* M183-A：Doctor MUSE 推荐效果追踪 */}
          <Route path="personal-agent/adoption" element={<PersonalAgentAdoption />} />
          {/* M183-B：学习闭环数据飞轮 */}
          <Route path="learning/flywheel" element={<LearningFlywheel />} />
          {/* M183-D：安全审计日志 */}
          <Route path="admin/audit-log" element={<AdminAuditLog />} />
          {/* M184-A：护士智能排班优化 */}
          <Route path="scheduling/optimize" element={<NurseScheduleOptimize />} />
          {/* M184-B：智能随访 */}
          <Route path="followup/smart" element={<SmartFollowup />} />
          {/* M184-C：设备预测性维护 */}
          <Route path="equipment/predictive" element={<EquipmentPredictive />} />
          {/* M184-D：备份容灾策略 */}
          <Route path="admin/backup-strategy" element={<BackupStrategy />} />
          {/* M185-A：AI大脑2.0住院试点 */}
          <Route path="ai-brain/v2/inpatient" element={<InpatientBrainV2 />} />
          {/* M185-B：数字孪生3D手术室 */}
          <Route path="twin3d/or" element={<ORTwins3D />} />
          {/* M185-C：Nurse MUSE V2 */}
          <Route path="personal-agent/nurse-muse" element={<NurseMUSEV2 />} />
          {/* M185-D：Pharma MUSE V2 */}
          <Route path="personal-agent/pharma-muse" element={<PharmaMUSEV2 />} />
          {/* M186-A：Admin MUSE V2 */}
          <Route path="personal-agent/admin-muse" element={<AdminMUSEV2 />} />
          {/* M186-B：Patient MUSE V2 */}
          <Route path="personal-agent/patient-muse" element={<PatientMUSEV2 />} />
          {/* M186-C：区域协同 */}
          <Route path="regional/collaboration" element={<RegionalCollaborationV2 />} />
          {/* M186-D：自学习闭环 */}
          <Route path="learning/self-loop" element={<SelfLearningLoop />} />
          {/* M187-A：性能优化 */}
          <Route path="admin/performance" element={<PerformanceReportV2 />} />
          {/* M187-B：安全加固 */}
          <Route path="admin/security" element={<SecurityReportV2 />} />
          {/* M187-C：EMR 五级评审 */}
          <Route path="emr/grade5" element={<EMRGrade5V2 />} />
          {/* M187-D：DRG 审核 */}
          <Route path="drg/audit" element={<DRGAuditV2 />} />
          {/* M188-A：临床路径 */}
          <Route path="clinical/pathway" element={<ClinicalPathwayV2 />} />
          {/* M188-B：合理用药 */}
          <Route path="drug/rational" element={<RationalDrugUse />} />
          {/* M188-C：院感控制 */}
          <Route path="infection/control" element={<InfectionControlV2 />} />
          {/* M188-D：纠纷预警 */}
          <Route path="dispute/warning" element={<DisputeWarning />} />
          {/* M189-A：绩效管理 */}
          <Route path="admin/performance-management" element={<PerformanceManagement />} />
          {/* M189-B：成本核算 */}
          <Route path="admin/cost-accounting" element={<CostAccounting />} />
          {/* M189-C：质量管理 */}
          <Route path="admin/quality-management" element={<QualityManagement />} />
          {/* M189-D：运营分析 */}
          <Route path="admin/operations-analytics" element={<OperationsAnalytics />} />
          {/* M190-A：检验审核 */}
          <Route path="lab-imaging/audit" element={<LabImagingAudit />} />
          {/* M190-B：输血管理 */}
          <Route path="blood/transfusion" element={<BloodTransfusion />} />
          {/* M190-C：麻醉管理 */}
          <Route path="anesthesia" element={<Anesthesia />} />
          {/* M190-D：急诊管理报表 */}
          <Route path="emergency/report" element={<EmergencyReport />} />
          {/* M191-A：科研管理 */}
          <Route path="admin/research" element={<ResearchManagement />} />
          {/* M191-B：教学管理 */}
          <Route path="admin/teaching" element={<TeachingManagement />} />
          {/* M191-C：人力资源管理 */}
          <Route path="admin/hr" element={<HRManagement />} />
          {/* M191-D：设备物资管理 */}
          <Route path="admin/equipment-material" element={<EquipmentMaterial />} />
          {/* M192-A：财务收费管理 */}
          <Route path="admin/finance" element={<FinanceBilling />} />
          {/* M192-B：医保管理 */}
          <Route path="admin/insurance" element={<InsuranceManagement />} />
          {/* M192-C：公共卫生管理 */}
          <Route path="admin/public-health" element={<PublicHealth />} />
          {/* M192-D：后勤管理 */}
          <Route path="admin/logistics" element={<LogisticsManagement />} />
          {/* M192-D V2：后勤管理报表 */}
          <Route path="admin/logistics-report-v2" element={<LogisticsReportV2 />} />
          {/* M193-A：性能压测 */}
          <Route path="admin/performance-stress" element={<PerformanceStress />} />
          {/* M193-B：安全渗透测试 */}
          <Route path="admin/security-pen" element={<SecurityPenTest />} />
          {/* M193-C：质量管理体系 */}
          <Route path="admin/quality-system" element={<QualitySystem />} />
          {/* M193-D：患者安全 */}
          <Route path="admin/patient-safety" element={<PatientSafety />} />
          {/* M194-A：党建管理 */}
          <Route path="admin/party-building" element={<PartyBuilding />} />
          {/* M194-B：纪检监察 */}
          <Route path="admin/discipline" element={<Discipline />} />
          {/* M194-C：工会管理 */}
          <Route path="admin/labor-union" element={<LaborUnion />} />
          {/* M194-D：宣传管理 */}
          <Route path="admin/publicity" element={<Publicity />} />
          {/* M195-A V2：互联网医院深化 */}
          <Route path="internet-hospital-v2" element={<InternetHospitalV2 />} />
          {/* M195-B：远程医疗 */}
          <Route path="telemedicine" element={<Telemedicine />} />
          {/* M195-C：移动医疗 */}
          <Route path="mobile-health" element={<MobileHealth />} />
          {/* M195-D：智慧医疗 */}
          <Route path="smart-healthcare" element={<SmartHealthcare />} />
          {/* M196-A：大数据平台 */}
          <Route path="admin/big-data" element={<BigDataPlatform />} />
          {/* M196-B：AI 中台 */}
          <Route path="admin/ai-platform" element={<AIPlatform />} />
          {/* M196-C：物联网平台 */}
          <Route path="admin/iot-platform" element={<IoTPlatform />} />
          {/* M196-D：区块链 */}
          <Route path="admin/blockchain" element={<Blockchain />} />
          {/* M197-A：云原生 */}
          <Route path="admin/cloud-native" element={<CloudNative />} />
          {/* M197-B：微服务 */}
          <Route path="admin/microservices" element={<Microservices />} />
          {/* M197-C：DevOps */}
          <Route path="admin/devops" element={<DevOps />} />
          {/* M197-D：SRE */}
          <Route path="admin/sre" element={<SRE />} />
          {/* M198-A：数据安全 */}
          <Route path="admin/data-security" element={<DataSecurity />} />
          {/* M198-B：合规 */}
          <Route path="admin/compliance" element={<Compliance />} />
          {/* M198-C：审计管理 */}
          <Route path="admin/audit" element={<Audit />} />
          {/* 电子病历模板管理（M103-A） */}
          <Route path="emr/template" element={<EmrTemplatePage />} />
          {/* 处方点评系统（M103-B） */}
          <Route path="drug-review/prescription-review" element={<PrescriptionReviewPage />} />
          {/* 门诊医生工作站（M105-B） */}
          <Route path="opd/workstation" element={<OpdWorkstationPage />} />
          {/* 护理敏感指标看板（M105-C） */}
          <Route path="nursing/nqi-dashboard" element={<NqiDashboardPage />} />
          {/* 手术安全核查表（M105-D） */}
          <Route path="surgery/checklist" element={<SurgeryChecklistPage />} />
          {/* 医学知识图谱可视化（M147-A 知识图谱与患者教育） */}
          <Route path="graph/visualizer" element={<MedicalGraphVisualizer />} />
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
          {/* 全院知识检索 Hospital Muse 搜索（M115-D） */}
          <Route path="muse/search" element={<MuseSearchPage />} />
          {/* MEDMUSE agent 健康度看板（M99-A） */}
          <Route path="medmuse/agent-health" element={<AgentHealthPage />} />
          {/* 经验/教训主动录入（M115-B）：登录即可录入本人决策记忆 */}
          <Route path="muse/lesson/new" element={<LessonNewPage />} />
          {/* 个人 MUSE 主页（M115-A）：本人画像 + 统计卡 + 时间线 + 30 天成长曲线 */}
          <Route path="muse/home" element={<MuseHomePage />} />
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
          {/* 药品库存预警：低库存标红 + 建议采购量 */}
          <Route path="pharmacy/inventory-alert" element={<InventoryAlert />} />
          {/* 运行病历质控工作站（M2-B） */}
          <Route path="medical-qc" element={<MedicalQc />} />
          {/* 语音电子病历工作站（M2-C） */}
          <Route path="voice-medical" element={<VoiceMedical />} />
          {/* 病案首页工作站（M3-A）：队列/详情 front_page:read，编码 code，质控归档 audit */}
          <Route path="front-page" element={<FrontPage />} />
          {/* 科研专病队列（M5-B）：research:read/write */}
          <Route path="research" element={<Research />} />
          {/* 专病队列数据导出：纳排筛选 + CSV 下载（仅登录态） */}
          <Route path="research/cohort-export" element={<CohortExport />} />
          {/* AI 辅助科研助手（M166-C）：真实文献词典综述，不编造 */}
          <Route path="research/assistant" element={<ResearchAssistant />} />
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
          <Route path="quick-actions" element={<MobileQuickActions />} />
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
