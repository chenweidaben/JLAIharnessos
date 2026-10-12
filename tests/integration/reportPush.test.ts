/**
 * 健澜科技 jlmedaios - 报告推送集成测试（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listMineView, pushView, viewView } from '../../src/bff/aggregators/reportPushAggregator.js';

let dbAvailable = false;
let admin: AuthView;

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.report_pushes WHERE pushed_by = ${admin.id} AND patient_id = ${admin.id}`;
    await closeDbForTest();
  }
});
const D = dbAvailable ? describe : describe.skip;

D('报告推送（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('report_push:manage');
    expect(admin.permissions).toContain('report:view_patient');
  });

  it('推送+幂等+回执+view_count累加', async () => {
    const rid = crypto.randomUUID();
    const r1 = await pushView(admin, { reportType: 'lab', reportId: rid, patientId: admin.id });
    expect(r1.status).toBe('pushed');

    // 重复推送幂等
    const r2 = await pushView(admin, { reportType: 'lab', reportId: rid, patientId: admin.id });
    expect(r2.id).toBe(r1.id);

    // 列表
    const list = await listMineView(admin, admin.id);
    expect(list.unread).toBeGreaterThanOrEqual(1);

    // 查看回执
    const v = await viewView(admin, r1.id);
    expect(v?.status).toBe('viewed');
    expect(v?.viewCount).toBeGreaterThanOrEqual(1);
  });
});
