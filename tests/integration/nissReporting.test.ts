/**
 * 健澜科技 jlmedaios - M45-A 院感上报集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { requiresIsolation, infectionCategory, severity } from '../../src/medical-tools/nursing/nissReporting.js';
import { reportView, listView, patchStatusView, NissError } from '../../src/bff/aggregators/nissAggregator.js';

describe('纯函数', () => {
  it('分类', () => {
    expect(infectionCategory('SSI')).toBe('surgical_site');
    expect(infectionCategory('CRBSI')).toBe('catheter_bloodstream');
  });
  it('隔离判定', () => {
    expect(requiresIsolation('CRBSI')).toBe(true);
    expect(requiresIsolation('pneumonia')).toBe(true);
    expect(requiresIsolation('SSI')).toBe(false);
  });
  it('严重度', () => {
    expect(severity('CRBSI')).toBe('high');
    expect(severity('SSI')).toBe('standard');
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
    await db`DELETE FROM clinical.nosocomial_infections WHERE visit_id='00000000-0000-0000-0000-000000000001'`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('院感上报（真实 PG）', () => {
  it('上报 200 CRBSI 自动 isolation', async () => {
    const r = await reportView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      infectionType: 'CRBSI', pathogen: 'staph aureus',
    });
    expect(r.isolationRequired).toBe(true);
    expect(r.status).toBe('reported');
  });
  it('状态流转 reported->under_investigation->resolved', async () => {
    const r = await reportView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001', infectionType: 'SSI',
    });
    const u1 = await patchStatusView(admin, r.id, 'under_investigation');
    expect(u1.status).toBe('under_investigation');
    const u2 = await patchStatusView(admin, r.id, 'resolved');
    expect(u2.status).toBe('resolved');
  });
  it('越权 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await reportView(fake, { visitId: '00000000-0000-0000-0000-000000000001', infectionType: 'SSI' });
    } catch (e) { if (e instanceof NissError) status = e.status; }
    expect(status).toBe(403);
  });
});
