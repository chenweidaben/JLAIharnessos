/**
 * 健澜科技 jlmedaios - M553 新标准 P2：院感上报闭环 3 端点
 *
 * GET  /api/v1/infection-reports?deptCode=&type=   列表（reportedAt 倒序；deptCode/infectionType 双过滤）
 * POST /api/v1/infection-reports                  新建（status='reported'、labConfirmed）
 * POST /api/v1/infection-reports/:id/close        结案（reported→closed；已 closed → 409 already_closed）
 *
 * 种子 8 条：5 种感染类型（vAP/CLABSI/CAUTI/SSI/CDI），6 条已结案 + 2 条未结案。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type InfectionType = 'vAP' | 'CLABSI' | 'CAUTI' | 'SSI' | 'CDI';
const INFECTION_TYPES: InfectionType[] = ['vAP', 'CLABSI', 'CAUTI', 'SSI', 'CDI'];

type InStatus = 'reported' | 'closed';

interface InfectionRecord {
  id: string;
  patientId: string;
  infectionType: InfectionType;
  onsetDate: string;
  deptCode: string;
  reportedBy: string;
  labConfirmed: boolean;
  status: InStatus;
  disposition: string | null;
  closedAt: string | null;
  reportedAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const infStore = new Map<string, InfectionRecord>();
let infSeq = 0;

function addInf(r: Omit<InfectionRecord, 'id'>): InfectionRecord {
  infSeq += 1;
  const rec: InfectionRecord = { ...r, id: `INF-${String(infSeq).padStart(3, '0')}` };
  infStore.set(rec.id, rec);
  return rec;
}

function seedInf(): void {
  const now = Date.now();
  const isoRep = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const isoOnset = (offsetDays: number): string => new Date(now - offsetDays * 86_400_000).toISOString();

  // 6 条已结案
  addInf({ patientId: 'P-I001', infectionType: 'vAP', onsetDate: isoOnset(14), deptCode: 'ICU', reportedBy: 'NURSE-ICU-001', labConfirmed: true, status: 'closed', disposition: '停用机械通气，抗感染 14 天治愈', closedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 72) });
  addInf({ patientId: 'P-I002', infectionType: 'CLABSI', onsetDate: isoOnset(10), deptCode: 'ICU', reportedBy: 'NURSE-ICU-002', labConfirmed: true, status: 'closed', disposition: '拔除中心静脉导管，抗感染 7 天', closedAt: isoRep(60 * 36), reportedAt: isoRep(60 * 60) });
  addInf({ patientId: 'P-I003', infectionType: 'CAUTI', onsetDate: isoOnset(7), deptCode: 'internal', reportedBy: 'NURSE-IN-001', labConfirmed: true, status: 'closed', disposition: '拔除尿管，喹诺酮类 5 天', closedAt: isoRep(60 * 24), reportedAt: isoRep(60 * 48) });
  addInf({ patientId: 'P-I004', infectionType: 'SSI', onsetDate: isoOnset(5), deptCode: 'surgery', reportedBy: 'SURGEON-001', labConfirmed: false, status: 'closed', disposition: '切口清创换药，二代头孢 7 天', closedAt: isoRep(60 * 20), reportedAt: isoRep(60 * 36) });
  addInf({ patientId: 'P-I005', infectionType: 'CDI', onsetDate: isoOnset(3), deptCode: 'internal', reportedBy: 'PHYSICIAN-001', labConfirmed: true, status: 'closed', disposition: '停用广谱抗生素，口服万古霉素 10 天', closedAt: isoRep(60 * 12), reportedAt: isoRep(60 * 24) });
  addInf({ patientId: 'P-I006', infectionType: 'vAP', onsetDate: isoOnset(2), deptCode: 'ICU', reportedBy: 'NURSE-ICU-001', labConfirmed: true, status: 'closed', disposition: '俯卧位通气+哌拉西林他唑巴坦 10 天', closedAt: isoRep(60 * 6), reportedAt: isoRep(60 * 18) });

  // 2 条未结案
  addInf({ patientId: 'P-I007', infectionType: 'CLABSI', onsetDate: isoOnset(1), deptCode: 'ICU', reportedBy: 'NURSE-ICU-003', labConfirmed: true, status: 'reported', disposition: null, closedAt: null, reportedAt: isoRep(60 * 4) });
  addInf({ patientId: 'P-I008', infectionType: 'CAUTI', onsetDate: isoOnset(0), deptCode: 'urology', reportedBy: 'NURSE-URO-001', labConfirmed: false, status: 'reported', disposition: null, closedAt: null, reportedAt: isoRep(30) });
}
seedInf();

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

// ============================== 1. GET /api/v1/infection-reports ==============================

async function handleInfList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const type = (c.query.get('type') ?? '').trim();

  let rows = Array.from(infStore.values());
  if (deptCode) rows = rows.filter((r) => r.deptCode === deptCode);
  if (type) rows = rows.filter((r) => r.infectionType === type);
  rows = rows.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/infection-reports ==============================

async function handleInfCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const patientId = body.patientId;
  const infectionType = body.infectionType;
  const onsetDate = body.onsetDate;
  const deptCode = body.deptCode;
  const reportedBy = body.reportedBy;
  const labConfirmed = body.labConfirmed;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof infectionType !== 'string' || !INFECTION_TYPES.includes(infectionType as InfectionType) ||
    typeof onsetDate !== 'string' || !onsetDate.trim() ||
    typeof deptCode !== 'string' || !deptCode.trim() ||
    typeof reportedBy !== 'string' || !reportedBy.trim() ||
    typeof labConfirmed !== 'boolean'
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addInf({
    patientId: patientId.trim(),
    infectionType: infectionType as InfectionType,
    onsetDate: onsetDate.trim(),
    deptCode: deptCode.trim(),
    reportedBy: reportedBy.trim(),
    labConfirmed,
    status: 'reported',
    disposition: null,
    closedAt: null,
    reportedAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/infection-reports/:id/close ==============================

async function handleInfClose(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = infStore.get(id);
  if (!rec) return notFound('InfectionReport', id);

  if (rec.status === 'closed') {
    return json({ code: 409, message: 'already_closed' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const disposition = body.disposition;
  if (typeof disposition !== 'string' || !disposition.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.disposition = disposition.trim();
  rec.status = 'closed';
  rec.closedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m553Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/infection-reports', handle: handleInfList, auth: true },
  { method: 'POST', path: '/api/v1/infection-reports', handle: handleInfCreate, auth: true },
  { method: 'POST', path: '/api/v1/infection-reports/:id/close', handle: handleInfClose, auth: true },
];
