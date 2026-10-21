/**
 * 健澜科技 jlmedaios - M568 新标准 P6：医疗技术授权 3 端点
 *
 * GET  /api/v1/medical-tech-authorizations?doctorId=&techLevel=   列表（createdAt 倒序；过滤；GET 自动 expired 判定）
 * POST /api/v1/medical-tech-authorizations                        新建（同医生同技术未过期未吊销重复 409 already_authorized）
 * POST /api/v1/medical-tech-authorizations/:id/revoke             吊销（重复吊销 409 already_revoked）
 *
 * 种子 15 条：多个医生 × 4 档 techLevel；2 条已过期（expiresAt 已过）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TechLevel = 'level1' | 'level2' | 'level3' | 'level4';
const TECH_LEVELS: TechLevel[] = ['level1', 'level2', 'level3', 'level4'];

interface MtaRecord {
  id: string;
  doctorId: string;
  techName: string;
  techLevel: TechLevel;
  authorizedBy: string;
  authorizedAt: string;
  expiresAt: string;
  expired: boolean;
  revoked: boolean;
  revokeReason: string | null;
  revokedBy: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const mtaStore = new Map<string, MtaRecord>();
let mtaSeq = 0;

function addMta(r: Omit<MtaRecord, 'id'>): MtaRecord {
  mtaSeq += 1;
  const rec: MtaRecord = { ...r, id: `MTA-${String(mtaSeq).padStart(3, '0')}` };
  mtaStore.set(rec.id, rec);
  return rec;
}

function seedMta(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const futureIso = (offsetMin: number): string => new Date(now + offsetMin * 60_000).toISOString();

  // 2 条已过期（expiresAt < now）
  addMta({ doctorId: 'DOC-001', techName: '腹腔镜胆囊切除术', techLevel: 'level3', authorizedBy: 'MED-DIR-001', authorizedAt: iso(60 * 24 * 400), expiresAt: iso(60 * 24 * 30), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 400) });
  addMta({ doctorId: 'DOC-002', techName: '支气管镜检查', techLevel: 'level2', authorizedBy: 'MED-DIR-002', authorizedAt: iso(60 * 24 * 380), expiresAt: iso(60 * 24 * 10), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 380) });

  // 13 条未过期
  addMta({ doctorId: 'DOC-001', techName: '腹腔镜阑尾切除术', techLevel: 'level3', authorizedBy: 'MED-DIR-001', authorizedAt: iso(60 * 24 * 300), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 300) });
  addMta({ doctorId: 'DOC-002', techName: '胃镜检查', techLevel: 'level2', authorizedBy: 'MED-DIR-002', authorizedAt: iso(60 * 24 * 280), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 280) });
  addMta({ doctorId: 'DOC-003', techName: '冠脉造影', techLevel: 'level4', authorizedBy: 'MED-DIR-003', authorizedAt: iso(60 * 24 * 260), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 260) });
  addMta({ doctorId: 'DOC-003', techName: 'PCI 支架植入', techLevel: 'level4', authorizedBy: 'MED-DIR-003', authorizedAt: iso(60 * 24 * 250), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 250) });
  addMta({ doctorId: 'DOC-004', techName: '人工髋关节置换', techLevel: 'level4', authorizedBy: 'MED-DIR-004', authorizedAt: iso(60 * 24 * 240), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 240) });
  addMta({ doctorId: 'DOC-004', techName: '膝关节镜', techLevel: 'level3', authorizedBy: 'MED-DIR-004', authorizedAt: iso(60 * 24 * 230), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 230) });
  addMta({ doctorId: 'DOC-005', techName: '无痛分娩', techLevel: 'level2', authorizedBy: 'MED-DIR-005', authorizedAt: iso(60 * 24 * 220), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 220) });
  addMta({ doctorId: 'DOC-005', techName: '剖宫产', techLevel: 'level3', authorizedBy: 'MED-DIR-005', authorizedAt: iso(60 * 24 * 210), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 210) });
  addMta({ doctorId: 'DOC-006', techName: '小儿包皮环切', techLevel: 'level1', authorizedBy: 'MED-DIR-006', authorizedAt: iso(60 * 24 * 200), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 200) });
  addMta({ doctorId: 'DOC-007', techName: '血液透析导管置入', techLevel: 'level3', authorizedBy: 'MED-DIR-007', authorizedAt: iso(60 * 24 * 190), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 190) });
  addMta({ doctorId: 'DOC-008', techName: '深静脉置管', techLevel: 'level2', authorizedBy: 'MED-DIR-008', authorizedAt: iso(60 * 24 * 180), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 180) });
  addMta({ doctorId: 'DOC-009', techName: '脑外科开颅', techLevel: 'level4', authorizedBy: 'MED-DIR-009', authorizedAt: iso(60 * 24 * 170), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 170) });
  addMta({ doctorId: 'DOC-010', techName: '白内障超声乳化', techLevel: 'level2', authorizedBy: 'MED-DIR-010', authorizedAt: iso(60 * 24 * 160), expiresAt: futureIso(60 * 24 * 365), expired: false, revoked: false, revokeReason: null, revokedBy: null, revokedAt: null, createdAt: iso(60 * 24 * 160) });
}
seedMta();

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

/** GET 时实时计算 expired（不落库） */
function withExpired(r: MtaRecord): MtaRecord {
  const nowMs = Date.now();
  const expMs = Date.parse(r.expiresAt);
  const expired = Number.isFinite(expMs) && expMs < nowMs;
  return { ...r, expired };
}

