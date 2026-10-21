/**
 * 健澜科技 jlmedaios - M534 新标准 P0：创伤 NISS 评分路由 2 端点
 *
 * GET  /api/v1/trauma/niss?visitId=   列表（assessedAt 倒序）
 * POST /api/v1/trauma/niss            新建（后端自动取 3 个最高 AIS 平方和=NISS、severity 分级、severe→needsSurgery）
 *
 * NISS 规则：injuries 按 aisScore 降序取前 3 个，平方求和；
 * severity：<16 mild / 16–24 moderate / >24 severe；severe 自动 needsSurgery=true。
 * 写接口内存 Map 短路，绝不连 PostgreSQL，不抛 500；枚举英文 key、number、ISO8601。
 * 与 M533 /er-triages、M532 /barthel-scores、M531 /icu-sedations 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Region = 'head' | 'chest' | 'abdomen' | 'extremity' | 'neck' | 'external';
type Severity = 'mild' | 'moderate' | 'severe';

interface Injury {
  region: Region;
  aisScore: number;
  description: string;
}

interface TraumaNissRecord {
  id: string;
  visitId: string;
  injuries: Injury[];
  nissScore: number;
  severity: Severity;
  needsSurgery: boolean;
  assessedAt: string;
}

const REGIONS: Region[] = ['head', 'chest', 'abdomen', 'extremity', 'neck', 'external'];

// ============================== 内存态记录库（DEMO 短路，不连 PostgreSQL） ==============================

const nissStore = new Map<string, TraumaNissRecord>();
let nissSeq = 3;

function calcNiss(injuries: Array<{ aisScore: number }>): number {
  const top3 = injuries.slice().sort((a, b) => b.aisScore - a.aisScore).slice(0, 3);
  return top3.reduce((acc, it) => acc + it.aisScore * it.aisScore, 0);
}

function severityOf(niss: number): Severity {
  if (niss < 16) return 'mild';
  if (niss <= 24) return 'moderate';
  return 'severe';
}

function seedRecords(): void {
  const t0 = Date.now();
  const iso = (offsetMin: number): string => new Date(t0 - offsetMin * 60_000).toISOString();
  const seeds: TraumaNissRecord[] = [
    {
      id: 'NISS-001',
      visitId: 'V2026102101',
      injuries: [
        { region: 'extremity', aisScore: 2, description: '左下肢挫伤' },
        { region: 'external', aisScore: 2, description: '面部擦伤' },
      ],
      nissScore: 8,
      severity: 'mild',
      needsSurgery: false,
      assessedAt: iso(20),
    },
    {
      id: 'NISS-002',
      visitId: 'V2026102102',
      injuries: [
        { region: 'chest', aisScore: 3, description: '多发肋骨骨折' },
        { region: 'abdomen', aisScore: 3, description: '腹壁挫伤' },
        { region: 'extremity', aisScore: 2, description: '右前臂骨折' },
      ],
      nissScore: 22,
      severity: 'moderate',
      needsSurgery: false,
      assessedAt: iso(40),
    },
    {
      id: 'NISS-003',
      visitId: 'V2026102103',
      injuries: [
        { region: 'head', aisScore: 4, description: '颅内血肿' },
        { region: 'chest', aisScore: 4, description: '血气胸' },
        { region: 'abdomen', aisScore: 3, description: '肝挫裂伤' },
      ],
      nissScore: 41,
      severity: 'severe',
      needsSurgery: true,
      assessedAt: iso(60),
    },
  ];
  seeds.forEach((r) => nissStore.set(r.id, r));
}
seedRecords();

// ============================== 1. GET /api/v1/trauma/niss 列表 ==============================

async function handleNissList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  let items = Array.from(nissStore.values());
  if (visitId) items = items.filter((r) => r.visitId === visitId);
  items = items.slice().sort((a, b) => b.assessedAt.localeCompare(a.assessedAt));
  return json(ok({ items, totalCount: items.length }));
}

// ============================== 2. POST /api/v1/trauma/niss 新建 ==============================

async function handleNissCreate(c: Ctx): Promise<Response> {
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
  const rawInjuries = body.injuries;
  if (
    typeof visitId !== 'string' || !visitId.trim() ||
    !Array.isArray(rawInjuries) || rawInjuries.length < 3
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const injuries: Injury[] = [];
  for (const item of rawInjuries) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      return json({ code: 400, message: 'invalid payload' }, 400);
    }
    const rec = item as Record<string, unknown>;
    const region = rec.region;
    const aisScore = rec.aisScore;
    const description = rec.description;
    if (
      (typeof region !== 'string' || !REGIONS.includes(region as Region)) ||
      typeof aisScore !== 'number' || !Number.isInteger(aisScore) || aisScore < 1 || aisScore > 6 ||
      typeof description !== 'string' || !description.trim()
    ) {
      return json({ code: 400, message: 'invalid payload' }, 400);
    }
    injuries.push({ region: region as Region, aisScore, description: description.trim() });
  }

  const nissScore = calcNiss(injuries);
  const severity = severityOf(nissScore);

  nissSeq += 1;
  const record: TraumaNissRecord = {
    id: `NISS-${String(nissSeq).padStart(3, '0')}`,
    visitId: visitId.trim(),
    injuries,
    nissScore,
    severity,
    needsSurgery: severity === 'severe',
    assessedAt: new Date().toISOString(),
  };
  nissStore.set(record.id, record);
  return json(ok(record, 'ok'), 200);
}

export const m534Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/trauma/niss', handle: handleNissList, auth: true },
  { method: 'POST', path: '/api/v1/trauma/niss', handle: handleNissCreate, auth: true },
];
