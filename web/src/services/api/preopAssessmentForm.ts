/**
 * 健澜科技 jlmedaios - 术前访视 ASA 分级 API（M521-A，P0 首批）
 *
 * 对接真实 BFF：
 *   POST /api/v1/preop-assessments        权限码 preop:assess
 *   GET  /api/v1/preop-assessments?visitId=  权限码 preop:view
 *
 * 后端契约严格对齐（src/bff/aggregators/preopAssessmentAggregator.ts）：
 *   POST body 仅接受 visitId / asaGrade / npoConfirmed / allergyChecked /
 *   consentSigned / assessmentNote；扩展采集项聚合进 assessmentNote 备注，
 *   不向后端发送未定义字段导致 400。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举与中文映射                                                      */
/* ------------------------------------------------------------------ */

export type AsaGrade = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export const ASA_LABEL: Record<AsaGrade, string> = {
  I: 'I 级 · 健康',
  II: 'II 级 · 轻度系统性疾病',
  III: 'III 级 · 重度系统性疾病（自理）',
  IV: 'IV 级 · 重度系统性疾病（失代偿）',
  V: 'V 级 · 濒死状态',
  VI: 'VI 级 · 脑死亡供体',
};

export const ASA_DEFINITION: Record<AsaGrade, string> = {
  I: '体格健康，发育营养良好，各器官功能正常',
  II: '轻度系统性疾病，功能代偿，日常活动不受限',
  III: '重度系统性疾病，活动受限但尚能自理',
  IV: '重度系统性疾病，已丧失日常活动能力，随时面临生命危险',
  V: '濒死状态，不论手术与否预计 24 小时内不能存活',
  VI: '脑死亡，拟行器官捐献供体',
};

export type Mallampati = 'I' | 'II' | 'III' | 'IV';

export const MALLAMPATI_LABEL: Record<Mallampati, string> = {
  I: 'I 类（可见悬雍垂/软腭/咽腭弓）',
  II: 'II 类（可见软腭/咽腭弓，悬雍垂被舌根遮挡）',
  III: 'III 类（仅可见软腭基部，舌根贴近硬腭）',
  IV: 'IV 类（软腭不可见，仅见硬腭）',
};

export type PriorAnesthesia = 'none' | 'reaction' | 'complication' | 'unknown';

export const PRIOR_ANESTHESIA_LABEL: Record<PriorAnesthesia, string> = {
  none: '既往麻醉顺利，无不良反应',
  reaction: '既往有麻醉反应（恶心呕吐/躁动等）',
  complication: '既往有麻醉并发症（困难气道/醒觉等）',
  unknown: '既往麻醉史不详',
};

/** ASA III–VI 判定为高风险，需麻醉科主任复评 */
export function isHighRiskAsa(grade: AsaGrade): boolean {
  return ['III', 'IV', 'V', 'VI'].includes(grade);
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface PreopRecord {
  id: string;
  visitId: string;
  patientId?: string;
  asaGrade: AsaGrade;
  npoConfirmed: boolean;
  allergyChecked: boolean;
  consentSigned: boolean;
  assessmentNote: string | null;
  signature?: string;
  assessorName?: string;
  assessedAt: string;
  complete?: boolean;
  missing?: string[];
  highRisk?: boolean;
  interventionTaskId?: string | null;
  /** 扩展采集项（后端契约暂未持久化，本地/演示记录用于页面展示） */
  patientName?: string;
  bmi?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  mallampati?: Mallampati;
  priorAnesthesia?: PriorAnesthesia;
  allergyDrug?: boolean;
  allergyFood?: boolean;
  allergyTape?: boolean;
  lastMealAt?: string;
  onAnticoagulant?: boolean;
  demo?: boolean;
}

export interface PreopSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  asaGrade: AsaGrade;
  npoConfirmed: boolean;
  allergyChecked: boolean;
  consentSigned: boolean;
  bmi?: number;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  mallampati?: Mallampati;
  priorAnesthesia?: PriorAnesthesia;
  allergyDrug?: boolean;
  allergyFood?: boolean;
  allergyTape?: boolean;
  lastMealAt?: string;
  onAnticoagulant?: boolean;
  assessmentNote?: string;
  signature: string;
  assessorName?: string;
}

export interface PreopListResult {
  data: PreopRecord[];
  demo: boolean;
}

