/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊问诊场景 - 类型定义
 * 涵盖候诊队列、问诊记录、诊断、处方、检查检验、病历、AI辅助、转诊会诊等核心域模型。
 * 演示环境为虚拟患者，所有患者标识均已脱敏。
 */

/* -------------------------------------------------------------------------- */
/*                                  基础枚举                                  */
/* -------------------------------------------------------------------------- */

/** 候诊队列状态 */
export type QueueStatus =
  | 'waiting' // 待诊
  | 'in_consult' // 就诊中
  | 'visited' // 已诊
  | 'passed' // 过号
  | 'stopped'; // 停诊

/** 就诊类型 */
export type VisitType = 'normal' | 'expert' | 'emergency';

/** 患者性别 */
export type Gender = 'male' | 'female' | 'unknown';

/** 医保类型 */
export type InsuranceType =
  | 'self' // 自费
  | 'urban_employee' // 城镇职工医保
  | 'urban_resident' // 城乡居民医保
  | 'new_rural'; // 新农合

/** 处方类型 */
export type PrescriptionType = 'western' | 'chinese_patent' | 'chinese_herbal' | 'external';

/** 给药途径 */
export type DrugRoute =
  | 'po' // 口服
  | 'ivgtt' // 静脉滴注
  | 'ivpush' // 静脉推注
  | 'im' // 肌肉注射
  | 'ih' // 皮下注射
  | 'topical' // 外用
  | 'inhalation' // 吸入
  | 'sublingual' // 舌下含服
  | 'rectal'; // 直肠给药

/** 给药频次 */
export type DrugFrequency =
  'qd' | 'bid' | 'tid' | 'qid' | 'q4h' | 'q6h' | 'q8h' | 'q12h' | 'prn' | 'qod' | 'qn' | 'st';

/** 申请单类型 */
export type OrderKind = 'lab' | 'imaging' | 'treatment';

/** 申请单状态 */
export type OrderStatus = 'pending' | 'drawn' | 'reported' | 'cancelled';

/** 诊断性质 */
export type DiagnosisKind = 'primary' | 'secondary' | 'differential';

/** AI建议等级 */
export type AISeverity = 'info' | 'warning' | 'danger' | 'success';

/** 转诊类型 */
export type ReferralType = 'inward' | 'outward' | 'upward' | 'downward';

/** 会诊紧急程度 */
export type ConsultEmergency = 'routine' | 'urgent' | 'emergency';

/* -------------------------------------------------------------------------- */
/*                                 患者与候诊                                  */
/* -------------------------------------------------------------------------- */

/** 生命体征 */
export interface VitalSigns {
  temperature?: number; // ℃
  pulse?: number; // 次/分
  respiration?: number; // 次/分
  systolic?: number; // mmHg
  diastolic?: number; // mmHg
  weight?: number; // kg
  height?: number; // cm
  spo2?: number; // %
}

/** 患者简要信息（360 摘要右栏使用，脱敏） */
export interface PatientBrief {
  patientId: string;
  nameMasked: string; // 脱敏姓名，如 张*
  gender: Gender;
  age: number;
  birthday?: string;
  idCardMasked?: string;
  phoneMasked?: string;
  insurance: InsuranceType;
  allergies: string[]; // 过敏药物/物质
  chronicConditions: string[]; // 慢性病
  currentMedications: string[]; // 当前用药
  recentLabs?: RecentLabSummary[];
  lastVisit?: string;
  vitalSigns?: VitalSigns;
}

/** 近期检验摘要 */
export interface RecentLabSummary {
  itemName: string;
  value: string;
  unit: string;
  refRange: string;
  abnormal?: 'high' | 'low' | 'critical';
  reportDate: string;
}

/** 候诊患者 */
export interface WaitingPatient {
  encounterId: string;
  queueNo: number; // 号次
  ticketNo: string; // 挂号单号
  patient: PatientBrief;
  visitType: VisitType;
  registerTime: string; // 挂号时间
  appointmentTime?: string; // 预约时间
  status: QueueStatus;
  doctorName: string;
  deptName: string;
  chiefComplaint?: string; // 预问诊主诉
  waitMinutes: number; // 已等待分钟
}

/* -------------------------------------------------------------------------- */
/*                                 问诊记录                                   */
/* -------------------------------------------------------------------------- */

/** 结构化现病史 */
export interface PresentIllness {
  onsetTime?: string; // 起病时间
  trigger?: string; // 诱因
  mainSymptom?: string; // 主要症状
  accompanying?: string; // 伴随症状
  treatmentProcess?: string; // 诊疗经过
  generalCondition?: string; // 一般情况（饮食/睡眠/二便/体重）
  freeText?: string; // 自由文本补充
}

/** 结构化既往史 */
export interface PastHistory {
  diseases?: string; // 既往疾病
  surgery?: string; // 手术史
  trauma?: string; // 外伤史
  transfusion?: string; // 输血史
  allergy?: string; // 过敏史
  vaccination?: string; // 预防接种史
}

