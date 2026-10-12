/**
 * 健澜科技 jlmedaios - 号源排班集成测试（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import {
  bookSlotView,
  cancelBookingView,
  createScheduleView,
  ScheduleError,
} from '../../src/bff/aggregators/scheduleSlotAggregator.js';

let dbAvailable = false;
let admin: AuthView;

async function statusOf(p: Promise<unknown>): Promise<number> {
  try { await p; return 200; } catch (e) {
    if (e instanceof ScheduleError) return e.status;
    throw e;
  }
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => { if (dbAvailable) await closeDbForTest(); });
const D = dbAvailable ? describe : describe.skip;

D('号源排班（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('schedule:manage');
    expect(admin.permissions).toContain('schedule:book');
  });

  it('建排班+约号写appointment+超号409+退号', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const sched = await createScheduleView(admin, {
      doctorId: crypto.randomUUID(), department: 'M19A_TEST', workDate: tomorrow, note: 'test',
      slots: [{ slotStart: `${tomorrow}T09:00:00Z`, slotEnd: `${tomorrow}T09:30:00Z`, totalQuota: 1 }],
    });
    expect(sched.slots).toHaveLength(1);
    const sid = sched.slots[0].id;
    const p = await createPatient({ mrn: `M19C${Date.now()}`, nameMasked: 'P*19c', gender: '男', birthDate: '1990-01-01' });

    // 约号成功，应返回 appointment_no
    const booked = await bookSlotView(admin, sid, { patientId: p.id, department: 'TestDept' });
    expect(booked.appointmentNo).toMatch(/^APT-/);

    // 二次约号超号 409
    const s = await statusOf(bookSlotView(admin, sid, { patientId: p.id, department: 'TestDept' }));
    expect(s).toBe(409);

    // 退号回补
    const c = await cancelBookingView(admin, sid);
    expect(c.bookedCount).toBe(0);
  });
});
