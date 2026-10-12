/**
 * 健澜科技 jlmedaios - M46-B 院感自动工单纯函数+集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { needsTask } from '../../src/medical-tools/nursing/nissAlert.js';
import { reportView, NissError } from '../../src/bff/aggregators/nissAggregator.js';

describe('纯函数', () => {
  it('needsTask', () => {
    expect(needsTask('SSI')).toBe(true);
    expect(needsTask('CRBSI')).toBe(true);
    expect(needsTask('pneumonia')).toBe(false);
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
R('院感自动工单（真实 PG）', () => {
  it('上报 SSI 自动建 source=infection 工单', async () => {
    const r = await reportView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      infectionType: 'SSI', pathogen: 'staph',
    });
    expect(r.taskId).toBeTruthy();
  });
  it('pneumonia 不建', async () => {
    const r = await reportView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      infectionType: 'pneumonia',
    });
    expect(r.taskId).toBeNull();
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
