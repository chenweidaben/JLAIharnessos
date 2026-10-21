/**
 * 健澜科技 jlmedaios - M604 新标准 P15：成本核算 5 端点
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type CostCategory = 'labor' | 'drug' | 'supply' | 'equipment' | 'overhead' | 'other';

interface CostRecord {
  id: string;
  deptCode: string;
  category: CostCategory;
  amount: number;
  occurredDate: string;
  description: string;
  recordedBy: string;
  createdAt: string;
}

const costStore = new Map<string, CostRecord>();
let costSeq = 0;

function addCost(r: Omit<CostRecord, 'id'>): CostRecord {
  costSeq += 1;
  const rec: CostRecord = { ...r, id: `COST-${String(costSeq).padStart(3, '0')}` };
  costStore.set(rec.id, rec);
  return rec;
}

function seedCosts(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const depts = ['DEPT-INT', 'DEPT-SURG', 'DEORT', 'DEPT-PED', 'DEPT-GYN', 'DEPT-EMERG'];
  const cats: CostCategory[] = ['labor', 'drug', 'supply', 'equipment', 'overhead', 'other'];
  for (let i = 0; i < 80; i += 1) {
    const dept = depts[i % depts.length];
    const cat = cats[i % cats.length];
    const base = cat === 'labor' ? 50000 : cat === 'drug' ? 30000 : cat === 'supply' ? 15000 : cat === 'equipment' ? 20000 : cat === 'overhead' ? 10000 : 5000;
    addCost({
      deptCode: dept,
      category: cat,
      amount: Math.round(base * (0.8 + (i % 5) * 0.1)),
      occurredDate: new Date(now - (i % 90) * 86_400_000).toISOString().slice(0, 10),
      description: `${dept}-${cat} 月度成本`,
      recordedBy: 'admin',
      createdAt: iso(i * 30),
    });
  }
}

seedCosts();

async function handleCostList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const period = (c.query.get('period') ?? '').trim();
  let items = Array.from(costStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  if (period) items = items.filter((r) => r.occurredDate.startsWith(period));
  items.sort((a, b) => b.occurredDate.localeCompare(a.occurredDate));
  return json(ok({ items, totalCount: items.length }), 200);
}

async function handleCostCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const amount = Number(body.amount || 0);
  if (amount <= 0) return json({ code: 400, message: 'amount_must_be_positive' }, 400);
  const occurredDate = typeof body.occurredDate === 'string' ? body.occurredDate : '';
  if (occurredDate && occurredDate > new Date().toISOString().slice(0, 10)) {
    return json({ code: 400, message: 'occurred_date_cannot_be_future' }, 400);
  }
  const rec = addCost({
    deptCode: typeof body.deptCode === 'string' ? body.deptCode : '',
    category: (typeof body.category === 'string' ? body.category : 'other') as CostCategory,
    amount,
    occurredDate,
    description: typeof body.description === 'string' ? body.description : '',
    recordedBy: typeof body.recordedBy === 'string' ? body.recordedBy : '',
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

async function handleDeptSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(costStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  const byCat = new Map<CostCategory, number>();
  let total = 0;
  for (const r of items) {
    byCat.set(r.category, (byCat.get(r.category) || 0) + r.amount);
    total += r.amount;
  }
  return json(ok({
    deptCode: deptCode || 'ALL',
    totalCost: total,
    byCategory: Array.from(byCat.entries()).map(([category, amount]) => ({ category, amount })),
    sampleSize: items.length,
  }), 200);
}

async function handleBedDayCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(costStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  const total = items.reduce((s, r) => s + r.amount, 0);
  const bedDays = deptCode === 'DEPT-INT' ? 3650 : deptCode === 'DEPT-SURG' ? 2920 : deptCode === 'DEPT-PED' ? 1825 : deptCode === 'DEPT-GYN' ? 1460 : deptCode === 'DEPT-EMERG' ? 0 : 10000;
  return json(ok({
    deptCode: deptCode || 'ALL',
    totalCost: total,
    bedDays,
    bedDayCost: bedDays > 0 ? Math.round((total / bedDays) * 100) / 100 : 0,
  }), 200);
}

async function handleOutpatientCost(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  let items = Array.from(costStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  const total = items.reduce((s, r) => s + r.amount, 0);
  const visits = deptCode === 'DEPT-INT' ? 50000 : deptCode === 'DEPT-SURG' ? 30000 : deptCode === 'DEPT-PED' ? 40000 : deptCode === 'DEPT-GYN' ? 25000 : deptCode === 'DEPT-EMERG' ? 60000 : 200000;
  return json(ok({
    deptCode: deptCode || 'ALL',
    totalCost: total,
    outpatientVisits: visits,
    outpatientCost: Math.round((total / visits) * 100) / 100,
  }), 200);
}

export const m604Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/cost/items', handle: handleCostList, auth: true },
  { method: 'POST', path: '/api/v1/cost/items', handle: handleCostCreate, auth: true },
  { method: 'GET', path: '/api/v1/cost/dept-summary', handle: handleDeptSummary, auth: true },
  { method: 'GET', path: '/api/v1/cost/bed-day-cost', handle: handleBedDayCost, auth: true },
  { method: 'GET', path: '/api/v1/cost/outpatient-cost', handle: handleOutpatientCost, auth: true },
];
