/**
 * 健澜科技 jlmedaios - PACU Aldrete 出室评分 API（M521-D，P0 首批）
 *
 * 对接真实 BFF：
 *   POST /api/v1/pacu-records          权限码 pacu:record
 *   GET  /api/v1/pacu-records?visitId=  权限码 pacu:view
 *
 * 后端契约严格对齐（src/bff/aggregators/pacuRecordAggregator.ts）：
 *   POST body 仅接受 visitId / activity / respiration / circulation /
 *   consciousness / spo2 / note；五项各 0/1/2；实测血压/心率/SpO₂、
 *   出血/恶心呕吐、去向、签名等扩展采集项聚合进 note 备注，不向后端发送
 *   未定义字段导致 400。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举与中文映射                                                      */
/* ------------------------------------------------------------------ */

/** Aldrete 单项分值：0 / 1 / 2 */
export type AldreteScore = 0 | 1 | 2;

/** 五项分项 key（与后端字段一一对应） */
export type PacuDimensionKey = 'activity' | 'respiration' | 'circulation' | 'consciousness' | 'spo2';

/** 出室去向（后端字典枚举，禁止自创 key） */
export type PacuDestination = 'ward' | 'icu' | 'floor' | 'extended_care';

export const DESTINATION_LABEL: Record<PacuDestination, string> = {
  ward: '病房',
  icu: 'ICU',
  floor: '普通病房',
  extended_care: '延长观察',
};

export interface AldreteDimension {
  key: PacuDimensionKey;
  label: string;
  scores: Record<AldreteScore, string>;
}

/** 五项评分标准（照规范 7.D 文案，禁止自创分级阈值） */
export const ALDRETE_DIMENSIONS: AldreteDimension[] = [
  {
    key: 'activity',
    label: '活动力',
    scores: { 2: '自主活动如常', 1: '需辅助活动', 0: '不能活动' },
  },
  {
    key: 'respiration',
    label: '呼吸',
    scores: { 2: '能深呼吸并咳嗽', 1: '呼吸受限、浅促', 0: '呼吸困难、需辅助通气' },
  },
  {
    key: 'circulation',
    label: '循环',
    scores: { 2: '血压心率接近术前水平', 1: '轻度波动', 0: '明显低血压或心律失常' },
  },
  {
    key: 'consciousness',
    label: '意识',
    scores: { 2: '完全清醒', 1: '呼之能应', 0: '未清醒' },
  },
  {
    key: 'spo2',
    label: '血氧',
    scores: { 2: '吸空气 SpO₂≥95%', 1: '吸氧下 90–94%', 0: '<90%' },
  },
];

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端 medical-tools/nursing/pacuRecord.ts 一致）          */
/* ------------------------------------------------------------------ */

/** 五项求和，总分 0–10 */
export function aldreteTotal(
  activity: number,
  respiration: number,
  circulation: number,
  consciousness: number,
  spo2: number,
): number {
  return activity + respiration + circulation + consciousness + spo2;
}

/** 总分 ≥9 符合出室标准 */
export function isReadyForDischarge(total: number): boolean {
  return total >= 9;
}

