/**
 * 健澜科技 jlmedaios - M39-B 患者端慢病视图集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { dueSoon, summarize } from '../../src/medical-tools/nursing/patientChronic.js';
import { myChronicView, PatientChronicError } from '../../src/bff/aggregators/patientChronicAggregator.js';

describe('纯函数', () => {
  it('dueSoon', () => {
    const now = new Date();
    expect(dueSoon(now, new Date(now.getTime() + 3 * 86400000))).toBe(true);
    expect(dueSoon(now, new Date(now.getTime() + 30 * 86400000))).toBe(false);
  });
  it('summarize', () => {
    const s = summarize(
      [{ disease: 'hypertension', nextFollowupAt: new Date(Date.now() + 5 * 86400000).toISOString() }],
      [{ sbp: 130, dbp: 85, fastingGlucose: null, hba1c: null, measuredAt: new Date().toISOString() }],
      new Date(),
    );
    expect(s.planCount).toBe(1);
    expect(s.vitalsCount).toBe(1);
    expect(s.dueSoon).toBe(true);
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M39B_TEST';

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => { if (dbAvailable) await closeDbForTest(); });
const R = dbAvailable ? describe : describe.skip;
R('患者端慢病（真实 PG）', () => {
  it('非患者角色 403', async () => {
    let status = 200;
    try { await myChronicView(admin); }
    catch (e) { if (e instanceof PatientChronicError) status = e.status; }
    expect(status).toBe(403);
  });
  it('无权限 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, rawRoles: ['patient'], permissions: [] };
      await myChronicView(fake);
    } catch (e) { if (e instanceof PatientChronicError) status = e.status; }
    expect(status).toBe(403);
  });
});
