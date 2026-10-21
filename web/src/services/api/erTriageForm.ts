/**
 * 健澜科技 jlmedaios - 急诊预检分诊 API（M521-H，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/er-triages?visitId=  权限码 er:view
 *   POST /api/v1/er-triages            权限码 er:triage
 *
 * 后端契约：POST body 仅接受 visitId / level / vitals / chiefComplaint；
 * 生命体征异常自动升档提示由前端纯函数兜底（SpO₂<90 / SBP<90 / GCS<9）。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 四级分诊（英文 key，中文 label 与响应时限由 LABEL map 映射）          */
/* ------------------------------------------------------------------ */

export type TriageLevel = 'level1' | 'level2' | 'level3' | 'level4';

export const TRIAGE_LEVEL_LABEL: Record<TriageLevel, string> = {
  level1: 'Ⅰ 濒危',
  level2: 'Ⅱ 危重',
  level3: 'Ⅲ 急症',
  level4: 'Ⅳ 亚急',
};

export const TRIAGE_LEVEL_COLOR: Record<TriageLevel, string> = {
  level1: 'red',
  level2: 'orange',
  level3: 'yellow',
  level4: 'green',
};

export const TRIAGE_RESPONSE_MIN: Record<TriageLevel, string> = {
  level1: '立即抢救',
  level2: '≤10 分钟',
  level3: '≤30 分钟',
  level4: '≤120 分钟',
};

export const TRIAGE_LEVELS: TriageLevel[] = ['level1', 'level2', 'level3', 'level4'];

/* ------------------------------------------------------------------ */
/* 生命体征与自动升档纯函数                                            */
/* ------------------------------------------------------------------ */

export interface TriageVitals {
  temperature: number;
  pulse: number;
  respiration: number;
  sbp: number;
  dbp: number;
  spo2: number;
  gcs: number;
}

/** 任一生命体征异常 → 建议上调分诊级别 */
export function detectVitalAbnormal(v: TriageVitals): string | null {
  if (v.spo2 < 90) return `SpO₂ ${v.spo2}% < 90%`;
  if (v.sbp < 90) return `收缩压 ${v.sbp} mmHg < 90 mmHg`;
  if (v.gcs < 9) return `GCS ${v.gcs} < 9`;
  return null;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface ErTriageRecord {
  id: string;
  visitId: string;
  level: TriageLevel;
  vitals: TriageVitals;
  chiefComplaint: string;
  objective: string | null;
  triagedAt: string;
  nurseSignature: string;
  needsUpgrade: boolean;
  escalateReason: string | null;
  waitArea: string | null;
  demo?: boolean;
  patientId?: string;
  patientName?: string;
}

export interface ErTriageSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  level: TriageLevel;
  vitals: TriageVitals;
  chiefComplaint: string;
  objective?: string;
  triagedAt: string;
  nurseSignature: string;
}

export interface ErTriageListResult {
  data: ErTriageRecord[];
  demo: boolean;
}

export interface ErTriageSubmitResult {
  record: ErTriageRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: ErTriageRecord[] = [
  {
    id: 'TRI-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    level: 'level2',
    vitals: { temperature: 36.8, pulse: 110, respiration: 24, sbp: 96, dbp: 60, spo2: 93, gcs: 14 },
    chiefComplaint: '胸痛 2 小时',
    objective: '心电图 ST 段抬高',
    triagedAt: new Date().toISOString(),
    nurseSignature: '赵护士',
    needsUpgrade: false,
    escalateReason: null,
    waitArea: '抢救室',
    demo: true,
  },
  {
    id: 'TRI-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    level: 'level3',
    vitals: { temperature: 37.2, pulse: 78, respiration: 18, sbp: 132, dbp: 84, spo2: 98, gcs: 15 },
    chiefComplaint: '腹痛 1 天',
    objective: null,
    triagedAt: new Date(Date.now() - 3600_000).toISOString(),
    nurseSignature: '赵护士',
    needsUpgrade: false,
    escalateReason: null,
    waitArea: '急诊候诊区',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchErTriages(visitId?: string): Promise<ErTriageListResult> {
  try {
    const res = await get<ErTriageRecord[]>('/er-triages', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

export async function submitErTriage(input: ErTriageSubmitInput): Promise<ErTriageSubmitResult> {
  const escalateReason = detectVitalAbnormal(input.vitals);
  try {
    const res = await post<ErTriageRecord>('/er-triages', {
      visitId: input.visitId,
      level: input.level,
      vitals: input.vitals,
      chiefComplaint: input.chiefComplaint,
      objective: input.objective,
    });
    const record: ErTriageRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      triagedAt: input.triagedAt,
      nurseSignature: input.nurseSignature,
      needsUpgrade: res.needsUpgrade ?? escalateReason != null,
      escalateReason: res.escalateReason ?? escalateReason,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const record: ErTriageRecord = {
      id: `TRI-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      level: input.level,
      vitals: input.vitals,
      chiefComplaint: input.chiefComplaint,
      objective: input.objective ?? null,
      triagedAt: input.triagedAt,
      nurseSignature: input.nurseSignature,
      needsUpgrade: escalateReason != null,
      escalateReason,
      waitArea: null,
      demo: true,
    };
    return { record, demo: true };
  }
}