/** 入室超过 60 分钟仍未达出室分 → 苏醒延迟（与后端 delayedRecovery 语义一致） */
export function isDelayedRecovery(enteredAt: string, total: number): boolean {
  if (isReadyForDischarge(total)) return false;
  const mins = (Date.now() - new Date(enteredAt).getTime()) / 60_000;
  return mins > 60;
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface PacuRecord {
  id: string;
  visitId: string;
  activity: AldreteScore;
  respiration: AldreteScore;
  circulation: AldreteScore;
  consciousness: AldreteScore;
  spo2: AldreteScore;
  enteredAt: string;
  exitedAt: string | null;
  delayedRecovery: boolean;
  dischargeDestination: PacuDestination | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
  /** 后端响应附加字段 */
  aldrete: number;
  ready: boolean;
  interventionTaskId: string | null;
  /** 扩展采集项（后端契约暂未持久化，本地/演示记录用于页面展示） */
  patientId?: string;
  patientName?: string;
  surgeryName?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  measuredSpo2?: number;
  bleeding?: boolean;
  nauseaVomiting?: boolean;
  dischargeRequested?: boolean;
  destination?: PacuDestination;
  signature?: string;
  assessorName?: string;
  demo?: boolean;
}

/** 后端响应附加评分结论后的记录体 */
export type PacuRecordResponse = PacuRecord & {
  aldrete: number;
  ready: boolean;
  interventionTaskId: string | null;
};

export interface PacuSubmitInput {
  visitId: string;
  patientId?: string;
  patientName?: string;
  activity: AldreteScore;
  respiration: AldreteScore;
  circulation: AldreteScore;
  consciousness: AldreteScore;
  spo2: AldreteScore;
  surgeryName?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  measuredSpo2?: number;
  bleeding?: boolean;
  nauseaVomiting?: boolean;
  dischargeRequested?: boolean;
  destination?: PacuDestination;
  signature: string;
  assessorName?: string;
  note?: string;
}

export interface PacuListResult {
  data: PacuRecord[];
  demo: boolean;
}

export interface PacuSubmitResult {
  record: PacuRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 确定性 DEMO 兜底记录                                                 */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: PacuRecord[] = [
  {
    id: 'PACU-DEMO-001',
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    activity: 2,
    respiration: 2,
    circulation: 2,
    consciousness: 2,
    spo2: 1,
    enteredAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    exitedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    delayedRecovery: false,
    dischargeDestination: 'floor',
    note: '手术：阑尾切除术；BP 132/84 mmHg；HR 76 次/分；SpO₂ 97%；生命体征平稳，已申请出室回普通病房。',
    createdBy: '陈医师',
    createdAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    aldrete: 9,
    ready: true,
    interventionTaskId: null,
    surgeryName: '阑尾切除术',
    systolicBp: 132,
    diastolicBp: 84,
    heartRate: 76,
    measuredSpo2: 97,
    bleeding: false,
    nauseaVomiting: false,
    dischargeRequested: true,
    destination: 'floor',
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'PACU-DEMO-002',
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    activity: 1,
    respiration: 1,
    circulation: 1,
    consciousness: 1,
    spo2: 0,
    enteredAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    exitedAt: null,
    delayedRecovery: true,
    dischargeDestination: null,
    note: '手术：下肢深静脉血栓取栓术；BP 152/94 mmHg；HR 96 次/分；SpO₂ 89%；现场情况：恶心呕吐；呼之能应，吸氧观察中，继续留观复评。',
    createdBy: '陈医师',
    createdAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    aldrete: 4,
    ready: false,
    interventionTaskId: 'TASK-DEMO-PACU-002',
    surgeryName: '下肢深静脉血栓取栓术',
    systolicBp: 152,
    diastolicBp: 94,
    heartRate: 96,
    measuredSpo2: 89,
    bleeding: false,
    nauseaVomiting: true,
    dischargeRequested: false,
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/** 把扩展采集项聚合进后端允许的备注字段，避免发送未定义 key */
function buildNote(input: PacuSubmitInput): string | undefined {
  const parts: string[] = [];
  if (input.surgeryName?.trim()) parts.push(`手术：${input.surgeryName.trim()}`);
  if (input.systolicBp != null && input.diastolicBp != null) {
    parts.push(`BP ${input.systolicBp}/${input.diastolicBp} mmHg`);
  }
  if (input.heartRate != null) parts.push(`HR ${input.heartRate} 次/分`);
  if (input.measuredSpo2 != null) parts.push(`SpO₂ ${input.measuredSpo2}%`);
  const conditions: string[] = [];
  if (input.bleeding) conditions.push('活动性出血');
  if (input.nauseaVomiting) conditions.push('恶心呕吐');
  if (conditions.length > 0) parts.push(`现场情况：${conditions.join('、')}`);
  if (input.dischargeRequested && input.destination) {
    parts.push(`已申请出室，去向：${DESTINATION_LABEL[input.destination]}`);
  }
  if (input.note?.trim()) parts.push(input.note.trim());
  return parts.length > 0 ? parts.join('；') : undefined;
}

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

/** 查询 PACU 记录（按就诊过滤；BFF 失败返回 DEMO 列表并打标） */
export async function fetchPacuRecords(visitId?: string): Promise<PacuListResult> {
  try {
    const res = await get<PacuRecordResponse[]>('/pacu-records', visitId ? { visitId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !visitId || r.visitId === visitId), demo: true };
  }
}

/** 提交 PACU Aldrete 评分；真实落库失败时降级为本地演示记录，绝不伪造成功提示 */
export async function submitPacuRecord(input: PacuSubmitInput): Promise<PacuSubmitResult> {
  const total = aldreteTotal(
    input.activity,
    input.respiration,
    input.circulation,
    input.consciousness,
    input.spo2,
  );
  const ready = isReadyForDischarge(total);
  const payload = {
    visitId: input.visitId,
    activity: input.activity,
    respiration: input.respiration,
    circulation: input.circulation,
    consciousness: input.consciousness,
    spo2: input.spo2,
    note: buildNote(input),
  };
  try {
    const res = await post<PacuRecordResponse>('/pacu-records', payload);
    const record: PacuRecord = {
      ...res,
      patientId: input.patientId,
      patientName: input.patientName,
      surgeryName: input.surgeryName,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      measuredSpo2: input.measuredSpo2,
      bleeding: input.bleeding,
      nauseaVomiting: input.nauseaVomiting,
      dischargeRequested: input.dischargeRequested,
      destination: input.destination,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    const discharged = Boolean(input.dischargeRequested && input.destination);
    const demoRecord: PacuRecord = {
      id: `PACU-LOCAL-${Date.now().toString().slice(-8)}`,
      visitId: input.visitId,
      activity: input.activity,
      respiration: input.respiration,
      circulation: input.circulation,
      consciousness: input.consciousness,
      spo2: input.spo2,
      enteredAt: new Date().toISOString(),
      exitedAt: discharged ? new Date().toISOString() : null,
      delayedRecovery: false,
      dischargeDestination: discharged ? input.destination ?? null : null,
      note: buildNote(input) ?? null,
      createdBy: input.assessorName ?? '当前用户',
      createdAt: new Date().toISOString(),
      aldrete: total,
      ready,
      interventionTaskId: null,
      patientId: input.patientId,
      patientName: input.patientName,
      surgeryName: input.surgeryName,
      systolicBp: input.systolicBp,
      diastolicBp: input.diastolicBp,
      heartRate: input.heartRate,
      measuredSpo2: input.measuredSpo2,
      bleeding: input.bleeding,
      nauseaVomiting: input.nauseaVomiting,
      dischargeRequested: input.dischargeRequested,
      destination: input.destination,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    void err;
    return { record: demoRecord, demo: true };
  }
}
