/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊核心事务类型（M1-B1）—— 与真实 BFF（src/bff/routes/emergency.ts）
 * 返回的 DTO 结构一一对应，无 mock 视图模型。
 *
 * 依据：急诊预检分诊专家共识（2018）四级分诊标准；
 *       胸痛中心（D-to-B≤90min）、卒中中心（D-to-CT≤25min / D-to-N≤60min）建设标准。
 */

// ============ 枚举与基础类型 ============

/** 分诊级别：Ⅰ级濒危 / Ⅱ级危重 / Ⅲ级急症 / Ⅳ级非急症 */
export type TriageLevel = 1 | 2 | 3 | 4;

/** 急诊主状态（与 src/emergency/stateMachine.ts 一致） */
export type EmergencyStatus =
  | 'waiting_triage'
  | 'triaged'
  | 'in_treatment'
  | 'resuscitation'
  | 'observation'
  | 'admitted'
  | 'transferred'
  | 'discharged'
  | 'deceased';

/** 意识状态（ACVPU 简化版） */
export type Consciousness = 'alert' | 'verbal' | 'pain' | 'unresponsive';

/** 绿色通道类型 */
export type GreenChannelType = 'chest_pain' | 'stroke' | 'trauma' | 'maternal' | 'neonatal';

/** 绿色通道状态（与 BFF clinical.green_channels.status 对齐） */
export type GreenChannelStatus = 'active' | 'completed' | 'cancelled';

/** 抢救记录状态 */
export type ResusStatus = 'resuscitating' | 'stabilized' | 'transferred_icu' | 'deceased';

/** 留观状态 */
export type ObsStatus = 'observing' | 'stable' | 'worsening' | 'discharged' | 'admitted';

/** 终末转归码 */
export type DispositionCode =
  | 'admitted'
  | 'surgery'
  | 'observation'
  | 'discharged'
  | 'transferred'
  | 'deceased';

// ============ 生命体征 / 评分输入 ============

/** 分诊生命体征（字段均可选，缺失不参与判分） */
export interface EmergencyVitals {
  /** 体温 ℃ */
  temperature?: number | null;
  /** 脉搏 次/分 */
  pulse?: number | null;
  /** 呼吸 次/分 */
  respiration?: number | null;
  /** 收缩压 mmHg */
  systolic?: number | null;
  /** 舒张压 mmHg */
  diastolic?: number | null;
  /** 血氧饱和度 % */
  spo2?: number | null;
  /** 意识状态 */
  consciousness?: Consciousness | null;
  /** 疼痛 NRS 0–10 */
  painScore?: number | null;
  /** 是否吸氧 */
  supplementalO2?: boolean | null;
}

/** GCS 分项 */
export interface GcsComponents {
  eye: number; // 1–4
  verbal: number; // 1–5
  motor: number; // 1–6
}

/** 卒中量表入参（FAST + LAMS） */
export interface StrokeScaleInput {
  fastFace?: boolean | null;
  fastArm?: boolean | null;
  fastSpeech?: boolean | null;
  lamsFace?: number | null;
  lamsArm?: number | null;
  lamsGrip?: number | null;
}

// ============ 分诊台队列 ============

/** 分诊台队列条目（GET /emergency/queue） */
export interface EmergencyQueueItem {
  visitId: string;
  patientId: string;
  triageNo: string;
  patientName: string;
  gender: string;
  /** 年龄展示文本，如 “63岁” */
  age: string;
  chiefComplaint: string | null;
  arriveTime: string;
  triageTime: string | null;
  level: number | null;
  levelLabel: string | null;
  emStatus: EmergencyStatus;
  greenChannelActive: boolean;
  vitals: Record<string, unknown>;
  newsScore: number | null;
  gcsTotal: number | null;
  /** 已等待/已耗时（分钟） */
  waitMinutes: number;
  /** 响应截止时间 */
  deadline: string | null;
  /** 距响应截止剩余分钟（负为超时） */
  remainingMinutes: number | null;
  overdue: boolean;
}

// ============ 统计 / 元数据 ============

/** 当日急诊统计（GET /emergency/stats） */
export interface EmergencyStatsDto {
  activeCount: number;
  waitingCount: number;
  resusCount: number;
  obsCount: number;
  greenChannelCount: number;
  levelCounts: Record<number, number>;
  dispositionCounts: Record<string, number>;
}

/** 通道类型元数据（GET /emergency/channel-types） */
export interface ChannelTypeDto {
  type: GreenChannelType;
  name: string;
  subtypes: string[];
}

// ============ 接诊 ============

/** 新患者建档输入 */
export interface NewPatientInput {
  nameMasked: string;
  gender?: '男' | '女' | '未知' | '未说明';
  birthDate?: string | null;
  mrn?: string;
  bloodType?: string | null;
  allergies?: Array<Record<string, unknown>>;
  tags?: string[];
}

/** 接诊入参（POST /emergency/arrivals） */
export interface ArrivalInput {
  patientId?: string;
  newPatient?: NewPatientInput;
  chiefComplaint?: string;
  arriveTime?: string;
  campusId?: string;
}

/** 急诊分诊记录（clinical.emergency_triage） */
export interface EmergencyTriageDto {
  id: string;
  triageNo: string;
  visitId: string;
  patientId: string;
  triageNurseId: string | null;
  arriveTime: string;
  triageTime: string | null;
  chiefComplaint: string | null;
  vitals: Record<string, unknown>;
  gcsEye: number | null;
  gcsVerbal: number | null;
  gcsMotor: number | null;
  gcsTotal: number | null;
  newsScore: number | null;
  strokeScale: Record<string, unknown>;
  level: number | null;
  ruleSuggestedLevel: number | null;
  aiSuggestedLevel: number | null;
  aiAdvice: Record<string, unknown>;
  vitalScore: number | null;
  complaintScore: number | null;
  totalScore: number | null;
  basis: string | null;
  confirmed: boolean;
  greenChannelActive: boolean;
  emStatus: EmergencyStatus;
  createdAt: string;
  updatedAt: string;
}

