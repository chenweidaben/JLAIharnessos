/**
 * 健澜科技 jlmedaios - M565 新标准 P5：手术麻醉记录闭环 3 端点
 *
 * GET  /api/v1/anesthesia-records?operationId=   列表（createdAt 倒序；过滤参数）
 * POST /api/v1/anesthesia-records               新建（同 operationId 重复 409 already_recorded）
 * POST /api/v1/anesthesia-records/:id/recover  PACU 复苏（Aldrete 0-10 越界 400；dischargeToWard=true 但 score<9→400；已 recovered 409）
 *
 * 种子 8 条：general/regional/local 三型 + ASA I-V 分布。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type AnesthesiaType = 'general' | 'regional' | 'local';
const ANES_TYPES: AnesthesiaType[] = ['general', 'regional', 'local'];

type AsaLevel = 'I' | 'II' | 'III' | 'IV' | 'V';
const ASA_LEVELS: AsaLevel[] = ['I', 'II', 'III', 'IV', 'V'];

type AnesStatus = 'recorded' | 'recovered';

interface VitalsSample {
  bp: string;
  hr: number;
  spo2: number;
  etco2: number;
}

interface AnesRecord {
  id: string;
  operationId: string;
  anesthesiaType: AnesthesiaType;
  anesthetistId: string;
  inductionTime: string;
  maintenanceTime: string;
  recoveryTime: string;
  asa: AsaLevel;
  vitalsDuringSurgery: VitalsSample[];
  status: AnesStatus;
  recoveryScore: number | null;
  dischargeToWard: boolean | null;
  timeInPACU: number | null;
  recoveredBy: string | null;
  recoveredAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const anesStore = new Map<string, AnesRecord>();
let anesSeq = 0;

function addAnes(r: Omit<AnesRecord, 'id'>): AnesRecord {
  anesSeq += 1;
  const rec: AnesRecord = { ...r, id: `ANES-${String(anesSeq).padStart(3, '0')}` };
  anesStore.set(rec.id, rec);
  return rec;
}

function seedAnes(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 8 条：3 general + 3 regional + 2 local；ASA I-V 分散
  addAnes({ operationId: 'OP-001', anesthesiaType: 'general', anesthetistId: 'ANESTH-001', inductionTime: iso(60 * 24 * 10), maintenanceTime: iso(60 * 24 * 9), recoveryTime: iso(60 * 24 * 8), asa: 'I', vitalsDuringSurgery: [{ bp: '120/75', hr: 72, spo2: 99, etco2: 35 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 10) });
  addAnes({ operationId: 'OP-002', anesthesiaType: 'general', anesthetistId: 'ANESTH-001', inductionTime: iso(60 * 24 * 9), maintenanceTime: iso(60 * 24 * 8), recoveryTime: iso(60 * 24 * 7), asa: 'II', vitalsDuringSurgery: [{ bp: '130/80', hr: 78, spo2: 98, etco2: 38 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 9) });
  addAnes({ operationId: 'OP-003', anesthesiaType: 'general', anesthetistId: 'ANESTH-002', inductionTime: iso(60 * 24 * 8), maintenanceTime: iso(60 * 24 * 7), recoveryTime: iso(60 * 24 * 6), asa: 'III', vitalsDuringSurgery: [{ bp: '140/85', hr: 85, spo2: 96, etco2: 40 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 8) });
  addAnes({ operationId: 'OP-004', anesthesiaType: 'regional', anesthetistId: 'ANESTH-002', inductionTime: iso(60 * 24 * 7), maintenanceTime: iso(60 * 24 * 6), recoveryTime: iso(60 * 24 * 5), asa: 'II', vitalsDuringSurgery: [{ bp: '125/78', hr: 70, spo2: 99, etco2: 32 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 7) });
  addAnes({ operationId: 'OP-005', anesthesiaType: 'regional', anesthetistId: 'ANESTH-003', inductionTime: iso(60 * 24 * 6), maintenanceTime: iso(60 * 24 * 5), recoveryTime: iso(60 * 24 * 4), asa: 'III', vitalsDuringSurgery: [{ bp: '135/82', hr: 80, spo2: 97, etco2: 36 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 6) });
  addAnes({ operationId: 'OP-006', anesthesiaType: 'regional', anesthetistId: 'ANESTH-003', inductionTime: iso(60 * 24 * 5), maintenanceTime: iso(60 * 24 * 4), recoveryTime: iso(60 * 24 * 3), asa: 'IV', vitalsDuringSurgery: [{ bp: '150/90', hr: 90, spo2: 94, etco2: 42 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 5) });
  addAnes({ operationId: 'OP-007', anesthesiaType: 'local', anesthetistId: 'ANESTH-001', inductionTime: iso(60 * 24 * 4), maintenanceTime: iso(60 * 24 * 3), recoveryTime: iso(60 * 24 * 2), asa: 'I', vitalsDuringSurgery: [{ bp: '118/72', hr: 68, spo2: 99, etco2: 30 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 4) });
  addAnes({ operationId: 'OP-008', anesthesiaType: 'local', anesthetistId: 'ANESTH-002', inductionTime: iso(60 * 24 * 3), maintenanceTime: iso(60 * 24 * 2), recoveryTime: iso(60 * 24), asa: 'V', vitalsDuringSurgery: [{ bp: '160/95', hr: 95, spo2: 92, etco2: 45 }], status: 'recorded', recoveryScore: null, dischargeToWard: null, timeInPACU: null, recoveredBy: null, recoveredAt: null, createdAt: iso(60 * 24 * 3) });
}
seedAnes();

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

// ============================== 1. GET /api/v1/anesthesia-records ==============================

async function handleAnesList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const operationId = (c.query.get('operationId') ?? '').trim();

  let rows = Array.from(anesStore.values());
  if (operationId) rows = rows.filter((r) => r.operationId === operationId);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/anesthesia-records ==============================

async function handleAnesCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { operationId, anesthesiaType, anesthetistId, inductionTime, maintenanceTime, recoveryTime, asa, vitalsDuringSurgery } = body as Record<string, unknown>;

  if (
    typeof operationId !== 'string' || !operationId.trim() ||
    typeof anesthesiaType !== 'string' || !ANES_TYPES.includes(anesthesiaType as AnesthesiaType) ||
    typeof anesthetistId !== 'string' || !anesthetistId.trim() ||
    typeof inductionTime !== 'string' || !inductionTime.trim() ||
    typeof maintenanceTime !== 'string' || !maintenanceTime.trim() ||
    typeof recoveryTime !== 'string' || !recoveryTime.trim() ||
    typeof asa !== 'string' || !ASA_LEVELS.includes(asa as AsaLevel) ||
    !Array.isArray(vitalsDuringSurgery)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 同 operationId 已有 recorded 状态 → 409
  const dup = Array.from(anesStore.values()).some(
    (r) => r.operationId === operationId.trim() && r.status === 'recorded',
  );
  if (dup) return json({ code: 409, message: 'already_recorded' }, 409);

  const rec = addAnes({
    operationId: operationId.trim(),
    anesthesiaType: anesthesiaType as AnesthesiaType,
    anesthetistId: anesthetistId.trim(),
    inductionTime: inductionTime.trim(),
    maintenanceTime: maintenanceTime.trim(),
    recoveryTime: recoveryTime.trim(),
    asa: asa as AsaLevel,
    vitalsDuringSurgery: vitalsDuringSurgery as VitalsSample[],
    status: 'recorded',
    recoveryScore: null,
    dischargeToWard: null,
    timeInPACU: null,
    recoveredBy: null,
    recoveredAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/anesthesia-records/:id/recover ==============================

async function handleAnesRecover(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = anesStore.get(id);
  if (!rec) return notFound('AnesthesiaRecord', id);

  if (rec.status === 'recovered') {
    return json({ code: 409, message: 'already_recovered' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const recoveryScore = body.recoveryScore;
  const dischargeToWard = body.dischargeToWard;
  const timeInPACU = body.timeInPACU;
  const recoveredBy = body.recoveredBy;

  if (
    typeof recoveryScore !== 'number' || !Number.isFinite(recoveryScore) || recoveryScore < 0 || recoveryScore > 10 ||
    typeof dischargeToWard !== 'boolean' ||
    typeof timeInPACU !== 'number' || !Number.isFinite(timeInPACU) || timeInPACU < 0 ||
    typeof recoveredBy !== 'string' || !recoveredBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // Aldrete 出室校验：dischargeToWard=true 但 score<9 → 400
  if (dischargeToWard && recoveryScore < 9) {
    return json({ code: 400, message: 'aldrete_too_low_for_discharge' }, 400);
  }

  rec.status = 'recovered';
  rec.recoveryScore = recoveryScore;
  rec.dischargeToWard = dischargeToWard;
  rec.timeInPACU = timeInPACU;
  rec.recoveredBy = recoveredBy.trim();
  rec.recoveredAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m565Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/anesthesia-records', handle: handleAnesList, auth: true },
  { method: 'POST', path: '/api/v1/anesthesia-records', handle: handleAnesCreate, auth: true },
  { method: 'POST', path: '/api/v1/anesthesia-records/:id/recover', handle: handleAnesRecover, auth: true },
];
