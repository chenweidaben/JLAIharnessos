/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊场景 - 类型定义
 * 依据：急诊预检分诊专家共识（2018）四级分诊标准；
 *       胸痛中心（D-to-B<90min）、卒中中心（D-to-CT<25min / D-to-N<60min）建设标准
 */
import type { Gender } from './common';

// ============ 枚举与基础类型 ============

/** 分诊级别：Ⅰ级濒危 / Ⅱ级危重 / Ⅲ级急症 / Ⅳ级非急症 */
export type TriageLevel = 1 | 2 | 3 | 4;

/** 分诊状态：待分诊 / 已分诊待诊 / 就诊中 / 抢救 / 留观 / 离院 */
export type TriageStatus =
  'waiting_triage' | 'triaged' | 'in_treatment' | 'resuscitation' | 'observation' | 'discharged';

/** 意识状态（GCS 简化版） */
export type Consciousness = 'alert' | 'verbal' | 'pain' | 'unresponsive';

/** 绿色通道类型 */
export type GreenChannelType = 'chest_pain' | 'stroke' | 'trauma' | 'maternal' | 'neonatal';

/** 抢救床位状态 */
export type ResusStatus = 'resuscitating' | 'stabilized' | 'transferred_icu' | 'deceased' | 'empty';

/** 留观患者状态 */
export type ObsStatus = 'stable' | 'observing' | 'worsening' | 'discharged' | 'admitted';

// ============ 生命体征 ============
export interface Vitals {
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
  /** 意识状态 */
  consciousness?: Consciousness;
  /** 疼痛评分 NRS 0-10 */
  painScore?: number;
  /** 测量时间 ISO 字符串 */
  measureTime?: string;
}

// ============ 分诊患者（候诊队列） ============
export interface TriagePatient {
  /** 患者ID */
  id: string;
  /** 姓名（已脱敏） */
  name: string;
  /** 性别 */
  gender: Gender;
  /** 年龄 */
  age: number;
  /** 急诊就诊号（已脱敏） */
  visitNo: string;
  /** 主诉 */
  chiefComplaint: string;
  /** 分诊级别（null 表示尚未分诊） */
  level: TriageLevel | null;
  /** 分诊状态 */
  status: TriageStatus;
  /** 生命体征 */
  vitals: Vitals;
  /** 到达急诊时间 */
  arriveTime: string;
  /** 分诊时间 */
  triageTime?: string;
  /** 已等待分钟数 */
  waitingMinutes: number;
  /** 绿色通道类型（激活后填充） */
  greenChannelType?: GreenChannelType;
  /** 是否激活绿色通道 */
  greenChannelActive: boolean;
  /** 过敏史 */
  allergyHistory: string[];
  /** 既往史 */
  pastHistory: string;
  /** 用药史 */
  medicationHistory: string;
}

// ============ 四级分诊 ============
/** AI 辅助分诊建议 */
export interface AITriageAdvice {
  /** 建议分诊级别 */
  suggestedLevel: TriageLevel;
  /** 需立即处理的情况 */
  immediateActions: string[];
  /** 鉴别诊断建议 */
  differentialDx: string[];
  /** 必要检查建议 */
  suggestedExams: string[];
}

/** 分诊记录 */
export interface TriageRecord {
  /** 记录ID */
  id: string;
  patientId: string;
  /** 到达时间 */
  arriveTime: string;
  /** 分诊时间 */
  triageTime: string;
  /** 主诉 */
  chiefComplaint: string;
  /** 生命体征 */
  vitals: Vitals;
  /** 过敏史 */
  allergyHistory: string[];
  /** 既往史 */
  pastHistory: string;
  /** 用药史 */
  medicationHistory: string;
  /** 疼痛评分 NRS */
  painScore: number;
  /** 最终分诊级别（护士确认） */
  level: TriageLevel;
  /** 分诊依据 */
  basis: string;
  /** 分诊护士 */
  nurseName: string;
  /** 生命体征评分 */
  vitalScore: number;
  /** 主诉评分 */
  complaintScore: number;
  /** 综合评分 */
  totalScore: number;
  /** AI 建议 */
  aiAdvice: AITriageAdvice;
  /** 护士是否确认 */
  confirmed: boolean;
}

// ============ 绿色通道 ============
export interface GCTimelineNode {
  key: string;
  label: string;
  /** 实际完成时间 */
  time?: string;
  /** 自到达起目标分钟数 */
  targetMinutes?: number;
  /** 是否超时 */
  overdue: boolean;
  /** 是否完成 */
  done: boolean;
}