/** 体格检查 */
export interface PhysicalExam {
  vital?: VitalSigns;
  general?: string; // 神志/精神/面容
  skinLymph?: string; // 皮肤黏膜/淋巴结
  headNeck?: string;
  chest?: string;
  abdomen?: string;
  extremities?: string; // 四肢脊柱
  neuro?: string; // 神经系统
  freeText?: string;
}

/** 问诊记录 */
export interface ConsultationRecord {
  encounterId: string;
  chiefComplaint: string;
  presentIllness: PresentIllness;
  pastHistory: PastHistory;
  personalFamilyHistory?: string; // 个人史/家族史
  physicalExam: PhysicalExam;
  auxiliaryExams: AuxExamResult[];
  updatedAt: string;
}

/** 辅助检查结果（已做） */
export interface AuxExamResult {
  id: string;
  name: string;
  date: string;
  conclusion: string;
  reportUrl?: string;
}

/* -------------------------------------------------------------------------- */
/*                                  诊断                                      */
/* -------------------------------------------------------------------------- */

/** ICD-10 诊断编码项 */
export interface IcdDiagnosis {
  code: string; // ICD-10 编码
  name: string; // 诊断名称
  category: string; // 类目（章节/大类）
}

/** 诊断目录项（ICD 检索结果，后端 /catalog/diagnoses） */
export interface DiagnosisCatalog {
  code: string;
  name: string;
  pinyin: string;
  category: string;
}

/** 诊断项 */
export interface DiagnosisItem {
  id: string;
  code: string; // ICD-10
  name: string;
  kind: DiagnosisKind;
  confirmed: boolean;
  note?: string;
}

/** 鉴别诊断建议 */
export interface DifferentialSuggestion {
  name: string;
  code?: string;
  supports: string[]; // 支持点
  opposes: string[]; // 不支持点
  likelihood: 'high' | 'medium' | 'low';
}

/* -------------------------------------------------------------------------- */
/*                                  处方                                      */
/* -------------------------------------------------------------------------- */

/** 药品信息（目录） */
export interface DrugInfo {
  drugId: string;
  genericName: string; // 通用名
  pinyin: string; // 拼音首字母
  spec: string; // 规格
  dosageForm: string; // 剂型
  manufacturer: string; // 厂家
  unit: string; // 计价单位（盒/支/瓶）
  price: number; // 单价（元）
  stock: number; // 库存
  antibiotics: boolean; // 是否抗菌药
  highRisk: boolean; // 是否高危药
  pregnancyCategory?: string; // 妊娠分级
}

/** 处方明细行 */
export interface PrescriptionLine {
  lineId: string;
  drug: DrugInfo;
  dose: number; // 单次剂量
  doseUnit: string; // 剂量单位（mg/g/ml）
  frequency: DrugFrequency;
  route: DrugRoute;
  days: number; // 用药天数
  quantity: number; // 数量
  instruction: string; // 用法说明
  subtotal: number; // 小计
}

/** 处方 */
export interface Prescription {
  prescriptionId: string;
  type: PrescriptionType;
  lines: PrescriptionLine[];
  warnings: PrescriptionWarning[];
  totalFee: number;
  signed: boolean;
  /** 处方流转状态：pending_review / approved / rejected / dispensed 等 */
  status?: string;
  createdAt: string;
}

/** 处方审核提醒 */
export interface PrescriptionWarning {
  level: AISeverity;
  title: string;
  detail: string;
  relatedDrug?: string;
}

/** 处方模板 */
export interface PrescriptionTemplate {
  templateId: string;
  name: string;
  type: PrescriptionType;
  indication: string; // 适用诊断
  lines: Array<{
    drugId: string;
    dose: number;
    doseUnit: string;
    frequency: DrugFrequency;
    route: DrugRoute;
    days: number;
    instruction: string;
  }>;
}

/** BFF 处方模板行视图 */
export interface RxTemplateLineView {
  drugId: string;
  dose: number;
  doseUnit: string;
  frequency: DrugFrequency;
  route: DrugRoute;
  days: number;
  instruction: string;
  quantity: number;
}

/** BFF 处方模板视图（/catalog/templates/prescription 返回） */
export interface RxTemplateView {
  id: string;
  name: string;
  diagnosis: string;
  lines: RxTemplateLineView[];
  counsel: string;
}

/* -------------------------------------------------------------------------- */
/*                                检查检验申请                                  */
/* -------------------------------------------------------------------------- */

/** 检验项目（目录） */
export interface LabTestItem {
  itemId: string;
  name: string;
  code: string;
  pinyin: string;
  specimen: string; // 标本类型
  price: number;
  turnaroundHours: number; // 出报告小时数
  fasting: boolean; // 是否空腹
  note?: string; // 注意事项
  clinicalSignificance?: string;
}

/** 检验套餐 */
export interface LabPanel {
  panelId: string;
  name: string;
  itemIds: string[];
  price: number;
  note?: string;
}

/** 检查项目（影像/功能） */
export interface ImagingItem {
  itemId: string;
  name: string;
  modality: 'CT' | 'MRI' | 'DR' | 'US' | '内镜' | 'ECG' | '其他';
  pinyin: string;
  price: number;
  waitHours: number; // 预计等待
  needsContrast: boolean; // 是否需造影剂
  note?: string;
}

