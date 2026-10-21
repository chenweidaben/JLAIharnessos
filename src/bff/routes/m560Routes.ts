/**
 * 健澜科技 jlmedaios - M560 新标准 P4：手术排程闭环 3 端点
 *
 * GET  /api/v1/surgery-schedule?date=&orRoom=   列表（scheduledStart 升序；过滤参数）
 * POST /api/v1/surgery-schedule                  新建（同 OR 时段重叠 409·emergency 插队豁免）
 * POST /api/v1/surgery-schedule/:id/cancel       取消（已 cancelled 重复 409 already_cancelled）
 *
 * 后端校验规则：
 *   - 同 orRoom 下已有 scheduled 状态手术与新手术时段重叠（start<existingEnd && end>existingStart）→ 409 or_room_time_conflict
 *   - priority=emergency 跳过重叠校验，直接入库（插队）
 *
 * 种子 2026-10-22 共 8 台：OR-1×2 + OR-2×3 + OR-3×3，覆盖 electron/urgent/emergency。
 * 内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type Priority = 'electron' | 'urgent' | 'emergency';
const PRIORITIES: Priority[] = ['electron', 'urgent', 'emergency'];

type SsStatus = 'scheduled' | 'cancelled';

interface SsRecord {
  id: string;
  patientId: string;
  operationName: string;
  surgeonId: string;
  anesthetistId: string;
  orRoom: string;
  scheduledStart: string;
  scheduledEnd: string;
  priority: Priority;
  status: SsStatus;
  cancelReason: string | null;
  cancelledBy: string | null;
  createdAt: string;
}

// ============================== 内存态库（DEMO 短路） ==============================

const ssStore = new Map<string, SsRecord>();
let ssSeq = 0;

function addSs(r: Omit<SsRecord, 'id'>): SsRecord {
  ssSeq += 1;
  const rec: SsRecord = { ...r, id: `SS-${String(ssSeq).padStart(3, '0')}` };
  ssStore.set(rec.id, rec);
  return rec;
}

function seedSs(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const D = '2026-10-22T';

  // OR-1
  addSs({ patientId: 'P-S001', operationName: '腹腔镜胆囊切除术', surgeonId: 'SURGEON-001', anesthetistId: 'ANESTH-001', orRoom: 'OR-1', scheduledStart: `${D}08:00:00Z`, scheduledEnd: `${D}10:00:00Z`, priority: 'electron', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 7) });
  addSs({ patientId: 'P-S002', operationName: '阑尾切除术', surgeonId: 'SURGEON-002', anesthetistId: 'ANESTH-002', orRoom: 'OR-1', scheduledStart: `${D}10:30:00Z`, scheduledEnd: `${D}12:00:00Z`, priority: 'urgent', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 6) });

  // OR-2
  addSs({ patientId: 'P-S003', operationName: '甲状腺次全切', surgeonId: 'SURGEON-003', anesthetistId: 'ANESTH-001', orRoom: 'OR-2', scheduledStart: `${D}09:00:00Z`, scheduledEnd: `${D}11:00:00Z`, priority: 'electron', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 5) });
  addSs({ patientId: 'P-S004', operationName: '乳腺纤维瘤切除', surgeonId: 'SURGEON-004', anesthetistId: 'ANESTH-003', orRoom: 'OR-2', scheduledStart: `${D}13:00:00Z`, scheduledEnd: `${D}15:00:00Z`, priority: 'electron', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 4) });
  addSs({ patientId: 'P-S005', operationName: '肠梗阻探查', surgeonId: 'SURGEON-002', anesthetistId: 'ANESTH-002', orRoom: 'OR-2', scheduledStart: `${D}15:30:00Z`, scheduledEnd: `${D}17:00:00Z`, priority: 'urgent', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 3) });

  // OR-3
  addSs({ patientId: 'P-S006', operationName: '髋关节置换', surgeonId: 'SURGEON-005', anesthetistId: 'ANESTH-004', orRoom: 'OR-3', scheduledStart: `${D}08:30:00Z`, scheduledEnd: `${D}10:30:00Z`, priority: 'electron', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24 * 2) });
  addSs({ patientId: 'P-S007', operationName: '膝关节镜', surgeonId: 'SURGEON-005', anesthetistId: 'ANESTH-004', orRoom: 'OR-3', scheduledStart: `${D}11:00:00Z`, scheduledEnd: `${D}13:00:00Z`, priority: 'electron', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60 * 24) });
  addSs({ patientId: 'P-S008', operationName: '脑外伤开颅', surgeonId: 'SURGEON-006', anesthetistId: 'ANESTH-005', orRoom: 'OR-3', scheduledStart: `${D}14:00:00Z`, scheduledEnd: `${D}16:00:00Z`, priority: 'emergency', status: 'scheduled', cancelReason: null, cancelledBy: null, createdAt: iso(60) });
}
seedSs();

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

/** 校验同 OR 时段重叠；返回 true 表示冲突 */
function hasOverlap(orRoom: string, start: string, end: string): boolean {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  for (const rec of ssStore.values()) {
    if (rec.orRoom !== orRoom) continue;
    if (rec.status !== 'scheduled') continue;
    const eStart = Date.parse(rec.scheduledStart);
    const eEnd = Date.parse(rec.scheduledEnd);
    if (startMs < eEnd && endMs > eStart) return true;
  }
  return false;
}

