/**
 * 健澜科技 jlmedaios - AI 移动护理（PDA 执行端）类型（M16-A）
 *
 * 与 BFF 移动护理聚合器（/m/*）DTO 一一对应；真实模式下全部读写 PostgreSQL。
 * 本文件不包含任何 mock 视图模型；BFF/数据库不可用时由 store 显式报错，不假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type { NursingLevel, RiskLevel } from './care';

/* ============================== 床旁看板 ============================== */

/** 床旁看板单条在院患者（按病区聚合，含待办数与最新风险标记）。 */
export interface BedBoardPatient {
  visitId: string;
  patientId: string;
  visitNo: string;
  bedNo: string;
  patientName: string;
  gender?: string | null;
  age?: number | null;
  diagnosis?: string | null;
  nursingLevel: NursingLevel;
  pressureSoreRisk: RiskLevel;
  fallRisk: RiskLevel;
  pendingTaskCount: number;
}

/** GET /m/bed-board 返回。 */
export interface BedBoardView {
  deptCode: string;
  deptName: string;
  patients: BedBoardPatient[];
}

/* ============================== 扫码 ============================== */

export type BarcodeKind = 'wristband' | 'specimen' | 'drug' | 'unknown';

/** POST /m/scan 返回：解析后的业务对象。 */
export interface ScanResult {
  kind: BarcodeKind;
  raw: string;
  /** kind=wristband 时命中的在院就诊。 */
  visitId?: string | null;
  visitNo?: string | null;
  bedNo?: string | null;
  patientName?: string | null;
  /** kind=specimen 时命中的标本。 */
  specimenNo?: string | null;
  /** kind=drug 时按 visit+drugCode 命中的活动药品医嘱。 */
  orderId?: string | null;
  drugCode?: string | null;
  drugName?: string | null;
  dose?: string | null;
  requiresDoubleCheck?: boolean;
  message?: string | null;
}

/* ============================== 五重核对 ============================== */

/** 单项核对结果。 */
export interface FiveRightsItem {
  ok: boolean;
  expected: string;
  actual: string;
}

/** verifyFiveRights / POST /m/orders/:id/verify 返回。 */
export interface FiveRightsResult {
  bed: FiveRightsItem;
  patient: FiveRightsItem;
  drug: FiveRightsItem;
  dose: FiveRightsItem;
  time: FiveRightsItem;
  allOk: boolean;
  mismatches: string[];
}

/** POST /m/orders/:id/administer 请求体（含床旁扫码采集到的核对信息）。 */
export interface BedsideAdministerPayload {
  scannedBedNo?: string;
  scannedPatientName?: string;
  scannedDrugCode?: string;
  dose?: string;
  slot?: string;
  /** 高风险药双人核对：核对护士工号/姓名。 */
  checkedBy?: string | null;
  note?: string;
  idempotencyKey?: string;
}

/* ============================== 体征采集 ============================== */

/** POST /m/vitals 请求体。 */
export interface VitalsCapturePayload {
  visitId: string;
  temperature?: number | null;
  pulse?: number | null;
  respiration?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  spo2?: number | null;
  bloodGlucose?: number | null;
  note?: string;
}

/* ============================== 床旁任务 ============================== */

/** POST /m/tasks/:id/execute 请求体。 */
export interface BedsideTaskExecutePayload {
  result?: string;
}

/* ============================== 评估量表 ============================== */

export type AssessmentScale = 'braden' | 'morse' | 'barthel' | 'pain' | 'nutrition';

/** POST /m/assessments 请求体：纯函数评分后落护理记录。 */
export interface AssessmentSavePayload {
  visitId: string;
  scale: AssessmentScale;
  answers: Record<string, number>;
  score: number;
  level: string;
}

/* ============================== 床旁护理记录 ============================== */

/** POST /m/records 请求体：快捷模板 / 语音录入文本，护士本人签名生效。 */
export interface BedsideRecordPayload {
  visitId: string;
  measures: string;
  templateCode?: string | null;
  aiAssisted?: boolean;
  voiceTranscript?: string | null;
}

/* ============================== SBAR 交班 ============================== */

/** POST /m/sbar/sign 请求体。 */
export interface SbarSignPayload {
  deptCode: string;
  shift: 'day' | 'night';
  sections: SbarSections;
}

/** SBAR 四段（纯结构化，不杜撰）。 */
export interface SbarSections {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

/** GET /m/sbar 返回：聚合本班信息生成的交班草稿（未签名）。 */
export interface SbarDraft {
  deptCode: string;
  deptName: string;
  shift: 'day' | 'night';
  sections: SbarSections;
  /** 本班待办/风险/生命体征等原始聚合项，供护士核对（只读）。 */
  items: string[];
}