export interface PreopSubmitResult {
  record: PreopRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 确定性 DEMO 兜底记录                                                 */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: PreopRecord[] = [
  {
    id: 'PREOP-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    asaGrade: 'II',
    npoConfirmed: true,
    allergyChecked: true,
    consentSigned: true,
    assessmentNote: '既往高血压，控制平稳；气道 Mallampati II 类。',
    signature: '陈医师',
    assessorName: '陈医师',
    assessedAt: new Date().toISOString(),
    complete: true,
    missing: [],
    highRisk: false,
    mallampati: 'II',
    systolicBp: 138,
    diastolicBp: 86,
    heartRate: 78,
    bmi: 23.4,
    demo: true,
  },
  {
    id: 'PREOP-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    asaGrade: 'III',
    npoConfirmed: true,
    allergyChecked: false,
    consentSigned: true,
    assessmentNote: '既往脑梗病史，活动受限；过敏史待复核。',
    signature: '陈医师',
    assessorName: '陈医师',
    assessedAt: new Date(Date.now() - 3600_000).toISOString(),
    complete: false,
    missing: ['allergyChecked'],
    highRisk: true,
    mallampati: 'III',
    systolicBp: 152,
    diastolicBp: 94,
    heartRate: 88,
    bmi: 26.1,
    demo: true,
  },
];

/** 把扩展采集项聚合进后端允许的备注字段，避免发送未定义 key */
function buildNote(input: PreopSubmitInput): string | undefined {
  const parts: string[] = [];
  if (input.bmi != null) parts.push(`BMI ${input.bmi}`);
  if (input.systolicBp != null && input.diastolicBp != null) {
    parts.push(`BP ${input.systolicBp}/${input.diastolicBp} mmHg`);
  }
  if (input.heartRate != null) parts.push(`HR ${input.heartRate} 次/分`);
  if (input.mallampati) parts.push(`Mallampati ${input.mallampati} 类`);
  if (input.priorAnesthesia) parts.push(`既往麻醉史：${PRIOR_ANESTHESIA_LABEL[input.priorAnesthesia]}`);
  const allergies: string[] = [];
  if (input.allergyDrug) allergies.push('药物');
  if (input.allergyFood) allergies.push('食物');
  if (input.allergyTape) allergies.push('胶布');
  if (allergies.length > 0) parts.push(`过敏史：${allergies.join('/')}`);
  if (input.lastMealAt) parts.push(`末次进食饮水：${input.lastMealAt}`);
  if (input.onAnticoagulant) parts.push('近期使用抗凝药，需麻醉科复核');
  if (input.assessmentNote?.trim()) parts.push(input.assessmentNote.trim());
  return parts.length > 0 ? parts.join('；') : undefined;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

/** 查询术前评估记录（按就诊过滤；BFF 失败返回 DEMO 列表并打标） */
export async function fetchPreopRecords(visitId?: string): Promise<PreopListResult> {
  try {
    const res = await get<PreopRecord[]>('/preop-assessments', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

/** 提交术前访视评估；真实落库失败时降级为本地演示记录，绝不伪造成功提示 */
export async function submitPreopAssessment(input: PreopSubmitInput): Promise<PreopSubmitResult> {
  const payload = {
    visitId: input.visitId,
    asaGrade: input.asaGrade,
    npoConfirmed: input.npoConfirmed,
    allergyChecked: input.allergyChecked,
    consentSigned: input.consentSigned,
    assessmentNote: buildNote(input),
  };
  try {
    const res = await post<PreopRecord>('/preop-assessments', payload);
    const record: PreopRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      signature: input.signature,
      assessorName: input.assessorName,
      bmi: input.bmi,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      mallampati: input.mallampati,
      priorAnesthesia: input.priorAnesthesia,
      allergyDrug: input.allergyDrug,
      allergyFood: input.allergyFood,
      allergyTape: input.allergyTape,
      lastMealAt: input.lastMealAt,
      onAnticoagulant: input.onAnticoagulant,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    const demoRecord: PreopRecord = {
      id: `PREOP-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      patientId: input.patientId,
      patientName: input.patientName,
      asaGrade: input.asaGrade,
      npoConfirmed: input.npoConfirmed,
      allergyChecked: input.allergyChecked,
      consentSigned: input.consentSigned,
      assessmentNote: buildNote(input) ?? null,
      signature: input.signature,
      assessorName: input.assessorName,
      assessedAt: new Date().toISOString(),
      complete: input.npoConfirmed && input.allergyChecked && input.consentSigned,
      missing: [
        ...(input.npoConfirmed ? [] : ['npoConfirmed']),
        ...(input.allergyChecked ? [] : ['allergyChecked']),
        ...(input.consentSigned ? [] : ['consentSigned']),
      ],
      highRisk: isHighRiskAsa(input.asaGrade),
      interventionTaskId: null,
      bmi: input.bmi,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      mallampati: input.mallampati,
      priorAnesthesia: input.priorAnesthesia,
      allergyDrug: input.allergyDrug,
      allergyFood: input.allergyFood,
      allergyTape: input.allergyTape,
      lastMealAt: input.lastMealAt,
      onAnticoagulant: input.onAnticoagulant,
      demo: true,
    };
    void err;
    return { record: demoRecord, demo: true };
  }
}
