/**
 * 健澜科技 jlmedaios - 智能预问诊 API（M540，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/smart-triages?patientId=  权限码 triage:view
 *   POST /api/v1/smart-triages             权限码 triage:smart
 *
 * 后端契约：POST body 仅接受 patientId / age / gender / chiefComplaint /
 * vitals{temperature,pulse,sbp,dbp,spo2,gcs} / symptoms[]；
 * triageLevel / recommendedDeptCode / waitArea / needsUpgrade 由后端规则引擎二次计算，
 * 前端纯函数仅实时预览。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * 注意：本文件为 M540 独立新模块，与旧 smartTriageStore.ts 互不覆盖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举（英文 key，中文 label 由 LABEL map 映射）                       */
/* ------------------------------------------------------------------ */

export type TriageLevel = 1 | 2 | 3 | 4;
export type WaitArea = 'resuscitation' | 'waiting' | 'observation';

export const LEVEL_LABEL: Record<TriageLevel, string> = {
  1: 'Ⅰ 级 濒危',
  2: 'Ⅱ 级 危重',
  3: 'Ⅲ 级 紧急',
  4: 'Ⅳ 级 轻症',
};

export const LEVEL_COLOR: Record<TriageLevel, string> = {
  1: 'darkred',
  2: 'red',
  3: 'orange',
  4: 'green',
};

export const WAIT_AREA_LABEL: Record<WaitArea, string> = {
  resuscitation: '抢救室',
  waiting: '急诊候诊区',
  observation: '留观区',
};

export const DEPT_LABEL: Record<string, string> = {
  cardiology: '心内科',
  gastroenterology: '消化内科',
  internal: '内科',
  emergency: '急诊科',
};

export interface SmartVitals {
  temperature: number;
  pulse: number;
  sbp: number;
  dbp: number;
  spo2: number;
  gcs: number;
}

export const SYMPTOM_OPTIONS: { value: string; label: string }[] = [
  { value: 'chest_pain', label: '胸痛' },
  { value: 'dyspnea', label: '呼吸困难' },
  { value: 'abdominal_pain', label: '腹痛' },
  { value: 'fracture', label: '骨折/外伤' },
  { value: 'fever', label: '发热' },
  { value: 'consciousness_disturbance', label: '意识障碍' },
  { value: 'cold', label: '感冒' },
  { value: 'cough', label: '咳嗽' },
  { value: 'diarrhea', label: '腹泻' },
];

/* ------------------------------------------------------------------ */
/* 纯函数规则引擎（与后端冻结对齐，用于页面实时预览）                     */
/* ------------------------------------------------------------------ */

const ACUTE_SYMPTOMS = new Set(['chest_pain', 'abdominal_pain', 'fracture', 'trauma', 'dyspnea', 'consciousness_disturbance']);
const MILD_SYMPTOMS = new Set(['cold', 'cough', 'diarrhea', 'mild_fever']);

export function runRuleEngine(vitals: SmartVitals, symptoms: string[]): TriageLevel {
  if (vitals.spo2 < 90 || vitals.gcs < 9 || vitals.sbp < 90) return 1;
  if (vitals.temperature >= 39 || vitals.pulse >= 120) return 2;
  const hasMild = symptoms.some((s) => MILD_SYMPTOMS.has(s));
  const hasAcute = symptoms.some((s) => ACUTE_SYMPTOMS.has(s));
  if (hasMild && !hasAcute) return 4;
  return 3;
}

export function waitAreaOf(level: TriageLevel): WaitArea {
  if (level === 1 || level === 2) return 'resuscitation';
  if (level === 3) return 'waiting';
  return 'observation';
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface SmartTriageRecord {
  id: string;
  patientId: string;
  age: number;
  gender: 'male' | 'female';
  chiefComplaint: string;
  vitals: SmartVitals;
  symptoms: string[];
  triageLevel: TriageLevel;
  recommendedDeptCode: string;
  waitArea: WaitArea;
  needsUpgrade: boolean;
  triagedAt: string;
  demo?: boolean;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface SmartTriageSubmitInput {
  patientId: string;
  patientName?: string;
  age: number;
  gender: 'male' | 'female';
  chiefComplaint: string;
  vitals: SmartVitals;
  symptoms: string[];
  triagedAt: string;
  signature: string;
  assessorName?: string;
}

export interface SmartTriageListResult {
  data: SmartTriageRecord[];
  demo: boolean;
}

export interface SmartTriageSubmitResult {
  record: SmartTriageRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: SmartTriageRecord[] = [
  {
    id: 'ST-DEMO-001',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    age: 68,
    gender: 'male',
    chiefComplaint: 'dyspnea',
    vitals: { temperature: 36.8, pulse: 102, sbp: 130, dbp: 82, spo2: 85, gcs: 15 },
    symptoms: ['dyspnea', 'chest_pain'],
    triageLevel: 1,
    recommendedDeptCode: 'cardiology',
    waitArea: 'resuscitation',
    needsUpgrade: true,
    triagedAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'ST-DEMO-002',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    age: 25,
    gender: 'female',
    chiefComplaint: 'cold',
    vitals: { temperature: 36.9, pulse: 76, sbp: 118, dbp: 72, spo2: 99, gcs: 15 },
    symptoms: ['cold', 'cough'],
    triageLevel: 4,
    recommendedDeptCode: 'emergency',
    waitArea: 'observation',
    needsUpgrade: false,
    triagedAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchSmartTriages(patientId?: string): Promise<SmartTriageListResult> {
  try {
    const res = await get<SmartTriageRecord[]>('/smart-triages', patientId ? { patientId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  }
}

export async function submitSmartTriage(input: SmartTriageSubmitInput): Promise<SmartTriageSubmitResult> {
  const payload = {
    patientId: input.patientId,
    age: input.age,
    gender: input.gender,
    chiefComplaint: input.chiefComplaint,
    vitals: input.vitals,
    symptoms: input.symptoms,
  };
  try {
    const res = await post<SmartTriageRecord>('/smart-triages', payload);
    const record: SmartTriageRecord = {
      ...res,
      patientName: input.patientName,
      triagedAt: input.triagedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const level = runRuleEngine(input.vitals, input.symptoms);
    const record: SmartTriageRecord = {
      id: `ST-LOCAL-${Date.now().toString().slice(-8)}`,
      patientId: input.patientId,
      patientName: input.patientName,
      age: input.age,
      gender: input.gender,
      chiefComplaint: input.chiefComplaint,
      vitals: input.vitals,
      symptoms: input.symptoms,
      triageLevel: level,
      recommendedDeptCode: 'emergency',
      waitArea: waitAreaOf(level),
      needsUpgrade: level === 1 || level === 2,
      triagedAt: input.triagedAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
