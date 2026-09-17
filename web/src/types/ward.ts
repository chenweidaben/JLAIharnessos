/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 住院查房场景 - 类型定义
 */
import type { Gender } from './common';

// ============ 枚举与基础类型 ============

/** 护理等级：特级 / 一级 / 二级 / 三级 */
export type NursingLevel = 'special' | 'level1' | 'level2' | 'level3';

/** 病情标识：普通 / 病重 / 病危 */
export type ConditionLevel = 'normal' | 'serious' | 'critical';

/** 隔离类型：接触 / 空气 / 飞沫 */
export type IsolationType = 'contact' | 'airborne' | 'droplet';

/** 床位状态：空床 / 在院 / 预出院 / 转入 */
export type BedStatus = 'empty' | 'admitted' | 'pending_discharge' | 'transfer_in';

/** 查房状态：未查 / 查房中 / 已查 */
export type RoundStatus = 'pending' | 'in_progress' | 'finished';

/** 医师层级：住院医师 / 主治医师 / 主任医师 */
export type DoctorLevel = 'resident' | 'attending' | 'chief';

/** 医嘱类型：长期 / 临时 */
export type OrderCategory = 'permanent' | 'temporary';

/** 医嘱子类 */
export type OrderKind = 'drug' | 'exam' | 'lab' | 'treatment' | 'nursing' | 'consultation' | 'diet';

/** 医嘱执行状态 */
export type OrderStatus = 'pending' | 'executing' | 'executed' | 'stopped' | 'reviewing';

/** 手术阶段 */
export type SurgeryStage = 'preop' | 'intraop' | 'postop';

/** 临床路径入径状态 */
export type PathwayStatus = 'on_path' | 'off_path' | 'none';

/** 性别便捷别名（与 common.Gender 对齐） */
export type PatientGender = Gender;

// ============ 患者基础信息（脱敏） ============
export interface WardPatient {
  /** 患者ID */
  id: string;
  /** 姓名（已脱敏） */
  name: string;
  /** 性别 */
  gender: PatientGender;
  /** 年龄 */
  age: number;
  /** 住院号（已脱敏） */
  inpatientNo: string;
  /** 主要诊断 */
  diagnosis: string;
  /** 入院时间 */
  admitTime: string;
  /** 护理等级 */
  nursingLevel: NursingLevel;
  /** 病情等级 */
  condition: ConditionLevel;
  /** 过敏史（药品名称列表） */
  allergies: string[];
  /** 隔离标识 */
  isolation?: IsolationType;
  /** 今日手术 */
  todaySurgery?: string;
  /** 术后第几天（0表示当日） */
  postOpDays?: number;
  /** 临床路径 */
  pathway: PathwayStatus;
  /** 是否欠费 */
  inDebt: boolean;
  /** 入院天数 */
  stayDays: number;
}

// ============ 床位 ============
export interface BedInfo {
  /** 床位ID */
  id: string;
  /** 床号 */
  bedNo: string;
  /** 所属病房号 */
  roomNo: string;
  /** 床位状态 */
  status: BedStatus;
  /** 在院患者（空床为 null） */
  patient: WardPatient | null;
}

export interface RoomGroup {
  /** 病房号 */
  roomNo: string;
  beds: BedInfo[];
}

// ============ 病区信息 ============
export interface WardInfo {
  /** 病区ID */
  id: string;
  /** 病区名称（如：心内科一病区） */
  name: string;
  /** 科室 */
  department: string;
  /** 床位总数 */
  totalBeds: number;
  /** 在院人数 */
  admittedCount: number;
  /** 空床数 */
  emptyBeds: number;
  /** 今日手术数 */
  todaySurgeryCount: number;
  /** 今日出院数 */
  todayDischargeCount: number;
  /** 今日新入院数 */
  todayAdmitCount: number;
  /** 病重人数 */
  seriousCount: number;
  /** 病危人数 */
  criticalCount: number;
  /** 主任/医疗组长 */
  director: string;
  /** 当前管床医生 */
  chargeDoctor: string;
}

// ============ 查房列表 ============
export interface ThirdRoundFlag {
  resident: boolean;
  attending: boolean;
  chief: boolean;
}

export interface RoundPatient {
  patient: WardPatient;
  /** 床号 */
  bedNo: string;
  /** 今日重点提示 */
  focusPoints: string[];
  /** 查房状态 */
  roundStatus: RoundStatus;
  /** 三级查房完成情况 */
  thirdRound: ThirdRoundFlag;
  /** 是否今日新入院 */
  isNewAdmit: boolean;
  /** 是否今日手术 */
  isTodaySurgery: boolean;
  /** 是否待出院 */
  isPendingDischarge: boolean;
  /** 是否重点患者 */
  isKeyPatient: boolean;
}

