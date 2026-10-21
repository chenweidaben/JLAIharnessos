/**
 * 健澜科技 jlmedaios - M567 新标准 P6：病案首页管理 3 端点
 *
 * GET  /api/v1/inpatient-records?patientId=&dischargeDate=   列表（createdAt 倒序；过滤参数）
 * POST /api/v1/inpatient-records                          新建草稿（status=draft）
 * POST /api/v1/inpatient-records/:id/verify                病案室审核（pass→verified / revise→仍 draft；已 verified 409 already_verified；已 archived 409 already_archived）
 *
 * 种子 10 份：internal/surgery/pediatrics；dischargeStatus 五档（recovered/improved/not_cured/dead/other）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DischargeStatus = 'recovered' | 'improved' | 'not_cured' | 'dead' | 'other';
const DISCHARGE_STATUS: DischargeStatus[] = ['recovered', 'improved', 'not_cured', 'dead', 'other'];

type InsuranceType = 'self_pay' | 'urban_employee' | 'urban_resident' | 'rural_insurance';
const INSURANCE_TYPES: InsuranceType[] = ['self_pay', 'urban_employee', 'urban_resident', 'rural_insurance'];

type IprStatus = 'draft' | 'verified' | 'archived';
type VerifyResult = 'pass' | 'revise';

interface IprRecord {
  id: string;
  patientId: string;
  admissionDate: string;
  dischargeDate: string;
  mainDiagnosisCode: string;
  mainDiagnosisName: string;
  otherDiagnoses: string[];
  mainOperationCode: string | null;
  dischargeStatus: DischargeStatus;
  totalCost: number;
  insuranceType: InsuranceType;
  status: IprStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  verifyResult: VerifyResult | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const iprStore = new Map<string, IprRecord>();
let iprSeq = 0;

function addIpr(r: Omit<IprRecord, 'id'>): IprRecord {
  iprSeq += 1;
  const rec: IprRecord = { ...r, id: `IPR-${String(iprSeq).padStart(3, '0')}` };
  iprStore.set(rec.id, rec);
  return rec;
}

function seedIpr(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 10 份首页：5 draft + 4 verified + 1 archived
  addIpr({ patientId: 'P-I001', admissionDate: '2026-10-10T00:00:00Z', dischargeDate: '2026-10-18T00:00:00Z', mainDiagnosisCode: 'J18', mainDiagnosisName: '社区获得性肺炎', otherDiagnoses: ['高血压'], mainOperationCode: null, dischargeStatus: 'recovered', totalCost: 8500.0, insuranceType: 'urban_employee', status: 'draft', verifiedBy: null, verifiedAt: null, verifyResult: null, createdAt: iso(60 * 24 * 2) });
  addIpr({ patientId: 'P-I002', admissionDate: '2026-10-09T00:00:00Z', dischargeDate: '2026-10-17T00:00:00Z', mainDiagnosisCode: 'K35', mainDiagnosisName: '急性阑尾炎', otherDiagnoses: [], mainOperationCode: 'OP-001', dischargeStatus: 'recovered', totalCost: 12000.0, insuranceType: 'urban_resident', status: 'draft', verifiedBy: null, verifiedAt: null, verifyResult: null, createdAt: iso(60 * 24 * 3) });
  addIpr({ patientId: 'P-I003', admissionDate: '2026-10-08T00:00:00Z', dischargeDate: '2026-10-16T00:00:00Z', mainDiagnosisCode: 'I21', mainDiagnosisName: '急性 ST 段抬高心梗', otherDiagnoses: ['2 型糖尿病'], mainOperationCode: 'OP-002', dischargeStatus: 'improved', totalCost: 35000.0, insuranceType: 'urban_employee', status: 'draft', verifiedBy: null, verifiedAt: null, verifyResult: null, createdAt: iso(60 * 24 * 4) });
  addIpr({ patientId: 'P-I004', admissionDate: '2026-10-07T00:00:00Z', dischargeDate: '2026-10-15T00:00:00Z', mainDiagnosisCode: 'E11', mainDiagnosisName: '2 型糖尿病伴并发症', otherDiagnoses: [], mainOperationCode: null, dischargeStatus: 'improved', totalCost: 9800.0, insuranceType: 'rural_insurance', status: 'draft', verifiedBy: null, verifiedAt: null, verifyResult: null, createdAt: iso(60 * 24 * 5) });
  addIpr({ patientId: 'P-I005', admissionDate: '2026-10-06T00:00:00Z', dischargeDate: '2026-10-14T00:00:00Z', mainDiagnosisCode: 'J18.9', mainDiagnosisName: '小儿支气管肺炎', otherDiagnoses: [], mainOperationCode: null, dischargeStatus: 'recovered', totalCost: 6200.0, insuranceType: 'urban_resident', status: 'draft', verifiedBy: null, verifiedAt: null, verifyResult: null, createdAt: iso(60 * 24 * 6) });

  // 4 verified
  addIpr({ patientId: 'P-I006', admissionDate: '2026-10-05T00:00:00Z', dischargeDate: '2026-10-12T00:00:00Z', mainDiagnosisCode: 'I50', mainDiagnosisName: '慢性心衰急性加重', otherDiagnoses: ['房颤'], mainOperationCode: null, dischargeStatus: 'not_cured', totalCost: 18000.0, insuranceType: 'urban_employee', status: 'verified', verifiedBy: 'MR-OFFICE-001', verifiedAt: iso(60 * 24 * 1), verifyResult: 'pass', createdAt: iso(60 * 24 * 7) });
  addIpr({ patientId: 'P-I007', admissionDate: '2026-10-04T00:00:00Z', dischargeDate: '2026-10-11T00:00:00Z', mainDiagnosisCode: 'C34', mainDiagnosisName: '肺恶性肿瘤', otherDiagnoses: ['COPD'], mainOperationCode: 'OP-003', dischargeStatus: 'improved', totalCost: 52000.0, insuranceType: 'urban_employee', status: 'verified', verifiedBy: 'MR-OFFICE-001', verifiedAt: iso(60 * 24), verifyResult: 'pass', createdAt: iso(60 * 24 * 8) });
  addIpr({ patientId: 'P-I008', admissionDate: '2026-10-03T00:00:00Z', dischargeDate: '2026-10-10T00:00:00Z', mainDiagnosisCode: 'S72', mainDiagnosisName: '股骨颈骨折', otherDiagnoses: [], mainOperationCode: 'OP-004', dischargeStatus: 'recovered', totalCost: 45000.0, insuranceType: 'urban_resident', status: 'verified', verifiedBy: 'MR-OFFICE-002', verifiedAt: iso(60 * 18), verifyResult: 'pass', createdAt: iso(60 * 24 * 9) });
  addIpr({ patientId: 'P-I009', admissionDate: '2026-10-02T00:00:00Z', dischargeDate: '2026-10-09T00:00:00Z', mainDiagnosisCode: 'A09', mainDiagnosisName: '感染性腹泻', otherDiagnoses: [], mainOperationCode: null, dischargeStatus: 'other', totalCost: 3200.0, insuranceType: 'self_pay', status: 'verified', verifiedBy: 'MR-OFFICE-002', verifiedAt: iso(60 * 12), verifyResult: 'pass', createdAt: iso(60 * 24 * 10) });

  // 1 archived（死亡病例）
  addIpr({ patientId: 'P-I010', admissionDate: '2026-10-01T00:00:00Z', dischargeDate: '2026-10-05T00:00:00Z', mainDiagnosisCode: 'I60', mainDiagnosisName: '蛛网膜下腔出血', otherDiagnoses: ['高血压 III 级'], mainOperationCode: 'OP-005', dischargeStatus: 'dead', totalCost: 68000.0, insuranceType: 'urban_employee', status: 'archived', verifiedBy: 'MR-OFFICE-001', verifiedAt: iso(60 * 24 * 11), verifyResult: 'pass', createdAt: iso(60 * 24 * 12) });
}
seedIpr();

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

// ============================== 1. GET /api/v1/inpatient-records ==============================

async function handleIprList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const dischargeDate = (c.query.get('dischargeDate') ?? '').trim();

  let rows = Array.from(iprStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (dischargeDate) rows = rows.filter((r) => r.dischargeDate.startsWith(dischargeDate));
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/inpatient-records ==============================

async function handleIprCreate(c: Ctx): Promise<Response> {
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
    patientId, admissionDate, dischargeDate, mainDiagnosisCode, mainDiagnosisName,
    otherDiagnoses, mainOperationCode, dischargeStatus, totalCost, insuranceType,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof admissionDate !== 'string' || !admissionDate.trim() ||
    typeof dischargeDate !== 'string' || !dischargeDate.trim() ||
    typeof mainDiagnosisCode !== 'string' || !mainDiagnosisCode.trim() ||
    typeof mainDiagnosisName !== 'string' || !mainDiagnosisName.trim() ||
    !Array.isArray(otherDiagnoses) ||
    typeof dischargeStatus !== 'string' || !DISCHARGE_STATUS.includes(dischargeStatus as DischargeStatus) ||
    typeof totalCost !== 'number' || !Number.isFinite(totalCost) || totalCost < 0 ||
    typeof insuranceType !== 'string' || !INSURANCE_TYPES.includes(insuranceType as InsuranceType)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addIpr({
    patientId: patientId.trim(),
    admissionDate: admissionDate.trim(),
    dischargeDate: dischargeDate.trim(),
    mainDiagnosisCode: mainDiagnosisCode.trim(),
    mainDiagnosisName: mainDiagnosisName.trim(),
    otherDiagnoses: otherDiagnoses as string[],
    mainOperationCode: typeof mainOperationCode === 'string' && mainOperationCode.trim() ? mainOperationCode.trim() : null,
    dischargeStatus: dischargeStatus as DischargeStatus,
    totalCost,
    insuranceType: insuranceType as InsuranceType,
    status: 'draft',
    verifiedBy: null,
    verifiedAt: null,
    verifyResult: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/inpatient-records/:id/verify ==============================

async function handleIprVerify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = iprStore.get(id);
  if (!rec) return notFound('InpatientRecord', id);

  if (rec.status === 'archived') {
    return json({ code: 409, message: 'already_archived' }, 409);
  }
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
  // pass → verified；revise → 仍 draft 待修
  if (verifyResult === 'pass') {
    rec.status = 'verified';
  }
  return json(ok(rec), 200);
}

export const m567Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/inpatient-records', handle: handleIprList, auth: true },
  { method: 'POST', path: '/api/v1/inpatient-records', handle: handleIprCreate, auth: true },
  { method: 'POST', path: '/api/v1/inpatient-records/:id/verify', handle: handleIprVerify, auth: true },
];
