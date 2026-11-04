/**
 * 健澜AI原生医院操作系统OS - P1-5 ICU 监护文书
 *
 * 三模块：
 *  1) 转入转出：admitted(icu_doctor) → discharged；重复转入/未转入即转出 409。
 *  2) 多时间点体征序列（icu_nurse 录），同 visitId 同 recordedAt 重复 409。
 *  3) 评分引擎（icu_doctor 评）：APACHE II(0~71)、SOFA(0~24)、RASS(-5~+4)、Ramsay(1~6)。
 *
 * 角色：icu_doctor 转入转出/评分，icu_nurse 录体征；admin 全放行。
 * 行级 visitId-patientId 绑定复用 assertVisitPatientBinding。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export class IcuNotesError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface IcuAdmission {
  visitId: string;
  patientId: string;
  reason: string;
  acuityLevel: number;
  plannedVentHours: number;
  status: 'admitted' | 'discharged';
  disposition?: string;
  admittedAt: number;
  dischargedAt?: number;
  admittedBy: string;
}

export interface IcuVitalsPoint {
  visitId: string;
  recordedAt: number;
  heartRate: number;
  sbp: number;
  dbp: number;
  respRate: number;
  spo2: number;
  temperatureC: number;
  gcsScore: number;
  urineOutputMl: number;
  recordedBy: string;
}

export interface IcuScore {
  scoreId: string;
  visitId: string;
  scoreType: 'apache2' | 'sofa' | 'rass' | 'ramsay';
  totalScore: number;
  components: Record<string, number>;
  recordedAt: number;
  calculatedBy: string;
}

const admission = new Map<string, IcuAdmission>();
const vitals = new Map<string, IcuVitalsPoint>(); // key = visitId|recordedAt
const scores = new Map<string, IcuScore>(); // key = visitId|scoreType|recordedAt
let scoreSeq = 0;

function requireRole(roles: string[], allowed: string[], action: string): void {
  if (roles.includes('admin')) return;
  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) throw new IcuNotesError(403, `${action} 需要角色：${allowed.join('/')}`);
}

function range(name: string, v: number, min: number, max: number): void {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new IcuNotesError(400, `${name} 必须为数字`);
  if (v < min || v > max) throw new IcuNotesError(400, `${name} ${v} 超出区间 ${min}~${max}`);
}

// ---------- 转入转出 ----------
export interface AdmissionInput {
  visitId: string; patientId: string; reason: string; acuityLevel: number; plannedVentHours: number;
  roles: string[]; operatorId: string;
}
export function admit(input: AdmissionInput): IcuAdmission {
  requireRole(input.roles, ['icu_doctor'], 'ICU 转入');
  if (!input.visitId || !input.patientId) throw new IcuNotesError(400, 'visitId/patientId 必填');
  range('acuityLevel', input.acuityLevel, 1, 4);
  assertVisitPatientBinding(input.visitId, input.patientId);
  const existing = admission.get(input.visitId);
  if (existing && existing.status === 'admitted') throw new IcuNotesError(409, `该 visitId 已在 ICU（重复转入）`);
  const a: IcuAdmission = {
    visitId: input.visitId, patientId: input.patientId, reason: input.reason,
    acuityLevel: input.acuityLevel, plannedVentHours: input.plannedVentHours,
    status: 'admitted', admittedAt: Date.now(), admittedBy: input.operatorId,
  };
  admission.set(input.visitId, a);
  return a;
}

export interface DischargeInput { visitId: string; patientId: string; disposition: string; roles: string[]; }
export function discharge(input: DischargeInput): IcuAdmission {
  requireRole(input.roles, ['icu_doctor'], 'ICU 转出');
  const a = admission.get(input.visitId);
  if (!a) throw new IcuNotesError(409, `该 visitId 未转入 ICU，不能转出`);
  if (a.status === 'discharged') throw new IcuNotesError(409, `该 visitId 已转出（重复转出）`);
  if (a.patientId !== input.patientId) throw new IcuNotesError(403, '转出患者与转入患者不匹配');
  a.status = 'discharged';
  a.disposition = input.disposition;
  a.dischargedAt = Date.now();
  return a;
}

// ---------- 多时间点体征 ----------
export interface VitalsInput {
  visitId: string; patientId: string; recordedAt: number;
  heartRate: number; sbp: number; dbp: number; respRate: number; spo2: number;
  temperatureC: number; gcsScore: number; urineOutputMl: number;
  roles: string[]; operatorId: string;
}
export function recordVitals(input: VitalsInput): IcuVitalsPoint {
  requireRole(input.roles, ['icu_nurse'], 'ICU 体征记录');
  if (!input.visitId || !input.patientId) throw new IcuNotesError(400, 'visitId/patientId 必填');
  range('heartRate', input.heartRate, 20, 250);
  range('sbp', input.sbp, 40, 300);
  range('dbp', input.dbp, 20, 200);
  range('respRate', input.respRate, 4, 60);
  range('spo2', input.spo2, 70, 100);
  range('temperatureC', input.temperatureC, 30, 42);
  range('gcsScore', input.gcsScore, 3, 15);
  range('urineOutputMl', input.urineOutputMl, 0, 2000);
  assertVisitPatientBinding(input.visitId, input.patientId);
  const key = `${input.visitId}|${input.recordedAt}`;
  if (vitals.has(key)) throw new IcuNotesError(409, `该时间点体征已存在（重复记录）`);
  const p: IcuVitalsPoint = {
    visitId: input.visitId, recordedAt: input.recordedAt,
    heartRate: input.heartRate, sbp: input.sbp, dbp: input.dbp, respRate: input.respRate,
    spo2: input.spo2, temperatureC: input.temperatureC, gcsScore: input.gcsScore,
    urineOutputMl: input.urineOutputMl, recordedBy: input.operatorId,
  };
  vitals.set(key, p);
  return p;
}

export function listVitals(visitId: string): IcuVitalsPoint[] {
  const all = Array.from(vitals.values()).filter((v) => v.visitId === visitId);
  all.sort((a, b) => a.recordedAt - b.recordedAt);
  return all;
}

// ---------- 评分引擎（纯函数） ----------
function apache2Points(items: Record<string, number>): { total: number; components: Record<string, number> } {
  const age = items.age ?? 0;
  const agePoints = age >= 75 ? 4 : age >= 65 ? 6 : age >= 55 ? 5 : age >= 45 ? 2 : 0;
  const temp = items.temperatureC ?? 37;
  const tempPoints = temp >= 39 || temp <= 34 ? 3 : temp >= 38.5 || temp <= 35.9 ? 2 : 0;
  const map = items.map ?? 90;
  const mapPoints = map < 70 || map > 159 ? 4 : map >= 130 || map <= 49 ? 3 : map >= 110 || map <= 59 ? 2 : 0;
  const hr = items.heartRate ?? 80;
  const hrPoints = hr >= 140 || hr <= 40 ? 3 : hr >= 110 || hr <= 54 ? 2 : 0;
  const resp = items.respRate ?? 16;
  const respPoints = resp >= 35 || resp <= 5 ? 3 : resp >= 25 || resp <= 9 ? 1 : 0;
  const gcs = items.gcsScore ?? 15;
  const gcsPoints = 15 - gcs; // Glasgow coma score points
  const chronic = items.chronicPoints ?? 0;
  const total = agePoints + tempPoints + mapPoints + hrPoints + respPoints + gcsPoints + chronic;
  return {
    total: Math.min(71, Math.max(0, total)),
    components: { agePoints, tempPoints, mapPoints, hrPoints, respPoints, gcsPoints, chronic },
  };
}

function sofaPoints(items: Record<string, number>): { total: number; components: Record<string, number> } {
  const sys = ['respiratory', 'coagulation', 'liver', 'cardiovascular', 'cns', 'renal'];
  const components: Record<string, number> = {};
  let total = 0;
  for (const s of sys) {
    const v = items[s] ?? 0;
    if (v < 0 || v > 4) throw new IcuNotesError(400, `SOFA ${s} 必须为 0~4`);
    components[s] = v;
    total += v;
  }
  return { total, components };
}

export interface ScoreInput {
  visitId: string; patientId: string; scoreType: string;
  items: Record<string, number>; recordedAt: number;
  roles: string[]; operatorId: string;
}
export function recordScore(input: ScoreInput): IcuScore {
  requireRole(input.roles, ['icu_doctor'], 'ICU 评分');
  if (!input.visitId || !input.patientId) throw new IcuNotesError(400, 'visitId/patientId 必填');
  assertVisitPatientBinding(input.visitId, input.patientId);

  let calc: { total: number; components: Record<string, number> };
  let total: number;
  if (input.scoreType === 'apache2') {
    calc = apache2Points(input.items);
    total = calc.total;
    if (total < 0 || total > 71) throw new IcuNotesError(400, 'APACHE II 总分应在 0~71');
  } else if (input.scoreType === 'sofa') {
    calc = sofaPoints(input.items);
    total = calc.total;
  } else if (input.scoreType === 'rass') {
    const v = input.items.value ?? 0;
    range('RASS', v, -5, 4);
    calc = { total: v, components: { value: v } };
    total = v;
  } else if (input.scoreType === 'ramsay') {
    const v = input.items.value ?? 0;
    range('Ramsay', v, 1, 6);
    calc = { total: v, components: { value: v } };
    total = v;
  } else {
    throw new IcuNotesError(400, `非法 scoreType：${input.scoreType}`);
  }

  const key = `${input.visitId}|${input.scoreType}|${input.recordedAt}`;
  if (scores.has(key)) throw new IcuNotesError(409, `该时间点 ${input.scoreType} 评分已存在`);

  scoreSeq += 1;
  const s: IcuScore = {
    scoreId: `ICS-${String(scoreSeq).padStart(4, '0')}`,
    visitId: input.visitId,
    scoreType: input.scoreType as IcuScore['scoreType'],
    totalScore: total,
    components: calc.components,
    recordedAt: input.recordedAt,
    calculatedBy: input.operatorId,
  };
  scores.set(key, s);
  return s;
}

export function listScores(visitId: string): IcuScore[] {
  return Array.from(scores.values()).filter((s) => s.visitId === visitId);
}

export function __resetStore(): void {
  admission.clear(); vitals.clear(); scores.clear(); scoreSeq = 0;
}