// ============ 查房记录 ============
export interface VitalsSigns {
  /** 体温 ℃ */
  temperature?: number;
  /** 脉搏 次/分 */
  pulse?: number;
  /** 呼吸 次/分 */
  respiration?: number;
  /** 收缩压 mmHg */
  systolic?: number;
  /** 舒张压 mmHg */
  diastolic?: number;
  /** 血氧饱和度 % */
  spo2?: number;
  /** 测量时间 */
  measureTime?: string;
}

export interface LabResult {
  id: string;
  /** 项目名称 */
  itemName: string;
  /** 结果值 */
  value: string;
  /** 单位 */
  unit?: string;
  /** 参考范围 */
  refRange?: string;
  /** 异常标识 */
  abnormal: 'high' | 'low' | 'critical_high' | 'critical_low' | 'normal';
  /** 报告时间 */
  reportTime: string;
}

export interface ExamReport {
  id: string;
  /** 检查名称 */
  name: string;
  /** 检查部位 */
  bodyPart?: string;
  /** 检查时间 */
  examTime: string;
  /** 主要印象 */
  impression: string;
  /** 是否今日 */
  isToday: boolean;
}

export interface Diagnosis {
  id: string;
  name: string;
  /** 是否主诊断 */
  isPrimary: boolean;
  /** 诊断类型：临床诊断/初步诊断/修正诊断 */
  type: 'clinical' | 'preliminary' | 'revised';
}

export interface RoundRecord {
  /** 记录ID */
  id: string;
  patientId: string;
  bedNo: string;
  /** 主诉 */
  chiefComplaint: string;
  /** 现病史（病情变化） */
  presentIllness: string;
  /** 生命体征 */
  vitals: VitalsSigns;
  /** 一般情况/神志/精神 */
  generalCondition: string;
  /** 心肺腹查体 */
  physicalExam: string;
  /** 专科查体 */
  specialtyExam: string;
  /** 伤口/引流管 */
  woundDrainage: string;
  /** 今日检验结果 */
  todayLabs: LabResult[];
  /** 今日检查报告 */
  todayExams: ExamReport[];
  /** 诊断列表 */
  diagnoses: Diagnosis[];
  /** 病情分析（AI辅助） */
  analysis: string;
  /** 诊疗计划 */
  plan: string;
  /** 护理级别调整 */
  nursingLevelAdjust?: NursingLevel;
  /** 饮食调整 */
  dietAdjust?: string;
  /** 进一步检查建议 */
  furtherExams: string[];
  /** 查房医师层级 */
  doctorLevel: DoctorLevel;
  /** 查房医师姓名 */
  doctorName: string;
  /** 查房时间 */
  roundTime: string;
  /** 是否已签名 */
  signed: boolean;
  /** 病历质控问题 */
  qcWarnings: string[];
}

// ============ 医嘱 ============
export interface OrderItem {
  id: string;
  /** 所属患者ID */
  patientId: string;
  category: OrderCategory;
  kind: OrderKind;
  /** 医嘱内容 */
  content: string;
  /** 药品/项目编码 */
  code?: string;
  /** 剂量 */
  dosage?: string;
  /** 频次 */
  frequency?: string;
  /** 给药途径 */
  route?: string;
  /** 开嘱时间 */
  orderTime: string;
  /** 开嘱医生 */
  doctor: string;
  /** 执行状态 */
  status: OrderStatus;
  /** 开始时间 */
  startTime?: string;
  /** 停止时间 */
  stopTime?: string;
  /** CDS/审核提醒 */
  alerts: OrderAlert[];
}

export interface OrderAlert {
  id: string;
  level: 'error' | 'warning' | 'info';
  type: 'allergy' | 'interaction' | 'dose' | 'duplicate' | 'cds';
  message: string;
}

export interface OrderTemplate {
  id: string;
  name: string;
  kind: OrderKind;
  items: string[];
}

// ============ 病情评估 ============
export type AssessmentType = 'pain' | 'nutrition' | 'pressure_ulcer' | 'fall_risk' | 'dvt' | 'gcs';

export interface PainAssessment {
  /** NRS 0-10 */
  score: number;
  location: string;
  nature: string;
  /** 镇痛措施 */
  analgesia: string;
}

export interface NutritionAssessment {
  /** NRS2002 总分 */
  score: number;
  bmi: number;
  weightLossPct: number;
  intakePct: number;
  severityScore: number;
}

