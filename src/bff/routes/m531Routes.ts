/**
 * 健澜科技 jlmedaios - M531 新标准 P0：ICU 镇静 RASS/Ramsay 记录路由 2 端点
 *
 * GET  /api/v1/icu-sedations?visitId=   列表（assessedAt 倒序）
 * POST /api/v1/icu-sedations            新建（后端二次计算 needsAdjust = actualRass<=-2 || actualRass>=2）
 *
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M530 /pacu/records、M529 /vte/courses、M528 /assessments 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Ventilated = 'yes' | 'no';

interface IcuSedationRecord {
  id: string;
  visitId: string;
  actualRass: number;
  targetRass: number;
  ramsay: number;
  ventilated: Ventilated;
  needsAdjust: boolean;
  assessedAt: string;
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const sedationStore = new Map<string, IcuSedationRecord>();
let sedationSeq = 3;

function calcNeedsAdjust(actualRass: number): boolean {
  return actualRass <= -2 || actualRass >= 2;
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: IcuSedationRecord[] = [
    {
      id: 'SED-001', visitId: 'V2026102101', actualRass: -1, targetRass: -1,
      ramsay: 3, ventilated: 'yes', needsAdjust: false, assessedAt: iso(20),
    },
    {
      id: 'SED-002', visitId: 'V2026102102', actualRass: -3, targetRass: -1,
      ramsay: 5, ventilated: 'yes', needsAdjust: true, assessedAt: iso(40),
    },
    {
      id: 'SED-003', visitId: 'V2026102103', actualRass: 2, targetRass: -1,
      ramsay: 2, ventilated: 'yes', needsAdjust: true, assessedAt: iso(60),
    },
  ];
  seeds.forEach((r) => sedationStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/icu-sedations 列表 ==============================

async function handleSedationList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(sedationStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/icu-sedations 新建 ==============================

async function handleSedationCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const visitId = body.visitId;
  const actualRass = body.actualRass;
  const targetRass = body.targetRass;
  const ramsay = body.ramsay;
  const ventilated = body.ventilated;

  // visitId 必填字符串；RASS 必须为 -5..4 整数；Ramsay 必须为 1..6 整数；ventilated 枚举
  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    typeof actualRass !== 'number' || !Number.isInteger(actualRass) || actualRass < -5 || actualRass > 4 ||
    typeof targetRass !== 'number' || !Number.isInteger(targetRass) || targetRass < -5 || targetRass > 4 ||
    typeof ramsay !== 'number' || !Number.isInteger(ramsay) || ramsay < 1 || ramsay > 6 ||
    (ventilated !== 'yes' && ventilated !== 'no')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  sedationSeq += 1;
  const record: IcuSedationRecord = {
    id: `SED-${String(sedationSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    actualRass,
    targetRass,
    ramsay,
    ventilated,
    needsAdjust: calcNeedsAdjust(actualRass),
    assessedAt: new Date().toISOString(),
  };
  sedationStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m531Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/icu-sedations', handle: handleSedationList, auth: true },
  { method: 'POST', path: '/api/v1/icu-sedations', handle: handleSedationCreate, auth: true },
];
