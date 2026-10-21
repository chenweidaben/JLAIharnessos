/**
 * 健澜科技 jlmedaios - M559 新标准 P4：护理排班闭环 3 端点
 *
 * GET  /api/v1/nurse-schedules?wardCode=&weekOf=   列表（createdAt 倒序；过滤参数）
 * POST /api/v1/nurse-schedules                     新建（后端校验同天双班冲突 + night→次日 day 连班）
 * POST /api/v1/nurse-schedules/:id/swap            换班申请（追加到 swaps[]，approved=false）
 *
 * 后端校验规则：
 *   1) 同一 nurseId 同一 date 排两个不同 shift → 409 duplicate_shift_same_day
 *   2) 同一 nurseId 前一日 night 班 → 次日排 day 班 → 409 night_then_day_rest_required
 *
 * 种子 3 病房（ward-A/ward-B/ward-C）× 1 周排班（2026-W43），每病房 7 天 × 3 班 = 21 assignments。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Shift = 'day' | 'evening' | 'night';
const SHIFTS: Shift[] = ['day', 'evening', 'night'];

interface NurseAssignment {
  nurseId: string;
  shift: Shift;
  date: string;
}

interface SwapRequest {
  requesterId: string;
  targetNurseId: string;
  date: string;
  reason: string;
  approved: boolean;
  requestedAt: string;
}

interface ScheduleRecord {
  id: string;
  wardCode: string;
  weekOf: string;
  nurseAssignments: NurseAssignment[];
  swaps: SwapRequest[];
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const nsStore = new Map<string, ScheduleRecord>();
let nsSeq = 0;

function addNs(r: Omit<ScheduleRecord, 'id'>): ScheduleRecord {
  nsSeq += 1;
  const rec: ScheduleRecord = { ...r, id: `NS-${String(nsSeq).padStart(3, '0')}` };
  nsStore.set(rec.id, rec);
  return rec;
}

function buildWeekAssignments(wardPrefix: string): NurseAssignment[] {
  // 2026-W43: 10/19 (Mon) ~ 10/25 (Sun)
  const dates = [
    '2026-10-19T00:00:00Z',
    '2026-10-20T00:00:00Z',
    '2026-10-21T00:00:00Z',
    '2026-10-22T00:00:00Z',
    '2026-10-23T00:00:00Z',
    '2026-10-24T00:00:00Z',
    '2026-10-25T00:00:00Z',
  ];
  const assignments: NurseAssignment[] = [];
  // 每病房用不同护士池，避免跨病房冲突
  for (let d = 0; d < dates.length; d++) {
    assignments.push({ nurseId: `${wardPrefix}-N-D${d + 1}`, shift: 'day', date: dates[d] });
    assignments.push({ nurseId: `${wardPrefix}-N-E${d + 1}`, shift: 'evening', date: dates[d] });
    assignments.push({ nurseId: `${wardPrefix}-N-N${d + 1}`, shift: 'night', date: dates[d] });
  }
  return assignments;
}

function seedNs(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  addNs({ wardCode: 'ward-A', weekOf: '2026-W43', nurseAssignments: buildWeekAssignments('A'), swaps: [], createdAt: iso(60 * 24) });
  addNs({ wardCode: 'ward-B', weekOf: '2026-W43', nurseAssignments: buildWeekAssignments('B'), swaps: [], createdAt: iso(60 * 12) });
  addNs({ wardCode: 'ward-C', weekOf: '2026-W43', nurseAssignments: buildWeekAssignments('C'), swaps: [], createdAt: iso(60 * 6) });
}
seedNs();

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

/** 校验：同 nurseId 同 date 不允许两个 shift；前一日 night 后次日不允许 day */
function validateAssignments(assignments: NurseAssignment[]): { code: 400 | 409; message: string } | null {
  // 1) 同天双班
  const byNurseDate = new Map<string, string[]>();
  for (const a of assignments) {
    const key = `${a.nurseId}|${a.date.slice(0, 10)}`;
    const arr = byNurseDate.get(key) ?? [];
    arr.push(a.shift);
    byNurseDate.set(key, arr);
  }
  for (const [key, shifts] of byNurseDate.entries()) {
    const unique = new Set(shifts);
    if (unique.size > 1) {
      return { code: 409, message: 'duplicate_shift_same_day' };
    }
  }

  // 2) night 后次日 day
  const byNurseDay = new Map<string, { date: string; shift: Shift }[]>();
  for (const a of assignments) {
    const arr = byNurseDay.get(a.nurseId) ?? [];
    arr.push({ date: a.date.slice(0, 10), shift: a.shift });
    byNurseDay.set(a.nurseId, arr);
  }
  for (const [nurseId, entries] of byNurseDay.entries()) {
    entries.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < entries.length - 1; i++) {
      if (entries[i].shift === 'night' && entries[i + 1].shift === 'day') {
        // 次日（按日期字符串严格递增）
        const dayA = new Date(entries[i].date).getTime();
        const dayB = new Date(entries[i + 1].date).getTime();
        if (dayB - dayA === 86_400_000) {
          return { code: 409, message: 'night_then_day_rest_required' };
        }
      }
    }
  }
  return null;
}