export interface PressureUlcerAssessment {
  /** Braden 总分 */
  score: number;
  perception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  friction: number;
}

export interface FallAssessment {
  /** Morse 总分 */
  score: number;
  fallHistory: number;
  diagnosis: number;
  ambulationAid: number;
  ivTherapy: number;
  gait: number;
  cognition: number;
}

export interface DvtAssessment {
  /** Caprini 总分 */
  score: number;
  factors: string[];
}

export interface GcsAssessment {
  /** 总分 3-15 */
  total: number;
  eye: number;
  verbal: number;
  motor: number;
}

export interface AssessmentRecord {
  id: string;
  patientId: string;
  type: AssessmentType;
  assessTime: string;
  assessor: string;
  /** 结论描述 */
  conclusion: string;
  /** 风险等级 */
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'extreme';
  /** 建议措施 */
  suggestions: string[];
  pain?: PainAssessment;
  nutrition?: NutritionAssessment;
  pressureUlcer?: PressureUlcerAssessment;
  fall?: FallAssessment;
  dvt?: DvtAssessment;
  gcs?: GcsAssessment;
}

// ============ 交接班 ============
export interface HandoverPatient {
  bedNo: string;
  name: string;
  diagnosis: string;
  /** 病情摘要 */
  summary: string;
  /** 异常情况 */
  abnormalNotes: string[];
  /** 待处理事项 */
  pendingTasks: string[];
  /** 注意事项 */
  precautions: string[];
  /** 是否重点交接 */
  key: boolean;
}

export interface HandoverRecord {
  id: string;
  /** 交班时间 */
  handoverTime: string;
  /** 交班人 */
  fromDoctor: string;
  /** 接班人 */
  toDoctor: string;
  /** 交班类别 */
  shift: 'morning' | 'evening' | 'night';
  /** 病区概况 */
  overview: {
    admitted: number;
    newAdmit: number;
    discharge: number;
    surgery: number;
    serious: number;
    critical: number;
  };
  /** 重点患者 */
  patients: HandoverPatient[];
  /** 物品交接 */
  items: string[];
  /** 环境交接 */
  environment: string[];
  /** 未完成事项跟踪 */
  unfinishedTasks: string[];
  /** 交班人签名 */
  fromSigned: boolean;
  /** 接班人签名 */
  toSigned: boolean;
}

// ============ 出院管理 ============
export interface DischargeMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  days: number;
  usage: string;
}

export interface DischargeInfo {
  id: string;
  patientId: string;
  bedNo: string;
  name: string;
  diagnosis: string;
  /** 出院诊断 */
  dischargeDiagnosis: string;
  /** 出院带药 */
  medications: DischargeMedication[];
  /** 出院指导 */
  guidance: string[];
  /** 随访计划 */
  followUp: { time: string; method: string; content: string };
  /** 出院流程状态 */
  process: {
    ordersStopped: boolean;
    recordCompleted: boolean;
    evaluationDone: boolean;
    settled: boolean;
    departed: boolean;
  };
  /** 费用概览（元） */
  totalFee: number;
  /** 医保报销（元） */
  insuranceCovered: number;
}

// ============ 手术管理 ============
export interface SurgeryInfo {
  id: string;
  patientId: string;
  bedNo: string;
  name: string;
  surgeryName: string;
  surgeon: string;
  /** 麻醉方式 */
  anesthesia: string;
  /** 手术室 */
  operatingRoom: string;
  /** 预计开始时间 */
  scheduledTime: string;
  /** 预计时长（分钟） */
  durationMin: number;
  stage: SurgeryStage;
  /** 术前核查项 */
  preopChecks: {
    discussionDone: boolean;
    surgeryConsent: boolean;
    anesthesiaConsent: boolean;
    fasting: boolean;
    bloodPrepared: boolean;
    skinPrepared: boolean;
    preopMeds: boolean;
    timeOut: boolean;
  };
  /** 术后医嘱已下 */
  postOpOrdersDone: boolean;
}

// ============ Store 状态 ============
export interface WardState {
  wardInfo: WardInfo | null;
  roomGroups: RoomGroup[];
  roundList: RoundPatient[];
  currentRoundPatient: RoundPatient | null;
  currentRoundRecord: RoundRecord | null;
  allOrders: OrderItem[];
  assessments: AssessmentRecord[];
  handovers: HandoverRecord[];
  discharges: DischargeInfo[];
  surgeries: SurgeryInfo[];
  loading: boolean;
}
