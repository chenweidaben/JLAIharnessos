/**
 * 健澜科技 jlmedaios - 患者端门户集成测试（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { portalView, PatientPortalError } from '../../src/bff/aggregators/patientPortalAggregator.js';

let dbAvailable = false;
let admin: AuthView;

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) await closeDbForTest();
});

const D = dbAvailable ? describe : describe.skip;

D('患者端门户聚合（真实 PG）', () => {
  it('患者角色访问返回各块', async () => {
    const patientView: AuthView = { ...admin, roles: [{ code: 'patient' }] as AuthView['roles'], permissions: ['patient_portal:view'] };
    const v = await portalView(patientView);
    expect(v).toHaveProperty('upcomingAppointments');
    expect(v).toHaveProperty('unreadReportsCount');
    expect(v).toHaveProperty('unreadNotificationsCount');
    expect(v).toHaveProperty('depositBalance');
    expect(v).toHaveProperty('pendingFollowups');
    expect(v).toHaveProperty('pendingSurveys');
  });

  it('非患者角色 -> 403', async () => {
    const staff: AuthView = { ...admin, roles: [{ code: 'doctor' }] as AuthView['roles'], permissions: ['patient_portal:view'] };
    let code = 200;
    try { await portalView(staff); }
    catch (e) { code = e instanceof PatientPortalError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const noPerm: AuthView = { ...admin, roles: [{ code: 'patient' }] as AuthView['roles'], permissions: [] };
    let code = 200;
    try { await portalView(noPerm); }
    catch (e) { code = e instanceof PatientPortalError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
