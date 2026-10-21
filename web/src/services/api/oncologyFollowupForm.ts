/**
 * 健澜科技 jlmedaios - 肿瘤随访 API（M537 修正契约，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/oncology/followups?patientId=  权限码 oncology:view
 *   POST /api/v1/oncology/followups              权限码 oncology:followup
 *
 * 后端契约：POST body 仅接受 patientId / tumorType / tnmStage / treatmentPhase /
 * lastTreatmentAt / nextTreatmentAt / cea / ct_score / notes；
 * needsUrgentReview 由后端二次校验（IV 期距下次治疗超 30 天）计算，前端纯函数仅实时预览。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举（英文 key，中文 label 由 LABEL map 映射）                       */
/* ------------------------------------------------------------------ */

export type TumorType = 'lung' | 'breast' | 'colorectal' | 'gastric' | 'liver' | 'other';

export const TUMOR_LABEL: Record<TumorType, string> = {
  lung: '肺癌',
  breast: '乳腺癌',
  colorectal: '结直肠癌',
  gastric: '胃癌',
  liver: '肝癌',
  other: '其他',
};

export const TUMORS: TumorType[] = ['lung', 'breast', 'colorectal', 'gastric', 'liver', 'other'];

export type TnmStage = 'I' | 'II' | 'III' | 'IV';

export const TNM_LABEL: Record<TnmStage, string> = {
  I: 'Ⅰ 期',
  II: 'Ⅱ 期',
  III: 'Ⅲ 期',
  IV: 'Ⅳ 期',
};

export const STAGES: TnmStage[] = ['I', 'II', 'III', 'IV'];

export type TreatmentPhase = 'surgery' | 'chemo' | 'radio' | 'targeted' | 'immunotherapy' | 'palliative';

export const PHASE_LABEL: Record<TreatmentPhase, string> = {
  surgery: '手术',
  chemo: '化疗',
  radio: '放疗',
  targeted: '靶向治疗',
  immunotherapy: '免疫治疗',
  palliative: '姑息治疗',
};

export const PHASES: TreatmentPhase[] = ['surgery', 'chemo', 'radio', 'targeted', 'immunotherapy', 'palliative'];

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

/** IV 期距下次治疗超过 30 天 → 需紧急复核 */
export function isUrgentReview(tnmStage: TnmStage, nextTreatmentAtMs: number): boolean {
  if (tnmStage !== 'IV') return false;
  return Date.now() - nextTreatmentAtMs > 30 * 86_400_000;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface OncologyFollowupRecord {
  id: string;
  patientId: string;
  tumorType: TumorType;
  tnmStage: TnmStage;
  treatmentPhase: TreatmentPhase;
  lastTreatmentAt: string;
  nextTreatmentAt: string;
  cea: number | null;
  ct_score: number | null;
  notes: string | null;
  needsUrgentReview: boolean;
  followedUpAt: string;
  demo?: boolean;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface OncologyFollowupSubmitInput {
  patientId: string;
  patientName?: string;
  tumorType: TumorType;
  tnmStage: TnmStage;
  treatmentPhase: TreatmentPhase;
  lastTreatmentAt: string;
  nextTreatmentAt: string;
  cea: number | null;
  ct_score: number | null;
  notes?: string | null;
  followedUpAt: string;
  signature: string;
  assessorName?: string;
}

export interface OncologyFollowupListResult {
  data: OncologyFollowupRecord[];
  demo: boolean;
}

export interface OncologyFollowupSubmitResult {
  record: OncologyFollowupRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: OncologyFollowupRecord[] = [
  {
    id: 'ONC-DEMO-001',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    tumorType: 'colorectal',
    tnmStage: 'IV',
    treatmentPhase: 'chemo',
    lastTreatmentAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
    nextTreatmentAt: new Date(Date.now() - 35 * 86_400_000).toISOString(),
    cea: 18.6,
    ct_score: 4.2,
    notes: 'FOLFOX+贝伐，周期已超期',
    needsUrgentReview: true,
    followedUpAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'ONC-DEMO-002',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    tumorType: 'breast',
    tnmStage: 'II',
    treatmentPhase: 'surgery',
    lastTreatmentAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
    nextTreatmentAt: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    cea: null,
    ct_score: null,
    notes: '术后定期复查',
    needsUrgentReview: false,
    followedUpAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchOncologyFollowups(patientId?: string): Promise<OncologyFollowupListResult> {
  try {
    const res = await get<OncologyFollowupRecord[]>('/oncology/followups', patientId ? { patientId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  }
}

export async function submitOncologyFollowup(input: OncologyFollowupSubmitInput): Promise<OncologyFollowupSubmitResult> {
  const payload = {
    patientId: input.patientId,
    tumorType: input.tumorType,
    tnmStage: input.tnmStage,
    treatmentPhase: input.treatmentPhase,
    lastTreatmentAt: input.lastTreatmentAt,
    nextTreatmentAt: input.nextTreatmentAt,
    cea: input.cea,
    ct_score: input.ct_score,
    notes: input.notes ?? null,
  };
  try {
    const res = await post<OncologyFollowupRecord>('/oncology/followups', payload);
    const record: OncologyFollowupRecord = {
      ...res,
      patientName: input.patientName,
      followedUpAt: input.followedUpAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const record: OncologyFollowupRecord = {
      id: `ONC-LOCAL-${Date.now().toString().slice(-8)}`,
      patientId: input.patientId,
      patientName: input.patientName,
      tumorType: input.tumorType,
      tnmStage: input.tnmStage,
      treatmentPhase: input.treatmentPhase,
      lastTreatmentAt: input.lastTreatmentAt,
      nextTreatmentAt: input.nextTreatmentAt,
      cea: input.cea,
      ct_score: input.ct_score,
      notes: input.notes ?? null,
      needsUrgentReview: isUrgentReview(input.tnmStage, Date.parse(input.nextTreatmentAt)),
      followedUpAt: input.followedUpAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
