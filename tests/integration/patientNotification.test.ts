/**
 * 健澜科技 jlmedaios - 通知中心集成测试（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listView, markAllReadView, markReadView, notifyFor, unreadView } from '../../src/bff/aggregators/patientNotificationAggregator.js';

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
    await db`DELETE FROM clinical.patient_notifications WHERE patient_id = ${admin.id}`;
    await closeDbForTest();
  }
});
const D = dbAvailable ? describe : describe.skip;

D('通知中心（真实 PG）', () => {
  it('权限', () => {
    expect(admin.permissions).toContain('notification:read');
  });

  it('create+list+unread+markRead+markAll', async () => {
    await notifyFor(undefined, { patientId: admin.id, notifType: 'report_pushed', title: 't', body: 'b', actorId: admin.id });

    const before = await unreadView(admin, admin.id);
    expect(before.unread).toBeGreaterThanOrEqual(1);

    const list = await listView(admin, admin.id);
    expect(list.items.length).toBeGreaterThanOrEqual(1);

    // 标记已读
    const first = list.items[0];
    await markReadView(admin, admin.id, first.id);

    // 全部已读
    await markAllReadView(admin, admin.id);
    const after = await unreadView(admin, admin.id);
    expect(after.unread).toBe(0);
  });
});