// ============================== 1. GET /api/v1/nurse-schedules ==============================

async function handleNsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const wardCode = (c.query.get('wardCode') ?? '').trim();
  const weekOf = (c.query.get('weekOf') ?? '').trim();

  let rows = Array.from(nsStore.values());
  if (wardCode) rows = rows.filter((r) => r.wardCode === wardCode);
  if (weekOf) rows = rows.filter((r) => r.weekOf === weekOf);
  rows = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/nurse-schedules ==============================

async function handleNsCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const wardCode = body.wardCode;
  const weekOf = body.weekOf;
  const nurseAssignments = body.nurseAssignments;

  if (
    typeof wardCode !== 'string' || !wardCode.trim() ||
    typeof weekOf !== 'string' || !weekOf.trim() ||
    !Array.isArray(nurseAssignments) || nurseAssignments.length === 0
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const assignments: NurseAssignment[] = (nurseAssignments as unknown[]).filter((x): x is NurseAssignment => {
    if (!x || typeof x !== 'object') return false;
    const o = x as NurseAssignment;
    return (
      typeof o.nurseId === 'string' && Boolean(o.nurseId) &&
      typeof o.shift === 'string' && SHIFTS.includes(o.shift as Shift) &&
      typeof o.date === 'string' && Boolean(o.date)
    );
  });

  const violation = validateAssignments(assignments);
  if (violation) return json({ code: violation.code, message: violation.message }, violation.code);

  const rec = addNs({
    wardCode: wardCode.trim(),
    weekOf: weekOf.trim(),
    nurseAssignments: assignments,
    swaps: [],
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/nurse-schedules/:id/swap ==============================

async function handleNsSwap(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = nsStore.get(id);
  if (!rec) return notFound('NurseSchedule', id);

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const requesterId = body.requesterId;
  const targetNurseId = body.targetNurseId;
  const date = body.date;
  const reason = body.reason;

  if (
    typeof requesterId !== 'string' || !requesterId.trim() ||
    typeof targetNurseId !== 'string' || !targetNurseId.trim() ||
    typeof date !== 'string' || !date.trim() ||
    typeof reason !== 'string' || !reason.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const swap: SwapRequest = {
    requesterId: requesterId.trim(),
    targetNurseId: targetNurseId.trim(),
    date: date.trim(),
    reason: reason.trim(),
    approved: false,
    requestedAt: new Date().toISOString(),
  };
  rec.swaps.push(swap);
  return json(ok(rec), 200);
}

export const m559Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nurse-schedules', handle: handleNsList, auth: true },
  { method: 'POST', path: '/api/v1/nurse-schedules', handle: handleNsCreate, auth: true },
  { method: 'POST', path: '/api/v1/nurse-schedules/:id/swap', handle: handleNsSwap, auth: true },
];
