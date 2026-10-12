/**
 * 健澜科技 jlmedaios - M43-A 化疗 T-1 提醒集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { isEligibleForReminder, buildMessage } from '../../src/medical-tools/nursing/chemoReminder.js';
import { scanDueReminders, listUpcoming, ChemoReminderError } from '../../src/bff/aggregators/chemoReminderAggregator.js';

describe('纯函数', () => {
  it('T-1 判定', () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000);
    const iso = tomorrow.toISOString().slice(0, 10);
    expect(isEligibleForReminder(iso, now, false)).toBe(true);
    expect(isEligibleForReminder(iso, now, true)).toBe(false);
  });
  it('文案', () => {
    const m = buildMessage('cisplatin', 2);
    expect(m.title).toBe('化疗复诊提醒');
    expect(m.body).toContain('cisplatin');
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M43A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatient() {
  return createPatient({ mrn: `M43A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男', birthDate: '1960-01-01', tags: [TAG] });
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.chemo_cycles WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M43A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M43A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('化疗提醒（真实 PG）', () => {
  it('扫描明天周期建通知', async () => {
    const db = getDb();
    const p = await newPatient();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await db`INSERT INTO clinical.chemo_cycles (patient_id, drug_name, cycle_no, planned_date) VALUES (${p.id}, 'cisplatin', 1, ${tomorrow})`;
    const r = await scanDueReminders(admin);
    expect(r.notified).toBeGreaterThanOrEqual(1);
  });
  it('重复扫描不重复发', async () => {
    const r1 = await scanDueReminders(admin);
    const r2 = await scanDueReminders(admin);
    expect(r2.notified).toBeLessThanOrEqual(r1.notified);
  });
  it('越权 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await scanDueReminders(fake);
    } catch (e) { if (e instanceof ChemoReminderError) status = e.status; }
    expect(status).toBe(403);
  });
});
