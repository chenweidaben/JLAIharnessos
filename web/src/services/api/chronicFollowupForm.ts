/**
 * 健澜科技 jlmedaios - 慢病随访 API（M535，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/chronic/followups?patientId=  权限码 chronic:view
 *   POST /api/v1/chronic/followups              权限码 chronic:followup
 *
 * 后端契约：POST body 仅接受 patientId / diseaseCode / 体征 / medicationAdherence / nextFollowUpAt；
 * uncontrolled 与 needsPhysicianReview 由后端按病种二次判定（前端纯函数仅用于实时预览）。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 疾病类型与服药依从性（英文 key，中文 label 由 LABEL map 映射）         */
/* ------------------------------------------------------------------ */

export type DiseaseCode = 'hypertension' | 'diabetes' | 'coronary' | 'copd' | 'stroke';

export const DISEASE_LABEL: Record<DiseaseCode, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  coronary: '冠心病',
  copd: '慢阻肺',
  stroke: '脑卒中',
};

export const DISEASES: DiseaseCode[] = ['hypertension', 'diabetes', 'coronary', 'copd', 'stroke'];

export type Adherence = 'yes' | 'partial' | 'no';

export const ADHERENCE_LABEL: Record<Adherence, string> = {
  yes: '规律服药',
  partial: '间断服药',
  no: '未服药',
};

export const ADHERENCES: Adherence[] = ['yes', 'partial', 'no'];

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

export function isUncontrolled(
  diseaseCode: DiseaseCode,
  sbp: number,
  dbp: number,
  ach1c: number | null,
  adherence: Adherence,
): boolean {
  if (diseaseCode === 'hypertension') return sbp >= 180 || dbp >= 110;
  if (diseaseCode === 'diabetes') return ach1c != null && ach1c > 9;
  return adherence === 'no';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface ChronicFollowupRecord {
  id: string;
  patientId: string;
  diseaseCode: DiseaseCode;
  sbp: number;
  dbp: number;
  heartRate: number;
  weight: number;
  bmi: number;
  ach1c: number | null;
  fastingGlucose: number | null;
  medicationAdherence: Adherence;
  uncontrolled: boolean;
  needsPhysicianReview: boolean;
  nextFollowUpAt: string;
  notes: string | null;
  followedUpAt: string;
  demo?: boolean;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface ChronicFollowupSubmitInput {
  patientId: string;
  patientName?: string;
  diseaseCode: DiseaseCode;
  sbp: number;
  dbp: number;
  heartRate: number;
  weight: number;
  bmi: number;
  ach1c: number | null;
  fastingGlucose: number | null;
  medicationAdherence: Adherence;
  nextFollowUpAt: string;
  notes?: string | null;
  followedUpAt: string;
  signature: string;
  assessorName?: string;
}

export interface ChronicFollowupListResult {
  data: ChronicFollowupRecord[];
  demo: boolean;
}

export interface ChronicFollowupSubmitResult {
  record: ChronicFollowupRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: ChronicFollowupRecord[] = [
  {
    id: 'CFU-DEMO-001',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    diseaseCode: 'hypertension',
    sbp: 185, dbp: 112, heartRate: 88, weight: 78, bmi: 26.4,
    ach1c: null, fastingGlucose: null, medicationAdherence: 'partial',
    uncontrolled: true, needsPhysicianReview: true,
    nextFollowUpAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    notes: '血压未达标，建议调整降压方案',
    followedUpAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'CFU-DEMO-002',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    diseaseCode: 'coronary',
    sbp: 126, dbp: 76, heartRate: 70, weight: 68, bmi: 22.8,
    ach1c: 5.8, fastingGlucose: 5.6, medicationAdherence: 'yes',
    uncontrolled: false, needsPhysicianReview: false,
    nextFollowUpAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    notes: '无心绞痛发作',
    followedUpAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchChronicFollowups(patientId?: string): Promise<ChronicFollowupListResult> {
  try {
    const res = await get<ChronicFollowupRecord[]>('/chronic/followups', patientId ? { patientId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  }
}

export async function submitChronicFollowup(input: ChronicFollowupSubmitInput): Promise<ChronicFollowupSubmitResult> {
  const payload = {
    patientId: input.patientId,
    diseaseCode: input.diseaseCode,
    sbp: input.sbp,
    dbp: input.dbp,
    heartRate: input.heartRate,
    weight: input.weight,
    bmi: input.bmi,
    ach1c: input.ach1c,
    fastingGlucose: input.fastingGlucose,
    medicationAdherence: input.medicationAdherence,
    nextFollowUpAt: input.nextFollowUpAt,
    notes: input.notes ?? null,
  };
  try {
    const res = await post<ChronicFollowupRecord>('/chronic/followups', payload);
    const record: ChronicFollowupRecord = {
      ...res,
      patientName: input.patientName,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const uncontrolled = isUncontrolled(input.diseaseCode, input.sbp, input.dbp, input.ach1c, input.medicationAdherence);
    const record: ChronicFollowupRecord = {
      id: `CFU-LOCAL-${Date.now().toString().slice(-8)}`,
      patientId: input.patientId,
      patientName: input.patientName,
      diseaseCode: input.diseaseCode,
      sbp: input.sbp,
      dbp: input.dbp,
      heartRate: input.heartRate,
      weight: input.weight,
      bmi: input.bmi,
      ach1c: input.ach1c,
      fastingGlucose: input.fastingGlucose,
      medicationAdherence: input.medicationAdherence,
      uncontrolled,
      needsPhysicianReview: uncontrolled,
      nextFollowUpAt: input.nextFollowUpAt,
      notes: input.notes ?? null,
      followedUpAt: input.followedUpAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