/** 接诊结果 */
export interface ArrivalResult {
  triage: EmergencyTriageDto;
}

// ============ 分诊分级 ============

/** 分诊分级提交载荷（POST /emergency/triage/:visitId） */
export interface TriageFormPayload {
  vitals: EmergencyVitals;
  gcs?: GcsComponents | null;
  stroke?: StrokeScaleInput | null;
  chiefComplaint?: string | null;
  cardiacArrest?: boolean | null;
  catastrophe?: boolean | null;
  /** 护士最终确认级别 */
  level: TriageLevel;
  basis?: string;
  aiSuggestedLevel?: TriageLevel | null;
  aiAdvice?: Record<string, unknown> | null;
}

/** 客观评分（只读展示用，字段保持宽松） */
export interface TriageAssessmentDto {
  news: { score: number; risk: 'low' | 'medium' | 'high'; breakdown: Record<string, number> };
  gcs: { total: number; eye: number; verbal: number; motor: number } | null;
  fast: { face: boolean; arm: boolean; speech: boolean; positive: boolean };
  lams: { total: number; lvoLikelihood: 'high' | 'possible' | 'low' };
  rule: { level: TriageLevel; objectiveReasons: string[] };
  vitalScore: number;
  complaintScore: number;
  totalScore: number;
}

/** 分诊分级结果 */
export interface TriageResult {
  triage: EmergencyTriageDto;
  assessment: TriageAssessmentDto;
}

/** AI 辅助分诊建议（POST /emergency/triage/:visitId/ai-advice） */
export interface AiTriageAdviceDto {
  source: 'deepseek' | 'rule_fallback';
  suggestedLevel: TriageLevel;
  advice: {
    immediate: string;
    workup: string;
    differential: string;
    risk: string;
  };
}

// ============ 绿色通道 ============

/** 绿色通道时间节点 */
export interface GreenChannelNodeDto {
  id: string;
  channelId: string;
  nodeKey: string;
  label: string;
  targetMinutes: number | null;
  actualTime: string | null;
  sortOrder: number;
  overdue: boolean;
}

/** 绿色通道（clinical.green_channels） */
export interface GreenChannelDto {
  id: string;
  channelNo: string;
  visitId: string;
  patientId: string;
  type: GreenChannelType;
  subtype: string;
  status: GreenChannelStatus;
  arriveTime: string;
  activateTime: string;
  endTime: string | null;
  notifiedTeams: string[];
  dbnMinutes: number | null;
  dctMinutes: number | null;
  dntMinutes: number | null;
  outcome: string | null;
  qualityNote: string | null;
  nodes: GreenChannelNodeDto[];
  createdAt: string;
  updatedAt: string;
}

// ============ 抢救 ============

/** 抢救时间轴事件 */
export interface ResusEventDto {
  time: string;
  type: string;
  content: string;
  operator?: string;
}

/** 抢救用药 */
export interface ResusMedicationDto {
  name: string;
  dose: string;
  route?: string;
  time: string;
}

/** 生命体征趋势点（运行时用 pulse/systolic；历史种子行用 hr/bp_s，均如实读取） */
export interface VitalPointDto {
  time: string;
  pulse?: number;
  systolic?: number;
  /** 历史种子行的心率键 */
  hr?: number;
  /** 历史种子行的收缩压键 */
  bp_s?: number;
  spo2?: number;
  respiration?: number;
}

/** 抢救记录（clinical.resuscitations） */
export interface ResuscitationDto {
  id: string;
  resusNo: string;
  visitId: string;
  patientId: string;
  bedNo: string | null;
  bedId: string | null;
  startTime: string;
  endTime: string | null;
  diagnosis: string | null;
  leadDoctorId: string | null;
  leadNurseId: string | null;
  status: ResusStatus;
  events: ResusEventDto[];
  vitalTrend: VitalPointDto[];
  medications: ResusMedicationDto[];
  /** 抢救团队成员姓名 */
  team: string[];
  outcome: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ 留观 ============

/** 留观待办（新记录用 id/content；历史种子行用 task，如实兼容） */
export interface ObsTaskDto {
  id?: string;
  content?: string;
  /** 历史种子行的待办文本键 */
  task?: string;
  done: boolean;
  dueTime?: string;
}

/** 留观记录（clinical.observations） */
export interface ObservationDto {
  id: string;
  obsNo: string;
  visitId: string;
  patientId: string;
  bedNo: string | null;
  startTime: string;
  endTime: string | null;
  diagnosis: string | null;
  nursingLevel: string;
  vitals: Record<string, unknown>;
  ivStatus: string | null;
  pendingTasks: ObsTaskDto[];
  status: ObsStatus;
  expectedOutcome: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============ 转归 ============

/** 终末转归记录（clinical.emergency_dispositions） */
export interface DispositionDto {
  id: string;
  visitId: string;
  patientId: string;
  disposition: DispositionCode;
  destination: string | null;
  wardId: string | null;
  bedId: string | null;
  remark: string | null;
  operatorId: string | null;
  dispositionTime: string;
  createdAt: string;
}

// ============ 健康探针 ============

/** BFF 健康探针（GET /system/health） */
export interface EmergencyHealth {
  status: string;
  version?: string;
  demoMode: boolean;
  db: 'up' | 'down' | 'skipped';
}