export interface GreenChannel {
  id: string;
  patientId: string;
  patientName: string;
  /** 类型 */
  type: GreenChannelType;
  /** 亚型（STEMI / 急性缺血性卒中 …） */
  subtype: string;
  status: 'active' | 'completed';
  /** 到达急诊时间 */
  arriveTime: string;
  /** 激活时间 */
  activateTime: string;
  /** 关闭/完成时间 */
  endTime?: string;
  /** 时间轴节点 */
  nodes: GCTimelineNode[];
  /** 已通知团队 */
  notifiedTeams: string[];
  /** 入门-球囊（分钟） */
  dbnMinutes?: number;
  /** 入门-CT（分钟） */
  dctMinutes?: number;
  /** 入门-溶栓（分钟） */
  dntMinutes?: number;
  /** 转归 */
  outcome?: string;
  /** 质量评估 */
  qualityNote?: string;
}

// ============ 抢救室 ============
export interface ResusDevice {
  name: string;
  status: 'running' | 'standby' | 'alarm';
  detail?: string;
}

export interface ResusBed {
  id: string;
  bedNo: string;
  status: ResusStatus;
  patient?: { id: string; name: string; gender: Gender; age: number; diagnosis: string };
  startTime?: string;
  durationMin?: number;
  doctor?: string;
  nurse?: string;
  /** 危急值标识 */
  criticalValue?: string;
  devices: ResusDevice[];
}

export interface ResusTimelineEvent {
  time: string;
  category: 'vitals' | 'medication' | 'procedure' | 'exam' | 'consult' | 'evaluation';
  content: string;
  operator?: string;
}

export interface ResusVitalPoint {
  time: string;
  heartRate: number;
  systolic: number;
  spo2: number;
}

export interface ResusRecord {
  bedId: string;
  bedNo: string;
  patientName: string;
  startTime: string;
  endTime?: string;
  events: ResusTimelineEvent[];
  vitalTrend: ResusVitalPoint[];
  medications: { drug: string; dose: string; route: string; time: string }[];
  team: { role: string; name: string }[];
  outcome?: string;
  summary?: string;
}

// ============ 留观 ============
export interface ObservationPatient {
  id: string;
  bedNo: string;
  name: string;
  gender: Gender;
  age: number;
  diagnosis: string;
  /** 留观开始时间 */
  obsTime: string;
  /** 已留观分钟数 */
  stayMinutes: number;
  status: ObsStatus;
  /** 护理等级 */
  nursingLevel: string;
  /** 最近生命体征 */
  vitals: Vitals;
  /** 输液/治疗状态 */
  ivStatus?: string;
  /** 待处理事项 */
  pendingTasks: string[];
  /** 预计转归 */
  expectedOutcome?: string;
}

// ============ 急诊统计 ============
export interface EmergencyQualityItem {
  name: string;
  /** 实际值（0-1） */
  value: number;
  /** 目标值（0-1） */
  target: number;
}

export interface EmergencyStats {
  today: {
    total: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    resusCount: number;
    resusSuccessRate: number;
    observationCount: number;
    dischargedToday: number;
    admittedToday: number;
    greenChannelCount: number;
    avgWaitMinutes: number;
    avgVisitMinutes: number;
  };
  trend7d: { date: string; count: number }[];
  levelDistribution: { name: string; value: number }[];
  diseaseTop10: { name: string; value: number }[];
  /** 星期(0-6) × 小时(0-23) 就诊量热力图 */
  heatmap: { day: string; hour: number; value: number }[];
  waitTrend: { time: string; wait: number }[];
  resusSuccessTrend: { month: string; rate: number }[];
  quality: EmergencyQualityItem[];
}

// ============ 急诊病历 ============
export interface EmergencyRecord {
  id: string;
  patientId: string;
  patientName: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  allergyHistory: string;
  personalHistory: string;
  familyHistory: string;
  vitals: Vitals;
  physicalExam: string;
  labs: string[];
  exams: string[];
  diagnoses: string[];
  treatments: string[];
  noticeGiven: boolean;
  doctorName: string;
  recordTime: string;
  signed: boolean;
  qcWarnings: string[];
}

// ============ Store 状态 ============
export interface EmergencyState {
  /** 分诊队列 */
  triageQueue: TriagePatient[];
  /** 当前分诊患者 */
  currentPatient: TriagePatient | null;
  /** 当前分诊记录 */
  triageRecord: TriageRecord | null;
  /** 分诊历史 */
  triageHistory: TriageRecord[];
  /** 抢救床位 */
  resuscitationBeds: ResusBed[];
  /** 抢救记录（按床位ID） */
  resuscitationRecords: Record<string, ResusRecord>;
  /** 留观患者 */
  observationPatients: ObservationPatient[];
  /** 绿色通道 */
  greenChannels: GreenChannel[];
  /** 急诊统计 */
  emergencyStats: EmergencyStats | null;
  /** 当前急诊病历 */
  currentRecord: EmergencyRecord | null;
  loading: boolean;
}
