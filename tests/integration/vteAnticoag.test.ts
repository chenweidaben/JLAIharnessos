/**
 * 健澜科技 jlmedaios - M46-A VTE 抗凝集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { courseProgress, highBleedingRisk, isOverdue } from '../../src/medical-tools/nursing/vteAnticoag.js';
import { startView, bleedingView, stopView, VteError } from '../../src/bff/aggregators/vteAnticoagAggregator.js';

describe('纯函数', () => {
  it('进度', () => {
    const today = new Date();
    const start = new Date(today.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    expect(courseProgress(start, 7, today)).toBe(Math.round(3 / 7 * 100));
  });
  it('高出血', () => {
    expect(highBleedingRisk(45)).toBe(true);
    expect(highBleedingRisk(20)).toBe(false);
  });
  it('过期', () => {
    const today = new Date();
    const start = new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10);
    expect(isOverdue(start, 7, today)).toBe(true);
  });
});

let dbAvailable = false;
let admin: AuthView;

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.vte_anticoagulations WHERE visit_id='00000000-0000-0000-0000-000000000001'`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('VTE 抗凝（真实 PG）', () => {
  it('启动抗凝 200', async () => {
    const r = await startView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      drug: 'enoxaparin', startDate: '2026-10-13', plannedDays: 7,
    });
    expect(r.drug).toBe('enoxaparin');
    expect(r.active).toBe(true);
  });
  it('bleeding>=40 自动建 source=vte 工单', async () => {
    const r = await startView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      drug: 'warfarin', startDate: '2026-10-13', plannedDays: 30,
    });
    const b = await bleedingView(admin, r.id, 50);
    expect(b.taskId).toBeTruthy();
  });
  it('bleeding<40 不建工单', async () => {
    const r = await startView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      drug: 'apixaban', startDate: '2026-10-13', plannedDays: 14,
    });
    const b = await bleedingView(admin, r.id, 10);
    expect(b.taskId).toBeNull();
  });
  it('停药', async () => {
    const r = await startView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      drug: 'heparin', startDate: '2026-10-13', plannedDays: 5,
    });
    const s = await stopView(admin, r.id, '2026-10-18');
    expect(s.active).toBe(false);
  });
  it('越权 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await startView(fake, { visitId: '00000000-0000-0000-0000-000000000001', drug: 'heparin', startDate: '2026-10-13', plannedDays: 5 });
    } catch (e) { if (e instanceof VteError) status = e.status; }
    expect(status).toBe(403);
  });
});
