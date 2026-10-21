/**
 * 健澜科技 jlmedaios - M581 新标准 P9：ICU 监护记录 3 端点
 *
 * GET  /api/v1/icu-monitoring?patientId=&recordDate=  列表（recordTime 倒序；过滤）
 * POST /api/v1/icu-monitoring                          新建（GCS 3-15 / fio2 21-100 / peep 0-20 校验）
 * GET  /api/v1/icu-monitoring/stats                    汇总（totalRecords + byPatient avgGCS/totalUrineOutput24h/vasoactiveDurationHours）
 *
 * 种子 20 条：3 个 ICU 患者（P-ICU-001/002/003）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

interface GcsScore { eye: number; verbal: number; motor: number }
interface Vitals { hr: number; bp: string; map: number; resp: number; spo2: number; temp: number }
interface VentilatorMode { mode: string; peep: number; fio2: number; rate: number }
interface VasoactiveDrug { drug: string; rate: number }

interface IcuRecord {
  id: string;
  patientId: string;
  bedNo: string;
  recordTime: string;
  gcsScore: GcsScore;
  vitals: Vitals;
  ventilatorMode: VentilatorMode;
  vasoactiveDrugs: VasoactiveDrug[];
  urineOutput24h: number;
  recordedBy: string;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const icuStore = new Map<string, IcuRecord>();
let icuSeq = 0;

function addIcu(r: Omit<IcuRecord, 'id'>): IcuRecord {
  icuSeq += 1;
  const rec: IcuRecord = { ...r, id: `ICU-${String(icuSeq).padStart(3, '0')}` };
  icuStore.set(rec.id, rec);
  return rec;
}

function seedIcu(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const patients = [
    { pid: 'P-ICU-001', bed: 'ICU-01', gcs: { eye: 4, verbal: 3, motor: 5 }, urine: 1500, drugs: [{ drug: 'NE', rate: 0.2 } as VasoactiveDrug] },
    { pid: 'P-ICU-002', bed: 'ICU-02', gcs: { eye: 3, verbal: 2, motor: 4 }, urine: 800, drugs: [{ drug: 'DA', rate: 5 } as VasoactiveDrug, { drug: 'NE', rate: 0.1 } as VasoactiveDrug] },
    { pid: 'P-ICU-003', bed: 'ICU-03', gcs: { eye: 2, verbal: 1, motor: 3 }, urine: 400, drugs: [] as VasoactiveDrug[] },
  ];

  // 20 条：每个患者 6/7/7 条，按 4h 间隔回推
  let pi = 0;
  for (let i = 0; i < 20; i++) {
    const p = patients[pi % 3];
    pi += 1;
    addIcu({
      patientId: p.pid,
      bedNo: p.bed,
      recordTime: iso(60 * 4 * (i + 1)),
      gcsScore: p.gcs,
      vitals: { hr: 85, bp: '110/65', map: 80, resp: 18, spo2: 98, temp: 37.2 },
      ventilatorMode: { mode: 'SIMV', peep: 8, fio2: 45, rate: 16 },
      vasoactiveDrugs: p.drugs,
      urineOutput24h: p.urine,
      recordedBy: 'DOC-ICU-001',
      createdAt: iso(60 * 4 * (i + 1)),
    });
  }
}
seedIcu();

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [
        { severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` },
      ],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/icu-monitoring ==============================

async function handleIcuList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const recordDate = (c.query.get('recordDate') ?? '').trim();

  let rows = Array.from(icuStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (recordDate) rows = rows.filter((r) => r.recordTime.startsWith(recordDate));
  rows = rows.sort((a, b) => b.recordTime.localeCompare(a.recordTime));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/icu-monitoring ==============================

async function handleIcuCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const {
    patientId, bedNo, recordTime, gcsScore, vitals, ventilatorMode, vasoactiveDrugs, urineOutput24h, recordedBy,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof bedNo !== 'string' || !bedNo.trim() ||
    typeof recordTime !== 'string' || !recordTime.trim() ||
    typeof recordedBy !== 'string' || !recordedBy.trim() ||
    typeof urineOutput24h !== 'number' ||
    !gcsScore || typeof gcsScore !== 'object' ||
    !vitals || typeof vitals !== 'object' ||
    !ventilatorMode || typeof ventilatorMode !== 'object' ||
    !Array.isArray(vasoactiveDrugs)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const g = gcsScore as Record<string, unknown>;
  const v = vitals as Record<string, unknown>;
  const vm = ventilatorMode as Record<string, unknown>;

  // GCS 3-15 校验
  const eye = typeof g.eye === 'number' ? g.eye : NaN;
  const verbal = typeof g.verbal === 'number' ? g.verbal : NaN;
  const motor = typeof g.motor === 'number' ? g.motor : NaN;
  const gcsTotal = eye + verbal + motor;
  if (!Number.isFinite(gcsTotal) || gcsTotal < 3 || gcsTotal > 15) {
    return json({ code: 400, message: 'gcs_out_of_range' }, 400);
  }

  // fio2 21-100 校验
  const fio2 = typeof vm.fio2 === 'number' ? vm.fio2 : NaN;
  if (!Number.isFinite(fio2) || fio2 < 21 || fio2 > 100) {
    return json({ code: 400, message: 'fio2_out_of_range' }, 400);
  }

  // peep 0-20 校验
  const peep = typeof vm.peep === 'number' ? vm.peep : NaN;
  if (!Number.isFinite(peep) || peep < 0 || peep > 20) {
    return json({ code: 400, message: 'peep_out_of_range' }, 400);
  }

  const drugs: VasoactiveDrug[] = (vasoactiveDrugs as unknown[]).map((it) => {
    const o = it as Record<string, unknown>;
    return {
      drug: typeof o.drug === 'string' ? o.drug : '',
      rate: typeof o.rate === 'number' ? o.rate : 0,
    };
  });

  const rec = addIcu({
    patientId: patientId.trim(),
    bedNo: bedNo.trim(),
    recordTime: recordTime.trim(),
    gcsScore: { eye, verbal, motor },
    vitals: {
      hr: typeof v.hr === 'number' ? v.hr : 0,
      bp: typeof v.bp === 'string' ? v.bp : '',
      map: typeof v.map === 'number' ? v.map : 0,
      resp: typeof v.resp === 'number' ? v.resp : 0,
      spo2: typeof v.spo2 === 'number' ? v.spo2 : 0,
      temp: typeof v.temp === 'number' ? v.temp : 0,
    },
    ventilatorMode: {
      mode: typeof vm.mode === 'string' ? vm.mode : '',
      peep, fio2,
      rate: typeof vm.rate === 'number' ? vm.rate : 0,
    },
    vasoactiveDrugs: drugs,
    urineOutput24h,
    recordedBy: recordedBy.trim(),
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. GET /api/v1/icu-monitoring/stats ==============================

async function handleIcuStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(icuStore.values());
  const byPatientMap = new Map<string, { sumGcs: number; countGcs: number; sumUrine: number; vasoCount: number }>();

  for (const r of rows) {
    const cur = byPatientMap.get(r.patientId) ?? { sumGcs: 0, countGcs: 0, sumUrine: 0, vasoCount: 0 };
    cur.sumGcs += r.gcsScore.eye + r.gcsScore.verbal + r.gcsScore.motor;
    cur.countGcs += 1;
    cur.sumUrine += r.urineOutput24h;
    if (r.vasoactiveDrugs.length > 0) cur.vasoCount += 1;
    byPatientMap.set(r.patientId, cur);
  }

  const byPatient = Array.from(byPatientMap.entries()).map(([pid, v]) => ({
    patientId: pid,
    avgGCS: v.countGcs > 0 ? Math.round((v.sumGcs / v.countGcs) * 10) / 10 : 0,
    totalUrineOutput24h: v.sumUrine,
    vasoactiveDurationHours: v.vasoCount * 4, // 每 4h 一次监护记录
  }));

  return json(ok({ totalRecords: rows.length, byPatient }), 200);
}

export const m581Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/icu-monitoring/stats', handle: handleIcuStats, auth: true },
  { method: 'GET', path: '/api/v1/icu-monitoring', handle: handleIcuList, auth: true },
  { method: 'POST', path: '/api/v1/icu-monitoring', handle: handleIcuCreate, auth: true },
];
