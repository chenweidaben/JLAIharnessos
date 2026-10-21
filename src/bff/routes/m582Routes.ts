/**
 * 健澜科技 jlmedaios - M582 新标准 P10：患者主索引 EMPI 3 端点
 *
 * GET  /api/v1/empi?patientName=&idCard=&mpi=   列表（过滤）
 * POST /api/v1/empi/merge                       合并（sourceMpi=targetMpi 400；已 mergedInto 409 already_merged）
 * GET  /api/v1/empi/:mpi/identities             列出该主索引下所有就诊身份
 *
 * 种子 15 个患者：含 2 对疑似重复（同 idCard 不同姓名，potentialDuplicate=true）。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

interface Identity {
  visitId: string;
  deptCode: string;
  registeredAt: string;
}

interface EmpiRecord {
  mpi: string;
  patientName: string;
  idCard: string;
  gender: 'M' | 'F';
  birthDate: string;
  potentialDuplicate: boolean;
  identities: Identity[];
  mergedInto: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const empiStore = new Map<string, EmpiRecord>();
let empiSeq = 0;

function addEmpi(r: Omit<EmpiRecord, 'mpi'>): EmpiRecord {
  empiSeq += 1;
  const rec: EmpiRecord = { ...r, mpi: `MPI-${String(empiSeq).padStart(3, '0')}` };
  empiStore.set(rec.mpi, rec);
  return rec;
}

function seedEmpi(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  // 11 个正常患者 + 4 个重复对 = 15 个种子
  for (let i = 1; i <= 11; i++) {
    addEmpi({
      patientName: `患者${String(i).padStart(3, '0')}`,
      idCard: `33010619${String(70 + i).padStart(2, '0')}0101${String(1000 + i)}`,
      gender: i % 2 === 0 ? 'M' : 'F',
      birthDate: `19${70 + i}-0${(i % 9) + 1}-15T00:00:00Z`,
      potentialDuplicate: false,
      identities: [
        { visitId: `V-${String(i).padStart(3, '0')}`, deptCode: 'internal', registeredAt: iso(60 * 24 * 30) },
      ],
      mergedInto: null,
      createdAt: iso(60 * 24 * 30),
    });
  }

  // 第 1 对疑似重复：同 idCard 不同姓名
  addEmpi({
    patientName: '张伟', idCard: '330106198501010001', gender: 'M', birthDate: '1985-01-01T00:00:00Z',
    potentialDuplicate: true,
    identities: [{ visitId: 'V-DUP1-A', deptCode: 'internal', registeredAt: iso(60 * 24 * 10) }],
    mergedInto: null, createdAt: iso(60 * 24 * 10),
  });
  addEmpi({
    patientName: '张威', idCard: '330106198501010001', gender: 'M', birthDate: '1985-01-01T00:00:00Z',
    potentialDuplicate: true,
    identities: [{ visitId: 'V-DUP1-B', deptCode: 'surgery', registeredAt: iso(60 * 24 * 5) }],
    mergedInto: null, createdAt: iso(60 * 24 * 5),
  });

  // 第 2 对疑似重复：同 idCard 不同姓名
  addEmpi({
    patientName: '李娜', idCard: '330106199002020002', gender: 'F', birthDate: '1990-02-02T00:00:00Z',
    potentialDuplicate: true,
    identities: [{ visitId: 'V-DUP2-A', deptCode: 'pediatrics', registeredAt: iso(60 * 24 * 8) }],
    mergedInto: null, createdAt: iso(60 * 24 * 8),
  });
  addEmpi({
    patientName: '李楠', idCard: '330106199002020002', gender: 'F', birthDate: '1990-02-02T00:00:00Z',
    potentialDuplicate: true,
    identities: [{ visitId: 'V-DUP2-B', deptCode: 'gynaecology', registeredAt: iso(60 * 24 * 3) }],
    mergedInto: null, createdAt: iso(60 * 24 * 3),
  });
}
seedEmpi();

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

// ============================== 1. GET /api/v1/empi ==============================

async function handleEmpiList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const patientName = (c.query.get('patientName') ?? '').trim();
  const idCard = (c.query.get('idCard') ?? '').trim();
  const mpi = (c.query.get('mpi') ?? '').trim();

  let rows = Array.from(empiStore.values());
  if (patientName) rows = rows.filter((r) => r.patientName.includes(patientName));
  if (idCard) rows = rows.filter((r) => r.idCard === idCard);
  if (mpi) rows = rows.filter((r) => r.mpi === mpi);
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/empi/merge ==============================

async function handleEmpiMerge(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { sourceMpi, targetMpi, mergeReason, mergedBy } = body as Record<string, unknown>;

  if (
    typeof sourceMpi !== 'string' || !sourceMpi.trim() ||
    typeof targetMpi !== 'string' || !targetMpi.trim() ||
    typeof mergeReason !== 'string' || !mergeReason.trim() ||
    typeof mergedBy !== 'string' || !mergedBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  // source 与 target 不能相同
  if (sourceMpi.trim() === targetMpi.trim()) {
    return json({ code: 400, message: 'source_and_target_cannot_be_same' }, 400);
  }

  const source = empiStore.get(sourceMpi.trim());
  if (!source) return notFound('EmpiRecord', sourceMpi.trim());
  const target = empiStore.get(targetMpi.trim());
  if (!target) return notFound('EmpiRecord', targetMpi.trim());

  // 已合并
  if (source.mergedInto) {
    return json({ code: 409, message: 'already_merged' }, 409);
  }

  source.mergedInto = targetMpi.trim();
  return json(ok(source), 200);
}

// ============================== 3. GET /api/v1/empi/:mpi/identities ==============================

async function handleEmpiIdentities(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const mpi = (c.params.id ?? '').trim();
  const rec = empiStore.get(mpi);
  if (!rec) return notFound('EmpiRecord', mpi);
  return json(ok({ mpi: rec.mpi, patientName: rec.patientName, identities: rec.identities }), 200);
}

export const m582Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/empi', handle: handleEmpiList, auth: true },
  { method: 'POST', path: '/api/v1/empi/merge', handle: handleEmpiMerge, auth: true },
  { method: 'GET', path: '/api/v1/empi/:id/identities', handle: handleEmpiIdentities, auth: true },
];