// ============================== 1. GET /api/v1/medical-tech-authorizations ==============================

async function handleMtaList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const doctorId = (c.query.get('doctorId') ?? '').trim();
  const techLevel = (c.query.get('techLevel') ?? '').trim();

  let rows = Array.from(mtaStore.values());
  if (doctorId) rows = rows.filter((r) => r.doctorId === doctorId);
  if (techLevel) rows = rows.filter((r) => r.techLevel === techLevel);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const items = rows.map(withExpired);
  return json(ok({ items, totalCount: items.length }), 200);
}

// ============================== 2. POST /api/v1/medical-tech-authorizations ==============================

async function handleMtaCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { doctorId, techName, techLevel, authorizedBy, authorizedAt, expiresAt } = body as Record<string, unknown>;

  if (
    typeof doctorId !== 'string' || !doctorId.trim() ||
    typeof techName !== 'string' || !techName.trim() ||
    typeof techLevel !== 'string' || !TECH_LEVELS.includes(techLevel as TechLevel) ||
    typeof authorizedBy !== 'string' || !authorizedBy.trim() ||
    typeof authorizedAt !== 'string' || !authorizedAt.trim() ||
    typeof expiresAt !== 'string' || !expiresAt.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 同 doctorId 同 techName 已有未过期未吊销 → 409
  const nowMs = Date.now();
  const dup = Array.from(mtaStore.values()).some((r) => {
    if (r.doctorId !== doctorId.trim() || r.techName !== techName.trim()) return false;
    if (r.revoked) return false;
    const expMs = Date.parse(r.expiresAt);
    return Number.isFinite(expMs) && expMs >= nowMs;
  });
  if (dup) return json({ code: 409, message: 'already_authorized' }, 409);

  const rec = addMta({
    doctorId: doctorId.trim(),
    techName: techName.trim(),
    techLevel: techLevel as TechLevel,
    authorizedBy: authorizedBy.trim(),
    authorizedAt: authorizedAt.trim(),
    expiresAt: expiresAt.trim(),
    expired: false,
    revoked: false,
    revokeReason: null,
    revokedBy: null,
    revokedAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/medical-tech-authorizations/:id/revoke ==============================

async function handleMtaRevoke(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = mtaStore.get(id);
  if (!rec) return notFound('MedicalTechAuthorization', id);

  if (rec.revoked) {
    return json({ code: 409, message: 'already_revoked' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const revokeReason = body.revokeReason;
  const revokedBy = body.revokedBy;

  if (
    typeof revokeReason !== 'string' || !revokeReason.trim() ||
    typeof revokedBy !== 'string' || !revokedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.revoked = true;
  rec.revokeReason = revokeReason.trim();
  rec.revokedBy = revokedBy.trim();
  rec.revokedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m568Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/medical-tech-authorizations', handle: handleMtaList, auth: true },
  { method: 'POST', path: '/api/v1/medical-tech-authorizations', handle: handleMtaCreate, auth: true },
  { method: 'POST', path: '/api/v1/medical-tech-authorizations/:id/revoke', handle: handleMtaRevoke, auth: true },
];
