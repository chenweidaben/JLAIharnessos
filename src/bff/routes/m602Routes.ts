/**
 * 健澜科技 jlmedaios - M602 新标准 P15：排班管理 5 端点
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type ShiftType = 'morning' | 'afternoon' | 'night' | 'on_call';
type StaffRole = 'doctor' | 'nurse' | 'technician';
type SwapStatus = 'pending' | 'approved' | 'rejected';

interface ShiftRecord {
  id: string;
  staffId: string;
  staffName: string;
  deptCode: string;
  shiftDate: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  role: StaffRole;
  swapRequests: Array<{
    id: string;
    requestedBy: string;
    targetStaffId: string;
    reason: string;
    status: SwapStatus;
    requestedAt: string;
  }>;
  createdAt: string;
}

const shiftStore = new Map<string, ShiftRecord>();
let shiftSeq = 0;
let swapSeq = 0;

function addShift(r: Omit<ShiftRecord, 'id' | 'swapRequests'>): ShiftRecord {
  shiftSeq += 1;
  const rec: ShiftRecord = { ...r, id: `SHF-${String(shiftSeq).padStart(3, '0')}`, swapRequests: [] };
  shiftStore.set(rec.id, rec);
  return rec;
}

function seedShifts(): void {
  const now = Date.now();
  const iso = (offsetMin: number): string => new Date(now - offsetMin * 60_000).toISOString();
  const depts = ['DEPT-INT', 'DEPT-SURG', 'DEORT', 'DEPT-PED', 'DEPT-GYN'];
  const names = ['张伟', '李娜', '王强', '刘洋', '陈静', '杨明', '赵芳', '孙磊', '周敏', '吴刚'];
  const types: ShiftType[] = ['morning', 'afternoon', 'night', 'on_call'];
  const roles: StaffRole[] = ['doctor', 'nurse', 'technician'];
  const timeMap: Record<ShiftType, [string, string]> = {
    morning: ['08:00', '16:00'],
    afternoon: ['16:00', '00:00'],
    night: ['00:00', '08:00'],
    on_call: ['00:00', '24:00'],
  };
  for (let i = 0; i < 100; i += 1) {
    const dept = depts[i % depts.length];
    const name = names[i % names.length];
    const type = types[i % types.length];
    const role = roles[i % roles.length];
    const [st, et] = timeMap[type];
    const date = new Date(now - (i % 30) * 86_400_000).toISOString().slice(0, 10);
    addShift({
      staffId: `STF-${String(i + 1).padStart(3, '0')}`,
      staffName: name,
      deptCode: dept,
      shiftDate: date,
      shiftType: type,
      startTime: st,
      endTime: et,
      role,
      createdAt: iso(i),
    });
  }
  for (let i = 0; i < 10; i += 1) {
    const rec = Array.from(shiftStore.values())[i * 5];
    if (rec) {
      swapSeq += 1;
      rec.swapRequests.push({
        id: `SWP-${String(swapSeq).padStart(3, '0')}`,
        requestedBy: rec.staffId,
        targetStaffId: `STF-${String(((i + 3) % 100) + 1).padStart(3, '0')}`,
        reason: ['事假', '病假', '调休', '家中有事'][i % 4],
        status: (['pending', 'approved', 'rejected'] as SwapStatus[])[i % 3],
        requestedAt: iso(i * 10),
      });
    }
  }
}

seedShifts();

async function handleShiftList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const deptCode = (c.query.get('deptCode') ?? '').trim();
  const date = (c.query.get('date') ?? '').trim();
  let items = Array.from(shiftStore.values());
  if (deptCode) items = items.filter((r) => r.deptCode === deptCode);
  if (date) items = items.filter((r) => r.shiftDate === date);
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return json(ok({ items, totalCount: items.length }), 200);
}

async function handleShiftCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const { staffId, staffName, deptCode, shiftDate, shiftType, startTime, endTime, role } = body as Record<string, unknown>;
  if (typeof staffId !== 'string' || typeof shiftDate !== 'string' || typeof shiftType !== 'string') {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }
  const existing = Array.from(shiftStore.values()).find(
    (r) => r.staffId === staffId && r.shiftDate === shiftDate && r.shiftType === shiftType,
  );
  if (existing) return json({ code: 409, message: 'duplicate_shift' }, 409);
  const rec = addShift({
    staffId,
    staffName: typeof staffName === 'string' ? staffName : '',
    deptCode: typeof deptCode === 'string' ? deptCode : '',
    shiftDate,
    shiftType: shiftType as ShiftType,
    startTime: typeof startTime === 'string' ? startTime : '',
    endTime: typeof endTime === 'string' ? endTime : '',
    role: (typeof role === 'string' ? role : 'nurse') as StaffRole,
    createdAt: new Date().toISOString(),
  });
  return json(ok(rec), 200);
}

async function handleShiftSwap(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const id = (c.params.id ?? '').trim();
  const rec = shiftStore.get(id);
  if (!rec) return json({ code: 404, message: 'not_found' }, 404);
  let body: Record<string, unknown> | null = null;
  try { body = await c.body<Record<string, unknown>>(); } catch { body = null; }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);
  const pending = rec.swapRequests.find((s) => s.status === 'pending');
  if (pending) return json({ code: 409, message: 'already_pending' }, 409);
  swapSeq += 1;
  const swap = {
    id: `SWP-${String(swapSeq).padStart(3, '0')}`,
    requestedBy: typeof body.requestedBy === 'string' ? body.requestedBy : rec.staffId,
    targetStaffId: typeof body.targetStaffId === 'string' ? body.targetStaffId : '',
    reason: typeof body.reason === 'string' ? body.reason : '',
    status: 'pending' as SwapStatus,
    requestedAt: new Date().toISOString(),
  };
  rec.swapRequests.push(swap);
  return json(ok(swap), 200);
}

async function handleStaffCalendar(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const staffId = (c.params.staffId ?? '').trim();
  const items = Array.from(shiftStore.values()).filter((r) => r.staffId === staffId);
  const nightCount = items.filter((r) => r.shiftType === 'night').length;
  const onCallCount = items.filter((r) => r.shiftType === 'on_call').length;
  return json(ok({
    staffId,
    totalShifts: items.length,
    nightCount,
    onCallCount,
    items: items.slice(0, 30),
  }), 200);
}

async function handleCoverage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const byDept = new Map<string, { expected: number; actual: number }>();
  for (const r of shiftStore.values()) {
    if (!byDept.has(r.deptCode)) byDept.set(r.deptCode, { expected: 10, actual: 0 });
    byDept.get(r.deptCode)!.actual += 1;
  }
  const coverage = Array.from(byDept.entries()).map(([deptCode, v]) => ({
    deptCode,
    expected: v.expected,
    actual: v.actual,
    gap: Math.max(0, v.expected - v.actual),
    rate: Math.round((v.actual / v.expected) * 1000) / 10,
  }));
  return json(ok({ items: coverage, totalCount: coverage.length }), 200);
}

export const m602Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/scheduling/shifts', handle: handleShiftList, auth: true },
  { method: 'POST', path: '/api/v1/scheduling/shifts', handle: handleShiftCreate, auth: true },
  { method: 'POST', path: '/api/v1/scheduling/shifts/:id/swap', handle: handleShiftSwap, auth: true },
  { method: 'GET', path: '/api/v1/scheduling/staff/:staffId/calendar', handle: handleStaffCalendar, auth: true },
  { method: 'GET', path: '/api/v1/scheduling/coverage', handle: handleCoverage, auth: true },
];