/** 治疗项目 */
export interface TreatmentItem {
  treatmentId: string;
  name: string;
  pinyin: string;
  price: number;
  durationMin: number;
  note?: string;
}

/* ----------------------- BFF 目录 DTO（/catalog/*） ----------------------- */

/** 检验/检查目录项（后端按统一形态返回，多余字段以索引签名承载） */
export interface ExamCatalogItem {
  id: string;
  name: string;
  category: '检验' | '检查';
  price: number;
  /** 检验：标本类型；检查：模态（CT/MRI…） */
  sampleType?: string;
  bodyPart?: string;
  contrast?: boolean;
  clinicalSignificance?: string;
  [key: string]: unknown;
}

/** 治疗目录项（BFF 返回） */
export interface TreatmentCatalogItem {
  id: string;
  name: string;
  category: '治疗';
  price: number;
  description?: string;
}

/** 申请单项 */
export interface OrderItem {
  orderId: string;
  kind: OrderKind;
  catalogId: string; // 目录ID
  name: string;
  bodyPart?: string; // 检查部位
  price: number;
  status: OrderStatus;
  clinicalReason: string; // 临床指征
  note?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  病历                                      */
/* -------------------------------------------------------------------------- */

/** 门诊病历 */
export interface MedicalRecord {
  recordId: string;
  encounterId: string;
  content: RecordContent;
  qualityIssues: RecordQualityIssue[];
  signed: boolean;
  status: 'draft' | 'submitted';
  updatedAt: string;
}

/** 病历结构化内容 */
export interface RecordContent {
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  auxiliaryExam: string;
  diagnosis: string;
  treatment: string; // 处理意见
  healthEducation: string; // 健康宣教
}

/** 病历质控缺陷 */
export interface RecordQualityIssue {
  level: AISeverity;
  field: keyof RecordContent | 'general';
  message: string;
}

/** 病历模板 */
export interface MedicalRecordTemplate {
  templateId: string;
  name: string;
  scope: 'personal' | 'dept' | 'common';
  content: Partial<RecordContent>;
}

/** 病历模板章节（BFF /catalog/templates/record 返回） */
export interface RecordTemplateSection {
  title: string;
  template: string;
}

/** 病历模板 DTO（BFF 返回） */
export interface RecordTemplate {
  id: string;
  name: string;
  sections: Record<string, RecordTemplateSection>;
}

/* -------------------------------------------------------------------------- */
/*                                AI 辅助                                     */
/* -------------------------------------------------------------------------- */

/** AI 智能追问 */
export interface AIQuestion {
  questionId: string;
  question: string;
  reason?: string; // 为何追问
}

/** AI 建议 */
export interface AISuggestion {
  suggestionId: string;
  kind: 'followup' | 'history' | 'diagnosis' | 'exam' | 'medication' | 'cds';
  title: string;
  content: string;
  severity: AISeverity;
  accepted?: boolean;
}

/** AI 对话消息 */
export interface AIChatMessage {
  msgId: string;
  role: 'doctor' | 'ai';
  content: string;
  suggestions?: Array<{ label: string; action?: string }>;
  time: string;
}

/** AI 工具调用过程（SSE agent:tool 事件，供前端透明展示） */
export interface AiToolProcess {
  callId: string;
  toolName: string;
  status: 'running' | 'success' | 'error';
  summary?: string;
}

/* -------------------------------------------------------------------------- */
/*                                转诊会诊                                    */
/* -------------------------------------------------------------------------- */

/** 转诊申请 */
export interface ReferralRequest {
  requestId: string;
  type: ReferralType;
  targetDept?: string;
  targetHospital?: string;
  reason: string;
  summary: string;
  doneStudies: string;
  recommendation: string;
  status: 'draft' | 'submitted' | 'accepted';
  createdAt: string;
}

/** 会诊申请 */
export interface ConsultRequest {
  requestId: string;
  consultType: 'intra_dept' | 'whole_hospital' | 'mdt';
  invitedDepts: string[];
  purpose: string;
  summary: string;
  emergency: ConsultEmergency;
  status: 'draft' | 'submitted' | 'accepted';
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*                                  统计                                      */
/* -------------------------------------------------------------------------- */

/** 门诊工作台统计 */
export interface OutpatientStats {
  todayRegistered: number;
  todayVisited: number;
  todayWaiting: number;
  todayPassed: number;
  avgWaitMinutes: number;
  avgVisitMinutes: number;
  prescriptionCount: number;
  orderCount: number;
  monthVisits: number;
  monthPrescriptions: number;
  monthRecords: number;
  avgPrescriptionFee: number;
}

/* -------------------------------------------------------------------------- */
/*                              Store 视图模型                                 */
/* -------------------------------------------------------------------------- */

/** 号源/医生信息 */
export interface DoctorSession {
  doctorId: string;
  doctorName: string;
  title: string;
  deptName: string;
  room: string;
  todayQuota: number;
  calledQuota: number;
}
