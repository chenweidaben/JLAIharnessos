/**
 * 健澜科技 jlmedaios - 医生站工作台集成测试（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { workbenchView, WorkbenchError } from '../../src/bff/aggregators/doctorWorkbenchAggregator.js';

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

D('医生站工作台聚合（真实 PG）', () => {
  it('权限码在位', () => {
    expect(admin.permissions).toContain('workbench:view');
  });

  it('返回各块', async () => {
    const wb = await workbenchView(admin);
    expect(wb).toHaveProperty('openTasksCount');
    expect(wb).toHaveProperty('unreadNotifications');
    expect(wb).toHaveProperty('activeObservations');
    expect(wb).toHaveProperty('pendingPlans');
    expect(wb).toHaveProperty('departmentKpis');
    expect(wb).toHaveProperty('summary');
  });

  it('越权（self）-> 403', async () => {
    const outsider: AuthView = { ...admin, id: '00000000-0000-4000-8000-000000000079', dataScope: 'self' };
    let code = 200;
    try { await workbenchView(outsider); }
    catch (e) { code = e instanceof WorkbenchError ? e.status : 500; }
    expect(code).toBe(403);
  });

  it('无权限码 -> 403', async () => {
    const noPerm: AuthView = { ...admin, permissions: [] };
    let code = 200;
    try { await workbenchView(noPerm); }
    catch (e) { code = e instanceof WorkbenchError ? e.status : 500; }
    expect(code).toBe(403);
  });
});
