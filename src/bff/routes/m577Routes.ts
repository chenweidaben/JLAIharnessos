/**
 * 健澜科技 jlmedaios - M577 新标准 P8：转科记录 3 端点
 *
 * GET  /api/v1/transfer-notes?patientId=&fromDept=   列表（transferTime 倒序；过滤）
 * POST /api/v1/transfer-notes                        新建（status=transferred）
 * POST /api/v1/transfer-notes/:id/ack                接收科室确认（transferred→acknowledged；重复 409 already_acknowledged）
 *
 * 种子 8 条：internal→surgery / internal→cardiology / pediatrics→neonatology 等典型路径。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TnStatus = 'transferred' | 'acknowledged';

interface TnRecord {
  id: string;
  patientId: string;
  visitId: string;
  fromDeptCode: string;
  toDeptCode: string;
  transferReason: string;
  transferDiagnosis: string;
  conditionAtTransfer: string;
  handoverNotes: string;
  transferringDoctor: string;
  receivingDoctor: string | null;
  transferTime: string;
  status: TnStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const tnStore = new Map<string, TnRecord>();
let tnSeq = 0;

function addTn(r: Omit<TnRecord, 'id'>): TnRecord {
  tnSeq += 1;
  const rec: TnRecord = { ...r, id: `TN-${String(tnSeq).padStart(3, '0')}` };
  tnStore.set(rec.id, rec);
  return rec;
}

function seedTn(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 5 transferred（未确认）
  addTn({ patientId: 'P-TN001', visitId: 'V-001', fromDeptCode: 'internal', toDeptCode: 'surgery', transferReason: '需手术治疗', transferDiagnosis: '急性阑尾炎', conditionAtTransfer: '腹痛加重', handoverNotes: '已禁食水', transferringDoctor: 'DOC-INT-001', receivingDoctor: null, transferTime: iso(60 * 24 * 2), status: 'transferred', acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(60 * 24 * 2) });
  addTn({ patientId: 'P-TN002', visitId: 'V-002', fromDeptCode: 'internal', toDeptCode: 'cardiology', transferReason: '心内科会诊后转入', transferDiagnosis: '急性冠脉综合征', conditionAtTransfer: '胸痛缓解', handoverNotes: '心电图监护中', transferringDoctor: 'DOC-INT-002', receivingDoctor: null, transferTime: iso(60 * 24 * 1), status: 'transferred', acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(60 * 24 * 1) });
  addTn({ patientId: 'P-TN003', visitId: 'V-003', fromDeptCode: 'pediatrics', toDeptCode: 'neonatology', transferReason: '早产儿监护', transferDiagnosis: '新生儿呼吸窘迫', conditionAtTransfer: '吸氧中', handoverNotes: '生命体征平稳', transferringDoctor: 'DOC-PED-001', receivingDoctor: null, transferTime: iso(60 * 18), status: 'transferred', acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(60 * 18) });
  addTn({ patientId: 'P-TN004', visitId: 'V-004', fromDeptCode: 'emergency', toDeptCode: 'icu', transferReason: '感染性休克', transferDiagnosis: '脓毒症', conditionAtTransfer: '升压药维持', handoverNotes: '已建立中心静脉通路', transferringDoctor: 'DOC-EM-001', receivingDoctor: null, transferTime: iso(60 * 12), status: 'transferred', acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(60 * 12) });
  addTn({ patientId: 'P-TN005', visitId: 'V-005', fromDeptCode: 'surgery', toDeptCode: 'internal', transferReason: '术后转回病房', transferDiagnosis: '胆囊切除术后', conditionAtTransfer: '术后恢复良好', handoverNotes: '引流管在位', transferringDoctor: 'DOC-SUR-001', receivingDoctor: null, transferTime: iso(60 * 6), status: 'transferred', acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(60 * 6) });

  // 3 acknowledged（已确认）
  addTn({ patientId: 'P-TN006', visitId: 'V-006', fromDeptCode: 'internal', toDeptCode: 'nephrology', transferReason: '肾内科治疗', transferDiagnosis: '急性肾衰', conditionAtTransfer: '尿量减少', handoverNotes: '血透已安排', transferringDoctor: 'DOC-INT-003', receivingDoctor: 'DOC-NEPH-001', transferTime: iso(60 * 24 * 5), status: 'acknowledged', acknowledgedBy: 'DOC-NEPH-001', acknowledgedAt: iso(60 * 24 * 4), createdAt: iso(60 * 24 * 5) });
  addTn({ patientId: 'P-TN007', visitId: 'V-007', fromDeptCode: 'internal', toDeptCode: 'endocrinology', transferReason: '糖尿病酮症纠正', transferDiagnosis: '糖尿病酮症酸中毒', conditionAtTransfer: '酮症纠正', handoverNotes: '胰岛素泵持续', transferringDoctor: 'DOC-INT-004', receivingDoctor: 'DOC-ENDO-001', transferTime: iso(60 * 24 * 4), status: 'acknowledged', acknowledgedBy: 'DOC-ENDO-001', acknowledgedAt: iso(60 * 24 * 3), createdAt: iso(60 * 24 * 4) });
  addTn({ patientId: 'P-TN008', visitId: 'V-008', fromDeptCode: 'pediatrics', toDeptCode: 'neurology', transferReason: '小儿惊厥查因', transferDiagnosis: '癫痫待排', conditionAtTransfer: '惊厥已止', handoverNotes: '脑电图待查', transferringDoctor: 'DOC-PED-002', receivingDoctor: 'DOC-NEURO-001', transferTime: iso(60 * 24 * 3), status: 'acknowledged', acknowledgedBy: 'DOC-NEURO-001', acknowledgedAt: iso(60 * 24 * 2), createdAt: iso(60 * 24 * 3) });
}
seedTn();

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

// ============================== 1. GET /api/v1/transfer-notes ==============================

async function handleTnList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientId = (c.query.get('patientId') ?? '').trim();
  const fromDept = (c.query.get('fromDept') ?? '').trim();

  let rows = Array.from(tnStore.values());
  if (patientId) rows = rows.filter((r) => r.patientId === patientId);
  if (fromDept) rows = rows.filter((r) => r.fromDeptCode === fromDept);
  rows = rows.sort((a, b) => b.transferTime.localeCompare(a.transferTime));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/transfer-notes ==============================

async function handleTnCreate(c: Ctx): Promise<Response> {
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
    patientId, visitId, fromDeptCode, toDeptCode, transferReason,
    transferDiagnosis, conditionAtTransfer, handoverNotes, transferringDoctor, transferTime,
  } = body as Record<string, unknown>;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof fromDeptCode !== 'string' || !fromDeptCode.trim() ||
    typeof toDeptCode !== 'string' || !toDeptCode.trim() ||
    typeof transferReason !== 'string' || !transferReason.trim() ||
    typeof transferDiagnosis !== 'string' || !transferDiagnosis.trim() ||
    typeof conditionAtTransfer !== 'string' || !conditionAtTransfer.trim() ||
    typeof handoverNotes !== 'string' || !handoverNotes.trim() ||
    typeof transferringDoctor !== 'string' || !transferringDoctor.trim() ||
    typeof transferTime !== 'string' || !transferTime.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rec = addTn({
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    fromDeptCode: fromDeptCode.trim(),
    toDeptCode: toDeptCode.trim(),
    transferReason: transferReason.trim(),
    transferDiagnosis: transferDiagnosis.trim(),
    conditionAtTransfer: conditionAtTransfer.trim(),
    handoverNotes: handoverNotes.trim(),
    transferringDoctor: transferringDoctor.trim(),
    receivingDoctor: null,
    transferTime: transferTime.trim(),
    status: 'transferred',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/transfer-notes/:id/ack ==============================

async function handleTnAck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = tnStore.get(id);
  if (!rec) return notFound('TransferNote', id);

  if (rec.status === 'acknowledged') {
    return json({ code: 409, message: 'already_acknowledged' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const acknowledgedBy = body.acknowledgedBy;
  const receivingDoctor = body.receivingDoctor;

  if (
    typeof acknowledgedBy !== 'string' || !acknowledgedBy.trim() ||
    typeof receivingDoctor !== 'string' || !receivingDoctor.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'acknowledged';
  rec.acknowledgedBy = acknowledgedBy.trim();
  rec.acknowledgedAt = new Date().toISOString();
  rec.receivingDoctor = receivingDoctor.trim();
  return json(ok(rec), 200);
}

export const m577Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/transfer-notes', handle: handleTnList, auth: true },
  { method: 'POST', path: '/api/v1/transfer-notes', handle: handleTnCreate, auth: true },
  { method: 'POST', path: '/api/v1/transfer-notes/:id/ack', handle: handleTnAck, auth: true },
];
