/**
 * 健澜科技 jlmedaios - M532 新标准 P0：Barthel 指数 ADL 评分路由 2 端点
 *
 * GET  /api/v1/barthel-scores?visitId=   列表（assessedAt 倒序）
 * POST /api/v1/barthel-scores            新建（后端自动汇总 totalScore 与 level / needsCare）
 *
 * 分级冻结：totalScore ≤20 severe / ≤40 moderate / ≤60 mild / >60 independent；
 * needsCare = totalScore ≤ 40。写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500。
 * 与 M531 /icu-sedations、M530 /pacu/records、M529 /vte/courses 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type BarthelLevel = 'severe' | 'moderate' | 'mild' | 'independent';

const ITEM_KEYS = [
  'eating', 'bathing', 'grooming', 'dressing',
  'bowel', 'bladder', 'toilet', 'transfers', 'walking', 'stairs',
] as const;
type ItemKey = (typeof ITEM_KEYS)[number];
type Items = Record<ItemKey, number>;

interface BarthelRecord {
  id: string;
  visitId: string;
  items: Items;
  totalScore: number;
  level: BarthelLevel;
  needsCare: boolean;
  assessedAt: string;
}

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const barthelStore = new Map<string, BarthelRecord>();
let barthelSeq = 2;

function levelOf(total: number): BarthelLevel {
  if (total <= 20) return 'severe';
  if (total <= 40) return 'moderate';
  if (total <= 60) return 'mild';
  return 'independent';
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: BarthelRecord[] = [
    {
      id: 'BART-001',
      visitId: 'V2026102101',
      items: {
        eating: 5, bathing: 0, grooming: 0, dressing: 5,
        bowel: 5, bladder: 5, toilet: 5, transfers: 5, walking: 0, stairs: 0,
      },
      totalScore: 30,
      level: 'moderate',
      needsCare: true,
      assessedAt: iso(20),
    },
    {
      id: 'BART-002',
      visitId: 'V2026102102',
      items: {
        eating: 10, bathing: 5, grooming: 5, dressing: 10,
        bowel: 10, bladder: 10, toilet: 10, transfers: 15, walking: 15, stairs: 10,
      },
      totalScore: 100,
      level: 'independent',
      needsCare: false,
      assessedAt: iso(40),
    },
  ];
  seeds.forEach((r) => barthelStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/barthel-scores 列表 ==============================

async function handleBarthelList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(barthelStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/barthel-scores 新建 ==============================

async function handleBarthelCreate(c: Ctx): Promise<Response> {
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
  if (typeof visitId !== 'string' || !visitId.trim()) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const rawItems = body.items;
  if (rawItems == null || typeof rawItems !== 'object' || Array.isArray(rawItems)) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const items = {} as Items;
  for (const key of ITEM_KEYS) {
    const v = (rawItems as Record<string, unknown>)[key];
    if (v === undefined || v === null) {
      items[key] = 0;
    } else if (typeof v === 'number' && Number.isFinite(v)) {
      items[key] = v;
    } else {
      return json({ code: 400, message: 'invalid payload' }, 400);
    }
  }

  const totalScore = ITEM_KEYS.reduce((acc, k) => acc + items[k], 0);
  const level = levelOf(totalScore);
  const needsCare = totalScore <= 40;

  barthelSeq += 1;
  const record: BarthelRecord = {
    id: `BART-${String(barthelSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    items,
    totalScore,
    level,
    needsCare,
    assessedAt: new Date().toISOString(),
  };
  barthelStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m532Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/barthel-scores', handle: handleBarthelList, auth: true },
  { method: 'POST', path: '/api/v1/barthel-scores', handle: handleBarthelCreate, auth: true },
];