// ============================== 1. GET /api/v1/surgery-schedule ==============================

async function handleSsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const date = (c.query.get('date') ?? '').trim();
  const orRoom = (c.query.get('orRoom') ?? '').trim();

  let rows = Array.from(ssStore.values());
  if (date) rows = rows.filter((r) => r.scheduledStart.startsWith(date));
  if (orRoom) rows = rows.filter((r) => r.orRoom === orRoom);
  rows = rows.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 2. POST /api/v1/surgery-schedule ==============================

async function handleSsCreate(c: Ctx): Promise<Response> {
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
  const operationName = body.operationName;
  const surgeonId = body.surgeonId;
  const anesthetistId = body.anesthetistId;
  const orRoom = body.orRoom;
  const scheduledStart = body.scheduledStart;
  const scheduledEnd = body.scheduledEnd;
  const priority = body.priority;

  if (
    typeof patientId !== 'string' || !patientId.trim() ||
    typeof operationName !== 'string' || !operationName.trim() ||
    typeof surgeonId !== 'string' || !surgeonId.trim() ||
    typeof anesthetistId !== 'string' || !anesthetistId.trim() ||
    typeof orRoom !== 'string' || !orRoom.trim() ||
    typeof scheduledStart !== 'string' || !scheduledStart.trim() ||
    typeof scheduledEnd !== 'string' || !scheduledEnd.trim() ||
    typeof priority !== 'string' || !PRIORITIES.includes(priority as Priority)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const prio = priority as Priority;
  // emergency 插队豁免重叠校验
  if (prio !== 'emergency' && hasOverlap(orRoom.trim(), scheduledStart, scheduledEnd)) {
    return json({ code: 409, message: 'or_room_time_conflict' }, 409);
  }

  const rec = addSs({
    patientId: patientId.trim(),
    operationName: operationName.trim(),
    surgeonId: surgeonId.trim(),
    anesthetistId: anesthetistId.trim(),
    orRoom: orRoom.trim(),
    scheduledStart: scheduledStart.trim(),
    scheduledEnd: scheduledEnd.trim(),
    priority: prio,
    status: 'scheduled',
    cancelReason: null,
    cancelledBy: null,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

// ============================== 3. POST /api/v1/surgery-schedule/:id/cancel ==============================

async function handleSsCancel(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = ssStore.get(id);
  if (!rec) return notFound('SurgerySchedule', id);

  if (rec.status === 'cancelled') {
    return json({ code: 409, message: 'already_cancelled' }, 409);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const cancelReason = body.cancelReason;
  const cancelledBy = body.cancelledBy;

  if (
    typeof cancelReason !== 'string' || !cancelReason.trim() ||
    typeof cancelledBy !== 'string' || !cancelledBy.trim()
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  rec.status = 'cancelled';
  rec.cancelReason = cancelReason.trim();
  rec.cancelledBy = cancelledBy.trim();
  return json(ok(rec), 200);
}

export const m560Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgery-schedule', handle: handleSsList, auth: true },
  { method: 'POST', path: '/api/v1/surgery-schedule', handle: handleSsCreate, auth: true },
  { method: 'POST', path: '/api/v1/surgery-schedule/:id/cancel', handle: handleSsCancel, auth: true },
];
