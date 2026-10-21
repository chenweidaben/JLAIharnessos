/**
 * 健澜科技 jlmedaios - M573 新标准 P7：手术知情同意书 3 端点
 *
 * GET  /api/v1/surgical-consents?operationId=&patientId=   列表（createdAt 倒序；过滤）
 * POST /api/v1/surgical-consents                          新建（签名校验 + 有效期校验）
 * POST /api/v1/surgical-consents/:id/verify              医务审核（draft→verified pass；revise 仍 draft；重复 409 already_verified）
 *
 * 种子 10 份：含 2 份需补签（缺签名或有效期问题，status=revise/draft 待修）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ScStatus = 'draft' | 'verified' | 'revise';
type VerifyResult = 'pass' | 'revise';

interface ConsentItem {
  item: string;
  explainedToPatient: boolean;
}

interface ScRecord {
  id: string;
  patientId: string;
  operationId: string;
  surgeonName: string;
  surgeonTitle: string;
  consentItems: ConsentItem[];
  patientSignature: string | null;
  guardianSignature: string | null;
  signatureDate: string;
  consentValidUntil: string;
  operationDate: string;
  status: ScStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verifyResult: VerifyResult | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const scStore = new Map<string, ScRecord>();
let scSeq = 0;

function addSc(r: Omit<ScRecord, 'id'>): ScRecord {
  scSeq += 1;
  const rec: ScRecord = { ...r, id: `SC-${String(scSeq).padStart(3, '0')}` };
  scStore.set(rec.id, rec);
  return rec;
}

function seedSc(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const futureIso = (offsetMin: number): string => new Date(now + offsetMin * 60_000).toISOString();

  const itemsStandard: ConsentItem[] = [
    { item: '手术风险告知', explainedToPatient: true },
    { item: '替代方案告知', explainedToPatient: true },
    { item: '麻醉风险告知', explainedToPatient: true },
  ];

  // 8 份正常（patientSignature 非空，consentValidUntil > operationDate）
  for (let i = 1; i <= 8; i++) {
    const status: ScStatus = i <= 3 ? 'draft' : i <= 6 ? 'verified' : 'revise';
    addSc({
      patientId: `P-S${String(i).padStart(3, '0')}`,
      operationId: `OP-${String(i).padStart(3, '0')}`,
      surgeonName: `SURGEON-${i}`,
      surgeonTitle: i % 2 === 0 ? '主任医师' : '副主任医师',
      consentItems: itemsStandard,
      patientSignature: `患者签名${i}`,
      guardianSignature: i % 3 === 0 ? `家属签名${i}` : null,
      signatureDate: iso(60 * 24 * (10 - i)),
      consentValidUntil: futureIso(60 * 24 * 30),
      operationDate: futureIso(60 * 24 * 7),
      status,
      verifiedBy: status === 'draft' ? null : 'MED-AFFAIRS-001',
      verifiedAt: status === 'draft' ? null : iso(60 * 24 * (10 - i) - 60),
      verifyResult: status === 'draft' ? null : status === 'revise' ? 'revise' : 'pass',
      createdAt: iso(60 * 24 * (10 - i)),
    });
  }

  // 1 份需补签（draft，patientSignature 与 guardianSignature 都空，待补）
  addSc({
    patientId: 'P-S009',
    operationId: 'OP-009',
    surgeonName: 'SURGEON-9',
    surgeonTitle: '主治医师',
    consentItems: itemsStandard,
    patientSignature: null,
    guardianSignature: null,
    signatureDate: iso(60 * 24 * 1),
    consentValidUntil: futureIso(60 * 24 * 30),
    operationDate: futureIso(60 * 24 * 3),
    status: 'draft',
    verifiedBy: null,
    verifiedAt: null,
    verifyResult: null,
    createdAt: iso(60 * 24 * 1),
  });

  // 1 份 revise（医务审核要求补签，仍 draft 待修）
  addSc({
    patientId: 'P-S010',
    operationId: 'OP-010',
    surgeonName: 'SURGEON-10',
    surgeonTitle: '主任医师',
    consentItems: itemsStandard,
    patientSignature: '患者签名10',
    guardianSignature: null,
    signatureDate: iso(60 * 24 * 2),
    consentValidUntil: futureIso(60 * 24 * 30),
    operationDate: futureIso(60 * 24 * 5),
    status: 'revise',
    verifiedBy: 'MED-AFFAIRS-002',
    verifiedAt: iso(60 * 24 * 1),
    verifyResult: 'revise',
    createdAt: iso(60 * 24 * 2),
  });
}
seedSc();

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

// ============================== 1. GET /api/v1/surgical-consents ==============================

async function handleScList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const operationId = (c.query.get('operationId') ?? '').trim();
  const patientId = (c.query.get('patientId') ?? '').trim();

  let rows = Array.from(scStore.values());
  if (operationId) rows = rows.filter((r) => r.operationId === operationId);
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/surgical-consents ==============================

async function handleScCreate(c: Ctx): Promise<Response> {
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
    patientId, operationId, surgeonName, surgeonTitle, consentItems,
    patientSignature, guardianSignature, signatureDate, consentValidUntil, operationDate,
  } = body as Record<string, unknown>;

  // 必填字段校验
  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof operationId !== 'string' || !operationId.trim() ||
    typeof surgeonName !== 'string' || !surgeonName.trim() ||
    typeof surgeonTitle !== 'string' || !surgeonTitle.trim() ||
    !Array.isArray(consentItems) || consentItems.length === 0 ||
    typeof signatureDate !== 'string' || !signatureDate.trim() ||
    typeof consentValidUntil !== 'string' || !consentValidUntil.trim() ||
    typeof operationDate !== 'string' || !operationDate.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // 签名校验：patientSignature 和 guardianSignature 至少一个非空
  const hasPatientSig = typeof patientSignature === 'string' && patientSignature.trim().length > 0;
  const hasGuardianSig = typeof guardianSignature === 'string' && guardianSignature.trim().length > 0;
  if (!hasPatientSig && !hasGuardianSig) {
    return json({ code: 400, message: 'at_least_one_signature_required' }, 400);
  }

  // 有效期校验：consentValidUntil 必须晚于 operationDate
  const validUntilMs = Date.parse(consentValidUntil);
  const opDateMs = Date.parse(operationDate);
  if (Number.isFinite(validUntilMs) && Number.isFinite(opDateMs) && validUntilMs < opDateMs) {
    return json({ code: 400, message: 'consent_expires_before_surgery' }, 400);
  }

  // consentItems 形状校验
  const items: ConsentItem[] = (consentItems as unknown[]).map((it) => {
    const o = it as Record<string, unknown>;
    return {
      item: typeof o.item === 'string' ? o.item : '',
      explainedToPatient: Boolean(o.explainedToPatient),
    };
  });

  const rec = addSc({
    patientId: patientId.trim(),
    operationId: operationId.trim(),
    surgeonName: surgeonName.trim(),
    surgeonTitle: surgeonTitle.trim(),
    consentItems: items,
    patientSignature: hasPatientSig ? (patientSignature as string).trim() : null,
    guardianSignature: hasGuardianSig ? (guardianSignature as string).trim() : null,
    signatureDate: signatureDate.trim(),
    consentValidUntil: consentValidUntil.trim(),
    operationDate: operationDate.trim(),
    status: 'draft',
    verifiedBy: null,
    verifiedAt: null,
    verifyResult: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/surgical-consents/:id/verify ==============================

async function handleScVerify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = scStore.get(id);
  if (!rec) return notFound('SurgicalConsent', id);

  if (rec.status === 'verified') {
    return json({ code: 409, message: 'already_verified' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const verifiedBy = body.verifiedBy;
  const verifyResult = body.verifyResult;

  if (
    typeof verifiedBy !== 'string' || !verifiedBy.trim() ||
    typeof verifyResult !== 'string' || !['pass', 'revise'].includes(verifyResult)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.verifiedBy = verifiedBy.trim();
  rec.verifiedAt = new Date().toISOString();
  rec.verifyResult = verifyResult as VerifyResult;
  // pass → verified；revise → 仍 draft/待修（工单明确 revise 仍 draft）
  rec.status = verifyResult === 'pass' ? 'verified' : 'revise';
  return json(ok(rec), 200);
}

export const m573Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgical-consents', handle: handleScList, auth: true },
  { method: 'POST', path: '/api/v1/surgical-consents', handle: handleScCreate, auth: true },
  { method: 'POST', path: '/api/v1/surgical-consents/:id/verify', handle: handleScVerify, auth: true },
];
