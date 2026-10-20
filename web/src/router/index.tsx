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

// M371 自动补全缺失 lazy import（tsc 历史债务清理）
const AuditLogsPage = lazy(() => import('@/pages/audit/logs'));
const AuditReportsPage = lazy(() => import('@/pages/audit/reports'));
const AuditTrailsPage = lazy(() => import('@/pages/audit/trails'));
// M372 角色工作流 lazy 注册
const WorkflowRolesPage = lazy(() => import('@/pages/workflow/roles'));
const WorkflowPermissionsPage = lazy(() => import('@/pages/workflow/permissions'));
const WorkflowApprovePage = lazy(() => import('@/pages/workflow/approve'));
const WorkflowNotifyPage = lazy(() => import('@/pages/workflow/notify'));
const WorkflowEscalationPage = lazy(() => import('@/pages/workflow/escalation'));
const WorkflowSlaPage = lazy(() => import('@/pages/workflow/sla'));
// M374 事件总线 lazy 注册
const EventsListPage = lazy(() => import('@/pages/events/list'));
const EventsTypesPage = lazy(() => import('@/pages/events/types'));
const EventsSubscribersPage = lazy(() => import('@/pages/events/subscribers'));
const EventsPublishPage = lazy(() => import('@/pages/events/publish'));
const EventsConsumersPage = lazy(() => import('@/pages/events/consumers'));
const EventsMetricsDetailPage = lazy(() => import('@/pages/events/metrics-detail'));
// M375 患者时间线扩展 lazy 注册
const PatientTimelineFilterPage = lazy(() => import('@/pages/patient/timeline-filter'));
const PatientTimelineSummaryPage = lazy(() => import('@/pages/patient/timeline-summary'));
const PatientTimelineComparePage = lazy(() => import('@/pages/patient/timeline-compare'));
const PatientTimelineExportPage = lazy(() => import('@/pages/patient/timeline-export'));
// M377 CDS 深度 lazy 注册
const CdsRuleEnginePage = lazy(() => import('@/pages/cds/rule-engine'));
const CdsClinicalEvidencePage = lazy(() => import('@/pages/cds/clinical-evidence'));
const CdsClinicalTrialsPage = lazy(() => import('@/pages/cds/clinical-trials'));
const CdsClinicalGuidelinesDetailPage = lazy(() => import('@/pages/cds/clinical-guidelines-detail'));
const CdsClinicalPathwaysDetailPage = lazy(() => import('@/pages/cds/clinical-pathways-detail'));
// M378 护理NQI lazy 注册
const NursingNqiIndicatorsPage = lazy(() => import('@/pages/nursing/nqi-indicators'));
const NursingNqiTrendsPage = lazy(() => import('@/pages/nursing/nqi-trends'));
const NursingNqiBenchmarksPage = lazy(() => import('@/pages/nursing/nqi-benchmarks'));
const NursingNqiAlertsPage = lazy(() => import('@/pages/nursing/nqi-alerts'));
const NursingNqiReportsPage = lazy(() => import('@/pages/nursing/nqi-reports'));
// M379 质量控制 lazy 注册
const QualityIndicatorsPage = lazy(() => import('@/pages/quality/indicators'));
const QualityScoresPage = lazy(() => import('@/pages/quality/scores'));
const QualityTrendsPage = lazy(() => import('@/pages/quality/trends'));
const QualityBenchmarksPage = lazy(() => import('@/pages/quality/benchmarks'));
const QualityAlertsPage = lazy(() => import('@/pages/quality/alerts'));
const QualityReportsPage = lazy(() => import('@/pages/quality/reports'));
// M380 风险管控 lazy 注册
const RiskIndicatorsPage = lazy(() => import('@/pages/risk/indicators'));
const RiskScoresPage = lazy(() => import('@/pages/risk/scores'));
const RiskTrendsPage = lazy(() => import('@/pages/risk/trends'));
const RiskBenchmarksPage = lazy(() => import('@/pages/risk/benchmarks'));
const RiskAlertsPage = lazy(() => import('@/pages/risk/alerts'));
const RiskReportsPage = lazy(() => import('@/pages/risk/reports'));
// M381 合规审计 lazy 注册
const AuditComplianceDetailPage = lazy(() => import('@/pages/audit/compliance-detail'));
const AuditComplianceChecklistPage = lazy(() => import('@/pages/audit/compliance-checklist'));
const AuditComplianceEvidencePage = lazy(() => import('@/pages/audit/compliance-evidence'));
const AuditComplianceRemediationPage = lazy(() => import('@/pages/audit/compliance-remediation'));
const AuditComplianceReportPage = lazy(() => import('@/pages/audit/compliance-report'));
const AuditComplianceDashboardPage = lazy(() => import('@/pages/audit/compliance-dashboard'));
// M382 安全合规 lazy 注册
const SecurityPolicyPage = lazy(() => import('@/pages/security/policy'));
const SecurityPolicyDetailPage = lazy(() => import('@/pages/security/policy-detail'));
const SecurityVulnerabilitiesPage = lazy(() => import('@/pages/security/vulnerabilities'));
const SecurityPatchesPage = lazy(() => import('@/pages/security/patches'));
// M383 数据安全 lazy 注册
const SecurityDataAccessPage = lazy(() => import('@/pages/security/data-access'));
const SecurityDataSharingPage = lazy(() => import('@/pages/security/data-sharing'));
const SecurityDataExportPage = lazy(() => import('@/pages/security/data-export'));
const SecurityDataBackupPage = lazy(() => import('@/pages/security/data-backup'));
const SecurityDataRecoveryPage = lazy(() => import('@/pages/security/data-recovery'));
// M385 安全事件 lazy 注册
const SecurityIncidentsPage = lazy(() => import('@/pages/security/incidents'));
const SecurityIncidentResponsePage = lazy(() => import('@/pages/security/incident-response'));
const AuthRolesPage = lazy(() => import('@/pages/auth/roles'));
const BiFunnelPage = lazy(() => import('@/pages/bi/funnel'));
const BillingInvoicesPage = lazy(() => import('@/pages/billing/invoices'));
const BiRealtimePage = lazy(() => import('@/pages/bi/realtime'));
const BiRetentionPage = lazy(() => import('@/pages/bi/retention'));
const CdsAlertPage = lazy(() => import('@/pages/cds/alert'));
const CdsAlertsPage = lazy(() => import('@/pages/cds/alerts'));
const CdsChecklistsPage = lazy(() => import('@/pages/cds/checklists'));
const CdsClinicalPathwayPage = lazy(() => import('@/pages/cds/clinical-pathway'));
const CdsDiagnosisSuggestionPage = lazy(() => import('@/pages/cds/diagnosis-suggestion'));
const CdsDrugDoseAdjustPage = lazy(() => import('@/pages/cds/drug-dose-adjust'));
const CdsDrugsInteractionPage = lazy(() => import('@/pages/cds/drugs-interaction'));
const CdsDuplicateTherapyPage = lazy(() => import('@/pages/cds/duplicate-therapy'));
const CdsGuidelinePage = lazy(() => import('@/pages/cds/guideline'));
const CdsGuidelinesPage = lazy(() => import('@/pages/cds/guidelines'));
const CdsImagingHintPage = lazy(() => import('@/pages/cds/imaging-hint'));
const CdsInterventionsPage = lazy(() => import('@/pages/cds/interventions'));
const CdsLabCriticalPage = lazy(() => import('@/pages/cds/lab-critical'));
const CdsPatientSummaryPage = lazy(() => import('@/pages/cds/patient-summary'));
const CdsRecommendationPage = lazy(() => import('@/pages/cds/recommendation'));
const CdsTreatmentPlanPage = lazy(() => import('@/pages/cds/treatment-plan'));
const CommunityChronicManagementPage = lazy(() => import('@/pages/community/chronic-management'));
const CommunityFamilyDoctorPage = lazy(() => import('@/pages/community/family-doctor'));
const CommunityHealthEducationPage = lazy(() => import('@/pages/community/health-education'));
const CommunityResidentsPage = lazy(() => import('@/pages/community/residents'));
const CommunityVaccinationPage = lazy(() => import('@/pages/community/vaccination'));
const CommunityVisitsPage = lazy(() => import('@/pages/community/visits'));
const ComplianceScorePage = lazy(() => import('@/pages/compliance/score'));
const EducationCoursesPage = lazy(() => import('@/pages/education/courses'));
const EducationDegreesPage = lazy(() => import('@/pages/education/degrees'));
const EducationExamsPage = lazy(() => import('@/pages/education/exams'));
const ElderlyAssessmentPage = lazy(() => import('@/pages/elderly/assessment'));
const ElderlyComprehensivePage = lazy(() => import('@/pages/elderly/comprehensive'));
const ElderlyDementiaPage = lazy(() => import('@/pages/elderly/dementia'));
const ElderlyFallsPage = lazy(() => import('@/pages/elderly/falls'));
const ElderlyFrailPage = lazy(() => import('@/pages/elderly/frail'));
const ElderlyNutritionPage = lazy(() => import('@/pages/elderly/nutrition'));
const EmergencyAmbulancePage = lazy(() => import('@/pages/emergency/ambulance'));
const EmergencyCallsPage = lazy(() => import('@/pages/emergency/calls'));
const EmergencyCriticalPage = lazy(() => import('@/pages/emergency/critical'));
const EmergencyPoisoningPage = lazy(() => import('@/pages/emergency/poisoning'));
const EmergencyRedboxPage = lazy(() => import('@/pages/emergency/redbox'));
const EmergencyRescuePage = lazy(() => import('@/pages/emergency/rescue'));
const EmergencyTraumaPage = lazy(() => import('@/pages/emergency/trauma'));
const EmrArchivesPage = lazy(() => import('@/pages/emr/archives'));
const EmrSignaturesPage = lazy(() => import('@/pages/emr/signatures'));
const EmrSignTemplatesPage = lazy(() => import('@/pages/emr/sign-templates'));
const EmrSignVerifyPage = lazy(() => import('@/pages/emr/sign-verify'));
const EmrTemplatesPage = lazy(() => import('@/pages/emr/templates'));
const EmrVersionAuthorPage = lazy(() => import('@/pages/emr/version-author'));
const EmrVersionHistoryPage = lazy(() => import('@/pages/emr/version-history'));
const EmrVersionListPage = lazy(() => import('@/pages/emr/version-list'));
const EmrVersionReviewPage = lazy(() => import('@/pages/emr/version-review'));
const EmrVersionRollbackPage = lazy(() => import('@/pages/emr/version-rollback'));
const EquipmentRepairPage = lazy(() => import('@/pages/equipment/repair'));
const EventsBusDeadletterPage = lazy(() => import('@/pages/events/bus-deadletter'));
const EventsBusDetailPage = lazy(() => import('@/pages/events/bus-detail'));
const EventsBusLogsPage = lazy(() => import('@/pages/events/bus-logs'));
const EventsBusOverviewPage = lazy(() => import('@/pages/events/bus-overview'));
const EventsBusPublishersPage = lazy(() => import('@/pages/events/bus-publishers'));
const EventsBusSubscribersPage = lazy(() => import('@/pages/events/bus-subscribers'));
const EventsDeadLetterPage = lazy(() => import('@/pages/events/dead-letter'));
const EventsMetricsPage = lazy(() => import('@/pages/events/metrics'));
const EventsRetryPage = lazy(() => import('@/pages/events/retry'));
const FhirAccountPage = lazy(() => import('@/pages/fhir/account'));
const FhirClaimPage = lazy(() => import('@/pages/fhir/claim'));
const FhirCommunicationPage = lazy(() => import('@/pages/fhir/communication'));
const FhirCoveragePage = lazy(() => import('@/pages/fhir/coverage'));
const FhirDocumentReferencePage = lazy(() => import('@/pages/fhir/documentreference'));
const FhirMedicationPage = lazy(() => import('@/pages/fhir/medication'));
const FhirQuestionnairePage = lazy(() => import('@/pages/fhir/questionnaire'));
const FinanceAssetsPage = lazy(() => import('@/pages/finance/assets'));
const FinanceExpensesPage = lazy(() => import('@/pages/finance/expenses'));
const GeriatricsAssessmentPage = lazy(() => import('@/pages/geriatrics/assessment'));
const GeriatricsDementiaPage = lazy(() => import('@/pages/geriatrics/dementia'));
const GeriatricsFallsPage = lazy(() => import('@/pages/geriatrics/falls'));
const HrRecruitmentPage = lazy(() => import('@/pages/hr/recruitment'));
const HrTrainingsPage = lazy(() => import('@/pages/hr/trainings'));
const InsuranceBenefitsPage = lazy(() => import('@/pages/insurance/benefits'));
const InsuranceDirectoryPage = lazy(() => import('@/pages/insurance/directory'));
const InternetAppointmentsPage = lazy(() => import('@/pages/internet/appointments'));
const InternetConsultationsPage = lazy(() => import('@/pages/internet/consultations'));
const InternetFollowupPage = lazy(() => import('@/pages/internet/followup'));
const InternetHealthRecordsPage = lazy(() => import('@/pages/internet/health-records'));
const InternetHospitalOrdersPage = lazy(() => import('@/pages/internet/hospital-orders'));
const InternetPaymentsPage = lazy(() => import('@/pages/internet/payments'));
const InternetPrescriptionsPage = lazy(() => import('@/pages/internet/prescriptions'));
const LabOrdersPage = lazy(() => import('@/pages/lab/orders'));
const LabResultsPage = lazy(() => import('@/pages/lab/results'));
const MaternalChildHealthPage = lazy(() => import('@/pages/maternal/child-health'));
const MaternalPostnatalPage = lazy(() => import('@/pages/maternal/postnatal'));
const MaternalPrenatalPage = lazy(() => import('@/pages/maternal/prenatal'));
const MaternityDeliveryPage = lazy(() => import('@/pages/maternity/delivery'));
const MaternityPostpartumPage = lazy(() => import('@/pages/maternity/postpartum'));
const MaternityPrenatalPage = lazy(() => import('@/pages/maternity/prenatal'));
const MedicalRecordsArchivePage = lazy(() => import('@/pages/medical-records/archive'));
const MedicalRecordsCopyPage = lazy(() => import('@/pages/medical-records/copy'));
const MedicalRecordsPrintPage = lazy(() => import('@/pages/medical-records/print'));
const MedicalRecordsRetrievePage = lazy(() => import('@/pages/medical-records/retrieve'));
const MedicalRecordsSealPage = lazy(() => import('@/pages/medical-records/seal'));
const MedicalRecordsWatermarkPage = lazy(() => import('@/pages/medical-records/watermark'));
const MobileScanPage = lazy(() => import('@/pages/mobile/scan'));
const MobileVitalsPage = lazy(() => import('@/pages/mobile/vitals'));
const NewbornGrowthPage = lazy(() => import('@/pages/newborn/growth'));
const NewbornPhysicalPage = lazy(() => import('@/pages/newborn/physical'));
const NewbornScreeningPage = lazy(() => import('@/pages/newborn/screening'));
const NursingNqiComparisonPage = lazy(() => import('@/pages/nursing/nqi-comparison'));
const NursingNqiDetailPage = lazy(() => import('@/pages/nursing/nqi-detail'));
const NursingNqiOverviewPage = lazy(() => import('@/pages/nursing/nqi-overview'));
const NursingPlansPage = lazy(() => import('@/pages/nursing/plans'));
const NursingRoundsPage = lazy(() => import('@/pages/nursing/rounds'));
const OncologyChemotherapyPage = lazy(() => import('@/pages/oncology/chemotherapy'));
const OncologyMonitorPage = lazy(() => import('@/pages/oncology/monitor'));
const OncologyPainPage = lazy(() => import('@/pages/oncology/pain'));
const OncologyPatientsPage = lazy(() => import('@/pages/oncology/patients'));
const OncologyRadiotherapyPage = lazy(() => import('@/pages/oncology/radiotherapy'));
const OncologyTreatmentsPage = lazy(() => import('@/pages/oncology/treatments'));
const OperationAlertsPage = lazy(() => import('@/pages/operation/alerts'));
const OperationBenchmarkPage = lazy(() => import('@/pages/operation/benchmark'));
const OrdersActivePage = lazy(() => import('@/pages/orders/active'));
const OrdersCancelledPage = lazy(() => import('@/pages/orders/cancelled'));
const OrdersCompletedPage = lazy(() => import('@/pages/orders/completed'));
const OrdersListPage = lazy(() => import('@/pages/orders/list'));
const OutpatientPrescriptionsPage = lazy(() => import('@/pages/outpatient/prescriptions'));
const OutpatientTriagePage = lazy(() => import('@/pages/outpatient/triage'));
const OutpatientVisitsPage = lazy(() => import('@/pages/outpatient/visits'));
const PatientAllergiesPage = lazy(() => import('@/pages/patient/allergies'));
const PatientFamilyPage = lazy(() => import('@/pages/patient/family'));
const PatientProfilePage = lazy(() => import('@/pages/patient/profile'));
const PatientTimelineAlertsPage = lazy(() => import('@/pages/patient/timeline-alerts'));
const PatientTimelineDetailPage = lazy(() => import('@/pages/patient/timeline-detail'));
const PatientTimelineEncountersPage = lazy(() => import('@/pages/patient/timeline-encounters'));
const PatientTimelineEventsPage = lazy(() => import('@/pages/patient/timeline-events'));
const PatientTimelineMedicationsPage = lazy(() => import('@/pages/patient/timeline-medications'));
const PatientTimelineOverviewPage = lazy(() => import('@/pages/patient/timeline-overview'));
const PatientTimelinePage = lazy(() => import('@/pages/patient/timeline'));
const PatientTimelineResultsPage = lazy(() => import('@/pages/patient/timeline-results'));
const PatientVitalsPage = lazy(() => import('@/pages/patient/vitals'));
const PharmacyCheckPage = lazy(() => import('@/pages/pharmacy/check'));
const PharmacyDispensingPage = lazy(() => import('@/pages/pharmacy/dispensing'));
const PharmacyInventoryPage = lazy(() => import('@/pages/pharmacy/inventory'));
const PharmacyPurchasePage = lazy(() => import('@/pages/pharmacy/purchase'));
const PharmacyPurchasingPage = lazy(() => import('@/pages/pharmacy/purchasing'));
const PrescriptionsEmergencyPage = lazy(() => import('@/pages/prescriptions/emergency'));
const PrescriptionsInpatientPage = lazy(() => import('@/pages/prescriptions/inpatient'));
const PrescriptionsOutpatientPage = lazy(() => import('@/pages/prescriptions/outpatient'));
const QcAuditsPage = lazy(() => import('@/pages/qc/audits'));
const QcCorrectivePage = lazy(() => import('@/pages/qc/corrective'));
const QcIndicatorsPage = lazy(() => import('@/pages/qc/indicators'));
const QualityControlPage = lazy(() => import('@/pages/quality/control'));
const QualityExceptionPage = lazy(() => import('@/pages/quality/exception'));
const QualityInspectionPage = lazy(() => import('@/pages/quality/inspection'));
const RadiologyOrdersPage = lazy(() => import('@/pages/radiology/orders'));
const RadiologyReportsPage = lazy(() => import('@/pages/radiology/reports'));
const RadiologyResultsPage = lazy(() => import('@/pages/radiology/results'));
const RehabAssessmentPage = lazy(() => import('@/pages/rehab/assessment'));
const RehabAssessmentsPage = lazy(() => import('@/pages/rehab/assessments'));
const RehabEquipmentPage = lazy(() => import('@/pages/rehab/equipment'));
const RehabExercisesPage = lazy(() => import('@/pages/rehab/exercises'));
const RehabProgressPage = lazy(() => import('@/pages/rehab/progress'));
const RehabRecordsPage = lazy(() => import('@/pages/rehab/records'));
const RehabTreatmentsPage = lazy(() => import('@/pages/rehab/treatments'));
const ResearchFundsPage = lazy(() => import('@/pages/research/funds'));
const ResearchGrantsPage = lazy(() => import('@/pages/research/grants'));
const ResearchPapersPage = lazy(() => import('@/pages/research/papers'));
const ResearchProjectsListPage = lazy(() => import('@/pages/research/projects-list'));
const RiskAssessmentPage = lazy(() => import('@/pages/risk/assessment'));
const RiskMonitorPage = lazy(() => import('@/pages/risk/monitor'));
const RiskWarningPage = lazy(() => import('@/pages/risk/warning'));
const SecurityAuditAnomalyPage = lazy(() => import('@/pages/security/audit-anomaly'));
const SecurityAuditDetailPage = lazy(() => import('@/pages/security/audit-detail'));
const SecurityAuditExportPage = lazy(() => import('@/pages/security/audit-export'));
const SecurityAuditLogsPage = lazy(() => import('@/pages/security/audit-logs'));
const SecurityAuditReportPage = lazy(() => import('@/pages/security/audit-report'));
const SecurityAuditWhitelistPage = lazy(() => import('@/pages/security/audit-whitelist'));
const SecurityComplianceScorePage = lazy(() => import('@/pages/security/compliance-score'));
const SecurityDashboardPage = lazy(() => import('@/pages/security/dashboard'));
const SecurityDataAccessLogPage = lazy(() => import('@/pages/security/data-access-log'));
const SecurityDataClassificationPage = lazy(() => import('@/pages/security/data-classification'));
const SecurityDataRetentionPage = lazy(() => import('@/pages/security/data-retention'));
const SecurityEncryptionKeysPage = lazy(() => import('@/pages/security/encryption-keys'));
const SecurityEncryptionStatusPage = lazy(() => import('@/pages/security/encryption-status'));
const SecurityLoginHistoryPage = lazy(() => import('@/pages/security/login-history'));
const SecurityMaskingLogsPage = lazy(() => import('@/pages/security/masking-logs'));
const SecurityMaskingRulesPage = lazy(() => import('@/pages/security/masking-rules'));
const SecurityPermissionMatrixPage = lazy(() => import('@/pages/security/permission-matrix'));
const SecurityPermissionsPage = lazy(() => import('@/pages/security/permissions'));
const SecurityPrivacyReportPage = lazy(() => import('@/pages/security/privacy-report'));
const SecurityRoleMappingPage = lazy(() => import('@/pages/security/role-mapping'));
const SecurityRolesPage = lazy(() => import('@/pages/security/roles'));
const SecurityUserSessionsPage = lazy(() => import('@/pages/security/user-sessions'));
const SettlementListPage = lazy(() => import('@/pages/settlement/list'));
const SmartServiceQueuePage = lazy(() => import('@/pages/smart-service/queue'));
const SuppliesCheckPage = lazy(() => import('@/pages/supplies/check'));
const SuppliesPurchasePage = lazy(() => import('@/pages/supplies/purchase'));
const SuppliesWarningPage = lazy(() => import('@/pages/supplies/warning'));
const SurgeryOrdersPage = lazy(() => import('@/pages/surgery/orders'));
const SurgeryRecordsPage = lazy(() => import('@/pages/surgery/records'));
const SystemConfigsPage = lazy(() => import('@/pages/system/configs'));
const SystemDictPage = lazy(() => import('@/pages/system/dict'));
const SystemFeatureFlagsPage = lazy(() => import('@/pages/system/feature-flags'));
const SystemLogsPage = lazy(() => import('@/pages/system/logs'));
const SystemVersionPage = lazy(() => import('@/pages/system/version'));
const TasksDonePage = lazy(() => import('@/pages/tasks/done'));
const TasksOverduePage = lazy(() => import('@/pages/tasks/overdue'));
const TasksTodoPage = lazy(() => import('@/pages/tasks/todo'));
const TeachingTrainingPage = lazy(() => import('@/pages/teaching/training'));
const TelemedEquipmentPage = lazy(() => import('@/pages/telemed/equipment'));
const TelemedicineConsultationsPage = lazy(() => import('@/pages/telemedicine/consultations'));
const TelemedicineDevicesPage = lazy(() => import('@/pages/telemedicine/devices'));
const TelemedicineRecordsPage = lazy(() => import('@/pages/telemedicine/records'));
const TelemedRecordsPage = lazy(() => import('@/pages/telemed/records'));
const TelemedReferralsPage = lazy(() => import('@/pages/telemed/referrals'));
const TelemedSpecialistsPage = lazy(() => import('@/pages/telemed/specialists'));
const TelemedVideoPage = lazy(() => import('@/pages/telemed/video'));
const TenantConfigPage = lazy(() => import('@/pages/tenant/config'));
const TenantDataIsolationPage = lazy(() => import('@/pages/tenant/data-isolation'));
const TenantListPage = lazy(() => import('@/pages/tenant/list'));
const TenantLogsPage = lazy(() => import('@/pages/tenant/logs'));
const TenantQuotaPage = lazy(() => import('@/pages/tenant/quota'));
const TenantsBillingPage = lazy(() => import('@/pages/tenants/billing'));
const TenantsOverviewPage = lazy(() => import('@/pages/tenants/overview'));
const TenantUsagePage = lazy(() => import('@/pages/tenant/usage'));
const WorkflowAdminPage = lazy(() => import('@/pages/workflow/admin'));
const WorkflowAdminTasksPage = lazy(() => import('@/pages/workflow/admin-tasks'));
const WorkflowDoctorTasksPage = lazy(() => import('@/pages/workflow/doctor-tasks'));
const WorkflowHistoryPage = lazy(() => import('@/pages/workflow/history'));
const WorkflowNurseTasksPage = lazy(() => import('@/pages/workflow/nurse-tasks'));
const WorkflowPharmacistTasksPage = lazy(() => import('@/pages/workflow/pharmacist-tasks'));
const WorkflowQueuePage = lazy(() => import('@/pages/workflow/queue'));
const WorkflowTasksPage = lazy(() => import('@/pages/workflow/tasks'));
const WorkflowTemplatesPage = lazy(() => import('@/pages/workflow/templates'));


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
const AiCdaSuggestPage = lazy(() => import('@/pages/ai/cda'));
const AiRiskPredictionPage = lazy(() => import('@/pages/ai/risk'));
const BiTrendsPage = lazy(() => import('@/pages/bi/trends'));
const BiComparisonPage = lazy(() => import('@/pages/bi/comparison'));
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
// M257 详情页 lazy 注册
const OutpatientDetailPage = lazy(() => import('@/pages/outpatient/detail'));
const InpatientDetailPage = lazy(() => import('@/pages/inpatient/detail'));
const OrderDetailPage = lazy(() => import('@/pages/order/detail'));
const MedicationDetailPage = lazy(() => import('@/pages/medication/detail'));
const DischargeDetailPage = lazy(() => import('@/pages/discharge/detail'));
// M258 合规/安全深度页 lazy 注册
const ComplianceAuditPage = lazy(() => import('@/pages/compliance/audit'));
const ComplianceReportsPage = lazy(() => import('@/pages/compliance/reports'));
const SecurityDataMaskPage = lazy(() => import('@/pages/security/data-mask'));
// M261 EMR 版本/审计/租户/脱敏规则/访问日志 lazy 注册
const EmrVersionsPage = lazy(() => import('@/pages/emr/versions'));
const EmrAuditTrailPage = lazy(() => import('@/pages/emr/audit-trail'));
const TenantsListPage = lazy(() => import('@/pages/tenants/list'));
// M311 麻醉/中医/牙科 lazy 注册
const AnesthesiaRecordsPage = lazy(() => import('@/pages/anesthesia/records'));
const AnesthesiaComplicationsPage = lazy(() => import('@/pages/anesthesia/complications'));
const TcmPrescriptionsPage = lazy(() => import('@/pages/tcm/prescriptions'));
const TcmFormulasPage = lazy(() => import('@/pages/tcm/formulas'));
const DentalAppointmentsPage = lazy(() => import('@/pages/dental/appointments'));
// M312 肿瘤/慢病/ICU lazy 注册
const OncologyRecordsPage = lazy(() => import('@/pages/oncology/records'));
const ChronicManagementPage = lazy(() => import('@/pages/chronic/management'));
const IcuMonitorPage = lazy(() => import('@/pages/icu/monitor'));
// M316 采购/资产/预防/出院小结 lazy 注册
const FinancialProcurementPage = lazy(() => import('@/pages/financial/procurement'));
const FinancialAssetsPage = lazy(() => import('@/pages/financial/assets'));
const LogisticsPreventivePage = lazy(() => import('@/pages/logistics/preventive'));
const DischargeSummaryPage = lazy(() => import('@/pages/discharge/summary'));
// M317 会诊/急诊/ICU/麻醉/出院/CDS诊断 lazy 注册
const ConsultationListPage = lazy(() => import('@/pages/consultation/list'));
const EmergencyListPage = lazy(() => import('@/pages/emergency/list'));
const IcuListPage = lazy(() => import('@/pages/icu/list'));
const AnesthesiaListPage = lazy(() => import('@/pages/anesthesia/list'));
const DischargeListPage = lazy(() => import('@/pages/discharge/list'));
const CdsDiagnosisSuggestPage = lazy(() => import('@/pages/cds/diagnosis-suggest'));
const TenantsConfigPage = lazy(() => import('@/pages/tenants/config'));
const SecurityMaskRulesPage = lazy(() => import('@/pages/security/mask-rules'));
const SecurityAccessLogsPage = lazy(() => import('@/pages/security/access-logs'));
// M262 EMR 锁定/签名/租户切换/导出审批/保留策略/泄露事件 lazy 注册
const EmrLockPage = lazy(() => import('@/pages/emr/lock'));
const EmrSignPage = lazy(() => import('@/pages/emr/sign'));
const TenantsSwitchPage = lazy(() => import('@/pages/tenants/switch'));
const SecurityExportAuditPage = lazy(() => import('@/pages/security/export-audit'));
const SecurityRetentionPage = lazy(() => import('@/pages/security/retention'));
const SecurityBreachPage = lazy(() => import('@/pages/security/breach'));
// M263 Auth/会话/权限/登录日志/漏洞/备份/容灾 lazy 注册
const AuthSessionPage = lazy(() => import('@/pages/auth/session'));
const AuthPermissionsPage = lazy(() => import('@/pages/auth/permissions'));
const AuthAuditPage = lazy(() => import('@/pages/auth/audit'));
const SecurityVulnerabilityPage = lazy(() => import('@/pages/security/vulnerability'));
const SecurityBackupPage = lazy(() => import('@/pages/security/backup'));
const SecurityDrPage = lazy(() => import('@/pages/security/dr'));
// M264 全局审计/合规审计/数据隔离/限流/密钥/证书 lazy 注册
const AuditTrailPage = lazy(() => import('@/pages/audit/trail'));
const AuditCompliancePage = lazy(() => import('@/pages/audit/compliance'));
const TenantsDataIsolationPage = lazy(() => import('@/pages/tenants/data-isolation'));
const TenantsRateLimitPage = lazy(() => import('@/pages/tenants/rate-limit'));
const SecurityKeyManagementPage = lazy(() => import('@/pages/security/key-management'));
const SecurityCertificatesPage = lazy(() => import('@/pages/security/certificates'));
// M265 EMR 签名验证/水印/患者授权/最小化/匿名化/删除请求 lazy 注册
const EmrSignaturePage = lazy(() => import('@/pages/emr/signature'));
const EmrWatermarkPage = lazy(() => import('@/pages/emr/watermark'));
const SecurityConsentPage = lazy(() => import('@/pages/security/consent'));
const SecurityMinimizePage = lazy(() => import('@/pages/security/minimize'));
const SecurityAnonymizationPage = lazy(() => import('@/pages/security/anonymization'));
const SecurityDeletionPage = lazy(() => import('@/pages/security/deletion'));
// M266 锁定历史/修订/授权日志/数据流向/DPIA/合规认证 lazy 注册
const EmrLockHistoryPage = lazy(() => import('@/pages/emr/lock-history'));
// M319 病历质控规则 lazy 注册
const EmrQualityRulesPage = lazy(() => import('@/pages/emr/quality-rules'));
// M320 院感/DRG/DIP/RWD/联邦/数字孪生 lazy 注册
const InfectionSurveillancePage = lazy(() => import('@/pages/infection/surveillance'));
const DrgGroupingPage = lazy(() => import('@/pages/drg/grouping'));
const DipScorePage = lazy(() => import('@/pages/dip/score'));
const RwdDatasetsPage = lazy(() => import('@/pages/rwd/datasets'));
const FederatedLearningPage = lazy(() => import('@/pages/federated/learning'));
const DigitalTwinPatientsPage = lazy(() => import('@/pages/digital-twin/patients'));
// M321 院感日报/DRG管控/DIP明细/RWD分析/联邦节点/孪生模拟 lazy 注册
const InfectionDailyReportPage = lazy(() => import('@/pages/infection/daily-report'));
const DrgCostControlPage = lazy(() => import('@/pages/drg/cost-control'));
const DipDetailPage = lazy(() => import('@/pages/dip/detail'));
const RwdAnalysisPage = lazy(() => import('@/pages/rwd/analysis'));
const FederatedNodesPage = lazy(() => import('@/pages/federated/nodes'));
const DigitalTwinSimulationPage = lazy(() => import('@/pages/digital-twin/simulation'));
// M322 智慧服务 lazy 注册
const SmartServiceQueueStatsPage = lazy(() => import('@/pages/smart-service/queue-stats'));
const SmartServiceAiTriagePage = lazy(() => import('@/pages/smart-service/ai-triage'));
const SmartServiceBedRecommendPage = lazy(() => import('@/pages/smart-service/bed-recommend'));
const SmartServiceMedicationRemindPage = lazy(() => import('@/pages/smart-service/medication-remind'));
const SmartServiceFollowupPage = lazy(() => import('@/pages/smart-service/followup'));
const SmartServiceHealthRecordsPage = lazy(() => import('@/pages/smart-service/health-records'));
// M323 运营管理 lazy 注册
const OperationDashboardPage = lazy(() => import('@/pages/operation/dashboard'));
const OperationKpiPage = lazy(() => import('@/pages/operation/kpi'));
const OperationComparisonPage = lazy(() => import('@/pages/operation/comparison'));
const OperationEfficiencyPage = lazy(() => import('@/pages/operation/efficiency'));
const OperationCostPage = lazy(() => import('@/pages/operation/cost'));
const OperationRevenuePage = lazy(() => import('@/pages/operation/revenue'));
// M324 HR lazy 注册
const HrDoctorsPage = lazy(() => import('@/pages/hr/doctors'));
const HrNursesPage = lazy(() => import('@/pages/hr/nurses'));
const HrDepartmentsPage = lazy(() => import('@/pages/hr/departments'));
const HrTrainingPage = lazy(() => import('@/pages/hr/training'));
const HrLeavePage = lazy(() => import('@/pages/hr/leave'));
// M325 财务 lazy 注册
const FinanceBillingPage = lazy(() => import('@/pages/finance/billing'));
const FinancePaymentPage = lazy(() => import('@/pages/finance/payment'));
const FinanceRefundPage = lazy(() => import('@/pages/finance/refund'));
const FinanceInsuranceSettlementPage = lazy(() => import('@/pages/finance/insurance-settlement'));
const FinanceBudgetPage = lazy(() => import('@/pages/finance/budget'));
const FinanceAuditPage = lazy(() => import('@/pages/finance/audit'));
const EmrRevisionPage = lazy(() => import('@/pages/emr/revision'));
const SecurityConsentLogPage = lazy(() => import('@/pages/security/consent-log'));
const SecurityDataFlowPage = lazy(() => import('@/pages/security/data-flow'));
const SecurityDpiPage = lazy(() => import('@/pages/security/dpi'));
const SecurityAuditCertPage = lazy(() => import('@/pages/security/audit-cert'));
// M268 病历缺陷/质控统计/租户配额/CVE/WAF/SIEM lazy 注册
const EmrQualityDefectsPage = lazy(() => import('@/pages/emr/quality-defects'));
const EmrQualityStatsPage = lazy(() => import('@/pages/emr/quality-stats'));
const TenantsQuotaPage = lazy(() => import('@/pages/tenants/quota'));
const SecurityCveFeedPage = lazy(() => import('@/pages/security/cve-feed'));
const SecurityWafPage = lazy(() => import('@/pages/security/waf'));
const SecuritySiemPage = lazy(() => import('@/pages/security/siem'));
// M269 质控趋势/科室排名/租户用量/日志归档/事件时间线/安全 KPI lazy 注册
const EmrQualityTrendPage = lazy(() => import('@/pages/emr/quality-trend'));
const EmrQualityDepartmentPage = lazy(() => import('@/pages/emr/quality-department'));
const TenantsUsageStatsPage = lazy(() => import('@/pages/tenants/usage-stats'));
const SecurityLogArchivePage = lazy(() => import('@/pages/security/log-archive'));
const SecurityIncidentTimelinePage = lazy(() => import('@/pages/security/incident-timeline'));
const SecurityMetricsPage = lazy(() => import('@/pages/security/metrics'));
// M270 CDS 时间线/相互作用/剂量/禁忌 + 护理 NQI  lazy 注册
const CdsPatientTimelinePage = lazy(() => import('@/pages/cds/patient-timeline'));
const CdsInteractionCheckPage = lazy(() => import('@/pages/cds/interaction-check'));
const CdsDoseRangePage = lazy(() => import('@/pages/cds/dose-range'));
const CdsContraindicationPage = lazy(() => import('@/pages/cds/contraindication'));
const NursingNqiScoresPage = lazy(() => import('@/pages/nursing/nqi-scores'));
const NursingNqiTrendPage = lazy(() => import('@/pages/nursing/nqi-trend'));
// M271 FHIR Patient/Observation/Condition/MedicationRequest + 事件总线/审计 lazy 注册
const FhirPatientPage = lazy(() => import('@/pages/fhir/patient'));
const FhirObservationPage = lazy(() => import('@/pages/fhir/observation'));
const FhirConditionPage = lazy(() => import('@/pages/fhir/condition'));
const FhirMedicationRequestPage = lazy(() => import('@/pages/fhir/medicationrequest'));
const EventsBusPage = lazy(() => import('@/pages/events/bus'));
const EventsAuditPage = lazy(() => import('@/pages/events/audit'));
// M272 FHIR Encounter/Procedure/DiagnosticReport + 医生/护士/药师工作流 lazy 注册
const FhirEncounterPage = lazy(() => import('@/pages/fhir/encounter'));
const FhirProcedurePage = lazy(() => import('@/pages/fhir/procedure'));
const FhirDiagnosticReportPage = lazy(() => import('@/pages/fhir/diagnosticreport'));
const WorkflowDoctorPage = lazy(() => import('@/pages/workflow/doctor'));
const WorkflowNursePage = lazy(() => import('@/pages/workflow/nurse'));
const WorkflowPharmacistPage = lazy(() => import('@/pages/workflow/pharmacist'));
// M273 FHIR DocumentReference/AllergyIntolerance/Immunization + 病历版本 diff/compare/restore lazy 注册
const FhirDocumentrefPage = lazy(() => import('@/pages/fhir/documentref'));
const FhirAllergyintolerancePage = lazy(() => import('@/pages/fhir/allergyintolerance'));
const FhirImmunizationPage = lazy(() => import('@/pages/fhir/immunization'));
const EmrVersionDiffPage = lazy(() => import('@/pages/emr/version-diff'));
const EmrVersionComparePage = lazy(() => import('@/pages/emr/version-compare'));
const EmrVersionRestorePage = lazy(() => import('@/pages/emr/version-restore'));
// M274 FHIR Location/Practitioner/Organization + 患者360 概览/时间线/风险 lazy 注册
const FhirLocationPage = lazy(() => import('@/pages/fhir/location'));
const FhirPractitionerPage = lazy(() => import('@/pages/fhir/practitioner'));
const FhirOrganizationPage = lazy(() => import('@/pages/fhir/organization'));
const Patient360OverviewPage = lazy(() => import('@/pages/patient/360-overview'));
const Patient360TimelinePage = lazy(() => import('@/pages/patient/360-timeline'));
const Patient360RiskPage = lazy(() => import('@/pages/patient/360-risk'));
// M275 BI 床位/吞吐/满意度 + 智慧服务 预约/导诊/反馈 lazy 注册
const BiBedOccupancyPage = lazy(() => import('@/pages/bi/bed-occupancy'));
const BiThroughputPage = lazy(() => import('@/pages/bi/throughput'));
const BiSatisfactionPage = lazy(() => import('@/pages/bi/satisfaction'));
const SmartServiceAppointmentPage = lazy(() => import('@/pages/smart-service/appointment'));
const SmartServiceGuidePage = lazy(() => import('@/pages/smart-service/guide'));
const SmartServiceFeedbackPage = lazy(() => import('@/pages/smart-service/feedback'));
// M276 CDS 医嘱审查/危急值/过敏 + 移动查房/体征/完成率 lazy 注册
const CdsOrderCheckPage = lazy(() => import('@/pages/cds/order-check'));
const CdsLabAlertPage = lazy(() => import('@/pages/cds/lab-alert'));
const CdsAllergyCheckPage = lazy(() => import('@/pages/cds/allergy-check'));
const MobileNursingRoundsPage = lazy(() => import('@/pages/mobile/nursing-rounds'));
const MobileVitalsChartPage = lazy(() => import('@/pages/mobile/vitals-chart'));
const MobileTaskCompletionPage = lazy(() => import('@/pages/mobile/task-completion'));
// M278 质控看板/远程会诊/社区中心/员工/合同 lazy 注册
const EmrQualityDashboardPage = lazy(() => import('@/pages/emr/quality-dashboard'));
const TelemedConsultationsPage = lazy(() => import('@/pages/telemed/consultations'));
const CommunityCentersPage = lazy(() => import('@/pages/community/centers'));
const HrEmployeesPage = lazy(() => import('@/pages/hr/employees'));
const ContractsListPage = lazy(() => import('@/pages/contracts/list'));
// M279 设备维护/物资库存/病理报告/体检中心/科研项目/教学培训 lazy 注册
const EquipmentMaintenancePage = lazy(() => import('@/pages/equipment/maintenance'));
const SuppliesInventoryPage = lazy(() => import('@/pages/supplies/inventory'));
const PathologyReportsPage = lazy(() => import('@/pages/pathology/reports'));
const PhysicalCentersPage = lazy(() => import('@/pages/physical/centers'));
const ResearchProjectsPage = lazy(() => import('@/pages/research/projects'));
const EducationTrainingsPage = lazy(() => import('@/pages/education/trainings'));
// M280 医保/产科/发热/新生儿/门诊叫号/住院病区 lazy 注册
const InsurancePoliciesPage = lazy(() => import('@/pages/insurance/policies'));
const MaternityRecordsPage = lazy(() => import('@/pages/maternity/records'));
const FeverClinicsPage = lazy(() => import('@/pages/fever/clinics'));
const NewbornRecordsPage = lazy(() => import('@/pages/newborn/records'));
const OutpatientQueuePage = lazy(() => import('@/pages/outpatient/queue'));
const InpatientWardsPage = lazy(() => import('@/pages/inpatient/wards'));
// M283 中医/口腔/眼科/皮肤/精神科 lazy 注册
const TcmDiagnosisPage = lazy(() => import('@/pages/tcm/diagnosis'));
const DentalTreatmentsPage = lazy(() => import('@/pages/dental/treatments'));
const OphthalmologyExamsPage = lazy(() => import('@/pages/ophthalmology/exams'));
const DermatologyRecordsPage = lazy(() => import('@/pages/dermatology/records'));
const PsychiatryAssessmentsPage = lazy(() => import('@/pages/psychiatry/assessments'));
// M285 CDS 医嘱套餐/PACS 报告 lazy 注册
const CdsOrderSetPage = lazy(() => import('@/pages/cds/order-set'));
const PacsReportsPage = lazy(() => import('@/pages/pacs/reports'));
// M287 医嘱套餐/LIS结果/药房处方/输血记录 lazy 注册
const OrderSetsPage = lazy(() => import('@/pages/order/sets'));
const LisResultsPage = lazy(() => import('@/pages/lis/results'));
const PharmacyPrescriptionsPage = lazy(() => import('@/pages/pharmacy/prescriptions'));
const TransfusionRecordsPage = lazy(() => import('@/pages/transfusion/records'));
// M293 科室/医生排班/入院/出院/医保结算/每日统计 lazy 注册
const DepartmentListPage = lazy(() => import('@/pages/department/list'));
const DoctorSchedulePage = lazy(() => import('@/pages/doctor/schedule'));
const PatientAdmissionPage = lazy(() => import('@/pages/patient/admission'));
const PatientDischargePage = lazy(() => import('@/pages/patient/discharge'));
const MedicalInsurancePage = lazy(() => import('@/pages/medical/insurance'));
const StatisticsDailyPage = lazy(() => import('@/pages/statistics/daily'));
// M294 收费/财务/考勤 lazy 注册
const BillingListPage = lazy(() => import('@/pages/billing/list'));
const BillingDetailPage = lazy(() => import('@/pages/billing/detail'));
const FinanceRevenuePage = lazy(() => import('@/pages/finance/revenue'));
const FinanceCostPage = lazy(() => import('@/pages/finance/cost'));
const HrAttendancePage = lazy(() => import('@/pages/hr/attendance'));
const HrPerformancePage = lazy(() => import('@/pages/hr/performance'));
// M297 患者满意度 lazy 注册
const PatientSatisfactionPage = lazy(() => import('@/pages/patient/satisfaction'));
// M298 BI 综合大屏 lazy 注册
const BiDashboardPage = lazy(() => import('@/pages/bi/dashboard'));
// M301 患者/医生/科室/排班/预约 lazy 注册
const PatientSearchPage = lazy(() => import('@/pages/patient/search'));
const PatientDetailPage = lazy(() => import('@/pages/patient/detail'));
const DoctorListPage = lazy(() => import('@/pages/doctor/list'));
const DepartmentDetailPage = lazy(() => import('@/pages/department/detail'));
const ScheduleTodayPage = lazy(() => import('@/pages/schedule/today'));
const AppointmentListPage = lazy(() => import('@/pages/appointment/list'));
// M302 医嘱/药品/检验/检查/手术 lazy 注册
const OrderListPage = lazy(() => import('@/pages/order/list'));
// M371 removed duplicate: const OrderDetailPage = lazy(() => import('@/pages/order/detail'));
const MedicationListPage = lazy(() => import('@/pages/medication/list'));
const LisListPage = lazy(() => import('@/pages/lis/list'));
const PacsListPage = lazy(() => import('@/pages/pacs/list'));
const SurgeryListPage = lazy(() => import('@/pages/surgery/list'));
// M303 护理/发药/输血/同意/归档 lazy 注册
const NursingWardRoundsPage = lazy(() => import('@/pages/nursing/ward-rounds'));
const NursingVitalsPage = lazy(() => import('@/pages/nursing/vitals'));
const PharmacyDispensePage = lazy(() => import('@/pages/pharmacy/dispense'));
const TransfusionListPage = lazy(() => import('@/pages/transfusion/list'));
const ConsentListPage = lazy(() => import('@/pages/consent/list'));
const RecordsArchivePage = lazy(() => import('@/pages/records/archive'));
// M304 PDA 任务 lazy 注册
const MobilePdaTasksPage = lazy(() => import('@/pages/mobile/pda-tasks'));
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
const SmartFollowup = lazy(() => import('@/pages/followUp/smart'));
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
// v5.0试点扩展（浏览器bug修复）：/emr 总入口占位页（原 /emr 路由缺失导致 404）
const EmrLanding = lazy(() => import('@/pages/emr/Landing'));
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
// M198-D：风险管理
const RiskManagement = lazy(() => import('@/pages/admin/risk-management'));
// M199-A：用户体验
const UserExperience = lazy(() => import('@/pages/admin/user-experience'));
// M199-B：无障碍
const Accessibility = lazy(() => import('@/pages/admin/accessibility'));
// M199-C：适老化
const ElderlyFriendly = lazy(() => import('@/pages/admin/elderly-friendly'));
// M199-D：国际化
const Internationalization = lazy(() => import('@/pages/admin/internationalization'));
// M200-A：系统验收
const Acceptance = lazy(() => import('@/pages/admin/acceptance'));
// M200-B：文档
const Documentation = lazy(() => import('@/pages/admin/documentation'));
// M200-C：部署准备
const DeploymentReadiness = lazy(() => import('@/pages/admin/deployment-readiness'));
// M200-D：版本发布
const ReleaseM200 = lazy(() => import('@/pages/admin/release-m200'));
// M201-A：大模型集成
const LLMIntegration = lazy(() => import('@/pages/admin/llm'));
// M201-B：多 Agent
const MultiAgent = lazy(() => import('@/pages/admin/multi-agent'));
// M201-C：专科
const Specialty = lazy(() => import('@/pages/specialty'));
// M201-D：生产运维
const ProductionOps = lazy(() => import('@/pages/admin/production-ops'));
// M202-A：康复老年
const Rehabilitation = lazy(() => import('@/pages/specialty/rehabilitation'));
// M202-B：精神心理
const Psychiatry = lazy(() => import('@/pages/specialty/psychiatry'));
// M202-C：中医
const TCM = lazy(() => import('@/pages/specialty/tcm'));
// M202-D：临床科研
const ClinicalResearch = lazy(() => import('@/pages/admin/clinical-research'));
// M203-A：ICU
const ICU = lazy(() => import('@/pages/specialty/icu'));
// M203-B：介入内镜
const Interventional = lazy(() => import('@/pages/specialty/interventional'));
// M203-C：移植透析
const Transplant = lazy(() => import('@/pages/specialty/transplant'));
// M203-D：AI 影像病理
const AIDiagnosis = lazy(() => import('@/pages/specialty/ai-diagnosis'));
// M204-A：急诊 V3
const EmergencyV3 = lazy(() => import('@/pages/emergency/report-v3'));
// M204-B：手术 V3
const SurgeryV3 = lazy(() => import('@/pages/surgery/report-v3'));
// M204-C：药房 V3
const PharmacyV3 = lazy(() => import('@/pages/pharmacy/report-v3'));
// M204-D：检验检查 V3
const LabImagingV3 = lazy(() => import('@/pages/lab-imaging/report-v3'));
// M205-A：护理 V3
const NursingV3 = lazy(() => import('@/pages/nursing/report-v3'));
// M205-B：病案 V3
const MedicalRecordV3 = lazy(() => import('@/pages/medical-record/report-v3'));
// M205-C：医保 V3
const InsuranceV3 = lazy(() => import('@/pages/insurance/report-v3'));
// M205-D：等级评审
const Accreditation = lazy(() => import('@/pages/admin/accreditation'));
// M206-A：患者服务 V3
const PatientServiceV3 = lazy(() => import('@/pages/patient-service/report-v3'));
// M206-B：健康管理 V3
const HealthManagementV3 = lazy(() => import('@/pages/health-management/report-v3'));
// M206-C：区域医联体
const RegionalHealth = lazy(() => import('@/pages/regional/report'));
// M206-D：数据资产 V3
const DataAssetV3 = lazy(() => import('@/pages/data-asset/report-v3'));
// M207-A：运营 V3
const OperationsV3 = lazy(() => import('@/pages/operations/report-v3'));
// M207-B：科研 V3
const ResearchV3 = lazy(() => import('@/pages/research/report-v3'));
// M207-C：教学 V3
const EducationV3 = lazy(() => import('@/pages/education/report-v3'));
// M207-D：后勤 V3
const LogisticsV3 = lazy(() => import('@/pages/logistics/report-v3'));
// M208-A：AI 辅助 V2
const AIAssistV2 = lazy(() => import('@/pages/ai-assist/report-v2'));
// M208-B：智能预警 V2
const SmartAlertV2 = lazy(() => import('@/pages/smart-alert/report-v2'));
// M208-C：患者画像 V2
const PatientProfileV2 = lazy(() => import('@/pages/patient-profile/report-v2'));
// M208-D：知识图谱 V2
const KnowledgeGraphV2 = lazy(() => import('@/pages/knowledge-graph/report-v2'));
// M209-A：患者安全 V2
const PatientSafetyV2 = lazy(() => import('@/pages/patient-safety/report-v2'));
// M209-B：院感 V2
const InfectionControlReportV2 = lazy(() => import('@/pages/infection-control/report-v2'));
// M209-C：病历质量 V2
const MRQualityV2 = lazy(() => import('@/pages/mr-quality/report-v2'));
// M209-D：药品供应链 V2
const DrugSupplyV2 = lazy(() => import('@/pages/drug-supply/report-v2'));
// M210-A：智慧医院评价
const SmartHospital = lazy(() => import('@/pages/smart-hospital/report'));
// M210-B：互联互通
const Interoperability = lazy(() => import('@/pages/interoperability/report'));
// M210-C：EMR 评级
const EMRRating = lazy(() => import('@/pages/emr-rating/report'));
// M210-D：国考绩效
const HospitalKPI = lazy(() => import('@/pages/hospital-kpi/report'));
// M211-A：HRP V2
const HRPV2 = lazy(() => import('@/pages/hrp/report-v2'));
// M211-B：财务 V2
const FinanceV2 = lazy(() => import('@/pages/finance/report-v2'));
// M211-C：人力资源 V2
const HRV2 = lazy(() => import('@/pages/hr/report-v2'));
// M211-D：绩效 V2
const PerformanceV2 = lazy(() => import('@/pages/performance/report-v2'));
// M212-A：党建行政
const PartyAdmin = lazy(() => import('@/pages/party-admin/report'));
// M212-B：医务 V2
const MedicalAffairsV2 = lazy(() => import('@/pages/medical-affairs/report-v2'));
// M212-C：护理 V2
const NursingV2 = lazy(() => import('@/pages/nursing/report-v2'));
// M212-D：药事 V2
const PharmacyV2 = lazy(() => import('@/pages/pharmacy/report-v2'));
// M213-A：设备 V2
const EquipmentV2 = lazy(() => import('@/pages/equipment/report-v2'));
// M213-B：后勤安全
const LogisticsSafety = lazy(() => import('@/pages/logistics-safety/report'));
// M213-C：信息化
const Informatization = lazy(() => import('@/pages/informatization/report'));
// M213-D：文化品牌
const CultureBrand = lazy(() => import('@/pages/culture-brand/report'));
// M214-A：互联网医院 V2
const InternetHospitalReportV2 = lazy(() => import('@/pages/internet-hospital/report-v2'));
// M214-B：远程医疗 V2
const TelemedicineV2 = lazy(() => import('@/pages/telemedicine/report-v2'));
// M214-C：移动医疗 V2
const MobileHealthV2 = lazy(() => import('@/pages/mobile-health/report-v2'));
// M214-D：智慧药房
const SmartPharmacy = lazy(() => import('@/pages/smart-pharmacy/report'));
// M215-A：大数据 V2
const BigDataV2 = lazy(() => import('@/pages/big-data/report-v2'));
// M215-B：AI 中台 V2
const AIPlatformV2 = lazy(() => import('@/pages/ai-platform/report-v2'));
// M215-C：物联网
const IoTReport = lazy(() => import('@/pages/iot/report'));
// M215-D：区块链
const BlockchainReport = lazy(() => import('@/pages/blockchain/report'));
// M216-A：云原生 V2
const CloudNativeV2 = lazy(() => import('@/pages/cloud-native/report-v2'));
// M216-B：微服务 V2
const MicroserviceV2 = lazy(() => import('@/pages/microservice/report-v2'));
// M216-C：DevOps V2
const DevOpsV2 = lazy(() => import('@/pages/devops/report-v2'));
// M216-D：SRE
const SREReport = lazy(() => import('@/pages/sre/report'));
// M217-A：数据安全 V2
const DataSecurityV2 = lazy(() => import('@/pages/data-security/report-v2'));
// M217-B：合规管理
const ComplianceReport = lazy(() => import('@/pages/compliance/report'));
// M217-C：审计管理
const AuditReport = lazy(() => import('@/pages/audit/report'));
// M217-D：风险管理
const RiskReport = lazy(() => import('@/pages/risk/report'));
// M218-A：患者体验 V2
const PatientExperienceV2 = lazy(() => import('@/pages/patient-experience/report-v2'));
// M218-B：员工体验 V2
const EmployeeExperienceV2 = lazy(() => import('@/pages/employee-experience/report-v2'));
// M218-C：流程优化
const ProcessOptimization = lazy(() => import('@/pages/process-optimization/report'));
// M218-D：智慧服务评级
const SmartServiceRating = lazy(() => import('@/pages/smart-service/report'));
// M219-A：学科建设 V2
const DisciplineV2 = lazy(() => import('@/pages/discipline/report-v2'));
// M219-B：人才队伍 V2
const TalentV2 = lazy(() => import('@/pages/talent/report-v2'));
// M219-C：科研创新 V2
const ResearchV2 = lazy(() => import('@/pages/research/report-v2'));
// M219-D：教学培训 V2
const TeachingV2 = lazy(() => import('@/pages/teaching/report-v2'));
// M220-A：后勤基建 V2
const LogisticsV2 = lazy(() => import('@/pages/logistics/report-v2'));
// M220-B：环境保护
const EnvironmentReport = lazy(() => import('@/pages/environment/report'));
// M220-C：营养膳食
const NutritionReport = lazy(() => import('@/pages/nutrition/report'));
// M220-D：安宁疗护
const HospiceReport = lazy(() => import('@/pages/hospice/report'));
// M221-A：传染病防控 V2
const InfectiousDiseaseV2 = lazy(() => import('@/pages/infectious-disease/report-v2'));
// M221-B：妇幼健康 V2
const MaternalChildV2 = lazy(() => import('@/pages/maternal-child/report-v2'));
// M221-C：老年健康 V2
const GeriatricsV2 = lazy(() => import('@/pages/geriatrics/report-v2'));
// M221-D：职业病防治
const OccupationalHealth = lazy(() => import('@/pages/occupational-health/report'));
// M222-A：康复医学 V2
const RehabilitationV2 = lazy(() => import('@/pages/rehabilitation/report-v2'));
// M222-B：健康管理 V2
const HealthManagementV2 = lazy(() => import('@/pages/health-management/report-v2'));
// M222-C：急救体系 V2
const EmergencyV2 = lazy(() => import('@/pages/emergency/report-v2'));
// M222-D：疼痛管理
const PainReport = lazy(() => import('@/pages/pain/report'));
// M223-A：检验中心 V2
const LaboratoryV2 = lazy(() => import('@/pages/laboratory/report-v2'));
// M223-B：影像中心 V2
const ImagingV2 = lazy(() => import('@/pages/imaging/report-v2'));
// M223-C：病理中心 V2
const PathologyV2 = lazy(() => import('@/pages/pathology/report-v2'));
// M223-D：功能检查中心
const FunctionalReport = lazy(() => import('@/pages/functional/report'));
// M224-A：手术中心 V2
const SurgeryV2 = lazy(() => import('@/pages/surgery/report-v2'));
// M224-B：麻醉中心 V2
const AnesthesiaV2 = lazy(() => import('@/pages/anesthesia/report-v2'));
// M224-C：输血管理
const TransfusionReport = lazy(() => import('@/pages/transfusion/report'));
// M224-D：重症医学 V2
const ICUV2 = lazy(() => import('@/pages/icu/report-v2'));
// M225-A：门诊管理 V2
const OutpatientV2 = lazy(() => import('@/pages/outpatient/report-v2'));
// M225-B：住院管理 V2
const InpatientV2 = lazy(() => import('@/pages/inpatient/report-v2'));
// M225-C：急诊管理 V2
const EmergencyMgmtV2 = lazy(() => import('@/pages/emergency/report-v2'));
// M225-D：病案管理 V2
const MedRecordMgmtV2 = lazy(() => import('@/pages/medical-record/report-v2'));
// M226-A：医保管理 V2
const InsuranceMgmtV2 = lazy(() => import('@/pages/insurance/report-v2'));
// M226-B：物价收费 V2
const PricingV2 = lazy(() => import('@/pages/pricing/report-v2'));
// M227-A：信息化规划 V2
const InformatizationPlanV2 = lazy(() => import('@/pages/informatization/report-v2'));
// M227-B：数据治理 V2
const DataGovernanceV2 = lazy(() => import('@/pages/data-governance/report-v2'));
// M227-C：网络安全 V2
const CybersecurityV2 = lazy(() => import('@/pages/cybersecurity/report-v2'));
// M227-D：运维管理 V2
const OpsV2 = lazy(() => import('@/pages/ops/report-v2'));
// M228-A：党建 V2
const PartyBuildingV2 = lazy(() => import('@/pages/party-building/report-v2'));
// M228-B：文化品牌 V2
const CultureBrandV2 = lazy(() => import('@/pages/culture-brand/report-v2'));
// M228-C：行政办公 V2
const AdministrationV2 = lazy(() => import('@/pages/administration/report-v2'));
// M228-D：工会群团 V2
const UnionV2 = lazy(() => import('@/pages/union/report-v2'));
// M229-A：应急管理 V2
const EmergencyMgmtReportV2 = lazy(() => import('@/pages/emergency-mgmt/report-v2'));
// M229-B：消防安保 V2
const FireSecurityV2 = lazy(() => import('@/pages/fire-security/report-v2'));
// M229-C：特种设备与危化品
const SpecialEquipHazmatReport = lazy(() => import('@/pages/special-equip-hazmat/report'));
// M229-D：院感控制 V3
const InfectionControlV3 = lazy(() => import('@/pages/infection-control/report-v3'));
// M230-A：高质量发展 V2
const HighQualityDevelopmentV2 = lazy(() => import('@/pages/high-quality-development/report-v2'));
// M230-B：等级评审 V3
const AccreditationV3 = lazy(() => import('@/pages/accreditation/report-v3'));
// M230-C：DRG/DIP V2
const DRGDIPV2 = lazy(() => import('@/pages/drg-dip/report-v2'));
// M230-D：学科评估 V3
const DisciplineAssessmentV3 = lazy(() => import('@/pages/discipline-assessment/report-v3'));
// M231-A：智慧医院 V3
const SmartHospitalV3 = lazy(() => import('@/pages/smart-hospital-v3/report'));
// M231-B：互联互通 V3
const InteropV3 = lazy(() => import('@/pages/interop-v3/report'));
// M231-C：EMR 评级 V3
const EMRRatingV3 = lazy(() => import('@/pages/emr-rating-v3/report'));
// M231-D：v4.0.0 里程碑
const V4Milestone = lazy(() => import('@/pages/v4-milestone/report'));
// M232-A：AI 大脑 V3
const AIBrainV3 = lazy(() => import('@/pages/ai-brain-v3/report'));
// M232-B：Personal Agent V3
const PersonalAgentV3 = lazy(() => import('@/pages/personal-agent-v3/report'));
// M232-C：数字孪生
const DigitalTwin = lazy(() => import('@/pages/digital-twin/report'));
// M232-D：区域健康大脑
const RegionalBrain = lazy(() => import('@/pages/regional-brain/report'));
// M233-A：患者服务智能化 V2
const PatientServiceAIV2 = lazy(() => import('@/pages/patient-service-ai-v2/report'));
// M233-B：临床科研智能化 V2
const ClinicalResearchAIV2 = lazy(() => import('@/pages/clinical-research-ai-v2/report'));
// M233-C：运营决策智能化 V2
const OperationsAIV2 = lazy(() => import('@/pages/operations-ai-v2/report'));
// M233-D：质量安全智能化 V2
const QualitySafetyAIV2 = lazy(() => import('@/pages/quality-safety-ai-v2/report'));
// M234-A：互联网医院 V3
const InternetHospitalV3 = lazy(() => import('@/pages/internet-hospital-v3/report'));
// M234-B：远程医疗 V3
const TelemedicineV3 = lazy(() => import('@/pages/telemedicine-v3/report'));
// M234-C：移动医疗 V3
const MobileHealthV3 = lazy(() => import('@/pages/mobile-health-v3/report'));
// M234-D：生态开放
const EcosystemOpen = lazy(() => import('@/pages/ecosystem-open/report'));
// M235-A：患者体验智能化 V2
const PatientExperienceAIV2 = lazy(() => import('@/pages/patient-experience-ai-v2/report'));
// M235-B：医护工作智能化 V2
const ClinicianWorkAIV2 = lazy(() => import('@/pages/clinician-work-ai-v2/report'));
// M235-C：数据中台智能化 V2
const DataPlatformAIV2 = lazy(() => import('@/pages/data-platform-ai-v2/report'));
// M235-D：安全运营智能化 V2
const SecurityOpsAIV2 = lazy(() => import('@/pages/security-ops-ai-v2/report'));
// M236-A：绿色医院 V2
const GreenHospitalV2 = lazy(() => import('@/pages/green-hospital/report'));
// M236-B：供应链 V2
const SupplyChainV2 = lazy(() => import('@/pages/supply-chain-v2/report'));
// M236-C：健康科普
const HealthMedia = lazy(() => import('@/pages/health-media/report'));
// M236-D：国际医疗 V2
const InternationalHealthV2 = lazy(() => import('@/pages/international-health-v2/report'));
// M237-A：AI 药物研发
const AIDrugDiscovery = lazy(() => import('@/pages/ai-drug/report'));
// M237-B：脑机接口与神经康复
const BCINeuroRehab = lazy(() => import('@/pages/bci-neuro-rehab/report'));
// M237-C：基因与精准医疗
const GenomicPrecision = lazy(() => import('@/pages/genomic-precision/report'));
// M237-D：元宇宙医院
const MetaverseHospital = lazy(() => import('@/pages/metaverse-hospital/report'));
// M238-A：CDSS V3
const CDSSV3 = lazy(() => import('@/pages/cdss-v3/report'));
// M238-B：影像 AI V3
const ImagingAIV3 = lazy(() => import('@/pages/imaging-ai-v3/report'));
// M238-C：病历智能 V3
const EMRIntelligentV3 = lazy(() => import('@/pages/emr-intelligent-v3/report'));
// M238-D：知识图谱 V3
const KnowledgeGraphV3 = lazy(() => import('@/pages/knowledge-graph-v3/report'));
// M239-A：预防医学 V3
const PreventiveMedicineV3 = lazy(() => import('@/pages/preventive-medicine-v3/report'));
// M239-B：妇幼全周期 V3
const MaternalChildLifecycleV3 = lazy(() => import('@/pages/maternal-child-lifecycle-v3/report'));
// M239-C：老年全周期 V3
const GeriatricsLifecycleV3 = lazy(() => import('@/pages/geriatrics-lifecycle-v3/report'));
// M239-D：职业环境 V3
const OccupationalEnvironmentalV3 = lazy(() => import('@/pages/occupational-environmental-v3/report'));
// M240-A：运营驾驶舱 V3
const OpsDashboardV3 = lazy(() => import('@/pages/ops-dashboard-v3/report'));
// M240-B：成本核算 V3
const CostAccountingV3 = lazy(() => import('@/pages/cost-accounting-v3/report'));
// M240-C：绩效 V3
const PerformanceV3 = lazy(() => import('@/pages/performance-v3/report'));
// M240-D：HRP V3
const HRPV3 = lazy(() => import('@/pages/hrp-v3/report'));
// M241-A：患者安全 V3
const PatientSafetyV3 = lazy(() => import('@/pages/patient-safety-v3/report'));
// M241-B：医疗质量 V3
const MedicalQualityV3 = lazy(() => import('@/pages/medical-quality-v3/report'));
// M241-C：护理质量 V3
const NursingQualityV3 = lazy(() => import('@/pages/nursing-quality-v3/report'));
// M241-D：患者体验 V3
const PatientExperienceV3 = lazy(() => import('@/pages/patient-experience-v3/report'));
// M242-A：学科建设 V3
const DisciplineV3 = lazy(() => import('@/pages/discipline-v3/report'));
// M242-B：人才队伍 V3
const TalentV3 = lazy(() => import('@/pages/talent-v3/report'));
// M242-C：科研创新 V3
const ResearchV3Page = lazy(() => import('@/pages/research-v3/report'));
// M242-D：教学培训 V3
const TeachingV3 = lazy(() => import('@/pages/teaching-v3/report'));
// M243-A：后勤保障 V3
const LogisticsV3Page = lazy(() => import('@/pages/logistics-v3/report'));
// M243-B：设备耗材 V3
const EquipmentSupplyV3 = lazy(() => import('@/pages/equipment-supply-v3/report'));
// M243-C：安全保卫 V3
const SecurityV3 = lazy(() => import('@/pages/security-v3/report'));
// M243-D：应急管理 V3
const EmergencyMgmtV3 = lazy(() => import('@/pages/emergency-mgmt-v3/report'));
// M244-A：信息化规划 V3
const InformatizationV3 = lazy(() => import('@/pages/informatization-v3/report'));
// M244-B：数据治理 V3
const DataGovernanceV3 = lazy(() => import('@/pages/data-governance-v3/report'));
// M244-C：网络安全 V3
const CybersecurityV3 = lazy(() => import('@/pages/cybersecurity-v3/report'));
// M244-D：运维管理 V3
const OpsV3 = lazy(() => import('@/pages/ops-v3/report'));
// M245-A：党建 V3
const PartyBuildingV3 = lazy(() => import('@/pages/party-building-v3/report'));
// M245-B：文化品牌 V3
const CultureBrandV3 = lazy(() => import('@/pages/culture-brand-v3/report'));
// M245-C：行政办公 V3
const AdministrationV3 = lazy(() => import('@/pages/administration-v3/report'));
// M245-D：工会群团 V3
const UnionV3 = lazy(() => import('@/pages/union-v3/report'));
// M246-A：绿色医院 V3
const GreenHospitalV3 = lazy(() => import('@/pages/green-hospital-v3/report'));
// M246-B：供应链 V3
const SupplyChainV3 = lazy(() => import('@/pages/supply-chain-v3/report'));
// M246-C：健康科普 V3
const HealthMediaV3 = lazy(() => import('@/pages/health-media-v3/report'));
// M246-D：国际医疗 V3
const InternationalHealthV3 = lazy(() => import('@/pages/international-health-v3/report'));
// M247-A：AI 药物 V2
const AIDrugV2 = lazy(() => import('@/pages/ai-drug-v2/report'));
// M247-B：脑机接口 V2
const BCINeuroRehabV2 = lazy(() => import('@/pages/bci-neuro-rehab-v2/report'));
// M247-C：基因精准 V2
const GenomicPrecisionV2 = lazy(() => import('@/pages/genomic-precision-v2/report'));
// M247-D：元宇宙医院 V2
const MetaverseHospitalV2 = lazy(() => import('@/pages/metaverse-hospital-v2/report'));
// M248-A：CDSS V4
const CDSSV4 = lazy(() => import('@/pages/cdss-v4/report'));
// M248-B：影像 AI V4
const ImagingAIV4 = lazy(() => import('@/pages/imaging-ai-v4/report'));
// M248-C：病历智能 V4
const EMRIntelligentV4 = lazy(() => import('@/pages/emr-intelligent-v4/report'));
// M248-D：知识图谱 V4
const KnowledgeGraphV4 = lazy(() => import('@/pages/knowledge-graph-v4/report'));
// M249-A：预防公卫 V4
const PreventiveMedicineV4 = lazy(() => import('@/pages/preventive-medicine-v4/report'));
// M249-B：妇幼 V4
const MaternalChildLifecycleV4 = lazy(() => import('@/pages/maternal-child-lifecycle-v4/report'));
// M249-C：老年 V4
const GeriatricsLifecycleV4 = lazy(() => import('@/pages/geriatrics-lifecycle-v4/report'));
// M249-D：职业环境 V4
const OccupationalEnvironmentalV4 = lazy(() => import('@/pages/occupational-environmental-v4/report'));
// M250-A：运营驾驶舱 V4
const OpsDashboardV4 = lazy(() => import('@/pages/ops-dashboard-v4/report'));
// M250-B：成本核算 V4
const CostAccountingV4 = lazy(() => import('@/pages/cost-accounting-v4/report'));
// M250-C：绩效 V4
const PerformanceV4 = lazy(() => import('@/pages/performance-v4/report'));
// M250-D：HRP V4
const HRPV4 = lazy(() => import('@/pages/hrp-v4/report'));
// M251-A：急诊 V4
const EmergencyV4 = lazy(() => import('@/pages/emergency-v4/report'));
// M251-B：手术麻醉 V4
const SurgeryAnesthesiaV4 = lazy(() => import('@/pages/surgery-anesthesia-v4/report'));
// M251-C：药房 V4
const PharmacyV4 = lazy(() => import('@/pages/pharmacy-v4/report'));
// M251-D：检验 V4
const LaboratoryV4 = lazy(() => import('@/pages/laboratory-v4/report'));
// M252-A：护理 V4
const NursingV4 = lazy(() => import('@/pages/nursing-v4/report'));
// M252-B：病案 V4
const MedicalRecordV4 = lazy(() => import('@/pages/medical-record-v4/report'));
// M252-C：医保 V4
const InsuranceV4 = lazy(() => import('@/pages/insurance-v4/report'));
// M252-D：门诊住院 V4
const OutpatientInpatientV4 = lazy(() => import('@/pages/outpatient-inpatient-v4/report'));
// M253-A：患者服务 V4
const PatientServiceV4 = lazy(() => import('@/pages/patient-service-v4/report'));
// M253-B：健康管理 V4
const HealthManagementV4 = lazy(() => import('@/pages/health-management-v4/report'));
// M253-C：区域医联体 V4
const RegionalAllianceV4 = lazy(() => import('@/pages/regional-alliance-v4/report'));
// M253-D：数据资产 V4
const DataAssetV4 = lazy(() => import('@/pages/data-asset-v4/report'));
// M254-A：运营分析 V4
const OperationsAnalysisV4 = lazy(() => import('@/pages/operations-analysis-v4/report'));
// M254-B：科研管理 V4
const ResearchManagementV4 = lazy(() => import('@/pages/research-management-v4/report'));
// M254-C：教学培训 V4
const TeachingTrainingV4 = lazy(() => import('@/pages/teaching-training-v4/report'));
// M254-D：后勤设备 V4
const LogisticsEquipmentV4 = lazy(() => import('@/pages/logistics-equipment-v4/report'));
// M255-A：AI 辅助诊断 V3
const AIDiagnosisV3 = lazy(() => import('@/pages/ai-diagnosis-v3/report'));
// M255-B：智能预警 V3
const IntelligentAlertV3 = lazy(() => import('@/pages/intelligent-alert-v3/report'));
// M255-C：患者画像 V3
const PatientProfileV3 = lazy(() => import('@/pages/patient-profile-v3/report'));
// M255-D：临床规则引擎 V3
const ClinicalRuleEngineV3 = lazy(() => import('@/pages/clinical-rule-engine-v3/report'));
// M256-A：患者安全 V3
// M256-B：院感控制 V3
const InfectionControlV3Page = lazy(() => import('@/pages/infection-control-v3/report'));
// M256-C：病历质量 V3（里程碑 v5.00.0）
const RecordQualityV3 = lazy(() => import('@/pages/record-quality-v3/report'));
// M256-D：药品供应链 V3
const DrugSupplyChainV3 = lazy(() => import('@/pages/drug-supply-chain-v3/report'));
// M257-A：医院 OS 底座 V5
const HospitalOSV5 = lazy(() => import('@/pages/hospital-os-v5/report'));
// M257-B：Personal Agent 2.0 V5
const PersonalAgentV5 = lazy(() => import('@/pages/personal-agent-v5/report'));
// M257-C：AI 大脑 3.0 V5
const AIBrainV5 = lazy(() => import('@/pages/ai-brain-v5/report'));
// M257-D：数据飞轮 V5
const DataFlywheelV5 = lazy(() => import('@/pages/data-flywheel-v5/report'));
// M258-A：AI 门诊全流程闭环 V5
const OutpatientAILoopV5 = lazy(() => import('@/pages/outpatient-ai-loop-v5/report'));
// M258-B：AI 住院全流程闭环 V5
const InpatientAILoopV5 = lazy(() => import('@/pages/inpatient-ai-loop-v5/report'));
// M258-C：AI 手术全流程闭环 V5
const SurgeryAILoopV5 = lazy(() => import('@/pages/surgery-ai-loop-v5/report'));
// M258-D：AI 药事全流程闭环 V5
const PharmacyAILoopV5 = lazy(() => import('@/pages/pharmacy-ai-loop-v5/report'));
// M259-A：AI 科研助手 V5
const ResearchAIV5 = lazy(() => import('@/pages/research-ai-v5/report'));
// M259-B：AI 教学助手 V5
const TeachingAIV5 = lazy(() => import('@/pages/teaching-ai-v5/report'));
// M259-C：AI 患者陪伴 V5
const PatientCompanionV5 = lazy(() => import('@/pages/patient-companion-v5/report'));
// M259-D：AI 管理决策助手 V5
const ManagementAIV5 = lazy(() => import('@/pages/management-ai-v5/report'));
// M260-A：MLOps 模型工程 V5
const MLOpsV5 = lazy(() => import('@/pages/mlops-v5/report'));
// M260-B：数据 Mesh 与数据产品化 V5
const DataMeshV5 = lazy(() => import('@/pages/data-mesh-v5/report'));
// M260-C：云原生 SRE 深化 V5
const CloudNativeSREV5 = lazy(() => import('@/pages/cloud-native-sre-v5/report'));
// M260-D：医院开发者平台 V5
const DevPlatformV5 = lazy(() => import('@/pages/dev-platform-v5/report'));
// M261-A：零信任与身份安全 V5
const ZeroTrustV5 = lazy(() => import('@/pages/zero-trust-v5/report'));
// M261-B：隐私计算与数据要素流通 V5
const PrivacyComputeV5 = lazy(() => import('@/pages/privacy-compute-v5/report'));
// M261-C：适老化与无障碍服务 V5
const ElderlyAccessibleV5 = lazy(() => import('@/pages/elderly-accessible-v5/report'));
// M261-D：ESG 与可持续发展 V5
const ESGV5 = lazy(() => import('@/pages/esg-v5/report'));
// M262-A：互联网医院与处方流转 V5
const InternetHospitalV5 = lazy(() => import('@/pages/internet-hospital-v5/report'));
// M262-B：医联体分级诊疗智能化 V5
const MedicalAllianceV5 = lazy(() => import('@/pages/medical-alliance-v5/report'));
// M262-C：家庭医生签约服务 V5
const FamilyDoctorV5 = lazy(() => import('@/pages/family-doctor-v5/report'));
// M262-D：商业健康保险与惠民保 V5
const CommercialInsuranceV5 = lazy(() => import('@/pages/commercial-insurance-v5/report'));
// M263-A：胸痛中心智能化 V5
const ChestPainCenterV5 = lazy(() => import('@/pages/chest-pain-center-v5/report'));
// M263-B：卒中中心智能化 V5
const StrokeCenterV5 = lazy(() => import('@/pages/stroke-center-v5/report'));
// M263-C：创伤中心智能化 V5
const TraumaCenterV5 = lazy(() => import('@/pages/trauma-center-v5/report'));
// M263-D：危重症中心智能化 V5
const CriticalCareCenterV5 = lazy(() => import('@/pages/critical-care-center-v5/report'));
// M264-A：肿瘤全程管理 V5
const OncologyV5 = lazy(() => import('@/pages/oncology-v5/report'));
// M264-B：心血管疾病管理 V5
const CardiologyV5 = lazy(() => import('@/pages/cardiology-v5/report'));
// M264-C：呼吸系统疾病管理 V5
const PulmonologyV5 = lazy(() => import('@/pages/pulmonology-v5/report'));
// M264-D：内分泌代谢疾病管理 V5
const EndocrinologyV5 = lazy(() => import('@/pages/endocrinology-v5/report'));
// M265-A：消化系统疾病管理 V5
const GastroenterologyV5 = lazy(() => import('@/pages/gastroenterology-v5/report'));
// M265-B：肾病与血液净化管理 V5
const NephrologyV5 = lazy(() => import('@/pages/nephrology-v5/report'));
// M265-C：风湿免疫与过敏性疾病 V5
const RheumatologyV5 = lazy(() => import('@/pages/rheumatology-v5/report'));
// M265-D：神经与精神心理疾病 V5
const NeuroPsychV5 = lazy(() => import('@/pages/neuro-psych-v5/report'));
// M266-A：儿科与新生儿 V5
const PediatricsV5 = lazy(() => import('@/pages/pediatrics-v5/report'));
// M266-B：妇产科与围产 V5
const ObGynV5 = lazy(() => import('@/pages/ob-gyn-v5/report'));
// M266-C：皮肤与感染性疾病 V5
const DermInfectiousV5 = lazy(() => import('@/pages/derm-infectious-v5/report'));
// M266-D：眼科耳鼻喉口腔 V5
const ENTEyeDentalV5 = lazy(() => import('@/pages/ent-eye-dental-v5/report'));
// M267-A：国考绩效 55 指标 V5
const NationalExamV5 = lazy(() => import('@/pages/national-exam-v5/report'));
// M267-B：电子病历分级评价 0-8 级 V5
const EMRGradeV5 = lazy(() => import('@/pages/emr-grade-v5/report'));
// M267-C：互联互通标准化成熟度 V5
const InteropV5 = lazy(() => import('@/pages/interop-v5/report'));
// M267-D：智慧医院三位一体评级 V5
const SmartHospitalV5 = lazy(() => import('@/pages/smart-hospital-v5/report'));
// M268-A：智慧病房 IoT V5
const SmartWardIoTV5 = lazy(() => import('@/pages/smart-ward-iot-v5/report'));
// M268-B：医院机器人与自动化 V5
const HospitalRobotV5 = lazy(() => import('@/pages/hospital-robot-v5/report'));
// M268-C：5G与边缘计算 V5
const EdgeV5 = lazy(() => import('@/pages/5g-edge-v5/report'));
// M268-D：数字孪生可视化 V5
const DigitalTwinV5 = lazy(() => import('@/pages/digital-twin-v5/report'));
// M269-A：临床研究 RWD/RWE 平台 V5
const RWDPlatformV5 = lazy(() => import('@/pages/rwd-platform-v5/report'));
// M269-B：药物临床试验 GCP V5
const GCPV5 = lazy(() => import('@/pages/gcp-v5/report'));
// M269-C：生物样本库与科研数据 V5
const BiobankV5 = lazy(() => import('@/pages/biobank-v5/report'));
// M269-D：住培教学考核 OSCE V5
const ResidencyEducationV5 = lazy(() => import('@/pages/residency-edu-v5/report'));
// M270-A：院内智能导航 V5
const IndoorNavigationV5 = lazy(() => import('@/pages/indoor-navigation-v5/report'));
// M270-B：住院一站式服务 V5
const InpatientOneStopV5 = lazy(() => import('@/pages/inpatient-onestop-v5/report'));
// M270-C：多渠道服务整合 V5
const OmnichannelV5 = lazy(() => import('@/pages/omnichannel-v5/report'));
// M270-D：患者体验监测与改进 V5
const PatientExperienceV5 = lazy(() => import('@/pages/patient-experience-v5/report'));
// M271-A：电子票据与移动支付 V5
const EInvoicePaymentV5 = lazy(() => import('@/pages/e-invoice-payment-v5/report'));
// M271-B：信用就医先诊后付 V5
const CreditTreatmentV5 = lazy(() => import('@/pages/credit-treatment-v5/report'));
// M271-C：价格管理与收费合规 V5
const PriceComplianceV5 = lazy(() => import('@/pages/price-compliance-v5/report'));
// M271-D：对账清算与医保基金监管 V5
const ReconciliationFundV5 = lazy(() => import('@/pages/reconciliation-fund-v5/report'));
// M272-A：安宁疗护与缓和医疗 V5
const HospicePalliativeV5 = lazy(() => import('@/pages/hospice-palliative-v5/report'));
// M272-B：康复医学与日间康复 V5
const RehabilitationV5 = lazy(() => import('@/pages/rehabilitation-v5/report'));
// M272-C：临床营养与膳食治疗 V5
const ClinicalNutritionV5 = lazy(() => import('@/pages/clinical-nutrition-v5/report'));
// M272-D：心理心身与 EAP V5
const PsychEAPV5 = lazy(() => import('@/pages/psych-eap-v5/report'));
// M273-A：多院区一体化运行 V5
const MultiCampusV5 = lazy(() => import('@/pages/multi-campus-v5/report'));
// M273-B：集团财务人力物资 V5
const GroupFRHV5 = lazy(() => import('@/pages/group-frh-v5/report'));
// M273-C：集团质控与标准统一 V5
const GroupQAV5 = lazy(() => import('@/pages/group-qa-v5/report'));
// M273-D：集团患者转诊与资源调度 V5
const GroupReferralV5 = lazy(() => import('@/pages/group-referral-v5/report'));
// M274-A：健康体检中心智能化 V5
const HealthCheckupV5 = lazy(() => import('@/pages/health-checkup-v5/report'));
// M274-B：月子中心与产后康复 V5
const PostpartumCareV5 = lazy(() => import('@/pages/postpartum-care-v5/report'));
// M274-C：医美口腔健康消费 V5
const AestheticDentalV5 = lazy(() => import('@/pages/aesthetic-dental-v5/report'));
// M274-D：健康管理 VIP 服务 V5
const HealthVIPV5 = lazy(() => import('@/pages/health-vip-v5/report'));
// M275-A：MUSE 个人经验沉淀闭环
const MUSEExperience = lazy(() => import('@/pages/muse-experience'));
// M275-B：跨角色经验复用
const ExperienceShare = lazy(() => import('@/pages/experience-share'));
// M275-C：失败案例回灌学习飞轮
const FailureFlywheel = lazy(() => import('@/pages/failure-flywheel'));
// M275-D：经验图谱与后继者继承
const ExperienceGraph = lazy(() => import('@/pages/experience-graph'));
// M276-A：AI 建议全链路审计
const AIAdviceTrace = lazy(() => import('@/pages/ai-advice-trace'));
// M276-B：新知识自动入库与指南更新监测
const KnowledgeIntake = lazy(() => import('@/pages/knowledge-intake'));
// M276-C：虚拟病例演练与团队复盘
const DrillCase = lazy(() => import('@/pages/drill-case'));
// M276-D：医生能力画像与个性化学习路径
const CompetencyProfile = lazy(() => import('@/pages/competency-profile'));
// M277-A：门诊与手术量预测 V3
const VolumeForecast = lazy(() => import('@/pages/volume-forecast'));
// M277-B：床位需求与周转预测 V3
const BedForecast = lazy(() => import('@/pages/bed-forecast'));
// M277-C：耗材库存与供应预测 V3
const SupplyForecast = lazy(() => import('@/pages/supply-forecast'));
// M277-D：人力排班与调度优化 V3
const StaffSchedule = lazy(() => import('@/pages/staff-schedule'));
// M278-A：卫生健康统计与医改监测上报 V5
const ReportingStats = lazy(() => import('@/pages/reporting-stats'));
// M278-B：医保智能监管与 DRG/DIP 上报 V5
const InsuranceReport = lazy(() => import('@/pages/insurance-report'));
// M278-C：疾控传染病与慢病直报 V5
const CDCANotification = lazy(() => import('@/pages/cdc-notification'));
// M278-D：医院质量监测 HQMS V5
const HQMS = lazy(() => import('@/pages/hqms'));
// M279-A：被服洗涤与织物管理 V5
const LinenManagement = lazy(() => import('@/pages/linen-management'));
// M279-B：安保消防与应急指挥 V5
const SecurityEmergency = lazy(() => import('@/pages/security-emergency'));
// M279-C：设备预测性维护 V5
const PredictiveMaintenance = lazy(() => import('@/pages/predictive-maintenance'));
// M279-D：能源碳排放与绿色医院 V5
const EnergyCarbon = lazy(() => import('@/pages/energy-carbon'));
// M280-A：多模型路由与降级 V5
const ModelRouter = lazy(() => import('@/pages/model-router'));
// M280-B：Prompt 工程与模板治理 V5
const PromptGovernance = lazy(() => import('@/pages/prompt-governance'));
// M280-C：RAG 知识库检索优化 V5
const RagTuning = lazy(() => import('@/pages/rag-tuning'));
// M280-D：大模型微调与人在环反馈 V5
const FinetuneLoop = lazy(() => import('@/pages/finetune-loop'));
// M281-A：FHIR 资源建模与网关 V5
const FhirGateway = lazy(() => import('@/pages/fhir-gateway'));
// M281-B：HL7 / WS363 标准对接升级 V5
const Hl7Integration = lazy(() => import('@/pages/hl7-integration'));
// M281-C：院间数据共享授权 V5
const DataSharing = lazy(() => import('@/pages/data-sharing'));
// M281-D：第三方应用市场集成 V5
const AppStore = lazy(() => import('@/pages/app-store'));
// M282-A：数据分级分类与动态脱敏 V5
const DataClassification = lazy(() => import('@/pages/data-classification'));
// M282-B：零信任访问与权限最小化 V5
const ZeroTrust = lazy(() => import('@/pages/zero-trust'));
// M282-C：操作审计与数据防泄漏 DLP V5
const Dlp = lazy(() => import('@/pages/dlp'));
// M282-D：隐私计算与联邦学习 V5
const FederatedLearning = lazy(() => import('@/pages/federated-learning'));
// M283-A：医生 MUSE 工作台 V5
const MuseDoctor = lazy(() => import('@/pages/muse-doctor'));
// M283-B：护士 MUSE 工作台 V5
const MuseNurse = lazy(() => import('@/pages/muse-nurse'));
// M283-C：药师 MUSE 工作台 V5
const MusePharmacist = lazy(() => import('@/pages/muse-pharmacist'));
// M283-D：管理者 MUSE 工作台 V5
const MuseManager = lazy(() => import('@/pages/muse-manager'));
// M284-A：患者 MUSE 助手 V5
const MusePatient = lazy(() => import('@/pages/muse-patient'));
// M284-B：MUSE 跨角色任务流转 V5
const MuseHandoff = lazy(() => import('@/pages/muse-handoff'));
// M284-C：MUSE 主动提醒引擎 V5
const MuseReminder = lazy(() => import('@/pages/muse-reminder'));
// M284-D：MUSE 能力市场与可插拔技能 V5
const MuseSkills = lazy(() => import('@/pages/muse-skills'));
// M285-A：MUSE 采纳率与使用度量 V5
const MuseValue = lazy(() => import('@/pages/muse-value'));
// M285-B：MUSE 错误拦截与风险避免 V5
const MuseInterception = lazy(() => import('@/pages/muse-interception'));
// M285-C：MUSE A/B 测试与效果评估 V5
const MuseAb = lazy(() => import('@/pages/muse-ab'));
// M285-D：MUSE 成本与 ROI 分析 V5
const MuseRoi = lazy(() => import('@/pages/muse-roi'));
// M286-A：全链路监控与告警 V5
const OpsMonitoring = lazy(() => import('@/pages/ops-monitoring'));
// M286-B：灰度发布与回滚 V5
const OpsRelease = lazy(() => import('@/pages/ops-release'));
// M286-C：性能与容量压测 V5
const OpsPerf = lazy(() => import('@/pages/ops-perf'));
// M286-D：灾备与高可用 V5
const OpsDr = lazy(() => import('@/pages/ops-dr'));
// M287-A：院长驾驶舱 V5
const ExecDashboard = lazy(() => import('@/pages/exec-dashboard'));
// M287-B：科室运营画像 V5
const DeptProfile = lazy(() => import('@/pages/dept-profile'));
// M287-C：病种/DRG 经营分析 V5
const DrgAnalysis = lazy(() => import('@/pages/drg-analysis'));
// M287-D：趋势预测与经营预警 V5
const TrendForecast = lazy(() => import('@/pages/trend-forecast'));
// M288-A：智能审批与工作流引擎 V6
const Workflow = lazy(() => import('@/pages/workflow'));
// M288-B：通用表单引擎 V6
const FormEngine = lazy(() => import('@/pages/form-engine'));
// M288-D：流程监控与效率分析 V6
const WorkflowMonitor = lazy(() => import('@/pages/workflow-monitor'));
// M289-A：处方前置审核规则引擎 V7
const Cds = lazy(() => import('@/pages/cds'));
// M289-B：处方点评与药师反馈 V7
const Review = lazy(() => import('@/pages/review'));
// M289-C：用药知识沉淀与反馈学习 V7
const CdsLearning = lazy(() => import('@/pages/cds-learning'));
// M289-D：患者用药教育与依从性随访 V7
const MedAdherence = lazy(() => import('@/pages/med-adherence'));
// M290-A：医生 Personal Agent 工作台 V8
const AgentDoctor = lazy(() => import('@/pages/agent-doctor'));
// M290-B：护士 Personal Agent（Nurse MUSE）工作台 V8
const AgentNurse = lazy(() => import('@/pages/agent-nurse'));
// M290-C：药师 Personal Agent（Pharma MUSE）工作台 V8
const AgentPharma = lazy(() => import('@/pages/agent-pharma'));
// M290-D：管理者 Personal Agent（Manager MUSE）工作台 V8
const AgentManager = lazy(() => import('@/pages/agent-manager'));
// M291-A：Agent 反馈与经验沉淀 V8
const AgentLearning = lazy(() => import('@/pages/agent-learning'));
// M291-B：从反馈沉淀个性化推荐规则 V9
const AgentRules = lazy(() => import('@/pages/agent-rules'));
// M291-C：Doctor MUSE 个人经验沉淀闭环 V9
const CaseLesson = lazy(() => import('@/pages/case-lesson'));
// M291-D：跨角色经验复用与学习飞轮 V9
const LearningFlywheelPage = lazy(() => import('@/pages/learning-flywheel'));
// M292-A：失败案例根因复盘与防再发机制 V10
const FailurePostmortem = lazy(() => import('@/pages/failure-postmortem'));
// M292-B：成功案例蒸馏与最佳实践库 V10
const BestPractice = lazy(() => import('@/pages/best-practice'));
// M292-C：个人知识图谱与继任者交接 V10
const Knowledge = lazy(() => import('@/pages/knowledge'));
// M292-D：医院级 AI 知识资产大盘 V10
const KnowledgeDashboard = lazy(() => import('@/pages/knowledge-dashboard'));
// M293-A：DOCTOR_MUSE 主动式晨间简报 V11
const MorningBrief = lazy(() => import('@/pages/morning-brief'));
// M293-B：NURSE_MUSE 主动式交接班简报 V11
const ShiftBrief = lazy(() => import('@/pages/shift-brief'));
// M293-C：PHARMA_MUSE 主动式晨会简报 V11
const PharmaBrief = lazy(() => import('@/pages/pharma-brief'));
// M293-D：MANAGER_MUSE 主动式周会简报 V11
const ManagerBrief = lazy(() => import('@/pages/manager-brief'));
// M294-A：智能体采纳率反馈看板 V12
const AgentAdoption = lazy(() => import('@/pages/agent-adoption'));
// M294-B：低采纳率规则自动复训提示 V12
const RetrainTasks = lazy(() => import('@/pages/retrain-tasks'));
// M294-C：智能体健康度评分 V12
const AgentHealth = lazy(() => import('@/pages/agent-health'));
// M294-D：反馈闭环总览 V12
const FeedbackLoop = lazy(() => import('@/pages/feedback-loop'));
// M295-A：跨角色经验安全复用 V13
const CrossRoleExperience = lazy(() => import('@/pages/cross-role-experience'));
// M295-B：经验推送频控与免打扰 V13
const ExperiencePush = lazy(() => import('@/pages/experience-push'));
// M295-C：患者侧经验转健康提示 V13
const PatientTips = lazy(() => import('@/pages/patient-tips'));
// M295-D：经验复用效果度量 V13
const ReuseRoi = lazy(() => import('@/pages/reuse-roi'));
// M296-A：经验时间衰减与新鲜度 V13
const ExperienceFreshness = lazy(() => import('@/pages/experience-freshness'));
// M296-B：过期经验复核工作流 V13
const ExperienceReview = lazy(() => import('@/pages/experience-review'));
// M296-C：经验更新与版本迭代 V13
const ExperienceVersions = lazy(() => import('@/pages/experience-versions'));
// M296-D：知识资产生命周期总览 V13
const KnowledgeLifecycle = lazy(() => import('@/pages/knowledge-lifecycle'));
// M297-A：继任者经验传承交接 V13
const Handover = lazy(() => import('@/pages/handover'));
// M297-B：交接后继任者学习计划 V13
const LearningPlan = lazy(() => import('@/pages/learning-plan'));
// M297-C：离任医生知识资产保留 V13
const PublicKnowledge = lazy(() => import('@/pages/public-knowledge'));
// M297-D：传承效果度量与院长报告 V13
const SuccessionReport = lazy(() => import('@/pages/succession-report'));
// M298-A：专家经验贡献激励 V13
const ContributionLeaderboard = lazy(() => import('@/pages/contribution-leaderboard'));
// M298-B：贡献荣誉墙与月度之星 V13
const HonorWall = lazy(() => import('@/pages/honor-wall'));
// M298-C：新手医生孵化与导师匹配 V13
const MentorMatch = lazy(() => import('@/pages/mentor-match'));
// M298-D：知识贡献生态总览 V13
const EcosystemDashboard = lazy(() => import('@/pages/ecosystem-dashboard'));
// M299-A：经验质量同行评审 V13
const ReviewQueue = lazy(() => import('@/pages/review-queue'));
// M299-B：错误经验拦截与回滚 V13
const Rollback = lazy(() => import('@/pages/rollback'));
// M299-C：评审专家资质与激励 V13
const ReviewerRoster = lazy(() => import('@/pages/reviewer-roster'));
// M299-D：质量门禁总览 V13
const QualityGate = lazy(() => import('@/pages/quality-gate'));
// M300-A：经验与临床结局关联 V13
const ExperienceOutcome = lazy(() => import('@/pages/experience-outcome'));
// M300-B：疗效证据反哺规则权重 V13
const EvidenceRules = lazy(() => import('@/pages/evidence-rules'));
// M300-C：反向证据熔断 V13
const CircuitBreaker = lazy(() => import('@/pages/circuit-breaker'));
// M300-D：疗效证据总览 V13
const EvidenceOverview = lazy(() => import('@/pages/evidence-overview'));
// M301-A：医生显式反馈闭环 V13
const Feedback = lazy(() => import('@/pages/feedback'));
// M301-B：修改点归因与经验补丁 V13
const ExperiencePatches = lazy(() => import('@/pages/experience-patches'));
// M301-C：反馈信号看板与趋势 V13
const FeedbackTrend = lazy(() => import('@/pages/feedback-trend'));
// M301-D：反馈闭环总览 V13
const FeedbackLoopOverview = lazy(() => import('@/pages/feedback-loop-overview'));
// M302-A：经验精准主动推送 V13
const ContextualPush = lazy(() => import('@/pages/contextual-push'));
// M302-B：推送时机与场景触发 V13
const PushScene = lazy(() => import('@/pages/push-scene'));
// M302-C：推送频控与免打扰 V13
const PushQuota = lazy(() => import('@/pages/push-quota'));
// M302-D：推送效果与闭环总览 V13
const PushEffectOverview = lazy(() => import('@/pages/push-effect-overview'));
// M303-A：推送个人化学习 V13
const DoctorPreference = lazy(() => import('@/pages/doctor-preference'));
// M303-B：相似医生协同推荐 V13
const LookAlike = lazy(() => import('@/pages/look-alike'));
// M303-C：个人学习曲线 V13
const LearningCurve = lazy(() => import('@/pages/learning-curve'));
// M303-D：个人化学习效果总览 V13
const PersonalizedLearningOverview = lazy(() => import('@/pages/personalized-learning-overview'));
// M304-A：跨科室经验扩散 V13
const CrossDeptBroadcast = lazy(() => import('@/pages/cross-dept-broadcast'));
// M304-B：跨科室采纳反馈 V13
const DiffusionAdoption = lazy(() => import('@/pages/diffusion-adoption'));
// M304-C：扩散网络图谱 V13
const DiffusionGraph = lazy(() => import('@/pages/diffusion-graph'));
// M304-D：跨科室扩散总览 V13
const DiffusionOverview = lazy(() => import('@/pages/diffusion-overview'));
// M305-A：经验资产运营与退役 V13
const ExperienceAsset = lazy(() => import('@/pages/experience-asset'));
// M305-B：资产盘点周期 V13
const AssetAudit = lazy(() => import('@/pages/asset-audit'));
// M305-C：退役经验存档与复用 V13
const ArchivedExperience = lazy(() => import('@/pages/archived-experience'));
// M305-D：经验资产生命周期总览 V13
const AssetLifecycleOverview = lazy(() => import('@/pages/asset-lifecycle-overview'));
// M306-A：医院 AI 学习飞轮成熟度 V13
const FlywheelScore = lazy(() => import('@/pages/flywheel-score'));
// M306-B：六维指标明细下钻 V13
const FlywheelDrilldown = lazy(() => import('@/pages/flywheel-drilldown'));
// M306-C：飞轮改进建议 V13
const FlywheelRecommendation = lazy(() => import('@/pages/flywheel-recommendation'));
// M306-D：飞轮季度演进趋势 V13
const FlywheelTrend = lazy(() => import('@/pages/flywheel-trend'));
// M307-A：飞轮改进任务闭环 V13
const FlywheelTasks = lazy(() => import('@/pages/flywheel-tasks'));
// M307-B：任务进度追踪与升级 V13
const TaskFunnel = lazy(() => import('@/pages/task-funnel'));
// M307-C：任务验收与效果验证 V13
const TaskVerification = lazy(() => import('@/pages/task-verification'));
// M307-D：闭环回灌飞轮 V13
const ClosedLoopOverview = lazy(() => import('@/pages/closed-loop-overview'));
// M308-A：科室任务看板 V13
const DeptTaskBoard = lazy(() => import('@/pages/dept-task-board'));
// M308-B：科室任务详情与督办 V13
const DeptTaskDetail = lazy(() => import('@/pages/dept-task-detail'));
// M308-C：科室经验 SOP 沉淀 V13
const DeptSop = lazy(() => import('@/pages/dept-sop'));
// M308-D：科际协作与经验共享总览 V13
const DeptCollabOverview = lazy(() => import('@/pages/dept-collab-overview'));
// M308-D（新规格）：科室间任务协作总览 V13
const DeptTaskCollab = lazy(() => import('@/pages/dept-task-collab'));
// M309-A：改进建议采纳率追踪 V13
const SuggestionAdoption = lazy(() => import('@/pages/suggestion-adoption'));
// M309-B：SOP 引用次数回灌飞轮分 V13
const SopUsage = lazy(() => import('@/pages/sop-usage'));
// M309-C：跨科协作任务经验双沉淀 V13
const CrossDeptLearning = lazy(() => import('@/pages/cross-dept-learning'));
// M309-D：个人学习曲线里程碑 V13
const LearningMilestone = lazy(() => import('@/pages/learning-milestone'));
// M310-A：综合学习飞轮健康度仪表盘 V13
const FlywheelHealth = lazy(() => import('@/pages/flywheel-health'));
// M310-B：多科室横向对标 V13
const DeptBenchmark = lazy(() => import('@/pages/dept-benchmark'));
// M310-C：医生个人月度成长报告 V13
const DoctorGrowthReport = lazy(() => import('@/pages/doctor-growth-report'));
// M310-D：院长季度复盘报告 V13
const QuarterlyReview = lazy(() => import('@/pages/quarterly-review'));
// M311-A：患者满意度闭环 V13
const PatientSatisfaction = lazy(() => import('@/pages/patient-satisfaction'));
// M311-B：医护工作量与疲劳度监测 V13
const StaffWorkload = lazy(() => import('@/pages/staff-workload'));
// M311-C：不良事件根因分析 RCA 辅助 V13
const QualityEventRca = lazy(() => import('@/pages/quality-event-rca'));
// M311-D：院长指挥中心一屏总览 V13
const DeanCommandCenter = lazy(() => import('@/pages/dean-command-center'));
// M312-A：床位占用预测 V13
const BedOccupancyForecast = lazy(() => import('@/pages/bed-occupancy-forecast'));
// M312-B：药房库存预警 V13
const PharmacyInventoryAlert = lazy(() => import('@/pages/pharmacy-inventory-alert'));
// M312-C：手术排程冲突检测 V13
const OtSchedulingConflict = lazy(() => import('@/pages/ot-scheduling-conflict'));
// M312-D：急诊容量预警 V13
const EmergencyCapacity = lazy(() => import('@/pages/emergency-capacity'));
// M313-A：DRG 费用超支预警 V13
const DrgCostOverrun = lazy(() => import('@/pages/drg-cost-overrun'));
// M313-B：门诊流量预测与分时段建议 V13
const OutpatientFlowForecast = lazy(() => import('@/pages/outpatient-flow-forecast'));
// M313-C：医疗设备维保到期提醒 V13
const EquipmentMaintenance = lazy(() => import('@/pages/equipment-maintenance'));
// M313-D：院感暴发早期预警 V13
const InfectionOutbreak = lazy(() => import('@/pages/infection-outbreak'));
// M314-A：门诊爽约率分析 V13
const NoShowRate = lazy(() => import('@/pages/no-show-rate'));
// M314-B：31 天再入院风险预测 V13
const ReadmissionRisk = lazy(() => import('@/pages/readmission-risk'));
// M314-C：出院用药重整 V13
const MedicationReconciliation = lazy(() => import('@/pages/medication-reconciliation'));
// M314-D：出院小结质量评分 V13
const DischargeSummaryQuality = lazy(() => import('@/pages/discharge-summary-quality'));
// M315-A：ICD 编码辅助推荐 V13
const IcdCodingAssist = lazy(() => import('@/pages/icd-coding-assist'));
// M315-B：医嘱套餐规范 V13
const OrderSetCompliance = lazy(() => import('@/pages/order-set-compliance'));
// M315-C：转科交接单完整度评分 V13
const TransferSummaryCompleteness = lazy(() => import('@/pages/transfer-summary-completeness'));
// M315-D：护理交班质量 V13
const NursingHandover = lazy(() => import('@/pages/nursing-handover'));
// M316-A：出院随访依从性 V13
const FollowUpAdherence = lazy(() => import('@/pages/follow-up-adherence'));
// M316-B：慢病管理达标率 V13
const ChronicDiseaseMgmt = lazy(() => import('@/pages/chronic-disease-mgmt'));
// M316-C：健教材料推送统计 V13
const HealthEducationPush = lazy(() => import('@/pages/health-education-push'));
// M316-D：患者门户使用度 V13
const PatientPortalUsage = lazy(() => import('@/pages/patient-portal-usage'));
// M317-A：门诊次均费用 V13
const OutpatientAvgCost = lazy(() => import('@/pages/outpatient-avg-cost'));
// M317-B：住院床日成本 V13
const InpatientBedDayCost = lazy(() => import('@/pages/inpatient-bed-day-cost'));
// M317-C：采购周期预警 V13
const ProcurementLeadTime = lazy(() => import('@/pages/procurement-lead-time'));
// M317-D：人员流失率 V13
const StaffTurnover = lazy(() => import('@/pages/staff-turnover'));
// M318-A：病历书写及时性 V13
const MedicalRecordTimeliness = lazy(() => import('@/pages/medical-record-timeliness'));
// M318-B：处方点评合格率 V13
const PrescriptionAudit = lazy(() => import('@/pages/prescription-audit'));
// M318-C：手卫生依从性 V13
const HandHygieneCompliance = lazy(() => import('@/pages/hand-hygiene-compliance'));
// M318-D：数据访问审计异常 V13
const DataAccessAudit = lazy(() => import('@/pages/data-access-audit'));
// M319-A：Doctor MUSE 使用统计 V13
const DoctorMuseUsage = lazy(() => import('@/pages/doctor-muse-usage'));
// M319-B：MUSE 建议采纳反馈 V13
const MuseFeedback = lazy(() => import('@/pages/muse-feedback'));
// M319-C：病历知识自动关联 V13
const KnowledgeLink = lazy(() => import('@/pages/knowledge-link'));
// M319-D：个人智能体训练数据沉淀 V13
const MuseTrainingData = lazy(() => import('@/pages/muse-training-data'));
// M320-A：护士个人智能体使用统计 V13
const NurseMuseUsage = lazy(() => import('@/pages/nurse-muse-usage'));
// M320-B：药师个人智能体使用统计 V13
const PharmacistMuseUsage = lazy(() => import('@/pages/pharmacist-muse-usage'));
// M320-C：行政个人智能体使用统计 V13
const AdminMuseUsage = lazy(() => import('@/pages/admin-muse-usage'));
// M320-D：患者个人智能体使用统计 V13
const PatientMuseUsage = lazy(() => import('@/pages/patient-muse-usage'));
// M321-A：五角色 MUSE 飞轮总览 V13
const MuseFlywheelOverview = lazy(() => import('@/pages/muse-flywheel-overview'));
// M321-B：跨角色经验互鉴 V13
const MuseCrossRoleLearning = lazy(() => import('@/pages/muse-cross-role-learning'));
// M321-C：模型版本迭代记录 V13
const MuseModelVersion = lazy(() => import('@/pages/muse-model-version'));
// M321-D：MUSE 投入产出报告 V13
const MuseRoiReport = lazy(() => import('@/pages/muse-roi-report'));
// M322-A：医疗质量总仪表盘 V13
const ClinicalQualityDashboard = lazy(() => import('@/pages/clinical-quality-dashboard'));
// M322-B：患者安全事件总览 V13
const PatientSafetyOverview = lazy(() => import('@/pages/patient-safety-overview'));
// M322-C：员工满意度 V13
const StaffSatisfaction = lazy(() => import('@/pages/staff-satisfaction'));
// M322-D：医院运营效率 V13
const HospitalEfficiency = lazy(() => import('@/pages/hospital-efficiency'));
// M323-A：电子病历五级评级自评 V13
const Emr5Level = lazy(() => import('@/pages/emr5-level'));
// M323-B：互联互通四甲自评 V13
const Intercon4Level = lazy(() => import('@/pages/intercon4-level'));
// M323-C：智慧医院评级自评 V13
const SmartHospitalRating = lazy(() => import('@/pages/smart-hospital-rating'));
// M323-D：数据治理成熟度 V13
const DataGovernanceMaturity = lazy(() => import('@/pages/data-governance-maturity'));
// M324-A：区域健康数据汇总 V13
const RegionalHealthData = lazy(() => import('@/pages/regional-health-data'));
// M324-B：基层医疗协同 V13
const GrassrootsMedical = lazy(() => import('@/pages/grassroots-medical'));
// M324-C：远程会诊量 V13
const TelemedicineOverview = lazy(() => import('@/pages/telemedicine-overview'));
// M324-D：公共卫生应急 V13
const PublicHealthEmergency = lazy(() => import('@/pages/public-health-emergency'));
// M325-A：影像 AI 使用统计 V13
const ImagingAiUsage = lazy(() => import('@/pages/imaging-ai-usage'));
// M325-B：检验 AI 使用统计 V13
const LabAiUsage = lazy(() => import('@/pages/lab-ai-usage'));
// M325-C：AI 模型漂移监控 V13
const AiModelDrift = lazy(() => import('@/pages/ai-model-drift'));
// M325-D：AI 治理台账 V13
const AiGovernance = lazy(() => import('@/pages/ai-governance'));
// M326-A：患者等候时长 V13
const PatientWaitTime = lazy(() => import('@/pages/patient-wait-time'));
// M326-B：患者投诉处理 V13
const PatientComplaint = lazy(() => import('@/pages/patient-complaint'));
// M326-C：随访完成率 V13
const PatientFollowUp = lazy(() => import('@/pages/patient-follow-up'));
// M326-D：健教材料推送 V13
const PatientEducationStats = lazy(() => import('@/pages/patient-education-stats'));
// M327-A：临床研究项目 V13
const ClinicalResearchOverview = lazy(() => import('@/pages/clinical-research-overview'));
// M327-B：教学医院指标 V13
const TeachingHospital = lazy(() => import('@/pages/teaching-hospital'));
// M327-C：继续教育学分 V13
const ContinuingEducation = lazy(() => import('@/pages/continuing-education'));
// M327-D：医学文献检索 V13
const MedicalLiterature = lazy(() => import('@/pages/medical-literature'));
// M328-A：设备运维 V13
const EquipmentOpsOverview = lazy(() => import('@/pages/equipment-ops-overview'));
// M328-B：耗材库存 V13
const ConsumableInventory = lazy(() => import('@/pages/consumable-inventory'));
// M328-C：药品库存 V13
const PharmacyInventory = lazy(() => import('@/pages/pharmacy-inventory'));
// M328-D：血库库存 V13
const BloodInventory = lazy(() => import('@/pages/blood-inventory'));
// M329-A：医保对账 V13
const BillingReconciliation = lazy(() => import('@/pages/billing-reconciliation'));
// M329-B：单病种成本 V13
const CostPerPatient = lazy(() => import('@/pages/cost-per-patient'));
// M329-C：收入结构 V13
const RevenueStructure = lazy(() => import('@/pages/revenue-structure'));
// M329-D：医保结算 V13
const InsuranceSettlement = lazy(() => import('@/pages/insurance-settlement'));
// M330-A：医生工作量 V13
const DoctorWorkload = lazy(() => import('@/pages/doctor-workload'));
// M330-B：护士工作量 V13
const NurseWorkload = lazy(() => import('@/pages/nurse-workload'));
// M330-C：员工净流失率 V13
const StaffTurnoverNet = lazy(() => import('@/pages/staff-turnover-net'));
// M330-D：培训时长 V13
const TrainingHours = lazy(() => import('@/pages/training-hours'));
// M331-A：病房床位使用率 V13
const WardOccupancy = lazy(() => import('@/pages/ward-occupancy'));
// M331-B：手术室利用率 V13
const OperatingRoom = lazy(() => import('@/pages/operating-room'));
// M331-C：电梯等候时间 V13
const ElevatorWaitTime = lazy(() => import('@/pages/elevator-wait-time'));
// M331-D：停车场使用率 V13
const Parking = lazy(() => import('@/pages/parking'));
// M332-A：患者满意度调研 V13
const PatientSatisfactionSurvey = lazy(() => import('@/pages/patient-satisfaction-survey'));
// M332-B：医生满意度调研 V13
const DoctorSatisfaction = lazy(() => import('@/pages/doctor-satisfaction'));
// M332-C：护士满意度调研 V13
const NurseSatisfaction = lazy(() => import('@/pages/nurse-satisfaction'));
// M332-D：员工满意度总览 V13
const StaffSatisfactionOverview = lazy(() => import('@/pages/staff-satisfaction-overview'));
// M333-A：临床路径执行率 V13
const ClinicalPathwayOverview = lazy(() => import('@/pages/clinical-pathway-overview'));
// M333-B：指南依从性 V13
const GuidelineCompliance = lazy(() => import('@/pages/guideline-compliance'));
// M333-C：抗菌药物使用强度 V13
const AntibioticUse = lazy(() => import('@/pages/antibiotic-use'));
// M333-D：用血合理率 V13
const BloodUse = lazy(() => import('@/pages/blood-use'));
// M334-A：病案质量 V13
const MrqQuality = lazy(() => import('@/pages/mrq-quality'));
// M334-B：ICD 编码准确率 V13
const IcdCodingAccuracy = lazy(() => import('@/pages/icd-coding-accuracy'));
// M334-C：DRG 分组 V13
const DrgGrouping = lazy(() => import('@/pages/drg-grouping'));
// M334-D：平均住院日 V13
const AverageLengthOfStay = lazy(() => import('@/pages/average-length-of-stay'));
// M335-A：急诊分诊 V13
const EmergencyTriageStats = lazy(() => import('@/pages/emergency-triage-stats'));
// M335-B：ICU 床位 V13
const IcuOccupancy = lazy(() => import('@/pages/icu-occupancy'));
// M335-C：危急值 V13
const CriticalValueStats = lazy(() => import('@/pages/critical-value-stats'));
// M335-D：31 天再入院率 V13
const ReadmissionStats = lazy(() => import('@/pages/readmission-stats'));
// M336-A：药品短缺 V13
const DrugShortage = lazy(() => import('@/pages/drug-shortage'));
// M336-B：药品不良反应 V13
const AdverseDrugEvent = lazy(() => import('@/pages/adverse-drug-event'));
// M336-C：抗菌药物处方率 V13
const AntibioticRx = lazy(() => import('@/pages/antibiotic-rx'));
// M336-D：静脉输液率 V13
const IvFluid = lazy(() => import('@/pages/iv-fluid'));
// M337-A：门诊等候时长 V13
const OutpatientWait = lazy(() => import('@/pages/outpatient-wait'));
// M337-B：预约诊疗 V13
const Appointment = lazy(() => import('@/pages/appointment'));
// M337-C：双向转诊 V13
const ReferralStats = lazy(() => import('@/pages/referral-stats'));
// M337-D：慢病管理 V13
const ChronicDiseaseStats = lazy(() => import('@/pages/chronic-disease-stats'));
// M338-A：检验报告周转时间 V13
const LabTurnaround = lazy(() => import('@/pages/lab-turnaround'));
// M338-B：影像报告周转时间 V13
const ImagingTurnaround = lazy(() => import('@/pages/imaging-turnaround'));
// M338-C：检验差错率 V13
const LabError = lazy(() => import('@/pages/lab-error'));
// M338-D：标本不合格率 V13
const SpecimenReject = lazy(() => import('@/pages/specimen-reject'));
// M339-A：手术量分级 V13
const SurgeryVolume = lazy(() => import('@/pages/surgery-volume'));
// M339-B：麻醉相关并发症 V13
const AnesthesiaComplication = lazy(() => import('@/pages/anesthesia-complication'));
// M339-C：手术部位感染率 V13
const SsiRate = lazy(() => import('@/pages/ssi-rate'));
// M339-D：术中冰冻病理与术后石蜡符合率 V13
const IntraopFrozenSection = lazy(() => import('@/pages/intraop-frozen-section'));
// M340-A：投诉处理 V13
const ComplaintHandling = lazy(() => import('@/pages/complaint-handling'));
// M340-B：医德医风考评 V13
const MedicalEthics = lazy(() => import('@/pages/medical-ethics'));
// M340-C：知情同意书签署率 V13
const InformedConsent = lazy(() => import('@/pages/informed-consent'));
// M340-D：门诊病历书写合格率 V13
const OutpatientRecord = lazy(() => import('@/pages/outpatient-record'));
// M341-A：手卫生依从率 V13
const HandHygiene = lazy(() => import('@/pages/hand-hygiene'));
// M341-B：院感发生率 V13
const NosocomialInfection = lazy(() => import('@/pages/nosocomial-infection'));
// M341-C：隔离医嘱执行率 V13
const IsolationOrder = lazy(() => import('@/pages/isolation-order'));
// M341-D：环境消毒合格率 V13
const EnvDisinfection = lazy(() => import('@/pages/env-disinfection'));
// M342-A：输血率 V13
const BloodTransfusionStats = lazy(() => import('@/pages/blood-transfusion'));
// M342-B：病理报告 TAT V13
const PathologyTurnaround = lazy(() => import('@/pages/pathology-turnaround'));
// M342-C：内镜检查量 V13
const EndoscopyVolume = lazy(() => import('@/pages/endoscopy-volume'));
// M342-D：超声检查量 V13
const UltrasoundVolume = lazy(() => import('@/pages/ultrasound-volume'));
// M343-A：住院医师规范化培训 V13
const ResidentTraining = lazy(() => import('@/pages/resident-training'));
// M343-B：继续医学教育 V13
const ContinuingEdu = lazy(() => import('@/pages/continuing-edu'));
// M343-C：科研项目 V13
const ResearchProject = lazy(() => import('@/pages/research-project'));
// M343-D：专利授权 V13
const Patent = lazy(() => import('@/pages/patent'));
// M344-A：核心系统可用率 V13
const SystemAvailability = lazy(() => import('@/pages/system-availability'));
// M344-B：信息安全事件 V13
const SecurityIncident = lazy(() => import('@/pages/security-incident'));
// M344-C：数据质量 V13
const DataQuality = lazy(() => import('@/pages/data-quality'));
// M344-D：API 调用量 V13
const ApiCall = lazy(() => import('@/pages/api-call'));
// M345-A：医保结算 V13（stats 避让 M329-D）
const InsuranceSettlementStats = lazy(() => import('@/pages/insurance-settlement-stats'));
// M345-B：业务收入结构 V13（stats 避让已有 revenueStructureV13）
const RevenueStructureStats = lazy(() => import('@/pages/revenue-structure-stats'));
// M345-C：成本控制 V13
const CostControl = lazy(() => import('@/pages/cost-control'));
// M345-D：床位使用 V13
const BedOccupancy = lazy(() => import('@/pages/bed-occupancy'));
// M346-A：员工流失率 V13（stats 避让已有 staffTurnoverV13）
const StaffTurnoverStats = lazy(() => import('@/pages/staff-turnover-stats'));
// M346-B：医师职称结构 V13
const DoctorTitleStructure = lazy(() => import('@/pages/doctor-title-structure'));
// M346-C：护患比 V13
const NursePatientRatio = lazy(() => import('@/pages/nurse-patient-ratio'));
// M346-D：员工培训学时 V13（M346 收官）
const StaffTrainingHours = lazy(() => import('@/pages/staff-training-hours'));
// M347-A：患者满意度 V13（stats 避让已有 patientSatisfactionV13）
const PatientSatisfactionStats = lazy(() => import('@/pages/patient-satisfaction-stats'));
// M347-B：投诉率 V13
const ComplaintRate = lazy(() => import('@/pages/complaint-rate'));
// M347-C：出院随访率 V13
const FollowUpCompletion = lazy(() => import('@/pages/follow-up-completion'));
// M347-D：病历完整性 V13（M347 收官）
const MedicalRecordIntegrity = lazy(() => import('@/pages/medical-record-integrity'));
// M348-A：急诊绿色通道 V13
const EmergencyGreenway = lazy(() => import('@/pages/emergency-greenway'));
// M348-B：院前急救 V13
const PreHospitalCare = lazy(() => import('@/pages/pre-hospital-care'));
// M348-C：胸痛中心 V13
const ChestPainCenter = lazy(() => import('@/pages/chest-pain-center'));
// M348-D：卒中中心 V13（M348 收官）
const StrokeCenter = lazy(() => import('@/pages/stroke-center'));
// M349-A：产科质量 V13
const MaternityQuality = lazy(() => import('@/pages/maternity-quality'));
// M349-B：新生儿 V13
const NewbornCare = lazy(() => import('@/pages/newborn-care'));
// M349-C：儿科诊疗 V13
const PediatricCare = lazy(() => import('@/pages/pediatric-care'));
// M349-D：预防接种 V13（M349 收官）
const Immunization = lazy(() => import('@/pages/immunization'));
// M350-A：中医服务 V13
const TcmService = lazy(() => import('@/pages/tcm-service'));
// M350-B：康复医学 V13（stats 避让已有 rehabilitationV5/report-v2）
const RehabilitationStats = lazy(() => import('@/pages/rehabilitation-stats'));
// M350-C：老年综合评估 V13
const GeriatricComprehensive = lazy(() => import('@/pages/geriatric-comprehensive'));
// M350-D：安宁疗护 V13（M350 收官）
const PalliativeCare = lazy(() => import('@/pages/palliative-care'));
// M351-A：消毒供应 V13
const Cssd = lazy(() => import('@/pages/cssd'));
// M351-B：大型设备开机率 V13
const EquipmentUtilization = lazy(() => import('@/pages/equipment-utilization'));
// M351-C：氧气供应 V13
const OxygenSupply = lazy(() => import('@/pages/oxygen-supply'));
// M351-D：医疗废物 V13（M351 收官）
const MedicalWaste = lazy(() => import('@/pages/medical-waste'));
// M352-A：消防安全 V13
const FireSafety = lazy(() => import('@/pages/fire-safety'));
// M352-B：能耗管理 V13
const EnergyConsumption = lazy(() => import('@/pages/energy-consumption'));
// M352-C：营养食堂 V13
const NutritionKitchen = lazy(() => import('@/pages/nutrition-kitchen'));
// M352-D：车辆管理 V13（M352 收官）
const ParkingMgmt = lazy(() => import('@/pages/parking-mgmt'));
// M353-A：信息安全 V13
const InfoSecurity = lazy(() => import('@/pages/info-security'));
// M353-B：数据质量 V13（stats 避让已有 dataQualityV13）
const DataQualityStats = lazy(() => import('@/pages/data-quality-stats'));
// M353-C：系统可用率 V13（stats 避让已有 systemAvailabilityV13）
const SystemAvailabilityStats = lazy(() => import('@/pages/system-availability-stats'));
// M353-D：备份与容灾 V13（M353 收官）
const BackupDR = lazy(() => import('@/pages/backup-dr'));
// M354-A：KPI 总览看板 V13
const KpiDashboard = lazy(() => import('@/pages/kpi-dashboard'));
// M354-B：病案质量管理 V13
const MedicalRecordQuality = lazy(() => import('@/pages/medical-record-quality'));
// M354-C：投诉管理 V13
const ComplaintMgmt = lazy(() => import('@/pages/complaint-mgmt'));
// M354-D：继续医学教育 V13（stats 避让已有 continuingEduV13，M354 收官）
const ContinuingEducationStats = lazy(() => import('@/pages/continuing-education-stats'));
// M355-A：重点专科建设 V13
const SpecialtyDevelopment = lazy(() => import('@/pages/specialty-development'));
// M355-B：临床研究 V13（stats 避让已有 clinicalResearchV13 / M327-A）
const ClinicalResearchStats = lazy(() => import('@/pages/clinical-research-stats'));
// M355-C：教学工作 V13
const TeachingWorkload = lazy(() => import('@/pages/teaching-workload'));
// M355-D：医联体与分级诊疗 V13（M355 收官）
const MedicalAlliance = lazy(() => import('@/pages/medical-alliance'));
// M356-A：DRG 绩效 V13
const DrgPerformance = lazy(() => import('@/pages/drg-performance'));
// M356-B：DIP 病种分值 V13
const DipScore = lazy(() => import('@/pages/dip-score'));
// M356-C：药耗占比 V13
const DrugConsumableRatio = lazy(() => import('@/pages/drug-consumable-ratio'));
// M356-D：收入结构（支出端） V13（expense 避让已有 revenueStructureV13 / revenueStructureStatsV13，M356 收官）
const ExpenseStructure = lazy(() => import('@/pages/expense-structure'));
// M357-A：患者安全目标 V13（stats 避让已有 patientSafetyV13 / M322-B）
const PatientSafetyStats = lazy(() => import('@/pages/patient-safety-stats'));
// M357-B：医疗质量核心制度 V13
const CoreSystem = lazy(() => import('@/pages/core-system'));
// M357-C：手术部位感染 V13
const SurgicalInfection = lazy(() => import('@/pages/surgical-infection'));
// M357-D：抗菌药物管理 V13（M357 收官）
const AntibioticMgmt = lazy(() => import('@/pages/antibiotic-mgmt'));
// M358-A：护理质量 V13
const NursingQuality = lazy(() => import('@/pages/nursing-quality'));
// M358-B：患者体验 V13
const PatientExperience = lazy(() => import('@/pages/patient-experience'));
// M358-C：护理人力配置 V13
const NursingStaffing = lazy(() => import('@/pages/nursing-staffing'));
// M358-D：护理文书管理 V13（M358 收官）
const NursingDocument = lazy(() => import('@/pages/nursing-document'));
// M359-A：药学服务 V13
const PharmacyService = lazy(() => import('@/pages/pharmacy-service'));
// M359-B：合理用药 V13（stats 避让已有 rationalDrugUse）
const RationalDrugUseStats = lazy(() => import('@/pages/rational-drug-use-stats'));
// M359-C：药品库存管理 V13（stats 避让已有 drugInventory）
const DrugInventoryStats = lazy(() => import('@/pages/drug-inventory-stats'));
// M359-D：输液管理 V13（M359 收官）
const InfusionMgmt = lazy(() => import('@/pages/infusion-mgmt'));
// M360-A：检验质量 V13（新规格：室内质控/室间质评/报告及时率）
const LabQuality = lazy(() => import('@/pages/lab-quality'));
// M360-B：影像质量 V13（新规格：报告及时率/阳性率/甲级片率）
const ImagingQuality = lazy(() => import('@/pages/imaging-quality'));
// M360-C：病理质量 V13
const PathologyQuality = lazy(() => import('@/pages/pathology-quality'));
// M360-D：输血管理 V13（M360 收官）
const BloodMgmt = lazy(() => import('@/pages/blood-mgmt'));
// M361-A：科研管理 V13
const ResearchMgmt = lazy(() => import('@/pages/research-mgmt'));
// M361-B：教学管理 V13
const TeachingMgmt = lazy(() => import('@/pages/teaching-mgmt'));
// M361-C：继续教育（覆盖率）V13
const ContinuingEduCoverage = lazy(() => import('@/pages/continuing-edu-coverage'));
// M361-D：学术交流 V13（M361 收官）
const AcademicExchange = lazy(() => import('@/pages/academic-exchange'));
// M362-A：人员管理 V13
const StaffMgmt = lazy(() => import('@/pages/staff-mgmt'));
// M362-B：培训管理 V13
const TrainingMgmt = lazy(() => import('@/pages/training-mgmt'));
// M362-C：后勤管理 V13
const LogisticsMgmt = lazy(() => import('@/pages/logistics-mgmt'));
// M362-D：安全管理 V13（M362 收官）
const SafetyMgmt = lazy(() => import('@/pages/safety-mgmt'));
// M363-A：信息安全（统计）V13（stats避让）
const InfoSecurityStats = lazy(() => import('@/pages/info-security-stats'));
// M363-B：患者隐私保护 V13
const PatientPrivacy = lazy(() => import('@/pages/patient-privacy'));
// M363-C：网络安全 V13
const NetworkSecurity = lazy(() => import('@/pages/network-security'));
// M363-D：数据治理（统计）V13（stats避让）
const DataGovernanceStats = lazy(() => import('@/pages/data-governance-stats'));
// M364-A：运营管理 V13
const OperationMgmt = lazy(() => import('@/pages/operation-mgmt'));
// M364-B：财务管理 V13
const FinanceMgmt = lazy(() => import('@/pages/finance-mgmt'));
// M364-C：患者流量 V13
const PatientFlow = lazy(() => import('@/pages/patient-flow'));
// M364-D：资源利用 V13（M364 收官）
const ResourceUtil = lazy(() => import('@/pages/resource-util'));
// M365-A：患者满意度（得分）V13（score避让）
const PatientSatisfactionScore = lazy(() => import('@/pages/patient-satisfaction-score'));
// M365-B：投诉管理（统计）V13（stats避让）
const ComplaintMgmtStats = lazy(() => import('@/pages/complaint-mgmt-stats'));
// M365-C：服务态度 V13
const ServiceAttitude = lazy(() => import('@/pages/service-attitude'));
// M365-D：就医体验（等候时间）V13（M365 收官）
const ExperienceWaitTime = lazy(() => import('@/pages/experience-wait-time'));
// M366-A：AI 辅助诊断（统计）V13（stats避让）
const AiDiagnosisStats = lazy(() => import('@/pages/ai-diagnosis-stats'));
// M366-B：AI 辅助治疗 V13
const AiTreatment = lazy(() => import('@/pages/ai-treatment'));
// M366-C：AI 管理应用 V13
const AiManagement = lazy(() => import('@/pages/ai-management'));
// M366-D：AI 教学培训 V13（M366 收官）
const AiEducation = lazy(() => import('@/pages/ai-education'));
// M367-A：互联网医院（统计）V13（stats避让）
const InternetHospitalStats = lazy(() => import('@/pages/internet-hospital-stats'));
// M367-B：远程医疗（统计）V13（stats避让）
const TelemedicineStats = lazy(() => import('@/pages/telemedicine-stats'));
// M367-C：在线支付 V13
const OnlinePayment = lazy(() => import('@/pages/online-payment'));
// M367-D：健康档案 V13（M367 收官）
const HealthRecord = lazy(() => import('@/pages/health-record'));
// M368-A：药品不良反应 V13
const DrugAdverseReaction = lazy(() => import('@/pages/drug-adverse-reaction'));
// M368-B：药物相互作用 V13
const DrugInteraction = lazy(() => import('@/pages/drug-interaction'));
// M368-C：抗菌药物管理（统计）V13（stats避让）
const AntibioticMgmtStats = lazy(() => import('@/pages/antibiotic-mgmt-stats'));
// M368-D：基本药物管理 V13（M368 收官）
const EssentialDrug = lazy(() => import('@/pages/essential-drug'));
// M369-A：护理质量（统计）V13（stats避让）
const NursingQualityStats = lazy(() => import('@/pages/nursing-quality-stats'));
// M369-B：护理安全 V13
const NursingSafety = lazy(() => import('@/pages/nursing-safety'));
// M369-C：护理人员配置 V13
const NursingStaff = lazy(() => import('@/pages/nursing-staff'));
// M369-D：护理培训 V13（M369 收官）
const NursingTraining = lazy(() => import('@/pages/nursing-training'));
// M370-A：院感控制 V13
const InfectionControl = lazy(() => import('@/pages/infection-control'));
// M370-B：院感监测 V13
const InfectionSurveillance = lazy(() => import('@/pages/infection-surveillance'));
// M370-C：环境卫生学 V13
const EnvironmentalHygiene = lazy(() => import('@/pages/environmental-hygiene'));
// M370-D：传染病报告 V13（M370 收官）
const EpidemicReport = lazy(() => import('@/pages/epidemic-report'));
// M371-A：医疗质量 V13
const MedicalQuality = lazy(() => import('@/pages/medical-quality'));
// M371-B：医疗安全 V13
const MedicalSafety = lazy(() => import('@/pages/medical-safety'));
// M371-C：手术质量 V13
const SurgeryQuality = lazy(() => import('@/pages/surgery-quality'));
// M371-D：麻醉质量 V13（M371 收官）
const AnesthesiaQuality = lazy(() => import('@/pages/anesthesia-quality'));
// M372-A：门诊服务 V13
const OutpatientService = lazy(() => import('@/pages/outpatient-service'));
// M372-B：急诊服务 V13
const EmergencyService = lazy(() => import('@/pages/emergency-service'));
// M372-C：门诊质量 V13
const OutpatientQuality = lazy(() => import('@/pages/outpatient-quality'));
// M372-D：绿色通道 V13（M372 收官）
const GreenChannel = lazy(() => import('@/pages/green-channel'));
// M373-A：住院服务 V13
const InpatientService = lazy(() => import('@/pages/inpatient-service'));
// M373-B：床位管理 V13
const BedManagement = lazy(() => import('@/pages/bed-management'));
// M373-C：住院质量 V13
const InpatientQuality = lazy(() => import('@/pages/inpatient-quality'));
// M373-D：出院随访 V13（M373 收官）
const DischargeFollowup = lazy(() => import('@/pages/discharge-followup'));
// M374-A：检查服务 V13
const ExaminationService = lazy(() => import('@/pages/examination-service'));
// M374-B：检验服务 V13
const LabService = lazy(() => import('@/pages/lab-service'));
// M374-C：病理服务 V13
const PathologyService = lazy(() => import('@/pages/pathology-service'));
// M374-D：影像质量 V13（M374 收官）
const RadiologyQuality = lazy(() => import('@/pages/radiology-quality'));
// M375-A：医保结算明细 V13（detail 避让）
const InsuranceSettlementDetail = lazy(() => import('@/pages/insurance-settlement-detail'));
// M375-B：费用控制 V13
const MedicalCostControl = lazy(() => import('@/pages/medical-cost-control'));
// M375-C：DRG 管理 V13
const DrgManagement = lazy(() => import('@/pages/drg-management'));
// M375-D：价格管理 V13（M375 收官）
const PriceManagement = lazy(() => import('@/pages/price-management'));
// M376-A：护理服务 V13
const NursingService = lazy(() => import('@/pages/nursing-service'));
// M376-B：护理文书统计 V13（stats 避让）
const NursingDocumentStats = lazy(() => import('@/pages/nursing-document-stats'));
// M376-C：护理敏感指标 V13
const NursingSensitiveIndex = lazy(() => import('@/pages/nursing-sensitive-index'));
// M376-D：护理管理 V13（M376 收官）
const NursingManagement = lazy(() => import('@/pages/nursing-management'));
// M377-A：后勤服务 V13
const LogisticsService = lazy(() => import('@/pages/logistics-service'));
// M377-B：设备管理 V13
const EquipmentMgmt = lazy(() => import('@/pages/equipment-mgmt'));
// M377-C：能源管理 V13
const EnergyMgmt = lazy(() => import('@/pages/energy-mgmt'));
// M377-D：环境管理 V13（M377 收官）
const EnvironmentMgmt = lazy(() => import('@/pages/environment-mgmt'));
// M378-A：预约服务统计 V13（stats 避让）
const AppointmentStats = lazy(() => import('@/pages/appointment-stats'));
// M378-B：导医服务 V13
const GuideService = lazy(() => import('@/pages/guide-service'));
// M378-C：志愿服务 V13
const VolunteerService = lazy(() => import('@/pages/volunteer-service'));
// M378-D：便民服务 V13（M378 收官）
const ConvenienceService = lazy(() => import('@/pages/convenience-service'));
// M379-A：安全事件统计 V13（stats 避让）
const SecurityIncidentStats = lazy(() => import('@/pages/security-incident-stats'));
// M379-B：备份管理 V13
const BackupMgmt = lazy(() => import('@/pages/backup-mgmt'));
// M379-C：系统可用性明细 V13（detail 避让）
const SystemAvailabilityDetail = lazy(() => import('@/pages/system-availability-detail'));
// M379-D：数据质量明细 V13（detail 避让，M379 收官）
const DataQualityDetail = lazy(() => import('@/pages/data-quality-detail'));
// M380-A：制剂管理 V13
const DrugPreparation = lazy(() => import('@/pages/drug-preparation'));
// M380-B：临床药学 V13
const ClinicalPharmacy = lazy(() => import('@/pages/clinical-pharmacy'));
// M380-C：药库管理 V13
const DrugStorage = lazy(() => import('@/pages/drug-storage'));
// M380-D：中药房 V13（M380 收官）
const TCMPharmacy = lazy(() => import('@/pages/tcm-pharmacy'));
// M381-A：运营看板 V13
const OperationDashboard = lazy(() => import('@/pages/operation-dashboard'));
// M381-B：财务明细 V13
const FinanceDetail = lazy(() => import('@/pages/finance-detail'));
// M381-C：患者流明细 V13
const PatientFlowDetail = lazy(() => import('@/pages/patient-flow-detail'));
// M381-D：资源利用明细 V13（M381 收官）
const ResourceUtilDetail = lazy(() => import('@/pages/resource-util-detail'));
// M382-A：医保申报 V13
const InsuranceClaim = lazy(() => import('@/pages/insurance-claim'));
// M382-B：医保审核统计 V13（stats 避让）
const InsuranceAuditStats = lazy(() => import('@/pages/insurance-audit-stats'));
// M382-C：DRG分组统计 V13（stats 避让）
const DRGGroupStats = lazy(() => import('@/pages/drg-group-stats'));
// M382-D：价格监控 V13（M382 收官）
const PriceMonitor = lazy(() => import('@/pages/price-monitor'));
// M383-A：科研项目统计 V13（stats 避让）
const ResearchProjectStats = lazy(() => import('@/pages/research-project-stats'));
// M383-B：教学活动 V13
const TeachingActivity = lazy(() => import('@/pages/teaching-activity'));
// M383-C：住培管理统计 V13（stats 避让）
const ResidentTrainingStats = lazy(() => import('@/pages/resident-training-stats'));
// M383-D：学术交流统计 V13（stats 避让，M383 收官）
const AcademicExchangeStats = lazy(() => import('@/pages/academic-exchange-stats'));
// M384-A：人员招聘 V13
const StaffRecruitment = lazy(() => import('@/pages/staff-recruitment'));
// M384-B：人员留存 V13
const StaffRetention = lazy(() => import('@/pages/staff-retention'));
// M384-C：绩效考核 V13
const PerformanceEval = lazy(() => import('@/pages/performance-eval'));
// M384-D：培训计划 V13（M384 收官）
const TrainingPlan = lazy(() => import('@/pages/training-plan'));
// M385-A：后勤保障 V13
const LogisticsSupport = lazy(() => import('@/pages/logistics-support'));
// M385-B：设备维护统计 V13（stats 避让）
const EquipmentMaintenanceStats = lazy(() => import('@/pages/equipment-maintenance-stats'));
// M385-C：能源管理明细 V13
const EnergyMgmtDetail = lazy(() => import('@/pages/energy-mgmt-detail'));
// M385-D：安全生产 V13（M385 收官）
const SafetyProduction = lazy(() => import('@/pages/safety-production'));
// M386-A：患者体验统计 V13（stats 避让）
const PatientExperienceStats = lazy(() => import('@/pages/patient-experience-stats'));
// M386-B：服务质量 V13
const ServiceQuality = lazy(() => import('@/pages/service-quality'));
// M386-D：临床路径统计 V13（stats 避让，M386 收官）
const ClinicalPathwayStats = lazy(() => import('@/pages/clinical-pathway-stats'));
// M387-A：核心制度落实 V13
const CoreSystemCompliance = lazy(() => import('@/pages/core-system-compliance'));
// M387-B：交接班管理 V13
const HandoverMgmt = lazy(() => import('@/pages/handover-mgmt'));
// M387-C：知情同意统计 V13（stats 避让）
const InformedConsentStats = lazy(() => import('@/pages/informed-consent-stats'));
// M387-D：不良事件上报 V13（M387 收官）
const AdverseEventReport = lazy(() => import('@/pages/adverse-event-report'));
// M388-A：处方点评统计 V13（stats 避让）
const PrescriptionReviewStats = lazy(() => import('@/pages/prescription-review-stats'));
// M388-B：抗菌药物使用 V13
const AntibioticUsage = lazy(() => import('@/pages/antibiotic-usage'));
// M388-C：药品过敏管理 V13
const DrugAllergyMgmt = lazy(() => import('@/pages/drug-allergy-mgmt'));
// M388-D：急救药品管理 V13（M388 收官）
const EmergencyDrugMgmt = lazy(() => import('@/pages/emergency-drug-mgmt'));
// M389-A：护理质量 V13
const NursingCareQuality = lazy(() => import('@/pages/nursing-care-quality'));
// M389-B：护理感控 V13
const NursingInfectionControl = lazy(() => import('@/pages/nursing-infection-control'));
// M389-C：护理教育 V13
const NursingEducation = lazy(() => import('@/pages/nursing-education'));
// M389-D：护理人力统计 V13（stats 避让，M389 收官）
const NursingStaffingStats = lazy(() => import('@/pages/nursing-staffing-stats'));
// M390-A：预约管理 V13
const AppointmentMgmt = lazy(() => import('@/pages/appointment-mgmt'));
// M390-B：分诊管理 V13
const TriageMgmt = lazy(() => import('@/pages/triage-mgmt'));
// M390-C：门诊药房 V13
const OutpatientPharmacy = lazy(() => import('@/pages/outpatient-pharmacy'));
// M390-D：急诊分级 V13（M390 收官）
const EmergencySeverity = lazy(() => import('@/pages/emergency-severity'));
// M391-A：手术过程 V13
const SurgeryProcess = lazy(() => import('@/pages/surgery-process'));
// M391-B：麻醉质量 V13
const AnesthesiaDetail = lazy(() => import('@/pages/anesthesia-detail'));
// M391-C：围手术期 V13
const PerioperativeMgmt = lazy(() => import('@/pages/perioperative-mgmt'));
// M391-D：器械管理 V13（M391 收官）
const InstrumentMgmt = lazy(() => import('@/pages/instrument-mgmt'));
// M392-A：检验质控 V13
const LabQualityControl = lazy(() => import('@/pages/lab-quality-control'));
// M392-B：影像质控 V13
const ImagingQualityControl = lazy(() => import('@/pages/imaging-quality-control'));
// M392-C：病理质控 V13
const PathologyQualityControl = lazy(() => import('@/pages/pathology-quality-control'));
// M392-D：输血管理 V13（M392 收官）
const BloodMgmtDetail = lazy(() => import('@/pages/blood-mgmt-detail'));
// M393-A：手卫生明细 V13（避让旧版 hand-hygiene）
const HandHygieneDetail = lazy(() => import('@/pages/hand-hygiene-detail'));
// M393-B：隔离管理 V13
const IsolationMgmt = lazy(() => import('@/pages/isolation-mgmt'));
// M393-C：医疗废物 V13
const MedicalWasteMgmt = lazy(() => import('@/pages/medical-waste-mgmt'));
// M393-D：疫苗接种 V13（M393 收官）
const VaccinationMgmt = lazy(() => import('@/pages/vaccination-mgmt'));
// M394-A：跌倒预防 V13
const FallPrevention = lazy(() => import('@/pages/fall-prevention'));
// M394-B：压疮管理 V13
const PressureUlcerMgmt = lazy(() => import('@/pages/pressure-ulcer-mgmt'));
// M394-C：患者身份识别 V13
const PatientIdentification = lazy(() => import('@/pages/patient-identification'));
// M394-D：用药安全 V13（M394 收官）
const MedicationSafety = lazy(() => import('@/pages/medication-safety'));
// M395-A：智慧医院分级 V13（避让旧版 smart-hospital）
const SmartHospitalGrade = lazy(() => import('@/pages/smart-hospital-grade'));
// M395-B：等级评审 V13
const GradeReview = lazy(() => import('@/pages/grade-review'));
// M395-C：质量管理体系 V13
const QualityMgmtSystem = lazy(() => import('@/pages/quality-mgmt-system'));
// M395-D：绩效管理 V13（M395 收官）
const PerformanceMgmt = lazy(() => import('@/pages/performance-mgmt'));
// M396-A：床位利用 V13
const BedUtilization = lazy(() => import('@/pages/bed-utilization'));
// M396-B：收入结构明细 V13（避让旧版 revenue-structure/revenue-structure-stats）
const RevenueStructureDetail = lazy(() => import('@/pages/revenue-structure-detail'));
// M396-C：成本控制明细 V13（避让旧版 cost-control/medical-cost-control）
const CostControlDetail = lazy(() => import('@/pages/cost-control-detail'));
// M396-D：效率指标 V13（M396 收官）
const EfficiencyIndicator = lazy(() => import('@/pages/efficiency-indicator'));
// M397-A：学科建设 V13
const DisciplineConstruction = lazy(() => import('@/pages/discipline-construction'));
// M397-B：人才发展 V13
const TalentDevelopment = lazy(() => import('@/pages/talent-development'));
// M397-C：临床研究明细 V13（避让旧版 clinical-research/clinical-research-stats）
const ClinicalResearchDetail = lazy(() => import('@/pages/clinical-research-detail'));
// M397-D：继续教育明细 V13（M397 收官，避让旧版 continuing-education/continuing-education-stats）
const ContinuingEducationDetail = lazy(() => import('@/pages/continuing-education-detail'));
// M398-A：投诉管理明细 V13（避让旧版 complaint-mgmt/complaint-mgmt-stats）
const ComplaintMgmtDetail = lazy(() => import('@/pages/complaint-mgmt-detail'));
// M398-B：医疗纠纷 V13
const MedicalDispute = lazy(() => import('@/pages/medical-dispute'));
// M398-C：医保管理明细 V13
const MedicalInsuranceDetail = lazy(() => import('@/pages/medical-insurance-detail'));
// M398-D：公共关系 V13（M398 收官）
const PublicRelation = lazy(() => import('@/pages/public-relation'));
// M399-A：互联网医院明细 V13（避让旧版 internet-hospital/internet-hospital-stats）
const InternetHospitalDetail = lazy(() => import('@/pages/internet-hospital-detail'));
// M399-B：远程医疗明细 V13（避让旧版 telemedicine/telemedicine-stats）
const TelemedicineDetail = lazy(() => import('@/pages/telemedicine-detail'));
// M399-C：线上支付明细 V13（避让旧版 online-payment）
const OnlinePaymentDetail = lazy(() => import('@/pages/online-payment-detail'));
// M399-D：健康体检 V13（M399 收官）
const HealthCheckup = lazy(() => import('@/pages/health-checkup'));
// M400-A：患者服务 V13
const PatientService = lazy(() => import('@/pages/patient-service'));
// M400-B：满意度调查明细 V13（避让旧版 satisfaction-survey）
const SatisfactionSurveyDetail = lazy(() => import('@/pages/satisfaction-survey-detail'));
// M400-C：随访管理 V13
const FollowUpMgmt = lazy(() => import('@/pages/follow-up-mgmt'));
// M400-D：患者教育明细 V13（M400 收官，避让旧版 patient-education-stats）
const PatientEducationDetail = lazy(() => import('@/pages/patient-education-detail'));
// M401-A：病案管理 V13
const MedicalRecord = lazy(() => import('@/pages/medical-record'));
// M401-B：数据治理明细 V13（避让旧版 data-governance/data-governance-stats）
const DataGovernanceDetail = lazy(() => import('@/pages/data-governance-detail'));
// M401-C：统计报表 V13
const StatisticsReport = lazy(() => import('@/pages/statistics-report'));
// M401-D：编码质量 V13（M401 收官）
const CodingQuality = lazy(() => import('@/pages/coding-quality'));
// M402-A：排班管理 V13
const SchedulingMgmt = lazy(() => import('@/pages/scheduling-mgmt'));
// M402-B：值班管理 V13
const DutyRoster = lazy(() => import('@/pages/duty-roster'));
// M402-C：考勤管理 V13
const AttendanceMgmt = lazy(() => import('@/pages/attendance-mgmt'));
// M402-D：绩效考核 V13（避让旧版 performance-eval，M402 收官）
const PerformanceEvalDetail = lazy(() => import('@/pages/performance-eval-detail'));
// M403-A：重点专科管理 V13
const KeySpecialtyMgmt = lazy(() => import('@/pages/key-specialty-mgmt'));
// M403-B：人才团队管理 V13
const TalentTeamMgmt = lazy(() => import('@/pages/talent-team-mgmt'));
// M403-C：学科竞赛 V13
const DisciplineCompetition = lazy(() => import('@/pages/discipline-competition'));
// M403-D：学术水平 V13（M403 收官）
const AcademicLevel = lazy(() => import('@/pages/academic-level'));
// M404-A：三级查房管理 V13
const ThreeLevelWardRound = lazy(() => import('@/pages/three-level-ward-round'));
// M404-B：会诊管理 V13
const ConsultationMgmt = lazy(() => import('@/pages/consultation-mgmt'));
// M404-C：病例讨论 V13
const CaseDiscussion = lazy(() => import('@/pages/case-discussion'));
// M404-D：分级护理 V13（M404 收官）
const GradeNursing = lazy(() => import('@/pages/grade-nursing'));
// M405-A：护理文书质量 V13
const NursingRecordQuality = lazy(() => import('@/pages/nursing-record-quality'));
// M405-B：护患沟通 V13
const NursingCommunication = lazy(() => import('@/pages/nursing-communication'));
// M405-C：护理管理明细 V13（避让旧版 nursing-management M376-D）
const NursingManagementDetail = lazy(() => import('@/pages/nursing-management-detail'));
// M405-D：护理服务明细 V13（M405 收官）
const NursingServiceDetail = lazy(() => import('@/pages/nursing-service-detail'));
// M406-A：处方点评 V13
const PharmacyPrescriptionReview = lazy(() => import('@/pages/pharmacy-prescription-review'));
// M406-B：药品目录 V13
const PharmacyDrugCatalog = lazy(() => import('@/pages/pharmacy-drug-catalog'));
// M406-C：药品配送 V13
const PharmacyDrugDelivery = lazy(() => import('@/pages/pharmacy-drug-delivery'));
// M406-D：药品安全 V13（M406 收官）
const PharmacyDrugSafety = lazy(() => import('@/pages/pharmacy-drug-safety'));
// M407-A：运营成本管理 V13
const OperatingCostMgmt = lazy(() => import('@/pages/operating-cost-mgmt'));
// M407-B：收入增长 V13
const RevenueGrowth = lazy(() => import('@/pages/revenue-growth'));
// M407-C：盈亏分析 V13
const ProfitAnalysis = lazy(() => import('@/pages/profit-analysis'));
// M407-D：战略KPI V13（M407 收官）
const StrategicKpi = lazy(() => import('@/pages/strategic-kpi'));
// M408-A：医疗器械管理 V13
const MedicalDeviceMgmt = lazy(() => import('@/pages/medical-device-mgmt'));
// M408-B：耗材供应 V13
const ConsumableSupply = lazy(() => import('@/pages/consumable-supply'));
// M408-C：消防安全明细 V13（避让旧版 fire-safety M352-A）
const FireSafetyDetail = lazy(() => import('@/pages/fire-safety-detail'));
// M408-D：治安保卫 V13（M408 收官）
const SecurityMgmt = lazy(() => import('@/pages/security-mgmt'));
// M409-A：信息系统管理 V13
const InformationSystemMgmt = lazy(() => import('@/pages/information-system-mgmt'));
// M409-B：数据质量管理 V13
const DataQualityMgmt = lazy(() => import('@/pages/data-quality-mgmt'));
// M409-C：网络安全管理 V13
const CybersecurityMgmt = lazy(() => import('@/pages/cybersecurity-mgmt'));
// M409-D：互联互通管理 V13（M409 收官）
const InteropMgmt = lazy(() => import('@/pages/interop-mgmt'));
// M410-A：科室KPI V13
const DepartmentKpi = lazy(() => import('@/pages/department-kpi'));
// M410-B：个人KPI V13
const IndividualKpi = lazy(() => import('@/pages/individual-kpi'));
// M410-C：绩效奖金 V13
const PerformanceBonus = lazy(() => import('@/pages/performance-bonus'));
// M410-D：绩效改进 V13（M410 收官）
const PerformanceImprovement = lazy(() => import('@/pages/performance-improvement'));
// M411-A：危急值管理 V13
const CriticalValueMgmt = lazy(() => import('@/pages/critical-value-mgmt'));
// M411-B：再入院管理 V13
const ReadmissionMgmt = lazy(() => import('@/pages/readmission-mgmt'));
// M411-C：转科转院管理 V13
const InpatientTransferMgmt = lazy(() => import('@/pages/inpatient-transfer-mgmt'));
// M411-D：出院小结管理 V13（M411 收官）
const DischargeSummaryMgmt = lazy(() => import('@/pages/discharge-summary-mgmt'));
// M412-A：死亡病例管理 V13
const DeathReportMgmt = lazy(() => import('@/pages/death-report-mgmt'));
// M412-B：新生儿管理 V13
const NewbornMgmt = lazy(() => import('@/pages/newborn-mgmt'));
// M412-C：孕产妇管理 V13
const MaternalMgmt = lazy(() => import('@/pages/maternal-mgmt'));
// M412-D：院感报告管理 V13（M412 收官）
const InfectionReportMgmt = lazy(() => import('@/pages/infection-report-mgmt'));
// M413-A：病案质量管理 V13
const MedicalRecordMgmt = lazy(() => import('@/pages/medical-record-mgmt'));
// M413-B：知情同意管理（细节）V13（detail 避让旧版 informedConsentStatsV13）
const InformedConsentDetail = lazy(() => import('@/pages/informed-consent-detail'));
// M413-C：交接班管理（细节）V13（detail 避让旧版 handoverMgmtV13）
const HandoverDetail = lazy(() => import('@/pages/handover-detail'));
// M413-D：不良事件管理（细节）V13（M413 收官，detail 避让旧版 adverseEventReportV13）
const AdverseEventDetail = lazy(() => import('@/pages/adverse-event-detail'));
// M414-A：输血管理 V13
const BloodTransfusionMgmt = lazy(() => import('@/pages/blood-transfusion-mgmt'));
// M414-B：临床路径管理（细节）V13（detail 避让旧版 clinicalPathwayMgmtV13）
const ClinicalPathwayDetail = lazy(() => import('@/pages/clinical-pathway-detail'));
// M414-C：抗菌药物管理（细节）V13（detail 避让旧版 antibioticUseDensityV13）
const AntibioticMgmtDetail = lazy(() => import('@/pages/antibiotic-mgmt-detail'));
// M414-D：VTE 预防管理 V13（M414 收官）
const VtePreventionMgmt = lazy(() => import('@/pages/vte-prevention-mgmt'));
// M415-A：抢救管理 V13
const RescueMgmt = lazy(() => import('@/pages/rescue-mgmt'));
// M415-B：医学影像管理（细节）V13（detail 避让旧版 imagingTurnaroundV13）
const MedicalImagingDetail = lazy(() => import('@/pages/medical-imaging-detail'));
// M415-C：病理管理 V13
const PathologyMgmt = lazy(() => import('@/pages/pathology-mgmt'));
// M415-D：营养管理 V13（M415 收官）
const NutritionMgmt = lazy(() => import('@/pages/nutrition-mgmt'));
// M416-A：ICU 管理 V13
const IcuMgmt = lazy(() => import('@/pages/icu-mgmt'));
// M416-B：急诊管理 V13
const ErMgmt = lazy(() => import('@/pages/er-mgmt'));
// M416-C：门诊管理（细节）V13（detail 避让旧版 outpatientWait/appointment/referral/chronicDisease）
const OutpatientMgmtDetail = lazy(() => import('@/pages/outpatient-mgmt-detail'));
// M416-D：住院管理（细节）V13（M416 收官，detail 避让旧版 inpatientBedMgmtV13）
const InpatientMgmtDetail = lazy(() => import('@/pages/inpatient-mgmt-detail'));
// M417-A：血液透析管理 V13
const DialysisMgmt = lazy(() => import('@/pages/dialysis-mgmt'));
// M417-B：内镜管理 V13
const EndoscopyMgmt = lazy(() => import('@/pages/endoscopy-mgmt'));
// M417-C：手术室管理 V13
const OperationRoomMgmt = lazy(() => import('@/pages/operation-room-mgmt'));
// M417-D：病房管理（细节）V13（M417 收官，detail 避让旧版 inpatientBedMgmtV13）
const WardMgmtDetail = lazy(() => import('@/pages/ward-mgmt-detail'));
// M418-A：药事管理（细节）V13（detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
const PharmacyMgmtDetail = lazy(() => import('@/pages/pharmacy-mgmt-detail'));
// M418-B：医疗设备管理（细节）V13（detail 避让旧版 equipmentMgmtV13/consumableSupplyV13）
const MedicalEquipmentMgmtDetail = lazy(() => import('@/pages/medical-equipment-mgmt-detail'));
// M418-C：院感控制（细节）V13（detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
const InfectionControlDetail = lazy(() => import('@/pages/infection-control-detail'));
// M418-D：患者安全管理 V13（M418 收官）
const PatientSafetyMgmt = lazy(() => import('@/pages/patient-safety-mgmt'));
// M419-A：病案管理（细节）V13（detail 避让旧版 medicalRecordMgmtV13）
const MedicalRecordDetail = lazy(() => import('@/pages/medical-record-detail'));
// M419-B：信息安全管理 V13
const InformationSecurityMgmt = lazy(() => import('@/pages/information-security-mgmt'));
// M419-C：培训管理（细节）V13（detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
const TrainingMgmtDetail = lazy(() => import('@/pages/training-mgmt-detail'));
// M419-D：质控管理 V13（M419 收官）
const QualityControlMgmt = lazy(() => import('@/pages/quality-control-mgmt'));
// M420-A：病案归档管理 V13（archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
const MedicalRecordArchiveMgmt = lazy(() => import('@/pages/medical-record-archive-mgmt'));
// M420-B：健康教育管理 V13
const HealthEducationMgmt = lazy(() => import('@/pages/health-education-mgmt'));
// M420-C：医学伦理管理 V13
const MedicalEthicsMgmt = lazy(() => import('@/pages/medical-ethics-mgmt'));
// M420-D：医务社工管理 V13（M420 收官）
const MedicalSocialWorkMgmt = lazy(() => import('@/pages/medical-social-work-mgmt'));
// M421-A：院感监测（细节）V13（detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列）
const InfectionSurveillanceDetail = lazy(() => import('@/pages/infection-surveillance-detail'));
// M421-B：抗菌药物使用管理 V13（换名避让旧版 antiInfectionDetailV13）
const AntibioticUsageMgmt = lazy(() => import('@/pages/antibiotic-usage-mgmt'));
// M421-C：输血管理（细节）V13（detail 避让旧版 bloodTransfusionMgmtV13）
const BloodTransfusionDetail = lazy(() => import('@/pages/blood-transfusion-detail'));
// M421-D：临床路径管理 V13（M421 收官，换名避让旧版 clinicalPathwayDetailV13）
const ClinicalPathwayMgmt = lazy(() => import('@/pages/clinical-pathway-mgmt'));
// M422-A：VTE 预防管理（细节）V13（detail 避让旧版 vtePreventionMgmtV13）
const VtePreventionDetail = lazy(() => import('@/pages/vte-prevention-detail'));
// M422-B：压疮管理（细节）V13（detail 避让旧版 pressureUlcerMgmtV13（M394-B））
const PressureUlcerDetail = lazy(() => import('@/pages/pressure-ulcer-detail'));
// M422-C：跌倒管理 V13
const FallMgmt = lazy(() => import('@/pages/fall-mgmt'));
// M422-D：身体约束管理 V13（M422 收官）
const RestraintMgmt = lazy(() => import('@/pages/restraint-mgmt'));
// M423-A：手卫生督查 V13（换名避让旧版 handHygieneComplianceV13（M418））
const HandHygieneAudit = lazy(() => import('@/pages/hand-hygiene-audit'));
// M423-B：隔离管理（细节）V13（detail 避让旧版 isolationMgmtV13（M393-B））
const IsolationDetail = lazy(() => import('@/pages/isolation-detail'));
// M423-C：消毒灭菌管理 V13
const SterilizationMgmt = lazy(() => import('@/pages/sterilization-mgmt'));
// M423-D：医废追溯管理 V13（M423 收官，换名避让旧版 infectionControlDetailV13（M418））
const MedicalWasteTracking = lazy(() => import('@/pages/medical-waste-tracking'));
// M424-A：用药错误上报 V13（换名避让旧版 patientSafetyMgmtV13（M418））
const MedicationErrorReport = lazy(() => import('@/pages/medication-error-report'));
// M424-B：高危药品管理 V13
const HighAlertMedMgmt = lazy(() => import('@/pages/high-alert-med-mgmt'));
// M424-C：输液管理（细节）V13（detail 避让旧版 infusionMgmtV13（M359-D））
const InfusionDetail = lazy(() => import('@/pages/infusion-detail'));
// M424-D：血糖管理 V13（M424 收官）
const BloodGlucoseMgmt = lazy(() => import('@/pages/blood-glucose-mgmt'));
// M425-A：危急值管理（细节）V13（detail 避让旧版 criticalValueMgmtV13（M411））
const CriticalValueDetail = lazy(() => import('@/pages/critical-value-detail'));
// M425-B：交接班沟通管理 V13（换名避让旧版 handoverDetailV13（M413））
const HandoverCommunicationMgmt = lazy(() => import('@/pages/handover-communication-mgmt'));
// M425-C：知情同意管理 V13（换名避让旧版 consentDetailV13（M413））
const ConsentMgmt = lazy(() => import('@/pages/consent-mgmt'));
// M425-D：隐私保护管理 V13（M425 收官，换名避让旧版 informationSecurityMgmtV13（M419））
const PrivacyMgmt = lazy(() => import('@/pages/privacy-mgmt'));
// M426-A：抢救记录管理 V13（换名避让旧版 rescueMgmtV13（M415））
const RescueRecordMgmt = lazy(() => import('@/pages/rescue-record-mgmt'));
// M426-B：麻醉记录管理 V13（换名避让旧版 anesthesiaComplicationV13（M339））
const AnesthesiaRecordMgmt = lazy(() => import('@/pages/anesthesia-record-mgmt'));
// M426-C：安全核查管理 V13（换名避让旧版 surgeryVolumeV13（M339））
const SafetyCheckMgmt = lazy(() => import('@/pages/safety-check-mgmt'));
// M426-D：病房环境管理 V13（M426 收官，换名避让旧版 wardMgmtDetailV13（M417））
const WardEnvironmentMgmt = lazy(() => import('@/pages/ward-environment-mgmt'));
// M427-A：出院小结管理（细节）V13（detail 避让旧版 dischargeSummaryMgmtV13（M411））
const DischargeSummaryDetail = lazy(() => import('@/pages/discharge-summary-detail'));
// M427-B：转科管理（细节）V13（detail 避让旧版 transferMgmtV13（M411））
const TransferDetail = lazy(() => import('@/pages/transfer-detail'));
// M427-C：再入院分析管理 V13（换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀））
const ReadmissionAnalysisMgmt = lazy(() => import('@/pages/readmission-analysis-mgmt'));
// M427-D：死亡病例管理（细节）V13（M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
const DeathCaseDetail = lazy(() => import('@/pages/death-case-detail'));
// M428-A：新生儿护理管理 V13（换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
const NeonatalCareMgmt = lazy(() => import('@/pages/neonatal-care-mgmt'));
// M428-B：孕产妇护理管理 V13（换名避让旧版 maternalMgmtV13（M412，-care 后缀））
const MaternalCareMgmt = lazy(() => import('@/pages/maternal-care-mgmt'));
// M428-C：急诊护理管理 V13（换名避让旧版 emergencyMgmtV13（M416，-care 后缀））
const EmergencyCareMgmt = lazy(() => import('@/pages/emergency-care-mgmt'));
// M428-D：ICU 护理管理 V13（M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀））
const IcuCareMgmt = lazy(() => import('@/pages/icu-care-mgmt'));
// M429-A：透析质量管理 V13（-quality 后缀避让旧版 dialysisMgmtV13（M417））
const DialysisQualityMgmt = lazy(() => import('@/pages/dialysis-quality-mgmt'));
// M429-B：内镜质量管理 V13（-quality 后缀避让旧版 endoscopyMgmtV13（M417））
const EndoscopyQualityMgmt = lazy(() => import('@/pages/endoscopy-quality-mgmt'));
// M429-C：手术室质量管理 V13（-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
const OperatingRoomQualityMgmt = lazy(() => import('@/pages/operating-room-quality-mgmt'));
// M429-D：病房质量管理 V13（M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417））
const WardQualityMgmt = lazy(() => import('@/pages/ward-quality-mgmt'));
// M430-A：影像质量管理 V13（-quality 后缀避让旧版 medicalImagingDetailV13（M415））
const ImagingQualityMgmt = lazy(() => import('@/pages/imaging-quality-mgmt'));
// M430-B：病理质量管理 V13（-quality 后缀避让旧版 pathologyMgmtV13（M415））
const PathologyQualityMgmt = lazy(() => import('@/pages/pathology-quality-mgmt'));
// M430-C：营养质量管理 V13（-quality 后缀避让旧版 nutritionMgmtV13（M415））
const NutritionQualityMgmt = lazy(() => import('@/pages/nutrition-quality-mgmt'));
// M430-D：输血质量管理 V13（M430 收官，-quality 后缀避让旧版 bloodTransfusionDetailV13（M421））
const BloodTransfusionQualityMgmt = lazy(() => import('@/pages/blood-transfusion-quality-mgmt'));
// M431-A：药事质量管理 V13（-quality 后缀避让旧版 pharmacyDetailV13（M418））
const MedicationQualityMgmt = lazy(() => import('@/pages/medication-quality-mgmt'));
// M431-B：设备质量管理 V13（-quality 后缀避让旧版 medicalDeviceDetailV13（M418））
const DeviceQualityMgmt = lazy(() => import('@/pages/device-quality-mgmt'));
// M431-C：消防安全质量管理 V13（-quality 后缀避让旧版 fireSafetyDetailV13（M408））
const FireSafetyQualityMgmt = lazy(() => import('@/pages/fire-safety-quality-mgmt'));
// M431-D：治安保卫质量管理 V13（M431 收官，-quality 后缀避让旧版 securityMgmtV13（M408））
const SecurityQualityMgmt = lazy(() => import('@/pages/security-quality-mgmt'));
// M432-A：信息系统质量管理 V13（-quality 后缀避让旧版 informationSystemMgmtV13（M409））
const InformationSystemQualityMgmt = lazy(() => import('@/pages/information-system-quality-mgmt'));
// M432-B：数据上报质量管理 V13（换名 dataReport + -quality 后缀避让旧版 dataQualityMgmtV13（M409））
const DataReportQualityMgmt = lazy(() => import('@/pages/data-report-quality-mgmt'));
// M432-C：网络安全质量管理 V13（-quality 后缀避让旧版 networkSecurityMgmtV13（M409））
const NetworkSecurityQualityMgmt = lazy(() => import('@/pages/network-security-quality-mgmt'));
// M432-D：互联互通质量管理 V13（M432 收官，-quality 后缀避让旧版 interoperabilityMgmtV13（M409））
const InteroperabilityQualityMgmt = lazy(() => import('@/pages/interoperability-quality-mgmt'));
// M433-A：科室 KPI 质量管理 V13（-quality 后缀避让旧版 deptKpiMgmtV13（M410））
const DeptKpiQualityMgmt = lazy(() => import('@/pages/dept-kpi-quality-mgmt'));
// M433-B：个人 KPI 质量管理 V13（-quality 后缀避让旧版 staffKpiMgmtV13（M410））
const StaffKpiQualityMgmt = lazy(() => import('@/pages/staff-kpi-quality-mgmt'));
// M433-C：奖金分配质量管理 V13（-quality 后缀避让旧版 bonusMgmtV13（M410））
const BonusQualityMgmt = lazy(() => import('@/pages/bonus-quality-mgmt'));
// M433-D：绩效改进质量管理 V13（M433 收官，-quality 后缀避让旧版 performanceImprovementMgmtV13（M410））
const PerformanceImprovementQualityMgmt = lazy(() => import('@/pages/performance-improvement-quality-mgmt'));
// M434-A：教学质量管理 V13（-quality 后缀避让旧版 trainingMgmtDetailV13（M419））
const TeachingQualityMgmt = lazy(() => import('@/pages/teaching-quality-mgmt'));
// M434-B：科研质量管理 V13（-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
const ResearchQualityMgmt = lazy(() => import('@/pages/research-quality-mgmt'));
// M434-C：继续教育质量管理 V13（-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
const ContinuingEducationQualityMgmt = lazy(() => import('@/pages/continuing-education-quality-mgmt'));
// M434-D：学科建设质量管理 V13（M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等））
const DisciplineConstructionQualityMgmt = lazy(() => import('@/pages/discipline-construction-quality-mgmt'));
// M435-A：预算执行质量管理 V13（-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
const BudgetExecutionQualityMgmt = lazy(() => import('@/pages/budget-execution-quality-mgmt'));
// M435-B：采购质量管理 V13（-quality 后缀避让旧版采购模块（M408 consumableSupplyMgmtV13 等））
const ProcurementQualityMgmt = lazy(() => import('@/pages/procurement-quality-mgmt'));
// M435-C：固定资产质量管理 V13（-quality 后缀避让旧版固定资产模块（M408 medicalDeviceMgmtV13 等））
const FixedAssetQualityMgmt = lazy(() => import('@/pages/fixed-asset-quality-mgmt'));
// M435-D：能耗质量管理 V13（M435 收官，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等））
const EnergyQualityMgmt = lazy(() => import('@/pages/energy-quality-mgmt'));
// M436-A：污水处理质量管理 V13（院感安全环保质量管理深化组）
const SewageTreatmentQualityMgmt = lazy(() => import('@/pages/sewage-treatment-quality-mgmt'));
// M436-B：辐射安全质量管理 V13（院感安全环保质量管理深化组）
const RadiationSafetyQualityMgmt = lazy(() => import('@/pages/radiation-safety-quality-mgmt'));
// M436-C：实验室生物安全质量管理 V13（院感安全环保质量管理深化组）
const LabBiosafetyQualityMgmt = lazy(() => import('@/pages/lab-biosafety-quality-mgmt'));
// M436-D：医废追溯质量管理 V13（M436 收官，-quality 后缀避让旧版 medicalWasteTraceabilityMgmtV13（M423））
const MedicalWasteTraceabilityQualityMgmt = lazy(() => import('@/pages/medical-waste-traceability-quality-mgmt'));
// M437-A：膳食质量管理 V13（后勤保障与环境管理深化组）
const CateringQualityMgmt = lazy(() => import('@/pages/catering-quality-mgmt'));
// M437-B：被服洗涤管理 V13（后勤保障与环境管理深化组）
const LaundryMgmt = lazy(() => import('@/pages/laundry-mgmt'));
// M437-C：环境卫生质量管理 V13（后勤保障与环境管理深化组）
const EnvironmentalHygieneQualityMgmt = lazy(() => import('@/pages/environmental-hygiene-quality-mgmt'));
// M437-D：会议室管理 V13（M437 收官，后勤保障与环境管理深化组）
const MeetingRoomMgmt = lazy(() => import('@/pages/meeting-room-mgmt'));
// M438-A：医德医风质量管理 V13（行风廉洁与职业道德建设组）
const MedicalEthicsQualityMgmt = lazy(() => import('@/pages/medical-ethics-quality-mgmt'));
// M438-B：廉洁行医质量管理 V13（行风廉洁与职业道德建设组）
const IntegrityQualityMgmt = lazy(() => import('@/pages/integrity-quality-mgmt'));
// M438-C：商业贿赂治理质量管理 V13（行风廉洁与职业道德建设组）
const CommercialBriberyQualityMgmt = lazy(() => import('@/pages/commercial-bribery-quality-mgmt'));
// M438-D：行业作风建设质量管理 V13（M438 收官，行风廉洁与职业道德建设组）
const IndustryStyleQualityMgmt = lazy(() => import('@/pages/industry-style-quality-mgmt'));
// M439-A：不良事件上报管理 V13（患者安全与医疗风险管理组）
const AdverseEventReporting = lazy(() => import('@/pages/adverse-event-reporting'));
// M439-B：跌倒坠床风险管理 V13（患者安全与医疗风险管理组）
const FallIncident = lazy(() => import('@/pages/fall-incident'));
// M439-C：压疮风险管理 V13（患者安全与医疗风险管理组）
const PressureUlcer = lazy(() => import('@/pages/pressure-ulcer'));
// M439-D：管路滑脱风险管理 V13（M439 收官，患者安全与医疗风险管理组）
const TubeDislodgement = lazy(() => import('@/pages/tube-dislodgement'));
// M440-A：处方点评质量管理 V13（药事管理与药学服务组）
const PrescriptionReviewQuality = lazy(() => import('@/pages/prescription-review-quality'));
// M440-B：抗菌药物使用质量管理 V13（药事管理与药学服务组）
const AntibioticUseQuality = lazy(() => import('@/pages/antibiotic-use-quality'));
// M440-C：药品不良反应监测 V13（药事管理与药学服务组）
const AdrReporting = lazy(() => import('@/pages/adr-reporting'));
// M440-D：临床药学服务质量管理 V13（M440 收官，药事管理与药学服务组）
const ClinicalPharmacyQuality = lazy(() => import('@/pages/clinical-pharmacy-quality'));
// M441-A：院感监测管理 V13（医院感染管理组）
const HospitalInfectionSurveillance = lazy(() => import('@/pages/hospital-infection-surveillance'));
// M441-B：手卫生质量管理 V13（医院感染管理组）
const HandHygieneQuality = lazy(() => import('@/pages/hand-hygiene-quality'));
// M441-C：消毒灭菌管理 V13（医院感染管理组）
const DisinfectionSterilization = lazy(() => import('@/pages/disinfection-sterilization'));
// M441-D：医疗废物质量管理 V13（M441 收官，医院感染管理组）
const MedicalWasteMgmtQuality = lazy(() => import('@/pages/medical-waste-mgmt-quality'));
// M442-A：孕产妇系统管理 V13（妇幼健康与计划生育管理组）
const MaternalHealthMgmt = lazy(() => import('@/pages/maternal-health-mgmt'));
// M442-B：儿童保健管理 V13（妇幼健康与计划生育管理组）
const ChildHealthMgmt = lazy(() => import('@/pages/child-health-mgmt'));
// M442-C：出生缺陷监测 V13（妇幼健康与计划生育管理组）
const BirthDefectMonitoring = lazy(() => import('@/pages/birth-defect-monitoring'));
// M442-D：计划生育技术服务 V13（M442 收官，妇幼健康与计划生育管理组）
const FamilyPlanningMgmt = lazy(() => import('@/pages/family-planning-mgmt'));
// M443-A：住院医师规范化培训 V13（教学科研与继续教育管理组）
const ResidencyTrainingMgmt = lazy(() => import('@/pages/residency-training-mgmt'));
// M443-B：继续医学教育 V13（教学科研与继续教育管理组）
const ContinuingEducationMgmt = lazy(() => import('@/pages/continuing-education-mgmt'));
// M443-C：科研项目管理 V13（教学科研与继续教育管理组）
const ResearchProjectMgmt = lazy(() => import('@/pages/research-project-mgmt'));
// M443-D：教学质量评估 V13（M443 收官，教学科研与继续教育管理组）
const TeachingQualityMgmtAssessment = lazy(() => import('@/pages/teaching-quality-mgmt-assessment'));
// M444-A：绩效考核管理 V13（绩效薪酬与人力资源管理组）
const PerformanceAppraisalMgmt = lazy(() => import('@/pages/performance-appraisal-mgmt'));
// M444-B：薪酬分配管理 V13（绩效薪酬与人力资源管理组）
const SalaryDistributionMgmt = lazy(() => import('@/pages/salary-distribution-mgmt'));
// M444-C：人员招聘与配置 V13（绩效薪酬与人力资源管理组）
const RecruitmentMgmt = lazy(() => import('@/pages/recruitment-mgmt'));
// M444-D：员工培训发展管理 V13（M444 收官，绩效薪酬与人力资源管理组）
const StaffTrainingDevelopmentMgmt = lazy(() => import('@/pages/staff-training-development-mgmt'));
// M445-A：医保费用管控 V13（医保物价与费用管理组）
const InsuranceCostControl = lazy(() => import('@/pages/insurance-cost-control'));
// M445-B：医疗服务价格管理 V13（医保物价与费用管理组）
const PriceMgmt = lazy(() => import('@/pages/price-mgmt'));
// M445-C：医疗费用审核 V13（医保物价与费用管理组）
const ExpenseAudit = lazy(() => import('@/pages/expense-audit'));
// M445-D：DRG/DIP 管理 V13（M445 收官，医保物价与费用管理组）
const DrgDipMgmt = lazy(() => import('@/pages/drg-dip-mgmt'));
// M446-A：信息系统可用性管理 V13（信息化建设与数据安全管理组）
const SystemAvailabilityMgmt = lazy(() => import('@/pages/system-availability-mgmt'));
// M446-B：数据安全管理 V13（信息化建设与数据安全管理组）
const DataSecurityMgmt = lazy(() => import('@/pages/data-security-mgmt'));
// M446-C：网络安全防护管理 V13（信息化建设与数据安全管理组）
const NetworkSecurityMgmt = lazy(() => import('@/pages/network-security-mgmt'));
// M446-D：信息运维服务管理 V13（M446 收官，信息化建设与数据安全管理组）
const ItServiceDeskMgmt = lazy(() => import('@/pages/it-service-desk-mgmt'));
// M447-A：应急演练管理 V13（应急管理与安全生产管理组）
const EmergencyDrillMgmt = lazy(() => import('@/pages/emergency-drill-mgmt'));
// M447-B：突发事件处置管理 V13（应急管理与安全生产管理组）
const EmergencyResponseMgmt = lazy(() => import('@/pages/emergency-response-mgmt'));
// M447-C：安全生产管理 V13（应急管理与安全生产管理组）
const SafetyProductionMgmt = lazy(() => import('@/pages/safety-production-mgmt'));
// M447-D：消防安全管理 V13（M447 收官，应急管理与安全生产管理组）
const FireSafetyMgmt = lazy(() => import('@/pages/fire-safety-mgmt'));
// M448-A：门诊收费管理 V13（财务与收费管理组）
const OutpatientBillingMgmt = lazy(() => import('@/pages/outpatient-billing-mgmt'));
// M448-B：住院收费管理 V13（财务与收费管理组）
const InpatientBillingMgmt = lazy(() => import('@/pages/inpatient-billing-mgmt'));
// M448-C：财务预算管理 V13（财务与收费管理组）
const BudgetMgmt = lazy(() => import('@/pages/budget-mgmt'));
// M448-D：票据管理 V13（M448 收官，财务与收费管理组）
const InvoiceMgmt = lazy(() => import('@/pages/invoice-mgmt'));
// M449-A：医疗设备采购管理 V13（医疗装备与设备管理组）
const MedicalEquipmentPurchaseMgmt = lazy(() => import('@/pages/medical-equipment-purchase-mgmt'));
// M449-B：设备维护保养管理 V13（医疗装备与设备管理组）
const EquipmentMaintenanceMgmt = lazy(() => import('@/pages/equipment-maintenance-mgmt'));
// M449-C：设备计量校准管理 V13（医疗装备与设备管理组）
const EquipmentCalibrationMgmt = lazy(() => import('@/pages/equipment-calibration-mgmt'));
// M449-D：设备报废处置管理 V13（M449 收官，医疗装备与设备管理组）
const EquipmentDisposalMgmt = lazy(() => import('@/pages/equipment-disposal-mgmt'));
// M450-A：宣传管理 V13（宣传与党建管理组）
const PublicityMgmt = lazy(() => import('@/pages/publicity-mgmt'));
// M450-B：党建管理 V13（宣传与党建管理组）
const PartyBuildingMgmt = lazy(() => import('@/pages/party-building-mgmt'));
// M450-C：档案管理 V13（宣传与党建管理组）
const ArchiveMgmt = lazy(() => import('@/pages/archive-mgmt'));
// M450-D：统计管理 V13（M450 收官，宣传与党建管理组）
const StatisticsMgmt = lazy(() => import('@/pages/statistics-mgmt'));
// M451-A：医患沟通管理 V13（医患关系与投诉管理组）
const DoctorPatientCommunicationMgmt = lazy(() => import('@/pages/doctor-patient-communication-mgmt'));
// M451-B：投诉处理管理 V13（医患关系与投诉管理组）
const ComplaintHandlingMgmt = lazy(() => import('@/pages/complaint-handling-mgmt'));
// M451-C：医疗纠纷调解管理 V13（医患关系与投诉管理组）
const MedicalDisputeMediationMgmt = lazy(() => import('@/pages/medical-dispute-mediation-mgmt'));
// M451-D：满意度调查管理 V13（M451 收官，医患关系与投诉管理组）
const SatisfactionSurveyMgmt = lazy(() => import('@/pages/satisfaction-survey-mgmt'));
// M452-A：医院评审迎检管理 V13（医院评审与临床质量改进组）
const HospitalAccreditationMgmt = lazy(() => import('@/pages/hospital-accreditation-mgmt'));
// M452-B：单病种质量管理 V13（医院评审与临床质量改进组）
const SingleDiseaseQualityMgmt = lazy(() => import('@/pages/single-disease-quality-mgmt'));
// M452-C：临床路径管理（覆盖率视角）V13（医院评审与临床质量改进组）
const ClinicalPathwayCoverageMgmt = lazy(() => import('@/pages/clinical-pathway-coverage-mgmt'));
// M452-D：病案质量管理 V13（M452 收官，医院评审与临床质量改进组）
const MedicalRecordQualityMgmt = lazy(() => import('@/pages/medical-record-quality-mgmt'));
// M453-A：护理质量管理 V13（护理管理组）
const NursingQualityMgmt = lazy(() => import('@/pages/nursing-quality-mgmt'));
// M453-B：护理人力配置管理 V13（护理管理组）
const NursingStaffingMgmt = lazy(() => import('@/pages/nursing-staffing-mgmt'));
// M453-C：护理培训管理 V13（护理管理组）
const NursingTrainingMgmt = lazy(() => import('@/pages/nursing-training-mgmt'));
// M453-D：护理服务管理 V13（M453 收官，护理管理组）
const NursingServiceMgmt = lazy(() => import('@/pages/nursing-service-mgmt'));
// M454-A：门诊流程管理 V13（门急诊与手术麻醉管理组）
const OutpatientProcessMgmt = lazy(() => import('@/pages/outpatient-process-mgmt'));
// M454-B：急诊绿色通道管理 V13（门急诊与手术麻醉管理组）
const EmergencyGreenChannelMgmt = lazy(() => import('@/pages/emergency-green-channel-mgmt'));
// M454-C：手术麻醉管理 V13（门急诊与手术麻醉管理组）
const SurgeryAnesthesiaMgmt = lazy(() => import('@/pages/surgery-anesthesia-mgmt'));
// M454-D：ICU 管理（统计视角）V13（M454 收官，门急诊与手术麻醉管理组）
const IcuStatsMgmt = lazy(() => import('@/pages/icu-stats-mgmt'));
// M455-A：药品采购管理 V13（药品供应与库存管理组）
const DrugPurchaseMgmt = lazy(() => import('@/pages/drug-purchase-mgmt'));
// M455-B：药品库存管理 V13（药品供应与库存管理组）
const DrugInventoryMgmt = lazy(() => import('@/pages/drug-inventory-mgmt'));
// M455-C：药品效期管理 V13（药品供应与库存管理组）
const DrugExpiryMgmt = lazy(() => import('@/pages/drug-expiry-mgmt'));
// M455-D：特殊药品管理 V13（M455 收官，药品供应与库存管理组）
const SpecialDrugMgmt = lazy(() => import('@/pages/special-drug-mgmt'));
// M456-A：重点学科建设管理 V13（学科建设与科研管理组）
const DisciplineConstructionMgmt = lazy(() => import('@/pages/discipline-construction-mgmt'));
// M456-B：科研成果转化管理 V13（学科建设与科研管理组）
const ResearchAchievementTransformMgmt = lazy(() => import('@/pages/research-achievement-transform-mgmt'));
// M456-C：学术交流管理 V13（学科建设与科研管理组）
const AcademicExchangeMgmt = lazy(() => import('@/pages/academic-exchange-mgmt'));
// M456-D：科研平台管理 V13（M456 收官，学科建设与科研管理组）
const ResearchPlatformMgmt = lazy(() => import('@/pages/research-platform-mgmt'));
// M457-A：医院文化建设管理 V13（医院文化与公益管理组）
const HospitalCultureMgmt = lazy(() => import('@/pages/hospital-culture-mgmt'));
// M457-B：志愿者服务管理 V13（医院文化与公益管理组）
const VolunteerServiceMgmt = lazy(() => import('@/pages/volunteer-service-mgmt'));
// M457-C：健康宣教管理（统计视角）V13（医院文化与公益管理组，-stats 避让）
const HealthEducationStatsMgmt = lazy(() => import('@/pages/health-education-stats-mgmt'));
// M457-D：社工服务管理 V13（M457 收官，医院文化与公益管理组）
const SocialWorkServiceMgmt = lazy(() => import('@/pages/social-work-service-mgmt'));
// M458-A：日间手术管理 V13（日间手术与门诊操作管理组）
const DaySurgeryMgmt = lazy(() => import('@/pages/day-surgery-mgmt'));
// M458-B：门诊小手术管理 V13（日间手术与门诊操作管理组）
const OutpatientMinorSurgeryMgmt = lazy(() => import('@/pages/outpatient-minor-surgery-mgmt'));
// M458-C：门诊治疗室管理 V13（日间手术与门诊操作管理组）
const OutpatientTreatmentRoomMgmt = lazy(() => import('@/pages/outpatient-treatment-room-mgmt'));
// M458-D：门诊换药管理 V13（M458 收官，日间手术与门诊操作管理组）
const OutpatientDressingMgmt = lazy(() => import('@/pages/outpatient-dressing-mgmt'));
// M459-A：医院运营管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落）
const HospitalOperationsMgmt = lazy(() => import('@/pages/hospital-operations-mgmt'));
// M459-B：健康管理体检管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落）
const HealthCheckupMgmt = lazy(() => import('@/pages/health-checkup-mgmt'));
// M459-C：互联网医院管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落）
const InternetHospitalMgmt = lazy(() => import('@/pages/internet-hospital-mgmt'));
// M459-D：多学科诊疗MDT管理 V13（M459 收官，医院运营与健康管理组，M455 旧文件已删除回滚后重落）
const MdtConsultationMgmt = lazy(() => import('@/pages/mdt-consultation-mgmt'));
// 电子病历模板管理（M103-A）
const EmrTemplatePage = lazy(() => import('@/pages/emr/Template'));
// M461-A：EMR 模板管理 V14（EMR 深化四模块，-management 避让基础名已占）
const EmrTemplateManagement = lazy(() => import('@/pages/emr-template-management'));
// M461-B：规则质控可视化配置 V14（EMR 深化四模块）
const QcRuleConfigPage = lazy(() => import('@/pages/qc-rule-config'));
// M461-A：病历书写时限 SLA 实时监控 V14（EMR 深化四模块）
const EmrSlaMonitorPage = lazy(() => import('@/pages/emr-sla-monitor'));
// M461-B：病历缺陷统计分析 V14（EMR 深化四模块）
const EmrDefectStatsPage = lazy(() => import('@/pages/emr-defect-stats'));
// M461-C：模板版本审核工作流 V14（EMR 深化四模块）
const EmrTemplateReviewPage = lazy(() => import('@/pages/emr-template-review'));
// M461-D：科室病历质控评分排名 V14（EMR 深化四模块，M461 收官）
const EmrQcRankingPage = lazy(() => import('@/pages/emr-qc-ranking'));
// M462-A：病历 AI 草稿生成 V14（EMR 深化四模块）
const EmrDraftGenPage = lazy(() => import('@/pages/emr-draft-gen'));
// M462-B：病历归档与封存管理 V14（EMR 深化四模块）
const EmrArchivePage = lazy(() => import('@/pages/emr-archive'));
// M462-C：病历借阅复印管理 V14（EMR 深化四模块）
const EmrBorrowPage = lazy(() => import('@/pages/emr-borrow'));
// M462-D：电子病历等级评审仪表盘 V14（EMR 深化四模块，M462 收官）
const EmrGradeDashboardPage = lazy(() => import('@/pages/emr-grade-dashboard'));
// M463-A：病历电子签名与认证 V14（EMR 深化四模块）
// M371 removed duplicate (emr-signature variant)
// M463-B：病历复制痕迹保留 V14（EMR 深化四模块）
const EmrCopyTracePage = lazy(() => import('@/pages/emr-copy-trace'));
// M463-C：病历数据导出与区域上报 V14（EMR 深化四模块）
const EmrExportPage = lazy(() => import('@/pages/emr-export'));
// M463-D：科室质控员工作台 V14（EMR 深化四模块，M463 收官）
const EmrQcWorkbenchPage = lazy(() => import('@/pages/emr-qc-workbench'));
// M464-A：ICD 编码辅助与校对 V14（EMR 深化四模块）
const EmrIcdCodingPage = lazy(() => import('@/pages/emr-icd-coding'));
// M464-B：病历术语标准词库 V14（EMR 深化四模块）
const EmrTermDictPage = lazy(() => import('@/pages/emr-term-dict'));
// M464-C：病历时间轴视图 V14（EMR 深化四模块，-detail 避让 EmrTimelinessPage）
const EmrTimelineDetailPage = lazy(() => import('@/pages/emr-timeline-detail'));
// M464-D：病历缺陷反馈与整改闭环 V14（EMR 深化四模块，M464 收官）
const EmrDefectFeedbackPage = lazy(() => import('@/pages/emr-defect-feedback'));
// M465-A：病历模板可视化编辑器 V14（EMR 深化四模块）
const EmrTemplateEditorPage = lazy(() => import('@/pages/emr-template-editor'));
// M465-B：病历质量实时评分仪表盘 V14（EMR 深化四模块）
const EmrQualityScorePage = lazy(() => import('@/pages/emr-quality-score'));
// M465-C：患者就诊 360° 全视图 V14（EMR 深化四模块）
const EmrPatient360Page = lazy(() => import('@/pages/emr-patient-360'));
// M470：患者统一时间线 P0 合规（/patient/:id/timeline）
const PatientTimelineM470Page = lazy(() => import('@/pages/patient/timeline-m470'));
// M471：医生工作台待办中心（/workflow/todo-center）
const WorkflowTodoCenterM471Page = lazy(() => import('@/pages/workflow/todo-center-m471'));
// M472：护理 NQI 与互联互通合规看板（/quality/compliance-board）
const ComplianceBoardM472Page = lazy(() => import('@/pages/quality/compliance-board-m472'));
// M473：病历质控看板（/quality/emr-quality-board）
const EmrQualityBoardM473Page = lazy(() => import('@/pages/quality/emr-quality-board-m473'));
// M474：CDS 临床决策支持看板（/clinical/cds-board）
const CdsBoardM474Page = lazy(() => import('@/pages/clinical/cds-board-m474'));
// M476：DRG/单病种经济运行看板（/quality/drg-board）
const DrgBoardM476Page = lazy(() => import('@/pages/quality/drg-board-m476'));
// M478：安全与隐私合规看板（/security/board）
const SecurityBoardM478Page = lazy(() => import('@/pages/security/board-m478'));
// M479：智慧服务三级运营总览（/smart-service/board）
const SmartServiceBoardM479Page = lazy(() => import('@/pages/smart-service/board-m479'));
// M480：医院运营实时大屏（/operation/dashboard）
const OperationDashboardM480Page = lazy(() => import('@/pages/operation/dashboard-m480'));
// M481：院感与患者安全看板（/quality/infection-board）
const InfectionBoardM481Page = lazy(() => import('@/pages/quality/infection-board-m481'));
// M482：全院合规总览驾驶舱（/compliance/hub）
const ComplianceHubM482Page = lazy(() => import('@/pages/compliance/hub-m482'));
// M483：医保与应急管理看板（/finance/insurance-board）
const InsuranceBoardM483Page = lazy(() => import('@/pages/finance/insurance-board-m483'));
// M484：药学管理看板（/pharmacy/board）
const PharmacyBoardM484Page = lazy(() => import('@/pages/pharmacy/board-m484'));
// M485：科研管理看板（/research/board）
const ResearchBoardM485Page = lazy(() => import('@/pages/research/board-m485'));
// M486：设备管理看板（/equipment/board）
const EquipmentBoardM486Page = lazy(() => import('@/pages/equipment/board-m486'));
// M487：CSSD 消毒供应中心看板（/cssd/board）
const CssdBoardM487Page = lazy(() => import('@/pages/cssd/board-m487'));
// M488：病案首页质量看板（/emr/homepage-board）
const HomepageBoardM488Page = lazy(() => import('@/pages/emr/homepage-board-m488'));
// M489：医技科室运营看板（/medtech/board）
const MedtechBoardM489Page = lazy(() => import('@/pages/medtech/board-m489'));
// M465-D：病历质控知识图谱 V14（EMR 深化四模块，M465 收官）
const EmrQcGraphPage = lazy(() => import('@/pages/emr-qc-graph'));
// M466-A：病历打印版式与套打 V14（EMR 深化四模块）
const EmrPrintLayoutPage = lazy(() => import('@/pages/emr-print-layout'));
// M466-B：病历隐私脱敏展示 V14（EMR 深化四模块）
const EmrMaskingPage = lazy(() => import('@/pages/emr-masking'));
// M466-C：病历模板版本对比 V14（EMR 深化四模块）
const EmrTemplateDiffPage = lazy(() => import('@/pages/emr-template-diff'));
// M466-D：病历质控月度报告自动生成 V14（EMR 深化四模块，M466 收官）
const EmrMonthlyReportPage = lazy(() => import('@/pages/emr-monthly-report'));
// M467-A：病历质控规则引擎可视化对接 V14（EMR 深化四模块）
const EmrRuleEnginePage = lazy(() => import('@/pages/emr-rule-engine'));
// M467-B：病历 AI 辅助书写实时建议 V14（EMR 深化四模块）
const EmrAiAssistantPage = lazy(() => import('@/pages/emr-ai-assistant'));
// M467-C：病历质控追溯审计日志 V14（EMR 深化四模块）
const EmrQcAuditLogPage = lazy(() => import('@/pages/emr-qc-audit-log'));
// M467-D：病历质控培训考核模块 V14（EMR 深化四模块，M467 收官）
const EmrTrainingPage = lazy(() => import('@/pages/emr-training'));
// M468-A：病历质控指标体系大屏 V14（EMR 深化四模块）
const EmrQcDashboardPage = lazy(() => import('@/pages/emr-qc-dashboard'));
// M468-B：病历缺陷根因分析 V14（EMR 深化四模块）
const EmrRootCausePage = lazy(() => import('@/pages/emr-root-cause'));
// M468-C：病历模板使用统计 V14（EMR 深化四模块）
const EmrTemplateUsagePage = lazy(() => import('@/pages/emr-template-usage'));
// M468-D：病历质控 PDCA 循环管理 V14（EMR 深化四模块，M468 收官）
const EmrPdcaPage = lazy(() => import('@/pages/emr-pdca'));
// M469-A：病历质控指标预警阈值配置 V14（EMR 深化四模块）
const EmrAlertThresholdPage = lazy(() => import('@/pages/emr-alert-threshold'));
// M469-B：病历科室质控对比分析 V14（EMR 深化四模块）
const EmrDeptComparePage = lazy(() => import('@/pages/emr-dept-compare'));
// M469-C：病历书写规范知识库 V14（EMR 深化四模块）
const EmrWritingStandardPage = lazy(() => import('@/pages/emr-writing-standard'));
// M469-D：病历质控满意度调查 V14（EMR 深化四模块，M469 收官）
const EmrSatisfactionPage = lazy(() => import('@/pages/emr-satisfaction'));
// M470-A：病历质控指标趋势预测 V14（EMR 深化四模块）
const EmrTrendForecastPage = lazy(() => import('@/pages/emr-trend-forecast'));
// M470-B：病历科室质控排行榜 V14（EMR 深化四模块，-board 后缀避让）
const EmrQcRankingBoardPage = lazy(() => import('@/pages/emr-qc-ranking-board'));
// M470-C：病历缺陷自动分类 V14（EMR 深化四模块）
const EmrDefectClassifierPage = lazy(() => import('@/pages/emr-defect-classifier'));
// M470-D：病历质控智能报表 V14（EMR 深化四模块，M470 收官）
const EmrSmartReportPage = lazy(() => import('@/pages/emr-smart-report'));
// M471-A：病历质控整改工单管理 V14（EMR 深化四模块）
const EmrRectificationOrderPage = lazy(() => import('@/pages/emr-rectification-order'));
// M471-B：病历质控专家在线评审 V14（EMR 深化四模块）
const EmrExpertReviewPage = lazy(() => import('@/pages/emr-expert-review'));
// M471-C：病历质控指标对标分析 V14（EMR 深化四模块）
const EmrBenchmarkPage = lazy(() => import('@/pages/emr-benchmark'));
// M471-D：病历质控年度总结报告 V14（EMR 深化四模块，M471 收官）
const EmrAnnualReportPage = lazy(() => import('@/pages/emr-annual-report'));
// M472-A：病历质控指标字典管理 V14（EMR 深化四模块）
const EmrIndicatorDictPage = lazy(() => import('@/pages/emr-indicator-dict'));
// M472-B：病历质控规则版本管理 V14（EMR 深化四模块）
const EmrRuleVersionPage = lazy(() => import('@/pages/emr-rule-version'));
// M472-C：病历质控通知公告 V14（EMR 深化四模块）
const EmrQcNoticePage = lazy(() => import('@/pages/emr-qc-notice'));
// M472-D：病历质控数据导出中心 V14（EMR 深化四模块，M472 收官）
const EmrDataExportPage = lazy(() => import('@/pages/emr-data-export'));
// M473-A：病历质控数据字典管理 V14（EMR 深化四模块）
const EmrDataDictPage = lazy(() => import('@/pages/emr-data-dict'));
// M473-B：病历质控权限管理 V14（EMR 深化四模块）
const EmrQcPermissionPage = lazy(() => import('@/pages/emr-qc-permission'));
// M473-C：病历质控操作日志 V14（EMR 深化四模块）
const EmrQcOpLogPage = lazy(() => import('@/pages/emr-qc-op-log'));
// M473-D：病历质控系统配置 V14（EMR 深化四模块，M473 收官）
const EmrQcConfigPage = lazy(() => import('@/pages/emr-qc-config'));
// M474-A：病历质控质控员工作台 V14（-desk 后缀避让 M463-D emrQcWorkbenchV14）
const EmrQcWorkbenchDeskPage = lazy(() => import('@/pages/emr-qc-workbench-desk'));
// M474-B：病历质控科室自查 V14（EMR 深化四模块）
const EmrDeptSelfCheckPage = lazy(() => import('@/pages/emr-dept-self-check'));
// M474-C：病历质控专家库管理 V14（EMR 深化四模块）
const EmrQcExpertPoolPage = lazy(() => import('@/pages/emr-qc-expert-pool'));
// M474-D：病历质控质量监控大盘 V14（EMR 深化四模块，M474 收官）
const EmrQcMonitorBoardPage = lazy(() => import('@/pages/emr-qc-monitor-board'));
// M475-A：病历质控指标趋势预警 V14（EMR 深化四模块）
const EmrQcTrendAlertPage = lazy(() => import('@/pages/emr-qc-trend-alert'));
// M475-B：病历质控科室质量报告 V14（EMR 深化四模块）
const EmrDeptQcReportPage = lazy(() => import('@/pages/emr-dept-qc-report'));
// M475-C：病历质控患者满意度 V14（EMR 深化四模块）
const EmrPatientSatisfactionPage = lazy(() => import('@/pages/emr-patient-satisfaction'));
// M475-D：病历质控知识库 V14（EMR 深化四模块，M475 收官）
const EmrQcKnowledgePage = lazy(() => import('@/pages/emr-qc-knowledge'));
// M476-A：病历完整性检查 V14（EMR 深化四模块，病历四大检查系列①完整性）
const EmrCompletenessCheckPage = lazy(() => import('@/pages/emr-completeness-check'));
// M476-B：病历一致性检查 V14（EMR 深化四模块，病历四大检查系列②一致性）
const EmrConsistencyCheckPage = lazy(() => import('@/pages/emr-consistency-check'));
// M476-C：病历时效性检查 V14（EMR 深化四模块，病历四大检查系列③时效性）
const EmrTimelinessCheckPage = lazy(() => import('@/pages/emr-timeliness-check'));
// M476-D：病历规范性检查 V14（EMR 深化四模块，病历四大检查系列④规范性，M476 收官）
const EmrNormativityCheckPage = lazy(() => import('@/pages/emr-normativity-check'));
// M477-A：病历内涵质控 V14（EMR 深化四模块）
const EmrIntrinsicQcPage = lazy(() => import('@/pages/emr-intrinsic-qc'));
// M477-B：病历逻辑校验 V14（EMR 深化四模块）
const EmrLogicValidationPage = lazy(() => import('@/pages/emr-logic-validation'));
// M477-C：病历术语规范 V14（EMR 深化四模块）
const EmrTerminologyPage = lazy(() => import('@/pages/emr-terminology'));
// M477-D：病历模板质控联动 V14（EMR 深化四模块，M477 收官）
const EmrTemplateQcLinkPage = lazy(() => import('@/pages/emr-template-qc-link'));
// M478-A：病历审核工作流 V14（EMR 深化四模块）
const EmrReviewWorkflowPage = lazy(() => import('@/pages/emr-review-workflow'));
// M478-B：病历归档规则 V14（EMR 深化四模块）
const EmrArchiveRulePage = lazy(() => import('@/pages/emr-archive-rule'));
// M478-C：病历打印规范 V14（EMR 深化四模块）
const EmrPrintSpecPage = lazy(() => import('@/pages/emr-print-spec'));
// M478-D：病历质控报表中心 V14（EMR 深化四模块，M478 收官）
const EmrQcReportCenterPage = lazy(() => import('@/pages/emr-qc-report-center'));
// M479-A：病历质控评分模型 V14（EMR 深化四模块）
const EmrQcScoreModelPage = lazy(() => import('@/pages/emr-qc-score-model'));
// M479-B：病历质控权重配置 V14（EMR 深化四模块）
const EmrQcWeightConfigPage = lazy(() => import('@/pages/emr-qc-weight-config'));
// M479-C：病历质控等级评定 V14（EMR 深化四模块）
const EmrQcGradePage = lazy(() => import('@/pages/emr-qc-grade'));
// M479-D：病历质控持续改进 V14（EMR 深化四模块，M479 收官）
const EmrQcContinuousImprovePage = lazy(() => import('@/pages/emr-qc-continuous-improve'));
// M480-A：DRG 病案质控 V14（EMR 深化四模块）
const EmrDrgQcPage = lazy(() => import('@/pages/emr-drg-qc'));
// M480-B：临床路径质控 V14（EMR 深化四模块）
const EmrClinicalPathQcPage = lazy(() => import('@/pages/emr-clinical-path-qc'));
// M480-C：病案首页质控 V14（EMR 深化四模块）
const EmrFrontPageQcPage = lazy(() => import('@/pages/emr-front-page-qc'));
// M480-D：终末质控 V14（EMR 深化四模块，M480 收官）
const EmrTerminalQcPage = lazy(() => import('@/pages/emr-terminal-qc'));
// M481-A：运行病历质控 V14（EMR 深化四模块）
const EmrRunningQcPage = lazy(() => import('@/pages/emr-running-qc'));
// M481-B：环节质控 V14（EMR 深化四模块）
const EmrStageQcPage = lazy(() => import('@/pages/emr-stage-qc'));
// M481-C：出院病历质控 V14（EMR 深化四模块）
const EmrDischargeQcPage = lazy(() => import('@/pages/emr-discharge-qc'));
// M481-D：病历质量评分汇总 V14（EMR 深化四模块，M481 收官，-summary 避让 M465-B）
const EmrQualityScoreSummaryPage = lazy(() => import('@/pages/emr-quality-score-summary'));
// M482-A：病历复印申请 V14（EMR 深化四模块）
const EmrCopyRequestPage = lazy(() => import('@/pages/emr-copy-request'));
// M482-B：病历借阅登记 V14（EMR 深化四模块）
const EmrBorrowRegisterPage = lazy(() => import('@/pages/emr-borrow-register'));
// M482-C：病历封存解封 V14（EMR 深化四模块）
const EmrSealUnsealPage = lazy(() => import('@/pages/emr-seal-unseal'));
// M482-D：病历销毁记录 V14（EMR 深化四模块，M482 收官）
const EmrDestroyRecordPage = lazy(() => import('@/pages/emr-destroy-record'));
// M483-A：质控指标采集 V14（EMR 深化四模块，质控指标系列）
const EmrQcMetricCollectPage = lazy(() => import('@/pages/emr-qc-metric-collect'));
// M483-B：质控指标计算 V14（EMR 深化四模块，质控指标系列）
const EmrQcMetricCalcPage = lazy(() => import('@/pages/emr-qc-metric-calc'));
// M483-C：质控指标预警 V14（EMR 深化四模块，质控指标系列）
const EmrQcMetricAlertPage = lazy(() => import('@/pages/emr-qc-metric-alert'));
// M483-D：质控指标分析 V14（EMR 深化四模块，M483 收官）
const EmrQcMetricAnalysisPage = lazy(() => import('@/pages/emr-qc-metric-analysis'));
// M484-A（新规格）：质控指标看板 V14（EMR 深化四模块）
const EmrQcMetricDashboardPage = lazy(() => import('@/pages/emr-qc-metric-dashboard'));
// M484-B（新规格）：质控指标对标 V14（EMR 深化四模块）
const EmrQcMetricBenchmarkPage = lazy(() => import('@/pages/emr-qc-metric-benchmark'));
// M484-C（新规格）：质控指标钻取 V14（EMR 深化四模块）
const EmrQcMetricDrilldownPage = lazy(() => import('@/pages/emr-qc-metric-drilldown'));
// M484-D（新规格）：质控指标导出 V14（EMR 深化四模块，M484 收官）
const EmrQcMetricExportPage = lazy(() => import('@/pages/emr-qc-metric-export'));
// M485-A：病历书写规范检查 V14（EMR 深化四模块）
const EmrWritingStandardCheckPage = lazy(() => import('@/pages/emr-writing-standard-check'));
// M485-B：病历逻辑关系检查 V14（EMR 深化四模块）
const EmrLogicRelationCheckPage = lazy(() => import('@/pages/emr-logic-relation-check'));
// M485-C：病历术语规范检查 V14（EMR 深化四模块）
const EmrTerminologyCheckPage = lazy(() => import('@/pages/emr-terminology-check'));
// M485-D：病历时效合规检查 V14（EMR 深化四模块，M485 收官）
const EmrTimelinessCompliancePage = lazy(() => import('@/pages/emr-timeliness-compliance'));
// M486-A：AI 病历摘要生成 V14（EMR 深化四模块）
const EmrAiSummaryPage = lazy(() => import('@/pages/emr-ai-summary'));
// M486-B：AI 病历关键词提取 V14（EMR 深化四模块）
const EmrAiKeywordPage = lazy(() => import('@/pages/emr-ai-keyword'));
// M486-C：AI 病历风险预测 V14（EMR 深化四模块）
const EmrAiRiskPredictPage = lazy(() => import('@/pages/emr-ai-risk-predict'));
// M486-D：AI 病历相似病历推荐 V14（EMR 深化四模块，M486 收官）
const EmrAiSimilarPage = lazy(() => import('@/pages/emr-ai-similar'));
// M487-A：质控日报 V14（EMR 深化四模块）
const EmrQcDailyReportPage = lazy(() => import('@/pages/emr-qc-daily-report'));
// M487-B：质控周报 V14（EMR 深化四模块）
const EmrQcWeeklyReportPage = lazy(() => import('@/pages/emr-qc-weekly-report'));
// M487-C：质控季报 V14（EMR 深化四模块）
const EmrQcQuarterlyReportPage = lazy(() => import('@/pages/emr-qc-quarterly-report'));
// M487-D：质控年报 V14（EMR 深化四模块，M487 收官）
const EmrQcAnnualReportPage = lazy(() => import('@/pages/emr-qc-annual-report'));
// M488-A：质控任务派发 V14（EMR 深化四模块）
const EmrQcTaskDispatchPage = lazy(() => import('@/pages/emr-qc-task-dispatch'));
// M488-B：质控任务签收 V14（EMR 深化四模块）
const EmrQcTaskReceivePage = lazy(() => import('@/pages/emr-qc-task-receive'));
// M488-C：质控任务退回 V14（EMR 深化四模块）
const EmrQcTaskReturnPage = lazy(() => import('@/pages/emr-qc-task-return'));
// M488-D：质控任务归档 V14（EMR 深化四模块，M488 收官）
const EmrQcTaskArchivePage = lazy(() => import('@/pages/emr-qc-task-archive'));
// M489-A：质控知识节点管理 V14（EMR 深化四模块）
const EmrQcKnowledgeNodePage = lazy(() => import('@/pages/emr-qc-knowledge-node'));
// M489-B：质控知识关系管理 V14（EMR 深化四模块）
const EmrQcKnowledgeRelationPage = lazy(() => import('@/pages/emr-qc-knowledge-relation'));
// M489-C：质控知识推理路径 V14（EMR 深化四模块）
const EmrQcReasoningPathPage = lazy(() => import('@/pages/emr-qc-reasoning-path'));
// M489-D：质控知识置信度评估 V14（EMR 深化四模块，M489 收官）
const EmrQcConfidencePage = lazy(() => import('@/pages/emr-qc-confidence'));
// M490-A：NLP 病历实体识别 V14（EMR 深化四模块）
const EmrNlpEntityPage = lazy(() => import('@/pages/emr-nlp-entity'));
// M490-B：NLP 病历关系抽取 V14（EMR 深化四模块）
const EmrNlpRelationPage = lazy(() => import('@/pages/emr-nlp-relation'));
// M490-C：NLP 病历事件提取 V14（EMR 深化四模块）
const EmrNlpEventPage = lazy(() => import('@/pages/emr-nlp-event'));
// M490-D：NLP 病历时间线构建 V14（EMR 深化四模块，M490 收官）
const EmrNlpTimelinePage = lazy(() => import('@/pages/emr-nlp-timeline'));
// M491-A：NLP 病历纠错 V14（EMR 深化四模块）
const EmrNlpCorrectionPage = lazy(() => import('@/pages/emr-nlp-correction'));
// M491-B：NLP 病历标准化 V14（EMR 深化四模块）
const EmrNlpNormalizationPage = lazy(() => import('@/pages/emr-nlp-normalization'));
// M491-C：NLP 病历去重 V14（EMR 深化四模块）
const EmrNlpDeduplicationPage = lazy(() => import('@/pages/emr-nlp-deduplication'));
// M491-D：NLP 病历相似度计算 V14（EMR 深化四模块，M491 收官）
const EmrNlpSimilarityPage = lazy(() => import('@/pages/emr-nlp-similarity'));
// M492-A：质控评分规则配置 V14（EMR 深化四模块）
const EmrQcScoreRulePage = lazy(() => import('@/pages/emr-qc-score-rule'));
// M492-B：质控评分自动计算 V14（EMR 深化四模块）
const EmrQcScoreCalcPage = lazy(() => import('@/pages/emr-qc-score-calc'));
// M492-C：质控评分历史对比 V14（EMR 深化四模块）
const EmrQcScoreHistoryPage = lazy(() => import('@/pages/emr-qc-score-history'));
// M492-D：质控评分改进建议 V14（EMR 深化四模块，M492 收官）
const EmrQcScoreSuggestionPage = lazy(() => import('@/pages/emr-qc-score-suggestion'));
// M493-A：质控科室看板 V14（EMR 深化四模块）
const EmrQcDeptDashboardPage = lazy(() => import('@/pages/emr-qc-dept-dashboard'));
// M493-B：质控科室对比 V14（EMR 深化四模块）
const EmrQcDeptComparePage = lazy(() => import('@/pages/emr-qc-dept-compare'));
// M493-C：质控科室排名 V14（EMR 深化四模块）
const EmrQcDeptRankingPage = lazy(() => import('@/pages/emr-qc-dept-ranking'));
// M493-D：质控科室整改跟踪 V14（EMR 深化四模块，M493 收官）
const EmrQcDeptRectifyPage = lazy(() => import('@/pages/emr-qc-dept-rectify'));
// M494-A：质控医生评分 V14（EMR 深化四模块）
const EmrQcDoctorScorePage = lazy(() => import('@/pages/emr-qc-doctor-score'));
// M494-B：质控护士评分 V14（EMR 深化四模块）
const EmrQcNurseScorePage = lazy(() => import('@/pages/emr-qc-nurse-score'));
// M494-C：质控科室主任评分 V14（EMR 深化四模块）
const EmrQcDirectorScorePage = lazy(() => import('@/pages/emr-qc-director-score'));
// M494-D：质控全院人员排名 V14（EMR 深化四模块，M494 收官）
const EmrQcStaffRankingPage = lazy(() => import('@/pages/emr-qc-staff-ranking'));
// M495-A：质控缺陷趋势预测 V14（EMR 深化四模块）
const EmrQcTrendForecastPage = lazy(() => import('@/pages/emr-qc-trend-forecast'));
// M495-B：质控科室预警阈值 V14（EMR 深化四模块）
const EmrQcAlertThresholdPage = lazy(() => import('@/pages/emr-qc-alert-threshold'));
// M495-C：质控风险等级评估 V14（EMR 深化四模块）
const EmrQcRiskLevelPage = lazy(() => import('@/pages/emr-qc-risk-level'));
// M495-D：质控干预建议生成 V14（EMR 深化四模块，M495 收官）
const EmrQcInterventionPage = lazy(() => import('@/pages/emr-qc-intervention'));
// M496-A：质控问题反馈闭环 V14（EMR 深化四模块）
const EmrQcFeedbackLoopPage = lazy(() => import('@/pages/emr-qc-feedback-loop'));
// M496-B：质控整改验证 V14（EMR 深化四模块）
const EmrQcRectifyVerifyPage = lazy(() => import('@/pages/emr-qc-rectify-verify'));
// M496-C：质控复发预警 V14（EMR 深化四模块）
const EmrQcRecurrencePage = lazy(() => import('@/pages/emr-qc-recurrence'));
// M496-D：质控 PDCA 闭环报告 V14（EMR 深化四模块，M496 收官）
const EmrQcPdcaReportPage = lazy(() => import('@/pages/emr-qc-pdca-report'));
// M497-A：质控数据导出 Excel V14（EMR 深化四模块）
const EmrQcExportExcelPage = lazy(() => import('@/pages/emr-qc-export-excel'));
// M497-B：质控数据导出 PDF V14（EMR 深化四模块）
const EmrQcExportPdfPage = lazy(() => import('@/pages/emr-qc-export-pdf'));
// M497-C：质控数据导出 CSV V14（EMR 深化四模块）
const EmrQcExportCsvPage = lazy(() => import('@/pages/emr-qc-export-csv'));
// M497-D：质控数据导出区域上报 V14（EMR 深化四模块，M497 收官）
const EmrQcExportRegionPage = lazy(() => import('@/pages/emr-qc-export-region'));
// M498-A：质控系统参数配置 V14（EMR 深化四模块）
const EmrQcSysParamPage = lazy(() => import('@/pages/emr-qc-sys-param'));
// M498-B：质控操作日志审计记录 V14（EMR 深化四模块，避让 M467-C emr-qc-audit-log）
const EmrQcAuditLogRecordPage = lazy(() => import('@/pages/emr-qc-audit-log-record'));
// M498-C：质控数据字典管理 V14（EMR 深化四模块）
const EmrQcDataDictPage = lazy(() => import('@/pages/emr-qc-data-dict'));
// M498-D：质控权限管理 V14（EMR 深化四模块，M498 收官，避让 M473-B emr-qc-permission）
const EmrQcPermissionManagePage = lazy(() => import('@/pages/emr-qc-permission-manage'));
// M499-A：质控 AI 缺陷自动分类 V14（EMR 深化四模块）
const EmrQcAiDefectClassifyPage = lazy(() => import('@/pages/emr-qc-ai-defect-classify'));
// M499-B：质控 AI 书写建议 V14（EMR 深化四模块）
const EmrQcAiWritingSuggestPage = lazy(() => import('@/pages/emr-qc-ai-writing-suggest'));
// M499-C：质控 AI 相似病历推荐 V14（EMR 深化四模块）
const EmrQcAiSimilarRecordPage = lazy(() => import('@/pages/emr-qc-ai-similar-record'));
// M499-D：质控 AI 知识问答 V14（EMR 深化四模块，M499 收官）
const EmrQcAiQaPage = lazy(() => import('@/pages/emr-qc-ai-qa'));
// M500-A：质控缺陷统计 V14（EMR 深化四模块，里程碑批次）
const EmrQcDefectStatPage = lazy(() => import('@/pages/emr-qc-defect-stat'));
// M500-B：质控合格率统计 V14（EMR 深化四模块，里程碑批次）
const EmrQcPassRateStatPage = lazy(() => import('@/pages/emr-qc-pass-rate-stat'));
// M500-C：质控时效统计 V14（EMR 深化四模块，里程碑批次）
const EmrQcTimelinessStatPage = lazy(() => import('@/pages/emr-qc-timeliness-stat'));
// M500-D：质控综合统计大屏 V14（EMR 深化四模块，M500 收官里程碑）
const EmrQcStatDashboardPage = lazy(() => import('@/pages/emr-qc-stat-dashboard'));
// M501-A：质控科室对比分析 V14（EMR 深化四模块）
const EmrQcDeptCompareAnalysisPage = lazy(() => import('@/pages/emr-qc-dept-compare-analysis'));
// M501-B：质控科室趋势分析 V14（EMR 深化四模块）
const EmrQcDeptTrendAnalysisPage = lazy(() => import('@/pages/emr-qc-dept-trend-analysis'));
// M501-C：质控科室改进建议 V14（EMR 深化四模块）
const EmrQcDeptImproveSuggestPage = lazy(() => import('@/pages/emr-qc-dept-improve-suggest'));
// M501-D：质控科室考核评分 V14（EMR 深化四模块，M501 收官）
const EmrQcDeptAssessScorePage = lazy(() => import('@/pages/emr-qc-dept-assess-score'));
// M502-A：质控专家库管理 V14（EMR 深化四模块）
const EmrQcExpertLibraryPage = lazy(() => import('@/pages/emr-qc-expert-library'));
// M502-B：质控专家在线评审 V14（EMR 深化四模块）
const EmrQcExpertOnlineReviewPage = lazy(() => import('@/pages/emr-qc-expert-online-review'));
// M502-C：质控评审意见汇总 V14（EMR 深化四模块）
const EmrQcReviewSummaryPage = lazy(() => import('@/pages/emr-qc-review-summary'));
// M502-D：质控专家绩效统计 V14（EMR 深化四模块，M502 收官）
const EmrQcExpertPerformancePage = lazy(() => import('@/pages/emr-qc-expert-performance'));
// M503-A：质控培训课程管理 V14（EMR 深化四模块）
const EmrQcTrainingCoursePage = lazy(() => import('@/pages/emr-qc-training-course'));
// M503-B：质控在线考试 V14（EMR 深化四模块）
const EmrQcOnlineExamPage = lazy(() => import('@/pages/emr-qc-online-exam'));
// M503-C：质控考核证书 V14（EMR 深化四模块）
const EmrQcExamCertificatePage = lazy(() => import('@/pages/emr-qc-exam-certificate'));
// M503-D：质控培训记录 V14（EMR 深化四模块，M503 收官）
const EmrQcTrainingRecordPage = lazy(() => import('@/pages/emr-qc-training-record'));
// M504-A：质控 PDCA 改进计划 V14（EMR 深化四模块）
const EmrQcPdcaPlanPage = lazy(() => import('@/pages/emr-qc-pdca-plan'));
// M504-B：质控质量改进项目 V14（EMR 深化四模块）
const EmrQcQualityProjectPage = lazy(() => import('@/pages/emr-qc-quality-project'));
// M504-C：质控标杆管理 V14（EMR 深化四模块）
const EmrQcBenchmarkingPage = lazy(() => import('@/pages/emr-qc-benchmarking'));
// M504-D：质控患者满意度调查 V14（EMR 深化四模块，M504 收官）
const EmrQcPatientSatisfactionPage = lazy(() => import('@/pages/emr-qc-patient-satisfaction'));
// M505-A：质控规范库管理 V14（EMR 深化四模块）
const EmrQcNormLibraryPage = lazy(() => import('@/pages/emr-qc-norm-library'));
// M505-B：质控制度查询 V14（EMR 深化四模块）
const EmrQcPolicyQueryPage = lazy(() => import('@/pages/emr-qc-policy-query'));
// M505-C：质控指南库 V14（EMR 深化四模块）
const EmrQcGuidelineLibraryPage = lazy(() => import('@/pages/emr-qc-guideline-library'));
// M505-D：质控法律法规 V14（EMR 深化四模块，M505 收官）
const EmrQcRegulationPage = lazy(() => import('@/pages/emr-qc-regulation'));
// M506-A：质控缺陷趋势图 V14（EMR 深化四模块）
const EmrQcDefectTrendChartPage = lazy(() => import('@/pages/emr-qc-defect-trend-chart'));
// M506-B：质控科室对比雷达图 V14（EMR 深化四模块）
const EmrQcDeptRadarChartPage = lazy(() => import('@/pages/emr-qc-dept-radar-chart'));
// M506-C：质控月度报表 V14（EMR 深化四模块）
const EmrQcMonthlyReportPage = lazy(() => import('@/pages/emr-qc-monthly-report'));
// M506-D：质控年度总结报告 V14（EMR 深化四模块，M506 收官）
const EmrQcAnnualSummaryReportPage = lazy(() => import('@/pages/emr-qc-annual-summary-report'));
// M507-A：质控系统参数配置明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcSysParamDetailPage = lazy(() => import('@/pages/emr-qc-sys-param-detail'));
// M507-B：质控操作日志查询明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcAuditLogDetailPage = lazy(() => import('@/pages/emr-qc-audit-log-detail'));
// M507-C：质控数据字典管理明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcDataDictDetailPage = lazy(() => import('@/pages/emr-qc-data-dict-detail'));
// M507-D：质控权限管理明细 V14（EMR 深化四模块，M507 收官，-detail 避让）
const EmrQcPermissionDetailPage = lazy(() => import('@/pages/emr-qc-permission-detail'));
// M508-A：质控 AI 缺陷自动分类明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcAiDefectClassifyDetailPage = lazy(() => import('@/pages/emr-qc-ai-defect-classify-detail'));
// M508-B：质控 AI 辅助书写建议明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcAiWritingSuggestDetailPage = lazy(() => import('@/pages/emr-qc-ai-writing-suggest-detail'));
// M508-C：质控 AI 相似病历推荐明细 V14（EMR 深化四模块，-detail 避让）
const EmrQcAiSimilarRecordDetailPage = lazy(() => import('@/pages/emr-qc-ai-similar-record-detail'));
// M508-D：质控 AI 智能问答助手 V14（EMR 深化四模块，M508 收官）
const EmrQcAiQaAssistantPage = lazy(() => import('@/pages/emr-qc-ai-qa-assistant'));
// M509-A：质控内科专科规则 V14（EMR 深化四模块）
const EmrQcInternalMedRulesPage = lazy(() => import('@/pages/emr-qc-internal-med-rules'));
// M509-B：质控外科专科规则 V14（EMR 深化四模块）
const EmrQcSurgeryRulesPage = lazy(() => import('@/pages/emr-qc-surgery-rules'));
// M509-C：质控儿科专科规则 V14（EMR 深化四模块）
const EmrQcPediatricsRulesPage = lazy(() => import('@/pages/emr-qc-pediatrics-rules'));
// M509-D：质控妇产科专科规则 V14（EMR 深化四模块，M509 收官）
const EmrQcObgynRulesPage = lazy(() => import('@/pages/emr-qc-obgyn-rules'));
// M510-A：质控急诊专科规则 V14（EMR 深化四模块）
const EmrQcEmergencyRulesPage = lazy(() => import('@/pages/emr-qc-emergency-rules'));
// M510-B：质控重症医学科(ICU)专科规则 V14（EMR 深化四模块）
const EmrQcIcuRulesPage = lazy(() => import('@/pages/emr-qc-icu-rules'));
// M510-C：质控中医科专科规则 V14（EMR 深化四模块）
const EmrQcTcmRulesPage = lazy(() => import('@/pages/emr-qc-tcm-rules'));
// M510-D：质控康复科专科规则 V14（EMR 深化四模块，M510 收官）
const EmrQcRehabRulesPage = lazy(() => import('@/pages/emr-qc-rehab-rules'));
// M511-A：质控皮肤科专科规则 V14（EMR 深化四模块）
const EmrQcDermatologyRulesPage = lazy(() => import('@/pages/emr-qc-dermatology-rules'));
// M511-B：质控眼科专科规则 V14（EMR 深化四模块）
const EmrQcOphthalmologyRulesPage = lazy(() => import('@/pages/emr-qc-ophthalmology-rules'));
// M511-C：质控口腔科专科规则 V14（EMR 深化四模块）
const EmrQcDentistryRulesPage = lazy(() => import('@/pages/emr-qc-dentistry-rules'));
// M511-D：质控耳鼻喉科专科规则 V14（EMR 深化四模块，M511 收官）
const EmrQcEntRulesPage = lazy(() => import('@/pages/emr-qc-ent-rules'));
// M512-A：质控麻醉科专科规则 V14（EMR 深化四模块）
const EmrQcAnesthesiaRulesPage = lazy(() => import('@/pages/emr-qc-anesthesia-rules'));
// M512-B：质控病理科专科规则 V14（EMR 深化四模块）
const EmrQcPathologyRulesPage = lazy(() => import('@/pages/emr-qc-pathology-rules'));
// M512-C：质控营养科专科规则 V14（EMR 深化四模块）
const EmrQcNutritionRulesPage = lazy(() => import('@/pages/emr-qc-nutrition-rules'));
// M512-D：质控疼痛科专科规则 V14（EMR 深化四模块，M512 收官）
const EmrQcPainRulesPage = lazy(() => import('@/pages/emr-qc-pain-rules'));
// M513-A（新规格）：质控-电子签名联动 V14（EMR 深化四模块）
const EmrQcSignatureLinkPage = lazy(() => import('@/pages/emr-qc-signature-link'));
// M513-B：质控-医嘱联动 V14（EMR 深化四模块）
const EmrQcOrderLinkPage = lazy(() => import('@/pages/emr-qc-order-link'));
// M513-C：质控-护理记录联动 V14（EMR 深化四模块）
const EmrQcNursingLinkPage = lazy(() => import('@/pages/emr-qc-nursing-link'));
// M513-D：质控-手术麻醉联动 V14（EMR 深化四模块，M513 收官）
const EmrQcSurgeryLinkPage = lazy(() => import('@/pages/emr-qc-surgery-link'));
// M514-A：质控-检验检查联动 V14（EMR 深化四模块）
const EmrQcLabExamLinkPage = lazy(() => import('@/pages/emr-qc-lab-exam-link'));
// M514-B：质控-输血记录联动 V14（EMR 深化四模块）
const EmrQcTransfusionLinkPage = lazy(() => import('@/pages/emr-qc-transfusion-link'));
// M514-C：质控-临床路径联动 V14（EMR 深化四模块）
const EmrQcClinicalPathwayLinkPage = lazy(() => import('@/pages/emr-qc-clinical-pathway-link'));
// M514-D：质控-抗菌药物管理联动 V14（EMR 深化四模块，M514 收官）
const EmrQcAntibioticLinkPage = lazy(() => import('@/pages/emr-qc-antibiotic-link'));
// M515-A：质控-危急值联动 V14（EMR 深化四模块）
const EmrQcCriticalValueLinkPage = lazy(() => import('@/pages/emr-qc-critical-value-link'));
// M515-B：质控-VTE预防联动 V14（EMR 深化四模块）
const EmrQcVteLinkPage = lazy(() => import('@/pages/emr-qc-vte-link'));
// M515-C：质控-患者投诉联动 V14（EMR 深化四模块）
const EmrQcComplaintLinkPage = lazy(() => import('@/pages/emr-qc-complaint-link'));
// M515-D：质控-手术分级授权联动 V14（EMR 深化四模块，M515 收官）
const EmrQcSurgeryAuthLinkPage = lazy(() => import('@/pages/emr-qc-surgery-auth-link'));
// M516-A：质控-病案首页联动 V14（EMR 深化四模块）
const EmrQcHomepageLinkPage = lazy(() => import('@/pages/emr-qc-homepage-link'));
// M516-B：质控-出院小结联动 V14（EMR 深化四模块）
const EmrQcDischargeSummaryLinkPage = lazy(() => import('@/pages/emr-qc-discharge-summary-link'));
// M516-C：质控-转科记录联动 V14（EMR 深化四模块）
const EmrQcTransferLinkPage = lazy(() => import('@/pages/emr-qc-transfer-link'));
// M516-D：质控-会诊记录联动 V14（EMR 深化四模块，M516 收官）
const EmrQcConsultLinkPage = lazy(() => import('@/pages/emr-qc-consult-link'));
// M517-A：质控-护理评估单联动 V14（EMR 深化四模块）
const EmrQcNursingAssessmentLinkPage = lazy(() => import('@/pages/emr-qc-nursing-assessment-link'));
// M517-B：质控-疼痛评估联动 V14（EMR 深化四模块）
const EmrQcPainAssessmentLinkPage = lazy(() => import('@/pages/emr-qc-pain-assessment-link'));
// M517-C：质控-压疮风险评估联动 V14（EMR 深化四模块）
const EmrQcPressureUlcerLinkPage = lazy(() => import('@/pages/emr-qc-pressure-ulcer-link'));
// M517-D：质控-营养风险筛查联动 V14（EMR 深化四模块，M517 收官）
const EmrQcNutritionScreenLinkPage = lazy(() => import('@/pages/emr-qc-nutrition-screen-link'));
// M518-A：科室质控月报自动生成 V14（EMR 深化四模块，避让 -dept）
const EmrQcDeptMonthlyReportPage = lazy(() => import('@/pages/emr-qc-dept-monthly-report'));
// M518-B：个人质控档案自动生成 V14（EMR 深化四模块）
const EmrQcPersonalProfilePage = lazy(() => import('@/pages/emr-qc-personal-profile'));
// M518-C：质控整改通知单自动生成 V14（EMR 深化四模块）
const EmrQcRectificationNoticePage = lazy(() => import('@/pages/emr-qc-rectification-notice'));
// M518-D：质控PDCA报告自动生成 V14（EMR 深化四模块，M518 收官，避让 -auto）
const EmrQcPdcaReportAutoPage = lazy(() => import('@/pages/emr-qc-pdca-auto-report'));
// M519-A：质控规则可视化编辑器 V14（EMR 深化四模块）
const EmrQcRuleEditorPage = lazy(() => import('@/pages/emr-qc-rule-editor'));
// M519-B：质控规则版本管理 V14（EMR 深化四模块）
const EmrQcRuleVersionPage = lazy(() => import('@/pages/emr-qc-rule-version'));
// M519-C：质控规则模拟测试 V14（EMR 深化四模块）
const EmrQcRuleSimulatorPage = lazy(() => import('@/pages/emr-qc-rule-simulator'));
// M519-D：质控规则对比分析 V14（EMR 深化四模块，M519 收官）
const EmrQcRuleComparePage = lazy(() => import('@/pages/emr-qc-rule-compare'));
// M520-A：质控规则智能推荐 V14（EMR 深化四模块）
const EmrQcRuleRecommendationPage = lazy(() => import('@/pages/emr-qc-rule-recommendation'));
// M520-B：质控缺陷案例库 V14（EMR 深化四模块）
const EmrQcDefectCaseLibraryPage = lazy(() => import('@/pages/emr-qc-defect-case-library'));
// M520-C：质控行业标准库 V14（EMR 深化四模块）
const EmrQcStandardLibraryPage = lazy(() => import('@/pages/emr-qc-standard-library'));
// M520-D：质控最佳实践库 V14（EMR 深化四模块，M520 收官）
const EmrQcBestPracticePage = lazy(() => import('@/pages/emr-qc-best-practice'));
// M521-A：病历自动归档触发 V14（EMR 深化四模块）
const EmrQcAutoArchivePage = lazy(() => import('@/pages/emr-qc-auto-archive'));
// M521-B：病历质控自动派单 V14（EMR 深化四模块）
const EmrQcAutoDispatchPage = lazy(() => import('@/pages/emr-qc-auto-dispatch'));
// M521-C：病历缺陷自动分发 V14（EMR 深化四模块）
const EmrQcDefectAutoRoutePage = lazy(() => import('@/pages/emr-qc-defect-auto-route'));
// M521-D：病历整改自动跟踪 V14（EMR 深化四模块，M521 收官）
const EmrQcRectificationTrackingPage = lazy(() => import('@/pages/emr-qc-rectification-tracking'));
// M522-A：AI病历生成辅助 V14（EMR 深化四模块）
const EmrAiGenerationAssistPage = lazy(() => import('@/pages/emr-ai-generation-assist'));
// M522-B：AI病历质量预测 V14（EMR 深化四模块）
const EmrAiQualityPredictPage = lazy(() => import('@/pages/emr-ai-quality-predict'));
// M522-C：AI病历缺陷根因分析 V14（EMR 深化四模块）
const EmrAiDefectRootCausePage = lazy(() => import('@/pages/emr-ai-defect-root-cause'));
// M522-D：AI病历质控知识图谱推理 V14（EMR 深化四模块，M522 收官）
const EmrAiKGraphReasoningPage = lazy(() => import('@/pages/emr-ai-kgraph-reasoning'));
// M523-A：门诊病历模板库 V14（EMR 深化四模块）
const EmrTemplateOutpatientLibraryPage = lazy(() => import('@/pages/emr-template-outpatient-library'));
// M523-B：入院记录模板细化 V14（EMR 深化四模块）
const EmrTemplateAdmissionDetailPage = lazy(() => import('@/pages/emr-template-admission-detail'));
// M523-C：手术记录模板规范 V14（EMR 深化四模块）
const EmrTemplateSurgerySpecPage = lazy(() => import('@/pages/emr-template-surgery-spec'));
// M523-D：出院小结模板标准化 V14（EMR 深化四模块，M523 收官）
const EmrTemplateDischargeStdPage = lazy(() => import('@/pages/emr-template-discharge-std'));
// M524-A：模板版本对比 V14（EMR 深化四模块）
const EmrTemplateVersionComparePage = lazy(() => import('@/pages/emr-template-version-compare'));
// M524-B：模板科室个性化 V14（EMR 深化四模块）
const EmrTemplateDeptPersonalPage = lazy(() => import('@/pages/emr-template-dept-personal'));
// M524-C：模板医生个人偏好 V14（EMR 深化四模块）
const EmrTemplateDoctorPrefPage = lazy(() => import('@/pages/emr-template-doctor-pref'));
// M524-D：模板审批流程 V14（EMR 深化四模块，M524 收官）
const EmrTemplateApprovalPage = lazy(() => import('@/pages/emr-template-approval'));
// M525-A：临床路径模板联动 V14（EMR 深化四模块）
const EmrTemplateClinicalPathPage = lazy(() => import('@/pages/emr-template-clinical-path'));
// M525-B：病种模板智能推荐 V14（EMR 深化四模块）
const EmrTemplateDiseaseRecommendPage = lazy(() => import('@/pages/emr-template-disease-recommend'));
// M525-C：模板使用统计分析 V14（EMR 深化四模块）
const EmrTemplateUsageStatsPage = lazy(() => import('@/pages/emr-template-usage-stats'));
// M525-D：模板效果评估 V14（EMR 深化四模块，M525 收官）
const EmrTemplateEffectEvalPage = lazy(() => import('@/pages/emr-template-effect-eval'));
// M526-A：质控移动端审批 V14（EMR 深化四模块）
const EmrQcMobileApprovalPage = lazy(() => import('@/pages/emr-qc-mobile-approval'));
// M526-B：质控移动端查看 V14（EMR 深化四模块）
const EmrQcMobileViewPage = lazy(() => import('@/pages/emr-qc-mobile-view'));
// M526-C：质控移动端通知 V14（EMR 深化四模块）
const EmrQcMobileNotifyPage = lazy(() => import('@/pages/emr-qc-mobile-notify'));
// M526-D：质控移动端整改 V14（EMR 深化四模块，M526 收官）
const EmrQcMobileRectifyPage = lazy(() => import('@/pages/emr-qc-mobile-rectify'));
// M527-A：病历书写时限管控 V14（EMR 深化四模块）
const EmrWritingTimeLimitPage = lazy(() => import('@/pages/emr-writing-time-limit'));
// M527-B：病历终末质控评分 V14（EMR 深化四模块）
const EmrFinalQcScorePage = lazy(() => import('@/pages/emr-final-qc-score'));
// M527-C：病历归档自动检查 V14（EMR 深化四模块）
const EmrArchiveAutoCheckPage = lazy(() => import('@/pages/emr-archive-auto-check'));
// M527-D：病历缺陷闭环跟踪 V14（EMR 深化四模块，M527 收官）
const EmrDefectClosedLoopPage = lazy(() => import('@/pages/emr-defect-closed-loop'));
// M528-A：病历访问审计日志 V14（EMR 深化四模块）
const EmrAccessAuditPage = lazy(() => import('@/pages/emr-access-audit'));
// M528-B：病历脱敏输出 V14（EMR 深化四模块）
const EmrDeidentifyOutputPage = lazy(() => import('@/pages/emr-deidentify-output'));
// M528-C：病历水印追踪 V14（EMR 深化四模块）
const EmrWatermarkTracePage = lazy(() => import('@/pages/emr-watermark-trace'));
// M528-D：病历权限细粒度控制 V14（EMR 深化四模块，M528 收官）
const EmrFineGrainedAuthPage = lazy(() => import('@/pages/emr-fine-grained-auth'));
// M529-A：病历主诉结构化提取 V14（EMR 深化四模块）
const EmrChiefComplaintNlpPage = lazy(() => import('@/pages/emr-chief-complaint-nlp'));
// M529-B：病历现病史结构化提取 V14（EMR 深化四模块）
const EmrHpiNlpPage = lazy(() => import('@/pages/emr-hpi-nlp'));
// M529-C：病历诊断自动提取 V14（EMR 深化四模块）
const EmrDiagnosisNlpPage = lazy(() => import('@/pages/emr-diagnosis-nlp'));
// M529-D：病历用药自动提取 V14（EMR 深化四模块，M529 收官）
const EmrMedicationNlpPage = lazy(() => import('@/pages/emr-medication-nlp'));
// M530-A：病历既往史 NLP 提取 V14（EMR 深化四模块）
const EmrPastHistoryNlpPage = lazy(() => import('@/pages/emr-past-history-nlp'));
// M530-B：病历过敏史 NLP 提取 V14（EMR 深化四模块）
const EmrAllergyHistoryNlpPage = lazy(() => import('@/pages/emr-allergy-history-nlp'));
// M530-C：病历体格检查 NLP 提取 V14（EMR 深化四模块）
const EmrPhysicalExamNlpPage = lazy(() => import('@/pages/emr-physical-exam-nlp'));
// M530-D：病历辅助检查 NLP 提取 V14（EMR 深化四模块，M530 收官）
const EmrLabExamNlpPage = lazy(() => import('@/pages/emr-lab-exam-nlp'));
// M531-A：病历 NLP 实体归一化 V14（EMR 深化四模块）
const EmrNlpEntityNormalizePage = lazy(() => import('@/pages/emr-nlp-entity-normalize'));
// M531-B：病历 NLP 术语标准化 V14（EMR 深化四模块）
const EmrNlpTermStandardizePage = lazy(() => import('@/pages/emr-nlp-term-standardize'));
// M531-C：病历 NLP 时间关系提取 V14（EMR 深化四模块）
const EmrNlpTimeRelationPage = lazy(() => import('@/pages/emr-nlp-time-relation'));
// M531-D：病历 NLP 否定检测 V14（EMR 深化四模块，M531 收官）
const EmrNlpNegationDetectPage = lazy(() => import('@/pages/emr-nlp-negation-detect'));
// M532-A：病历结构化字段查询 V14（EMR 深化四模块）
const EmrStructQueryPage = lazy(() => import('@/pages/emr-struct-query'));
// M532-B：病历结构化数据导出 V14（EMR 深化四模块）
const EmrStructExportPage = lazy(() => import('@/pages/emr-struct-export'));
// M532-C：病历结构化数据统计 V14（EMR 深化四模块）
const EmrStructStatsPage = lazy(() => import('@/pages/emr-struct-stats'));
// M532-D：病历结构化数据对比 V14（EMR 深化四模块，M532 收官）
const EmrStructComparePage = lazy(() => import('@/pages/emr-struct-compare'));
// M533-A：病历自动归档检查 V14（EMR 深化四模块）
const EmrArchiveCheckPage = lazy(() => import('@/pages/emr-archive-check'));
// M533-B：病历归档完整性校验 V14（EMR 深化四模块）
const EmrArchiveIntegrityPage = lazy(() => import('@/pages/emr-archive-integrity'));
// M533-C：病历归档索引 V14（EMR 深化四模块）
const EmrArchiveIndexPage = lazy(() => import('@/pages/emr-archive-index'));
// M533-D：病历归档检索 V14（EMR 深化四模块，M533 收官）
const EmrArchiveSearchPage = lazy(() => import('@/pages/emr-archive-search'));
// M534-A：病历调阅申请审批 V14（EMR 深化四模块）
const EmrAccessRequestPage = lazy(() => import('@/pages/emr-access-request'));
// M534-B：病历调阅日志审计 V14（EMR 深化四模块，避让 M528-A EmrAccessAuditPage）
const EmrAccessAuditLogPage = lazy(() => import('@/pages/emr-access-audit-log'));
// M534-C：病历复印申请管理 V14（EMR 深化四模块，避让旧 EmrCopyRequestPage）
const EmrCopyRequestManagePage = lazy(() => import('@/pages/emr-copy-request-manage'));
// M534-D：病历借阅归还管理 V14（EMR 深化四模块，M534 收官）
const EmrLoanReturnPage = lazy(() => import('@/pages/emr-loan-return'));
// M535-A：病案首页完整性校验 V14（EMR 深化四模块）
const EmrHomepageCompletePage = lazy(() => import('@/pages/emr-homepage-complete'));
// M535-B：病案首页逻辑校验 V14（EMR 深化四模块）
const EmrHomepageLogicPage = lazy(() => import('@/pages/emr-homepage-logic'));
// M535-C：DRG入组预测 V14（EMR 深化四模块）
const EmrDrgPredictPage = lazy(() => import('@/pages/emr-drg-predict'));
// M535-D：DIP分值预测 V14（EMR 深化四模块）
const EmrDipPredictPage = lazy(() => import('@/pages/emr-dip-predict'));
// M536-A：病历质量综合评分 V14（EMR 深化四模块，避让 M465-B -comprehensive）
const EmrQualityScoreComprehensivePage = lazy(() => import('@/pages/emr-quality-score-comprehensive'));
// M536-B：病历质量趋势分析 V14（EMR 深化四模块）
// M371 removed duplicate (emr-quality-trend variant)
// M536-C：病历质量科室对比 V14（EMR 深化四模块）
const EmrQualityComparePage = lazy(() => import('@/pages/emr-quality-compare'));
// M536-D：病历质量改进建议 V14（EMR 深化四模块）
const EmrQualityImprovePage = lazy(() => import('@/pages/emr-quality-improve'));
// M537-A：病历合理用药审查 V14（EMR 深化四模块）
const EmrMedicationReviewPage = lazy(() => import('@/pages/emr-medication-review'));
// M537-B：病历临床路径符合性检查 V14（EMR 深化四模块）
const EmrPathwayCheckPage = lazy(() => import('@/pages/emr-pathway-check'));
// M537-C：病历检验异常值提醒 V14（EMR 深化四模块）
const EmrLabAlertPage = lazy(() => import('@/pages/emr-lab-alert'));
// M537-D：病历诊断完整性检查 V14（EMR 深化四模块）
const EmrDiagnosisCompletePage = lazy(() => import('@/pages/emr-diagnosis-complete'));
// M538-A：病历时间轴生成 V14（EMR 深化四模块）
const EmrTimelineGeneratePage = lazy(() => import('@/pages/emr-timeline-generate'));
// M538-B：病程关键节点标记 V14（EMR 深化四模块）
const EmrCourseNodePage = lazy(() => import('@/pages/emr-course-node'));
// M538-C：病历关键事件时间线 V14（EMR 深化四模块）
const EmrEventTimelinePage = lazy(() => import('@/pages/emr-event-timeline'));
// M538-D：病历时间线导出 V14（EMR 深化四模块）
const EmrTimelineExportPage = lazy(() => import('@/pages/emr-timeline-export'));
// M539-A：病历模板智能推荐 V14（EMR 深化四模块）
const EmrTemplateRecommendPage = lazy(() => import('@/pages/emr-template-recommend'));
// M539-B：病历结构化录入辅助 V14（EMR 深化四模块）
const EmrStructuredInputPage = lazy(() => import('@/pages/emr-structured-input'));
// M539-C：病历常见用语快捷输入 V14（EMR 深化四模块）
const EmrQuickPhrasePage = lazy(() => import('@/pages/emr-quick-phrase'));
// M539-D：病历模板版本管理 V14（EMR 深化四模块）
const EmrTemplateVersionPage = lazy(() => import('@/pages/emr-template-version'));
// M540-A：病历复印申请管理（避让版 -apply）V14（EMR 深化四模块）
const EmrCopyRequestApplyPage = lazy(() => import('@/pages/emr-copy-request-apply'));
// M540-B：病历借阅登记管理 V14（EMR 深化四模块）
const EmrBorrowRecordPage = lazy(() => import('@/pages/emr-borrow-record'));
// M540-C：病历归还提醒 V14（EMR 深化四模块）
const EmrReturnRemindPage = lazy(() => import('@/pages/emr-return-remind'));
// M540-D：病历外审申请 V14（EMR 深化四模块）
const EmrExternalAuditPage = lazy(() => import('@/pages/emr-external-audit'));
// M541-A：病历归档预约 V14（EMR 深化四模块）
const EmrArchiveAppointPage = lazy(() => import('@/pages/emr-archive-appoint'));
// M541-B：病历销毁登记（避让版 -apply）V14（EMR 深化四模块）
const EmrDestroyApplyPage = lazy(() => import('@/pages/emr-destroy-apply'));
// M541-C：病历保存期限提醒 V14（EMR 深化四模块）
const EmrRetentionRemindPage = lazy(() => import('@/pages/emr-retention-remind'));
// M541-D：病历库房盘点 V14（EMR 深化四模块，M541 收官）
const EmrWarehouseCheckPage = lazy(() => import('@/pages/emr-warehouse-check'));
// M542-A：病历质控综合看板（避让版 -comprehensive）V14（EMR 深化四模块）
const EmrQcComprehensiveDashboardPage = lazy(() => import('@/pages/emr-qc-comprehensive-dashboard'));
// M542-B：科室质控排名（避让版 -list）V14（EMR 深化四模块）
const EmrQcDeptRankListPage = lazy(() => import('@/pages/emr-qc-dept-rank-list'));
// M542-C：医生质控个人档案 V14（EMR 深化四模块）
const EmrQcDoctorProfilePage = lazy(() => import('@/pages/emr-qc-doctor-profile'));
// M542-D：质控问题趋势分析（避让版 -analysis）V14（EMR 深化四模块，M542 收官）
const EmrQcTrendAnalysisPage = lazy(() => import('@/pages/emr-qc-trend-analysis'));
// M543-A：病历AI生成建议 V14（EMR 深化四模块）
const EmrAiSuggestionPage = lazy(() => import('@/pages/emr-ai-suggestion'));
// M543-B：病历AI质控评分 V14（EMR 深化四模块）
const EmrAiScoringPage = lazy(() => import('@/pages/emr-ai-scoring'));
// M543-C：病历AI缺陷预测 V14（EMR 深化四模块）
const EmrAiDefectPredictPage = lazy(() => import('@/pages/emr-ai-defect-predict'));
// M543-D：病历AI知识推荐 V14（EMR 深化四模块，M543 收官）
const EmrAiKnowledgeRecoPage = lazy(() => import('@/pages/emr-ai-knowledge-reco'));
// M544-A：病历AI诊断编码建议 V14（EMR 深化四模块）
const EmrAiDxCodingPage = lazy(() => import('@/pages/emr-ai-dx-coding'));
// M544-B：病历AI手术编码建议 V14（EMR 深化四模块）
const EmrAiOpCodingPage = lazy(() => import('@/pages/emr-ai-op-coding'));
// M544-C：病历AI病案首页质控 V14（EMR 深化四模块）
const EmrAiFrontpageQcPage = lazy(() => import('@/pages/emr-ai-frontpage-qc'));
// M544-D：病历AI DRG分组预测 V14（EMR 深化四模块，M544 收官）
const EmrAiDrgPredictPage = lazy(() => import('@/pages/emr-ai-drg-predict'));
// M545-A：病历AI临床问答 V14（EMR 深化四模块）
const EmrAiClinicalQaPage = lazy(() => import('@/pages/emr-ai-clinical-qa'));
// M545-B：病历AI鉴别诊断 V14（EMR 深化四模块）
const EmrAiDiffDxPage = lazy(() => import('@/pages/emr-ai-diff-dx'));
// M545-C：病历AI用药建议 V14（EMR 深化四模块）
const EmrAiMedRecoPage = lazy(() => import('@/pages/emr-ai-med-reco'));
// M545-D：病历AI检验解读 V14（EMR 深化四模块，M545 收官）
const EmrAiLabInterpretPage = lazy(() => import('@/pages/emr-ai-lab-interpret'));
// M546-A：病历AI临床路径推荐 V14（EMR 深化四模块）
const EmrAiPathwayRecoPage = lazy(() => import('@/pages/emr-ai-pathway-reco'));
// M546-B：病历AI医嘱推荐 V14（EMR 深化四模块）
const EmrAiOrderRecoPage = lazy(() => import('@/pages/emr-ai-order-reco'));
// M546-C：病历AI护理建议 V14（EMR 深化四模块，-suggest 后缀避让旧作废 -reco）
const EmrAiNursingSuggestPage = lazy(() => import('@/pages/emr-ai-nursing-suggest'));
// M546-D：病历AI随访计划推荐 V14（EMR 深化四模块，M546 收官）
const EmrAiFollowupPlanRecoPage = lazy(() => import('@/pages/emr-ai-followup-plan-reco'));
// M547-A：病历AI出院小结生成 V14（EMR 深化四模块）
const EmrAiDischargeSummaryPage = lazy(() => import('@/pages/emr-ai-discharge-summary'));
// M547-B：病历AI患者教育材料生成 V14（EMR 深化四模块）
const EmrAiPatientEduPage = lazy(() => import('@/pages/emr-ai-patient-edu'));
// M547-C：病历AI转诊建议 V14（EMR 深化四模块）
const EmrAiReferralSuggestPage = lazy(() => import('@/pages/emr-ai-referral-suggest'));
// M547-D：病历AI复诊提醒 V14（EMR 深化四模块，M547 收官）
const EmrAiFollowupRemindPage = lazy(() => import('@/pages/emr-ai-followup-remind'));
// M548-A：病历AI质控周报生成 V14（EMR 深化四模块）
const EmrAiQcWeeklyReportPage = lazy(() => import('@/pages/emr-ai-qc-weekly-report'));
// M548-B：病历AI质控月报生成 V14（EMR 深化四模块）
const EmrAiQcMonthlyReportPage = lazy(() => import('@/pages/emr-ai-qc-monthly-report'));
// M548-C：病历AI质控季报生成 V14（EMR 深化四模块）
const EmrAiQcQuarterlyReportPage = lazy(() => import('@/pages/emr-ai-qc-quarterly-report'));
// M548-D：病历AI质控年报生成 V14（EMR 深化四模块，M548 收官）
const EmrAiQcAnnualReportPage = lazy(() => import('@/pages/emr-ai-qc-annual-report'));
// M549-A：病历AI质控实时预警 V14（EMR 深化四模块）
const EmrAiQcRealtimeAlertPage = lazy(() => import('@/pages/emr-ai-qc-realtime-alert'));
// M549-B：病历AI质控异常监控 V14（EMR 深化四模块）
const EmrAiQcAnomalyMonitorPage = lazy(() => import('@/pages/emr-ai-qc-anomaly-monitor'));
// M549-C：病历AI质控风险评分 V14（EMR 深化四模块）
const EmrAiQcRiskScorePage = lazy(() => import('@/pages/emr-ai-qc-risk-score'));
// M549-D：病历AI质控趋势预测 V14（EMR 深化四模块，M549 收官）
const EmrAiQcTrendForecastPage = lazy(() => import('@/pages/emr-ai-qc-trend-forecast'));
// M550-A：病历AI临床知识图谱 V14（EMR 深化四模块）
const EmrAiClinicalGraphPage = lazy(() => import('@/pages/emr-ai-clinical-graph'));
// M550-B：病历AI鉴别诊断支持 V14（EMR 深化四模块）
const EmrAiDiagnosisDiffPage = lazy(() => import('@/pages/emr-ai-diagnosis-diff'));
// M550-C：病历AI用药相互作用审查 V14（EMR 深化四模块）
const EmrAiDrugInteractionPage = lazy(() => import('@/pages/emr-ai-drug-interaction'));
// M550-D：病历AI检验解读明细 V14（EMR 深化四模块，M550 收官，-detail 后缀避让）
const EmrAiLabInterpretDetailPage = lazy(() => import('@/pages/emr-ai-lab-interpret-detail'));
// M551-A：病历AI首页质控检查 V14（EMR 深化四模块，-check 后缀避让）
const EmrAiFrontpageQcCheckPage = lazy(() => import('@/pages/emr-ai-frontpage-qc-check'));
// M551-B：病历AI ICD 编码推荐 V14（EMR 深化四模块）
const EmrAiIcdRecoPage = lazy(() => import('@/pages/emr-ai-icd-reco'));
// M551-C：病历AI手术编码推荐 V14（EMR 深化四模块）
const EmrAiSurgeryCodeRecoPage = lazy(() => import('@/pages/emr-ai-surgery-code-reco'));
// M551-D：病历AI归档校验 V14（EMR 深化四模块，M551 收官）
const EmrAiArchiveCheckPage = lazy(() => import('@/pages/emr-ai-archive-check'));
// M552-A：病历AI DRG 分组预测 V14（EMR 深化四模块）
const EmrAiDrgGroupPredictPage = lazy(() => import('@/pages/emr-ai-drg-group-predict'));
// M552-B：病历AI DIP 分组预测 V14（EMR 深化四模块）
const EmrAiDipGroupPredictPage = lazy(() => import('@/pages/emr-ai-dip-group-predict'));
// M552-C：病历AI费用合理性审查 V14（EMR 深化四模块）
const EmrAiCostRationalAuditPage = lazy(() => import('@/pages/emr-ai-cost-rational-audit'));
// M552-D：病历AI医保结算清单质控 V14（EMR 深化四模块，M552 收官）
const EmrAiSettlementListQcPage = lazy(() => import('@/pages/emr-ai-settlement-list-qc'));
// M553-A：病历AI病历书写建议 V14（EMR 深化四模块）
const EmrAiWritingSuggestPage = lazy(() => import('@/pages/emr-ai-writing-suggest'));
// M553-B：病历AI病历完整性检查 V14（EMR 深化四模块）
const EmrAiRecordCompletenessCheckPage = lazy(() => import('@/pages/emr-ai-record-completeness-check'));
// M553-C：病历AI病历逻辑一致性检查 V14（EMR 深化四模块）
const EmrAiRecordConsistencyCheckPage = lazy(() => import('@/pages/emr-ai-record-consistency-check'));
// M553-D：病历AI病历同质化对比 V14（EMR 深化四模块，M553 收官）
const EmrAiRecordHomogeneityComparePage = lazy(() => import('@/pages/emr-ai-record-homogeneity-compare'));
// M554-A：病历AI临床路径推荐 V14（EMR 深化四模块）
const EmrAiClinicalPathwayRecoPage = lazy(() => import('@/pages/emr-ai-clinical-pathway-reco'));
// M554-B：病历AI合理用药审查 V14（EMR 深化四模块）
const EmrAiRationalMedicationAuditPage = lazy(() => import('@/pages/emr-ai-rational-medication-audit'));
// M554-C：病历AI诊疗方案推荐 V14（EMR 深化四模块）
const EmrAiTreatmentPlanRecoPage = lazy(() => import('@/pages/emr-ai-treatment-plan-reco'));
// M554-D：病历AI临床指南推荐 V14（EMR 深化四模块，M554 收官）
const EmrAiClinicalGuidelineRecoPage = lazy(() => import('@/pages/emr-ai-clinical-guideline-reco'));
// M555-A：病历AI术前评估 V14（EMR 深化四模块）
const EmrAiPreopAssessmentPage = lazy(() => import('@/pages/emr-ai-preop-assessment'));
// M555-B：病历AI手术记录质控 V14（EMR 深化四模块）
const EmrAiOpRecordQcPage = lazy(() => import('@/pages/emr-ai-op-record-qc'));
// M555-C：病历AI术后病程跟踪 V14（EMR 深化四模块）
const EmrAiPostopProgressTrackPage = lazy(() => import('@/pages/emr-ai-postop-progress-track'));
// M555-D：病历AI出院小结自动生成 V14（EMR 深化四模块，M555 收官）
const EmrAiDischargeSummaryGenPage = lazy(() => import('@/pages/emr-ai-discharge-summary-gen'));
// M556-A：病历AI病案首页智能编码 V14（EMR 深化四模块）
const EmrAiFrontpageSmartCodingPage = lazy(() => import('@/pages/emr-ai-frontpage-smart-coding'));
// M556-B：病历AI病案质量评分 V14（EMR 深化四模块）
const EmrAiRecordQualityScorePage = lazy(() => import('@/pages/emr-ai-record-quality-score'));
// M556-C：病历AI病案缺陷预警 V14（EMR 深化四模块）
const EmrAiRecordDefectAlertPage = lazy(() => import('@/pages/emr-ai-record-defect-alert'));
// M556-D：病历AI病案利用分析 V14（EMR 深化四模块，M556 收官）
const EmrAiRecordUtilizationAnalysisPage = lazy(() => import('@/pages/emr-ai-record-utilization-analysis'));
// M557-A：病历AI护理记录生成 V14（EMR 深化四模块）
const EmrAiNursingNoteGenPage = lazy(() => import('@/pages/emr-ai-nursing-note-gen'));
// M557-B：病历AI护理计划推荐 V14（EMR 深化四模块）
const EmrAiNursingPlanRecoPage = lazy(() => import('@/pages/emr-ai-nursing-plan-reco'));
// M557-C：病历AI护理风险评估 V14（EMR 深化四模块）
const EmrAiNursingRiskAssessPage = lazy(() => import('@/pages/emr-ai-nursing-risk-assess'));
// M557-D：病历AI病区交班报告生成 V14（EMR 深化四模块，M557 收官）
const EmrAiShiftReportGenPage = lazy(() => import('@/pages/emr-ai-shift-report-gen'));
// M558-A：病历AI医嘱智能审核 V14（EMR 深化四模块）
const EmrAiOrderSmartReviewPage = lazy(() => import('@/pages/emr-ai-order-smart-review'));
// M558-B：病历AI处方合理用药审查 V14（EMR 深化四模块）
const EmrAiPrescriptionRationalAuditPage = lazy(() => import('@/pages/emr-ai-prescription-rational-audit'));
// M558-C：病历AI医嘱执行追踪 V14（EMR 深化四模块）
const EmrAiOrderExecTrackPage = lazy(() => import('@/pages/emr-ai-order-exec-track'));
// M558-D：病历AI出院带药建议 V14（EMR 深化四模块，M558 收官）
const EmrAiDischargeMedRecoPage = lazy(() => import('@/pages/emr-ai-discharge-med-reco'));
// M559-A：病历AI不良事件主动识别 V14（EMR 深化四模块）
const EmrAiAdverseEventDetectPage = lazy(() => import('@/pages/emr-ai-adverse-event-detect'));
// M559-B：病历AI用药错误预警 V14（EMR 深化四模块）
const EmrAiMedicationErrorAlertPage = lazy(() => import('@/pages/emr-ai-medication-error-alert'));
// M559-C：病历AI院内感染风险预警 V14（EMR 深化四模块）
const EmrAiHaiRiskAlertPage = lazy(() => import('@/pages/emr-ai-hai-risk-alert'));
// M559-D：病历AI患者跌倒风险评估 V14（EMR 深化四模块，M559 收官）
const EmrAiFallRiskAssessPage = lazy(() => import('@/pages/emr-ai-fall-risk-assess'));
// M560-A：病历AI急诊分诊分级推荐 V14（EMR 深化四模块）
const EmrAiEmergencyTriageRecoPage = lazy(() => import('@/pages/emr-ai-emergency-triage-reco'));
// M560-B：病历AI门诊预检分诊 V14（EMR 深化四模块）
const EmrAiOutpatientPreTriagePage = lazy(() => import('@/pages/emr-ai-outpatient-pre-triage'));
// M560-C：病历AI急诊留观病历生成 V14（EMR 深化四模块）
const EmrAiEmergencyObsNoteGenPage = lazy(() => import('@/pages/emr-ai-emergency-obs-note-gen'));
// M560-D：病历AI门诊复诊提醒推荐 V14（EMR 深化四模块，M560 收官）
const EmrAiOutpatientFollowupRecoPage = lazy(() => import('@/pages/emr-ai-outpatient-followup-reco'));
// M561-A：病历AI检查申请智能推荐 V14（EMR 深化四模块）
const EmrAiExamApplyRecoPage = lazy(() => import('@/pages/emr-ai-exam-apply-reco'));
// M561-B：病历AI检验申请合理性审查 V14（EMR 深化四模块）
const EmrAiLabApplyAuditPage = lazy(() => import('@/pages/emr-ai-lab-apply-audit'));
// M561-C：病历AI检查报告AI解读摘要 V14（EMR 深化四模块）
const EmrAiExamReportSummaryPage = lazy(() => import('@/pages/emr-ai-exam-report-summary'));
// M561-D：病历AI检验危急值智能提醒 V14（EMR 深化四模块，M561 收官）
const EmrAiLabCriticalAlertPage = lazy(() => import('@/pages/emr-ai-lab-critical-alert'));
// M562-A：病历AI术前风险评估 V14（EMR 深化四模块，手术与麻醉管理系列）
const EmrAiPreopRiskAssessPage = lazy(() => import('@/pages/emr-ai-preop-risk-assess'));
// M562-B：病历AI手术方案推荐 V14（EMR 深化四模块）
const EmrAiSurgeryPlanRecoPage = lazy(() => import('@/pages/emr-ai-surgery-plan-reco'));
// M562-C：病历AI麻醉深度监测建议 V14（EMR 深化四模块）
const EmrAiAnesthesiaDepthSuggestPage = lazy(() => import('@/pages/emr-ai-anesthesia-depth-suggest'));
// M562-D：病历AI术后镇痛方案推荐 V14（EMR 深化四模块，M562 收官）
const EmrAiPostopAnalgesiaRecoPage = lazy(() => import('@/pages/emr-ai-postop-analgesia-reco'));
// M563-A：病历AI康复评估推荐 V14（EMR 深化四模块）
const EmrAiRehabAssessRecoPage = lazy(() => import('@/pages/emr-ai-rehab-assess-reco'));
// M563-B：病历AI康复训练方案推荐 V14（EMR 深化四模块）
const EmrAiRehabPlanRecoPage = lazy(() => import('@/pages/emr-ai-rehab-plan-reco'));
// M563-C：病历AI出院随访计划推荐 V14（EMR 深化四模块）
const EmrAiDischargeFollowupRecoPage = lazy(() => import('@/pages/emr-ai-discharge-followup-reco'));
// M563-D：病历AI慢病管理计划推荐 V14（EMR 深化四模块，M563 收官）
const EmrAiChronicCarePlanRecoPage = lazy(() => import('@/pages/emr-ai-chronic-care-plan-reco'));
// M564-A：病历AI营养风险筛查 V14（EMR 深化四模块）
const EmrAiNutritionRiskScreenPage = lazy(() => import('@/pages/emr-ai-nutrition-risk-screen'));
// M564-B：病历AI膳食处方推荐 V14（EMR 深化四模块）
const EmrAiDietScriptRecoPage = lazy(() => import('@/pages/emr-ai-diet-script-reco'));
// M564-C：病历AI肠内营养支持建议 V14（EMR 深化四模块）
const EmrAiEnteralNutritionSuggestPage = lazy(() => import('@/pages/emr-ai-enteral-nutrition-suggest'));
// M564-D：病历AI肠外营养配置推荐 V14（EMR 深化四模块，M564 收官）
const EmrAiParenteralNutritionRecoPage = lazy(() => import('@/pages/emr-ai-parenteral-nutrition-reco'));
// M565-A：病历AI处方前置审核 V14（EMR 深化四模块）
const EmrAiPrePrescriptionReviewPage = lazy(() => import('@/pages/emr-ai-pre-prescription-review'));
// M565-B：病历AI用药咨询答复 V14（EMR 深化四模块）
const EmrAiMedicationConsultReplyPage = lazy(() => import('@/pages/emr-ai-medication-consult-reply'));
// M565-C：病历AI药品相互作用明细审查 V14（EMR 深化四模块，-detail 后缀避让 emrAiDrugInteractionV14）
const EmrAiDrugInteractionDetailPage = lazy(() => import('@/pages/emr-ai-drug-interaction-detail'));
// M565-D：病历AI特殊人群用药推荐 V14（EMR 深化四模块，M565 收官）
const EmrAiSpecialPopulationMedRecoPage = lazy(() => import('@/pages/emr-ai-special-population-med-reco'));
// 处方点评系统（M103-B）
const PrescriptionReviewPage = lazy(() => import('@/pages/drugReview/PrescriptionReview'));
// 门诊医生工作站（M105-B）
const OpdWorkstationPage = lazy(() => import('@/pages/opd/Workstation'));
// 手术安全核查表（M105-D）
const SurgeryChecklistPage = lazy(() => import('@/pages/surgery/Checklist'));
const ServiceAppointmentsPage = lazy(() => import('@/pages/service/appointments'));
const ServicePaymentsPage = lazy(() => import('@/pages/service/payments'));
const ServiceQuerysPage = lazy(() => import('@/pages/service/querys'));
const ServiceRemindersPage = lazy(() => import('@/pages/service/reminders'));
const ServiceFeedbackPage = lazy(() => import('@/pages/service/feedback'));
const ServiceSatisfactionPage = lazy(() => import('@/pages/service/satisfaction'));
const OperationsDashboardPage = lazy(() => import('@/pages/operations/dashboard'));
const OperationsKpiPage = lazy(() => import('@/pages/operations/kpi'));
const OperationsReportsPage = lazy(() => import('@/pages/operations/reports'));
const OperationsAnalysisPage = lazy(() => import('@/pages/operations/analysis'));
const OperationsForecastPage = lazy(() => import('@/pages/operations/forecast'));
const OperationsBenchmarkPage = lazy(() => import('@/pages/operations/benchmark'));
const HrStaffDashboardPage = lazy(() => import('@/pages/hr/staff-dashboard'));
const HrStaffRecruitmentPage = lazy(() => import('@/pages/hr/staff-recruitment'));
const HrStaffTrainingPage = lazy(() => import('@/pages/hr/staff-training'));
const HrStaffPerformancePage = lazy(() => import('@/pages/hr/staff-performance'));
const HrStaffSchedulePage = lazy(() => import('@/pages/hr/staff-schedule'));
const HrStaffAttendancePage = lazy(() => import('@/pages/hr/staff-attendance'));
const FinanceCostsPage = lazy(() => import('@/pages/finance/costs'));
const FinanceAnalysisPage = lazy(() => import('@/pages/finance/analysis'));
const PharmacyDashboardPage = lazy(() => import('@/pages/pharmacy/dashboard'));
const PharmacyInventoryDetailPage = lazy(() => import('@/pages/pharmacy/inventory-detail'));
const PharmacySuppliersPage = lazy(() => import('@/pages/pharmacy/suppliers'));
const PharmacyExpiryPage = lazy(() => import('@/pages/pharmacy/expiry'));
const ResearchAwardsPage = lazy(() => import('@/pages/research/awards'));
const TeachingCoursesPage = lazy(() => import('@/pages/teaching/courses'));
const TelemedPrescriptionsPage = lazy(() => import('@/pages/telemed/prescriptions'));
const TelemedPaymentsPage = lazy(() => import('@/pages/telemed/payments'));
const TelemedDeliveryPage = lazy(() => import('@/pages/telemed/delivery'));
const TelemedFollowupPage = lazy(() => import('@/pages/telemed/followup'));
const TelemedReportsPage = lazy(() => import('@/pages/telemed/reports'));
const TelemedRemoteConsultsPage = lazy(() => import('@/pages/telemed/remote-consults'));
const TelemedRemoteDiagnosisPage = lazy(() => import('@/pages/telemed/remote-diagnosis'));
const TelemedRemoteMonitoringPage = lazy(() => import('@/pages/telemed/remote-monitoring'));
const TelemedRemoteSurgeryPage = lazy(() => import('@/pages/telemed/remote-surgery'));
const TelemedRemoteTrainingPage = lazy(() => import('@/pages/telemed/remote-training'));
const TelemedRemoteEquipmentPage = lazy(() => import('@/pages/telemed/remote-equipment'));
const CommunityHealthRecordsPage = lazy(() => import('@/pages/community/health-records'));
const CommunityElderlyCarePage = lazy(() => import('@/pages/community/elderly-care'));
const CommunityChronicDiseasePage = lazy(() => import('@/pages/community/chronic-disease'));
const CommunityEducationPage = lazy(() => import('@/pages/community/education'));
const MaternityPrenatalCarePage = lazy(() => import('@/pages/maternity/prenatal-care'));
const MaternityPostnatalCarePage = lazy(() => import('@/pages/maternity/postnatal-care'));
const MaternityInfantCarePage = lazy(() => import('@/pages/maternity/infant-care'));
const MaternityChildVaccinationPage = lazy(() => import('@/pages/maternity/child-vaccination'));
const MaternityWomenHealthPage = lazy(() => import('@/pages/maternity/women-health'));
const MaternityGeneticScreeningPage = lazy(() => import('@/pages/maternity/genetic-screening'));
const EmergencyTriagePage = lazy(() => import('@/pages/emergency/triage'));
const EmergencyDisasterPage = lazy(() => import('@/pages/emergency/disaster'));
const OncologyScreeningPage = lazy(() => import('@/pages/oncology/screening'));
const OncologyDiagnosisPage = lazy(() => import('@/pages/oncology/diagnosis'));
const OncologyTreatmentPlanPage = lazy(() => import('@/pages/oncology/treatment-plan'));
const OncologyFollowupPage = lazy(() => import('@/pages/oncology/followup'));
const RehabTherapyPage = lazy(() => import('@/pages/rehab/therapy'));
const RehabExercisePage = lazy(() => import('@/pages/rehab/exercise'));
const RehabOccupationalPage = lazy(() => import('@/pages/rehab/occupational'));
const GeriatricsCarePlanPage = lazy(() => import('@/pages/geriatrics/care-plan'));
const GeriatricsComorbidityPage = lazy(() => import('@/pages/geriatrics/comorbidity'));
const GeriatricsFrailPage = lazy(() => import('@/pages/geriatrics/frail'));
const EmrTemplatesDetailPage = lazy(() => import('@/pages/emr/templates-detail'));
const EmrQualityCheckPage = lazy(() => import('@/pages/emr/quality-check'));
const EmrRetrievalPage = lazy(() => import('@/pages/emr/retrieval'));
const InsurancePolicyPage = lazy(() => import('@/pages/insurance/policy'));
const InsuranceClaimsPage = lazy(() => import('@/pages/insurance/claims'));
const InsuranceSettlementPage = lazy(() => import('@/pages/insurance/settlement'));
const InsuranceAuditPage = lazy(() => import('@/pages/insurance/audit'));
const InsuranceDiseaseCodesPage = lazy(() => import('@/pages/insurance/disease-codes'));
const InsuranceItemsPage = lazy(() => import('@/pages/insurance/items'));
const SurgeryConsentPage = lazy(() => import('@/pages/surgery/consent'));
const AnesthesiaAssessmentPage = lazy(() => import('@/pages/anesthesia/assessment'));
const AnesthesiaRecoveryPage = lazy(() => import('@/pages/anesthesia/recovery'));
const LabItemsPage = lazy(() => import('@/pages/lab/items'));
const LabReportsPage = lazy(() => import('@/pages/lab/reports'));
const RadiologyItemsPage = lazy(() => import('@/pages/radiology/items'));
const InpatientAdmissionsPage = lazy(() => import('@/pages/inpatient/admissions'));
const InpatientDischargesPage = lazy(() => import('@/pages/inpatient/discharges'));
const InpatientTransfersPage = lazy(() => import('@/pages/inpatient/transfers'));
const OrdersDetailPage = lazy(() => import('@/pages/orders/detail'));
const OrdersTemplatesPage = lazy(() => import('@/pages/orders/templates'));
const PrescriptionsListPage = lazy(() => import('@/pages/prescriptions/list'));
const PrescriptionsDetailPage = lazy(() => import('@/pages/prescriptions/detail'));
const PrescriptionsAuditPage = lazy(() => import('@/pages/prescriptions/audit'));
const PatientVisitsPage = lazy(() => import('@/pages/patient/visits'));
const PatientMedicationsPage = lazy(() => import('@/pages/patient/medications'));
const PatientLabsPage = lazy(() => import('@/pages/patient/labs'));
const PatientImagingPage = lazy(() => import('@/pages/patient/imaging'));
const CdsRulesPage = lazy(() => import('@/pages/cds/rules'));
const CdsRecommendationsPage = lazy(() => import('@/pages/cds/recommendations'));
const CdsDrugInteractionsPage = lazy(() => import('@/pages/cds/drug-interactions'));
const CdsContraindicationsPage = lazy(() => import('@/pages/cds/contraindications'));
const WorkflowInstancesPage = lazy(() => import('@/pages/workflow/instances'));
const WorkflowApprovalPage = lazy(() => import('@/pages/workflow/approval'));
const WorkflowSchedulingPage = lazy(() => import('@/pages/workflow/scheduling'));
const WorkflowNotificationsPage = lazy(() => import('@/pages/workflow/notifications'));
const SystemMenusPage = lazy(() => import('@/pages/system/menus'));
const SystemParamsPage = lazy(() => import('@/pages/system/params'));
const SystemCachePage = lazy(() => import('@/pages/system/cache'));
const TenantsDetailPage = lazy(() => import('@/pages/tenants/detail'));
const TenantsIsolationPage = lazy(() => import('@/pages/tenants/isolation'));
const PhiMaskingPage = lazy(() => import('@/pages/phi/masking'));
const PhiEncryptionPage = lazy(() => import('@/pages/phi/encryption'));
const PhiDecryptionPage = lazy(() => import('@/pages/phi/decryption'));
const PhiAuditPage = lazy(() => import('@/pages/phi/audit'));
const PhiPoliciesPage = lazy(() => import('@/pages/phi/policies'));
const PhiConsentPage = lazy(() => import('@/pages/phi/consent'));
const SignaturesListPage = lazy(() => import('@/pages/signatures/list'));
const SignaturesVerifyPage = lazy(() => import('@/pages/signatures/verify'));
const SignaturesTemplatesPage = lazy(() => import('@/pages/signatures/templates'));
const BiChartsPage = lazy(() => import('@/pages/bi/charts'));
const BiReportsPage = lazy(() => import('@/pages/bi/reports'));
const BiAnalysisPage = lazy(() => import('@/pages/bi/analysis'));
const BiExportPage = lazy(() => import('@/pages/bi/export'));
const BiScheduledPage = lazy(() => import('@/pages/bi/scheduled'));
const ResearchProjectsDetailPage = lazy(() => import('@/pages/research/projects-detail'));
const ResearchPapersDetailPage = lazy(() => import('@/pages/research/papers-detail'));
const ResearchFundsDetailPage = lazy(() => import('@/pages/research/funds-detail'));
const ResearchAwardsDetailPage = lazy(() => import('@/pages/research/awards-detail'));
const TeachingCoursesDetailPage = lazy(() => import('@/pages/teaching/courses-detail'));
const TeachingTrainingDetailPage = lazy(() => import('@/pages/teaching/training-detail'));
const TelemedConsultationsDetailPage = lazy(() => import('@/pages/telemed/consultations-detail'));
const TelemedPrescriptionsDetailPage = lazy(() => import('@/pages/telemed/prescriptions-detail'));
const TelemedPaymentsDetailPage = lazy(() => import('@/pages/telemed/payments-detail'));
const TelemedDeliveryDetailPage = lazy(() => import('@/pages/telemed/delivery-detail'));
const TelemedFollowupDetailPage = lazy(() => import('@/pages/telemed/followup-detail'));
const TelemedReportsDetailPage = lazy(() => import('@/pages/telemed/reports-detail'));
const TelemedRemoteConsultsDetailPage = lazy(() => import('@/pages/telemed/remote-consults-detail'));
const TelemedRemoteDiagnosisDetailPage = lazy(() => import('@/pages/telemed/remote-diagnosis-detail'));
const TelemedRemoteMonitoringDetailPage = lazy(() => import('@/pages/telemed/remote-monitoring-detail'));
const TelemedRemoteSurgeryDetailPage = lazy(() => import('@/pages/telemed/remote-surgery-detail'));
const TelemedRemoteTrainingDetailPage = lazy(() => import('@/pages/telemed/remote-training-detail'));
const TelemedRemoteEquipmentDetailPage = lazy(() => import('@/pages/telemed/remote-equipment-detail'));
const CommunityFollowupsDetailPage = lazy(() => import('@/pages/community/followups-detail'));
const CommunityVisitsDetailPage = lazy(() => import('@/pages/community/visits-detail'));
const CommunityHealthRecordsDetailPage = lazy(() => import('@/pages/community/health-records-detail'));
const CommunityElderlyCareDetailPage = lazy(() => import('@/pages/community/elderly-care-detail'));
const CommunityChronicDiseaseDetailPage = lazy(() => import('@/pages/community/chronic-disease-detail'));
const CommunityEducationDetailPage = lazy(() => import('@/pages/community/education-detail'));
const MaternityPrenatalCareDetailPage = lazy(() => import('@/pages/maternity/prenatal-care-detail'));
const MaternityPostnatalCareDetailPage = lazy(() => import('@/pages/maternity/postnatal-care-detail'));
const MaternityInfantCareDetailPage = lazy(() => import('@/pages/maternity/infant-care-detail'));
const MaternityChildVaccinationDetailPage = lazy(() => import('@/pages/maternity/child-vaccination-detail'));
const MaternityWomenHealthDetailPage = lazy(() => import('@/pages/maternity/women-health-detail'));
const MaternityGeneticScreeningDetailPage = lazy(() => import('@/pages/maternity/genetic-screening-detail'));
const EmergencyTriageDetailPage = lazy(() => import('@/pages/emergency/triage-detail'));
const EmergencyRescueDetailPage = lazy(() => import('@/pages/emergency/rescue-detail'));
const EmergencyAmbulanceDetailPage = lazy(() => import('@/pages/emergency/ambulance-detail'));
const EmergencyDisasterDetailPage = lazy(() => import('@/pages/emergency/disaster-detail'));
const EmergencyPoisoningDetailPage = lazy(() => import('@/pages/emergency/poisoning-detail'));
const EmergencyTraumaDetailPage = lazy(() => import('@/pages/emergency/trauma-detail'));
const OncologyScreeningDetailPage = lazy(() => import('@/pages/oncology/screening-detail'));
const OncologyDiagnosisDetailPage = lazy(() => import('@/pages/oncology/diagnosis-detail'));
const OncologyTreatmentPlanDetailPage = lazy(() => import('@/pages/oncology/treatment-plan-detail'));
const OncologyChemotherapyDetailPage = lazy(() => import('@/pages/oncology/chemotherapy-detail'));
const OncologyRadiotherapyDetailPage = lazy(() => import('@/pages/oncology/radiotherapy-detail'));
const OncologyFollowupDetailPage = lazy(() => import('@/pages/oncology/followup-detail'));
const RehabAssessmentDetailPage = lazy(() => import('@/pages/rehab/assessment-detail'));
const RehabTreatmentDetailPage = lazy(() => import('@/pages/rehab/treatment-detail'));
const RehabTherapyDetailPage = lazy(() => import('@/pages/rehab/therapy-detail'));
const RehabExerciseDetailPage = lazy(() => import('@/pages/rehab/exercise-detail'));
const RehabOccupationalDetailPage = lazy(() => import('@/pages/rehab/occupational-detail'));
const RehabFollowupDetailPage = lazy(() => import('@/pages/rehab/followup-detail'));
const GeriatricsAssessmentDetailPage = lazy(() => import('@/pages/geriatrics/assessment-detail'));
const GeriatricsCarePlanDetailPage = lazy(() => import('@/pages/geriatrics/care-plan-detail'));
const GeriatricsComorbidityDetailPage = lazy(() => import('@/pages/geriatrics/comorbidity-detail'));
const GeriatricsFrailDetailPage = lazy(() => import('@/pages/geriatrics/frail-detail'));
const GeriatricsDementiaDetailPage = lazy(() => import('@/pages/geriatrics/dementia-detail'));
const GeriatricsFallsDetailPage = lazy(() => import('@/pages/geriatrics/falls-detail'));
const EmrQualityCheckDetailPage = lazy(() => import('@/pages/emr/quality-check-detail'));
const EmrRetrievalDetailPage = lazy(() => import('@/pages/emr/retrieval-detail'));
const EmrArchiveDetailPage = lazy(() => import('@/pages/emr/archive-detail'));
const EmrSignaturesDetailPage = lazy(() => import('@/pages/emr/signatures-detail'));
const EmrVersionsDetailPage = lazy(() => import('@/pages/emr/versions-detail'));
const InsurancePolicyDetailPage = lazy(() => import('@/pages/insurance/policy-detail'));
const InsuranceClaimsDetailPage = lazy(() => import('@/pages/insurance/claims-detail'));
const InsuranceSettlementDetailPage = lazy(() => import('@/pages/insurance/settlement-detail'));
const InsuranceAuditDetailPage = lazy(() => import('@/pages/insurance/audit-detail'));
const InsuranceDiseaseCodesDetailPage = lazy(() => import('@/pages/insurance/disease-codes-detail'));
const InsuranceItemsDetailPage = lazy(() => import('@/pages/insurance/items-detail'));
const OrdersListDetailPage = lazy(() => import('@/pages/orders/list-detail'));
const OrdersDetailDetailPage = lazy(() => import('@/pages/orders/detail-detail'));
const OrdersTemplatesDetailPage = lazy(() => import('@/pages/orders/templates-detail'));
const PrescriptionsListDetailPage = lazy(() => import('@/pages/prescriptions/list-detail'));
const PrescriptionsDetailDetailPage = lazy(() => import('@/pages/prescriptions/detail-detail'));
const PrescriptionsAuditDetailPage = lazy(() => import('@/pages/prescriptions/audit-detail'));
const SurgeryScheduleDetailPage = lazy(() => import('@/pages/surgery/schedule-detail'));
const SurgeryRecordsDetailPage = lazy(() => import('@/pages/surgery/records-detail'));
const SurgeryConsentDetailPage = lazy(() => import('@/pages/surgery/consent-detail'));
const AnesthesiaRecordsDetailPage = lazy(() => import('@/pages/anesthesia/records-detail'));
const AnesthesiaAssessmentDetailPage = lazy(() => import('@/pages/anesthesia/assessment-detail'));
const AnesthesiaRecoveryDetailPage = lazy(() => import('@/pages/anesthesia/recovery-detail'));
const LabItemsDetailPage = lazy(() => import('@/pages/lab/items-detail'));
const LabResultsDetailPage = lazy(() => import('@/pages/lab/results-detail'));
const LabReportsDetailPage = lazy(() => import('@/pages/lab/reports-detail'));
const RadiologyItemsDetailPage = lazy(() => import('@/pages/radiology/items-detail'));
const RadiologyResultsDetailPage = lazy(() => import('@/pages/radiology/results-detail'));
const RadiologyReportsDetailPage = lazy(() => import('@/pages/radiology/reports-detail'));
const OutpatientQueueDetailPage = lazy(() => import('@/pages/outpatient/queue-detail'));
const OutpatientVisitsDetailPage = lazy(() => import('@/pages/outpatient/visits-detail'));
const OutpatientPrescriptionsDetailPage = lazy(() => import('@/pages/outpatient/prescriptions-detail'));
const InpatientAdmissionsDetailPage = lazy(() => import('@/pages/inpatient/admissions-detail'));
const InpatientDischargesDetailPage = lazy(() => import('@/pages/inpatient/discharges-detail'));
const InpatientTransfersDetailPage = lazy(() => import('@/pages/inpatient/transfers-detail'));
const EntExaminationsDetailPage = lazy(() => import('@/pages/ent/examinations-detail'));
const EntDiseasesDetailPage = lazy(() => import('@/pages/ent/diseases-detail'));
const EntSurgeriesDetailPage = lazy(() => import('@/pages/ent/surgeries-detail'));
const EntHearingDetailPage = lazy(() => import('@/pages/ent/hearing-detail'));
const EntNoseDetailPage = lazy(() => import('@/pages/ent/nose-detail'));
const EntThroatDetailPage = lazy(() => import('@/pages/ent/throat-detail'));
const CdsRulesDetailPage = lazy(() => import('@/pages/cds/rules-detail'));
const CdsAlertsDetailPage = lazy(() => import('@/pages/cds/alerts-detail'));
const CdsRecommendationsDetailPage = lazy(() => import('@/pages/cds/recommendations-detail'));
const CdsDrugInteractionsDetailPage = lazy(() => import('@/pages/cds/drug-interactions-detail'));
const CdsContraindicationsDetailPage = lazy(() => import('@/pages/cds/contraindications-detail'));
const CdsGuidelinesDetailPage = lazy(() => import('@/pages/cds/guidelines-detail'));
const WorkflowTasksDetailPage = lazy(() => import('@/pages/workflow/tasks-detail'));
const WorkflowTemplatesDetailPage = lazy(() => import('@/pages/workflow/templates-detail'));
const WorkflowInstancesDetailPage = lazy(() => import('@/pages/workflow/instances-detail'));
const WorkflowApprovalDetailPage = lazy(() => import('@/pages/workflow/approval-detail'));
const WorkflowSchedulingDetailPage = lazy(() => import('@/pages/workflow/scheduling-detail'));
const WorkflowNotificationsDetailPage = lazy(() => import('@/pages/workflow/notifications-detail'));
const SystemConfigDetailPage = lazy(() => import('@/pages/system/config-detail'));
const SystemMenusDetailPage = lazy(() => import('@/pages/system/menus-detail'));
const SystemDictDetailPage = lazy(() => import('@/pages/system/dict-detail'));
const SystemLogsDetailPage = lazy(() => import('@/pages/system/logs-detail'));
const SystemParamsDetailPage = lazy(() => import('@/pages/system/params-detail'));
const SystemCacheDetailPage = lazy(() => import('@/pages/system/cache-detail'));
const TenantsListDetailPage = lazy(() => import('@/pages/tenants/list-detail'));
const TenantsDetailDetailPage = lazy(() => import('@/pages/tenants/detail-detail'));
const TenantsConfigDetailPage = lazy(() => import('@/pages/tenants/config-detail'));
const TenantsQuotaDetailPage = lazy(() => import('@/pages/tenants/quota-detail'));
const TenantsIsolationDetailPage = lazy(() => import('@/pages/tenants/isolation-detail'));
const TenantsSwitchDetailPage = lazy(() => import('@/pages/tenants/switch-detail'));
const SecurityPhiMaskingDetailPage = lazy(() => import('@/pages/security/phi-masking-detail'));
const SecurityDataEncryptionDetailPage = lazy(() => import('@/pages/security/data-encryption-detail'));
const SecurityAuditLogsDetailPage = lazy(() => import('@/pages/security/audit-logs-detail'));
const SecurityAccessControlDetailPage = lazy(() => import('@/pages/security/access-control-detail'));
const SecurityDataRetentionDetailPage = lazy(() => import('@/pages/security/data-retention-detail'));
const SecurityComplianceDetailPage = lazy(() => import('@/pages/security/compliance-detail'));
const BiDashboardDetailPage = lazy(() => import('@/pages/bi/dashboard-detail'));
const BiReportsDetailPage = lazy(() => import('@/pages/bi/reports-detail'));
const BiChartsDetailPage = lazy(() => import('@/pages/bi/charts-detail'));
const BiAnalyticsDetailPage = lazy(() => import('@/pages/bi/analytics-detail'));
const BiExportDetailPage = lazy(() => import('@/pages/bi/export-detail'));
const BiScheduleDetailPage = lazy(() => import('@/pages/bi/schedule-detail'));
const IcuAdmissionsDetailPage = lazy(() => import('@/pages/icu/admissions-detail'));
const IcuMonitoringDetailPage = lazy(() => import('@/pages/icu/monitoring-detail'));
const IcuTreatmentsDetailPage = lazy(() => import('@/pages/icu/treatments-detail'));
const IcuVentilatorDetailPage = lazy(() => import('@/pages/icu/ventilator-detail'));
const IcuCriticalEventsDetailPage = lazy(() => import('@/pages/icu/critical-events-detail'));
const IcuDischargesDetailPage = lazy(() => import('@/pages/icu/discharges-detail'));
const AuthMePage = lazy(() => import('@/pages/auth/me'));
const EmrListPage = lazy(() => import('@/pages/emr/list'));
const ServiceAppointmentsDetailPage = lazy(() => import('@/pages/service/appointments-detail'));
const ServiceQueuesDetailPage = lazy(() => import('@/pages/service/queues-detail'));
const ServicePaymentsDetailPage = lazy(() => import('@/pages/service/payments-detail'));
const ServiceReportsDetailPage = lazy(() => import('@/pages/service/reports-detail'));
const ServiceMessagesDetailPage = lazy(() => import('@/pages/service/messages-detail'));
const ServiceFeedbackDetailPage = lazy(() => import('@/pages/service/feedback-detail'));
const OperationsDashboardDetailPage = lazy(() => import('@/pages/operations/dashboard-detail'));
const OperationsEfficiencyDetailPage = lazy(() => import('@/pages/operations/efficiency-detail'));
const OperationsCostDetailPage = lazy(() => import('@/pages/operations/cost-detail'));
const OperationsRevenueDetailPage = lazy(() => import('@/pages/operations/revenue-detail'));
const OperationsQualityDetailPage = lazy(() => import('@/pages/operations/quality-detail'));
const OperationsComparisonDetailPage = lazy(() => import('@/pages/operations/comparison-detail'));
const HrEmployeesDetailPage = lazy(() => import('@/pages/hr/employees-detail'));
const HrDepartmentsDetailPage = lazy(() => import('@/pages/hr/departments-detail'));
const HrAttendanceDetailPage = lazy(() => import('@/pages/hr/attendance-detail'));
const HrPerformanceDetailPage = lazy(() => import('@/pages/hr/performance-detail'));
const HrSalaryDetailPage = lazy(() => import('@/pages/hr/salary-detail'));
const HrTrainingDetailPage = lazy(() => import('@/pages/hr/training-detail'));
const FinanceBillsDetailPage = lazy(() => import('@/pages/finance/bills-detail'));
const FinancePaymentsDetailPage = lazy(() => import('@/pages/finance/payments-detail'));
const FinanceRefundsDetailPage = lazy(() => import('@/pages/finance/refunds-detail'));
const FinanceInvoicesDetailPage = lazy(() => import('@/pages/finance/invoices-detail'));
const FinanceBudgetsDetailPage = lazy(() => import('@/pages/finance/budgets-detail'));
const FinanceReportsDetailPage = lazy(() => import('@/pages/finance/reports-detail'));
const PharmacyDrugsDetailPage = lazy(() => import('@/pages/pharmacy/drugs-detail'));
const PharmacyStocksDetailPage = lazy(() => import('@/pages/pharmacy/stocks-detail'));
const PharmacyPurchasesDetailPage = lazy(() => import('@/pages/pharmacy/purchases-detail'));
const PharmacySuppliersDetailPage = lazy(() => import('@/pages/pharmacy/suppliers-detail'));
const PharmacyWarningsDetailPage = lazy(() => import('@/pages/pharmacy/warnings-detail'));
const PharmacyExpiryDetailPage = lazy(() => import('@/pages/pharmacy/expiry-detail'));
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
          <Route
            path="dashboard"
            element={
              <RequirePermission permission="dashboard:view">
                <Dashboard />
              </RequirePermission>
            }
          />
          {/* 院长数据驾驶舱（院长版）：登录即可，六大核心指标大屏 */}
          <Route path="dashboard/ceo-board" element={<CeoBoard />} />
          <Route path="patients" element={<RequirePermission permission="patient:view"><PatientList /></RequirePermission>} />
          <Route path="patients/:id" element={<PatientDetail />} />
          {/* 患者 360 综合时间线（M96-C） */}
          <Route path="patients/360/:id" element={<Patient360Timeline />} />
          {/* M470：患者统一时间线 P0 合规（跨域事件聚合） */}
          <Route path="patient/:id/timeline" element={<PatientTimelineM470Page />} />
          {/* M471：医生工作台待办中心（workflow 四端点聚合） */}
          <Route path="workflow/todo-center" element={<WorkflowTodoCenterM471Page />} />
          {/* M472：护理 NQI 与互联互通合规看板 */}
          <Route path="quality/compliance-board" element={<ComplianceBoardM472Page />} />
          {/* M473：病历质控看板 */}
          <Route path="quality/emr-quality-board" element={<EmrQualityBoardM473Page />} />
          {/* M474：CDS 临床决策支持看板 */}
          <Route path="clinical/cds-board" element={<CdsBoardM474Page />} />
          {/* M476：DRG/单病种经济运行看板 */}
          <Route path="quality/drg-board" element={<DrgBoardM476Page />} />
          {/* M478：安全与隐私合规看板 */}
          <Route path="security/board" element={<SecurityBoardM478Page />} />
          {/* M479：智慧服务三级运营总览 */}
          <Route path="smart-service/board" element={<SmartServiceBoardM479Page />} />
          {/* M480：医院运营实时大屏 */}
          <Route path="operation/dashboard" element={<OperationDashboardM480Page />} />
          {/* M481：院感与患者安全看板 */}
          <Route path="quality/infection-board" element={<InfectionBoardM481Page />} />
          {/* M482：全院合规总览驾驶舱 */}
          <Route path="compliance/hub" element={<ComplianceHubM482Page />} />
          {/* M483：医保与应急管理看板 */}
          <Route path="finance/insurance-board" element={<InsuranceBoardM483Page />} />
          {/* M484：药学管理看板 */}
          <Route path="pharmacy/board" element={<PharmacyBoardM484Page />} />
          {/* M485：科研管理看板 */}
          <Route path="research/board" element={<ResearchBoardM485Page />} />
          {/* M486：设备管理看板 */}
          <Route path="equipment/board" element={<EquipmentBoardM486Page />} />
          {/* M487：CSSD 消毒供应中心看板 */}
          <Route path="cssd/board" element={<CssdBoardM487Page />} />
          {/* M488：病案首页质量看板 */}
          <Route path="emr/homepage-board" element={<HomepageBoardM488Page />} />
          {/* M489：医技科室运营看板 */}
          <Route path="medtech/board" element={<MedtechBoardM489Page />} />
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
          {/* M198-D：风险管理 */}
          <Route path="admin/risk-management" element={<RiskManagement />} />
          {/* M199-A：用户体验 */}
          <Route path="admin/user-experience" element={<UserExperience />} />
          {/* M199-B：无障碍 */}
          <Route path="admin/accessibility" element={<Accessibility />} />
          {/* M199-C：适老化 */}
          <Route path="admin/elderly-friendly" element={<ElderlyFriendly />} />
          {/* M199-D：国际化 */}
          <Route path="admin/internationalization" element={<Internationalization />} />
          {/* M200-A：系统验收 */}
          <Route path="admin/acceptance" element={<Acceptance />} />
          {/* M200-B：文档 */}
          <Route path="admin/documentation" element={<Documentation />} />
          {/* M200-C：部署准备 */}
          <Route path="admin/deployment-readiness" element={<DeploymentReadiness />} />
          {/* M200-D：版本发布 */}
          <Route path="admin/release-m200" element={<ReleaseM200 />} />
          {/* M201-A：大模型集成 */}
          <Route path="admin/llm" element={<LLMIntegration />} />
          {/* M201-B：多 Agent */}
          <Route path="admin/multi-agent" element={<MultiAgent />} />
          {/* M201-C：专科 */}
          <Route path="specialty" element={<Specialty />} />
          {/* M201-D：生产运维 */}
          <Route path="admin/production-ops" element={<ProductionOps />} />
          {/* M202-A：康复老年 */}
          <Route path="specialty/rehabilitation" element={<Rehabilitation />} />
          {/* M202-B：精神心理 */}
          <Route path="specialty/psychiatry" element={<Psychiatry />} />
          {/* M202-C：中医 */}
          <Route path="specialty/tcm" element={<TCM />} />
          {/* M202-D：临床科研 */}
          <Route path="admin/clinical-research" element={<ClinicalResearch />} />
          {/* M203-A：ICU */}
          <Route path="specialty/icu" element={<ICU />} />
          {/* M203-B：介入内镜 */}
          <Route path="specialty/interventional" element={<Interventional />} />
          {/* M203-C：移植透析 */}
          <Route path="specialty/transplant" element={<Transplant />} />
          {/* M203-D：AI 影像病理 */}
          <Route path="specialty/ai-diagnosis" element={<AIDiagnosis />} />
          {/* M204-A：急诊 V3 */}
          <Route path="emergency/report-v3" element={<EmergencyV3 />} />
          {/* M204-B：手术 V3 */}
          <Route path="surgery/report-v3" element={<SurgeryV3 />} />
          {/* M204-C：药房 V3 */}
          <Route path="pharmacy/report-v3" element={<PharmacyV3 />} />
          {/* M204-D：检验检查 V3 */}
          <Route path="lab-imaging/report-v3" element={<LabImagingV3 />} />
          {/* M205-A：护理 V3 */}
          <Route path="nursing/report-v3" element={<NursingV3 />} />
          {/* M205-B：病案 V3 */}
          <Route path="medical-record/report-v3" element={<MedicalRecordV3 />} />
          {/* M205-C：医保 V3 */}
          <Route path="insurance/report-v3" element={<InsuranceV3 />} />
          {/* M205-D：等级评审 */}
          <Route path="admin/accreditation" element={<Accreditation />} />
          {/* M206-A：患者服务 V3 */}
          <Route path="patient-service/report-v3" element={<PatientServiceV3 />} />
          {/* M206-B：健康管理 V3 */}
          <Route path="health-management/report-v3" element={<HealthManagementV3 />} />
          {/* M206-C：区域医联体 */}
          <Route path="regional/report" element={<RegionalHealth />} />
          {/* M206-D：数据资产 V3 */}
          <Route path="data-asset/report-v3" element={<DataAssetV3 />} />
          {/* M207-A：运营 V3 */}
          <Route path="operations/report-v3" element={<OperationsV3 />} />
          {/* M207-B：科研 V3 */}
          <Route path="research/report-v3" element={<ResearchV3 />} />
          {/* M207-C：教学 V3 */}
          <Route path="education/report-v3" element={<EducationV3 />} />
          {/* M207-D：后勤 V3 */}
          <Route path="logistics/report-v3" element={<LogisticsV3 />} />
          {/* M208-A：AI 辅助 V2 */}
          <Route path="ai-assist/report-v2" element={<AIAssistV2 />} />
          {/* M208-B：智能预警 V2 */}
          <Route path="smart-alert/report-v2" element={<SmartAlertV2 />} />
          {/* M208-C：患者画像 V2 */}
          <Route path="patient-profile/report-v2" element={<PatientProfileV2 />} />
          {/* M208-D：知识图谱 V2 */}
          <Route path="knowledge-graph/report-v2" element={<KnowledgeGraphV2 />} />
          {/* M209-A：患者安全 V2 */}
          <Route path="patient-safety/report-v2" element={<PatientSafetyV2 />} />
          {/* M209-B：院感 V2 */}
          <Route path="infection-control/report-v2" element={<InfectionControlReportV2 />} />
          {/* M209-C：病历质量 V2 */}
          <Route path="mr-quality/report-v2" element={<MRQualityV2 />} />
          {/* M209-D：药品供应链 V2 */}
          <Route path="drug-supply/report-v2" element={<DrugSupplyV2 />} />
          {/* M210-A：智慧医院评价 */}
          <Route path="smart-hospital/report" element={<SmartHospital />} />
          {/* M210-B：互联互通 */}
          <Route path="interoperability/report" element={<Interoperability />} />
          {/* M210-C：EMR 评级 */}
          <Route path="emr-rating/report" element={<EMRRating />} />
          {/* M210-D：国考绩效 */}
          <Route path="hospital-kpi/report" element={<HospitalKPI />} />
          {/* M211-A：HRP V2 */}
          <Route path="hrp/report-v2" element={<HRPV2 />} />
          {/* M211-B：财务 V2 */}
          <Route path="finance/report-v2" element={<FinanceV2 />} />
          {/* M211-C：人力资源 V2 */}
          <Route path="hr/report-v2" element={<HRV2 />} />
          {/* M211-D：绩效 V2 */}
          <Route path="performance/report-v2" element={<PerformanceV2 />} />
          {/* M212-A：党建行政 */}
          <Route path="party-admin/report" element={<PartyAdmin />} />
          {/* M212-B：医务 V2 */}
          <Route path="medical-affairs/report-v2" element={<MedicalAffairsV2 />} />
          {/* M212-C：护理 V2 */}
          <Route path="nursing/report-v2" element={<NursingV2 />} />
          {/* M212-D：药事 V2 */}
          <Route path="pharmacy/report-v2" element={<PharmacyV2 />} />
          {/* M213-A：设备 V2 */}
          <Route path="equipment/report-v2" element={<EquipmentV2 />} />
          {/* M213-B：后勤安全 */}
          <Route path="logistics-safety/report" element={<LogisticsSafety />} />
          {/* M213-C：信息化 */}
          <Route path="informatization/report" element={<Informatization />} />
          {/* M213-D：文化品牌 */}
          <Route path="culture-brand/report" element={<CultureBrand />} />
          {/* M214-A：互联网医院 V2 */}
          <Route path="internet-hospital/report-v2" element={<InternetHospitalReportV2 />} />
          {/* M214-B：远程医疗 V2 */}
          <Route path="telemedicine/report-v2" element={<TelemedicineV2 />} />
          {/* M214-C：移动医疗 V2 */}
          <Route path="mobile-health/report-v2" element={<MobileHealthV2 />} />
          {/* M214-D：智慧药房 */}
          <Route path="smart-pharmacy/report" element={<SmartPharmacy />} />
          {/* M215-A：大数据 V2 */}
          <Route path="big-data/report-v2" element={<BigDataV2 />} />
          {/* M215-B：AI 中台 V2 */}
          <Route path="ai-platform/report-v2" element={<AIPlatformV2 />} />
          {/* M215-C：物联网 */}
          <Route path="iot/report" element={<IoTReport />} />
          {/* M215-D：区块链 */}
          <Route path="blockchain/report" element={<BlockchainReport />} />
          {/* M216-A：云原生 V2 */}
          <Route path="cloud-native/report-v2" element={<CloudNativeV2 />} />
          {/* M216-B：微服务 V2 */}
          <Route path="microservice/report-v2" element={<MicroserviceV2 />} />
          {/* M216-C：DevOps V2 */}
          <Route path="devops/report-v2" element={<DevOpsV2 />} />
          {/* M216-D：SRE */}
          <Route path="sre/report" element={<SREReport />} />
          {/* M217-A：数据安全 V2 */}
          <Route path="data-security/report-v2" element={<DataSecurityV2 />} />
          {/* M217-B：合规管理 */}
          <Route path="compliance/report" element={<ComplianceReport />} />
          {/* M217-C：审计管理 */}
          <Route path="audit/report" element={<AuditReport />} />
          {/* M217-D：风险管理 */}
          <Route path="risk/report" element={<RiskReport />} />
          {/* M218-A：患者体验 V2 */}
          <Route path="patient-experience/report-v2" element={<PatientExperienceV2 />} />
          {/* M218-B：员工体验 V2 */}
          <Route path="employee-experience/report-v2" element={<EmployeeExperienceV2 />} />
          {/* M218-C：流程优化 */}
          <Route path="process-optimization/report" element={<ProcessOptimization />} />
          {/* M218-D：智慧服务评级 */}
          <Route path="smart-service/report" element={<SmartServiceRating />} />
          {/* M219-A：学科建设 V2 */}
          <Route path="discipline/report-v2" element={<DisciplineV2 />} />
          {/* M219-B：人才队伍 V2 */}
          <Route path="talent/report-v2" element={<TalentV2 />} />
          {/* M219-C：科研创新 V2 */}
          <Route path="research/report-v2" element={<ResearchV2 />} />
          {/* M219-D：教学培训 V2 */}
          <Route path="teaching/report-v2" element={<TeachingV2 />} />
          {/* M220-A：后勤基建 V2 */}
          <Route path="logistics/report-v2" element={<LogisticsV2 />} />
          {/* M220-B：环境保护 */}
          <Route path="environment/report" element={<EnvironmentReport />} />
          {/* M220-C：营养膳食 */}
          <Route path="nutrition/report" element={<NutritionReport />} />
          {/* M220-D：安宁疗护 */}
          <Route path="hospice/report" element={<HospiceReport />} />
          {/* M221-A：传染病防控 V2 */}
          <Route path="infectious-disease/report-v2" element={<InfectiousDiseaseV2 />} />
          {/* M221-B：妇幼健康 V2 */}
          <Route path="maternal-child/report-v2" element={<MaternalChildV2 />} />
          {/* M221-C：老年健康 V2 */}
          <Route path="geriatrics/report-v2" element={<GeriatricsV2 />} />
          {/* M221-D：职业病防治 */}
          <Route path="occupational-health/report" element={<OccupationalHealth />} />
          {/* M222-A：康复医学 V2 */}
          <Route path="rehabilitation/report-v2" element={<RehabilitationV2 />} />
          {/* M222-B：健康管理 V2 */}
          <Route path="health-management/report-v2" element={<HealthManagementV2 />} />
          {/* M222-C：急救体系 V2 */}
          <Route path="emergency/report-v2" element={<EmergencyV2 />} />
          {/* M222-D：疼痛管理 */}
          <Route path="pain/report" element={<PainReport />} />
          {/* M223-A：检验中心 V2 */}
          <Route path="laboratory/report-v2" element={<LaboratoryV2 />} />
          {/* M223-B：影像中心 V2 */}
          <Route path="imaging/report-v2" element={<ImagingV2 />} />
          {/* M223-C：病理中心 V2 */}
          <Route path="pathology/report-v2" element={<PathologyV2 />} />
          {/* M223-D：功能检查中心 */}
          <Route path="functional/report" element={<FunctionalReport />} />
          {/* M224-A：手术中心 V2 */}
          <Route path="surgery/report-v2" element={<SurgeryV2 />} />
          {/* M224-B：麻醉中心 V2 */}
          <Route path="anesthesia/report-v2" element={<AnesthesiaV2 />} />
          {/* M224-C：输血管理 */}
          <Route path="transfusion/report" element={<TransfusionReport />} />
          {/* M224-D：重症医学 V2 */}
          <Route path="icu/report-v2" element={<ICUV2 />} />
          {/* M225-A：门诊管理 V2 */}
          <Route path="outpatient/report-v2" element={<OutpatientV2 />} />
          {/* M225-B：住院管理 V2 */}
          <Route path="inpatient/report-v2" element={<InpatientV2 />} />
          {/* M225-C：急诊管理 V2 */}
          <Route path="emergency/report-v2" element={<EmergencyMgmtV2 />} />
          {/* M225-D：病案管理 V2 */}
          <Route path="medical-record/report-v2" element={<MedRecordMgmtV2 />} />
          {/* M226-A：医保管理 V2 */}
          <Route path="insurance/report-v2" element={<InsuranceMgmtV2 />} />
          {/* M226-B：物价收费 V2 */}
          <Route path="pricing/report-v2" element={<PricingV2 />} />
          {/* M227-A：信息化规划 V2 */}
          <Route path="informatization/report-v2" element={<InformatizationPlanV2 />} />
          {/* M227-B：数据治理 V2 */}
          <Route path="data-governance/report-v2" element={<DataGovernanceV2 />} />
          {/* M227-C：网络安全 V2 */}
          <Route path="cybersecurity/report-v2" element={<CybersecurityV2 />} />
          {/* M227-D：运维管理 V2 */}
          <Route path="ops/report-v2" element={<OpsV2 />} />
          {/* M228-A：党建 V2 */}
          <Route path="party-building/report-v2" element={<PartyBuildingV2 />} />
          {/* M228-B：文化品牌 V2 */}
          <Route path="culture-brand/report-v2" element={<CultureBrandV2 />} />
          {/* M228-C：行政办公 V2 */}
          <Route path="administration/report-v2" element={<AdministrationV2 />} />
          {/* M228-D：工会群团 V2 */}
          <Route path="union/report-v2" element={<UnionV2 />} />
          {/* M229-A：应急管理 V2 */}
          <Route path="emergency-mgmt/report-v2" element={<EmergencyMgmtReportV2 />} />
          {/* M229-B：消防安保 V2 */}
          <Route path="fire-security/report-v2" element={<FireSecurityV2 />} />
          {/* M229-C：特种设备与危化品 */}
          <Route path="special-equip-hazmat/report" element={<SpecialEquipHazmatReport />} />
          {/* M229-D：院感控制 V3 */}
          <Route path="infection-control/report-v3" element={<InfectionControlV3 />} />
          {/* M230-A：高质量发展 V2 */}
          <Route path="high-quality-development/report-v2" element={<HighQualityDevelopmentV2 />} />
          {/* M230-B：等级评审 V3 */}
          <Route path="accreditation/report-v3" element={<AccreditationV3 />} />
          {/* M230-C：DRG/DIP V2 */}
          <Route path="drg-dip/report-v2" element={<DRGDIPV2 />} />
          {/* M230-D：学科评估 V3 */}
          <Route path="discipline-assessment/report-v3" element={<DisciplineAssessmentV3 />} />
          {/* M231-A：智慧医院 V3 */}
          <Route path="smart-hospital-v3/report" element={<SmartHospitalV3 />} />
          {/* M231-B：互联互通 V3 */}
          <Route path="interop-v3/report" element={<InteropV3 />} />
          {/* M231-C：EMR 评级 V3 */}
          <Route path="emr-rating-v3/report" element={<EMRRatingV3 />} />
          {/* M231-D：v4.0.0 里程碑 */}
          <Route path="v4-milestone/report" element={<V4Milestone />} />
          {/* M232-A：AI 大脑 V3 */}
          <Route path="ai-brain-v3/report" element={<AIBrainV3 />} />
          {/* M232-B：Personal Agent V3 */}
          <Route path="personal-agent-v3/report" element={<PersonalAgentV3 />} />
          {/* M232-C：数字孪生 */}
          <Route path="digital-twin/report" element={<DigitalTwin />} />
          {/* M232-D：区域健康大脑 */}
          <Route path="regional-brain/report" element={<RegionalBrain />} />
          {/* M233-A：患者服务智能化 V2 */}
          <Route path="patient-service-ai-v2/report" element={<PatientServiceAIV2 />} />
          {/* M233-B：临床科研智能化 V2 */}
          <Route path="clinical-research-ai-v2/report" element={<ClinicalResearchAIV2 />} />
          {/* M233-C：运营决策智能化 V2 */}
          <Route path="operations-ai-v2/report" element={<OperationsAIV2 />} />
          {/* M233-D：质量安全智能化 V2 */}
          <Route path="quality-safety-ai-v2/report" element={<QualitySafetyAIV2 />} />
          {/* M234-A：互联网医院 V3 */}
          <Route path="internet-hospital-v3/report" element={<InternetHospitalV3 />} />
          {/* M234-B：远程医疗 V3 */}
          <Route path="telemedicine-v3/report" element={<TelemedicineV3 />} />
          {/* M234-C：移动医疗 V3 */}
          <Route path="mobile-health-v3/report" element={<MobileHealthV3 />} />
          {/* M234-D：生态开放 */}
          <Route path="ecosystem-open/report" element={<EcosystemOpen />} />
          {/* M235-A：患者体验智能化 V2 */}
          <Route path="patient-experience-ai-v2/report" element={<PatientExperienceAIV2 />} />
          {/* M235-B：医护工作智能化 V2 */}
          <Route path="clinician-work-ai-v2/report" element={<ClinicianWorkAIV2 />} />
          {/* M235-C：数据中台智能化 V2 */}
          <Route path="data-platform-ai-v2/report" element={<DataPlatformAIV2 />} />
          {/* M235-D：安全运营智能化 V2 */}
          <Route path="security-ops-ai-v2/report" element={<SecurityOpsAIV2 />} />
          {/* M236-A：绿色医院 V2 */}
          <Route path="green-hospital/report" element={<GreenHospitalV2 />} />
          {/* M236-B：供应链 V2 */}
          <Route path="supply-chain-v2/report" element={<SupplyChainV2 />} />
          {/* M236-C：健康科普 */}
          <Route path="health-media/report" element={<HealthMedia />} />
          {/* M236-D：国际医疗 V2 */}
          <Route path="international-health-v2/report" element={<InternationalHealthV2 />} />
          {/* M237-A：AI 药物研发 */}
          <Route path="ai-drug/report" element={<AIDrugDiscovery />} />
          {/* M237-B：脑机接口与神经康复 */}
          <Route path="bci-neuro-rehab/report" element={<BCINeuroRehab />} />
          {/* M237-C：基因与精准医疗 */}
          <Route path="genomic-precision/report" element={<GenomicPrecision />} />
          {/* M237-D：元宇宙医院 */}
          <Route path="metaverse-hospital/report" element={<MetaverseHospital />} />
          {/* M238-A：CDSS V3 */}
          <Route path="cdss-v3/report" element={<CDSSV3 />} />
          {/* M238-B：影像 AI V3 */}
          <Route path="imaging-ai-v3/report" element={<ImagingAIV3 />} />
          {/* M238-C：病历智能 V3 */}
          <Route path="emr-intelligent-v3/report" element={<EMRIntelligentV3 />} />
          {/* M238-D：知识图谱 V3 */}
          <Route path="knowledge-graph-v3/report" element={<KnowledgeGraphV3 />} />
          {/* M239-A：预防医学 V3 */}
          <Route path="preventive-medicine-v3/report" element={<PreventiveMedicineV3 />} />
          {/* M239-B：妇幼全周期 V3 */}
          <Route path="maternal-child-lifecycle-v3/report" element={<MaternalChildLifecycleV3 />} />
          {/* M239-C：老年全周期 V3 */}
          <Route path="geriatrics-lifecycle-v3/report" element={<GeriatricsLifecycleV3 />} />
          {/* M239-D：职业环境 V3 */}
          <Route path="occupational-environmental-v3/report" element={<OccupationalEnvironmentalV3 />} />
          {/* M240-A：运营驾驶舱 V3 */}
          <Route path="ops-dashboard-v3/report" element={<OpsDashboardV3 />} />
          {/* M240-B：成本核算 V3 */}
          <Route path="cost-accounting-v3/report" element={<CostAccountingV3 />} />
          {/* M240-C：绩效 V3 */}
          <Route path="performance-v3/report" element={<PerformanceV3 />} />
          {/* M240-D：HRP V3 */}
          <Route path="hrp-v3/report" element={<HRPV3 />} />
          {/* M241-A：患者安全 V3 */}
          <Route path="patient-safety-v3/report" element={<PatientSafetyV3 />} />
          {/* M241-B：医疗质量 V3 */}
          <Route path="medical-quality-v3/report" element={<MedicalQualityV3 />} />
          {/* M241-C：护理质量 V3 */}
          <Route path="nursing-quality-v3/report" element={<NursingQualityV3 />} />
          {/* M241-D：患者体验 V3 */}
          <Route path="patient-experience-v3/report" element={<PatientExperienceV3 />} />
          {/* M242-A：学科建设 V3 */}
          <Route path="discipline-v3/report" element={<DisciplineV3 />} />
          {/* M242-B：人才队伍 V3 */}
          <Route path="talent-v3/report" element={<TalentV3 />} />
          {/* M242-C：科研创新 V3 */}
          <Route path="research-v3/report" element={<ResearchV3Page />} />
          {/* M242-D：教学培训 V3 */}
          <Route path="teaching-v3/report" element={<TeachingV3 />} />
          {/* M243-A：后勤保障 V3 */}
          <Route path="logistics-v3/report" element={<LogisticsV3Page />} />
          {/* M243-B：设备耗材 V3 */}
          <Route path="equipment-supply-v3/report" element={<EquipmentSupplyV3 />} />
          {/* M243-C：安全保卫 V3 */}
          <Route path="security-v3/report" element={<SecurityV3 />} />
          {/* M243-D：应急管理 V3 */}
          <Route path="emergency-mgmt-v3/report" element={<EmergencyMgmtV3 />} />
          {/* M244-A：信息化规划 V3 */}
          <Route path="informatization-v3/report" element={<InformatizationV3 />} />
          {/* M244-B：数据治理 V3 */}
          <Route path="data-governance-v3/report" element={<DataGovernanceV3 />} />
          {/* M244-C：网络安全 V3 */}
          <Route path="cybersecurity-v3/report" element={<CybersecurityV3 />} />
          {/* M244-D：运维管理 V3 */}
          <Route path="ops-v3/report" element={<OpsV3 />} />
          {/* M245-A：党建 V3 */}
          <Route path="party-building-v3/report" element={<PartyBuildingV3 />} />
          {/* M245-B：文化品牌 V3 */}
          <Route path="culture-brand-v3/report" element={<CultureBrandV3 />} />
          {/* M245-C：行政办公 V3 */}
          <Route path="administration-v3/report" element={<AdministrationV3 />} />
          {/* M245-D：工会群团 V3 */}
          <Route path="union-v3/report" element={<UnionV3 />} />
          {/* M246-A：绿色医院 V3 */}
          <Route path="green-hospital-v3/report" element={<GreenHospitalV3 />} />
          {/* M246-B：供应链 V3 */}
          <Route path="supply-chain-v3/report" element={<SupplyChainV3 />} />
          {/* M246-C：健康科普 V3 */}
          <Route path="health-media-v3/report" element={<HealthMediaV3 />} />
          {/* M246-D：国际医疗 V3 */}
          <Route path="international-health-v3/report" element={<InternationalHealthV3 />} />
          {/* M247-A：AI 药物 V2 */}
          <Route path="ai-drug-v2/report" element={<AIDrugV2 />} />
          {/* M247-B：脑机接口 V2 */}
          <Route path="bci-neuro-rehab-v2/report" element={<BCINeuroRehabV2 />} />
          {/* M247-C：基因精准 V2 */}
          <Route path="genomic-precision-v2/report" element={<GenomicPrecisionV2 />} />
          {/* M247-D：元宇宙医院 V2 */}
          <Route path="metaverse-hospital-v2/report" element={<MetaverseHospitalV2 />} />
          {/* M248-A：CDSS V4 */}
          <Route path="cdss-v4/report" element={<CDSSV4 />} />
          {/* M248-B：影像 AI V4 */}
          <Route path="imaging-ai-v4/report" element={<ImagingAIV4 />} />
          {/* M248-C：病历智能 V4 */}
          <Route path="emr-intelligent-v4/report" element={<EMRIntelligentV4 />} />
          {/* M248-D：知识图谱 V4 */}
          <Route path="knowledge-graph-v4/report" element={<KnowledgeGraphV4 />} />
          {/* M249-A：预防公卫 V4 */}
          <Route path="preventive-medicine-v4/report" element={<PreventiveMedicineV4 />} />
          {/* M249-B：妇幼 V4 */}
          <Route path="maternal-child-lifecycle-v4/report" element={<MaternalChildLifecycleV4 />} />
          {/* M249-C：老年 V4 */}
          <Route path="geriatrics-lifecycle-v4/report" element={<GeriatricsLifecycleV4 />} />
          {/* M249-D：职业环境 V4 */}
          <Route path="occupational-environmental-v4/report" element={<OccupationalEnvironmentalV4 />} />
          {/* M250-A：运营驾驶舱 V4 */}
          <Route path="ops-dashboard-v4/report" element={<OpsDashboardV4 />} />
          {/* M250-B：成本核算 V4 */}
          <Route path="cost-accounting-v4/report" element={<CostAccountingV4 />} />
          {/* M250-C：绩效 V4 */}
          <Route path="performance-v4/report" element={<PerformanceV4 />} />
          {/* M250-D：HRP V4 */}
          <Route path="hrp-v4/report" element={<HRPV4 />} />
          {/* M251-A：急诊 V4 */}
          <Route path="emergency-v4/report" element={<EmergencyV4 />} />
          {/* M251-B：手术麻醉 V4 */}
          <Route path="surgery-anesthesia-v4/report" element={<SurgeryAnesthesiaV4 />} />
          {/* M251-C：药房 V4 */}
          <Route path="pharmacy-v4/report" element={<PharmacyV4 />} />
          {/* M251-D：检验 V4 */}
          <Route path="laboratory-v4/report" element={<LaboratoryV4 />} />
          {/* M252-A：护理 V4 */}
          <Route path="nursing-v4/report" element={<NursingV4 />} />
          {/* M252-B：病案 V4 */}
          <Route path="medical-record-v4/report" element={<MedicalRecordV4 />} />
          {/* M252-C：医保 V4 */}
          <Route path="insurance-v4/report" element={<InsuranceV4 />} />
          {/* M252-D：门诊住院 V4 */}
          <Route path="outpatient-inpatient-v4/report" element={<OutpatientInpatientV4 />} />
          {/* M253-A：患者服务 V4 */}
          <Route path="patient-service-v4/report" element={<PatientServiceV4 />} />
          {/* M253-B：健康管理 V4 */}
          <Route path="health-management-v4/report" element={<HealthManagementV4 />} />
          {/* M253-C：区域医联体 V4 */}
          <Route path="regional-alliance-v4/report" element={<RegionalAllianceV4 />} />
          {/* M253-D：数据资产 V4 */}
          <Route path="data-asset-v4/report" element={<DataAssetV4 />} />
          {/* M254-A：运营分析 V4 */}
          <Route path="operations-analysis-v4/report" element={<OperationsAnalysisV4 />} />
          {/* M254-B：科研管理 V4 */}
          <Route path="research-management-v4/report" element={<ResearchManagementV4 />} />
          {/* M254-C：教学培训 V4 */}
          <Route path="teaching-training-v4/report" element={<TeachingTrainingV4 />} />
          {/* M254-D：后勤设备 V4 */}
          <Route path="logistics-equipment-v4/report" element={<LogisticsEquipmentV4 />} />
          {/* M255-A：AI 辅助诊断 V3 */}
          <Route path="ai-diagnosis-v3/report" element={<AIDiagnosisV3 />} />
          {/* M255-B：智能预警 V3 */}
          <Route path="intelligent-alert-v3/report" element={<IntelligentAlertV3 />} />
          {/* M255-C：患者画像 V3 */}
          <Route path="patient-profile-v3/report" element={<PatientProfileV3 />} />
          {/* M255-D：临床规则引擎 V3 */}
          <Route path="clinical-rule-engine-v3/report" element={<ClinicalRuleEngineV3 />} />
          {/* M256-A：患者安全 V3 */}
          <Route path="patient-safety-v3/report" element={<PatientSafetyV3 />} />
          {/* M256-B：院感控制 V3 */}
          <Route path="infection-control-v3/report" element={<InfectionControlV3Page />} />
          {/* M256-C：病历质量 V3（里程碑 v5.00.0） */}
          <Route path="record-quality-v3/report" element={<RecordQualityV3 />} />
          {/* M256-D：药品供应链 V3 */}
          <Route path="drug-supply-chain-v3/report" element={<DrugSupplyChainV3 />} />
          {/* M257-A：医院 OS 底座 V5 */}
          <Route path="hospital-os-v5/report" element={<HospitalOSV5 />} />
          {/* M257-B：Personal Agent 2.0 V5 */}
          <Route path="personal-agent-v5/report" element={<PersonalAgentV5 />} />
          {/* M257-C：AI 大脑 3.0 V5 */}
          <Route path="ai-brain-v5/report" element={<AIBrainV5 />} />
          {/* M257-D：数据飞轮 V5 */}
          <Route path="data-flywheel-v5/report" element={<DataFlywheelV5 />} />
          {/* M258-A：AI 门诊全流程闭环 V5 */}
          <Route path="outpatient-ai-loop-v5/report" element={<OutpatientAILoopV5 />} />
          {/* M258-B：AI 住院全流程闭环 V5 */}
          <Route path="inpatient-ai-loop-v5/report" element={<InpatientAILoopV5 />} />
          {/* M258-C：AI 手术全流程闭环 V5 */}
          <Route path="surgery-ai-loop-v5/report" element={<SurgeryAILoopV5 />} />
          {/* M258-D：AI 药事全流程闭环 V5 */}
          <Route path="pharmacy-ai-loop-v5/report" element={<PharmacyAILoopV5 />} />
          {/* M259-A：AI 科研助手 V5 */}
          <Route path="research-ai-v5/report" element={<ResearchAIV5 />} />
          {/* M259-B：AI 教学助手 V5 */}
          <Route path="teaching-ai-v5/report" element={<TeachingAIV5 />} />
          {/* M259-C：AI 患者陪伴 V5 */}
          <Route path="patient-companion-v5/report" element={<PatientCompanionV5 />} />
          {/* M259-D：AI 管理决策助手 V5 */}
          <Route path="management-ai-v5/report" element={<ManagementAIV5 />} />
          {/* M260-A：MLOps 模型工程 V5 */}
          <Route path="mlops-v5/report" element={<MLOpsV5 />} />
          {/* M260-B：数据 Mesh 与数据产品化 V5 */}
          <Route path="data-mesh-v5/report" element={<DataMeshV5 />} />
          {/* M260-C：云原生 SRE 深化 V5 */}
          <Route path="cloud-native-sre-v5/report" element={<CloudNativeSREV5 />} />
          {/* M260-D：医院开发者平台 V5 */}
          <Route path="dev-platform-v5/report" element={<DevPlatformV5 />} />
          {/* M261-A：零信任与身份安全 V5 */}
          <Route path="zero-trust-v5/report" element={<ZeroTrustV5 />} />
          {/* M261-B：隐私计算与数据要素流通 V5 */}
          <Route path="privacy-compute-v5/report" element={<PrivacyComputeV5 />} />
          {/* M261-C：适老化与无障碍服务 V5 */}
          <Route path="elderly-accessible-v5/report" element={<ElderlyAccessibleV5 />} />
          {/* M261-D：ESG 与可持续发展 V5 */}
          <Route path="esg-v5/report" element={<ESGV5 />} />
          {/* M262-A：互联网医院与处方流转 V5 */}
          <Route path="internet-hospital-v5/report" element={<InternetHospitalV5 />} />
          {/* M262-B：医联体分级诊疗智能化 V5 */}
          <Route path="medical-alliance-v5/report" element={<MedicalAllianceV5 />} />
          {/* M262-C：家庭医生签约服务 V5 */}
          <Route path="family-doctor-v5/report" element={<FamilyDoctorV5 />} />
          {/* M262-D：商业健康保险与惠民保 V5 */}
          <Route path="commercial-insurance-v5/report" element={<CommercialInsuranceV5 />} />
          {/* M263-A：胸痛中心智能化 V5 */}
          <Route path="chest-pain-center-v5/report" element={<ChestPainCenterV5 />} />
          {/* M263-B：卒中中心智能化 V5 */}
          <Route path="stroke-center-v5/report" element={<StrokeCenterV5 />} />
          {/* M263-C：创伤中心智能化 V5 */}
          <Route path="trauma-center-v5/report" element={<TraumaCenterV5 />} />
          {/* M263-D：危重症中心智能化 V5 */}
          <Route path="critical-care-center-v5/report" element={<CriticalCareCenterV5 />} />
          {/* M264-A：肿瘤全程管理 V5 */}
          <Route path="oncology-v5/report" element={<OncologyV5 />} />
          {/* M264-B：心血管疾病管理 V5 */}
          <Route path="cardiology-v5/report" element={<CardiologyV5 />} />
          {/* M264-C：呼吸系统疾病管理 V5 */}
          <Route path="pulmonology-v5/report" element={<PulmonologyV5 />} />
          {/* M264-D：内分泌代谢疾病管理 V5 */}
          <Route path="endocrinology-v5/report" element={<EndocrinologyV5 />} />
          {/* M265-A：消化系统疾病管理 V5 */}
          <Route path="gastroenterology-v5/report" element={<GastroenterologyV5 />} />
          {/* M265-B：肾病与血液净化管理 V5 */}
          <Route path="nephrology-v5/report" element={<NephrologyV5 />} />
          {/* M265-C：风湿免疫与过敏性疾病 V5 */}
          <Route path="rheumatology-v5/report" element={<RheumatologyV5 />} />
          {/* M265-D：神经与精神心理疾病 V5 */}
          <Route path="neuro-psych-v5/report" element={<NeuroPsychV5 />} />
          {/* M266-A：儿科与新生儿 V5 */}
          <Route path="pediatrics-v5/report" element={<PediatricsV5 />} />
          {/* M266-B：妇产科与围产 V5 */}
          <Route path="ob-gyn-v5/report" element={<ObGynV5 />} />
          {/* M266-C：皮肤与感染性疾病 V5 */}
          <Route path="derm-infectious-v5/report" element={<DermInfectiousV5 />} />
          {/* M266-D：眼科耳鼻喉口腔 V5 */}
          <Route path="ent-eye-dental-v5/report" element={<ENTEyeDentalV5 />} />
          {/* M267-A：国考绩效 55 指标 V5 */}
          <Route path="national-exam-v5/report" element={<NationalExamV5 />} />
          {/* M267-B：电子病历分级评价 0-8 级 V5 */}
          <Route path="emr-grade-v5/report" element={<EMRGradeV5 />} />
          {/* M267-C：互联互通标准化成熟度 V5 */}
          <Route path="interop-v5/report" element={<InteropV5 />} />
          {/* M267-D：智慧医院三位一体评级 V5 */}
          <Route path="smart-hospital-v5/report" element={<SmartHospitalV5 />} />
          {/* M268-A：智慧病房 IoT V5 */}
          <Route path="smart-ward-iot-v5/report" element={<SmartWardIoTV5 />} />
          {/* M268-B：医院机器人与自动化 V5 */}
          <Route path="hospital-robot-v5/report" element={<HospitalRobotV5 />} />
          {/* M268-C：5G与边缘计算 V5 */}
          <Route path="5g-edge-v5/report" element={<EdgeV5 />} />
          {/* M268-D：数字孪生可视化 V5 */}
          <Route path="digital-twin-v5/report" element={<DigitalTwinV5 />} />
          {/* M269-A：临床研究 RWD/RWE 平台 V5 */}
          <Route path="rwd-platform-v5/report" element={<RWDPlatformV5 />} />
          {/* M269-B：药物临床试验 GCP V5 */}
          <Route path="gcp-v5/report" element={<GCPV5 />} />
          {/* M269-C：生物样本库与科研数据 V5 */}
          <Route path="biobank-v5/report" element={<BiobankV5 />} />
          {/* M269-D：住培教学考核 OSCE V5 */}
          <Route path="residency-edu-v5/report" element={<ResidencyEducationV5 />} />
          {/* M270-A：院内智能导航 V5 */}
          <Route path="indoor-navigation-v5/report" element={<IndoorNavigationV5 />} />
          {/* M270-B：住院一站式服务 V5 */}
          <Route path="inpatient-onestop-v5/report" element={<InpatientOneStopV5 />} />
          {/* M270-C：多渠道服务整合 V5 */}
          <Route path="omnichannel-v5/report" element={<OmnichannelV5 />} />
          {/* M270-D：患者体验监测与改进 V5 */}
          <Route path="patient-experience-v5/report" element={<PatientExperienceV5 />} />
          {/* M271-A：电子票据与移动支付 V5 */}
          <Route path="e-invoice-payment-v5/report" element={<EInvoicePaymentV5 />} />
          {/* M271-B：信用就医先诊后付 V5 */}
          <Route path="credit-treatment-v5/report" element={<CreditTreatmentV5 />} />
          {/* M271-C：价格管理与收费合规 V5 */}
          <Route path="price-compliance-v5/report" element={<PriceComplianceV5 />} />
          {/* M271-D：对账清算与医保基金监管 V5 */}
          <Route path="reconciliation-fund-v5/report" element={<ReconciliationFundV5 />} />
          {/* M272-A：安宁疗护与缓和医疗 V5 */}
          <Route path="hospice-palliative-v5/report" element={<HospicePalliativeV5 />} />
          {/* M272-B：康复医学与日间康复 V5 */}
          <Route path="rehabilitation-v5/report" element={<RehabilitationV5 />} />
          {/* M272-C：临床营养与膳食治疗 V5 */}
          <Route path="clinical-nutrition-v5/report" element={<ClinicalNutritionV5 />} />
          {/* M272-D：心理心身与 EAP V5 */}
          <Route path="psych-eap-v5/report" element={<PsychEAPV5 />} />
          {/* M273-A：多院区一体化运行 V5 */}
          <Route path="multi-campus-v5/report" element={<MultiCampusV5 />} />
          {/* M273-B：集团财务人力物资 V5 */}
          <Route path="group-frh-v5/report" element={<GroupFRHV5 />} />
          {/* M273-C：集团质控与标准统一 V5 */}
          <Route path="group-qa-v5/report" element={<GroupQAV5 />} />
          {/* M273-D：集团患者转诊与资源调度 V5 */}
          <Route path="group-referral-v5/report" element={<GroupReferralV5 />} />
          {/* M274-A：健康体检中心智能化 V5 */}
          <Route path="health-checkup-v5/report" element={<HealthCheckupV5 />} />
          {/* M274-B：月子中心与产后康复 V5 */}
          <Route path="postpartum-care-v5/report" element={<PostpartumCareV5 />} />
          {/* M274-C：医美口腔健康消费 V5 */}
          <Route path="aesthetic-dental-v5/report" element={<AestheticDentalV5 />} />
          {/* M274-D：健康管理 VIP 服务 V5 */}
          <Route path="health-vip-v5/report" element={<HealthVIPV5 />} />
          {/* M275-A：MUSE 个人经验沉淀闭环 */}
          <Route path="muse-experience" element={<MUSEExperience />} />
          {/* M275-B：跨角色经验复用 */}
          <Route path="experience-share" element={<ExperienceShare />} />
          {/* M275-C：失败案例回灌学习飞轮 */}
          <Route path="failure-flywheel" element={<FailureFlywheel />} />
          {/* M275-D：经验图谱与后继者继承 */}
          <Route path="experience-graph" element={<ExperienceGraph />} />
          {/* M276-A：AI 建议全链路审计 */}
          <Route path="ai-advice-trace" element={<AIAdviceTrace />} />
          {/* M276-B：新知识自动入库与指南更新监测 */}
          <Route path="knowledge-intake" element={<KnowledgeIntake />} />
          {/* M276-C：虚拟病例演练与团队复盘 */}
          <Route path="drill-case" element={<DrillCase />} />
          {/* M276-D：医生能力画像与个性化学习路径 */}
          <Route path="competency-profile" element={<CompetencyProfile />} />
          {/* M277-A：门诊与手术量预测 V3 */}
          <Route path="volume-forecast" element={<VolumeForecast />} />
          {/* M277-B：床位需求与周转预测 V3 */}
          <Route path="bed-forecast" element={<BedForecast />} />
          {/* M277-C：耗材库存与供应预测 V3 */}
          <Route path="supply-forecast" element={<SupplyForecast />} />
          {/* M277-D：人力排班与调度优化 V3 */}
          <Route path="staff-schedule" element={<StaffSchedule />} />
          {/* M278-A：卫生健康统计与医改监测上报 V5 */}
          <Route path="reporting-stats" element={<ReportingStats />} />
          {/* M278-B：医保智能监管与 DRG/DIP 上报 V5 */}
          <Route path="insurance-report" element={<InsuranceReport />} />
          {/* M278-C：疾控传染病与慢病直报 V5 */}
          <Route path="cdc-notification" element={<CDCANotification />} />
          {/* M278-D：医院质量监测 HQMS V5 */}
          <Route path="hqms" element={<HQMS />} />
          {/* M279-A：被服洗涤与织物管理 V5 */}
          <Route path="linen-management" element={<LinenManagement />} />
          {/* M279-B：安保消防与应急指挥 V5 */}
          <Route path="security-emergency" element={<SecurityEmergency />} />
          {/* M279-C：设备预测性维护 V5 */}
          <Route path="predictive-maintenance" element={<PredictiveMaintenance />} />
          {/* M279-D：能源碳排放与绿色医院 V5 */}
          <Route path="energy-carbon" element={<EnergyCarbon />} />
          {/* M280-A：多模型路由与降级 V5 */}
          <Route path="model-router" element={<ModelRouter />} />
          {/* M280-B：Prompt 工程与模板治理 V5 */}
          <Route path="prompt-governance" element={<PromptGovernance />} />
          {/* M280-C：RAG 知识库检索优化 V5 */}
          <Route path="rag-tuning" element={<RagTuning />} />
          {/* M280-D：大模型微调与人在环反馈 V5 */}
          <Route path="finetune-loop" element={<FinetuneLoop />} />
          {/* M281-A：FHIR 资源建模与网关 V5 */}
          <Route path="fhir-gateway" element={<FhirGateway />} />
          {/* M281-B：HL7 / WS363 标准对接升级 V5 */}
          <Route path="hl7-integration" element={<Hl7Integration />} />
          {/* M281-C：院间数据共享授权 V5 */}
          <Route path="data-sharing" element={<DataSharing />} />
          {/* M281-D：第三方应用市场集成 V5 */}
          <Route path="app-store" element={<AppStore />} />
          {/* M282-A：数据分级分类与动态脱敏 V5 */}
          <Route path="data-classification" element={<DataClassification />} />
          {/* M282-B：零信任访问与权限最小化 V5 */}
          <Route path="zero-trust" element={<ZeroTrust />} />
          {/* M282-C：操作审计与数据防泄漏 DLP V5 */}
          <Route path="dlp" element={<Dlp />} />
          {/* M282-D：隐私计算与联邦学习 V5 */}
          <Route path="federated-learning" element={<FederatedLearning />} />
          {/* M283-A：医生 MUSE 工作台 V5 */}
          <Route path="muse-doctor" element={<MuseDoctor />} />
          {/* M283-B：护士 MUSE 工作台 V5 */}
          <Route path="muse-nurse" element={<MuseNurse />} />
          {/* M283-C：药师 MUSE 工作台 V5 */}
          <Route path="muse-pharmacist" element={<MusePharmacist />} />
          {/* M283-D：管理者 MUSE 工作台 V5 */}
          <Route path="muse-manager" element={<MuseManager />} />
          {/* M284-A：患者 MUSE 助手 V5 */}
          <Route path="muse-patient" element={<MusePatient />} />
          {/* M284-B：MUSE 跨角色任务流转 V5 */}
          <Route path="muse-handoff" element={<MuseHandoff />} />
          {/* M284-C：MUSE 主动提醒引擎 V5 */}
          <Route path="muse-reminder" element={<MuseReminder />} />
          {/* M284-D：MUSE 能力市场与可插拔技能 V5 */}
          <Route path="muse-skills" element={<MuseSkills />} />
          {/* M285-A：MUSE 采纳率与使用度量 V5 */}
          <Route path="muse-value" element={<MuseValue />} />
          {/* M285-B：MUSE 错误拦截与风险避免 V5 */}
          <Route path="muse-interception" element={<MuseInterception />} />
          {/* M285-C：MUSE A/B 测试与效果评估 V5 */}
          <Route path="muse-ab" element={<MuseAb />} />
          {/* M285-D：MUSE 成本与 ROI 分析 V5 */}
          <Route path="muse-roi" element={<MuseRoi />} />
          {/* M286-A：全链路监控与告警 V5 */}
          <Route path="ops-monitoring" element={<OpsMonitoring />} />
          {/* M286-B：灰度发布与回滚 V5 */}
          <Route path="ops-release" element={<OpsRelease />} />
          {/* M286-C：性能与容量压测 V5 */}
          <Route path="ops-perf" element={<OpsPerf />} />
          {/* M286-D：灾备与高可用 V5 */}
          <Route path="ops-dr" element={<OpsDr />} />
          {/* M287-A：院长驾驶舱 V5 */}
          <Route path="exec-dashboard" element={<ExecDashboard />} />
          {/* M287-B：科室运营画像 V5 */}
          <Route path="dept-profile" element={<DeptProfile />} />
          {/* M287-C：病种/DRG 经营分析 V5 */}
          <Route path="drg-analysis" element={<DrgAnalysis />} />
          {/* M287-D：趋势预测与经营预警 V5 */}
          <Route path="trend-forecast" element={<TrendForecast />} />
          {/* M288-A：智能审批与工作流引擎 V6 */}
          <Route path="workflow" element={<Workflow />} />
          {/* M288-B：通用表单引擎 V6 */}
          <Route path="form-engine" element={<FormEngine />} />
          {/* M288-D：流程监控与效率分析 V6 */}
          <Route path="workflow-monitor" element={<WorkflowMonitor />} />
          {/* M289-A：处方前置审核规则引擎 V7 */}
          <Route path="cds" element={<Cds />} />
          {/* M289-B：处方点评与药师反馈 V7 */}
          <Route path="review" element={<Review />} />
          {/* M289-C：用药知识沉淀与反馈学习 V7 */}
          <Route path="cds-learning" element={<CdsLearning />} />
          {/* M289-D：患者用药教育与依从性随访 V7 */}
          <Route path="med-adherence" element={<MedAdherence />} />
          {/* M290-A：医生 Personal Agent 工作台 V8 */}
          <Route path="agent-doctor" element={<AgentDoctor />} />
          {/* M290-B：护士 Personal Agent（Nurse MUSE）工作台 V8 */}
          <Route path="agent-nurse" element={<AgentNurse />} />
          {/* M290-C：药师 Personal Agent（Pharma MUSE）工作台 V8 */}
          <Route path="agent-pharma" element={<AgentPharma />} />
          {/* M290-D：管理者 Personal Agent（Manager MUSE）工作台 V8 */}
          <Route path="agent-manager" element={<AgentManager />} />
          {/* M291-A：Agent 反馈与经验沉淀 V8 */}
          <Route path="agent-learning" element={<AgentLearning />} />
          {/* M291-B：从反馈沉淀个性化推荐规则 V9 */}
          <Route path="agent-rules" element={<AgentRules />} />
          {/* M291-C：Doctor MUSE 个人经验沉淀闭环 V9 */}
          <Route path="case-lesson" element={<CaseLesson />} />
          {/* M291-D：跨角色经验复用与学习飞轮 V9 */}
          <Route path="learning-flywheel" element={<LearningFlywheelPage />} />
          {/* M292-A：失败案例根因复盘与防再发机制 V10 */}
          <Route path="failure-postmortem" element={<FailurePostmortem />} />
          {/* M292-B：成功案例蒸馏与最佳实践库 V10 */}
          <Route path="best-practice" element={<BestPractice />} />
          {/* M292-C：个人知识图谱与继任者交接 V10 */}
          <Route path="knowledge" element={<Knowledge />} />
          {/* M292-D：医院级 AI 知识资产大盘 V10 */}
          <Route path="knowledge-dashboard" element={<KnowledgeDashboard />} />
          {/* M293-A：DOCTOR_MUSE 主动式晨间简报 V11 */}
          <Route path="morning-brief" element={<MorningBrief />} />
          {/* M293-B：NURSE_MUSE 主动式交接班简报 V11 */}
          <Route path="shift-brief" element={<ShiftBrief />} />
          {/* M293-C：PHARMA_MUSE 主动式晨会简报 V11 */}
          <Route path="pharma-brief" element={<PharmaBrief />} />
          {/* M293-D：MANAGER_MUSE 主动式周会简报 V11 */}
          <Route path="manager-brief" element={<ManagerBrief />} />
          {/* M294-A：智能体采纳率反馈看板 V12 */}
          <Route path="agent-adoption" element={<AgentAdoption />} />
          {/* M294-B：低采纳率规则自动复训提示 V12 */}
          <Route path="retrain-tasks" element={<RetrainTasks />} />
          {/* M294-C：智能体健康度评分 V12 */}
          <Route path="agent-health" element={<AgentHealth />} />
          {/* M294-D：反馈闭环总览 V12 */}
          <Route path="feedback-loop" element={<FeedbackLoop />} />
          {/* M295-A：跨角色经验安全复用 V13 */}
          <Route path="cross-role-experience" element={<CrossRoleExperience />} />
          {/* M295-B：经验推送频控与免打扰 V13 */}
          <Route path="experience-push" element={<ExperiencePush />} />
          {/* M295-C：患者侧经验转健康提示 V13 */}
          <Route path="patient-tips" element={<PatientTips />} />
          {/* M295-D：经验复用效果度量 V13 */}
          <Route path="reuse-roi" element={<ReuseRoi />} />
          {/* M296-A：经验时间衰减与新鲜度 V13 */}
          <Route path="experience-freshness" element={<ExperienceFreshness />} />
          {/* M296-B：过期经验复核工作流 V13 */}
          <Route path="experience-review" element={<ExperienceReview />} />
          {/* M296-C：经验更新与版本迭代 V13 */}
          <Route path="experience-versions" element={<ExperienceVersions />} />
          {/* M296-D：知识资产生命周期总览 V13 */}
          <Route path="knowledge-lifecycle" element={<KnowledgeLifecycle />} />
          {/* M297-A：继任者经验传承交接 V13 */}
          <Route path="handover" element={<Handover />} />
          {/* M297-B：交接后继任者学习计划 V13 */}
          <Route path="learning-plan" element={<LearningPlan />} />
          {/* M297-C：离任医生知识资产保留 V13 */}
          <Route path="public-knowledge" element={<PublicKnowledge />} />
          {/* M297-D：传承效果度量与院长报告 V13 */}
          <Route path="succession-report" element={<SuccessionReport />} />
          {/* M298-A：专家经验贡献激励 V13 */}
          <Route path="contribution-leaderboard" element={<ContributionLeaderboard />} />
          {/* M298-B：贡献荣誉墙与月度之星 V13 */}
          <Route path="honor-wall" element={<HonorWall />} />
          {/* M298-C：新手医生孵化与导师匹配 V13 */}
          <Route path="mentor-match" element={<MentorMatch />} />
          {/* M298-D：知识贡献生态总览 V13 */}
          <Route path="ecosystem-dashboard" element={<EcosystemDashboard />} />
          {/* M299-A：经验质量同行评审 V13 */}
          <Route path="review-queue" element={<ReviewQueue />} />
          {/* M299-B：错误经验拦截与回滚 V13 */}
          <Route path="rollback" element={<Rollback />} />
          {/* M299-C：评审专家资质与激励 V13 */}
          <Route path="reviewer-roster" element={<ReviewerRoster />} />
          {/* M299-D：质量门禁总览 V13 */}
          <Route path="quality-gate" element={<QualityGate />} />
          {/* M300-A：经验与临床结局关联 V13 */}
          <Route path="experience-outcome" element={<ExperienceOutcome />} />
          {/* M300-B：疗效证据反哺规则权重 V13 */}
          <Route path="evidence-rules" element={<EvidenceRules />} />
          {/* M300-C：反向证据熔断 V13 */}
          <Route path="circuit-breaker" element={<CircuitBreaker />} />
          {/* M300-D：疗效证据总览 V13 */}
          <Route path="evidence-overview" element={<EvidenceOverview />} />
          {/* M301-A：医生显式反馈闭环 V13 */}
          <Route path="feedback" element={<Feedback />} />
          {/* M301-B：修改点归因与经验补丁 V13 */}
          <Route path="experience-patches" element={<ExperiencePatches />} />
          {/* M301-C：反馈信号看板与趋势 V13 */}
          <Route path="feedback-trend" element={<FeedbackTrend />} />
          {/* M301-D：反馈闭环总览 V13 */}
          <Route path="feedback-loop-overview" element={<FeedbackLoopOverview />} />
          {/* M302-A：经验精准主动推送 V13 */}
          <Route path="contextual-push" element={<ContextualPush />} />
          {/* M302-B：推送时机与场景触发 V13 */}
          <Route path="push-scene" element={<PushScene />} />
          {/* M302-C：推送频控与免打扰 V13 */}
          <Route path="push-quota" element={<PushQuota />} />
          {/* M302-D：推送效果与闭环总览 V13 */}
          <Route path="push-effect-overview" element={<PushEffectOverview />} />
          {/* M303-A：推送个人化学习 V13 */}
          <Route path="doctor-preference" element={<DoctorPreference />} />
          {/* M303-B：相似医生协同推荐 V13 */}
          <Route path="look-alike" element={<LookAlike />} />
          {/* M303-C：个人学习曲线 V13 */}
          <Route path="learning-curve" element={<LearningCurve />} />
          {/* M303-D：个人化学习效果总览 V13 */}
          <Route path="personalized-learning-overview" element={<PersonalizedLearningOverview />} />
          {/* M304-A：跨科室经验扩散 V13 */}
          <Route path="cross-dept-broadcast" element={<CrossDeptBroadcast />} />
          {/* M304-B：跨科室采纳反馈 V13 */}
          <Route path="diffusion-adoption" element={<DiffusionAdoption />} />
          {/* M304-C：扩散网络图谱 V13 */}
          <Route path="diffusion-graph" element={<DiffusionGraph />} />
          {/* M304-D：跨科室扩散总览 V13 */}
          <Route path="diffusion-overview" element={<DiffusionOverview />} />
          {/* M305-A：经验资产运营与退役 V13 */}
          <Route path="experience-asset" element={<ExperienceAsset />} />
          {/* M305-B：资产盘点周期 V13 */}
          <Route path="asset-audit" element={<AssetAudit />} />
          {/* M305-C：退役经验存档与复用 V13 */}
          <Route path="archived-experience" element={<ArchivedExperience />} />
          {/* M305-D：经验资产生命周期总览 V13 */}
          <Route path="asset-lifecycle-overview" element={<AssetLifecycleOverview />} />
          {/* M306-A：医院 AI 学习飞轮成熟度 V13 */}
          <Route path="flywheel-score" element={<FlywheelScore />} />
          {/* M306-B：六维指标明细下钻 V13 */}
          <Route path="flywheel-drilldown" element={<FlywheelDrilldown />} />
          {/* M306-C：飞轮改进建议 V13 */}
          <Route path="flywheel-recommendation" element={<FlywheelRecommendation />} />
          {/* M306-D：飞轮季度演进趋势 V13 */}
          <Route path="flywheel-trend" element={<FlywheelTrend />} />
          {/* M307-A：飞轮改进任务闭环 V13 */}
          <Route path="flywheel-tasks" element={<FlywheelTasks />} />
          {/* M307-B：任务进度追踪与升级 V13 */}
          <Route path="task-funnel" element={<TaskFunnel />} />
          {/* M307-C：任务验收与效果验证 V13 */}
          <Route path="task-verification" element={<TaskVerification />} />
          {/* M307-D：闭环回灌飞轮 V13 */}
          <Route path="closed-loop-overview" element={<ClosedLoopOverview />} />
          {/* M308-A：科室任务看板 V13 */}
          <Route path="dept-task-board" element={<DeptTaskBoard />} />
          {/* M308-B：科室任务详情与督办 V13 */}
          <Route path="dept-task-detail/:id" element={<DeptTaskDetail />} />
          {/* M308-C：科室经验 SOP 沉淀 V13 */}
          <Route path="dept-sop" element={<DeptSop />} />
          {/* M308-D：科际协作与经验共享总览 V13 */}
          <Route path="dept-collab-overview" element={<DeptCollabOverview />} />
          {/* M308-D（新规格）：科室间任务协作总览 V13 */}
          <Route path="dept-task-collab" element={<DeptTaskCollab />} />
          {/* M309-A：改进建议采纳率追踪 V13 */}
          <Route path="suggestion-adoption" element={<SuggestionAdoption />} />
          {/* M309-B：SOP 引用次数回灌飞轮分 V13 */}
          <Route path="sop-usage" element={<SopUsage />} />
          {/* M309-C：跨科协作任务经验双沉淀 V13 */}
          <Route path="cross-dept-learning" element={<CrossDeptLearning />} />
          {/* M309-D：个人学习曲线里程碑 V13 */}
          <Route path="learning-milestone" element={<LearningMilestone />} />
          {/* M310-A：综合学习飞轮健康度仪表盘 V13 */}
          <Route path="flywheel-health" element={<FlywheelHealth />} />
          {/* M310-B：多科室横向对标 V13 */}
          <Route path="dept-benchmark" element={<DeptBenchmark />} />
          {/* M310-C：医生个人月度成长报告 V13 */}
          <Route path="doctor-growth-report" element={<DoctorGrowthReport />} />
          {/* M310-D：院长季度复盘报告 V13 */}
          <Route path="quarterly-review" element={<QuarterlyReview />} />
          {/* M311-A：患者满意度闭环 V13 */}
          <Route path="patient-satisfaction" element={<PatientSatisfaction />} />
          {/* M311-B：医护工作量与疲劳度监测 V13 */}
          <Route path="staff-workload" element={<StaffWorkload />} />
          {/* M311-C：不良事件根因分析 RCA 辅助 V13 */}
          <Route path="quality-event-rca" element={<QualityEventRca />} />
          {/* M311-D：院长指挥中心一屏总览 V13 */}
          <Route path="dean-command-center" element={<DeanCommandCenter />} />
          {/* M312-A：床位占用预测 V13 */}
          <Route path="bed-occupancy-forecast" element={<BedOccupancyForecast />} />
          {/* M312-B：药房库存预警 V13 */}
          <Route path="pharmacy-inventory-alert" element={<PharmacyInventoryAlert />} />
          {/* M312-C：手术排程冲突检测 V13 */}
          <Route path="ot-scheduling-conflict" element={<OtSchedulingConflict />} />
          {/* M312-D：急诊容量预警 V13 */}
          <Route path="emergency-capacity" element={<EmergencyCapacity />} />
          {/* M313-A：DRG 费用超支预警 V13 */}
          <Route path="drg-cost-overrun" element={<DrgCostOverrun />} />
          {/* M313-B：门诊流量预测与分时段建议 V13 */}
          <Route path="outpatient-flow-forecast" element={<OutpatientFlowForecast />} />
          {/* M313-C：医疗设备维保到期提醒 V13 */}
          <Route path="equipment-maintenance" element={<EquipmentMaintenance />} />
          {/* M313-D：院感暴发早期预警 V13 */}
          <Route path="infection-outbreak" element={<InfectionOutbreak />} />
          {/* M314-A：门诊爽约率分析 V13 */}
          <Route path="no-show-rate" element={<NoShowRate />} />
          {/* M314-B：31 天再入院风险预测 V13 */}
          <Route path="readmission-risk" element={<ReadmissionRisk />} />
          {/* M314-C：出院用药重整 V13 */}
          <Route path="medication-reconciliation" element={<MedicationReconciliation />} />
          {/* M314-D：出院小结质量评分 V13 */}
          <Route path="discharge-summary-quality" element={<DischargeSummaryQuality />} />
          {/* M315-A：ICD 编码辅助推荐 V13 */}
          <Route path="icd-coding-assist" element={<IcdCodingAssist />} />
          {/* M315-B：医嘱套餐规范 V13 */}
          <Route path="order-set-compliance" element={<OrderSetCompliance />} />
          {/* M315-C：转科交接单完整度评分 V13 */}
          <Route path="transfer-summary-completeness" element={<TransferSummaryCompleteness />} />
          {/* M315-D：护理交班质量 V13 */}
          <Route path="nursing-handover" element={<NursingHandover />} />
          {/* M316-A：出院随访依从性 V13 */}
          <Route path="follow-up-adherence" element={<FollowUpAdherence />} />
          {/* M316-B：慢病管理达标率 V13 */}
          <Route path="chronic-disease-mgmt" element={<ChronicDiseaseMgmt />} />
          {/* M316-C：健教材料推送统计 V13 */}
          <Route path="health-education-push" element={<HealthEducationPush />} />
          {/* M316-D：患者门户使用度 V13 */}
          <Route path="patient-portal-usage" element={<PatientPortalUsage />} />
          {/* M317-A：门诊次均费用 V13 */}
          <Route path="outpatient-avg-cost" element={<OutpatientAvgCost />} />
          {/* M317-B：住院床日成本 V13 */}
          <Route path="inpatient-bed-day-cost" element={<InpatientBedDayCost />} />
          {/* M317-C：采购周期预警 V13 */}
          <Route path="procurement-lead-time" element={<ProcurementLeadTime />} />
          {/* M317-D：人员流失率 V13 */}
          <Route path="staff-turnover" element={<StaffTurnover />} />
          {/* M318-A：病历书写及时性 V13 */}
          <Route path="medical-record-timeliness" element={<MedicalRecordTimeliness />} />
          {/* M318-B：处方点评合格率 V13 */}
          <Route path="prescription-audit" element={<PrescriptionAudit />} />
          {/* M318-C：手卫生依从性 V13 */}
          <Route path="hand-hygiene-compliance" element={<HandHygieneCompliance />} />
          {/* M318-D：数据访问审计异常 V13 */}
          <Route path="data-access-audit" element={<DataAccessAudit />} />
          {/* M319-A：Doctor MUSE 使用统计 V13 */}
          <Route path="doctor-muse-usage" element={<DoctorMuseUsage />} />
          {/* M319-B：MUSE 建议采纳反馈 V13 */}
          <Route path="muse-feedback" element={<MuseFeedback />} />
          {/* M319-C：病历知识自动关联 V13 */}
          <Route path="knowledge-link" element={<KnowledgeLink />} />
          {/* M319-D：个人智能体训练数据沉淀 V13 */}
          <Route path="muse-training-data" element={<MuseTrainingData />} />
          {/* M320-A：护士个人智能体使用统计 V13 */}
          <Route path="nurse-muse-usage" element={<NurseMuseUsage />} />
          {/* M320-B：药师个人智能体使用统计 V13 */}
          <Route path="pharmacist-muse-usage" element={<PharmacistMuseUsage />} />
          {/* M320-C：行政个人智能体使用统计 V13 */}
          <Route path="admin-muse-usage" element={<AdminMuseUsage />} />
          {/* M320-D：患者个人智能体使用统计 V13 */}
          <Route path="patient-muse-usage" element={<PatientMuseUsage />} />
          {/* M321-A：五角色 MUSE 飞轮总览 V13 */}
          <Route path="muse-flywheel-overview" element={<MuseFlywheelOverview />} />
          {/* M321-B：跨角色经验互鉴 V13 */}
          <Route path="muse-cross-role-learning" element={<MuseCrossRoleLearning />} />
          {/* M321-C：模型版本迭代记录 V13 */}
          <Route path="muse-model-version" element={<MuseModelVersion />} />
          {/* M321-D：MUSE 投入产出报告 V13 */}
          <Route path="muse-roi-report" element={<MuseRoiReport />} />
          {/* M322-A：医疗质量总仪表盘 V13 */}
          <Route path="clinical-quality-dashboard" element={<ClinicalQualityDashboard />} />
          {/* M322-B：患者安全事件总览 V13 */}
          <Route path="patient-safety-overview" element={<PatientSafetyOverview />} />
          {/* M322-C：员工满意度 V13 */}
          <Route path="staff-satisfaction" element={<StaffSatisfaction />} />
          {/* M322-D：医院运营效率 V13 */}
          <Route path="hospital-efficiency" element={<HospitalEfficiency />} />
          {/* M323-A：电子病历五级评级自评 V13 */}
          <Route path="emr5-level" element={<Emr5Level />} />
          {/* M323-B：互联互通四甲自评 V13 */}
          <Route path="intercon4-level" element={<Intercon4Level />} />
          {/* M323-C：智慧医院评级自评 V13 */}
          <Route path="smart-hospital-rating" element={<SmartHospitalRating />} />
          {/* M323-D：数据治理成熟度 V13 */}
          <Route path="data-governance-maturity" element={<DataGovernanceMaturity />} />
          {/* M324-A：区域健康数据汇总 V13 */}
          <Route path="regional-health-data" element={<RegionalHealthData />} />
          {/* M324-B：基层医疗协同 V13 */}
          <Route path="grassroots-medical" element={<GrassrootsMedical />} />
          {/* M324-C：远程会诊量 V13 */}
          <Route path="telemedicine-overview" element={<TelemedicineOverview />} />
          {/* M324-D：公共卫生应急 V13 */}
          <Route path="public-health-emergency" element={<PublicHealthEmergency />} />
          {/* M325-A：影像 AI 使用统计 V13 */}
          <Route path="imaging-ai-usage" element={<ImagingAiUsage />} />
          {/* M325-B：检验 AI 使用统计 V13 */}
          <Route path="lab-ai-usage" element={<LabAiUsage />} />
          {/* M325-C：AI 模型漂移监控 V13 */}
          <Route path="ai-model-drift" element={<AiModelDrift />} />
          {/* M325-D：AI 治理台账 V13 */}
          <Route path="ai-governance" element={<AiGovernance />} />
          {/* M326-A：患者等候时长 V13 */}
          <Route path="patient-wait-time" element={<PatientWaitTime />} />
          {/* M326-B：患者投诉处理 V13 */}
          <Route path="patient-complaint" element={<PatientComplaint />} />
          {/* M326-C：随访完成率 V13 */}
          <Route path="patient-follow-up" element={<PatientFollowUp />} />
          {/* M326-D：健教材料推送 V13 */}
          <Route path="patient-education-stats" element={<PatientEducationStats />} />
          {/* M327-A：临床研究项目 V13 */}
          <Route path="clinical-research-overview" element={<ClinicalResearchOverview />} />
          {/* M327-B：教学医院指标 V13 */}
          <Route path="teaching-hospital" element={<TeachingHospital />} />
          {/* M327-C：继续教育学分 V13 */}
          <Route path="continuing-education" element={<ContinuingEducation />} />
          {/* M327-D：医学文献检索 V13 */}
          <Route path="medical-literature" element={<MedicalLiterature />} />
          {/* M328-A：设备运维 V13 */}
          <Route path="equipment-ops-overview" element={<EquipmentOpsOverview />} />
          {/* M328-B：耗材库存 V13 */}
          <Route path="consumable-inventory" element={<ConsumableInventory />} />
          {/* M328-C：药品库存 V13 */}
          <Route path="pharmacy-inventory" element={<PharmacyInventory />} />
          {/* M328-D：血库库存 V13 */}
          <Route path="blood-inventory" element={<BloodInventory />} />
          {/* M329-A：医保对账 V13 */}
          <Route path="billing-reconciliation" element={<BillingReconciliation />} />
          {/* M329-B：单病种成本 V13 */}
          <Route path="cost-per-patient" element={<CostPerPatient />} />
          {/* M329-C：收入结构 V13 */}
          <Route path="revenue-structure" element={<RevenueStructure />} />
          {/* M329-D：医保结算 V13 */}
          <Route path="insurance-settlement" element={<InsuranceSettlement />} />
          {/* M330-A：医生工作量 V13 */}
          <Route path="doctor-workload" element={<DoctorWorkload />} />
          {/* M330-B：护士工作量 V13 */}
          <Route path="nurse-workload" element={<NurseWorkload />} />
          {/* M330-C：员工净流失率 V13 */}
          <Route path="staff-turnover-net" element={<StaffTurnoverNet />} />
          {/* M330-D：培训时长 V13 */}
          <Route path="training-hours" element={<TrainingHours />} />
          {/* M331-A：病房床位使用率 V13 */}
          <Route path="ward-occupancy" element={<WardOccupancy />} />
          {/* M331-B：手术室利用率 V13 */}
          <Route path="operating-room" element={<OperatingRoom />} />
          {/* M331-C：电梯等候时间 V13 */}
          <Route path="elevator-wait-time" element={<ElevatorWaitTime />} />
          {/* M331-D：停车场使用率 V13 */}
          <Route path="parking" element={<Parking />} />
          {/* M332-A：患者满意度调研 V13 */}
          <Route path="patient-satisfaction-survey" element={<PatientSatisfactionSurvey />} />
          {/* M332-B：医生满意度调研 V13 */}
          <Route path="doctor-satisfaction" element={<DoctorSatisfaction />} />
          {/* M332-C：护士满意度调研 V13 */}
          <Route path="nurse-satisfaction" element={<NurseSatisfaction />} />
          {/* M332-D：员工满意度总览 V13 */}
          <Route path="staff-satisfaction-overview" element={<StaffSatisfactionOverview />} />
          {/* M333-A：临床路径执行率 V13 */}
          <Route path="clinical-pathway-overview" element={<ClinicalPathwayOverview />} />
          {/* M333-B：指南依从性 V13 */}
          <Route path="guideline-compliance" element={<GuidelineCompliance />} />
          {/* M333-C：抗菌药物使用强度 V13 */}
          <Route path="antibiotic-use" element={<AntibioticUse />} />
          {/* M333-D：用血合理率 V13 */}
          <Route path="blood-use" element={<BloodUse />} />
          {/* M334-A：病案质量 V13 */}
          <Route path="mrq-quality" element={<MrqQuality />} />
          {/* M334-B：ICD 编码准确率 V13 */}
          <Route path="icd-coding-accuracy" element={<IcdCodingAccuracy />} />
          {/* M334-C：DRG 分组 V13 */}
          <Route path="drg-grouping" element={<DrgGrouping />} />
          {/* M334-D：平均住院日 V13 */}
          <Route path="average-length-of-stay" element={<AverageLengthOfStay />} />
          {/* M335-A：急诊分诊 V13 */}
          <Route path="emergency-triage-stats" element={<EmergencyTriageStats />} />
          {/* M335-B：ICU 床位 V13 */}
          <Route path="icu-occupancy" element={<IcuOccupancy />} />
          {/* M335-C：危急值 V13 */}
          <Route path="critical-value-stats" element={<CriticalValueStats />} />
          {/* M335-D：31 天再入院率 V13 */}
          <Route path="readmission-stats" element={<ReadmissionStats />} />
          {/* M336-A：药品短缺 V13 */}
          <Route path="drug-shortage" element={<DrugShortage />} />
          {/* M336-B：药品不良反应 V13 */}
          <Route path="adverse-drug-event" element={<AdverseDrugEvent />} />
          {/* M336-C：抗菌药物处方率 V13 */}
          <Route path="antibiotic-rx" element={<AntibioticRx />} />
          {/* M336-D：静脉输液率 V13 */}
          <Route path="iv-fluid" element={<IvFluid />} />
          {/* M337-A：门诊等候时长 V13 */}
          <Route path="outpatient-wait" element={<OutpatientWait />} />
          {/* M337-B：预约诊疗 V13 */}
          <Route path="appointment" element={<Appointment />} />
          {/* M337-C：双向转诊 V13 */}
          <Route path="referral-stats" element={<ReferralStats />} />
          {/* M337-D：慢病管理 V13 */}
          <Route path="chronic-disease-stats" element={<ChronicDiseaseStats />} />
          {/* M338-A：检验报告周转时间 V13 */}
          <Route path="lab-turnaround" element={<LabTurnaround />} />
          {/* M338-B：影像报告周转时间 V13 */}
          <Route path="imaging-turnaround" element={<ImagingTurnaround />} />
          {/* M338-C：检验差错率 V13 */}
          <Route path="lab-error" element={<LabError />} />
          {/* M338-D：标本不合格率 V13 */}
          <Route path="specimen-reject" element={<SpecimenReject />} />
          {/* M339-A：手术量分级 V13 */}
          <Route path="surgery-volume" element={<SurgeryVolume />} />
          {/* M339-B：麻醉相关并发症 V13 */}
          <Route path="anesthesia-complication" element={<AnesthesiaComplication />} />
          {/* M339-C：手术部位感染率 V13 */}
          <Route path="ssi-rate" element={<SsiRate />} />
          {/* M339-D：术中冰冻病理与术后石蜡符合率 V13 */}
          <Route path="intraop-frozen-section" element={<IntraopFrozenSection />} />
          {/* M340-A：投诉处理 V13 */}
          <Route path="complaint-handling" element={<ComplaintHandling />} />
          {/* M340-B：医德医风考评 V13 */}
          <Route path="medical-ethics" element={<MedicalEthics />} />
          {/* M340-C：知情同意书签署率 V13 */}
          <Route path="informed-consent" element={<InformedConsent />} />
          {/* M340-D：门诊病历书写合格率 V13 */}
          <Route path="outpatient-record" element={<OutpatientRecord />} />
          {/* M341-A：手卫生依从率 V13 */}
          <Route path="hand-hygiene" element={<HandHygiene />} />
          {/* M341-B：院感发生率 V13 */}
          <Route path="nosocomial-infection" element={<NosocomialInfection />} />
          {/* M341-C：隔离医嘱执行率 V13 */}
          <Route path="isolation-order" element={<IsolationOrder />} />
          {/* M341-D：环境消毒合格率 V13 */}
          <Route path="env-disinfection" element={<EnvDisinfection />} />
          {/* M342-A：输血率 V13 */}
          <Route path="blood-transfusion" element={<BloodTransfusionStats />} />
          {/* M342-B：病理报告 TAT V13 */}
          <Route path="pathology-turnaround" element={<PathologyTurnaround />} />
          {/* M342-C：内镜检查量 V13 */}
          <Route path="endoscopy-volume" element={<EndoscopyVolume />} />
          {/* M342-D：超声检查量 V13 */}
          <Route path="ultrasound-volume" element={<UltrasoundVolume />} />
          {/* M343-A：住院医师规范化培训 V13 */}
          <Route path="resident-training" element={<ResidentTraining />} />
          {/* M343-B：继续医学教育 V13 */}
          <Route path="continuing-edu" element={<ContinuingEdu />} />
          {/* M343-C：科研项目 V13 */}
          <Route path="research-project" element={<ResearchProject />} />
          {/* M343-D：专利授权 V13 */}
          <Route path="patent" element={<Patent />} />
          {/* M344-A：核心系统可用率 V13 */}
          <Route path="system-availability" element={<SystemAvailability />} />
          {/* M344-B：信息安全事件 V13 */}
          <Route path="security-incident" element={<SecurityIncident />} />
          {/* M344-C：数据质量 V13 */}
          <Route path="data-quality" element={<DataQuality />} />
          {/* M344-D：API 调用量 V13 */}
          <Route path="api-call" element={<ApiCall />} />
          {/* M345-A：医保结算 V13（stats 避让 M329-D） */}
          <Route path="insurance-settlement-stats" element={<InsuranceSettlementStats />} />
          {/* M345-B：业务收入结构 V13（stats 避让已有 revenueStructureV13） */}
          <Route path="revenue-structure-stats" element={<RevenueStructureStats />} />
          {/* M345-C：成本控制 V13 */}
          <Route path="cost-control" element={<CostControl />} />
          {/* M345-D：床位使用 V13 */}
          <Route path="bed-occupancy" element={<BedOccupancy />} />
          {/* M346-A：员工流失率 V13（stats 避让已有 staffTurnoverV13） */}
          <Route path="staff-turnover-stats" element={<StaffTurnoverStats />} />
          {/* M346-B：医师职称结构 V13 */}
          <Route path="doctor-title-structure" element={<DoctorTitleStructure />} />
          {/* M346-C：护患比 V13 */}
          <Route path="nurse-patient-ratio" element={<NursePatientRatio />} />
          {/* M346-D：员工培训学时 V13（M346 收官） */}
          <Route path="staff-training-hours" element={<StaffTrainingHours />} />
          {/* M347-A：患者满意度 V13（stats 避让已有 patientSatisfactionV13） */}
          <Route path="patient-satisfaction-stats" element={<PatientSatisfactionStats />} />
          {/* M347-B：投诉率 V13 */}
          <Route path="complaint-rate" element={<ComplaintRate />} />
          {/* M347-C：出院随访率 V13 */}
          <Route path="follow-up-completion" element={<FollowUpCompletion />} />
          {/* M347-D：病历完整性 V13（M347 收官） */}
          <Route path="medical-record-integrity" element={<MedicalRecordIntegrity />} />
          {/* M348-A：急诊绿色通道 V13 */}
          <Route path="emergency-greenway" element={<EmergencyGreenway />} />
          {/* M348-B：院前急救 V13 */}
          <Route path="pre-hospital-care" element={<PreHospitalCare />} />
          {/* M348-C：胸痛中心 V13 */}
          <Route path="chest-pain-center" element={<ChestPainCenter />} />
          {/* M348-D：卒中中心 V13（M348 收官） */}
          <Route path="stroke-center" element={<StrokeCenter />} />
          {/* M349-A：产科质量 V13 */}
          <Route path="maternity-quality" element={<MaternityQuality />} />
          {/* M349-B：新生儿 V13 */}
          <Route path="newborn-care" element={<NewbornCare />} />
          {/* M349-C：儿科诊疗 V13 */}
          <Route path="pediatric-care" element={<PediatricCare />} />
          {/* M349-D：预防接种 V13（M349 收官） */}
          <Route path="immunization" element={<Immunization />} />
          {/* M350-A：中医服务 V13 */}
          <Route path="tcm-service" element={<TcmService />} />
          {/* M350-B：康复医学 V13（stats 避让已有 rehabilitationV5/report-v2） */}
          <Route path="rehabilitation-stats" element={<RehabilitationStats />} />
          {/* M350-C：老年综合评估 V13 */}
          <Route path="geriatric-comprehensive" element={<GeriatricComprehensive />} />
          {/* M350-D：安宁疗护 V13（M350 收官） */}
          <Route path="palliative-care" element={<PalliativeCare />} />
          {/* M351-A：消毒供应 V13 */}
          <Route path="cssd" element={<Cssd />} />
          {/* M351-B：大型设备开机率 V13 */}
          <Route path="equipment-utilization" element={<EquipmentUtilization />} />
          {/* M351-C：氧气供应 V13 */}
          <Route path="oxygen-supply" element={<OxygenSupply />} />
          {/* M351-D：医疗废物 V13（M351 收官） */}
          <Route path="medical-waste" element={<MedicalWaste />} />
          {/* M352-A：消防安全 V13 */}
          <Route path="fire-safety" element={<FireSafety />} />
          {/* M352-B：能耗管理 V13 */}
          <Route path="energy-consumption" element={<EnergyConsumption />} />
          {/* M352-C：营养食堂 V13 */}
          <Route path="nutrition-kitchen" element={<NutritionKitchen />} />
          {/* M352-D：车辆管理 V13（M352 收官） */}
          <Route path="parking-mgmt" element={<ParkingMgmt />} />
          {/* M353-A：信息安全 V13 */}
          <Route path="info-security" element={<InfoSecurity />} />
          {/* M353-B：数据质量 V13（stats 避让已有 dataQualityV13） */}
          <Route path="data-quality-stats" element={<DataQualityStats />} />
          {/* M353-C：系统可用率 V13（stats 避让已有 systemAvailabilityV13） */}
          <Route path="system-availability-stats" element={<SystemAvailabilityStats />} />
          {/* M353-D：备份与容灾 V13（M353 收官） */}
          <Route path="backup-dr" element={<BackupDR />} />
          {/* M354-A：KPI 总览看板 V13 */}
          <Route path="kpi-dashboard" element={<KpiDashboard />} />
          {/* M354-B：病案质量管理 V13 */}
          <Route path="medical-record-quality" element={<MedicalRecordQuality />} />
          {/* M354-C：投诉管理 V13 */}
          <Route path="complaint-mgmt" element={<ComplaintMgmt />} />
          {/* M354-D：继续医学教育 V13（stats 避让已有 continuingEduV13，M354 收官） */}
          <Route path="continuing-education-stats" element={<ContinuingEducationStats />} />
          {/* M355-A：重点专科建设 V13 */}
          <Route path="specialty-development" element={<SpecialtyDevelopment />} />
          {/* M355-B：临床研究 V13（stats 避让已有 clinicalResearchV13 / M327-A） */}
          <Route path="clinical-research-stats" element={<ClinicalResearchStats />} />
          {/* M355-C：教学工作 V13 */}
          <Route path="teaching-workload" element={<TeachingWorkload />} />
          {/* M355-D：医联体与分级诊疗 V13（M355 收官） */}
          <Route path="medical-alliance" element={<MedicalAlliance />} />
          {/* M356-A：DRG 绩效 V13 */}
          <Route path="drg-performance" element={<DrgPerformance />} />
          {/* M356-B：DIP 病种分值 V13 */}
          <Route path="dip-score" element={<DipScore />} />
          {/* M356-C：药耗占比 V13 */}
          <Route path="drug-consumable-ratio" element={<DrugConsumableRatio />} />
          {/* M356-D：收入结构（支出端） V13（expense 避让已有 revenueStructureV13 / revenueStructureStatsV13，M356 收官） */}
          <Route path="expense-structure" element={<ExpenseStructure />} />
          {/* M357-A：患者安全目标 V13（stats 避让已有 patientSafetyV13 / M322-B） */}
          <Route path="patient-safety-stats" element={<PatientSafetyStats />} />
          {/* M357-B：医疗质量核心制度 V13 */}
          <Route path="core-system" element={<CoreSystem />} />
          {/* M357-C：手术部位感染 V13 */}
          <Route path="surgical-infection" element={<SurgicalInfection />} />
          {/* M357-D：抗菌药物管理 V13（M357 收官） */}
          <Route path="antibiotic-mgmt" element={<AntibioticMgmt />} />
          {/* M358-A：护理质量 V13 */}
          <Route path="nursing-quality" element={<NursingQuality />} />
          {/* M358-B：患者体验 V13 */}
          <Route path="patient-experience" element={<PatientExperience />} />
          {/* M358-C：护理人力配置 V13 */}
          <Route path="nursing-staffing" element={<NursingStaffing />} />
          {/* M358-D：护理文书管理 V13（M358 收官） */}
          <Route path="nursing-document" element={<NursingDocument />} />
          {/* M359-A：药学服务 V13 */}
          <Route path="pharmacy-service" element={<PharmacyService />} />
          {/* M359-B：合理用药 V13（stats 避让已有 rationalDrugUse） */}
          <Route path="rational-drug-use-stats" element={<RationalDrugUseStats />} />
          {/* M359-C：药品库存管理 V13（stats 避让已有 drugInventory） */}
          <Route path="drug-inventory-stats" element={<DrugInventoryStats />} />
          {/* M359-D：输液管理 V13（M359 收官） */}
          <Route path="infusion-mgmt" element={<InfusionMgmt />} />
          {/* M360-A：检验质量 V13（新规格：室内质控/室间质评/报告及时率） */}
          <Route path="lab-quality" element={<LabQuality />} />
          {/* M360-B：影像质量 V13（新规格：报告及时率/阳性率/甲级片率） */}
          <Route path="imaging-quality" element={<ImagingQuality />} />
          {/* M360-C：病理质量 V13 */}
          <Route path="pathology-quality" element={<PathologyQuality />} />
          {/* M360-D：输血管理 V13（M360 收官） */}
          <Route path="blood-mgmt" element={<BloodMgmt />} />
          {/* M361-A：科研管理 V13 */}
          <Route path="research-mgmt" element={<ResearchMgmt />} />
          {/* M361-B：教学管理 V13 */}
          <Route path="teaching-mgmt" element={<TeachingMgmt />} />
          {/* M361-C：继续教育（覆盖率）V13 */}
          <Route path="continuing-edu-coverage" element={<ContinuingEduCoverage />} />
          {/* M361-D：学术交流 V13（M361 收官） */}
          <Route path="academic-exchange" element={<AcademicExchange />} />
          {/* M362-A：人员管理 V13 */}
          <Route path="staff-mgmt" element={<StaffMgmt />} />
          {/* M362-B：培训管理 V13 */}
          <Route path="training-mgmt" element={<TrainingMgmt />} />
          {/* M362-C：后勤管理 V13 */}
          <Route path="logistics-mgmt" element={<LogisticsMgmt />} />
          {/* M362-D：安全管理 V13（M362 收官） */}
          <Route path="safety-mgmt" element={<SafetyMgmt />} />
          {/* M363-A：信息安全（统计）V13（stats避让） */}
          <Route path="info-security-stats" element={<InfoSecurityStats />} />
          {/* M363-B：患者隐私保护 V13 */}
          <Route path="patient-privacy" element={<PatientPrivacy />} />
          {/* M363-C：网络安全 V13 */}
          <Route path="network-security" element={<NetworkSecurity />} />
          {/* M363-D：数据治理（统计）V13（stats避让） */}
          <Route path="data-governance-stats" element={<DataGovernanceStats />} />
          {/* M364-A：运营管理 V13 */}
          <Route path="operation-mgmt" element={<OperationMgmt />} />
          {/* M364-B：财务管理 V13 */}
          <Route path="finance-mgmt" element={<FinanceMgmt />} />
          {/* M364-C：患者流量 V13 */}
          <Route path="patient-flow" element={<PatientFlow />} />
          {/* M364-D：资源利用 V13（M364 收官） */}
          <Route path="resource-util" element={<ResourceUtil />} />
          {/* M365-A：患者满意度（得分）V13（score避让） */}
          <Route path="patient-satisfaction-score" element={<PatientSatisfactionScore />} />
          {/* M365-B：投诉管理（统计）V13（stats避让） */}
          <Route path="complaint-mgmt-stats" element={<ComplaintMgmtStats />} />
          {/* M365-C：服务态度 V13 */}
          <Route path="service-attitude" element={<ServiceAttitude />} />
          {/* M365-D：就医体验（等候时间）V13（M365 收官） */}
          <Route path="experience-wait-time" element={<ExperienceWaitTime />} />
          {/* M366-A：AI 辅助诊断（统计）V13（stats避让） */}
          <Route path="ai-diagnosis-stats" element={<AiDiagnosisStats />} />
          {/* M366-B：AI 辅助治疗 V13 */}
          <Route path="ai-treatment" element={<AiTreatment />} />
          {/* M366-C：AI 管理应用 V13 */}
          <Route path="ai-management" element={<AiManagement />} />
          {/* M366-D：AI 教学培训 V13（M366 收官） */}
          <Route path="ai-education" element={<AiEducation />} />
          {/* M367-A：互联网医院（统计）V13（stats避让） */}
          <Route path="internet-hospital-stats" element={<InternetHospitalStats />} />
          {/* M367-B：远程医疗（统计）V13（stats避让） */}
          <Route path="telemedicine-stats" element={<TelemedicineStats />} />
          {/* M367-C：在线支付 V13 */}
          <Route path="online-payment" element={<OnlinePayment />} />
          {/* M367-D：健康档案 V13（M367 收官） */}
          <Route path="health-record" element={<HealthRecord />} />
          {/* M368-A：药品不良反应 V13 */}
          <Route path="drug-adverse-reaction" element={<DrugAdverseReaction />} />
          {/* M368-B：药物相互作用 V13 */}
          <Route path="drug-interaction" element={<DrugInteraction />} />
          {/* M368-C：抗菌药物管理（统计）V13（stats避让） */}
          <Route path="antibiotic-mgmt-stats" element={<AntibioticMgmtStats />} />
          {/* M368-D：基本药物管理 V13（M368 收官） */}
          <Route path="essential-drug" element={<EssentialDrug />} />
          {/* M369-A：护理质量（统计）V13（stats避让） */}
          <Route path="nursing-quality-stats" element={<NursingQualityStats />} />
          {/* M369-B：护理安全 V13 */}
          <Route path="nursing-safety" element={<NursingSafety />} />
          {/* M369-C：护理人员配置 V13 */}
          <Route path="nursing-staff" element={<NursingStaff />} />
          {/* M369-D：护理培训 V13（M369 收官） */}
          <Route path="nursing-training" element={<NursingTraining />} />
          {/* M370-A：院感控制 V13 */}
          <Route path="infection-control" element={<InfectionControl />} />
          {/* M370-B：院感监测 V13 */}
          <Route path="infection-surveillance" element={<InfectionSurveillance />} />
          {/* M370-C：环境卫生学 V13 */}
          <Route path="environmental-hygiene" element={<EnvironmentalHygiene />} />
          {/* M370-D：传染病报告 V13（M370 收官） */}
          <Route path="epidemic-report" element={<EpidemicReport />} />
          {/* M371-A：医疗质量 V13 */}
          <Route path="medical-quality" element={<MedicalQuality />} />
          {/* M371-B：医疗安全 V13 */}
          <Route path="medical-safety" element={<MedicalSafety />} />
          {/* M371-C：手术质量 V13 */}
          <Route path="surgery-quality" element={<SurgeryQuality />} />
          {/* M371-D：麻醉质量 V13（M371 收官） */}
          <Route path="anesthesia-quality" element={<AnesthesiaQuality />} />
          {/* M372-A：门诊服务 V13 */}
          <Route path="outpatient-service" element={<OutpatientService />} />
          {/* M372-B：急诊服务 V13 */}
          <Route path="emergency-service" element={<EmergencyService />} />
          {/* M372-C：门诊质量 V13 */}
          <Route path="outpatient-quality" element={<OutpatientQuality />} />
          {/* M372-D：绿色通道 V13（M372 收官） */}
          <Route path="green-channel" element={<GreenChannel />} />
          {/* M373-A：住院服务 V13 */}
          <Route path="inpatient-service" element={<InpatientService />} />
          {/* M373-B：床位管理 V13 */}
          <Route path="bed-management" element={<BedManagement />} />
          {/* M373-C：住院质量 V13 */}
          <Route path="inpatient-quality" element={<InpatientQuality />} />
          {/* M373-D：出院随访 V13（M373 收官） */}
          <Route path="discharge-followup" element={<DischargeFollowup />} />
          {/* M374-A：检查服务 V13 */}
          <Route path="examination-service" element={<ExaminationService />} />
          {/* M374-B：检验服务 V13 */}
          <Route path="lab-service" element={<LabService />} />
          {/* M374-C：病理服务 V13 */}
          <Route path="pathology-service" element={<PathologyService />} />
          {/* M374-D：影像质量 V13（M374 收官） */}
          <Route path="radiology-quality" element={<RadiologyQuality />} />
          {/* M375-A：医保结算明细 V13（detail 避让） */}
          <Route path="insurance-settlement-detail" element={<InsuranceSettlementDetail />} />
          {/* M375-B：费用控制 V13 */}
          <Route path="medical-cost-control" element={<MedicalCostControl />} />
          {/* M375-C：DRG 管理 V13 */}
          <Route path="drg-management" element={<DrgManagement />} />
          {/* M375-D：价格管理 V13（M375 收官） */}
          <Route path="price-management" element={<PriceManagement />} />
          {/* M376-A：护理服务 V13 */}
          <Route path="nursing-service" element={<NursingService />} />
          {/* M376-B：护理文书统计 V13（stats 避让） */}
          <Route path="nursing-document-stats" element={<NursingDocumentStats />} />
          {/* M376-C：护理敏感指标 V13 */}
          <Route path="nursing-sensitive-index" element={<NursingSensitiveIndex />} />
          {/* M376-D：护理管理 V13（M376 收官） */}
          <Route path="nursing-management" element={<NursingManagement />} />
          {/* M377-A：后勤服务 V13 */}
          <Route path="logistics-service" element={<LogisticsService />} />
          {/* M377-B：设备管理 V13 */}
          <Route path="equipment-mgmt" element={<EquipmentMgmt />} />
          {/* M377-C：能源管理 V13 */}
          <Route path="energy-mgmt" element={<EnergyMgmt />} />
          {/* M377-D：环境管理 V13（M377 收官） */}
          <Route path="environment-mgmt" element={<EnvironmentMgmt />} />
          {/* M378-A：预约服务统计 V13（stats 避让） */}
          <Route path="appointment-stats" element={<AppointmentStats />} />
          {/* M378-B：导医服务 V13 */}
          <Route path="guide-service" element={<GuideService />} />
          {/* M378-C：志愿服务 V13 */}
          <Route path="volunteer-service" element={<VolunteerService />} />
          {/* M378-D：便民服务 V13（M378 收官） */}
          <Route path="convenience-service" element={<ConvenienceService />} />
          {/* M379-A：安全事件统计 V13（stats 避让） */}
          <Route path="security-incident-stats" element={<SecurityIncidentStats />} />
          {/* M379-B：备份管理 V13 */}
          <Route path="backup-mgmt" element={<BackupMgmt />} />
          {/* M379-C：系统可用性明细 V13（detail 避让） */}
          <Route path="system-availability-detail" element={<SystemAvailabilityDetail />} />
          {/* M379-D：数据质量明细 V13（detail 避让，M379 收官） */}
          <Route path="data-quality-detail" element={<DataQualityDetail />} />
          {/* M380-A：制剂管理 V13 */}
          <Route path="drug-preparation" element={<DrugPreparation />} />
          {/* M380-B：临床药学 V13 */}
          <Route path="clinical-pharmacy" element={<ClinicalPharmacy />} />
          {/* M380-C：药库管理 V13 */}
          <Route path="drug-storage" element={<DrugStorage />} />
          {/* M380-D：中药房 V13（M380 收官） */}
          <Route path="tcm-pharmacy" element={<TCMPharmacy />} />
          {/* M381-A：运营看板 V13 */}
          <Route path="operation-dashboard" element={<OperationDashboard />} />
          {/* M381-B：财务明细 V13 */}
          <Route path="finance-detail" element={<FinanceDetail />} />
          {/* M381-C：患者流明细 V13 */}
          <Route path="patient-flow-detail" element={<PatientFlowDetail />} />
          {/* M381-D：资源利用明细 V13（M381 收官） */}
          <Route path="resource-util-detail" element={<ResourceUtilDetail />} />
          {/* M382-A：医保申报 V13 */}
          <Route path="insurance-claim" element={<InsuranceClaim />} />
          {/* M382-B：医保审核统计 V13（stats 避让） */}
          <Route path="insurance-audit-stats" element={<InsuranceAuditStats />} />
          {/* M382-C：DRG分组统计 V13（stats 避让） */}
          <Route path="drg-group-stats" element={<DRGGroupStats />} />
          {/* M382-D：价格监控 V13（M382 收官） */}
          <Route path="price-monitor" element={<PriceMonitor />} />
          {/* M383-A：科研项目统计 V13（stats 避让） */}
          <Route path="research-project-stats" element={<ResearchProjectStats />} />
          {/* M383-B：教学活动 V13 */}
          <Route path="teaching-activity" element={<TeachingActivity />} />
          {/* M383-C：住培管理统计 V13（stats 避让） */}
          <Route path="resident-training-stats" element={<ResidentTrainingStats />} />
          {/* M383-D：学术交流统计 V13（stats 避让，M383 收官） */}
          <Route path="academic-exchange-stats" element={<AcademicExchangeStats />} />
          {/* M384-A：人员招聘 V13 */}
          <Route path="staff-recruitment" element={<StaffRecruitment />} />
          {/* M384-B：人员留存 V13 */}
          <Route path="staff-retention" element={<StaffRetention />} />
          {/* M384-C：绩效考核 V13 */}
          <Route path="performance-eval" element={<PerformanceEval />} />
          {/* M384-D：培训计划 V13（M384 收官） */}
          <Route path="training-plan" element={<TrainingPlan />} />
          {/* M385-A：后勤保障 V13 */}
          <Route path="logistics-support" element={<LogisticsSupport />} />
          {/* M385-B：设备维护统计 V13（stats 避让） */}
          <Route path="equipment-maintenance-stats" element={<EquipmentMaintenanceStats />} />
          {/* M385-C：能源管理明细 V13 */}
          <Route path="energy-mgmt-detail" element={<EnergyMgmtDetail />} />
          {/* M385-D：安全生产 V13（M385 收官） */}
          <Route path="safety-production" element={<SafetyProduction />} />
          {/* M386-A：患者体验统计 V13（stats 避让） */}
          <Route path="patient-experience-stats" element={<PatientExperienceStats />} />
          {/* M386-B：服务质量 V13 */}
          <Route path="service-quality" element={<ServiceQuality />} />
          {/* M386-D：临床路径统计 V13（stats 避让，M386 收官） */}
          <Route path="clinical-pathway-stats" element={<ClinicalPathwayStats />} />
          {/* M387-A：核心制度落实 V13 */}
          <Route path="core-system-compliance" element={<CoreSystemCompliance />} />
          {/* M387-B：交接班管理 V13 */}
          <Route path="handover-mgmt" element={<HandoverMgmt />} />
          {/* M387-C：知情同意统计 V13（stats 避让） */}
          <Route path="informed-consent-stats" element={<InformedConsentStats />} />
          {/* M387-D：不良事件上报 V13（M387 收官） */}
          <Route path="adverse-event-report" element={<AdverseEventReport />} />
          {/* M388-A：处方点评统计 V13（stats 避让） */}
          <Route path="prescription-review-stats" element={<PrescriptionReviewStats />} />
          {/* M388-B：抗菌药物使用 V13 */}
          <Route path="antibiotic-usage" element={<AntibioticUsage />} />
          {/* M388-C：药品过敏管理 V13 */}
          <Route path="drug-allergy-mgmt" element={<DrugAllergyMgmt />} />
          {/* M388-D：急救药品管理 V13（M388 收官） */}
          <Route path="emergency-drug-mgmt" element={<EmergencyDrugMgmt />} />
          {/* M389-A：护理质量 V13 */}
          <Route path="nursing-care-quality" element={<NursingCareQuality />} />
          {/* M389-B：护理感控 V13 */}
          <Route path="nursing-infection-control" element={<NursingInfectionControl />} />
          {/* M389-C：护理教育 V13 */}
          <Route path="nursing-education" element={<NursingEducation />} />
          {/* M389-D：护理人力统计 V13（stats 避让，M389 收官） */}
          <Route path="nursing-staffing-stats" element={<NursingStaffingStats />} />
          {/* M390-A：预约管理 V13 */}
          <Route path="appointment-mgmt" element={<AppointmentMgmt />} />
          {/* M390-B：分诊管理 V13 */}
          <Route path="triage-mgmt" element={<TriageMgmt />} />
          {/* M390-C：门诊药房 V13 */}
          <Route path="outpatient-pharmacy" element={<OutpatientPharmacy />} />
          {/* M390-D：急诊分级 V13（M390 收官） */}
          <Route path="emergency-severity" element={<EmergencySeverity />} />
          {/* M391-A：手术过程 V13 */}
          <Route path="surgery-process" element={<SurgeryProcess />} />
          {/* M391-B：麻醉质量 V13 */}
          <Route path="anesthesia-detail" element={<AnesthesiaDetail />} />
          {/* M391-C：围手术期 V13 */}
          <Route path="perioperative-mgmt" element={<PerioperativeMgmt />} />
          {/* M391-D：器械管理 V13（M391 收官） */}
          <Route path="instrument-mgmt" element={<InstrumentMgmt />} />
          {/* M392-A：检验质控 V13 */}
          <Route path="lab-quality-control" element={<LabQualityControl />} />
          {/* M392-B：影像质控 V13 */}
          <Route path="imaging-quality-control" element={<ImagingQualityControl />} />
          {/* M392-C：病理质控 V13 */}
          <Route path="pathology-quality-control" element={<PathologyQualityControl />} />
          {/* M392-D：输血管理 V13（M392 收官） */}
          <Route path="blood-mgmt-detail" element={<BloodMgmtDetail />} />
          {/* M393-A：手卫生明细 V13（避让旧版 hand-hygiene） */}
          <Route path="hand-hygiene-detail" element={<HandHygieneDetail />} />
          {/* M393-B：隔离管理 V13 */}
          <Route path="isolation-mgmt" element={<IsolationMgmt />} />
          {/* M393-C：医疗废物 V13 */}
          <Route path="medical-waste-mgmt" element={<MedicalWasteMgmt />} />
          {/* M393-D：疫苗接种 V13（M393 收官） */}
          <Route path="vaccination-mgmt" element={<VaccinationMgmt />} />
          {/* M394-A：跌倒预防 V13 */}
          <Route path="fall-prevention" element={<FallPrevention />} />
          {/* M394-B：压疮管理 V13 */}
          <Route path="pressure-ulcer-mgmt" element={<PressureUlcerMgmt />} />
          {/* M394-C：患者身份识别 V13 */}
          <Route path="patient-identification" element={<PatientIdentification />} />
          {/* M394-D：用药安全 V13（M394 收官） */}
          <Route path="medication-safety" element={<MedicationSafety />} />
          {/* M395-A：智慧医院分级 V13（避让旧版 smart-hospital） */}
          <Route path="smart-hospital-grade" element={<SmartHospitalGrade />} />
          {/* M395-B：等级评审 V13 */}
          <Route path="grade-review" element={<GradeReview />} />
          {/* M395-C：质量管理体系 V13 */}
          <Route path="quality-mgmt-system" element={<QualityMgmtSystem />} />
          {/* M395-D：绩效管理 V13（M395 收官） */}
          <Route path="performance-mgmt" element={<PerformanceMgmt />} />
          {/* M396-A：床位利用 V13 */}
          <Route path="bed-utilization" element={<BedUtilization />} />
          {/* M396-B：收入结构明细 V13（避让旧版 revenue-structure/revenue-structure-stats） */}
          <Route path="revenue-structure-detail" element={<RevenueStructureDetail />} />
          {/* M396-C：成本控制明细 V13（避让旧版 cost-control/medical-cost-control） */}
          <Route path="cost-control-detail" element={<CostControlDetail />} />
          {/* M396-D：效率指标 V13（M396 收官） */}
          <Route path="efficiency-indicator" element={<EfficiencyIndicator />} />
          {/* M397-A：学科建设 V13 */}
          <Route path="discipline-construction" element={<DisciplineConstruction />} />
          {/* M397-B：人才发展 V13 */}
          <Route path="talent-development" element={<TalentDevelopment />} />
          {/* M397-C：临床研究明细 V13（避让旧版 clinical-research/clinical-research-stats） */}
          <Route path="clinical-research-detail" element={<ClinicalResearchDetail />} />
          {/* M397-D：继续教育明细 V13（M397 收官，避让旧版 continuing-education/continuing-education-stats） */}
          <Route path="continuing-education-detail" element={<ContinuingEducationDetail />} />
          {/* M398-A：投诉管理明细 V13（避让旧版 complaint-mgmt/complaint-mgmt-stats） */}
          <Route path="complaint-mgmt-detail" element={<ComplaintMgmtDetail />} />
          {/* M398-B：医疗纠纷 V13 */}
          <Route path="medical-dispute" element={<MedicalDispute />} />
          {/* M398-C：医保管理明细 V13 */}
          <Route path="medical-insurance-detail" element={<MedicalInsuranceDetail />} />
          {/* M398-D：公共关系 V13（M398 收官） */}
          <Route path="public-relation" element={<PublicRelation />} />
          {/* M399-A：互联网医院明细 V13（避让旧版 internet-hospital/internet-hospital-stats） */}
          <Route path="internet-hospital-detail" element={<InternetHospitalDetail />} />
          {/* M399-B：远程医疗明细 V13（避让旧版 telemedicine/telemedicine-stats） */}
          <Route path="telemedicine-detail" element={<TelemedicineDetail />} />
          {/* M399-C：线上支付明细 V13（避让旧版 online-payment） */}
          <Route path="online-payment-detail" element={<OnlinePaymentDetail />} />
          {/* M399-D：健康体检 V13（M399 收官） */}
          <Route path="health-checkup" element={<HealthCheckup />} />
          {/* M400-A：患者服务 V13 */}
          <Route path="patient-service" element={<PatientService />} />
          {/* M400-B：满意度调查明细 V13（避让旧版 satisfaction-survey） */}
          <Route path="satisfaction-survey-detail" element={<SatisfactionSurveyDetail />} />
          {/* M400-C：随访管理 V13 */}
          <Route path="follow-up-mgmt" element={<FollowUpMgmt />} />
          {/* M400-D：患者教育明细 V13（M400 收官，避让旧版 patient-education-stats） */}
          <Route path="patient-education-detail" element={<PatientEducationDetail />} />
          {/* M401-A：病案管理 V13 */}
          <Route path="medical-record" element={<MedicalRecord />} />
          {/* M401-B：数据治理明细 V13（避让旧版 data-governance/data-governance-stats） */}
          <Route path="data-governance-detail" element={<DataGovernanceDetail />} />
          {/* M401-C：统计报表 V13 */}
          <Route path="statistics-report" element={<StatisticsReport />} />
          {/* M401-D：编码质量 V13（M401 收官） */}
          <Route path="coding-quality" element={<CodingQuality />} />
          {/* M402-A：排班管理 V13 */}
          <Route path="scheduling-mgmt" element={<SchedulingMgmt />} />
          {/* M402-B：值班管理 V13 */}
          <Route path="duty-roster" element={<DutyRoster />} />
          {/* M402-C：考勤管理 V13 */}
          <Route path="attendance-mgmt" element={<AttendanceMgmt />} />
          {/* M402-D：绩效考核 V13（避让旧版 performance-eval，M402 收官） */}
          <Route path="performance-eval-detail" element={<PerformanceEvalDetail />} />
          {/* M403-A：重点专科管理 V13 */}
          <Route path="key-specialty-mgmt" element={<KeySpecialtyMgmt />} />
          {/* M403-B：人才团队管理 V13 */}
          <Route path="talent-team-mgmt" element={<TalentTeamMgmt />} />
          {/* M403-C：学科竞赛 V13 */}
          <Route path="discipline-competition" element={<DisciplineCompetition />} />
          {/* M403-D：学术水平 V13（M403 收官） */}
          <Route path="academic-level" element={<AcademicLevel />} />
          {/* M404-A：三级查房管理 V13 */}
          <Route path="three-level-ward-round" element={<ThreeLevelWardRound />} />
          {/* M404-B：会诊管理 V13 */}
          <Route path="consultation-mgmt" element={<ConsultationMgmt />} />
          {/* M404-C：病例讨论 V13 */}
          <Route path="case-discussion" element={<CaseDiscussion />} />
          {/* M404-D：分级护理 V13（M404 收官） */}
          <Route path="grade-nursing" element={<GradeNursing />} />
          {/* M405-A：护理文书质量 V13 */}
          <Route path="nursing-record-quality" element={<NursingRecordQuality />} />
          {/* M405-B：护患沟通 V13 */}
          <Route path="nursing-communication" element={<NursingCommunication />} />
          {/* M405-C：护理管理明细 V13（避让旧版 nursing-management M376-D） */}
          <Route path="nursing-management-detail" element={<NursingManagementDetail />} />
          {/* M405-D：护理服务明细 V13（M405 收官） */}
          <Route path="nursing-service-detail" element={<NursingServiceDetail />} />
          {/* M406-A：处方点评 V13 */}
          <Route path="pharmacy-prescription-review" element={<PharmacyPrescriptionReview />} />
          {/* M406-B：药品目录 V13 */}
          <Route path="pharmacy-drug-catalog" element={<PharmacyDrugCatalog />} />
          {/* M406-C：药品配送 V13 */}
          <Route path="pharmacy-drug-delivery" element={<PharmacyDrugDelivery />} />
          {/* M406-D：药品安全 V13（M406 收官） */}
          <Route path="pharmacy-drug-safety" element={<PharmacyDrugSafety />} />
          {/* M407-A：运营成本管理 V13 */}
          <Route path="operating-cost-mgmt" element={<OperatingCostMgmt />} />
          {/* M407-B：收入增长 V13 */}
          <Route path="revenue-growth" element={<RevenueGrowth />} />
          {/* M407-C：盈亏分析 V13 */}
          <Route path="profit-analysis" element={<ProfitAnalysis />} />
          {/* M407-D：战略KPI V13（M407 收官） */}
          <Route path="strategic-kpi" element={<StrategicKpi />} />
          {/* M408-A：医疗器械管理 V13 */}
          <Route path="medical-device-mgmt" element={<MedicalDeviceMgmt />} />
          {/* M408-B：耗材供应 V13 */}
          <Route path="consumable-supply" element={<ConsumableSupply />} />
          {/* M408-C：消防安全明细 V13（避让旧版 fire-safety M352-A） */}
          <Route path="fire-safety-detail" element={<FireSafetyDetail />} />
          {/* M408-D：治安保卫 V13（M408 收官） */}
          <Route path="security-mgmt" element={<SecurityMgmt />} />
          {/* M409-A：信息系统管理 V13 */}
          <Route path="information-system-mgmt" element={<InformationSystemMgmt />} />
          {/* M409-B：数据质量管理 V13 */}
          <Route path="data-quality-mgmt" element={<DataQualityMgmt />} />
          {/* M409-C：网络安全管理 V13 */}
          <Route path="cybersecurity-mgmt" element={<CybersecurityMgmt />} />
          {/* M409-D：互联互通管理 V13（M409 收官） */}
          <Route path="interop-mgmt" element={<InteropMgmt />} />
          {/* M410-A：科室KPI V13 */}
          <Route path="department-kpi" element={<DepartmentKpi />} />
          {/* M410-B：个人KPI V13 */}
          <Route path="individual-kpi" element={<IndividualKpi />} />
          {/* M410-C：绩效奖金 V13 */}
          <Route path="performance-bonus" element={<PerformanceBonus />} />
          {/* M410-D：绩效改进 V13（M410 收官） */}
          <Route path="performance-improvement" element={<PerformanceImprovement />} />
          {/* M411-A：危急值管理 V13 */}
          <Route path="critical-value-mgmt" element={<CriticalValueMgmt />} />
          {/* M411-B：再入院管理 V13 */}
          <Route path="readmission-mgmt" element={<ReadmissionMgmt />} />
          {/* M411-C：转科转院管理 V13 */}
          <Route path="inpatient-transfer-mgmt" element={<InpatientTransferMgmt />} />
          {/* M411-D：出院小结管理 V13（M411 收官） */}
          <Route path="discharge-summary-mgmt" element={<DischargeSummaryMgmt />} />
          {/* M412-A：死亡病例管理 V13 */}
          <Route path="death-report-mgmt" element={<DeathReportMgmt />} />
          {/* M412-B：新生儿管理 V13 */}
          <Route path="newborn-mgmt" element={<NewbornMgmt />} />
          {/* M412-C：孕产妇管理 V13 */}
          <Route path="maternal-mgmt" element={<MaternalMgmt />} />
          {/* M412-D：院感报告管理 V13（M412 收官） */}
          <Route path="infection-report-mgmt" element={<InfectionReportMgmt />} />
          {/* M413-A：病案质量管理 V13 */}
          <Route path="medical-record-mgmt" element={<MedicalRecordMgmt />} />
          {/* M413-B：知情同意管理（细节）V13（detail 避让旧版 informedConsentStatsV13） */}
          <Route path="informed-consent-detail" element={<InformedConsentDetail />} />
          {/* M413-C：交接班管理（细节）V13（detail 避让旧版 handoverMgmtV13） */}
          <Route path="handover-detail" element={<HandoverDetail />} />
          {/* M413-D：不良事件管理（细节）V13（M413 收官，detail 避让旧版 adverseEventReportV13） */}
          <Route path="adverse-event-detail" element={<AdverseEventDetail />} />
          {/* M414-A：输血管理 V13 */}
          <Route path="blood-transfusion-mgmt" element={<BloodTransfusionMgmt />} />
          {/* M414-B：临床路径管理（细节）V13（detail 避让旧版 clinicalPathwayMgmtV13） */}
          <Route path="clinical-pathway-detail" element={<ClinicalPathwayDetail />} />
          {/* M414-C：抗菌药物管理（细节）V13（detail 避让旧版 antibioticUseDensityV13） */}
          <Route path="antibiotic-mgmt-detail" element={<AntibioticMgmtDetail />} />
          {/* M414-D：VTE 预防管理 V13（M414 收官） */}
          <Route path="vte-prevention-mgmt" element={<VtePreventionMgmt />} />
          {/* M415-A：抢救管理 V13 */}
          <Route path="rescue-mgmt" element={<RescueMgmt />} />
          {/* M415-B：医学影像管理（细节）V13（detail 避让旧版 imagingTurnaroundV13） */}
          <Route path="medical-imaging-detail" element={<MedicalImagingDetail />} />
          {/* M415-C：病理管理 V13 */}
          <Route path="pathology-mgmt" element={<PathologyMgmt />} />
          {/* M415-D：营养管理 V13（M415 收官） */}
          <Route path="nutrition-mgmt" element={<NutritionMgmt />} />
          {/* M416-A：ICU 管理 V13 */}
          <Route path="icu-mgmt" element={<IcuMgmt />} />
          {/* M416-B：急诊管理 V13 */}
          <Route path="er-mgmt" element={<ErMgmt />} />
          {/* M416-C：门诊管理（细节）V13（detail 避让旧版 outpatientWait/appointment/referral/chronicDisease） */}
          <Route path="outpatient-mgmt-detail" element={<OutpatientMgmtDetail />} />
          {/* M416-D：住院管理（细节）V13（M416 收官，detail 避让旧版 inpatientBedMgmtV13） */}
          <Route path="inpatient-mgmt-detail" element={<InpatientMgmtDetail />} />
          {/* M417-A：血液透析管理 V13 */}
          <Route path="dialysis-mgmt" element={<DialysisMgmt />} />
          {/* M417-B：内镜管理 V13 */}
          <Route path="endoscopy-mgmt" element={<EndoscopyMgmt />} />
          {/* M417-C：手术室管理 V13 */}
          <Route path="operation-room-mgmt" element={<OperationRoomMgmt />} />
          {/* M417-D：病房管理（细节）V13（M417 收官，detail 避让旧版 inpatientBedMgmtV13） */}
          <Route path="ward-mgmt-detail" element={<WardMgmtDetail />} />
          {/* M418-A：药事管理（细节）V13（detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety） */}
          <Route path="pharmacy-mgmt-detail" element={<PharmacyMgmtDetail />} />
          {/* M418-B：医疗设备管理（细节）V13（detail 避让旧版 equipmentMgmtV13/consumableSupplyV13） */}
          <Route path="medical-equipment-mgmt-detail" element={<MedicalEquipmentMgmtDetail />} />
          {/* M418-C：院感控制（细节）V13（detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列） */}
          <Route path="infection-control-detail" element={<InfectionControlDetail />} />
          {/* M418-D：患者安全管理 V13（M418 收官） */}
          <Route path="patient-safety-mgmt" element={<PatientSafetyMgmt />} />
          {/* M419-A：病案管理（细节）V13（detail 避让旧版 medicalRecordMgmtV13） */}
          <Route path="medical-record-detail" element={<MedicalRecordDetail />} />
          {/* M419-B：信息安全管理 V13 */}
          <Route path="information-security-mgmt" element={<InformationSecurityMgmt />} />
          {/* M419-C：培训管理（细节）V13（detail 避让旧版 talentTeamMgmtV13/academicLevelV13） */}
          <Route path="training-mgmt-detail" element={<TrainingMgmtDetail />} />
          {/* M419-D：质控管理 V13（M419 收官） */}
          <Route path="quality-control-mgmt" element={<QualityControlMgmt />} />
          {/* M420-A：病案归档管理 V13（archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13） */}
          <Route path="medical-record-archive-mgmt" element={<MedicalRecordArchiveMgmt />} />
          {/* M420-B：健康教育管理 V13 */}
          <Route path="health-education-mgmt" element={<HealthEducationMgmt />} />
          {/* M420-C：医学伦理管理 V13 */}
          <Route path="medical-ethics-mgmt" element={<MedicalEthicsMgmt />} />
          {/* M420-D：医务社工管理 V13（M420 收官） */}
          <Route path="medical-social-work-mgmt" element={<MedicalSocialWorkMgmt />} />
          {/* M421-A：院感监测（细节）V13（detail 避让旧版 infectionReportMgmtV13/infectionControlDetailV13 等院感系列） */}
          <Route path="infection-surveillance-detail" element={<InfectionSurveillanceDetail />} />
          {/* M421-B：抗菌药物使用管理 V13（换名避让旧版 antiInfectionDetailV13） */}
          <Route path="antibiotic-usage-mgmt" element={<AntibioticUsageMgmt />} />
          {/* M421-C：输血管理（细节）V13（detail 避让旧版 bloodTransfusionMgmtV13） */}
          <Route path="blood-transfusion-detail" element={<BloodTransfusionDetail />} />
          {/* M421-D：临床路径管理 V13（M421 收官，换名避让旧版 clinicalPathwayDetailV13） */}
          <Route path="clinical-pathway-mgmt" element={<ClinicalPathwayMgmt />} />
          {/* M422-A：VTE 预防管理（细节）V13（detail 避让旧版 vtePreventionMgmtV13） */}
          <Route path="vte-prevention-detail" element={<VtePreventionDetail />} />
          {/* M422-B：压疮管理（细节）V13（detail 避让旧版 pressureUlcerMgmtV13（M394-B）） */}
          <Route path="pressure-ulcer-detail" element={<PressureUlcerDetail />} />
          {/* M422-C：跌倒管理 V13 */}
          <Route path="fall-mgmt" element={<FallMgmt />} />
          {/* M422-D：身体约束管理 V13（M422 收官） */}
          <Route path="restraint-mgmt" element={<RestraintMgmt />} />
          {/* M423-A：手卫生督查 V13（换名避让旧版 handHygieneComplianceV13（M418）） */}
          <Route path="hand-hygiene-audit" element={<HandHygieneAudit />} />
          {/* M423-B：隔离管理（细节）V13（detail 避让旧版 isolationMgmtV13（M393-B）） */}
          <Route path="isolation-detail" element={<IsolationDetail />} />
          {/* M423-C：消毒灭菌管理 V13 */}
          <Route path="sterilization-mgmt" element={<SterilizationMgmt />} />
          {/* M423-D：医废追溯管理 V13（M423 收官，换名避让旧版 infectionControlDetailV13（M418）） */}
          <Route path="medical-waste-tracking" element={<MedicalWasteTracking />} />
          {/* M424-A：用药错误上报 V13（换名避让旧版 patientSafetyMgmtV13（M418）） */}
          <Route path="medication-error-report" element={<MedicationErrorReport />} />
          {/* M424-B：高危药品管理 V13 */}
          <Route path="high-alert-med-mgmt" element={<HighAlertMedMgmt />} />
          {/* M424-C：输液管理（细节）V13（detail 避让旧版 infusionMgmtV13（M359-D）） */}
          <Route path="infusion-detail" element={<InfusionDetail />} />
          {/* M424-D：血糖管理 V13（M424 收官） */}
          <Route path="blood-glucose-mgmt" element={<BloodGlucoseMgmt />} />
          {/* M425-A：危急值管理（细节）V13（detail 避让旧版 criticalValueMgmtV13（M411）） */}
          <Route path="critical-value-detail" element={<CriticalValueDetail />} />
          {/* M425-B：交接班沟通管理 V13（换名避让旧版 handoverDetailV13（M413）） */}
          <Route path="handover-communication-mgmt" element={<HandoverCommunicationMgmt />} />
          {/* M425-C：知情同意管理 V13（换名避让旧版 consentDetailV13（M413）） */}
          <Route path="consent-mgmt" element={<ConsentMgmt />} />
          {/* M425-D：隐私保护管理 V13（M425 收官，换名避让旧版 informationSecurityMgmtV13（M419）） */}
          <Route path="privacy-mgmt" element={<PrivacyMgmt />} />
          {/* M426-A：抢救记录管理 V13（换名避让旧版 rescueMgmtV13（M415）） */}
          <Route path="rescue-record-mgmt" element={<RescueRecordMgmt />} />
          {/* M426-B：麻醉记录管理 V13（换名避让旧版 anesthesiaComplicationV13（M339）） */}
          <Route path="anesthesia-record-mgmt" element={<AnesthesiaRecordMgmt />} />
          {/* M426-C：安全核查管理 V13（换名避让旧版 surgeryVolumeV13（M339）） */}
          <Route path="safety-check-mgmt" element={<SafetyCheckMgmt />} />
          {/* M426-D：病房环境管理 V13（M426 收官，换名避让旧版 wardMgmtDetailV13（M417）） */}
          <Route path="ward-environment-mgmt" element={<WardEnvironmentMgmt />} />
          {/* M427-A：出院小结管理（细节）V13（detail 避让旧版 dischargeSummaryMgmtV13（M411）） */}
          <Route path="discharge-summary-detail" element={<DischargeSummaryDetail />} />
          {/* M427-B：转科管理（细节）V13（detail 避让旧版 transferMgmtV13（M411）） */}
          <Route path="transfer-detail" element={<TransferDetail />} />
          {/* M427-C：再入院分析管理 V13（换名避让旧版 readmissionMgmtV13（M411，-analysis 后缀）） */}
          <Route path="readmission-analysis-mgmt" element={<ReadmissionAnalysisMgmt />} />
          {/* M427-D：死亡病例管理（细节）V13（M427 收官，detail 避让旧版 deathCaseMgmtV13（M412）） */}
          <Route path="death-case-detail" element={<DeathCaseDetail />} />
          {/* M428-A：新生儿护理管理 V13（换名避让旧版 neonatalMgmtV13（M412，-care 后缀）） */}
          <Route path="neonatal-care-mgmt" element={<NeonatalCareMgmt />} />
          {/* M428-B：孕产妇护理管理 V13（换名避让旧版 maternalMgmtV13（M412，-care 后缀）） */}
          <Route path="maternal-care-mgmt" element={<MaternalCareMgmt />} />
          {/* M428-C：急诊护理管理 V13（换名避让旧版 emergencyMgmtV13（M416，-care 后缀）） */}
          <Route path="emergency-care-mgmt" element={<EmergencyCareMgmt />} />
          {/* M428-D：ICU 护理管理 V13（M428 收官，换名避让旧版 icuMgmtV13（M416，-care 后缀）） */}
          <Route path="icu-care-mgmt" element={<IcuCareMgmt />} />
          {/* M429-A：透析质量管理 V13（-quality 后缀避让旧版 dialysisMgmtV13（M417）） */}
          <Route path="dialysis-quality-mgmt" element={<DialysisQualityMgmt />} />
          {/* M429-B：内镜质量管理 V13（-quality 后缀避让旧版 endoscopyMgmtV13（M417）） */}
          <Route path="endoscopy-quality-mgmt" element={<EndoscopyQualityMgmt />} />
          {/* M429-C：手术室质量管理 V13（-quality 后缀避让旧版 operatingRoomMgmtV13（M417）） */}
          <Route path="operating-room-quality-mgmt" element={<OperatingRoomQualityMgmt />} />
          {/* M429-D：病房质量管理 V13（M429 收官，-quality 后缀避让旧版 wardMgmtDetailV13（M417）） */}
          <Route path="ward-quality-mgmt" element={<WardQualityMgmt />} />
          {/* M430-A：影像质量管理 V13（-quality 后缀避让旧版 medicalImagingDetailV13（M415）） */}
          <Route path="imaging-quality-mgmt" element={<ImagingQualityMgmt />} />
          {/* M430-B：病理质量管理 V13（-quality 后缀避让旧版 pathologyMgmtV13（M415）） */}
          <Route path="pathology-quality-mgmt" element={<PathologyQualityMgmt />} />
          {/* M430-C：营养质量管理 V13（-quality 后缀避让旧版 nutritionMgmtV13（M415）） */}
          <Route path="nutrition-quality-mgmt" element={<NutritionQualityMgmt />} />
          {/* M430-D：输血质量管理 V13（M430 收官，-quality 后缀避让旧版 bloodTransfusionDetailV13（M421）） */}
          <Route path="blood-transfusion-quality-mgmt" element={<BloodTransfusionQualityMgmt />} />
          {/* M431-A：药事质量管理 V13（-quality 后缀避让旧版 pharmacyDetailV13（M418）） */}
          <Route path="medication-quality-mgmt" element={<MedicationQualityMgmt />} />
          {/* M431-B：设备质量管理 V13（-quality 后缀避让旧版 medicalDeviceDetailV13（M418）） */}
          <Route path="device-quality-mgmt" element={<DeviceQualityMgmt />} />
          {/* M431-C：消防安全质量管理 V13（-quality 后缀避让旧版 fireSafetyDetailV13（M408）） */}
          <Route path="fire-safety-quality-mgmt" element={<FireSafetyQualityMgmt />} />
          {/* M431-D：治安保卫质量管理 V13（M431 收官，-quality 后缀避让旧版 securityMgmtV13（M408）） */}
          <Route path="security-quality-mgmt" element={<SecurityQualityMgmt />} />
          {/* M432-A：信息系统质量管理 V13（-quality 后缀避让旧版 informationSystemMgmtV13（M409）） */}
          <Route path="information-system-quality-mgmt" element={<InformationSystemQualityMgmt />} />
          {/* M432-B：数据上报质量管理 V13（换名 dataReport + -quality 后缀避让旧版 dataQualityMgmtV13（M409）） */}
          <Route path="data-report-quality-mgmt" element={<DataReportQualityMgmt />} />
          {/* M432-C：网络安全质量管理 V13（-quality 后缀避让旧版 networkSecurityMgmtV13（M409）） */}
          <Route path="network-security-quality-mgmt" element={<NetworkSecurityQualityMgmt />} />
          {/* M432-D：互联互通质量管理 V13（M432 收官，-quality 后缀避让旧版 interoperabilityMgmtV13（M409）） */}
          <Route path="interoperability-quality-mgmt" element={<InteroperabilityQualityMgmt />} />
          {/* M433-A：科室 KPI 质量管理 V13（-quality 后缀避让旧版 deptKpiMgmtV13（M410）） */}
          <Route path="dept-kpi-quality-mgmt" element={<DeptKpiQualityMgmt />} />
          {/* M433-B：个人 KPI 质量管理 V13（-quality 后缀避让旧版 staffKpiMgmtV13（M410）） */}
          <Route path="staff-kpi-quality-mgmt" element={<StaffKpiQualityMgmt />} />
          {/* M433-C：奖金分配质量管理 V13（-quality 后缀避让旧版 bonusMgmtV13（M410）） */}
          <Route path="bonus-quality-mgmt" element={<BonusQualityMgmt />} />
          {/* M433-D：绩效改进质量管理 V13（M433 收官，-quality 后缀避让旧版 performanceImprovementMgmtV13（M410）） */}
          <Route path="performance-improvement-quality-mgmt" element={<PerformanceImprovementQualityMgmt />} />
          {/* M434-A：教学质量管理 V13（-quality 后缀避让旧版 trainingMgmtDetailV13（M419）） */}
          <Route path="teaching-quality-mgmt" element={<TeachingQualityMgmt />} />
          {/* M434-B：科研质量管理 V13（-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等）） */}
          <Route path="research-quality-mgmt" element={<ResearchQualityMgmt />} />
          {/* M434-C：继续教育质量管理 V13（-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等）） */}
          <Route path="continuing-education-quality-mgmt" element={<ContinuingEducationQualityMgmt />} />
          {/* M434-D：学科建设质量管理 V13（M434 收官，-quality 后缀避让教学科研相关旧版模块（M419 trainingMgmtDetailV13 等）） */}
          <Route path="discipline-construction-quality-mgmt" element={<DisciplineConstructionQualityMgmt />} />
          {/* M435-A：预算执行质量管理 V13（-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等）） */}
          <Route path="budget-execution-quality-mgmt" element={<BudgetExecutionQualityMgmt />} />
          {/* M435-B：采购质量管理 V13（-quality 后缀避让旧版采购模块（M408 consumableSupplyMgmtV13 等）） */}
          <Route path="procurement-quality-mgmt" element={<ProcurementQualityMgmt />} />
          {/* M435-C：固定资产质量管理 V13（-quality 后缀避让旧版固定资产模块（M408 medicalDeviceMgmtV13 等）） */}
          <Route path="fixed-asset-quality-mgmt" element={<FixedAssetQualityMgmt />} />
          {/* M435-D：能耗质量管理 V13（M435 收官，-quality 后缀避让旧版运营财务模块（M407 operationCostMgmtV13 等）） */}
          <Route path="energy-quality-mgmt" element={<EnergyQualityMgmt />} />
          {/* M436-A：污水处理质量管理 V13（院感安全环保质量管理深化组） */}
          <Route path="sewage-treatment-quality-mgmt" element={<SewageTreatmentQualityMgmt />} />
          {/* M436-B：辐射安全质量管理 V13（院感安全环保质量管理深化组） */}
          <Route path="radiation-safety-quality-mgmt" element={<RadiationSafetyQualityMgmt />} />
          {/* M436-C：实验室生物安全质量管理 V13（院感安全环保质量管理深化组） */}
          <Route path="lab-biosafety-quality-mgmt" element={<LabBiosafetyQualityMgmt />} />
          {/* M436-D：医废追溯质量管理 V13（M436 收官，-quality 后缀避让旧版 medicalWasteTraceabilityMgmtV13（M423）） */}
          <Route path="medical-waste-traceability-quality-mgmt" element={<MedicalWasteTraceabilityQualityMgmt />} />
          {/* M437-A：膳食质量管理 V13（后勤保障与环境管理深化组） */}
          <Route path="catering-quality-mgmt" element={<CateringQualityMgmt />} />
          {/* M437-B：被服洗涤管理 V13（后勤保障与环境管理深化组） */}
          <Route path="laundry-mgmt" element={<LaundryMgmt />} />
          {/* M437-C：环境卫生质量管理 V13（后勤保障与环境管理深化组） */}
          <Route path="environmental-hygiene-quality-mgmt" element={<EnvironmentalHygieneQualityMgmt />} />
          {/* M437-D：会议室管理 V13（M437 收官，后勤保障与环境管理深化组） */}
          <Route path="meeting-room-mgmt" element={<MeetingRoomMgmt />} />
          {/* M438-A：医德医风质量管理 V13（行风廉洁与职业道德建设组） */}
          <Route path="medical-ethics-quality-mgmt" element={<MedicalEthicsQualityMgmt />} />
          {/* M438-B：廉洁行医质量管理 V13（行风廉洁与职业道德建设组） */}
          <Route path="integrity-quality-mgmt" element={<IntegrityQualityMgmt />} />
          {/* M438-C：商业贿赂治理质量管理 V13（行风廉洁与职业道德建设组） */}
          <Route path="commercial-bribery-quality-mgmt" element={<CommercialBriberyQualityMgmt />} />
          {/* M438-D：行业作风建设质量管理 V13（M438 收官，行风廉洁与职业道德建设组） */}
          <Route path="industry-style-quality-mgmt" element={<IndustryStyleQualityMgmt />} />
          {/* M439-A：不良事件上报管理 V13（患者安全与医疗风险管理组） */}
          <Route path="adverse-event-reporting" element={<AdverseEventReporting />} />
          {/* M439-B：跌倒坠床风险管理 V13（患者安全与医疗风险管理组） */}
          <Route path="fall-incident" element={<FallIncident />} />
          {/* M439-C：压疮风险管理 V13（患者安全与医疗风险管理组） */}
          <Route path="pressure-ulcer" element={<PressureUlcer />} />
          {/* M439-D：管路滑脱风险管理 V13（M439 收官，患者安全与医疗风险管理组） */}
          <Route path="tube-dislodgement" element={<TubeDislodgement />} />
          {/* M440-A：处方点评质量管理 V13（药事管理与药学服务组） */}
          <Route path="prescription-review-quality" element={<PrescriptionReviewQuality />} />
          {/* M440-B：抗菌药物使用质量管理 V13（药事管理与药学服务组） */}
          <Route path="antibiotic-use-quality" element={<AntibioticUseQuality />} />
          {/* M440-C：药品不良反应监测 V13（药事管理与药学服务组） */}
          <Route path="adr-reporting" element={<AdrReporting />} />
          {/* M440-D：临床药学服务质量管理 V13（M440 收官，药事管理与药学服务组） */}
          <Route path="clinical-pharmacy-quality" element={<ClinicalPharmacyQuality />} />
          {/* M441-A：院感监测管理 V13（医院感染管理组） */}
          <Route path="hospital-infection-surveillance" element={<HospitalInfectionSurveillance />} />
          {/* M441-B：手卫生质量管理 V13（医院感染管理组） */}
          <Route path="hand-hygiene-quality" element={<HandHygieneQuality />} />
          {/* M441-C：消毒灭菌管理 V13（医院感染管理组） */}
          <Route path="disinfection-sterilization" element={<DisinfectionSterilization />} />
          {/* M441-D：医疗废物质量管理 V13（M441 收官，医院感染管理组） */}
          <Route path="medical-waste-mgmt-quality" element={<MedicalWasteMgmtQuality />} />
          {/* M442-A：孕产妇系统管理 V13（妇幼健康与计划生育管理组） */}
          <Route path="maternal-health-mgmt" element={<MaternalHealthMgmt />} />
          {/* M442-B：儿童保健管理 V13（妇幼健康与计划生育管理组） */}
          <Route path="child-health-mgmt" element={<ChildHealthMgmt />} />
          {/* M442-C：出生缺陷监测 V13（妇幼健康与计划生育管理组） */}
          <Route path="birth-defect-monitoring" element={<BirthDefectMonitoring />} />
          {/* M442-D：计划生育技术服务 V13（M442 收官，妇幼健康与计划生育管理组） */}
          <Route path="family-planning-mgmt" element={<FamilyPlanningMgmt />} />
          {/* M443-A：住院医师规范化培训 V13（教学科研与继续教育管理组） */}
          <Route path="residency-training-mgmt" element={<ResidencyTrainingMgmt />} />
          {/* M443-B：继续医学教育 V13（教学科研与继续教育管理组） */}
          <Route path="continuing-education-mgmt" element={<ContinuingEducationMgmt />} />
          {/* M443-C：科研项目管理 V13（教学科研与继续教育管理组） */}
          <Route path="research-project-mgmt" element={<ResearchProjectMgmt />} />
          {/* M443-D：教学质量评估 V13（M443 收官，教学科研与继续教育管理组） */}
          <Route path="teaching-quality-mgmt-assessment" element={<TeachingQualityMgmtAssessment />} />
          {/* M444-A：绩效考核管理 V13（绩效薪酬与人力资源管理组） */}
          <Route path="performance-appraisal-mgmt" element={<PerformanceAppraisalMgmt />} />
          {/* M444-B：薪酬分配管理 V13（绩效薪酬与人力资源管理组） */}
          <Route path="salary-distribution-mgmt" element={<SalaryDistributionMgmt />} />
          {/* M444-C：人员招聘与配置 V13（绩效薪酬与人力资源管理组） */}
          <Route path="recruitment-mgmt" element={<RecruitmentMgmt />} />
          {/* M444-D：员工培训发展管理 V13（M444 收官，绩效薪酬与人力资源管理组） */}
          <Route path="staff-training-development-mgmt" element={<StaffTrainingDevelopmentMgmt />} />
          {/* M445-A：医保费用管控 V13（医保物价与费用管理组） */}
          <Route path="insurance-cost-control" element={<InsuranceCostControl />} />
          {/* M445-B：医疗服务价格管理 V13（医保物价与费用管理组） */}
          <Route path="price-mgmt" element={<PriceMgmt />} />
          {/* M445-C：医疗费用审核 V13（医保物价与费用管理组） */}
          <Route path="expense-audit" element={<ExpenseAudit />} />
          {/* M445-D：DRG/DIP 管理 V13（M445 收官，医保物价与费用管理组） */}
          <Route path="drg-dip-mgmt" element={<DrgDipMgmt />} />
          {/* M446-A：信息系统可用性管理 V13（信息化建设与数据安全管理组） */}
          <Route path="system-availability-mgmt" element={<SystemAvailabilityMgmt />} />
          {/* M446-B：数据安全管理 V13（信息化建设与数据安全管理组） */}
          <Route path="data-security-mgmt" element={<DataSecurityMgmt />} />
          {/* M446-C：网络安全防护管理 V13（信息化建设与数据安全管理组） */}
          <Route path="network-security-mgmt" element={<NetworkSecurityMgmt />} />
          {/* M446-D：信息运维服务管理 V13（M446 收官，信息化建设与数据安全管理组） */}
          <Route path="it-service-desk-mgmt" element={<ItServiceDeskMgmt />} />
          {/* M447-A：应急演练管理 V13（应急管理与安全生产管理组） */}
          <Route path="emergency-drill-mgmt" element={<EmergencyDrillMgmt />} />
          {/* M447-B：突发事件处置管理 V13（应急管理与安全生产管理组） */}
          <Route path="emergency-response-mgmt" element={<EmergencyResponseMgmt />} />
          {/* M447-C：安全生产管理 V13（应急管理与安全生产管理组） */}
          <Route path="safety-production-mgmt" element={<SafetyProductionMgmt />} />
          {/* M447-D：消防安全管理 V13（M447 收官，应急管理与安全生产管理组） */}
          <Route path="fire-safety-mgmt" element={<FireSafetyMgmt />} />
          {/* M448-A：门诊收费管理 V13（财务与收费管理组） */}
          <Route path="outpatient-billing-mgmt" element={<OutpatientBillingMgmt />} />
          {/* M448-B：住院收费管理 V13（财务与收费管理组） */}
          <Route path="inpatient-billing-mgmt" element={<InpatientBillingMgmt />} />
          {/* M448-C：财务预算管理 V13（财务与收费管理组） */}
          <Route path="budget-mgmt" element={<BudgetMgmt />} />
          {/* M448-D：票据管理 V13（M448 收官，财务与收费管理组） */}
          <Route path="invoice-mgmt" element={<InvoiceMgmt />} />
          {/* M449-A：医疗设备采购管理 V13（医疗装备与设备管理组） */}
          <Route path="medical-equipment-purchase-mgmt" element={<MedicalEquipmentPurchaseMgmt />} />
          {/* M449-B：设备维护保养管理 V13（医疗装备与设备管理组） */}
          <Route path="equipment-maintenance-mgmt" element={<EquipmentMaintenanceMgmt />} />
          {/* M449-C：设备计量校准管理 V13（医疗装备与设备管理组） */}
          <Route path="equipment-calibration-mgmt" element={<EquipmentCalibrationMgmt />} />
          {/* M449-D：设备报废处置管理 V13（M449 收官，医疗装备与设备管理组） */}
          <Route path="equipment-disposal-mgmt" element={<EquipmentDisposalMgmt />} />
          {/* M450-A：宣传管理 V13（宣传与党建管理组） */}
          <Route path="publicity-mgmt" element={<PublicityMgmt />} />
          {/* M450-B：党建管理 V13（宣传与党建管理组） */}
          <Route path="party-building-mgmt" element={<PartyBuildingMgmt />} />
          {/* M450-C：档案管理 V13（宣传与党建管理组） */}
          <Route path="archive-mgmt" element={<ArchiveMgmt />} />
          {/* M450-D：统计管理 V13（M450 收官，宣传与党建管理组） */}
          <Route path="statistics-mgmt" element={<StatisticsMgmt />} />
          {/* M451-A：医患沟通管理 V13（医患关系与投诉管理组） */}
          <Route path="doctor-patient-communication-mgmt" element={<DoctorPatientCommunicationMgmt />} />
          {/* M451-B：投诉处理管理 V13（医患关系与投诉管理组） */}
          <Route path="complaint-handling-mgmt" element={<ComplaintHandlingMgmt />} />
          {/* M451-C：医疗纠纷调解管理 V13（医患关系与投诉管理组） */}
          <Route path="medical-dispute-mediation-mgmt" element={<MedicalDisputeMediationMgmt />} />
          {/* M451-D：满意度调查管理 V13（M451 收官，医患关系与投诉管理组） */}
          <Route path="satisfaction-survey-mgmt" element={<SatisfactionSurveyMgmt />} />
          {/* M452-A：医院评审迎检管理 V13（医院评审与临床质量改进组） */}
          <Route path="hospital-accreditation-mgmt" element={<HospitalAccreditationMgmt />} />
          {/* M452-B：单病种质量管理 V13（医院评审与临床质量改进组） */}
          <Route path="single-disease-quality-mgmt" element={<SingleDiseaseQualityMgmt />} />
          {/* M452-C：临床路径管理（覆盖率视角）V13（医院评审与临床质量改进组） */}
          <Route path="clinical-pathway-coverage-mgmt" element={<ClinicalPathwayCoverageMgmt />} />
          {/* M452-D：病案质量管理 V13（M452 收官，医院评审与临床质量改进组） */}
          <Route path="medical-record-quality-mgmt" element={<MedicalRecordQualityMgmt />} />
          {/* M453-A：护理质量管理 V13（护理管理组） */}
          <Route path="nursing-quality-mgmt" element={<NursingQualityMgmt />} />
          {/* M453-B：护理人力配置管理 V13（护理管理组） */}
          <Route path="nursing-staffing-mgmt" element={<NursingStaffingMgmt />} />
          {/* M453-C：护理培训管理 V13（护理管理组） */}
          <Route path="nursing-training-mgmt" element={<NursingTrainingMgmt />} />
          {/* M453-D：护理服务管理 V13（M453 收官，护理管理组） */}
          <Route path="nursing-service-mgmt" element={<NursingServiceMgmt />} />
          {/* M454-A：门诊流程管理 V13（门急诊与手术麻醉管理组） */}
          <Route path="outpatient-process-mgmt" element={<OutpatientProcessMgmt />} />
          {/* M454-B：急诊绿色通道管理 V13（门急诊与手术麻醉管理组） */}
          <Route path="emergency-green-channel-mgmt" element={<EmergencyGreenChannelMgmt />} />
          {/* M454-C：手术麻醉管理 V13（门急诊与手术麻醉管理组） */}
          <Route path="surgery-anesthesia-mgmt" element={<SurgeryAnesthesiaMgmt />} />
          {/* M454-D：ICU 管理（统计视角）V13（M454 收官，门急诊与手术麻醉管理组） */}
          <Route path="icu-stats-mgmt" element={<IcuStatsMgmt />} />
          {/* M455-A：药品采购管理 V13（药品供应与库存管理组） */}
          <Route path="drug-purchase-mgmt" element={<DrugPurchaseMgmt />} />
          {/* M455-B：药品库存管理 V13（药品供应与库存管理组） */}
          <Route path="drug-inventory-mgmt" element={<DrugInventoryMgmt />} />
          {/* M455-C：药品效期管理 V13（药品供应与库存管理组） */}
          <Route path="drug-expiry-mgmt" element={<DrugExpiryMgmt />} />
          {/* M455-D：特殊药品管理 V13（M455 收官，药品供应与库存管理组） */}
          <Route path="special-drug-mgmt" element={<SpecialDrugMgmt />} />
          {/* M456-A：重点学科建设管理 V13（学科建设与科研管理组） */}
          <Route path="discipline-construction-mgmt" element={<DisciplineConstructionMgmt />} />
          {/* M456-B：科研成果转化管理 V13（学科建设与科研管理组） */}
          <Route path="research-achievement-transform-mgmt" element={<ResearchAchievementTransformMgmt />} />
          {/* M456-C：学术交流管理 V13（学科建设与科研管理组） */}
          <Route path="academic-exchange-mgmt" element={<AcademicExchangeMgmt />} />
          {/* M456-D：科研平台管理 V13（M456 收官，学科建设与科研管理组） */}
          <Route path="research-platform-mgmt" element={<ResearchPlatformMgmt />} />
          {/* M457-A：医院文化建设管理 V13（医院文化与公益管理组） */}
          <Route path="hospital-culture-mgmt" element={<HospitalCultureMgmt />} />
          {/* M457-B：志愿者服务管理 V13（医院文化与公益管理组） */}
          <Route path="volunteer-service-mgmt" element={<VolunteerServiceMgmt />} />
          {/* M457-C：健康宣教管理（统计视角）V13（医院文化与公益管理组，-stats 避让） */}
          <Route path="health-education-stats-mgmt" element={<HealthEducationStatsMgmt />} />
          {/* M457-D：社工服务管理 V13（M457 收官，医院文化与公益管理组） */}
          <Route path="social-work-service-mgmt" element={<SocialWorkServiceMgmt />} />
          {/* M458-A：日间手术管理 V13（日间手术与门诊操作管理组） */}
          <Route path="day-surgery-mgmt" element={<DaySurgeryMgmt />} />
          {/* M458-B：门诊小手术管理 V13（日间手术与门诊操作管理组） */}
          <Route path="outpatient-minor-surgery-mgmt" element={<OutpatientMinorSurgeryMgmt />} />
          {/* M458-C：门诊治疗室管理 V13（日间手术与门诊操作管理组） */}
          <Route path="outpatient-treatment-room-mgmt" element={<OutpatientTreatmentRoomMgmt />} />
          {/* M458-D：门诊换药管理 V13（M458 收官，日间手术与门诊操作管理组） */}
          <Route path="outpatient-dressing-mgmt" element={<OutpatientDressingMgmt />} />
          {/* M459-A：医院运营管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落） */}
          <Route path="hospital-operations-mgmt" element={<HospitalOperationsMgmt />} />
          {/* M459-B：健康管理体检管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落） */}
          <Route path="health-checkup-mgmt" element={<HealthCheckupMgmt />} />
          {/* M459-C：互联网医院管理 V13（医院运营与健康管理组，M455 旧文件已删除回滚后重落） */}
          <Route path="internet-hospital-mgmt" element={<InternetHospitalMgmt />} />
          {/* M459-D：多学科诊疗MDT管理 V13（M459 收官，医院运营与健康管理组，M455 旧文件已删除回滚后重落） */}
          <Route path="mdt-consultation-mgmt" element={<MdtConsultationMgmt />} />
          {/* 电子病历模板管理（M103-A） */}
          {/* 电子病历模板管理（M103-A） */}
          <Route path="emr/template" element={<EmrTemplatePage />} />
          {/* M461-A：EMR 模板管理 V14（EMR 深化四模块，-management 避让基础名已占） */}
          <Route path="emr-template-management" element={<EmrTemplateManagement />} />
          {/* M461-B：规则质控可视化配置 V14（EMR 深化四模块） */}
          <Route path="qc-rule-config" element={<QcRuleConfigPage />} />
          {/* M461-A：病历书写时限 SLA 实时监控 V14（EMR 深化四模块） */}
          <Route path="emr-sla-monitor" element={<EmrSlaMonitorPage />} />
          {/* M461-B：病历缺陷统计分析 V14（EMR 深化四模块） */}
          <Route path="emr-defect-stats" element={<EmrDefectStatsPage />} />
          {/* M461-C：模板版本审核工作流 V14（EMR 深化四模块） */}
          <Route path="emr-template-review" element={<EmrTemplateReviewPage />} />
          {/* M461-D：科室病历质控评分排名 V14（EMR 深化四模块，M461 收官） */}
          <Route path="emr-qc-ranking" element={<EmrQcRankingPage />} />
          {/* M462-A：病历 AI 草稿生成 V14（EMR 深化四模块） */}
          <Route path="emr-draft-gen" element={<EmrDraftGenPage />} />
          {/* M462-B：病历归档与封存管理 V14（EMR 深化四模块） */}
          <Route path="emr-archive" element={<EmrArchivePage />} />
          {/* M462-C：病历借阅复印管理 V14（EMR 深化四模块） */}
          <Route path="emr-borrow" element={<EmrBorrowPage />} />
          {/* M462-D：电子病历等级评审仪表盘 V14（EMR 深化四模块，M462 收官） */}
          <Route path="emr-grade-dashboard" element={<EmrGradeDashboardPage />} />
          {/* M463-A：病历电子签名与认证 V14（EMR 深化四模块） */}
          <Route path="emr-signature" element={<EmrSignaturePage />} />
          {/* M463-B：病历复制痕迹保留 V14（EMR 深化四模块） */}
          <Route path="emr-copy-trace" element={<EmrCopyTracePage />} />
          {/* M463-C：病历数据导出与区域上报 V14（EMR 深化四模块） */}
          <Route path="emr-export" element={<EmrExportPage />} />
          {/* M463-D：科室质控员工作台 V14（EMR 深化四模块，M463 收官） */}
          <Route path="emr-qc-workbench" element={<EmrQcWorkbenchPage />} />
          {/* M464-A：ICD 编码辅助与校对 V14（EMR 深化四模块） */}
          <Route path="emr-icd-coding" element={<EmrIcdCodingPage />} />
          {/* M464-B：病历术语标准词库 V14（EMR 深化四模块） */}
          <Route path="emr-term-dict" element={<EmrTermDictPage />} />
          {/* M464-C：病历时间轴视图 V14（EMR 深化四模块，-detail 避让 EmrTimelinessPage） */}
          <Route path="emr-timeline-detail" element={<EmrTimelineDetailPage />} />
          {/* M464-D：病历缺陷反馈与整改闭环 V14（EMR 深化四模块，M464 收官） */}
          <Route path="emr-defect-feedback" element={<EmrDefectFeedbackPage />} />
          {/* M465-A：病历模板可视化编辑器 V14（EMR 深化四模块） */}
          <Route path="emr-template-editor" element={<EmrTemplateEditorPage />} />
          {/* M465-B：病历质量实时评分仪表盘 V14（EMR 深化四模块） */}
          <Route path="emr-quality-score" element={<EmrQualityScorePage />} />
          {/* M465-C：患者就诊 360° 全视图 V14（EMR 深化四模块） */}
          <Route path="emr-patient-360" element={<EmrPatient360Page />} />
          {/* M465-D：病历质控知识图谱 V14（EMR 深化四模块，M465 收官） */}
          <Route path="emr-qc-graph" element={<EmrQcGraphPage />} />
          {/* M466-A：病历打印版式与套打 V14（EMR 深化四模块） */}
          <Route path="emr-print-layout" element={<EmrPrintLayoutPage />} />
          {/* M466-B：病历隐私脱敏展示 V14（EMR 深化四模块） */}
          <Route path="emr-masking" element={<EmrMaskingPage />} />
          {/* M466-C：病历模板版本对比 V14（EMR 深化四模块） */}
          <Route path="emr-template-diff" element={<EmrTemplateDiffPage />} />
          {/* M466-D：病历质控月度报告自动生成 V14（EMR 深化四模块，M466 收官） */}
          <Route path="emr-monthly-report" element={<EmrMonthlyReportPage />} />
          {/* M467-A：病历质控规则引擎可视化对接 V14（EMR 深化四模块） */}
          <Route path="emr-rule-engine" element={<EmrRuleEnginePage />} />
          {/* M467-B：病历 AI 辅助书写实时建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-assistant" element={<EmrAiAssistantPage />} />
          {/* M467-C：病历质控追溯审计日志 V14（EMR 深化四模块） */}
          <Route path="emr-qc-audit-log" element={<EmrQcAuditLogPage />} />
          {/* M467-D：病历质控培训考核模块 V14（EMR 深化四模块，M467 收官） */}
          <Route path="emr-training" element={<EmrTrainingPage />} />
          {/* M468-A：病历质控指标体系大屏 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dashboard" element={<EmrQcDashboardPage />} />
          {/* M468-B：病历缺陷根因分析 V14（EMR 深化四模块） */}
          <Route path="emr-root-cause" element={<EmrRootCausePage />} />
          {/* M468-C：病历模板使用统计 V14（EMR 深化四模块） */}
          <Route path="emr-template-usage" element={<EmrTemplateUsagePage />} />
          {/* M468-D：病历质控 PDCA 循环管理 V14（EMR 深化四模块，M468 收官） */}
          <Route path="emr-pdca" element={<EmrPdcaPage />} />
          {/* M469-A：病历质控指标预警阈值配置 V14（EMR 深化四模块） */}
          <Route path="emr-alert-threshold" element={<EmrAlertThresholdPage />} />
          {/* M469-B：病历科室质控对比分析 V14（EMR 深化四模块） */}
          <Route path="emr-dept-compare" element={<EmrDeptComparePage />} />
          {/* M469-C：病历书写规范知识库 V14（EMR 深化四模块） */}
          <Route path="emr-writing-standard" element={<EmrWritingStandardPage />} />
          {/* M469-D：病历质控满意度调查 V14（EMR 深化四模块，M469 收官） */}
          <Route path="emr-satisfaction" element={<EmrSatisfactionPage />} />
          {/* M470-A：病历质控指标趋势预测 V14（EMR 深化四模块） */}
          <Route path="emr-trend-forecast" element={<EmrTrendForecastPage />} />
          {/* M470-B：病历科室质控排行榜 V14（EMR 深化四模块，-board 后缀避让） */}
          <Route path="emr-qc-ranking-board" element={<EmrQcRankingBoardPage />} />
          {/* M470-C：病历缺陷自动分类 V14（EMR 深化四模块） */}
          <Route path="emr-defect-classifier" element={<EmrDefectClassifierPage />} />
          {/* M470-D：病历质控智能报表 V14（EMR 深化四模块，M470 收官） */}
          <Route path="emr-smart-report" element={<EmrSmartReportPage />} />
          {/* M471-A：病历质控整改工单管理 V14（EMR 深化四模块） */}
          <Route path="emr-rectification-order" element={<EmrRectificationOrderPage />} />
          {/* M471-B：病历质控专家在线评审 V14（EMR 深化四模块） */}
          <Route path="emr-expert-review" element={<EmrExpertReviewPage />} />
          {/* M471-C：病历质控指标对标分析 V14（EMR 深化四模块） */}
          <Route path="emr-benchmark" element={<EmrBenchmarkPage />} />
          {/* M471-D：病历质控年度总结报告 V14（EMR 深化四模块，M471 收官） */}
          <Route path="emr-annual-report" element={<EmrAnnualReportPage />} />
          {/* M472-A：病历质控指标字典管理 V14（EMR 深化四模块） */}
          {/* M472-A 新规格：病历质控指标字典管理 V14（EMR 深化四模块） */}
          <Route path="emr-indicator-dict" element={<EmrIndicatorDictPage />} />
          {/* M472-B：病历质控规则版本管理 V14（EMR 深化四模块） */}
          <Route path="emr-rule-version" element={<EmrRuleVersionPage />} />
          {/* M472-C：病历质控通知公告 V14（EMR 深化四模块） */}
          <Route path="emr-qc-notice" element={<EmrQcNoticePage />} />
          {/* M472-D：病历质控数据导出中心 V14（EMR 深化四模块，M472 收官） */}
          <Route path="emr-data-export" element={<EmrDataExportPage />} />
          {/* M473-A：病历质控数据字典管理 V14（EMR 深化四模块） */}
          <Route path="emr-data-dict" element={<EmrDataDictPage />} />
          {/* M473-B：病历质控权限管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-permission" element={<EmrQcPermissionPage />} />
          {/* M473-C：病历质控操作日志 V14（EMR 深化四模块） */}
          <Route path="emr-qc-op-log" element={<EmrQcOpLogPage />} />
          {/* M473-D：病历质控系统配置 V14（EMR 深化四模块，M473 收官） */}
          <Route path="emr-qc-config" element={<EmrQcConfigPage />} />
          {/* M474-A：病历质控质控员工作台 V14（-desk 后缀避让 M463-D emrQcWorkbenchV14） */}
          <Route path="emr-qc-workbench-desk" element={<EmrQcWorkbenchDeskPage />} />
          {/* M474-B：病历质控科室自查 V14（EMR 深化四模块） */}
          <Route path="emr-dept-self-check" element={<EmrDeptSelfCheckPage />} />
          {/* M474-C：病历质控专家库管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-expert-pool" element={<EmrQcExpertPoolPage />} />
          {/* M474-D：病历质控质量监控大盘 V14（EMR 深化四模块，M474 收官） */}
          <Route path="emr-qc-monitor-board" element={<EmrQcMonitorBoardPage />} />
          {/* M475-A：病历质控指标趋势预警 V14（EMR 深化四模块） */}
          <Route path="emr-qc-trend-alert" element={<EmrQcTrendAlertPage />} />
          {/* M475-B：病历质控科室质量报告 V14（EMR 深化四模块） */}
          <Route path="emr-dept-qc-report" element={<EmrDeptQcReportPage />} />
          {/* M475-C：病历质控患者满意度 V14（EMR 深化四模块） */}
          <Route path="emr-patient-satisfaction" element={<EmrPatientSatisfactionPage />} />
          {/* M475-D：病历质控知识库 V14（EMR 深化四模块，M475 收官） */}
          <Route path="emr-qc-knowledge" element={<EmrQcKnowledgePage />} />
          {/* M476-A：病历完整性检查 V14（EMR 深化四模块，病历四大检查系列①完整性） */}
          <Route path="emr-completeness-check" element={<EmrCompletenessCheckPage />} />
          {/* M476-B：病历一致性检查 V14（EMR 深化四模块，病历四大检查系列②一致性） */}
          <Route path="emr-consistency-check" element={<EmrConsistencyCheckPage />} />
          {/* M476-C：病历时效性检查 V14（EMR 深化四模块，病历四大检查系列③时效性） */}
          <Route path="emr-timeliness-check" element={<EmrTimelinessCheckPage />} />
          {/* M476-D：病历规范性检查 V14（EMR 深化四模块，病历四大检查系列④规范性，M476 收官） */}
          <Route path="emr-normativity-check" element={<EmrNormativityCheckPage />} />
          {/* M477-A：病历内涵质控 V14（EMR 深化四模块） */}
          <Route path="emr-intrinsic-qc" element={<EmrIntrinsicQcPage />} />
          {/* M477-B：病历逻辑校验 V14（EMR 深化四模块） */}
          <Route path="emr-logic-validation" element={<EmrLogicValidationPage />} />
          {/* M477-C：病历术语规范 V14（EMR 深化四模块） */}
          <Route path="emr-terminology" element={<EmrTerminologyPage />} />
          {/* M477-D：病历模板质控联动 V14（EMR 深化四模块，M477 收官） */}
          <Route path="emr-template-qc-link" element={<EmrTemplateQcLinkPage />} />
          {/* M478-A：病历审核工作流 V14（EMR 深化四模块） */}
          <Route path="emr-review-workflow" element={<EmrReviewWorkflowPage />} />
          {/* M478-B：病历归档规则 V14（EMR 深化四模块） */}
          <Route path="emr-archive-rule" element={<EmrArchiveRulePage />} />
          {/* M478-C：病历打印规范 V14（EMR 深化四模块） */}
          <Route path="emr-print-spec" element={<EmrPrintSpecPage />} />
          {/* M478-D：病历质控报表中心 V14（EMR 深化四模块，M478 收官） */}
          <Route path="emr-qc-report-center" element={<EmrQcReportCenterPage />} />
          {/* M479-A：病历质控评分模型 V14（EMR 深化四模块） */}
          <Route path="emr-qc-score-model" element={<EmrQcScoreModelPage />} />
          {/* M479-B：病历质控权重配置 V14（EMR 深化四模块） */}
          <Route path="emr-qc-weight-config" element={<EmrQcWeightConfigPage />} />
          {/* M479-C：病历质控等级评定 V14（EMR 深化四模块） */}
          <Route path="emr-qc-grade" element={<EmrQcGradePage />} />
          {/* M479-D：病历质控持续改进 V14（EMR 深化四模块，M479 收官） */}
          <Route path="emr-qc-continuous-improve" element={<EmrQcContinuousImprovePage />} />
          {/* M480-A：DRG 病案质控 V14（EMR 深化四模块） */}
          <Route path="emr-drg-qc" element={<EmrDrgQcPage />} />
          {/* M480-B：临床路径质控 V14（EMR 深化四模块） */}
          <Route path="emr-clinical-path-qc" element={<EmrClinicalPathQcPage />} />
          {/* M480-C：病案首页质控 V14（EMR 深化四模块） */}
          <Route path="emr-front-page-qc" element={<EmrFrontPageQcPage />} />
          {/* M480-D：终末质控 V14（EMR 深化四模块，M480 收官） */}
          <Route path="emr-terminal-qc" element={<EmrTerminalQcPage />} />
          {/* M481-A：运行病历质控 V14（EMR 深化四模块） */}
          <Route path="emr-running-qc" element={<EmrRunningQcPage />} />
          {/* M481-B：环节质控 V14（EMR 深化四模块） */}
          <Route path="emr-stage-qc" element={<EmrStageQcPage />} />
          {/* M481-C：出院病历质控 V14（EMR 深化四模块） */}
          <Route path="emr-discharge-qc" element={<EmrDischargeQcPage />} />
          {/* M481-D：病历质量评分汇总 V14（EMR 深化四模块，M481 收官，-summary 避让 M465-B） */}
          <Route path="emr-quality-score-summary" element={<EmrQualityScoreSummaryPage />} />
          {/* M482-A：病历复印申请 V14（EMR 深化四模块） */}
          <Route path="emr-copy-request" element={<EmrCopyRequestPage />} />
          {/* M482-B：病历借阅登记 V14（EMR 深化四模块） */}
          <Route path="emr-borrow-register" element={<EmrBorrowRegisterPage />} />
          {/* M482-C：病历封存解封 V14（EMR 深化四模块） */}
          <Route path="emr-seal-unseal" element={<EmrSealUnsealPage />} />
          {/* M482-D：病历销毁记录 V14（EMR 深化四模块，M482 收官） */}
          <Route path="emr-destroy-record" element={<EmrDestroyRecordPage />} />
          {/* M483-A：质控指标采集 V14（EMR 深化四模块，质控指标系列） */}
          <Route path="emr-qc-metric-collect" element={<EmrQcMetricCollectPage />} />
          {/* M483-B：质控指标计算 V14（EMR 深化四模块，质控指标系列） */}
          <Route path="emr-qc-metric-calc" element={<EmrQcMetricCalcPage />} />
          {/* M483-C：质控指标预警 V14（EMR 深化四模块，质控指标系列） */}
          <Route path="emr-qc-metric-alert" element={<EmrQcMetricAlertPage />} />
          {/* M483-D：质控指标分析 V14（EMR 深化四模块，M483 收官） */}
          <Route path="emr-qc-metric-analysis" element={<EmrQcMetricAnalysisPage />} />
          {/* M484-A（新规格）：质控指标看板 V14（EMR 深化四模块） */}
          <Route path="emr-qc-metric-dashboard" element={<EmrQcMetricDashboardPage />} />
          {/* M484-B（新规格）：质控指标对标 V14（EMR 深化四模块） */}
          <Route path="emr-qc-metric-benchmark" element={<EmrQcMetricBenchmarkPage />} />
          {/* M484-C（新规格）：质控指标钻取 V14（EMR 深化四模块） */}
          <Route path="emr-qc-metric-drilldown" element={<EmrQcMetricDrilldownPage />} />
          {/* M484-D（新规格）：质控指标导出 V14（EMR 深化四模块，M484 收官） */}
          <Route path="emr-qc-metric-export" element={<EmrQcMetricExportPage />} />
          {/* M485-A：病历书写规范检查 V14（EMR 深化四模块） */}
          <Route path="emr-writing-standard-check" element={<EmrWritingStandardCheckPage />} />
          {/* M485-B：病历逻辑关系检查 V14（EMR 深化四模块） */}
          <Route path="emr-logic-relation-check" element={<EmrLogicRelationCheckPage />} />
          {/* M485-C：病历术语规范检查 V14（EMR 深化四模块） */}
          <Route path="emr-terminology-check" element={<EmrTerminologyCheckPage />} />
          {/* M485-D：病历时效合规检查 V14（EMR 深化四模块，M485 收官） */}
          <Route path="emr-timeliness-compliance" element={<EmrTimelinessCompliancePage />} />
          {/* M486-A：AI 病历摘要生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-summary" element={<EmrAiSummaryPage />} />
          {/* M486-B：AI 病历关键词提取 V14（EMR 深化四模块） */}
          <Route path="emr-ai-keyword" element={<EmrAiKeywordPage />} />
          {/* M486-C：AI 病历风险预测 V14（EMR 深化四模块） */}
          <Route path="emr-ai-risk-predict" element={<EmrAiRiskPredictPage />} />
          {/* M486-D：AI 病历相似病历推荐 V14（EMR 深化四模块，M486 收官） */}
          <Route path="emr-ai-similar" element={<EmrAiSimilarPage />} />
          {/* M487-A：质控日报 V14（EMR 深化四模块） */}
          <Route path="emr-qc-daily-report" element={<EmrQcDailyReportPage />} />
          {/* M487-B：质控周报 V14（EMR 深化四模块） */}
          <Route path="emr-qc-weekly-report" element={<EmrQcWeeklyReportPage />} />
          {/* M487-C：质控季报 V14（EMR 深化四模块） */}
          <Route path="emr-qc-quarterly-report" element={<EmrQcQuarterlyReportPage />} />
          {/* M487-D：质控年报 V14（EMR 深化四模块，M487 收官） */}
          <Route path="emr-qc-annual-report" element={<EmrQcAnnualReportPage />} />
          {/* M488-A：质控任务派发 V14（EMR 深化四模块） */}
          <Route path="emr-qc-task-dispatch" element={<EmrQcTaskDispatchPage />} />
          {/* M488-B：质控任务签收 V14（EMR 深化四模块） */}
          <Route path="emr-qc-task-receive" element={<EmrQcTaskReceivePage />} />
          {/* M488-C：质控任务退回 V14（EMR 深化四模块） */}
          <Route path="emr-qc-task-return" element={<EmrQcTaskReturnPage />} />
          {/* M488-D：质控任务归档 V14（EMR 深化四模块，M488 收官） */}
          <Route path="emr-qc-task-archive" element={<EmrQcTaskArchivePage />} />
          {/* M489-A：质控知识节点管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-knowledge-node" element={<EmrQcKnowledgeNodePage />} />
          {/* M489-B：质控知识关系管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-knowledge-relation" element={<EmrQcKnowledgeRelationPage />} />
          {/* M489-C：质控知识推理路径 V14（EMR 深化四模块） */}
          <Route path="emr-qc-reasoning-path" element={<EmrQcReasoningPathPage />} />
          {/* M489-D：质控知识置信度评估 V14（EMR 深化四模块，M489 收官） */}
          <Route path="emr-qc-confidence" element={<EmrQcConfidencePage />} />
          {/* M490-A：NLP 病历实体识别 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-entity" element={<EmrNlpEntityPage />} />
          {/* M490-B：NLP 病历关系抽取 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-relation" element={<EmrNlpRelationPage />} />
          {/* M490-C：NLP 病历事件提取 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-event" element={<EmrNlpEventPage />} />
          {/* M490-D：NLP 病历时间线构建 V14（EMR 深化四模块，M490 收官） */}
          <Route path="emr-nlp-timeline" element={<EmrNlpTimelinePage />} />
          {/* M491-A：NLP 病历纠错 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-correction" element={<EmrNlpCorrectionPage />} />
          {/* M491-B：NLP 病历标准化 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-normalization" element={<EmrNlpNormalizationPage />} />
          {/* M491-C：NLP 病历去重 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-deduplication" element={<EmrNlpDeduplicationPage />} />
          {/* M491-D：NLP 病历相似度计算 V14（EMR 深化四模块，M491 收官） */}
          <Route path="emr-nlp-similarity" element={<EmrNlpSimilarityPage />} />
          {/* M492-A：质控评分规则配置 V14（EMR 深化四模块） */}
          <Route path="emr-qc-score-rule" element={<EmrQcScoreRulePage />} />
          {/* M492-B：质控评分自动计算 V14（EMR 深化四模块） */}
          <Route path="emr-qc-score-calc" element={<EmrQcScoreCalcPage />} />
          {/* M492-C：质控评分历史对比 V14（EMR 深化四模块） */}
          <Route path="emr-qc-score-history" element={<EmrQcScoreHistoryPage />} />
          {/* M492-D：质控评分改进建议 V14（EMR 深化四模块，M492 收官） */}
          <Route path="emr-qc-score-suggestion" element={<EmrQcScoreSuggestionPage />} />
          {/* M493-A：质控科室看板 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-dashboard" element={<EmrQcDeptDashboardPage />} />
          {/* M493-B：质控科室对比 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-compare" element={<EmrQcDeptComparePage />} />
          {/* M493-C：质控科室排名 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-ranking" element={<EmrQcDeptRankingPage />} />
          {/* M493-D：质控科室整改跟踪 V14（EMR 深化四模块，M493 收官） */}
          <Route path="emr-qc-dept-rectify" element={<EmrQcDeptRectifyPage />} />
          {/* M494-A：质控医生评分 V14（EMR 深化四模块） */}
          <Route path="emr-qc-doctor-score" element={<EmrQcDoctorScorePage />} />
          {/* M494-B：质控护士评分 V14（EMR 深化四模块） */}
          <Route path="emr-qc-nurse-score" element={<EmrQcNurseScorePage />} />
          {/* M494-C：质控科室主任评分 V14（EMR 深化四模块） */}
          <Route path="emr-qc-director-score" element={<EmrQcDirectorScorePage />} />
          {/* M494-D：质控全院人员排名 V14（EMR 深化四模块，M494 收官） */}
          <Route path="emr-qc-staff-ranking" element={<EmrQcStaffRankingPage />} />
          {/* M495-A：质控缺陷趋势预测 V14（EMR 深化四模块） */}
          <Route path="emr-qc-trend-forecast" element={<EmrQcTrendForecastPage />} />
          {/* M495-B：质控科室预警阈值 V14（EMR 深化四模块） */}
          <Route path="emr-qc-alert-threshold" element={<EmrQcAlertThresholdPage />} />
          {/* M495-C：质控风险等级评估 V14（EMR 深化四模块） */}
          <Route path="emr-qc-risk-level" element={<EmrQcRiskLevelPage />} />
          {/* M495-D：质控干预建议生成 V14（EMR 深化四模块，M495 收官） */}
          <Route path="emr-qc-intervention" element={<EmrQcInterventionPage />} />
          {/* M496-A：质控问题反馈闭环 V14（EMR 深化四模块） */}
          <Route path="emr-qc-feedback-loop" element={<EmrQcFeedbackLoopPage />} />
          {/* M496-B：质控整改验证 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rectify-verify" element={<EmrQcRectifyVerifyPage />} />
          {/* M496-C：质控复发预警 V14（EMR 深化四模块） */}
          <Route path="emr-qc-recurrence" element={<EmrQcRecurrencePage />} />
          {/* M496-D：质控 PDCA 闭环报告 V14（EMR 深化四模块，M496 收官） */}
          <Route path="emr-qc-pdca-report" element={<EmrQcPdcaReportPage />} />
          {/* M497-A：质控数据导出 Excel V14（EMR 深化四模块） */}
          <Route path="emr-qc-export-excel" element={<EmrQcExportExcelPage />} />
          {/* M497-B：质控数据导出 PDF V14（EMR 深化四模块） */}
          <Route path="emr-qc-export-pdf" element={<EmrQcExportPdfPage />} />
          {/* M497-C：质控数据导出 CSV V14（EMR 深化四模块） */}
          <Route path="emr-qc-export-csv" element={<EmrQcExportCsvPage />} />
          {/* M497-D：质控数据导出区域上报 V14（EMR 深化四模块，M497 收官） */}
          <Route path="emr-qc-export-region" element={<EmrQcExportRegionPage />} />
          {/* M498-A：质控系统参数配置 V14（EMR 深化四模块） */}
          <Route path="emr-qc-sys-param" element={<EmrQcSysParamPage />} />
          {/* M498-B：质控操作日志审计记录 V14（EMR 深化四模块，避让 M467-C emr-qc-audit-log） */}
          <Route path="emr-qc-audit-log-record" element={<EmrQcAuditLogRecordPage />} />
          {/* M498-C：质控数据字典管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-data-dict" element={<EmrQcDataDictPage />} />
          {/* M498-D：质控权限管理 V14（EMR 深化四模块，M498 收官，避让 M473-B emr-qc-permission） */}
          <Route path="emr-qc-permission-manage" element={<EmrQcPermissionManagePage />} />
          {/* M499-A：质控 AI 缺陷自动分类 V14（EMR 深化四模块） */}
          <Route path="emr-qc-ai-defect-classify" element={<EmrQcAiDefectClassifyPage />} />
          {/* M499-B：质控 AI 书写建议 V14（EMR 深化四模块） */}
          <Route path="emr-qc-ai-writing-suggest" element={<EmrQcAiWritingSuggestPage />} />
          {/* M499-C：质控 AI 相似病历推荐 V14（EMR 深化四模块） */}
          <Route path="emr-qc-ai-similar-record" element={<EmrQcAiSimilarRecordPage />} />
          {/* M499-D：质控 AI 知识问答 V14（EMR 深化四模块，M499 收官） */}
          <Route path="emr-qc-ai-qa" element={<EmrQcAiQaPage />} />
          {/* M500-A：质控缺陷统计 V14（EMR 深化四模块，里程碑批次） */}
          <Route path="emr-qc-defect-stat" element={<EmrQcDefectStatPage />} />
          {/* M500-B：质控合格率统计 V14（EMR 深化四模块，里程碑批次） */}
          <Route path="emr-qc-pass-rate-stat" element={<EmrQcPassRateStatPage />} />
          {/* M500-C：质控时效统计 V14（EMR 深化四模块，里程碑批次） */}
          <Route path="emr-qc-timeliness-stat" element={<EmrQcTimelinessStatPage />} />
          {/* M500-D：质控综合统计大屏 V14（EMR 深化四模块，M500 收官里程碑） */}
          <Route path="emr-qc-stat-dashboard" element={<EmrQcStatDashboardPage />} />
          {/* M501-A：质控科室对比分析 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-compare-analysis" element={<EmrQcDeptCompareAnalysisPage />} />
          {/* M501-B：质控科室趋势分析 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-trend-analysis" element={<EmrQcDeptTrendAnalysisPage />} />
          {/* M501-C：质控科室改进建议 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-improve-suggest" element={<EmrQcDeptImproveSuggestPage />} />
          {/* M501-D：质控科室考核评分 V14（EMR 深化四模块，M501 收官） */}
          <Route path="emr-qc-dept-assess-score" element={<EmrQcDeptAssessScorePage />} />
          {/* M502-A：质控专家库管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-expert-library" element={<EmrQcExpertLibraryPage />} />
          {/* M502-B：质控专家在线评审 V14（EMR 深化四模块） */}
          <Route path="emr-qc-expert-online-review" element={<EmrQcExpertOnlineReviewPage />} />
          {/* M502-C：质控评审意见汇总 V14（EMR 深化四模块） */}
          <Route path="emr-qc-review-summary" element={<EmrQcReviewSummaryPage />} />
          {/* M502-D：质控专家绩效统计 V14（EMR 深化四模块，M502 收官） */}
          <Route path="emr-qc-expert-performance" element={<EmrQcExpertPerformancePage />} />
          {/* M503-A：质控培训课程管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-training-course" element={<EmrQcTrainingCoursePage />} />
          {/* M503-B：质控在线考试 V14（EMR 深化四模块） */}
          <Route path="emr-qc-online-exam" element={<EmrQcOnlineExamPage />} />
          {/* M503-C：质控考核证书 V14（EMR 深化四模块） */}
          <Route path="emr-qc-exam-certificate" element={<EmrQcExamCertificatePage />} />
          {/* M503-D：质控培训记录 V14（EMR 深化四模块，M503 收官） */}
          <Route path="emr-qc-training-record" element={<EmrQcTrainingRecordPage />} />
          {/* M504-A：质控 PDCA 改进计划 V14（EMR 深化四模块） */}
          <Route path="emr-qc-pdca-plan" element={<EmrQcPdcaPlanPage />} />
          {/* M504-B：质控质量改进项目 V14（EMR 深化四模块） */}
          <Route path="emr-qc-quality-project" element={<EmrQcQualityProjectPage />} />
          {/* M504-C：质控标杆管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-benchmarking" element={<EmrQcBenchmarkingPage />} />
          {/* M504-D：质控患者满意度调查 V14（EMR 深化四模块，M504 收官） */}
          <Route path="emr-qc-patient-satisfaction" element={<EmrQcPatientSatisfactionPage />} />
          {/* M505-A：质控规范库管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-norm-library" element={<EmrQcNormLibraryPage />} />
          {/* M505-B：质控制度查询 V14（EMR 深化四模块） */}
          <Route path="emr-qc-policy-query" element={<EmrQcPolicyQueryPage />} />
          {/* M505-C：质控指南库 V14（EMR 深化四模块） */}
          <Route path="emr-qc-guideline-library" element={<EmrQcGuidelineLibraryPage />} />
          {/* M505-D：质控法律法规 V14（EMR 深化四模块，M505 收官） */}
          <Route path="emr-qc-regulation" element={<EmrQcRegulationPage />} />
          {/* M506-A：质控缺陷趋势图 V14（EMR 深化四模块） */}
          <Route path="emr-qc-defect-trend-chart" element={<EmrQcDefectTrendChartPage />} />
          {/* M506-B：质控科室对比雷达图 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-radar-chart" element={<EmrQcDeptRadarChartPage />} />
          {/* M506-C：质控月度报表 V14（EMR 深化四模块） */}
          <Route path="emr-qc-monthly-report" element={<EmrQcMonthlyReportPage />} />
          {/* M506-D：质控年度总结报告 V14（EMR 深化四模块，M506 收官） */}
          <Route path="emr-qc-annual-summary-report" element={<EmrQcAnnualSummaryReportPage />} />
          {/* M507-A：质控系统参数配置明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-sys-param-detail" element={<EmrQcSysParamDetailPage />} />
          {/* M507-B：质控操作日志查询明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-audit-log-detail" element={<EmrQcAuditLogDetailPage />} />
          {/* M507-C：质控数据字典管理明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-data-dict-detail" element={<EmrQcDataDictDetailPage />} />
          {/* M507-D：质控权限管理明细 V14（EMR 深化四模块，M507 收官，-detail 避让） */}
          <Route path="emr-qc-permission-detail" element={<EmrQcPermissionDetailPage />} />
          {/* M508-A：质控 AI 缺陷自动分类明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-ai-defect-classify-detail" element={<EmrQcAiDefectClassifyDetailPage />} />
          {/* M508-B：质控 AI 辅助书写建议明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-ai-writing-suggest-detail" element={<EmrQcAiWritingSuggestDetailPage />} />
          {/* M508-C：质控 AI 相似病历推荐明细 V14（EMR 深化四模块，-detail 避让） */}
          <Route path="emr-qc-ai-similar-record-detail" element={<EmrQcAiSimilarRecordDetailPage />} />
          {/* M508-D：质控 AI 智能问答助手 V14（EMR 深化四模块，M508 收官） */}
          <Route path="emr-qc-ai-qa-assistant" element={<EmrQcAiQaAssistantPage />} />
          {/* M509-A：质控内科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-internal-med-rules" element={<EmrQcInternalMedRulesPage />} />
          {/* M509-B：质控外科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-surgery-rules" element={<EmrQcSurgeryRulesPage />} />
          {/* M509-C：质控儿科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-pediatrics-rules" element={<EmrQcPediatricsRulesPage />} />
          {/* M509-D：质控妇产科专科规则 V14（EMR 深化四模块，M509 收官） */}
          <Route path="emr-qc-obgyn-rules" element={<EmrQcObgynRulesPage />} />
          {/* M510-A：质控急诊专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-emergency-rules" element={<EmrQcEmergencyRulesPage />} />
          {/* M510-B：质控重症医学科(ICU)专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-icu-rules" element={<EmrQcIcuRulesPage />} />
          {/* M510-C：质控中医科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-tcm-rules" element={<EmrQcTcmRulesPage />} />
          {/* M510-D：质控康复科专科规则 V14（EMR 深化四模块，M510 收官） */}
          <Route path="emr-qc-rehab-rules" element={<EmrQcRehabRulesPage />} />
          {/* M511-A：质控皮肤科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dermatology-rules" element={<EmrQcDermatologyRulesPage />} />
          {/* M511-B：质控眼科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-ophthalmology-rules" element={<EmrQcOphthalmologyRulesPage />} />
          {/* M511-C：质控口腔科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-dentistry-rules" element={<EmrQcDentistryRulesPage />} />
          {/* M511-D：质控耳鼻喉科专科规则 V14（EMR 深化四模块，M511 收官） */}
          <Route path="emr-qc-ent-rules" element={<EmrQcEntRulesPage />} />
          {/* M512-A：质控麻醉科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-anesthesia-rules" element={<EmrQcAnesthesiaRulesPage />} />
          {/* M512-B：质控病理科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-pathology-rules" element={<EmrQcPathologyRulesPage />} />
          {/* M512-C：质控营养科专科规则 V14（EMR 深化四模块） */}
          <Route path="emr-qc-nutrition-rules" element={<EmrQcNutritionRulesPage />} />
          {/* M512-D：质控疼痛科专科规则 V14（EMR 深化四模块，M512 收官） */}
          <Route path="emr-qc-pain-rules" element={<EmrQcPainRulesPage />} />
          {/* M513-A（新规格）：质控-电子签名联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-signature-link" element={<EmrQcSignatureLinkPage />} />
          {/* M513-B：质控-医嘱联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-order-link" element={<EmrQcOrderLinkPage />} />
          {/* M513-C：质控-护理记录联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-nursing-link" element={<EmrQcNursingLinkPage />} />
          {/* M513-D：质控-手术麻醉联动 V14（EMR 深化四模块，M513 收官） */}
          <Route path="emr-qc-surgery-link" element={<EmrQcSurgeryLinkPage />} />
          {/* M514-A：质控-检验检查联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-lab-exam-link" element={<EmrQcLabExamLinkPage />} />
          {/* M514-B：质控-输血记录联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-transfusion-link" element={<EmrQcTransfusionLinkPage />} />
          {/* M514-C：质控-临床路径联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-clinical-pathway-link" element={<EmrQcClinicalPathwayLinkPage />} />
          {/* M514-D：质控-抗菌药物管理联动 V14（EMR 深化四模块，M514 收官） */}
          <Route path="emr-qc-antibiotic-link" element={<EmrQcAntibioticLinkPage />} />
          {/* M515-A：质控-危急值联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-critical-value-link" element={<EmrQcCriticalValueLinkPage />} />
          {/* M515-B：质控-VTE预防联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-vte-link" element={<EmrQcVteLinkPage />} />
          {/* M515-C：质控-患者投诉联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-complaint-link" element={<EmrQcComplaintLinkPage />} />
          {/* M515-D：质控-手术分级授权联动 V14（EMR 深化四模块，M515 收官） */}
          <Route path="emr-qc-surgery-auth-link" element={<EmrQcSurgeryAuthLinkPage />} />
          {/* M516-A：质控-病案首页联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-homepage-link" element={<EmrQcHomepageLinkPage />} />
          {/* M516-B：质控-出院小结联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-discharge-summary-link" element={<EmrQcDischargeSummaryLinkPage />} />
          {/* M516-C：质控-转科记录联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-transfer-link" element={<EmrQcTransferLinkPage />} />
          {/* M516-D：质控-会诊记录联动 V14（EMR 深化四模块，M516 收官） */}
          <Route path="emr-qc-consult-link" element={<EmrQcConsultLinkPage />} />
          {/* M517-A：质控-护理评估单联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-nursing-assessment-link" element={<EmrQcNursingAssessmentLinkPage />} />
          {/* M517-B：质控-疼痛评估联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-pain-assessment-link" element={<EmrQcPainAssessmentLinkPage />} />
          {/* M517-C：质控-压疮风险评估联动 V14（EMR 深化四模块） */}
          <Route path="emr-qc-pressure-ulcer-link" element={<EmrQcPressureUlcerLinkPage />} />
          {/* M517-D：质控-营养风险筛查联动 V14（EMR 深化四模块，M517 收官） */}
          <Route path="emr-qc-nutrition-screen-link" element={<EmrQcNutritionScreenLinkPage />} />
          {/* M518-A：科室质控月报自动生成 V14（EMR 深化四模块，避让 -dept） */}
          <Route path="emr-qc-dept-monthly-report" element={<EmrQcDeptMonthlyReportPage />} />
          {/* M518-B：个人质控档案自动生成 V14（EMR 深化四模块） */}
          <Route path="emr-qc-personal-profile" element={<EmrQcPersonalProfilePage />} />
          {/* M518-C：质控整改通知单自动生成 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rectification-notice" element={<EmrQcRectificationNoticePage />} />
          {/* M518-D：质控PDCA报告自动生成 V14（EMR 深化四模块，M518 收官，避让 -auto） */}
          <Route path="emr-qc-pdca-auto-report" element={<EmrQcPdcaReportAutoPage />} />
          {/* M519-A：质控规则可视化编辑器 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rule-editor" element={<EmrQcRuleEditorPage />} />
          {/* M519-B：质控规则版本管理 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rule-version" element={<EmrQcRuleVersionPage />} />
          {/* M519-C：质控规则模拟测试 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rule-simulator" element={<EmrQcRuleSimulatorPage />} />
          {/* M519-D：质控规则对比分析 V14（EMR 深化四模块，M519 收官） */}
          <Route path="emr-qc-rule-compare" element={<EmrQcRuleComparePage />} />
          {/* M520-A：质控规则智能推荐 V14（EMR 深化四模块） */}
          <Route path="emr-qc-rule-recommendation" element={<EmrQcRuleRecommendationPage />} />
          {/* M520-B：质控缺陷案例库 V14（EMR 深化四模块） */}
          <Route path="emr-qc-defect-case-library" element={<EmrQcDefectCaseLibraryPage />} />
          {/* M520-C：质控行业标准库 V14（EMR 深化四模块） */}
          <Route path="emr-qc-standard-library" element={<EmrQcStandardLibraryPage />} />
          {/* M520-D：质控最佳实践库 V14（EMR 深化四模块，M520 收官） */}
          <Route path="emr-qc-best-practice" element={<EmrQcBestPracticePage />} />
          {/* M521-A：病历自动归档触发 V14（EMR 深化四模块） */}
          <Route path="emr-qc-auto-archive" element={<EmrQcAutoArchivePage />} />
          {/* M521-B：病历质控自动派单 V14（EMR 深化四模块） */}
          <Route path="emr-qc-auto-dispatch" element={<EmrQcAutoDispatchPage />} />
          {/* M521-C：病历缺陷自动分发 V14（EMR 深化四模块） */}
          <Route path="emr-qc-defect-auto-route" element={<EmrQcDefectAutoRoutePage />} />
          {/* M521-D：病历整改自动跟踪 V14（EMR 深化四模块，M521 收官） */}
          <Route path="emr-qc-rectification-tracking" element={<EmrQcRectificationTrackingPage />} />
          {/* M522-A：AI病历生成辅助 V14（EMR 深化四模块） */}
          <Route path="emr-ai-generation-assist" element={<EmrAiGenerationAssistPage />} />
          {/* M522-B：AI病历质量预测 V14（EMR 深化四模块） */}
          <Route path="emr-ai-quality-predict" element={<EmrAiQualityPredictPage />} />
          {/* M522-C：AI病历缺陷根因分析 V14（EMR 深化四模块） */}
          <Route path="emr-ai-defect-root-cause" element={<EmrAiDefectRootCausePage />} />
          {/* M522-D：AI病历质控知识图谱推理 V14（EMR 深化四模块，M522 收官） */}
          <Route path="emr-ai-kgraph-reasoning" element={<EmrAiKGraphReasoningPage />} />
          {/* M523-A：门诊病历模板库 V14（EMR 深化四模块） */}
          <Route path="emr-template-outpatient-library" element={<EmrTemplateOutpatientLibraryPage />} />
          {/* M523-B：入院记录模板细化 V14（EMR 深化四模块） */}
          <Route path="emr-template-admission-detail" element={<EmrTemplateAdmissionDetailPage />} />
          {/* M523-C：手术记录模板规范 V14（EMR 深化四模块） */}
          <Route path="emr-template-surgery-spec" element={<EmrTemplateSurgerySpecPage />} />
          {/* M523-D：出院小结模板标准化 V14（EMR 深化四模块，M523 收官） */}
          <Route path="emr-template-discharge-std" element={<EmrTemplateDischargeStdPage />} />
          {/* M524-A：模板版本对比 V14（EMR 深化四模块） */}
          <Route path="emr-template-version-compare" element={<EmrTemplateVersionComparePage />} />
          {/* M524-B：模板科室个性化 V14（EMR 深化四模块） */}
          <Route path="emr-template-dept-personal" element={<EmrTemplateDeptPersonalPage />} />
          {/* M524-C：模板医生个人偏好 V14（EMR 深化四模块） */}
          <Route path="emr-template-doctor-pref" element={<EmrTemplateDoctorPrefPage />} />
          {/* M524-D：模板审批流程 V14（EMR 深化四模块，M524 收官） */}
          <Route path="emr-template-approval" element={<EmrTemplateApprovalPage />} />
          {/* M525-A：临床路径模板联动 V14（EMR 深化四模块） */}
          <Route path="emr-template-clinical-path" element={<EmrTemplateClinicalPathPage />} />
          {/* M525-B：病种模板智能推荐 V14（EMR 深化四模块） */}
          <Route path="emr-template-disease-recommend" element={<EmrTemplateDiseaseRecommendPage />} />
          {/* M525-C：模板使用统计分析 V14（EMR 深化四模块） */}
          <Route path="emr-template-usage-stats" element={<EmrTemplateUsageStatsPage />} />
          {/* M525-D：模板效果评估 V14（EMR 深化四模块，M525 收官） */}
          <Route path="emr-template-effect-eval" element={<EmrTemplateEffectEvalPage />} />
          {/* M526-A：质控移动端审批 V14（EMR 深化四模块） */}
          <Route path="emr-qc-mobile-approval" element={<EmrQcMobileApprovalPage />} />
          {/* M526-B：质控移动端查看 V14（EMR 深化四模块） */}
          <Route path="emr-qc-mobile-view" element={<EmrQcMobileViewPage />} />
          {/* M526-C：质控移动端通知 V14（EMR 深化四模块） */}
          <Route path="emr-qc-mobile-notify" element={<EmrQcMobileNotifyPage />} />
          {/* M526-D：质控移动端整改 V14（EMR 深化四模块，M526 收官） */}
          <Route path="emr-qc-mobile-rectify" element={<EmrQcMobileRectifyPage />} />
          {/* M527-A：病历书写时限管控 V14（EMR 深化四模块） */}
          <Route path="emr-writing-time-limit" element={<EmrWritingTimeLimitPage />} />
          {/* M527-B：病历终末质控评分 V14（EMR 深化四模块） */}
          <Route path="emr-final-qc-score" element={<EmrFinalQcScorePage />} />
          {/* M527-C：病历归档自动检查 V14（EMR 深化四模块） */}
          <Route path="emr-archive-auto-check" element={<EmrArchiveAutoCheckPage />} />
          {/* M527-D：病历缺陷闭环跟踪 V14（EMR 深化四模块，M527 收官） */}
          <Route path="emr-defect-closed-loop" element={<EmrDefectClosedLoopPage />} />
          {/* M528-A：病历访问审计日志 V14（EMR 深化四模块） */}
          <Route path="emr-access-audit" element={<EmrAccessAuditPage />} />
          {/* M528-B：病历脱敏输出 V14（EMR 深化四模块） */}
          <Route path="emr-deidentify-output" element={<EmrDeidentifyOutputPage />} />
          {/* M528-C：病历水印追踪 V14（EMR 深化四模块） */}
          <Route path="emr-watermark-trace" element={<EmrWatermarkTracePage />} />
          {/* M528-D：病历权限细粒度控制 V14（EMR 深化四模块，M528 收官） */}
          <Route path="emr-fine-grained-auth" element={<EmrFineGrainedAuthPage />} />
          {/* M529-A：病历主诉结构化提取 V14（EMR 深化四模块） */}
          <Route path="emr-chief-complaint-nlp" element={<EmrChiefComplaintNlpPage />} />
          {/* M529-B：病历现病史结构化提取 V14（EMR 深化四模块） */}
          <Route path="emr-hpi-nlp" element={<EmrHpiNlpPage />} />
          {/* M529-C：病历诊断自动提取 V14（EMR 深化四模块） */}
          <Route path="emr-diagnosis-nlp" element={<EmrDiagnosisNlpPage />} />
          {/* M529-D：病历用药自动提取 V14（EMR 深化四模块，M529 收官） */}
          <Route path="emr-medication-nlp" element={<EmrMedicationNlpPage />} />
          {/* M530-A：病历既往史 NLP 提取 V14（EMR 深化四模块） */}
          <Route path="emr-past-history-nlp" element={<EmrPastHistoryNlpPage />} />
          {/* M530-B：病历过敏史 NLP 提取 V14（EMR 深化四模块） */}
          <Route path="emr-allergy-history-nlp" element={<EmrAllergyHistoryNlpPage />} />
          {/* M530-C：病历体格检查 NLP 提取 V14（EMR 深化四模块） */}
          <Route path="emr-physical-exam-nlp" element={<EmrPhysicalExamNlpPage />} />
          {/* M530-D：病历辅助检查 NLP 提取 V14（EMR 深化四模块，M530 收官） */}
          <Route path="emr-lab-exam-nlp" element={<EmrLabExamNlpPage />} />
          {/* M531-A：病历 NLP 实体归一化 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-entity-normalize" element={<EmrNlpEntityNormalizePage />} />
          {/* M531-B：病历 NLP 术语标准化 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-term-standardize" element={<EmrNlpTermStandardizePage />} />
          {/* M531-C：病历 NLP 时间关系提取 V14（EMR 深化四模块） */}
          <Route path="emr-nlp-time-relation" element={<EmrNlpTimeRelationPage />} />
          {/* M531-D：病历 NLP 否定检测 V14（EMR 深化四模块，M531 收官） */}
          <Route path="emr-nlp-negation-detect" element={<EmrNlpNegationDetectPage />} />
          {/* M532-A：病历结构化字段查询 V14（EMR 深化四模块） */}
          <Route path="emr-struct-query" element={<EmrStructQueryPage />} />
          {/* M532-B：病历结构化数据导出 V14（EMR 深化四模块） */}
          <Route path="emr-struct-export" element={<EmrStructExportPage />} />
          {/* M532-C：病历结构化数据统计 V14（EMR 深化四模块） */}
          <Route path="emr-struct-stats" element={<EmrStructStatsPage />} />
          {/* M532-D：病历结构化数据对比 V14（EMR 深化四模块，M532 收官） */}
          <Route path="emr-struct-compare" element={<EmrStructComparePage />} />
          {/* M533-A：病历自动归档检查 V14（EMR 深化四模块） */}
          <Route path="emr-archive-check" element={<EmrArchiveCheckPage />} />
          {/* M533-B：病历归档完整性校验 V14（EMR 深化四模块） */}
          <Route path="emr-archive-integrity" element={<EmrArchiveIntegrityPage />} />
          {/* M533-C：病历归档索引 V14（EMR 深化四模块） */}
          <Route path="emr-archive-index" element={<EmrArchiveIndexPage />} />
          {/* M533-D：病历归档检索 V14（EMR 深化四模块，M533 收官） */}
          <Route path="emr-archive-search" element={<EmrArchiveSearchPage />} />
          {/* M534-A：病历调阅申请审批 V14（EMR 深化四模块） */}
          <Route path="emr-access-request" element={<EmrAccessRequestPage />} />
          {/* M534-B：病历调阅日志审计 V14（EMR 深化四模块，避让 M528-A） */}
          <Route path="emr-access-audit-log" element={<EmrAccessAuditLogPage />} />
          {/* M534-C：病历复印申请管理 V14（EMR 深化四模块，避让旧 emr-copy-request） */}
          <Route path="emr-copy-request-manage" element={<EmrCopyRequestManagePage />} />
          {/* M534-D：病历借阅归还管理 V14（EMR 深化四模块，M534 收官） */}
          <Route path="emr-loan-return" element={<EmrLoanReturnPage />} />
          {/* M535-A：病案首页完整性校验 V14（EMR 深化四模块） */}
          <Route path="emr-homepage-complete" element={<EmrHomepageCompletePage />} />
          {/* M535-B：病案首页逻辑校验 V14（EMR 深化四模块） */}
          <Route path="emr-homepage-logic" element={<EmrHomepageLogicPage />} />
          {/* M535-C：DRG入组预测 V14（EMR 深化四模块） */}
          <Route path="emr-drg-predict" element={<EmrDrgPredictPage />} />
          {/* M535-D：DIP分值预测 V14（EMR 深化四模块） */}
          <Route path="emr-dip-predict" element={<EmrDipPredictPage />} />
          {/* M536-A：病历质量综合评分 V14（EMR 深化四模块，避让 M465-B -comprehensive） */}
          <Route path="emr-quality-score-comprehensive" element={<EmrQualityScoreComprehensivePage />} />
          {/* M536-B：病历质量趋势分析 V14（EMR 深化四模块） */}
          <Route path="emr-quality-trend" element={<EmrQualityTrendPage />} />
          {/* M536-C：病历质量科室对比 V14（EMR 深化四模块） */}
          <Route path="emr-quality-compare" element={<EmrQualityComparePage />} />
          {/* M536-D：病历质量改进建议 V14（EMR 深化四模块） */}
          <Route path="emr-quality-improve" element={<EmrQualityImprovePage />} />
          {/* M537-A：病历合理用药审查 V14（EMR 深化四模块） */}
          <Route path="emr-medication-review" element={<EmrMedicationReviewPage />} />
          {/* M537-B：病历临床路径符合性检查 V14（EMR 深化四模块） */}
          <Route path="emr-pathway-check" element={<EmrPathwayCheckPage />} />
          {/* M537-C：病历检验异常值提醒 V14（EMR 深化四模块） */}
          <Route path="emr-lab-alert" element={<EmrLabAlertPage />} />
          {/* M537-D：病历诊断完整性检查 V14（EMR 深化四模块） */}
          <Route path="emr-diagnosis-complete" element={<EmrDiagnosisCompletePage />} />
          {/* M538-A：病历时间轴生成 V14（EMR 深化四模块） */}
          <Route path="emr-timeline-generate" element={<EmrTimelineGeneratePage />} />
          {/* M538-B：病程关键节点标记 V14（EMR 深化四模块） */}
          <Route path="emr-course-node" element={<EmrCourseNodePage />} />
          {/* M538-C：病历关键事件时间线 V14（EMR 深化四模块） */}
          <Route path="emr-event-timeline" element={<EmrEventTimelinePage />} />
          {/* M538-D：病历时间线导出 V14（EMR 深化四模块） */}
          <Route path="emr-timeline-export" element={<EmrTimelineExportPage />} />
          {/* M539-A：病历模板智能推荐 V14（EMR 深化四模块） */}
          <Route path="emr-template-recommend" element={<EmrTemplateRecommendPage />} />
          {/* M539-B：病历结构化录入辅助 V14（EMR 深化四模块） */}
          <Route path="emr-structured-input" element={<EmrStructuredInputPage />} />
          {/* M539-C：病历常见用语快捷输入 V14（EMR 深化四模块） */}
          <Route path="emr-quick-phrase" element={<EmrQuickPhrasePage />} />
          {/* M539-D：病历模板版本管理 V14（EMR 深化四模块） */}
          <Route path="emr-template-version" element={<EmrTemplateVersionPage />} />
          {/* M540-A：病历复印申请管理（避让版 -apply）V14（EMR 深化四模块） */}
          <Route path="emr-copy-request-apply" element={<EmrCopyRequestApplyPage />} />
          {/* M540-B：病历借阅登记管理 V14（EMR 深化四模块） */}
          <Route path="emr-borrow-record" element={<EmrBorrowRecordPage />} />
          {/* M540-C：病历归还提醒 V14（EMR 深化四模块） */}
          <Route path="emr-return-remind" element={<EmrReturnRemindPage />} />
          {/* M540-D：病历外审申请 V14（EMR 深化四模块） */}
          <Route path="emr-external-audit" element={<EmrExternalAuditPage />} />
          {/* M541-A：病历归档预约 V14（EMR 深化四模块） */}
          <Route path="emr-archive-appoint" element={<EmrArchiveAppointPage />} />
          {/* M541-B：病历销毁登记（避让版 -apply）V14（EMR 深化四模块） */}
          <Route path="emr-destroy-apply" element={<EmrDestroyApplyPage />} />
          {/* M541-C：病历保存期限提醒 V14（EMR 深化四模块） */}
          <Route path="emr-retention-remind" element={<EmrRetentionRemindPage />} />
          {/* M541-D：病历库房盘点 V14（EMR 深化四模块，M541 收官） */}
          <Route path="emr-warehouse-check" element={<EmrWarehouseCheckPage />} />
          {/* M542-A：病历质控综合看板（避让版 -comprehensive）V14（EMR 深化四模块） */}
          <Route path="emr-qc-comprehensive-dashboard" element={<EmrQcComprehensiveDashboardPage />} />
          {/* M542-B：科室质控排名（避让版 -list）V14（EMR 深化四模块） */}
          <Route path="emr-qc-dept-rank-list" element={<EmrQcDeptRankListPage />} />
          {/* M542-C：医生质控个人档案 V14（EMR 深化四模块） */}
          <Route path="emr-qc-doctor-profile" element={<EmrQcDoctorProfilePage />} />
          {/* M542-D：质控问题趋势分析（避让版 -analysis）V14（EMR 深化四模块，M542 收官） */}
          <Route path="emr-qc-trend-analysis" element={<EmrQcTrendAnalysisPage />} />
          {/* M543-A：病历AI生成建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-suggestion" element={<EmrAiSuggestionPage />} />
          {/* M543-B：病历AI质控评分 V14（EMR 深化四模块） */}
          <Route path="emr-ai-scoring" element={<EmrAiScoringPage />} />
          {/* M543-C：病历AI缺陷预测 V14（EMR 深化四模块） */}
          <Route path="emr-ai-defect-predict" element={<EmrAiDefectPredictPage />} />
          {/* M543-D：病历AI知识推荐 V14（EMR 深化四模块，M543 收官） */}
          <Route path="emr-ai-knowledge-reco" element={<EmrAiKnowledgeRecoPage />} />
          {/* M544-A：病历AI诊断编码建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-dx-coding" element={<EmrAiDxCodingPage />} />
          {/* M544-B：病历AI手术编码建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-op-coding" element={<EmrAiOpCodingPage />} />
          {/* M544-C：病历AI病案首页质控 V14（EMR 深化四模块） */}
          <Route path="emr-ai-frontpage-qc" element={<EmrAiFrontpageQcPage />} />
          {/* M544-D：病历AI DRG分组预测 V14（EMR 深化四模块，M544 收官） */}
          <Route path="emr-ai-drg-predict" element={<EmrAiDrgPredictPage />} />
          {/* M545-A：病历AI临床问答 V14（EMR 深化四模块） */}
          <Route path="emr-ai-clinical-qa" element={<EmrAiClinicalQaPage />} />
          {/* M545-B：病历AI鉴别诊断 V14（EMR 深化四模块） */}
          <Route path="emr-ai-diff-dx" element={<EmrAiDiffDxPage />} />
          {/* M545-C：病历AI用药建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-med-reco" element={<EmrAiMedRecoPage />} />
          {/* M545-D：病历AI检验解读 V14（EMR 深化四模块，M545 收官） */}
          <Route path="emr-ai-lab-interpret" element={<EmrAiLabInterpretPage />} />
          {/* M546-A：病历AI临床路径推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-pathway-reco" element={<EmrAiPathwayRecoPage />} />
          {/* M546-B：病历AI医嘱推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-order-reco" element={<EmrAiOrderRecoPage />} />
          {/* M546-C：病历AI护理建议 V14（EMR 深化四模块，-suggest 后缀避让旧作废 -reco） */}
          <Route path="emr-ai-nursing-suggest" element={<EmrAiNursingSuggestPage />} />
          {/* M546-D：病历AI随访计划推荐 V14（EMR 深化四模块，M546 收官） */}
          <Route path="emr-ai-followup-plan-reco" element={<EmrAiFollowupPlanRecoPage />} />
          {/* M547-A：病历AI出院小结生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-discharge-summary" element={<EmrAiDischargeSummaryPage />} />
          {/* M547-B：病历AI患者教育材料生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-patient-edu" element={<EmrAiPatientEduPage />} />
          {/* M547-C：病历AI转诊建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-referral-suggest" element={<EmrAiReferralSuggestPage />} />
          {/* M547-D：病历AI复诊提醒 V14（EMR 深化四模块，M547 收官） */}
          <Route path="emr-ai-followup-remind" element={<EmrAiFollowupRemindPage />} />
          {/* M548-A：病历AI质控周报生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-weekly-report" element={<EmrAiQcWeeklyReportPage />} />
          {/* M548-B：病历AI质控月报生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-monthly-report" element={<EmrAiQcMonthlyReportPage />} />
          {/* M548-C：病历AI质控季报生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-quarterly-report" element={<EmrAiQcQuarterlyReportPage />} />
          {/* M548-D：病历AI质控年报生成 V14（EMR 深化四模块，M548 收官） */}
          <Route path="emr-ai-qc-annual-report" element={<EmrAiQcAnnualReportPage />} />
          {/* M549-A：病历AI质控实时预警 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-realtime-alert" element={<EmrAiQcRealtimeAlertPage />} />
          {/* M549-B：病历AI质控异常监控 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-anomaly-monitor" element={<EmrAiQcAnomalyMonitorPage />} />
          {/* M549-C：病历AI质控风险评分 V14（EMR 深化四模块） */}
          <Route path="emr-ai-qc-risk-score" element={<EmrAiQcRiskScorePage />} />
          {/* M549-D：病历AI质控趋势预测 V14（EMR 深化四模块，M549 收官） */}
          <Route path="emr-ai-qc-trend-forecast" element={<EmrAiQcTrendForecastPage />} />
          {/* M550-A：病历AI临床知识图谱 V14（EMR 深化四模块） */}
          <Route path="emr-ai-clinical-graph" element={<EmrAiClinicalGraphPage />} />
          {/* M550-B：病历AI鉴别诊断支持 V14（EMR 深化四模块） */}
          <Route path="emr-ai-diagnosis-diff" element={<EmrAiDiagnosisDiffPage />} />
          {/* M550-C：病历AI用药相互作用审查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-drug-interaction" element={<EmrAiDrugInteractionPage />} />
          {/* M550-D：病历AI检验解读明细 V14（EMR 深化四模块，M550 收官，-detail 后缀避让） */}
          <Route path="emr-ai-lab-interpret-detail" element={<EmrAiLabInterpretDetailPage />} />
          {/* M551-A：病历AI首页质控检查 V14（EMR 深化四模块，-check 后缀避让） */}
          <Route path="emr-ai-frontpage-qc-check" element={<EmrAiFrontpageQcCheckPage />} />
          {/* M551-B：病历AI ICD 编码推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-icd-reco" element={<EmrAiIcdRecoPage />} />
          {/* M551-C：病历AI手术编码推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-surgery-code-reco" element={<EmrAiSurgeryCodeRecoPage />} />
          {/* M551-D：病历AI归档校验 V14（EMR 深化四模块，M551 收官） */}
          <Route path="emr-ai-archive-check" element={<EmrAiArchiveCheckPage />} />
          {/* M552-A：病历AI DRG 分组预测 V14（EMR 深化四模块） */}
          <Route path="emr-ai-drg-group-predict" element={<EmrAiDrgGroupPredictPage />} />
          {/* M552-B：病历AI DIP 分组预测 V14（EMR 深化四模块） */}
          <Route path="emr-ai-dip-group-predict" element={<EmrAiDipGroupPredictPage />} />
          {/* M552-C：病历AI费用合理性审查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-cost-rational-audit" element={<EmrAiCostRationalAuditPage />} />
          {/* M552-D：病历AI医保结算清单质控 V14（EMR 深化四模块，M552 收官） */}
          <Route path="emr-ai-settlement-list-qc" element={<EmrAiSettlementListQcPage />} />
          {/* M553-A：病历AI病历书写建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-writing-suggest" element={<EmrAiWritingSuggestPage />} />
          {/* M553-B：病历AI病历完整性检查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-record-completeness-check" element={<EmrAiRecordCompletenessCheckPage />} />
          {/* M553-C：病历AI病历逻辑一致性检查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-record-consistency-check" element={<EmrAiRecordConsistencyCheckPage />} />
          {/* M553-D：病历AI病历同质化对比 V14（EMR 深化四模块，M553 收官） */}
          <Route path="emr-ai-record-homogeneity-compare" element={<EmrAiRecordHomogeneityComparePage />} />
          {/* M554-A：病历AI临床路径推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-clinical-pathway-reco" element={<EmrAiClinicalPathwayRecoPage />} />
          {/* M554-B：病历AI合理用药审查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-rational-medication-audit" element={<EmrAiRationalMedicationAuditPage />} />
          {/* M554-C：病历AI诊疗方案推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-treatment-plan-reco" element={<EmrAiTreatmentPlanRecoPage />} />
          {/* M554-D：病历AI临床指南推荐 V14（EMR 深化四模块，M554 收官） */}
          <Route path="emr-ai-clinical-guideline-reco" element={<EmrAiClinicalGuidelineRecoPage />} />
          {/* M555-A：病历AI术前评估 V14（EMR 深化四模块） */}
          <Route path="emr-ai-preop-assessment" element={<EmrAiPreopAssessmentPage />} />
          {/* M555-B：病历AI手术记录质控 V14（EMR 深化四模块） */}
          <Route path="emr-ai-op-record-qc" element={<EmrAiOpRecordQcPage />} />
          {/* M555-C：病历AI术后病程跟踪 V14（EMR 深化四模块） */}
          <Route path="emr-ai-postop-progress-track" element={<EmrAiPostopProgressTrackPage />} />
          {/* M555-D：病历AI出院小结自动生成 V14（EMR 深化四模块，M555 收官） */}
          <Route path="emr-ai-discharge-summary-gen" element={<EmrAiDischargeSummaryGenPage />} />
          {/* M556-A：病历AI病案首页智能编码 V14（EMR 深化四模块） */}
          <Route path="emr-ai-frontpage-smart-coding" element={<EmrAiFrontpageSmartCodingPage />} />
          {/* M556-B：病历AI病案质量评分 V14（EMR 深化四模块） */}
          <Route path="emr-ai-record-quality-score" element={<EmrAiRecordQualityScorePage />} />
          {/* M556-C：病历AI病案缺陷预警 V14（EMR 深化四模块） */}
          <Route path="emr-ai-record-defect-alert" element={<EmrAiRecordDefectAlertPage />} />
          {/* M556-D：病历AI病案利用分析 V14（EMR 深化四模块，M556 收官） */}
          <Route path="emr-ai-record-utilization-analysis" element={<EmrAiRecordUtilizationAnalysisPage />} />
          {/* M557-A：病历AI护理记录生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-nursing-note-gen" element={<EmrAiNursingNoteGenPage />} />
          {/* M557-B：病历AI护理计划推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-nursing-plan-reco" element={<EmrAiNursingPlanRecoPage />} />
          {/* M557-C：病历AI护理风险评估 V14（EMR 深化四模块） */}
          <Route path="emr-ai-nursing-risk-assess" element={<EmrAiNursingRiskAssessPage />} />
          {/* M557-D：病历AI病区交班报告生成 V14（EMR 深化四模块，M557 收官） */}
          <Route path="emr-ai-shift-report-gen" element={<EmrAiShiftReportGenPage />} />
          {/* M558-A：病历AI医嘱智能审核 V14（EMR 深化四模块） */}
          <Route path="emr-ai-order-smart-review" element={<EmrAiOrderSmartReviewPage />} />
          {/* M558-B：病历AI处方合理用药审查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-prescription-rational-audit" element={<EmrAiPrescriptionRationalAuditPage />} />
          {/* M558-C：病历AI医嘱执行追踪 V14（EMR 深化四模块） */}
          <Route path="emr-ai-order-exec-track" element={<EmrAiOrderExecTrackPage />} />
          {/* M558-D：病历AI出院带药建议 V14（EMR 深化四模块，M558 收官） */}
          <Route path="emr-ai-discharge-med-reco" element={<EmrAiDischargeMedRecoPage />} />
          {/* M559-A：病历AI不良事件主动识别 V14（EMR 深化四模块） */}
          <Route path="emr-ai-adverse-event-detect" element={<EmrAiAdverseEventDetectPage />} />
          {/* M559-B：病历AI用药错误预警 V14（EMR 深化四模块） */}
          <Route path="emr-ai-medication-error-alert" element={<EmrAiMedicationErrorAlertPage />} />
          {/* M559-C：病历AI院内感染风险预警 V14（EMR 深化四模块） */}
          <Route path="emr-ai-hai-risk-alert" element={<EmrAiHaiRiskAlertPage />} />
          {/* M559-D：病历AI患者跌倒风险评估 V14（EMR 深化四模块，M559 收官） */}
          <Route path="emr-ai-fall-risk-assess" element={<EmrAiFallRiskAssessPage />} />
          {/* M560-A：病历AI急诊分诊分级推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-emergency-triage-reco" element={<EmrAiEmergencyTriageRecoPage />} />
          {/* M560-B：病历AI门诊预检分诊 V14（EMR 深化四模块） */}
          <Route path="emr-ai-outpatient-pre-triage" element={<EmrAiOutpatientPreTriagePage />} />
          {/* M560-C：病历AI急诊留观病历生成 V14（EMR 深化四模块） */}
          <Route path="emr-ai-emergency-obs-note-gen" element={<EmrAiEmergencyObsNoteGenPage />} />
          {/* M560-D：病历AI门诊复诊提醒推荐 V14（EMR 深化四模块，M560 收官） */}
          <Route path="emr-ai-outpatient-followup-reco" element={<EmrAiOutpatientFollowupRecoPage />} />
          {/* M561-A：病历AI检查申请智能推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-exam-apply-reco" element={<EmrAiExamApplyRecoPage />} />
          {/* M561-B：病历AI检验申请合理性审查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-lab-apply-audit" element={<EmrAiLabApplyAuditPage />} />
          {/* M561-C：病历AI检查报告AI解读摘要 V14（EMR 深化四模块） */}
          <Route path="emr-ai-exam-report-summary" element={<EmrAiExamReportSummaryPage />} />
          {/* M561-D：病历AI检验危急值智能提醒 V14（EMR 深化四模块，M561 收官） */}
          <Route path="emr-ai-lab-critical-alert" element={<EmrAiLabCriticalAlertPage />} />
          {/* M562-A：病历AI术前风险评估 V14（EMR 深化四模块，手术与麻醉管理系列） */}
          <Route path="emr-ai-preop-risk-assess" element={<EmrAiPreopRiskAssessPage />} />
          {/* M562-B：病历AI手术方案推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-surgery-plan-reco" element={<EmrAiSurgeryPlanRecoPage />} />
          {/* M562-C：病历AI麻醉深度监测建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-anesthesia-depth-suggest" element={<EmrAiAnesthesiaDepthSuggestPage />} />
          {/* M562-D：病历AI术后镇痛方案推荐 V14（EMR 深化四模块，M562 收官） */}
          <Route path="emr-ai-postop-analgesia-reco" element={<EmrAiPostopAnalgesiaRecoPage />} />
          {/* M563-A：病历AI康复评估推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-rehab-assess-reco" element={<EmrAiRehabAssessRecoPage />} />
          {/* M563-B：病历AI康复训练方案推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-rehab-plan-reco" element={<EmrAiRehabPlanRecoPage />} />
          {/* M563-C：病历AI出院随访计划推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-discharge-followup-reco" element={<EmrAiDischargeFollowupRecoPage />} />
          {/* M563-D：病历AI慢病管理计划推荐 V14（EMR 深化四模块，M563 收官） */}
          <Route path="emr-ai-chronic-care-plan-reco" element={<EmrAiChronicCarePlanRecoPage />} />
          {/* M564-A：病历AI营养风险筛查 V14（EMR 深化四模块） */}
          <Route path="emr-ai-nutrition-risk-screen" element={<EmrAiNutritionRiskScreenPage />} />
          {/* M564-B：病历AI膳食处方推荐 V14（EMR 深化四模块） */}
          <Route path="emr-ai-diet-script-reco" element={<EmrAiDietScriptRecoPage />} />
          {/* M564-C：病历AI肠内营养支持建议 V14（EMR 深化四模块） */}
          <Route path="emr-ai-enteral-nutrition-suggest" element={<EmrAiEnteralNutritionSuggestPage />} />
          {/* M564-D：病历AI肠外营养配置推荐 V14（EMR 深化四模块，M564 收官） */}
          <Route path="emr-ai-parenteral-nutrition-reco" element={<EmrAiParenteralNutritionRecoPage />} />
          {/* M565-A：病历AI处方前置审核 V14（EMR 深化四模块） */}
          <Route path="emr-ai-pre-prescription-review" element={<EmrAiPrePrescriptionReviewPage />} />
          {/* M565-B：病历AI用药咨询答复 V14（EMR 深化四模块） */}
          <Route path="emr-ai-medication-consult-reply" element={<EmrAiMedicationConsultReplyPage />} />
          {/* M565-C：病历AI药品相互作用明细审查 V14（EMR 深化四模块，-detail 后缀避让 emrAiDrugInteractionV14） */}
          <Route path="emr-ai-drug-interaction-detail" element={<EmrAiDrugInteractionDetailPage />} />
          {/* M565-D：病历AI特殊人群用药推荐 V14（EMR 深化四模块，M565 收官） */}
          <Route path="emr-ai-special-population-med-reco" element={<EmrAiSpecialPopulationMedRecoPage />} />
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
          <Route path="pharmacy" element={<RequirePermission permission="pharmacy:view"><Pharmacy /></RequirePermission>} />
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
          <Route path="billing" element={<RequirePermission permission="billing:view"><Billing /></RequirePermission>} />
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
          {/* v5.0试点扩展（浏览器bug修复）：补 /emr 与 /ai-diagnosis 裸路由，原缺失导致 404。
              /emr 指向轻量落地占位页；/ai-diagnosis 复用已有专科 AI 诊断组件。 */}
          <Route path="emr" element={<EmrLanding />} />
          <Route path="ai-diagnosis" element={<AIDiagnosis />} />
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
          <Route path="surgery" element={<RequirePermission permission="surgery:view"><SurgeryPage /></RequirePermission>} />
          {/* M257 详情页注册 */}
          <Route path="outpatient/detail" element={<OutpatientDetailPage />} />
          <Route path="inpatient/detail" element={<InpatientDetailPage />} />
          <Route path="order/detail" element={<OrderDetailPage />} />
          <Route path="medication/detail" element={<MedicationDetailPage />} />
          <Route path="discharge/detail" element={<DischargeDetailPage />} />
          {/* M258 合规/安全深度页注册 */}
          <Route path="compliance/audit" element={<ComplianceAuditPage />} />
          <Route path="compliance/reports" element={<ComplianceReportsPage />} />
          <Route path="security/data-mask" element={<SecurityDataMaskPage />} />
          {/* M261 路由注册 */}
          <Route path="emr/versions" element={<EmrVersionsPage />} />
          <Route path="emr/audit-trail" element={<EmrAuditTrailPage />} />
          <Route path="tenants/list" element={<TenantsListPage />} />
          {/* M311 路由注册 */}
          <Route path="anesthesia/records" element={<AnesthesiaRecordsPage />} />
          <Route path="anesthesia/complications" element={<AnesthesiaComplicationsPage />} />
          <Route path="tcm/prescriptions" element={<TcmPrescriptionsPage />} />
          <Route path="tcm/formulas" element={<TcmFormulasPage />} />
          <Route path="dental/appointments" element={<DentalAppointmentsPage />} />
          {/* M312 路由注册 */}
          <Route path="oncology/records" element={<OncologyRecordsPage />} />
          <Route path="chronic/management" element={<ChronicManagementPage />} />
          <Route path="icu/monitor" element={<IcuMonitorPage />} />
          {/* M316 路由注册 */}
          <Route path="financial/procurement" element={<FinancialProcurementPage />} />
          <Route path="financial/assets" element={<FinancialAssetsPage />} />
          <Route path="logistics/preventive" element={<LogisticsPreventivePage />} />
          <Route path="discharge/summary" element={<DischargeSummaryPage />} />
          {/* M317 路由注册 */}
          <Route path="consultation/list" element={<ConsultationListPage />} />
          <Route path="emergency/list" element={<EmergencyListPage />} />
          <Route path="icu/list" element={<IcuListPage />} />
          <Route path="anesthesia/list" element={<AnesthesiaListPage />} />
          <Route path="discharge/list" element={<DischargeListPage />} />
          <Route path="cds/diagnosis-suggest" element={<CdsDiagnosisSuggestPage />} />
          <Route path="tenants/config" element={<TenantsConfigPage />} />
          <Route path="security/mask-rules" element={<SecurityMaskRulesPage />} />
          <Route path="security/access-logs" element={<SecurityAccessLogsPage />} />
          {/* M262 路由注册 */}
          <Route path="emr/lock" element={<EmrLockPage />} />
          <Route path="emr/sign" element={<EmrSignPage />} />
          <Route path="tenants/switch" element={<TenantsSwitchPage />} />
          <Route path="security/export-audit" element={<SecurityExportAuditPage />} />
          <Route path="security/retention" element={<SecurityRetentionPage />} />
          <Route path="security/breach" element={<SecurityBreachPage />} />
          {/* M263 路由注册 */}
          <Route path="auth/session" element={<AuthSessionPage />} />
          <Route path="auth/permissions" element={<AuthPermissionsPage />} />
          <Route path="auth/audit" element={<AuthAuditPage />} />
          <Route path="security/vulnerability" element={<SecurityVulnerabilityPage />} />
          <Route path="security/backup" element={<SecurityBackupPage />} />
          <Route path="security/dr" element={<SecurityDrPage />} />
          {/* M264 路由注册 */}
          <Route path="audit/trail" element={<AuditTrailPage />} />
          <Route path="audit/compliance" element={<AuditCompliancePage />} />
          <Route path="tenants/data-isolation" element={<TenantsDataIsolationPage />} />
          <Route path="tenants/rate-limit" element={<TenantsRateLimitPage />} />
          <Route path="security/key-management" element={<SecurityKeyManagementPage />} />
          <Route path="security/certificates" element={<SecurityCertificatesPage />} />
          {/* M265 路由注册 */}
          <Route path="emr/signature" element={<EmrSignaturePage />} />
          <Route path="emr/watermark" element={<EmrWatermarkPage />} />
          <Route path="security/consent" element={<SecurityConsentPage />} />
          <Route path="security/minimize" element={<SecurityMinimizePage />} />
          <Route path="security/anonymization" element={<SecurityAnonymizationPage />} />
          <Route path="security/deletion" element={<SecurityDeletionPage />} />
          {/* M266 路由注册 */}
          <Route path="emr/lock-history" element={<EmrLockHistoryPage />} />
          {/* M319 路由注册 */}
          <Route path="emr/quality-rules" element={<EmrQualityRulesPage />} />
          {/* M320 路由注册 */}
          <Route path="infection/surveillance" element={<InfectionSurveillancePage />} />
          <Route path="drg/grouping" element={<DrgGroupingPage />} />
          <Route path="dip/score" element={<DipScorePage />} />
          <Route path="rwd/datasets" element={<RwdDatasetsPage />} />
          <Route path="federated/learning" element={<FederatedLearningPage />} />
          <Route path="digital-twin/patients" element={<DigitalTwinPatientsPage />} />
          {/* M321 路由注册 */}
          <Route path="infection/daily-report" element={<InfectionDailyReportPage />} />
          <Route path="drg/cost-control" element={<DrgCostControlPage />} />
          <Route path="dip/detail" element={<DipDetailPage />} />
          <Route path="rwd/analysis" element={<RwdAnalysisPage />} />
          <Route path="federated/nodes" element={<FederatedNodesPage />} />
          <Route path="digital-twin/simulation" element={<DigitalTwinSimulationPage />} />
          {/* M322 路由注册 */}
          <Route path="smart-service/queue-stats" element={<SmartServiceQueueStatsPage />} />
          <Route path="smart-service/ai-triage" element={<SmartServiceAiTriagePage />} />
          <Route path="smart-service/bed-recommend" element={<SmartServiceBedRecommendPage />} />
          <Route path="smart-service/medication-remind" element={<SmartServiceMedicationRemindPage />} />
          <Route path="smart-service/followup" element={<SmartServiceFollowupPage />} />
          <Route path="smart-service/health-records" element={<SmartServiceHealthRecordsPage />} />
          {/* M323 路由注册 */}
          <Route path="operation/dashboard" element={<OperationDashboardPage />} />
          <Route path="operation/kpi" element={<OperationKpiPage />} />
          <Route path="operation/comparison" element={<OperationComparisonPage />} />
          <Route path="operation/efficiency" element={<OperationEfficiencyPage />} />
          <Route path="operation/cost" element={<OperationCostPage />} />
          <Route path="operation/revenue" element={<OperationRevenuePage />} />
          {/* M324 路由注册 */}
          <Route path="hr/doctors" element={<HrDoctorsPage />} />
          <Route path="hr/nurses" element={<HrNursesPage />} />
          <Route path="hr/departments" element={<HrDepartmentsPage />} />
          <Route path="hr/training" element={<HrTrainingPage />} />
          <Route path="hr/leave" element={<HrLeavePage />} />
          {/* M325 路由注册 */}
          <Route path="finance/billing" element={<FinanceBillingPage />} />
          <Route path="finance/payment" element={<FinancePaymentPage />} />
          <Route path="finance/refund" element={<FinanceRefundPage />} />
          <Route path="finance/insurance-settlement" element={<FinanceInsuranceSettlementPage />} />
          <Route path="finance/budget" element={<FinanceBudgetPage />} />
          <Route path="finance/audit" element={<FinanceAuditPage />} />
          {/* M326 路由注册 */}
          <Route path="pharmacy/inventory" element={<PharmacyInventoryPage />} />
          <Route path="pharmacy/purchase" element={<PharmacyPurchasePage />} />
          <Route path="pharmacy/check" element={<PharmacyCheckPage />} />
          <Route path="supplies/purchase" element={<SuppliesPurchasePage />} />
          <Route path="supplies/check" element={<SuppliesCheckPage />} />
          <Route path="equipment/repair" element={<EquipmentRepairPage />} />
          {/* M327 路由注册 */}
          <Route path="supplies/warning" element={<SuppliesWarningPage />} />
          <Route path="quality/control" element={<QualityControlPage />} />
          <Route path="quality/inspection" element={<QualityInspectionPage />} />
          <Route path="quality/exception" element={<QualityExceptionPage />} />
          <Route path="risk/assessment" element={<RiskAssessmentPage />} />
          <Route path="risk/monitor" element={<RiskMonitorPage />} />
          <Route path="risk/warning" element={<RiskWarningPage />} />
          {/* M328 路由注册 */}
          <Route path="research/projects-list" element={<ResearchProjectsListPage />} />
          <Route path="research/papers" element={<ResearchPapersPage />} />
          <Route path="research/funds" element={<ResearchFundsPage />} />
          <Route path="education/courses" element={<EducationCoursesPage />} />
          <Route path="education/exams" element={<EducationExamsPage />} />
          <Route path="education/degrees" element={<EducationDegreesPage />} />
          {/* M329 路由注册 */}
          <Route path="internet/appointments" element={<InternetAppointmentsPage />} />
          <Route path="internet/health-records" element={<InternetHealthRecordsPage />} />
          <Route path="internet/followup" element={<InternetFollowupPage />} />
          {/* M330 路由注册 */}
          <Route path="telemed/video" element={<TelemedVideoPage />} />
          <Route path="telemed/equipment" element={<TelemedEquipmentPage />} />
          <Route path="telemed/records" element={<TelemedRecordsPage />} />
          <Route path="telemed/specialists" element={<TelemedSpecialistsPage />} />
          <Route path="telemed/referrals" element={<TelemedReferralsPage />} />
          {/* M331 路由注册 */}
          <Route path="community/residents" element={<CommunityResidentsPage />} />
          <Route path="community/family-doctor" element={<CommunityFamilyDoctorPage />} />
          <Route path="community/vaccination" element={<CommunityVaccinationPage />} />
          <Route path="community/chronic-management" element={<CommunityChronicManagementPage />} />
          <Route path="community/health-education" element={<CommunityHealthEducationPage />} />
          {/* M332 路由注册 */}
          <Route path="maternity/prenatal" element={<MaternityPrenatalPage />} />
          <Route path="maternity/delivery" element={<MaternityDeliveryPage />} />
          <Route path="maternity/postpartum" element={<MaternityPostpartumPage />} />
          <Route path="newborn/physical" element={<NewbornPhysicalPage />} />
          <Route path="newborn/screening" element={<NewbornScreeningPage />} />
          <Route path="newborn/growth" element={<NewbornGrowthPage />} />
          {/* M333 路由注册 */}
          <Route path="emergency/rescue" element={<EmergencyRescuePage />} />
          <Route path="emergency/ambulance" element={<EmergencyAmbulancePage />} />
          <Route path="emergency/poisoning" element={<EmergencyPoisoningPage />} />
          <Route path="emergency/trauma" element={<EmergencyTraumaPage />} />
          <Route path="emergency/critical" element={<EmergencyCriticalPage />} />
          {/* M334 路由注册 */}
          <Route path="oncology/patients" element={<OncologyPatientsPage />} />
          <Route path="oncology/treatments" element={<OncologyTreatmentsPage />} />
          <Route path="oncology/chemotherapy" element={<OncologyChemotherapyPage />} />
          <Route path="oncology/radiotherapy" element={<OncologyRadiotherapyPage />} />
          <Route path="oncology/monitor" element={<OncologyMonitorPage />} />
          <Route path="oncology/pain" element={<OncologyPainPage />} />
          {/* M335 路由注册 */}
          <Route path="rehab/treatments" element={<RehabTreatmentsPage />} />
          <Route path="rehab/assessment" element={<RehabAssessmentPage />} />
          <Route path="rehab/exercises" element={<RehabExercisesPage />} />
          <Route path="rehab/equipment" element={<RehabEquipmentPage />} />
          <Route path="rehab/progress" element={<RehabProgressPage />} />
          {/* M336 路由注册 */}
          <Route path="elderly/assessment" element={<ElderlyAssessmentPage />} />
          <Route path="elderly/frail" element={<ElderlyFrailPage />} />
          <Route path="elderly/falls" element={<ElderlyFallsPage />} />
          <Route path="elderly/dementia" element={<ElderlyDementiaPage />} />
          <Route path="elderly/nutrition" element={<ElderlyNutritionPage />} />
          <Route path="elderly/comprehensive" element={<ElderlyComprehensivePage />} />
          {/* M337 路由注册 */}
          <Route path="medical-records/archive" element={<MedicalRecordsArchivePage />} />
          <Route path="medical-records/retrieve" element={<MedicalRecordsRetrievePage />} />
          <Route path="medical-records/print" element={<MedicalRecordsPrintPage />} />
          <Route path="medical-records/copy" element={<MedicalRecordsCopyPage />} />
          <Route path="medical-records/seal" element={<MedicalRecordsSealPage />} />
          <Route path="medical-records/watermark" element={<MedicalRecordsWatermarkPage />} />
          {/* M338 路由注册 */}
          <Route path="workflow/doctor-tasks" element={<WorkflowDoctorTasksPage />} />
          <Route path="workflow/nurse-tasks" element={<WorkflowNurseTasksPage />} />
          <Route path="workflow/pharmacist-tasks" element={<WorkflowPharmacistTasksPage />} />
          <Route path="workflow/admin-tasks" element={<WorkflowAdminTasksPage />} />
          <Route path="workflow/queue" element={<WorkflowQueuePage />} />
          <Route path="workflow/history" element={<WorkflowHistoryPage />} />
          {/* M339 路由注册 */}
          <Route path="settlement/list" element={<SettlementListPage />} />
          <Route path="cds/clinical-pathway" element={<CdsClinicalPathwayPage />} />
          <Route path="cds/diagnosis-suggestion" element={<CdsDiagnosisSuggestionPage />} />
          <Route path="cds/treatment-plan" element={<CdsTreatmentPlanPage />} />
          <Route path="cds/drug-dose-adjust" element={<CdsDrugDoseAdjustPage />} />
          <Route path="cds/lab-critical" element={<CdsLabCriticalPage />} />
          <Route path="cds/imaging-hint" element={<CdsImagingHintPage />} />
          {/* M340 路由注册 */}
          <Route path="cds/alert" element={<CdsAlertPage />} />
          <Route path="cds/patient-summary" element={<CdsPatientSummaryPage />} />
          <Route path="cds/recommendation" element={<CdsRecommendationPage />} />
          <Route path="patient/timeline" element={<PatientTimelinePage />} />
          <Route path="patient/timeline-detail" element={<PatientTimelineDetailPage />} />
          <Route path="patient/timeline-overview" element={<PatientTimelineOverviewPage />} />
          <Route path="patient/timeline-events" element={<PatientTimelineEventsPage />} />
          <Route path="patient/timeline-encounters" element={<PatientTimelineEncountersPage />} />
          <Route path="patient/timeline-medications" element={<PatientTimelineMedicationsPage />} />
          <Route path="patient/timeline-results" element={<PatientTimelineResultsPage />} />
          <Route path="patient/timeline-alerts" element={<PatientTimelineAlertsPage />} />
          <Route path="nursing/nqi-overview" element={<NursingNqiOverviewPage />} />
          <Route path="nursing/nqi-detail" element={<NursingNqiDetailPage />} />
          <Route path="nursing/nqi-comparison" element={<NursingNqiComparisonPage />} />
          {/* M341 路由注册 */}
          <Route path="emr/version-list" element={<EmrVersionListPage />} />
          <Route path="emr/version-history" element={<EmrVersionHistoryPage />} />
          <Route path="emr/version-rollback" element={<EmrVersionRollbackPage />} />
          <Route path="emr/version-author" element={<EmrVersionAuthorPage />} />
          <Route path="emr/version-review" element={<EmrVersionReviewPage />} />
          {/* M342 路由注册 */}
          <Route path="events/bus-overview" element={<EventsBusOverviewPage />} />
          <Route path="events/bus-detail" element={<EventsBusDetailPage />} />
          <Route path="events/bus-logs" element={<EventsBusLogsPage />} />
          <Route path="events/bus-subscribers" element={<EventsBusSubscribersPage />} />
          <Route path="events/bus-publishers" element={<EventsBusPublishersPage />} />
          <Route path="events/bus-deadletter" element={<EventsBusDeadletterPage />} />
          {/* M343 路由注册 */}
          <Route path="fhir/patient" element={<FhirPatientPage />} />
          <Route path="fhir/observation" element={<FhirObservationPage />} />
          <Route path="fhir/condition" element={<FhirConditionPage />} />
          <Route path="fhir/medicationrequest" element={<FhirMedicationRequestPage />} />
          <Route path="fhir/encounter" element={<FhirEncounterPage />} />
          <Route path="fhir/diagnosticreport" element={<FhirDiagnosticReportPage />} />
          {/* M344 路由注册 */}
          <Route path="fhir/practitioner" element={<FhirPractitionerPage />} />
          <Route path="fhir/organization" element={<FhirOrganizationPage />} />
          <Route path="fhir/location" element={<FhirLocationPage />} />
          <Route path="fhir/medication" element={<FhirMedicationPage />} />
          <Route path="fhir/procedure" element={<FhirProcedurePage />} />
          <Route path="fhir/allergyintolerance" element={<FhirAllergyintolerancePage />} />
          {/* M345 路由注册 */}
          <Route path="security/audit-detail" element={<SecurityAuditDetailPage />} />
          <Route path="security/audit-export" element={<SecurityAuditExportPage />} />
          <Route path="security/audit-anomaly" element={<SecurityAuditAnomalyPage />} />
          <Route path="security/audit-whitelist" element={<SecurityAuditWhitelistPage />} />
          <Route path="security/audit-report" element={<SecurityAuditReportPage />} />
          <Route path="security/compliance-score" element={<SecurityComplianceScorePage />} />
          {/* M346 路由注册 */}
          <Route path="security/audit-logs" element={<SecurityAuditLogsPage />} />
          <Route path="security/user-sessions" element={<SecurityUserSessionsPage />} />
          <Route path="security/login-history" element={<SecurityLoginHistoryPage />} />
          <Route path="security/permission-matrix" element={<SecurityPermissionMatrixPage />} />
          <Route path="security/role-mapping" element={<SecurityRoleMappingPage />} />
          <Route path="security/data-access-log" element={<SecurityDataAccessLogPage />} />
          <Route path="security/privacy-report" element={<SecurityPrivacyReportPage />} />
          {/* M347 路由注册 */}
          <Route path="tenants/overview" element={<TenantsOverviewPage />} />
          <Route path="tenants/quota" element={<TenantsQuotaPage />} />
          <Route path="tenants/billing" element={<TenantsBillingPage />} />
          <Route path="system/config" element={<SystemConfigPage />} />
          <Route path="system/feature-flags" element={<SystemFeatureFlagsPage />} />
          <Route path="system/dict" element={<SystemDictPage />} />
          {/* M348 路由注册 */}
          <Route path="bi/realtime" element={<BiRealtimePage />} />
          <Route path="bi/funnel" element={<BiFunnelPage />} />
          <Route path="bi/retention" element={<BiRetentionPage />} />
          <Route path="operation/benchmark" element={<OperationBenchmarkPage />} />
          <Route path="operation/alerts" element={<OperationAlertsPage />} />
          {/* M349 路由注册 */}
          <Route path="research/grants" element={<ResearchGrantsPage />} />
          <Route path="teaching/training" element={<TeachingTrainingPage />} />
          <Route path="internet/hospital-orders" element={<InternetHospitalOrdersPage />} />
          {/* M350 路由注册 */}
          <Route path="telemedicine/consultations" element={<TelemedicineConsultationsPage />} />
          <Route path="telemedicine/records" element={<TelemedicineRecordsPage />} />
          <Route path="telemedicine/devices" element={<TelemedicineDevicesPage />} />
          <Route path="community/visits" element={<CommunityVisitsPage />} />
          {/* M351 路由注册 */}
          <Route path="maternal/prenatal" element={<MaternalPrenatalPage />} />
          <Route path="maternal/postnatal" element={<MaternalPostnatalPage />} />
          <Route path="maternal/child-health" element={<MaternalChildHealthPage />} />
          <Route path="emergency/redbox" element={<EmergencyRedboxPage />} />
          <Route path="emergency/calls" element={<EmergencyCallsPage />} />
          {/* M352 路由注册 */}
          <Route path="rehab/assessments" element={<RehabAssessmentsPage />} />
          <Route path="rehab/records" element={<RehabRecordsPage />} />
          {/* M353 路由注册 */}
          <Route path="geriatrics/assessment" element={<GeriatricsAssessmentPage />} />
          <Route path="geriatrics/falls" element={<GeriatricsFallsPage />} />
          <Route path="geriatrics/dementia" element={<GeriatricsDementiaPage />} />
          <Route path="qc/indicators" element={<QcIndicatorsPage />} />
          <Route path="qc/audits" element={<QcAuditsPage />} />
          <Route path="qc/corrective" element={<QcCorrectivePage />} />
          {/* M354 路由注册 */}
          <Route path="emr/templates" element={<EmrTemplatesPage />} />
          <Route path="emr/signatures" element={<EmrSignaturesPage />} />
          <Route path="emr/archives" element={<EmrArchivesPage />} />
          <Route path="insurance/benefits" element={<InsuranceBenefitsPage />} />
          <Route path="insurance/directory" element={<InsuranceDirectoryPage />} />
          {/* M355 路由注册 */}
          <Route path="pharmacy/purchasing" element={<PharmacyPurchasingPage />} />
          <Route path="pharmacy/dispensing" element={<PharmacyDispensingPage />} />
          <Route path="hr/trainings" element={<HrTrainingsPage />} />
          <Route path="hr/recruitment" element={<HrRecruitmentPage />} />
          {/* M356 路由注册 */}
          <Route path="finance/expenses" element={<FinanceExpensesPage />} />
          <Route path="finance/assets" element={<FinanceAssetsPage />} />
          <Route path="billing/invoices" element={<BillingInvoicesPage />} />
          {/* M357 路由注册 */}
          <Route path="surgery/orders" element={<SurgeryOrdersPage />} />
          <Route path="surgery/records" element={<SurgeryRecordsPage />} />
          <Route path="nursing/rounds" element={<NursingRoundsPage />} />
          <Route path="nursing/plans" element={<NursingPlansPage />} />
          {/* M358 路由注册 */}
          <Route path="lab/orders" element={<LabOrdersPage />} />
          <Route path="lab/results" element={<LabResultsPage />} />
          <Route path="radiology/orders" element={<RadiologyOrdersPage />} />
          <Route path="radiology/results" element={<RadiologyResultsPage />} />
          <Route path="radiology/reports" element={<RadiologyReportsPage />} />
          {/* M359 路由注册 */}
          <Route path="outpatient/visits" element={<OutpatientVisitsPage />} />
          <Route path="outpatient/prescriptions" element={<OutpatientPrescriptionsPage />} />
          <Route path="outpatient/triage" element={<OutpatientTriagePage />} />
          {/* M360 路由注册 */}
          <Route path="orders/list" element={<OrdersListPage />} />
          <Route path="orders/active" element={<OrdersActivePage />} />
          <Route path="orders/completed" element={<OrdersCompletedPage />} />
          <Route path="orders/cancelled" element={<OrdersCancelledPage />} />
          <Route path="prescriptions/outpatient" element={<PrescriptionsOutpatientPage />} />
          <Route path="prescriptions/inpatient" element={<PrescriptionsInpatientPage />} />
          <Route path="prescriptions/emergency" element={<PrescriptionsEmergencyPage />} />
          {/* M361 路由注册 */}
          <Route path="patient/profile" element={<PatientProfilePage />} />
          <Route path="patient/allergies" element={<PatientAllergiesPage />} />
          <Route path="patient/family" element={<PatientFamilyPage />} />
          <Route path="patient/vitals" element={<PatientVitalsPage />} />
          {/* M362 路由注册 */}
          <Route path="cds/alerts" element={<CdsAlertsPage />} />
          <Route path="cds/interventions" element={<CdsInterventionsPage />} />
          <Route path="cds/guidelines" element={<CdsGuidelinesPage />} />
          <Route path="cds/checklists" element={<CdsChecklistsPage />} />
          <Route path="cds/drugs-interaction" element={<CdsDrugsInteractionPage />} />
          <Route path="cds/duplicate-therapy" element={<CdsDuplicateTherapyPage />} />
          {/* M363 路由注册 */}
          <Route path="workflow/tasks" element={<WorkflowTasksPage />} />
          <Route path="workflow/templates" element={<WorkflowTemplatesPage />} />
          <Route path="tasks/todo" element={<TasksTodoPage />} />
          <Route path="tasks/done" element={<TasksDonePage />} />
          <Route path="tasks/overdue" element={<TasksOverduePage />} />
          {/* M364 路由注册 */}
          <Route path="security/roles" element={<SecurityRolesPage />} />
          <Route path="security/permissions" element={<SecurityPermissionsPage />} />
          <Route path="system/configs" element={<SystemConfigsPage />} />
          <Route path="system/logs" element={<SystemLogsPage />} />
          <Route path="system/version" element={<SystemVersionPage />} />
          <Route path="events/dead-letter" element={<EventsDeadLetterPage />} />
          <Route path="events/retry" element={<EventsRetryPage />} />
          <Route path="audit/reports" element={<AuditReportsPage />} />
          {/* M365 路由注册 */}
          <Route path="tenant/list" element={<TenantListPage />} />
          <Route path="tenant/config" element={<TenantConfigPage />} />
          <Route path="tenant/data-isolation" element={<TenantDataIsolationPage />} />
          <Route path="tenant/quota" element={<TenantQuotaPage />} />
          <Route path="tenant/usage" element={<TenantUsagePage />} />
          <Route path="tenant/logs" element={<TenantLogsPage />} />
          {/* M366 路由注册 */}
          <Route path="security/masking-rules" element={<SecurityMaskingRulesPage />} />
          <Route path="security/masking-logs" element={<SecurityMaskingLogsPage />} />
          <Route path="security/encryption-keys" element={<SecurityEncryptionKeysPage />} />
          <Route path="security/encryption-status" element={<SecurityEncryptionStatusPage />} />
          <Route path="security/data-classification" element={<SecurityDataClassificationPage />} />
          <Route path="security/data-retention" element={<SecurityDataRetentionPage />} />
          <Route path="emr/revision" element={<EmrRevisionPage />} />
          <Route path="security/consent-log" element={<SecurityConsentLogPage />} />
          <Route path="security/data-flow" element={<SecurityDataFlowPage />} />
          <Route path="security/dpi" element={<SecurityDpiPage />} />
          <Route path="security/audit-cert" element={<SecurityAuditCertPage />} />
          {/* M268 路由注册 */}
          <Route path="emr/quality-defects" element={<EmrQualityDefectsPage />} />
          <Route path="emr/quality-stats" element={<EmrQualityStatsPage />} />
          <Route path="tenants/quota" element={<TenantsQuotaPage />} />
          <Route path="security/cve-feed" element={<SecurityCveFeedPage />} />
          <Route path="security/waf" element={<SecurityWafPage />} />
          <Route path="security/siem" element={<SecuritySiemPage />} />
          {/* M269 路由注册 */}
          <Route path="emr/quality-trend" element={<EmrQualityTrendPage />} />
          <Route path="emr/quality-department" element={<EmrQualityDepartmentPage />} />
          <Route path="tenants/usage-stats" element={<TenantsUsageStatsPage />} />
          <Route path="security/log-archive" element={<SecurityLogArchivePage />} />
          <Route path="security/incident-timeline" element={<SecurityIncidentTimelinePage />} />
          <Route path="security/metrics" element={<SecurityMetricsPage />} />
          {/* M270 路由注册 */}
          <Route path="cds/patient-timeline" element={<CdsPatientTimelinePage />} />
          <Route path="cds/interaction-check" element={<CdsInteractionCheckPage />} />
          <Route path="cds/dose-range" element={<CdsDoseRangePage />} />
          <Route path="cds/contraindication" element={<CdsContraindicationPage />} />
          <Route path="nursing/nqi-scores" element={<NursingNqiScoresPage />} />
          <Route path="nursing/nqi-trend" element={<NursingNqiTrendPage />} />
          {/* M271 路由注册 */}
          <Route path="fhir/patient" element={<FhirPatientPage />} />
          <Route path="fhir/observation" element={<FhirObservationPage />} />
          <Route path="fhir/condition" element={<FhirConditionPage />} />
          <Route path="fhir/medicationrequest" element={<FhirMedicationRequestPage />} />
          <Route path="events/bus" element={<EventsBusPage />} />
          <Route path="events/audit" element={<EventsAuditPage />} />
          {/* M272 路由注册 */}
          <Route path="fhir/encounter" element={<FhirEncounterPage />} />
          <Route path="fhir/procedure" element={<FhirProcedurePage />} />
          <Route path="fhir/diagnosticreport" element={<FhirDiagnosticReportPage />} />
          {/* M344 路由注册 */}
          <Route path="fhir/practitioner" element={<FhirPractitionerPage />} />
          <Route path="fhir/organization" element={<FhirOrganizationPage />} />
          <Route path="fhir/location" element={<FhirLocationPage />} />
          <Route path="fhir/medication" element={<FhirMedicationPage />} />
          <Route path="fhir/procedure" element={<FhirProcedurePage />} />
          <Route path="fhir/allergyintolerance" element={<FhirAllergyintolerancePage />} />
          {/* M345 路由注册 */}
          <Route path="security/audit-detail" element={<SecurityAuditDetailPage />} />
          <Route path="security/audit-export" element={<SecurityAuditExportPage />} />
          <Route path="security/audit-anomaly" element={<SecurityAuditAnomalyPage />} />
          <Route path="security/audit-whitelist" element={<SecurityAuditWhitelistPage />} />
          <Route path="security/audit-report" element={<SecurityAuditReportPage />} />
          <Route path="security/compliance-score" element={<SecurityComplianceScorePage />} />
          {/* M346 路由注册 */}
          <Route path="security/audit-logs" element={<SecurityAuditLogsPage />} />
          <Route path="security/user-sessions" element={<SecurityUserSessionsPage />} />
          <Route path="security/login-history" element={<SecurityLoginHistoryPage />} />
          <Route path="security/permission-matrix" element={<SecurityPermissionMatrixPage />} />
          <Route path="security/role-mapping" element={<SecurityRoleMappingPage />} />
          <Route path="security/data-access-log" element={<SecurityDataAccessLogPage />} />
          <Route path="security/privacy-report" element={<SecurityPrivacyReportPage />} />
          {/* M347 路由注册 */}
          <Route path="tenants/overview" element={<TenantsOverviewPage />} />
          <Route path="tenants/quota" element={<TenantsQuotaPage />} />
          <Route path="tenants/billing" element={<TenantsBillingPage />} />
          <Route path="system/config" element={<SystemConfigPage />} />
          <Route path="system/feature-flags" element={<SystemFeatureFlagsPage />} />
          <Route path="system/dict" element={<SystemDictPage />} />
          {/* M348 路由注册 */}
          <Route path="bi/realtime" element={<BiRealtimePage />} />
          <Route path="bi/funnel" element={<BiFunnelPage />} />
          <Route path="bi/retention" element={<BiRetentionPage />} />
          <Route path="operation/benchmark" element={<OperationBenchmarkPage />} />
          <Route path="operation/alerts" element={<OperationAlertsPage />} />
          {/* M349 路由注册 */}
          <Route path="research/grants" element={<ResearchGrantsPage />} />
          <Route path="teaching/training" element={<TeachingTrainingPage />} />
          <Route path="internet/hospital-orders" element={<InternetHospitalOrdersPage />} />
          {/* M350 路由注册 */}
          <Route path="telemedicine/consultations" element={<TelemedicineConsultationsPage />} />
          <Route path="telemedicine/records" element={<TelemedicineRecordsPage />} />
          <Route path="telemedicine/devices" element={<TelemedicineDevicesPage />} />
          <Route path="community/visits" element={<CommunityVisitsPage />} />
          {/* M351 路由注册 */}
          <Route path="maternal/prenatal" element={<MaternalPrenatalPage />} />
          <Route path="maternal/postnatal" element={<MaternalPostnatalPage />} />
          <Route path="maternal/child-health" element={<MaternalChildHealthPage />} />
          <Route path="emergency/redbox" element={<EmergencyRedboxPage />} />
          <Route path="emergency/calls" element={<EmergencyCallsPage />} />
          {/* M352 路由注册 */}
          <Route path="rehab/assessments" element={<RehabAssessmentsPage />} />
          <Route path="rehab/records" element={<RehabRecordsPage />} />
          {/* M353 路由注册 */}
          <Route path="geriatrics/assessment" element={<GeriatricsAssessmentPage />} />
          <Route path="geriatrics/falls" element={<GeriatricsFallsPage />} />
          <Route path="geriatrics/dementia" element={<GeriatricsDementiaPage />} />
          <Route path="qc/indicators" element={<QcIndicatorsPage />} />
          <Route path="qc/audits" element={<QcAuditsPage />} />
          <Route path="qc/corrective" element={<QcCorrectivePage />} />
          {/* M354 路由注册 */}
          <Route path="emr/templates" element={<EmrTemplatesPage />} />
          <Route path="emr/signatures" element={<EmrSignaturesPage />} />
          <Route path="emr/archives" element={<EmrArchivesPage />} />
          <Route path="insurance/benefits" element={<InsuranceBenefitsPage />} />
          <Route path="insurance/directory" element={<InsuranceDirectoryPage />} />
          {/* M355 路由注册 */}
          <Route path="pharmacy/purchasing" element={<PharmacyPurchasingPage />} />
          <Route path="pharmacy/dispensing" element={<PharmacyDispensingPage />} />
          <Route path="hr/trainings" element={<HrTrainingsPage />} />
          <Route path="hr/recruitment" element={<HrRecruitmentPage />} />
          {/* M356 路由注册 */}
          <Route path="finance/expenses" element={<FinanceExpensesPage />} />
          <Route path="finance/assets" element={<FinanceAssetsPage />} />
          <Route path="billing/invoices" element={<BillingInvoicesPage />} />
          {/* M357 路由注册 */}
          <Route path="surgery/orders" element={<SurgeryOrdersPage />} />
          <Route path="surgery/records" element={<SurgeryRecordsPage />} />
          <Route path="nursing/rounds" element={<NursingRoundsPage />} />
          <Route path="nursing/plans" element={<NursingPlansPage />} />
          {/* M358 路由注册 */}
          <Route path="lab/orders" element={<LabOrdersPage />} />
          <Route path="lab/results" element={<LabResultsPage />} />
          <Route path="radiology/orders" element={<RadiologyOrdersPage />} />
          <Route path="radiology/results" element={<RadiologyResultsPage />} />
          <Route path="radiology/reports" element={<RadiologyReportsPage />} />
          {/* M359 路由注册 */}
          <Route path="outpatient/visits" element={<OutpatientVisitsPage />} />
          <Route path="outpatient/prescriptions" element={<OutpatientPrescriptionsPage />} />
          <Route path="outpatient/triage" element={<OutpatientTriagePage />} />
          {/* M360 路由注册 */}
          <Route path="orders/list" element={<OrdersListPage />} />
          <Route path="orders/active" element={<OrdersActivePage />} />
          <Route path="orders/completed" element={<OrdersCompletedPage />} />
          <Route path="orders/cancelled" element={<OrdersCancelledPage />} />
          <Route path="prescriptions/outpatient" element={<PrescriptionsOutpatientPage />} />
          <Route path="prescriptions/inpatient" element={<PrescriptionsInpatientPage />} />
          <Route path="prescriptions/emergency" element={<PrescriptionsEmergencyPage />} />
          {/* M361 路由注册 */}
          <Route path="patient/profile" element={<PatientProfilePage />} />
          <Route path="patient/allergies" element={<PatientAllergiesPage />} />
          <Route path="patient/family" element={<PatientFamilyPage />} />
          <Route path="patient/vitals" element={<PatientVitalsPage />} />
          {/* M362 路由注册 */}
          <Route path="cds/alerts" element={<CdsAlertsPage />} />
          <Route path="cds/interventions" element={<CdsInterventionsPage />} />
          <Route path="cds/guidelines" element={<CdsGuidelinesPage />} />
          <Route path="cds/checklists" element={<CdsChecklistsPage />} />
          <Route path="cds/drugs-interaction" element={<CdsDrugsInteractionPage />} />
          <Route path="cds/duplicate-therapy" element={<CdsDuplicateTherapyPage />} />
          {/* M363 路由注册 */}
          <Route path="workflow/tasks" element={<WorkflowTasksPage />} />
          <Route path="workflow/templates" element={<WorkflowTemplatesPage />} />
          <Route path="tasks/todo" element={<TasksTodoPage />} />
          <Route path="tasks/done" element={<TasksDonePage />} />
          <Route path="tasks/overdue" element={<TasksOverduePage />} />
          {/* M364 路由注册 */}
          <Route path="security/roles" element={<SecurityRolesPage />} />
          <Route path="security/permissions" element={<SecurityPermissionsPage />} />
          <Route path="system/configs" element={<SystemConfigsPage />} />
          <Route path="system/logs" element={<SystemLogsPage />} />
          <Route path="system/version" element={<SystemVersionPage />} />
          <Route path="events/dead-letter" element={<EventsDeadLetterPage />} />
          <Route path="events/retry" element={<EventsRetryPage />} />
          <Route path="audit/reports" element={<AuditReportsPage />} />
          {/* M365 路由注册 */}
          <Route path="tenant/list" element={<TenantListPage />} />
          <Route path="tenant/config" element={<TenantConfigPage />} />
          <Route path="tenant/data-isolation" element={<TenantDataIsolationPage />} />
          <Route path="tenant/quota" element={<TenantQuotaPage />} />
          <Route path="tenant/usage" element={<TenantUsagePage />} />
          <Route path="tenant/logs" element={<TenantLogsPage />} />
          {/* M366 路由注册 */}
          <Route path="security/masking-rules" element={<SecurityMaskingRulesPage />} />
          <Route path="security/masking-logs" element={<SecurityMaskingLogsPage />} />
          <Route path="security/encryption-keys" element={<SecurityEncryptionKeysPage />} />
          <Route path="security/encryption-status" element={<SecurityEncryptionStatusPage />} />
          <Route path="security/data-classification" element={<SecurityDataClassificationPage />} />
          <Route path="security/data-retention" element={<SecurityDataRetentionPage />} />
          <Route path="workflow/doctor" element={<WorkflowDoctorPage />} />
          <Route path="workflow/nurse" element={<WorkflowNursePage />} />
          <Route path="workflow/pharmacist" element={<WorkflowPharmacistPage />} />
          {/* M273 路由注册 */}
          <Route path="fhir/documentref" element={<FhirDocumentrefPage />} />
          <Route path="fhir/allergyintolerance" element={<FhirAllergyintolerancePage />} />
          <Route path="fhir/immunization" element={<FhirImmunizationPage />} />
          <Route path="emr/version-diff" element={<EmrVersionDiffPage />} />
          <Route path="emr/version-compare" element={<EmrVersionComparePage />} />
          <Route path="emr/version-restore" element={<EmrVersionRestorePage />} />
          {/* M274 路由注册 */}
          <Route path="fhir/location" element={<FhirLocationPage />} />
          <Route path="fhir/practitioner" element={<FhirPractitionerPage />} />
          <Route path="fhir/organization" element={<FhirOrganizationPage />} />
          <Route path="patient/360-overview" element={<Patient360OverviewPage />} />
          <Route path="patient/360-timeline" element={<Patient360TimelinePage />} />
          <Route path="patient/360-risk" element={<Patient360RiskPage />} />
          {/* M275 路由注册 */}
          <Route path="bi/bed-occupancy" element={<BiBedOccupancyPage />} />
          <Route path="bi/throughput" element={<BiThroughputPage />} />
          <Route path="bi/satisfaction" element={<BiSatisfactionPage />} />
          <Route path="smart-service/appointment" element={<SmartServiceAppointmentPage />} />
          <Route path="smart-service/guide" element={<SmartServiceGuidePage />} />
          <Route path="smart-service/feedback" element={<SmartServiceFeedbackPage />} />
          {/* M276 路由注册 */}
          <Route path="cds/order-check" element={<CdsOrderCheckPage />} />
          <Route path="cds/lab-alert" element={<CdsLabAlertPage />} />
          <Route path="cds/allergy-check" element={<CdsAllergyCheckPage />} />
          <Route path="mobile/nursing-rounds" element={<MobileNursingRoundsPage />} />
          <Route path="mobile/vitals-chart" element={<MobileVitalsChartPage />} />
          <Route path="mobile/task-completion" element={<MobileTaskCompletionPage />} />
          {/* M278 路由注册 */}
          <Route path="emr/quality-dashboard" element={<EmrQualityDashboardPage />} />
          <Route path="telemed/consultations" element={<TelemedConsultationsPage />} />
          <Route path="community/centers" element={<CommunityCentersPage />} />
          <Route path="hr/employees" element={<HrEmployeesPage />} />
          <Route path="contracts/list" element={<ContractsListPage />} />
          {/* M279 路由注册 */}
          <Route path="equipment/maintenance" element={<EquipmentMaintenancePage />} />
          <Route path="supplies/inventory" element={<SuppliesInventoryPage />} />
          <Route path="pathology/reports" element={<PathologyReportsPage />} />
          <Route path="physical/centers" element={<PhysicalCentersPage />} />
          <Route path="research/projects" element={<ResearchProjectsPage />} />
          <Route path="education/trainings" element={<EducationTrainingsPage />} />
          {/* M280 路由注册 */}
          <Route path="insurance/policies" element={<InsurancePoliciesPage />} />
          <Route path="maternity/records" element={<MaternityRecordsPage />} />
          <Route path="fever/clinics" element={<FeverClinicsPage />} />
          <Route path="newborn/records" element={<NewbornRecordsPage />} />
          <Route path="outpatient/queue" element={<OutpatientQueuePage />} />
          <Route path="inpatient/wards" element={<InpatientWardsPage />} />
          {/* M283 路由注册 */}
          <Route path="tcm/diagnosis" element={<TcmDiagnosisPage />} />
          <Route path="dental/treatments" element={<DentalTreatmentsPage />} />
          <Route path="ophthalmology/exams" element={<OphthalmologyExamsPage />} />
          <Route path="dermatology/records" element={<DermatologyRecordsPage />} />
          <Route path="psychiatry/assessments" element={<PsychiatryAssessmentsPage />} />
          {/* M285 路由注册 */}
          <Route path="cds/order-set" element={<CdsOrderSetPage />} />
          <Route path="pacs/reports" element={<PacsReportsPage />} />
          {/* M287 路由注册 */}
          <Route path="order/sets" element={<OrderSetsPage />} />
          <Route path="lis/results" element={<LisResultsPage />} />
          <Route path="pharmacy/prescriptions" element={<PharmacyPrescriptionsPage />} />
          <Route path="transfusion/records" element={<TransfusionRecordsPage />} />
          {/* M293 路由注册 */}
          <Route path="department/list" element={<DepartmentListPage />} />
          <Route path="doctor/schedule" element={<DoctorSchedulePage />} />
          <Route path="patient/admission" element={<PatientAdmissionPage />} />
          <Route path="patient/discharge" element={<PatientDischargePage />} />
          <Route path="medical/insurance" element={<MedicalInsurancePage />} />
          <Route path="statistics/daily" element={<StatisticsDailyPage />} />
          {/* M294 路由注册 */}
          <Route path="billing/list" element={<BillingListPage />} />
          <Route path="billing/detail" element={<BillingDetailPage />} />
          <Route path="finance/revenue" element={<FinanceRevenuePage />} />
          <Route path="finance/cost" element={<FinanceCostPage />} />
          <Route path="hr/attendance" element={<HrAttendancePage />} />
          <Route path="hr/performance" element={<HrPerformancePage />} />
          {/* M297 路由注册 */}
          <Route path="patient/satisfaction" element={<PatientSatisfactionPage />} />
          {/* M298 路由注册 */}
          <Route path="bi/dashboard" element={<BiDashboardPage />} />
          {/* M301 路由注册 */}
          <Route path="patient/search" element={<PatientSearchPage />} />
          <Route path="patient/detail" element={<PatientDetailPage />} />
          <Route path="doctor/list" element={<DoctorListPage />} />
          <Route path="department/detail" element={<DepartmentDetailPage />} />
          <Route path="schedule/today" element={<ScheduleTodayPage />} />
          <Route path="appointment/list" element={<AppointmentListPage />} />
          {/* M302 路由注册 */}
          <Route path="order/list" element={<OrderListPage />} />
          <Route path="order/detail" element={<OrderDetailPage />} />
          <Route path="medication/list" element={<MedicationListPage />} />
          <Route path="lis/list" element={<LisListPage />} />
          <Route path="pacs/list" element={<PacsListPage />} />
          <Route path="surgery/list" element={<SurgeryListPage />} />
          {/* M303 路由注册 */}
          <Route path="nursing/ward-rounds" element={<NursingWardRoundsPage />} />
          <Route path="nursing/vitals" element={<NursingVitalsPage />} />
          <Route path="pharmacy/dispense" element={<PharmacyDispensePage />} />
          <Route path="transfusion/list" element={<TransfusionListPage />} />
          <Route path="consent/list" element={<ConsentListPage />} />
          <Route path="records/archive" element={<RecordsArchivePage />} />
          {/* M304 路由注册 */}
          <Route path="mobile/pda-tasks" element={<MobilePdaTasksPage />} />
          {/* M305 路由注册 */}
          <Route path="mobile/vitals" element={<MobileVitalsPage />} />
          <Route path="mobile/scan" element={<MobileScanPage />} />
          <Route path="smart-service/queue" element={<SmartServiceQueuePage />} />
          {/* M306 路由注册 */}
          <Route path="internet/prescriptions" element={<InternetPrescriptionsPage />} />
          <Route path="internet/payments" element={<InternetPaymentsPage />} />
          <Route path="internet/consultations" element={<InternetConsultationsPage />} />
          {/* M307 路由注册 */}
          <Route path="fhir/medication" element={<FhirMedicationPage />} />
          <Route path="fhir/coverage" element={<FhirCoveragePage />} />
          <Route path="fhir/claim" element={<FhirClaimPage />} />
          <Route path="fhir/account" element={<FhirAccountPage />} />
          <Route path="fhir/questionnaire" element={<FhirQuestionnairePage />} />
          <Route path="fhir/communication" element={<FhirCommunicationPage />} />
          <Route path="fhir/documentreference" element={<FhirDocumentReferencePage />} />
          {/* M369 路由注册 */}
          <Route path="emr/sign-verify" element={<EmrSignVerifyPage />} />
          <Route path="emr/sign-templates" element={<EmrSignTemplatesPage />} />
          <Route path="audit/trails" element={<AuditTrailsPage />} />
          {/* M372 路由注册 */}
          <Route path="workflow/roles" element={<WorkflowRolesPage />} />
          <Route path="workflow/permissions" element={<WorkflowPermissionsPage />} />
          <Route path="workflow/approve" element={<WorkflowApprovePage />} />
          <Route path="workflow/notify" element={<WorkflowNotifyPage />} />
          <Route path="workflow/escalation" element={<WorkflowEscalationPage />} />
          <Route path="workflow/sla" element={<WorkflowSlaPage />} />
          {/* M374 路由注册 */}
          <Route path="events/list" element={<EventsListPage />} />
          <Route path="events/types" element={<EventsTypesPage />} />
          <Route path="events/subscribers" element={<EventsSubscribersPage />} />
          <Route path="events/publish" element={<EventsPublishPage />} />
          <Route path="events/consumers" element={<EventsConsumersPage />} />
          <Route path="events/metrics-detail" element={<EventsMetricsDetailPage />} />
          {/* M375 路由注册 */}
          <Route path="patient/timeline-filter" element={<PatientTimelineFilterPage />} />
          <Route path="patient/timeline-summary" element={<PatientTimelineSummaryPage />} />
          <Route path="patient/timeline-compare" element={<PatientTimelineComparePage />} />
          <Route path="patient/timeline-export" element={<PatientTimelineExportPage />} />
          {/* M377 路由注册 */}
          <Route path="cds/rule-engine" element={<CdsRuleEnginePage />} />
          <Route path="cds/clinical-evidence" element={<CdsClinicalEvidencePage />} />
          <Route path="cds/clinical-trials" element={<CdsClinicalTrialsPage />} />
          <Route path="cds/clinical-guidelines-detail" element={<CdsClinicalGuidelinesDetailPage />} />
          <Route path="cds/clinical-pathways-detail" element={<CdsClinicalPathwaysDetailPage />} />
          {/* M378 路由注册 */}
          <Route path="nursing/nqi-indicators" element={<NursingNqiIndicatorsPage />} />
          <Route path="nursing/nqi-trends" element={<NursingNqiTrendsPage />} />
          <Route path="nursing/nqi-benchmarks" element={<NursingNqiBenchmarksPage />} />
          <Route path="nursing/nqi-alerts" element={<NursingNqiAlertsPage />} />
          <Route path="nursing/nqi-reports" element={<NursingNqiReportsPage />} />
          {/* M379 路由注册 */}
          <Route path="quality/indicators" element={<QualityIndicatorsPage />} />
          <Route path="quality/scores" element={<QualityScoresPage />} />
          <Route path="quality/trends" element={<QualityTrendsPage />} />
          <Route path="quality/benchmarks" element={<QualityBenchmarksPage />} />
          <Route path="quality/alerts" element={<QualityAlertsPage />} />
          <Route path="quality/reports" element={<QualityReportsPage />} />
          {/* M380 路由注册 */}
          <Route path="risk/indicators" element={<RiskIndicatorsPage />} />
          <Route path="risk/scores" element={<RiskScoresPage />} />
          <Route path="risk/trends" element={<RiskTrendsPage />} />
          <Route path="risk/benchmarks" element={<RiskBenchmarksPage />} />
          <Route path="risk/alerts" element={<RiskAlertsPage />} />
          <Route path="risk/reports" element={<RiskReportsPage />} />
          {/* M381 路由注册 */}
          <Route path="audit/compliance-detail" element={<AuditComplianceDetailPage />} />
          <Route path="audit/compliance-checklist" element={<AuditComplianceChecklistPage />} />
          <Route path="audit/compliance-evidence" element={<AuditComplianceEvidencePage />} />
          <Route path="audit/compliance-remediation" element={<AuditComplianceRemediationPage />} />
          <Route path="audit/compliance-report" element={<AuditComplianceReportPage />} />
          <Route path="audit/compliance-dashboard" element={<AuditComplianceDashboardPage />} />
          {/* M382 路由注册 */}
          <Route path="security/policy" element={<SecurityPolicyPage />} />
          <Route path="security/policy-detail" element={<SecurityPolicyDetailPage />} />
          <Route path="security/vulnerabilities" element={<SecurityVulnerabilitiesPage />} />
          <Route path="security/patches" element={<SecurityPatchesPage />} />
          {/* M383 路由注册 */}
          <Route path="security/data-access" element={<SecurityDataAccessPage />} />
          <Route path="security/data-sharing" element={<SecurityDataSharingPage />} />
          <Route path="security/data-export" element={<SecurityDataExportPage />} />
          <Route path="security/data-backup" element={<SecurityDataBackupPage />} />
          <Route path="security/data-recovery" element={<SecurityDataRecoveryPage />} />
          {/* M385 路由注册 */}
          <Route path="security/incidents" element={<SecurityIncidentsPage />} />
          <Route path="security/incident-response" element={<SecurityIncidentResponsePage />} />
          <Route path="workflow/admin" element={<WorkflowAdminPage />} />
          <Route path="events/metrics" element={<EventsMetricsPage />} />
          <Route path="emr/template" element={<EmrTemplatePage />} />
          <Route path="cds/guideline" element={<CdsGuidelinePage />} />
          {/* M309 路由注册 */}
          <Route path="auth/roles" element={<AuthRolesPage />} />
          <Route path="auth/permissions" element={<AuthPermissionsPage />} />
          <Route path="audit/logs" element={<AuditLogsPage />} />
          <Route path="compliance/score" element={<ComplianceScorePage />} />
          <Route path="security/dashboard" element={<SecurityDashboardPage />} />
          <Route path="tenants/list" element={<TenantsListPage />} />
          {/* M311 路由注册 */}
          <Route path="anesthesia/records" element={<AnesthesiaRecordsPage />} />
          <Route path="anesthesia/complications" element={<AnesthesiaComplicationsPage />} />
          <Route path="tcm/prescriptions" element={<TcmPrescriptionsPage />} />
          <Route path="tcm/formulas" element={<TcmFormulasPage />} />
          <Route path="dental/appointments" element={<DentalAppointmentsPage />} />
          {/* M312 路由注册 */}
          <Route path="oncology/records" element={<OncologyRecordsPage />} />
          <Route path="chronic/management" element={<ChronicManagementPage />} />
          <Route path="icu/monitor" element={<IcuMonitorPage />} />
          {/* M316 路由注册 */}
          <Route path="financial/procurement" element={<FinancialProcurementPage />} />
          <Route path="financial/assets" element={<FinancialAssetsPage />} />
          <Route path="logistics/preventive" element={<LogisticsPreventivePage />} />
          <Route path="discharge/summary" element={<DischargeSummaryPage />} />
          {/* M317 路由注册 */}
          <Route path="consultation/list" element={<ConsultationListPage />} />
          <Route path="emergency/list" element={<EmergencyListPage />} />
          <Route path="icu/list" element={<IcuListPage />} />
          <Route path="anesthesia/list" element={<AnesthesiaListPage />} />
          <Route path="discharge/list" element={<DischargeListPage />} />
          <Route path="cds/diagnosis-suggest" element={<CdsDiagnosisSuggestPage />} />
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
          {/* M221：AI/BI 占位页（接口对接中） */}
          <Route path="ai/cda" element={<AiCdaSuggestPage />} />
          <Route path="ai/risk" element={<AiRiskPredictionPage />} />
          <Route path="bi/trends" element={<BiTrendsPage />} />
          <Route path="bi/comparison" element={<BiComparisonPage />} />
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

          {/* M383+M385 路由注册（补登） */}
          <Route path="security/data-access" element={<SecurityDataAccessPage />} />
          <Route path="security/data-sharing" element={<SecurityDataSharingPage />} />
          <Route path="security/data-export" element={<SecurityDataExportPage />} />
          <Route path="security/data-backup" element={<SecurityDataBackupPage />} />
          <Route path="security/data-recovery" element={<SecurityDataRecoveryPage />} />
          <Route path="security/incidents" element={<SecurityIncidentsPage />} />
          <Route path="security/incident-response" element={<SecurityIncidentResponsePage />} />
          {/* M386 智慧服务路由 */}
          <Route path="service/appointments" element={<ServiceAppointmentsPage />} />
          <Route path="service/payments" element={<ServicePaymentsPage />} />
          <Route path="service/querys" element={<ServiceQuerysPage />} />
          <Route path="service/reminders" element={<ServiceRemindersPage />} />
          <Route path="service/feedback" element={<ServiceFeedbackPage />} />
          <Route path="service/satisfaction" element={<ServiceSatisfactionPage />} />
          {/* M387 运营管理路由 */}
          <Route path="operations/dashboard" element={<OperationsDashboardPage />} />
          <Route path="operations/kpi" element={<OperationsKpiPage />} />
          <Route path="operations/reports" element={<OperationsReportsPage />} />
          <Route path="operations/analysis" element={<OperationsAnalysisPage />} />
          <Route path="operations/forecast" element={<OperationsForecastPage />} />
          <Route path="operations/benchmark" element={<OperationsBenchmarkPage />} />
          {/* M388 人力资源路由 */}
          <Route path="hr/staff-dashboard" element={<HrStaffDashboardPage />} />
          <Route path="hr/staff-recruitment" element={<HrStaffRecruitmentPage />} />
          <Route path="hr/staff-training" element={<HrStaffTrainingPage />} />
          <Route path="hr/staff-performance" element={<HrStaffPerformancePage />} />
          <Route path="hr/staff-schedule" element={<HrStaffSchedulePage />} />
          <Route path="hr/staff-attendance" element={<HrStaffAttendancePage />} />
          {/* M389 财务路由补登 */}
          <Route path="finance/costs" element={<FinanceCostsPage />} />
          <Route path="finance/analysis" element={<FinanceAnalysisPage />} />
          {/* M390 药品物资路由 */}
          <Route path="pharmacy/dashboard" element={<PharmacyDashboardPage />} />
          <Route path="pharmacy/inventory-detail" element={<PharmacyInventoryDetailPage />} />
          <Route path="pharmacy/suppliers" element={<PharmacySuppliersPage />} />
          <Route path="pharmacy/purchasing" element={<PharmacyPurchasingPage />} />
          <Route path="pharmacy/expiry" element={<PharmacyExpiryPage />} />
          {/* M391 科研教学路由补登 */}
          <Route path="research/projects" element={<ResearchProjectsPage />} />
          <Route path="research/papers" element={<ResearchPapersPage />} />
          <Route path="research/funds" element={<ResearchFundsPage />} />
          <Route path="research/awards" element={<ResearchAwardsPage />} />
          <Route path="teaching/courses" element={<TeachingCoursesPage />} />
          <Route path="teaching/training" element={<TeachingTrainingPage />} />
          {/* M392 互联网医院路由 */}
          <Route path="telemed/prescriptions" element={<TelemedPrescriptionsPage />} />
          <Route path="telemed/payments" element={<TelemedPaymentsPage />} />
          <Route path="telemed/delivery" element={<TelemedDeliveryPage />} />
          <Route path="telemed/followup" element={<TelemedFollowupPage />} />
          <Route path="telemed/reports" element={<TelemedReportsPage />} />
          {/* M394 远程医疗路由 */}
          <Route path="telemed/remote-consults" element={<TelemedRemoteConsultsPage />} />
          <Route path="telemed/remote-diagnosis" element={<TelemedRemoteDiagnosisPage />} />
          <Route path="telemed/remote-monitoring" element={<TelemedRemoteMonitoringPage />} />
          <Route path="telemed/remote-surgery" element={<TelemedRemoteSurgeryPage />} />
          <Route path="telemed/remote-training" element={<TelemedRemoteTrainingPage />} />
          <Route path="telemed/remote-equipment" element={<TelemedRemoteEquipmentPage />} />
          {/* M395 社区医疗路由 */}
          <Route path="community/visits" element={<CommunityVisitsPage />} />
          <Route path="community/health-records" element={<CommunityHealthRecordsPage />} />
          <Route path="community/elderly-care" element={<CommunityElderlyCarePage />} />
          <Route path="community/chronic-disease" element={<CommunityChronicDiseasePage />} />
          <Route path="community/education" element={<CommunityEducationPage />} />
          {/* M396 妇幼保健路由 */}
          <Route path="maternity/prenatal-care" element={<MaternityPrenatalCarePage />} />
          <Route path="maternity/postnatal-care" element={<MaternityPostnatalCarePage />} />
          <Route path="maternity/infant-care" element={<MaternityInfantCarePage />} />
          <Route path="maternity/child-vaccination" element={<MaternityChildVaccinationPage />} />
          <Route path="maternity/women-health" element={<MaternityWomenHealthPage />} />
          <Route path="maternity/genetic-screening" element={<MaternityGeneticScreeningPage />} />
          {/* M397 急诊急救路由补登 */}
          <Route path="emergency/triage" element={<EmergencyTriagePage />} />
          <Route path="emergency/rescue" element={<EmergencyRescuePage />} />
          <Route path="emergency/ambulance" element={<EmergencyAmbulancePage />} />
          <Route path="emergency/disaster" element={<EmergencyDisasterPage />} />
          <Route path="emergency/poisoning" element={<EmergencyPoisoningPage />} />
          <Route path="emergency/trauma" element={<EmergencyTraumaPage />} />
          {/* M398 肿瘤医学路由 */}
          <Route path="oncology/screening" element={<OncologyScreeningPage />} />
          <Route path="oncology/diagnosis" element={<OncologyDiagnosisPage />} />
          <Route path="oncology/treatment-plan" element={<OncologyTreatmentPlanPage />} />
          <Route path="oncology/followup" element={<OncologyFollowupPage />} />
          {/* M399 康复医学路由 */}
          <Route path="rehab/assessment" element={<RehabAssessmentPage />} />
          <Route path="rehab/treatment" element={<RehabTreatmentPage />} />
          <Route path="rehab/therapy" element={<RehabTherapyPage />} />
          <Route path="rehab/exercise" element={<RehabExercisePage />} />
          <Route path="rehab/occupational" element={<RehabOccupationalPage />} />
          {/* M401 老年医学路由补登 */}
          <Route path="geriatrics/assessment" element={<GeriatricsAssessmentPage />} />
          <Route path="geriatrics/care-plan" element={<GeriatricsCarePlanPage />} />
          <Route path="geriatrics/comorbidity" element={<GeriatricsComorbidityPage />} />
          <Route path="geriatrics/frail" element={<GeriatricsFrailPage />} />
          <Route path="geriatrics/dementia" element={<GeriatricsDementiaPage />} />
          <Route path="geriatrics/falls" element={<GeriatricsFallsPage />} />
          {/* M402 病历管理路由补登 */}
          <Route path="emr/templates" element={<EmrTemplatesPage />} />
          <Route path="emr/signatures" element={<EmrSignaturesPage />} />
          <Route path="emr/templates-detail" element={<EmrTemplatesDetailPage />} />
          <Route path="emr/quality-check" element={<EmrQualityCheckPage />} />
          <Route path="emr/retrieval" element={<EmrRetrievalPage />} />
          <Route path="emr/archive" element={<EmrArchivePage />} />
          {/* M403 医保管理路由 */}
          <Route path="insurance/policy" element={<InsurancePolicyPage />} />
          <Route path="insurance/claims" element={<InsuranceClaimsPage />} />
          <Route path="insurance/settlement" element={<InsuranceSettlementPage />} />
          <Route path="insurance/audit" element={<InsuranceAuditPage />} />
          <Route path="insurance/disease-codes" element={<InsuranceDiseaseCodesPage />} />
          <Route path="insurance/items" element={<InsuranceItemsPage />} />
          {/* M404 手术麻醉路由补登 */}
          <Route path="surgery/schedule" element={<SurgerySchedulePage />} />
          <Route path="surgery/records" element={<SurgeryRecordsPage />} />
          <Route path="surgery/consent" element={<SurgeryConsentPage />} />
          <Route path="anesthesia/records" element={<AnesthesiaRecordsPage />} />
          <Route path="anesthesia/assessment" element={<AnesthesiaAssessmentPage />} />
          <Route path="anesthesia/recovery" element={<AnesthesiaRecoveryPage />} />
          {/* M405 检验检查路由补登 */}
          <Route path="lab/items" element={<LabItemsPage />} />
          <Route path="lab/results" element={<LabResultsPage />} />
          <Route path="lab/reports" element={<LabReportsPage />} />
          <Route path="radiology/items" element={<RadiologyItemsPage />} />
          <Route path="radiology/results" element={<RadiologyResultsPage />} />
          <Route path="radiology/reports" element={<RadiologyReportsPage />} />
          {/* M406 门诊住院路由补登 */}
          <Route path="outpatient/queue" element={<OutpatientQueuePage />} />
          <Route path="outpatient/visits" element={<OutpatientVisitsPage />} />
          <Route path="outpatient/prescriptions" element={<OutpatientPrescriptionsPage />} />
          <Route path="inpatient/admissions" element={<InpatientAdmissionsPage />} />
          <Route path="inpatient/discharges" element={<InpatientDischargesPage />} />
          <Route path="inpatient/transfers" element={<InpatientTransfersPage />} />
          {/* M407 医嘱处方路由补登 */}
          <Route path="orders/list" element={<OrdersListPage />} />
          <Route path="orders/detail" element={<OrdersDetailPage />} />
          <Route path="orders/templates" element={<OrdersTemplatesPage />} />
          <Route path="prescriptions/list" element={<PrescriptionsListPage />} />
          <Route path="prescriptions/detail" element={<PrescriptionsDetailPage />} />
          <Route path="prescriptions/audit" element={<PrescriptionsAuditPage />} />
          {/* M408 患者360路由补登 */}
          <Route path="patient/profile" element={<PatientProfilePage />} />
          <Route path="patient/visits" element={<PatientVisitsPage />} />
          <Route path="patient/allergies" element={<PatientAllergiesPage />} />
          <Route path="patient/medications" element={<PatientMedicationsPage />} />
          <Route path="patient/labs" element={<PatientLabsPage />} />
          <Route path="patient/imaging" element={<PatientImagingPage />} />
          {/* M409 CDS路由补登 */}
          <Route path="cds/rules" element={<CdsRulesPage />} />
          <Route path="cds/alerts" element={<CdsAlertsPage />} />
          <Route path="cds/recommendations" element={<CdsRecommendationsPage />} />
          <Route path="cds/drug-interactions" element={<CdsDrugInteractionsPage />} />
          <Route path="cds/contraindications" element={<CdsContraindicationsPage />} />
          <Route path="cds/guidelines" element={<CdsGuidelinesPage />} />
          {/* M410 工作流路由补登 */}
          <Route path="workflow/tasks" element={<WorkflowTasksPage />} />
          <Route path="workflow/templates" element={<WorkflowTemplatesPage />} />
          <Route path="workflow/instances" element={<WorkflowInstancesPage />} />
          <Route path="workflow/approval" element={<WorkflowApprovalPage />} />
          <Route path="workflow/scheduling" element={<WorkflowSchedulingPage />} />
          <Route path="workflow/notifications" element={<WorkflowNotificationsPage />} />
          {/* M411 系统管理配置路由补登 */}
          <Route path="system/config" element={<SystemConfigPage />} />
          <Route path="system/menus" element={<SystemMenusPage />} />
          <Route path="system/dict" element={<SystemDictPage />} />
          <Route path="system/logs" element={<SystemLogsPage />} />
          <Route path="system/params" element={<SystemParamsPage />} />
          <Route path="system/cache" element={<SystemCachePage />} />
          {/* M412 多租户路由补登 */}
          <Route path="tenants/list" element={<TenantsListPage />} />
          <Route path="tenants/detail" element={<TenantsDetailPage />} />
          <Route path="tenants/config" element={<TenantsConfigPage />} />
          <Route path="tenants/quota" element={<TenantsQuotaPage />} />
          <Route path="tenants/isolation" element={<TenantsIsolationPage />} />
          <Route path="tenants/switch" element={<TenantsSwitchPage />} />
          {/* M413 PHI脱敏路由 */}
          <Route path="phi/masking" element={<PhiMaskingPage />} />
          <Route path="phi/encryption" element={<PhiEncryptionPage />} />
          <Route path="phi/decryption" element={<PhiDecryptionPage />} />
          <Route path="phi/audit" element={<PhiAuditPage />} />
          <Route path="phi/policies" element={<PhiPoliciesPage />} />
          <Route path="phi/consent" element={<PhiConsentPage />} />
          {/* M414 电子签名审计追踪路由补登 */}
          <Route path="signatures/list" element={<SignaturesListPage />} />
          <Route path="signatures/verify" element={<SignaturesVerifyPage />} />
          <Route path="signatures/templates" element={<SignaturesTemplatesPage />} />
          <Route path="audit/trails" element={<AuditTrailsPage />} />
          <Route path="audit/logs" element={<AuditLogsPage />} />
          <Route path="audit/reports" element={<AuditReportsPage />} />
          {/* M415 BI运营分析路由补登 */}
          <Route path="bi/dashboard" element={<BiDashboardPage />} />
          <Route path="bi/charts" element={<BiChartsPage />} />
          <Route path="bi/reports" element={<BiReportsPage />} />
          <Route path="bi/analysis" element={<BiAnalysisPage />} />
          <Route path="bi/export" element={<BiExportPage />} />
          <Route path="bi/scheduled" element={<BiScheduledPage />} />
          {/* M416 科研教学详情路由 */}
          <Route path="research/projects-detail" element={<ResearchProjectsDetailPage />} />
          <Route path="research/papers-detail" element={<ResearchPapersDetailPage />} />
          <Route path="research/funds-detail" element={<ResearchFundsDetailPage />} />
          <Route path="research/awards-detail" element={<ResearchAwardsDetailPage />} />
          <Route path="teaching/courses-detail" element={<TeachingCoursesDetailPage />} />
          <Route path="teaching/training-detail" element={<TeachingTrainingDetailPage />} />
          {/* M417 互联网医院详情路由 */}
          <Route path="telemed/consultations-detail" element={<TelemedConsultationsDetailPage />} />
          <Route path="telemed/prescriptions-detail" element={<TelemedPrescriptionsDetailPage />} />
          <Route path="telemed/payments-detail" element={<TelemedPaymentsDetailPage />} />
          <Route path="telemed/delivery-detail" element={<TelemedDeliveryDetailPage />} />
          <Route path="telemed/followup-detail" element={<TelemedFollowupDetailPage />} />
          <Route path="telemed/reports-detail" element={<TelemedReportsDetailPage />} />
          {/* M418 远程医疗详情路由 */}
          <Route path="telemed/remote-consults-detail" element={<TelemedRemoteConsultsDetailPage />} />
          <Route path="telemed/remote-diagnosis-detail" element={<TelemedRemoteDiagnosisDetailPage />} />
          <Route path="telemed/remote-monitoring-detail" element={<TelemedRemoteMonitoringDetailPage />} />
          <Route path="telemed/remote-surgery-detail" element={<TelemedRemoteSurgeryDetailPage />} />
          <Route path="telemed/remote-training-detail" element={<TelemedRemoteTrainingDetailPage />} />
          <Route path="telemed/remote-equipment-detail" element={<TelemedRemoteEquipmentDetailPage />} />
          {/* M419 社区医疗详情路由 */}
          <Route path="community/followups-detail" element={<CommunityFollowupsDetailPage />} />
          <Route path="community/visits-detail" element={<CommunityVisitsDetailPage />} />
          <Route path="community/health-records-detail" element={<CommunityHealthRecordsDetailPage />} />
          <Route path="community/elderly-care-detail" element={<CommunityElderlyCareDetailPage />} />
          <Route path="community/chronic-disease-detail" element={<CommunityChronicDiseaseDetailPage />} />
          <Route path="community/education-detail" element={<CommunityEducationDetailPage />} />
          {/* M421 妇幼保健详情路由 */}
          <Route path="maternity/prenatal-care-detail" element={<MaternityPrenatalCareDetailPage />} />
          <Route path="maternity/postnatal-care-detail" element={<MaternityPostnatalCareDetailPage />} />
          <Route path="maternity/infant-care-detail" element={<MaternityInfantCareDetailPage />} />
          <Route path="maternity/child-vaccination-detail" element={<MaternityChildVaccinationDetailPage />} />
          <Route path="maternity/women-health-detail" element={<MaternityWomenHealthDetailPage />} />
          <Route path="maternity/genetic-screening-detail" element={<MaternityGeneticScreeningDetailPage />} />
          {/* M422 急诊急救详情路由 */}
          <Route path="emergency/triage-detail" element={<EmergencyTriageDetailPage />} />
          <Route path="emergency/rescue-detail" element={<EmergencyRescueDetailPage />} />
          <Route path="emergency/ambulance-detail" element={<EmergencyAmbulanceDetailPage />} />
          <Route path="emergency/disaster-detail" element={<EmergencyDisasterDetailPage />} />
          <Route path="emergency/poisoning-detail" element={<EmergencyPoisoningDetailPage />} />
          <Route path="emergency/trauma-detail" element={<EmergencyTraumaDetailPage />} />
          {/* M423 肿瘤医学详情路由 */}
          <Route path="oncology/screening-detail" element={<OncologyScreeningDetailPage />} />
          <Route path="oncology/diagnosis-detail" element={<OncologyDiagnosisDetailPage />} />
          <Route path="oncology/treatment-plan-detail" element={<OncologyTreatmentPlanDetailPage />} />
          <Route path="oncology/chemotherapy-detail" element={<OncologyChemotherapyDetailPage />} />
          <Route path="oncology/radiotherapy-detail" element={<OncologyRadiotherapyDetailPage />} />
          <Route path="oncology/followup-detail" element={<OncologyFollowupDetailPage />} />
          {/* M426 康复医学详情路由 */}
          <Route path="rehab/assessment-detail" element={<RehabAssessmentDetailPage />} />
          <Route path="rehab/treatment-detail" element={<RehabTreatmentDetailPage />} />
          <Route path="rehab/therapy-detail" element={<RehabTherapyDetailPage />} />
          <Route path="rehab/exercise-detail" element={<RehabExerciseDetailPage />} />
          <Route path="rehab/occupational-detail" element={<RehabOccupationalDetailPage />} />
          <Route path="rehab/followup-detail" element={<RehabFollowupDetailPage />} />
          {/* M427 老年医学详情路由 */}
          <Route path="geriatrics/assessment-detail" element={<GeriatricsAssessmentDetailPage />} />
          <Route path="geriatrics/care-plan-detail" element={<GeriatricsCarePlanDetailPage />} />
          <Route path="geriatrics/comorbidity-detail" element={<GeriatricsComorbidityDetailPage />} />
          <Route path="geriatrics/frail-detail" element={<GeriatricsFrailDetailPage />} />
          <Route path="geriatrics/dementia-detail" element={<GeriatricsDementiaDetailPage />} />
          <Route path="geriatrics/falls-detail" element={<GeriatricsFallsDetailPage />} />
          {/* M429 病历管理详情路由补登 */}
          <Route path="emr/templates-detail" element={<EmrTemplatesDetailPage />} />
          <Route path="emr/quality-check-detail" element={<EmrQualityCheckDetailPage />} />
          <Route path="emr/retrieval-detail" element={<EmrRetrievalDetailPage />} />
          <Route path="emr/archive-detail" element={<EmrArchiveDetailPage />} />
          <Route path="emr/signatures-detail" element={<EmrSignaturesDetailPage />} />
          <Route path="emr/versions-detail" element={<EmrVersionsDetailPage />} />
          {/* M430 医保管理详情路由 */}
          <Route path="insurance/policy-detail" element={<InsurancePolicyDetailPage />} />
          <Route path="insurance/claims-detail" element={<InsuranceClaimsDetailPage />} />
          <Route path="insurance/settlement-detail" element={<InsuranceSettlementDetailPage />} />
          <Route path="insurance/audit-detail" element={<InsuranceAuditDetailPage />} />
          <Route path="insurance/disease-codes-detail" element={<InsuranceDiseaseCodesDetailPage />} />
          <Route path="insurance/items-detail" element={<InsuranceItemsDetailPage />} />
          {/* M431 医嘱处方详情路由 */}
          <Route path="orders/list-detail" element={<OrdersListDetailPage />} />
          <Route path="orders/detail-detail" element={<OrdersDetailDetailPage />} />
          <Route path="orders/templates-detail" element={<OrdersTemplatesDetailPage />} />
          <Route path="prescriptions/list-detail" element={<PrescriptionsListDetailPage />} />
          <Route path="prescriptions/detail-detail" element={<PrescriptionsDetailDetailPage />} />
          <Route path="prescriptions/audit-detail" element={<PrescriptionsAuditDetailPage />} />
          {/* M432 手术麻醉详情路由 */}
          <Route path="surgery/schedule-detail" element={<SurgeryScheduleDetailPage />} />
          <Route path="surgery/records-detail" element={<SurgeryRecordsDetailPage />} />
          <Route path="surgery/consent-detail" element={<SurgeryConsentDetailPage />} />
          <Route path="anesthesia/records-detail" element={<AnesthesiaRecordsDetailPage />} />
          <Route path="anesthesia/assessment-detail" element={<AnesthesiaAssessmentDetailPage />} />
          <Route path="anesthesia/recovery-detail" element={<AnesthesiaRecoveryDetailPage />} />
          {/* M433 检验检查详情路由 */}
          <Route path="lab/items-detail" element={<LabItemsDetailPage />} />
          <Route path="lab/results-detail" element={<LabResultsDetailPage />} />
          <Route path="lab/reports-detail" element={<LabReportsDetailPage />} />
          <Route path="radiology/items-detail" element={<RadiologyItemsDetailPage />} />
          <Route path="radiology/results-detail" element={<RadiologyResultsDetailPage />} />
          <Route path="radiology/reports-detail" element={<RadiologyReportsDetailPage />} />
          {/* M434 门诊住院详情路由 */}
          <Route path="outpatient/queue-detail" element={<OutpatientQueueDetailPage />} />
          <Route path="outpatient/visits-detail" element={<OutpatientVisitsDetailPage />} />
          <Route path="outpatient/prescriptions-detail" element={<OutpatientPrescriptionsDetailPage />} />
          <Route path="inpatient/admissions-detail" element={<InpatientAdmissionsDetailPage />} />
          <Route path="inpatient/discharges-detail" element={<InpatientDischargesDetailPage />} />
          <Route path="inpatient/transfers-detail" element={<InpatientTransfersDetailPage />} />
          {/* M436 耳鼻喉详情路由 */}
          <Route path="ent/examinations-detail" element={<EntExaminationsDetailPage />} />
          <Route path="ent/diseases-detail" element={<EntDiseasesDetailPage />} />
          <Route path="ent/surgeries-detail" element={<EntSurgeriesDetailPage />} />
          <Route path="ent/hearing-detail" element={<EntHearingDetailPage />} />
          <Route path="ent/nose-detail" element={<EntNoseDetailPage />} />
          <Route path="ent/throat-detail" element={<EntThroatDetailPage />} />
          {/* M437 CDS详情路由 */}
          <Route path="cds/rules-detail" element={<CdsRulesDetailPage />} />
          <Route path="cds/alerts-detail" element={<CdsAlertsDetailPage />} />
          <Route path="cds/recommendations-detail" element={<CdsRecommendationsDetailPage />} />
          <Route path="cds/drug-interactions-detail" element={<CdsDrugInteractionsDetailPage />} />
          <Route path="cds/contraindications-detail" element={<CdsContraindicationsDetailPage />} />
          <Route path="cds/guidelines-detail" element={<CdsGuidelinesDetailPage />} />
          {/* M438 工作流详情路由 */}
          <Route path="workflow/tasks-detail" element={<WorkflowTasksDetailPage />} />
          <Route path="workflow/templates-detail" element={<WorkflowTemplatesDetailPage />} />
          <Route path="workflow/instances-detail" element={<WorkflowInstancesDetailPage />} />
          <Route path="workflow/approval-detail" element={<WorkflowApprovalDetailPage />} />
          <Route path="workflow/scheduling-detail" element={<WorkflowSchedulingDetailPage />} />
          <Route path="workflow/notifications-detail" element={<WorkflowNotificationsDetailPage />} />
          {/* M439 系统管理详情路由 */}
          <Route path="system/config-detail" element={<SystemConfigDetailPage />} />
          <Route path="system/menus-detail" element={<SystemMenusDetailPage />} />
          <Route path="system/dict-detail" element={<SystemDictDetailPage />} />
          <Route path="system/logs-detail" element={<SystemLogsDetailPage />} />
          <Route path="system/params-detail" element={<SystemParamsDetailPage />} />
          <Route path="system/cache-detail" element={<SystemCacheDetailPage />} />
          {/* M440 多租户详情路由 */}
          <Route path="tenants/list-detail" element={<TenantsListDetailPage />} />
          <Route path="tenants/detail-detail" element={<TenantsDetailDetailPage />} />
          <Route path="tenants/config-detail" element={<TenantsConfigDetailPage />} />
          <Route path="tenants/quota-detail" element={<TenantsQuotaDetailPage />} />
          <Route path="tenants/isolation-detail" element={<TenantsIsolationDetailPage />} />
          <Route path="tenants/switch-detail" element={<TenantsSwitchDetailPage />} />
          {/* M441 安全合规详情路由 */}
          <Route path="security/phi-masking-detail" element={<SecurityPhiMaskingDetailPage />} />
          <Route path="security/data-encryption-detail" element={<SecurityDataEncryptionDetailPage />} />
          <Route path="security/audit-logs-detail" element={<SecurityAuditLogsDetailPage />} />
          <Route path="security/access-control-detail" element={<SecurityAccessControlDetailPage />} />
          <Route path="security/data-retention-detail" element={<SecurityDataRetentionDetailPage />} />
          <Route path="security/compliance-detail" element={<SecurityComplianceDetailPage />} />
          {/* M442 BI详情路由 */}
          <Route path="bi/dashboard-detail" element={<BiDashboardDetailPage />} />
          <Route path="bi/reports-detail" element={<BiReportsDetailPage />} />
          <Route path="bi/charts-detail" element={<BiChartsDetailPage />} />
          <Route path="bi/analytics-detail" element={<BiAnalyticsDetailPage />} />
          <Route path="bi/export-detail" element={<BiExportDetailPage />} />
          <Route path="bi/schedule-detail" element={<BiScheduleDetailPage />} />
          {/* M443 重症医学详情路由 */}
          <Route path="icu/admissions-detail" element={<IcuAdmissionsDetailPage />} />
          <Route path="icu/monitoring-detail" element={<IcuMonitoringDetailPage />} />
          <Route path="icu/treatments-detail" element={<IcuTreatmentsDetailPage />} />
          <Route path="icu/ventilator-detail" element={<IcuVentilatorDetailPage />} />
          <Route path="icu/critical-events-detail" element={<IcuCriticalEventsDetailPage />} />
          <Route path="icu/discharges-detail" element={<IcuDischargesDetailPage />} />
          {/* M445 补建接口路由 */}
          <Route path="auth/me" element={<AuthMePage />} />
          <Route path="emr/list" element={<EmrListPage />} />
          {/* M446 智慧服务详情路由 */}
          <Route path="service/appointments-detail" element={<ServiceAppointmentsDetailPage />} />
          <Route path="service/queues-detail" element={<ServiceQueuesDetailPage />} />
          <Route path="service/payments-detail" element={<ServicePaymentsDetailPage />} />
          <Route path="service/reports-detail" element={<ServiceReportsDetailPage />} />
          <Route path="service/messages-detail" element={<ServiceMessagesDetailPage />} />
          <Route path="service/feedback-detail" element={<ServiceFeedbackDetailPage />} />
          {/* M447 运营管理详情路由 */}
          <Route path="operations/dashboard-detail" element={<OperationsDashboardDetailPage />} />
          <Route path="operations/efficiency-detail" element={<OperationsEfficiencyDetailPage />} />
          <Route path="operations/cost-detail" element={<OperationsCostDetailPage />} />
          <Route path="operations/revenue-detail" element={<OperationsRevenueDetailPage />} />
          <Route path="operations/quality-detail" element={<OperationsQualityDetailPage />} />
          <Route path="operations/comparison-detail" element={<OperationsComparisonDetailPage />} />
          {/* M448 人力资源详情路由 */}
          <Route path="hr/employees-detail" element={<HrEmployeesDetailPage />} />
          <Route path="hr/departments-detail" element={<HrDepartmentsDetailPage />} />
          <Route path="hr/attendance-detail" element={<HrAttendanceDetailPage />} />
          <Route path="hr/performance-detail" element={<HrPerformanceDetailPage />} />
          <Route path="hr/salary-detail" element={<HrSalaryDetailPage />} />
          <Route path="hr/training-detail" element={<HrTrainingDetailPage />} />
          {/* M449 财务详情路由 */}
          <Route path="finance/bills-detail" element={<FinanceBillsDetailPage />} />
          <Route path="finance/payments-detail" element={<FinancePaymentsDetailPage />} />
          <Route path="finance/refunds-detail" element={<FinanceRefundsDetailPage />} />
          <Route path="finance/invoices-detail" element={<FinanceInvoicesDetailPage />} />
          <Route path="finance/budgets-detail" element={<FinanceBudgetsDetailPage />} />
          <Route path="finance/reports-detail" element={<FinanceReportsDetailPage />} />
          {/* M450 药品物资详情路由 */}
          <Route path="pharmacy/drugs-detail" element={<PharmacyDrugsDetailPage />} />
          <Route path="pharmacy/stocks-detail" element={<PharmacyStocksDetailPage />} />
          <Route path="pharmacy/purchases-detail" element={<PharmacyPurchasesDetailPage />} />
          <Route path="pharmacy/suppliers-detail" element={<PharmacySuppliersDetailPage />} />
          <Route path="pharmacy/warnings-detail" element={<PharmacyWarningsDetailPage />} />
          <Route path="pharmacy/expiry-detail" element={<PharmacyExpiryDetailPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SessionTimeoutWatcher />
    </Suspense>
  );
}
