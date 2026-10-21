/**
 * 健澜科技 jlmedaios - M592 新标准 P12：用药指导 4 端点
 *
 * GET    /api/v1/medication-guidance?patientId=&medication=   列表（counseledAt 倒序）
 * POST   /api/v1/medication-guidance                          新建指导
 * POST   /api/v1/medication-guidance/:id/adherence            依从性记录（adherent=no 必须配 missedDoses）
 * GET    /api/v1/medication-guidance/stats                    双维度汇总（byPatient + byMedication）
 *
 * 种子 40 条用药指导：含 15 条依从性记录（adherent yes/partial/no 混合）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Route = 'oral' | 'inhalation' | 'injection' | 'topical';
type Timing = 'before_meal' | 'after_meal' | 'before_sleep' | 'with_meal';
type Adherent = 'yes' | 'partial' | 'no';

interface Adherence {
  adherent: Adherent | null;
  missedDoses: number | null;
  sideEffectExperienced: boolean | null;
  recordedAt: string | null;
}

interface MgRecord {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  route: Route;
  timing: Timing;
  sideEffects: string[];
  precautions: string[];
  counseledBy: string;
  counseledAt: string;
  adherence: Adherence;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const mgStore = new Map<string, MgRecord>();
let mgSeq = 0;

function addMg(r: Omit<MgRecord, 'id'>): MgRecord {
  mgSeq += 1;
  const rec: MgRecord = { ...r, id: `MG-${String(mgSeq).padStart(3, '0')}` };
  mgStore.set(rec.id, rec);
  return rec;
}

function seedMg(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const routes: Route[] = ['oral', 'inhalation', 'injection', 'topical'];
  const timings: Timing[] = ['before_meal', 'after_meal', 'before_sleep', 'with_meal'];
  const meds = ['阿莫西林', '布洛芬', '二甲双胍', '氨氯地平', '阿托伐他汀', '氯吡格雷', '奥美拉唑', '依那普利'];
  const adherents: Adherent[] = ['yes', 'partial', 'no'];

  for (let i = 1; i <= 40; i++) {
    const hasAdherence = i <= 15; // 前 15 条有依从性记录
    const adherent: Adherent | null = hasAdherence ? adherents[i % 3] : null;
    const missedDoses: number | null = adherent === 'no' ? 3 : adherent === 'partial' ? 1 : adherent === 'yes' ? 0 : null;
    addMg({
      patientId: `P-M${String(i).padStart(3, '0')}`,
      medicationName: meds[i % meds.length],
      dosage: `${(i % 3) + 1}片`,
      frequency: ['qd', 'bid', 'tid'][i % 3],
      route: routes[i % 4],
      timing: timings[i % 4],
      sideEffects: i % 2 === 0 ? ['恶心'] : [],
      precautions: i % 3 === 0 ? ['避免饮酒'] : [],
      counseledBy: `DOC-MG-${(i % 10) + 1}`,
      counseledAt: iso(60 * 24 * (30 - i)),
      adherence: {
        adherent,
        missedDoses,
        sideEffectExperienced: hasAdherence ? (i % 2 === 0) : null,
        recordedAt: hasAdherence ? iso(60 * 24 * (30 - i) - 60) : null,
      },
      createdAt: iso(60 * 24 * (30 - i)),
    });
  }
}
seedMg();

const VALID_ROUTES: Route[] = ['oral', 'inhalation', 'injection', 'topical'];
const VALID_TIMINGS: Timing[] = ['before_meal', 'after_meal', 'before_sleep', 'with_meal'];
const VALID_ADHERENTS: Adherent[] = ['yes', 'partial', 'no'];

function notFound(kind: string, id: string): Response {
  return json(
    {
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found', diagnostics: `${kind} ${id} not found` }],
    },
    404,
  );
}

// ============================== 1. GET /api/v1/medication-guidance ==============================

async function handleMgList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const medication = (c.query.get('medication') ?? '').trim();
  let rows = Array.from(mgStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (medication) rows = rows.filter((r) => r.medicationName === medication);
  rows = rows.sort((a, b) => b.counseledAt.localeCompare(a.counseledAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/medication-guidance ==============================

async function handleMgCreate(c: Ctx): Promise<Response> {
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
    patientId, medicationName, dosage, frequency, route, timing, sideEffects, precautions, counseledBy,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof medicationName !== 'string' || !medicationName.trim() ||
    typeof dosage !== 'string' || !dosage.trim() ||
    typeof frequency !== 'string' || !frequency.trim() ||
    typeof counseledBy !== 'string' || !counseledBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  if (typeof route !== 'string' || !VALID_ROUTES.includes(route as Route)) {
    return json({ code: 400, message: 'invalid_route' }, 400);
  }
  if (typeof timing !== 'string' || !VALID_TIMINGS.includes(timing as Timing)) {
    return json({ code: 400, message: 'invalid_timing' }, 400);
  }

  const now = new Date().toISOString();
  const rec = addMg({
    patientId: patientId.trim(),
    medicationName: medicationName.trim(),
    dosage: dosage.trim(),
    frequency: frequency.trim(),
    route: route as Route,
    timing: timing as Timing,
    sideEffects: Array.isArray(sideEffects) ? sideEffects.map(String) : [],
    precautions: Array.isArray(precautions) ? precautions.map(String) : [],
    counseledBy: counseledBy.trim(),
    counseledAt: now,
    adherence: { adherent: null, missedDoses: null, sideEffectExperienced: null, recordedAt: null },
    createdAt: now,
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/medication-guidance/:id/adherence ==============================

async function handleMgAdherence(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = mgStore.get(id);
  if (!rec) return notFound('MedicationGuidance', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { adherent, missedDoses, sideEffectExperienced } = body as Record<string, unknown>;

  if (typeof adherent !== 'string' || !VALID_ADHERENTS.includes(adherent as Adherent)) {
    return json({ code: 400, message: 'invalid_adherent' }, 400);
  }

  // adherent='no' 必须配 missedDoses > 0
  if (adherent === 'no') {
    if (typeof missedDoses !== 'number' || missedDoses <= 0) {
      return json({ code: 400, message: 'missed_doses_required_for_nonadherent' }, 400);
    }
  }
  // adherent='yes' 时 missedDoses 必须为 0 或 null
  if (adherent === 'yes' && typeof missedDoses === 'number' && missedDoses > 0) {
    return json({ code: 400, message: 'missed_doses_must_be_zero_for_adherent' }, 400);
  }

  rec.adherence = {
    adherent: adherent as Adherent,
    missedDoses: typeof missedDoses === 'number' ? missedDoses : null,
    sideEffectExperienced: typeof sideEffectExperienced === 'boolean' ? sideEffectExperienced : null,
    recordedAt: new Date().toISOString(),
  };
  return json(ok(rec), 200);
}

// ============================== 4. GET /api/v1/medication-guidance/stats ==============================

async function handleMgStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rows = Array.from(mgStore.values());
  const total = rows.length;
  const adherenceRecords = rows.filter((r) => r.adherence.adherent !== null).length;

  // byPatient
  const pMap = new Map<string, { total: number; adherentYes: number }>();
  for (const r of rows) {
    const cur = pMap.get(r.patientId) ?? { total: 0, adherentYes: 0 };
    cur.total += 1;
    if (r.adherence.adherent === 'yes') cur.adherentYes += 1;
    pMap.set(r.patientId, cur);
  }
  const byPatient = Array.from(pMap.entries()).map(([patientId, v]) => ({
    patientId,
    total: v.total,
    adherenceRate: v.total > 0 ? Math.round((v.adherentYes / v.total) * 100) : 0,
  }));

  // byMedication
  const mMap = new Map<string, { total: number; adherentYes: number }>();
  for (const r of rows) {
    const cur = mMap.get(r.medicationName) ?? { total: 0, adherentYes: 0 };
    cur.total += 1;
    if (r.adherence.adherent === 'yes') cur.adherentYes += 1;
    mMap.set(r.medicationName, cur);
  }
  const byMedication = Array.from(mMap.entries()).map(([medicationName, v]) => ({
    medicationName,
    total: v.total,
    adherenceRate: v.total > 0 ? Math.round((v.adherentYes / v.total) * 100) : 0,
  }));

  return json(ok({
    totalGuidances: total,
    totalAdherenceRecords: adherenceRecords,
    byPatient,
    byMedication,
  }), 200);
}

export const m592Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medication-guidance', handle: handleMgList, auth: true },
  { method: 'POST', path: '/api/v1/medication-guidance', handle: handleMgCreate, auth: true },
  { method: 'POST', path: '/api/v1/medication-guidance/:id/adherence', handle: handleMgAdherence, auth: true },
  { method: 'GET', path: '/api/v1/medication-guidance/stats', handle: handleMgStats, auth: true },
];
