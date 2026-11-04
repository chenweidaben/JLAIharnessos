/**
 * 健澜AI原生医院操作系统OS - P2-4 护理 NQI 敏感指标
 *
 * 跌倒 / 压疮 / 管路滑脱 / 约束保护 + 床护比护患比 + 千住院日发生率看板。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class NqiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type NqiEventType = 'fall' | 'pressure-ulcer' | 'tube-displacement' | 'restraint';

export interface NqiEvent {
  eventId: string;
  type: NqiEventType;
  visitId: string;
  patientId: string;
  departmentId: string;
  reportedByNurseId: string;
  occurredAt: string; // ISO
  details: Record<string, unknown>;
}

interface StaffingRow {
  departmentId: string;
  date: string; // YYYY-MM-DD
  beds: number;
  nurses: number;
  inpatients: number;
}

const events: NqiEvent[] = [];
const staffing: StaffingRow[] = [];
let seq = 0;

function pick<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    throw new NqiError(400, `${label} 非法：${String(v)}`);
  }
  return v as T;
}
function intIn(v: unknown, min: number, max: number, label: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new NqiError(400, `${label} 需 ${min}~${max}，收到 ${String(v)}`);
  return n;
}

const FALL_SEV = ['no-harm', 'mild', 'moderate', 'severe'] as const;
const PU_SOURCE = ['community', 'hospital'] as const;
const PU_STAGE = ['I', 'II', 'III', 'IV', 'unstageable'] as const;
const TUBE_TYPE = ['ng-tube', 'foley', 'cvc', 'drain'] as const;
const TUBE_REASON = ['accidental', 'deliberate-removal', 'dislodged', 'other'] as const;
const RESTRAINT_TYPE = ['physical', 'chemical'] as const;

interface BaseInput { visitId: string; patientId: string; departmentId: string; occurredAt: string; }

function base(i: BaseInput): Omit<NqiEvent, 'eventId' | 'type' | 'details'> {
  if (!i.visitId || !i.patientId || !i.departmentId) throw new NqiError(400, 'visitId/patientId/departmentId 必填');
  if (!i.occurredAt || Number.isNaN(Date.parse(i.occurredAt))) throw new NqiError(400, 'occurredAt 非合法 ISO');
  return { visitId: i.visitId, patientId: i.patientId, departmentId: i.departmentId, reportedByNurseId: '', occurredAt: i.occurredAt };
}

export function reportFall(input: BaseInput & { severity: unknown; morseScore: unknown; riskFactors?: unknown; reportedByNurseId?: string }): NqiEvent {
  const sev = pick(input.severity, FALL_SEV, 'severity');
  const morse = intIn(input.morseScore, 0, 125, 'morseScore');
  const e: NqiEvent = { eventId: '', type: 'fall', ...base(input), details: { severity: sev, morseScore: morse, riskFactors: Array.isArray(input.riskFactors) ? input.riskFactors : [] } };
  e.reportedByNurseId = input.reportedByNurseId ?? '';
  seq += 1; e.eventId = `NQI-F-${String(seq).padStart(5, '0')}`;
  events.push(e); return e;
}

export function reportPressureUlcer(input: BaseInput & { source: unknown; stage: unknown; bradenScore: unknown; reportedByNurseId?: string }): NqiEvent {
  const src = pick(input.source, PU_SOURCE, 'source');
  const stage = pick(input.stage, PU_STAGE, 'stage');
  const braden = intIn(input.bradenScore, 6, 23, 'bradenScore');
  const e: NqiEvent = { eventId: '', type: 'pressure-ulcer', ...base(input), details: { source: src, stage, bradenScore: braden } };
  e.reportedByNurseId = input.reportedByNurseId ?? '';
  seq += 1; e.eventId = `NQI-P-${String(seq).padStart(5, '0')}`;
  events.push(e); return e;
}

export function reportTubeDisplacement(input: BaseInput & { catheterType: unknown; reason: unknown; reinserted: boolean; reinsertedAt?: string; reportedByNurseId?: string }): NqiEvent {
  const ct = pick(input.catheterType, TUBE_TYPE, 'catheterType');
  const rs = pick(input.reason, TUBE_REASON, 'reason');
  const e: NqiEvent = { eventId: '', type: 'tube-displacement', ...base(input), details: { catheterType: ct, reason: rs, reinserted: !!input.reinserted, reinsertedAt: input.reinsertedAt ?? null } };
  e.reportedByNurseId = input.reportedByNurseId ?? '';
  seq += 1; e.eventId = `NQI-T-${String(seq).padStart(5, '0')}`;
  events.push(e); return e;
}

export function reportRestraint(input: BaseInput & { restraintType: unknown; appliedAt: string; rationale: string; reportedByNurseId?: string }): NqiEvent {
  const rt = pick(input.restraintType, RESTRAINT_TYPE, 'restraintType');
  if (!input.rationale) throw new NqiError(400, 'rationale 必填');
  const e: NqiEvent = { eventId: '', type: 'restraint', ...base(input), details: { restraintType: rt, appliedAt: input.appliedAt, removedAt: null, rationale: input.rationale, dailyAssessments: [] as unknown[] } };
  e.reportedByNurseId = input.reportedByNurseId ?? '';
  seq += 1; e.eventId = `NQI-R-${String(seq).padStart(5, '0')}`;
  events.push(e); return e;
}

function findRestraint(eventId: string): NqiEvent {
  const e = events.find((x) => x.eventId === eventId && x.type === 'restraint');
  if (!e) throw new NqiError(404, `约束事件不存在：${eventId}`);
  return e;
}

export function assessRestraint(eventId: string, at: string, rationale: string, alternativesTried: string[]): NqiEvent {
  const e = findRestraint(eventId);
  if (e.details.removedAt) throw new NqiError(409, '约束已解除，不能再每日评估');
  (e.details.dailyAssessments as unknown[]).push({ at, rationale, alternativesTried });
  return e;
}

export function releaseRestraint(eventId: string, removedAt: string): NqiEvent {
  const e = findRestraint(eventId);
  if (e.details.removedAt) throw new NqiError(409, '约束已解除，重复解除');
  e.details.removedAt = removedAt;
  return e;
}

export function listEvents(q: { departmentId?: string; type?: string; from?: string; to?: string }): NqiEvent[] {
  let arr = [...events];
  if (q.departmentId) arr = arr.filter((e) => e.departmentId === q.departmentId);
  if (q.type) arr = arr.filter((e) => e.type === q.type);
  if (q.from) arr = arr.filter((e) => e.occurredAt >= q.from!);
  if (q.to) arr = arr.filter((e) => e.occurredAt <= q.to!);
  arr.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return arr;
}

export function upsertStaffing(input: { departmentId: string; date: string; beds: number; nurses: number; inpatients: number }): StaffingRow {
  if (!input.departmentId || !input.date) throw new NqiError(400, 'departmentId/date 必填');
  if (input.beds < 0 || input.nurses < 0 || input.inpatients < 0) throw new NqiError(400, 'beds/nurses/inpatients 不能为负');
  const row: StaffingRow = { departmentId: input.departmentId, date: input.date, beds: input.beds, nurses: input.nurses, inpatients: input.inpatients };
  const idx = staffing.findIndex((s) => s.departmentId === row.departmentId && s.date === row.date);
  if (idx >= 0) staffing[idx] = row; else staffing.push(row);
  return row;
}

export function dashboard(month: string, departmentId?: string): {
  month: string; departmentId?: string; totalInpatientDays: number;
  fallCount: number; pressureUlcerCount: number; tubeDisplacementCount: number;
  restraintCount: number; fallRatePer1000: number; pressureUlcerRatePer1000: number;
  tubeRatePer1000: number;
  ratios: { bedNurse: number; patientNurse: number };
} {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) throw new NqiError(400, 'month 需 YYYY-MM');
  let st = staffing.filter((s) => s.date.startsWith(month));
  let ev = events.filter((e) => e.occurredAt.startsWith(month));
  if (departmentId) { st = st.filter((s) => s.departmentId === departmentId); ev = ev.filter((e) => e.departmentId === departmentId); }
  const totalInpatientDays = st.reduce((a, s) => a + s.inpatients, 0);
  const fallCount = ev.filter((e) => e.type === 'fall').length;
  const pressureUlcerCount = ev.filter((e) => e.type === 'pressure-ulcer').length;
  const tubeDisplacementCount = ev.filter((e) => e.type === 'tube-displacement').length;
  const restraintCount = ev.filter((e) => e.type === 'restraint').length;
  const per1000 = (n: number) => totalInpatientDays > 0 ? Number(((n / totalInpatientDays) * 1000).toFixed(2)) : 0;
  const totalBeds = st.reduce((a, s) => a + s.beds, 0);
  const totalNurses = st.reduce((a, s) => a + s.nurses, 0);
  const totalInpatients = st.reduce((a, s) => a + s.inpatients, 0);
  return {
    month, departmentId, totalInpatientDays,
    fallCount, pressureUlcerCount, tubeDisplacementCount, restraintCount,
    fallRatePer1000: per1000(fallCount), pressureUlcerRatePer1000: per1000(pressureUlcerCount), tubeRatePer1000: per1000(tubeDisplacementCount),
    ratios: {
      bedNurse: totalNurses > 0 ? Number((totalBeds / totalNurses).toFixed(2)) : 0,
      patientNurse: totalNurses > 0 ? Number((totalInpatients / totalNurses).toFixed(2)) : 0,
    },
  };
}

export function __resetStore(): void { events.length = 0; staffing.length = 0; seq = 0; }
