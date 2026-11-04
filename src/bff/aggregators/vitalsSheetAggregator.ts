/**
 * 健澜AI原生医院操作系统OS - P1-2 体温单（独立护理文书）
 *
 * 与 P0-3 PDA 体征录入（/nurse-station/ward/vitals）独立：本模块是体温单护理文书，
 * 录入体温/脉搏/呼吸/血压/SpO2/体重/大便次数，并按 4h 时间轴（0/4/8/12/16/20）
 * 对齐输出曲线数据结构，缺失点为 null。
 *
 * 硬校验生理区间：体温 35~42℃、脉搏 40~160、呼吸 8~40、SBP 60~220、DBP 30~130。
 * 权限：nurse 可录入+查看；doctor 仅查看；其他 403。visitId-patientId 行级绑定。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export class VitalsSheetError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface VitalsEntry {
  entryId: string;
  visitId: string;
  patientId: string;
  recordedAt: number;
  temperatureC?: number;
  pulseBpm?: number;
  respirationRate?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  weightKg?: number;
  bowelMovements?: number;
  recordedBy: string;
}

const entries = new Map<string, VitalsEntry>();
let entrySeq = 0;

const SLOT_HOURS = [0, 4, 8, 12, 16, 20];

function requireRange(name: string, v: number | undefined, min: number, max: number, unit: string): void {
  if (v === undefined || v === null) return;
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new VitalsSheetError(400, `${name} 必须为数字`);
  }
  if (v < min || v > max) {
    throw new VitalsSheetError(400, `${name} ${v}${unit} 超出区间 ${min}~${max}${unit}`);
  }
}

function requireRoles(roles: string[], action: 'write' | 'read'): void {
  if (roles.includes('admin')) return;
  if (action === 'write') {
    if (!roles.includes('nurse')) throw new VitalsSheetError(403, '体温单录入需护士角色');
    return;
  }
  // read: nurse or doctor
  if (!roles.includes('nurse') && !roles.includes('doctor')) {
    throw new VitalsSheetError(403, '无权查看体温单');
  }
}

export interface RecordEntryInput {
  visitId: string;
  patientId: string;
  temperatureC?: number;
  pulseBpm?: number;
  respirationRate?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  weightKg?: number;
  bowelMovements?: number;
  recordedAt?: number;
  roles: string[];
  recordedBy: string;
}

/** 护士录入一条体征。 */
export function recordEntry(input: RecordEntryInput): VitalsEntry {
  requireRoles(input.roles, 'write');
  if (!input.visitId) throw new VitalsSheetError(400, 'visitId 必填');
  if (!input.patientId) throw new VitalsSheetError(400, 'patientId 必填');

  requireRange('体温', input.temperatureC, 35, 42, '℃');
  requireRange('脉搏', input.pulseBpm, 40, 160, 'bpm');
  requireRange('呼吸', input.respirationRate, 8, 40, '次/分');
  requireRange('收缩压', input.sbp, 60, 220, 'mmHg');
  requireRange('舒张压', input.dbp, 30, 130, 'mmHg');
  if (input.spo2 !== undefined && (input.spo2 < 50 || input.spo2 > 100)) {
    throw new VitalsSheetError(400, `SpO2 ${input.spo2}% 超出区间 50~100%`);
  }

  // 行级绑定
  assertVisitPatientBinding(input.visitId, input.patientId);

  const now = input.recordedAt ?? Date.now();
  entrySeq += 1;
  const e: VitalsEntry = {
    entryId: `VTSE-${String(entrySeq).padStart(4, '0')}`,
    visitId: input.visitId,
    patientId: input.patientId,
    recordedAt: now,
    temperatureC: input.temperatureC,
    pulseBpm: input.pulseBpm,
    respirationRate: input.respirationRate,
    sbp: input.sbp,
    dbp: input.dbp,
    spo2: input.spo2,
    weightKg: input.weightKg,
    bowelMovements: input.bowelMovements,
    recordedBy: input.recordedBy,
  };
  entries.set(e.entryId, e);
  return e;
}

function slotLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * 曲线：按 date(YYYY-MM-DD) 过滤当日条目，4h 槽位对齐。
 * 取槽位 ±2h 窗口内最近一条；缺失槽位 value=null。
 */
export function getCurve(visitId: string, date: string, roles: string[]): Record<string, unknown> {
  requireRoles(roles, 'read');
  if (!visitId) throw new VitalsSheetError(400, 'visitId 必填');

  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const dayEnd = dayStart + 24 * 3600_000;

  const inDay = Array.from(entries.values()).filter(
    (e) => e.visitId === visitId && e.recordedAt >= dayStart && e.recordedAt < dayEnd,
  );

  const bucket = (slotHour: number): VitalsEntry | undefined => {
    const slotMs = dayStart + slotHour * 3600_000;
    let best: VitalsEntry | undefined;
    let bestDiff = Infinity;
    for (const e of inDay) {
      const diff = Math.abs(e.recordedAt - slotMs);
      if (diff <= 2 * 3600_000 && diff < bestDiff) { best = e; bestDiff = diff; }
    }
    return best;
  };

  const temperatureCurve = SLOT_HOURS.map((h) => ({ t: slotLabel(h), value: bucket(h)?.temperatureC ?? null }));
  const pulseCurve = SLOT_HOURS.map((h) => ({ t: slotLabel(h), value: bucket(h)?.pulseBpm ?? null }));
  const respirationCurve = SLOT_HOURS.map((h) => ({ t: slotLabel(h), value: bucket(h)?.respirationRate ?? null }));
  const bpSeries = SLOT_HOURS.map((h) => {
    const e = bucket(h);
    return { t: slotLabel(h), sbp: e?.sbp ?? null, dbp: e?.dbp ?? null };
  });
  const spo2Series = SLOT_HOURS.map((h) => ({ t: slotLabel(h), value: bucket(h)?.spo2 ?? null }));

  const last = inDay[inDay.length - 1];
  const bowelTotal = inDay.reduce((s, e) => s + (e.bowelMovements ?? 0), 0);

  return {
    visitId,
    date,
    temperatureCurve,
    pulseCurve,
    respirationCurve,
    bpSeries,
    spo2Series,
    weight: last?.weightKg ?? null,
    bowelMovements: bowelTotal,
  };
}

export function __resetStore(): void {
  entries.clear();
  entrySeq = 0;
}
