/**
 * 健澜科技 jlmedaios - M538 新标准 P0：产后访视路由 2 端点
 *
 * GET  /api/v1/postpartum/visits?visitId=   列表（visitedAt 倒序）
 * POST /api/v1/postpartum/visits              新建（后端多条件组合判定 needsPhysicianReview + riskTags）
 *
 * 后端多条件组合判定（riskTags 命中英文 key 数组，展示中文由前端 LABEL 映射）：
 *   temperature >= 38.5                 → 'fever'
 *   lochia ∈ {profuse, odor}            → `lochia_${lochia}`
 *   woundHealing ∈ {infection, dehiscent} → `wound_${woundHealing}`
 *   mentalScale >= 13（Edinburgh 0-10 粗分 ≥13） → 'postpartum_depression'
 *   riskTags.length > 0 → needsPhysicianReview=true，否则 false。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M537 /oncology/followups、M536 /psych/screens 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type VisitType = 'discharge' | 'day3' | 'day7' | 'day42';
type Fundus = 'normal' | 'subinvolution';
type Lochia = 'normal' | 'scanty' | 'profuse' | 'odor';
type Breast = 'normal' | 'engorgement' | 'mastitis';
type Wound = 'healing' | 'infection' | 'dehiscent';

interface PostpartumVisitRecord {
  id: string;
  visitId: string;
  visitType: VisitType;
  temperature: number;
  fundusInvolution: Fundus;
  lochia: Lochia;
  breastCondition: Breast;
  woundHealing: Wound;
  mentalScale: number;
  babyRef: string | null;
  notes: string | null;
  needsPhysicianReview: boolean;
  riskTags: string[];
  visitedAt: string;
}

const VISIT_TYPES: VisitType[] = ['discharge', 'day3', 'day7', 'day42'];
const FUNDS: Fundus[] = ['normal', 'subinvolution'];
const LOCHIAS: Lochia[] = ['normal', 'scanty', 'profuse', 'odor'];
const BREASTS: Breast[] = ['normal', 'engorgement', 'mastitis'];
const WOUNDS: Wound[] = ['healing', 'infection', 'dehiscent'];

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const ppStore = new Map<string, PostpartumVisitRecord>();
let ppSeq = 4;

function computeRiskTags(
  temperature: number,
  lochia: Lochia,
  woundHealing: Wound,
  mentalScale: number,
): string[] {
  const tags: string[] = [];
  if (temperature >= 38.5) tags.push('fever');
  if (lochia === 'profuse' || lochia === 'odor') tags.push(`lochia_${lochia}`);
  if (woundHealing === 'infection' || woundHealing === 'dehiscent') tags.push(`wound_${woundHealing}`);
  if (mentalScale >= 13) tags.push('postpartum_depression');
  return tags;
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: PostpartumVisitRecord[] = [
    {
      id: 'PPV-001', visitId: 'V2026102101', visitType: 'day7',
      temperature: 38.8, fundusInvolution: 'subinvolution', lochia: 'profuse',
      breastCondition: 'engorgement', woundHealing: 'healing', mentalScale: 6,
      babyRef: 'B-2026-001', notes: '发热伴恶露增多，建议医师复核',
      needsPhysicianReview: true, riskTags: ['fever', 'lochia_profuse'], visitedAt: iso(60),
    },
    {
      id: 'PPV-002', visitId: 'V2026102102', visitType: 'day42',
      temperature: 36.7, fundusInvolution: 'normal', lochia: 'normal',
      breastCondition: 'normal', woundHealing: 'healing', mentalScale: 14,
      babyRef: 'B-2026-002', notes: '爱丁堡产后抑郁量表阳性',
      needsPhysicianReview: true, riskTags: ['postpartum_depression'], visitedAt: iso(120),
    },
    {
      id: 'PPV-003', visitId: 'V2026102103', visitType: 'discharge',
      temperature: 36.5, fundusInvolution: 'normal', lochia: 'normal',
      breastCondition: 'normal', woundHealing: 'healing', mentalScale: 2,
      babyRef: 'B-2026-003', notes: null,
      needsPhysicianReview: false, riskTags: [], visitedAt: iso(180),
    },
    {
      id: 'PPV-004', visitId: 'V2026102104', visitType: 'day3',
      temperature: 37.1, fundusInvolution: 'normal', lochia: 'normal',
      breastCondition: 'normal', woundHealing: 'infection', mentalScale: 3,
      babyRef: 'B-2026-004', notes: '会阴切口红肿渗液',
      needsPhysicianReview: true, riskTags: ['wound_infection'], visitedAt: iso(240),
    },
  ];
  seeds.forEach((r) => ppStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/postpartum/visits 列表 ==============================

async function handlePpList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(ppStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/postpartum/visits 新建 ==============================

async function handlePpCreate(c: Ctx): Promise<Response> {
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
  const visitType = body.visitType;
  const temperature = body.temperature;
  const fundus = body.fundusInvolution;
  const lochia = body.lochia;
  const breast = body.breastCondition;
  const wound = body.woundHealing;
  const mentalScale = body.mentalScale;
  const babyRef = body.babyRef;
  const notes = body.notes;

  const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    (typeof visitType !== 'string' || !VISIT_TYPES.includes(visitType as VisitType)) ||
    !isNum(temperature) ||
    (typeof fundus !== 'string' || !FUNDS.includes(fundus as Fundus)) ||
    (typeof lochia !== 'string' || !LOCHIAS.includes(lochia as Lochia)) ||
    (typeof breast !== 'string' || !BREASTS.includes(breast as Breast)) ||
    (typeof wound !== 'string' || !WOUNDS.includes(wound as Wound)) ||
    !isNum(mentalScale) || !Number.isInteger(mentalScale) || mentalScale < 0 || mentalScale > 10 ||
    (babyRef != null && typeof babyRef !== 'string') ||
    (notes != null && typeof notes !== 'string')
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const tags = computeRiskTags(temperature, lochia as Lochia, wound as Wound, mentalScale);

  ppSeq += 1;
  const record: PostpartumVisitRecord = {
    id: `PPV-${String(ppSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    visitType: visitType as VisitType,
    temperature,
    fundusInvolution: fundus as Fundus,
    lochia: lochia as Lochia,
    breastCondition: breast as Breast,
    woundHealing: wound as Wound,
    mentalScale,
    babyRef: babyRef == null || !babyRef.trim() ? null : (babyRef as string).trim(),
    notes: notes == null || !notes.trim() ? null : (notes as string).trim(),
    needsPhysicianReview: tags.length > 0,
    riskTags: tags,
    visitedAt: new Date().toISOString(),
  };
  ppStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m538Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/postpartum/visits', handle: handlePpList, auth: true },
  { method: 'POST', path: '/api/v1/postpartum/visits', handle: handlePpCreate, auth: true },
];
