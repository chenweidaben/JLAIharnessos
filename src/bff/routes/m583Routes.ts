/**
 * 健澜科技 jlmedaios - M583 新标准 P10：字典映射 3 端点
 *
 * GET  /api/v1/dict-mappings?dictType=&localCode=  列表（createdAt 倒序；过滤）
 * POST /api/v1/dict-mappings                       新建（dictType 枚举 dept/disease/drug/test/operation；status=draft）
 * POST /api/v1/dict-mappings/:id/verify            卫健委码表审核（draft→verified；重复 409 already_verified）
 *
 * 种子 40 条：dept 10 + disease 10 + drug 10 + test 10。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type DictType = 'dept' | 'disease' | 'drug' | 'test' | 'operation';
type DmStatus = 'draft' | 'verified';

interface DmRecord {
  id: string;
  dictType: DictType;
  localCode: string;
  localName: string;
  nationalCode: string;
  nationalName: string;
  status: DmStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const dmStore = new Map<string, DmRecord>();
let dmSeq = 0;

function addDm(r: Omit<DmRecord, 'id'>): DmRecord {
  dmSeq += 1;
  const rec: DmRecord = { ...r, id: `DM-${String(dmSeq).padStart(3, '0')}` };
  dmStore.set(rec.id, rec);
  return rec;
}

function seedDm(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();

  const seeds: Array<{ dictType: DictType; localCode: string; localName: string; nationalCode: string; nationalName: string }> = [];
  for (let i = 1; i <= 10; i++) {
    seeds.push({ dictType: 'dept', localCode: `DEP-${String(i).padStart(3, '0')}`, localName: `本地科室${i}`, nationalCode: `50.${i}`, nationalName: `国家科室${i}` });
  }
  for (let i = 1; i <= 10; i++) {
    seeds.push({ dictType: 'disease', localCode: `DIS-${String(i).padStart(3, '0')}`, localName: `本地疾病${i}`, nationalCode: `ICD-${1000 + i}`, nationalName: `国家疾病${i}` });
  }
  for (let i = 1; i <= 10; i++) {
    seeds.push({ dictType: 'drug', localCode: `DRG-${String(i).padStart(3, '0')}`, localName: `本地药品${i}`, nationalCode: `YP-${2000 + i}`, nationalName: `国家药品${i}` });
  }
  for (let i = 1; i <= 10; i++) {
    seeds.push({ dictType: 'test', localCode: `TST-${String(i).padStart(3, '0')}`, localName: `本地检验${i}`, nationalCode: `LIS-${3000 + i}`, nationalName: `国家检验${i}` });
  }

  seeds.forEach((s, idx) => {
    addDm({
      ...s,
      status: idx % 3 === 0 ? 'verified' : 'draft',
      verifiedBy: idx % 3 === 0 ? 'DOC-VERIFY' : null,
      verifiedAt: idx % 3 === 0 ? iso(60 * 24 * (10 - idx)) : null,
      createdAt: iso(60 * 24 * (10 - idx)),
    });
  });
}
seedDm();

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

const VALID_DICT_TYPES: DictType[] = ['dept', 'disease', 'drug', 'test', 'operation'];

// ============================== 1. GET /api/v1/dict-mappings ==============================

async function handleDmList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const dictType = (c.query.get('dictType') ?? '').trim();
  const localCode = (c.query.get('localCode') ?? '').trim();

  let rows = Array.from(dmStore.values());
  if (dictType) rows = rows.filter((r) => r.dictType === dictType);
  if (localCode) rows = rows.filter((r) => r.localCode === localCode);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/dict-mappings ==============================

async function handleDmCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const { dictType, localCode, localName, nationalCode, nationalName } = body as Record<string, unknown>;

  if (
    typeof localCode !== 'string' || !localCode.trim() ||
    typeof localName !== 'string' || !localName.trim() ||
    typeof nationalCode !== 'string' || !nationalCode.trim() ||
    typeof nationalName !== 'string' || !nationalName.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  if (typeof dictType !== 'string' || !VALID_DICT_TYPES.includes(dictType as DictType)) {
    return json({ code: 400, message: 'invalid_dict_type' }, 400);
  }

  const rec = addDm({
    dictType: dictType as DictType,
    localCode: localCode.trim(),
    localName: localName.trim(),
    nationalCode: nationalCode.trim(),
    nationalName: nationalName.trim(),
    status: 'draft',
    verifiedBy: null,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/dict-mappings/:id/verify ==============================

async function handleDmVerify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = dmStore.get(id);
  if (!rec) return notFound('DictMapping', id);

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
  if (typeof verifiedBy !== 'string' || !verifiedBy.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'verified';
  rec.verifiedBy = verifiedBy.trim();
  rec.verifiedAt = new Date().toISOString();
  return json(ok(rec), 200);
}

export const m583Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dict-mappings', handle: handleDmList, auth: true },
  { method: 'POST', path: '/api/v1/dict-mappings', handle: handleDmCreate, auth: true },
  { method: 'POST', path: '/api/v1/dict-mappings/:id/verify', handle: handleDmVerify, auth: true },
];
