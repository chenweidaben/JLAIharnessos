/**
 * 健澜科技 jlmedaios - M40-A 体检中心集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { progress, allItemsCompleted } from '../../src/medical-tools/nursing/healthCheck.js';
import { listPackagesView, createOrderView, completeItemView, getOrderView, HealthCheckError } from '../../src/bff/aggregators/healthCheckAggregator.js';

describe('纯函数', () => {
  it('progress', () => {
    expect(progress(1, 4)).toBe(25);
    expect(progress(4, 4)).toBe(100);
  });
  it('allItemsCompleted', () => {
    expect(allItemsCompleted([{ completed: true }, { completed: true }])).toBe(true);
    expect(allItemsCompleted([{ completed: true }, { completed: false }])).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;
const TAG = 'M40A_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newPatient() {
  return createPatient({ mrn: `M40A${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男', birthDate: '1960-01-01', tags: [TAG] });
}

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.health_check_order_items WHERE order_id IN (SELECT id FROM clinical.health_check_orders WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M40A_TEST"]'::jsonb))`;
    await db`DELETE FROM clinical.health_check_orders WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M40A_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M40A_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('体检中心（真实 PG）', () => {
  it('开单 200', async () => {
    const pkgs = await listPackagesView(admin);
    if (pkgs.length === 0) return;
    const p = await newPatient();
    const r = await createOrderView(admin, { packageId: pkgs[0].id, patientId: p.id, appointmentDate: '2026-10-14' });
    expect(r.items.length).toBeGreaterThan(0);
    expect(r.progress).toBe(0);
  });
  it('逐项完成→全部完成自动 completed', async () => {
    const pkgs = await listPackagesView(admin);
    if (pkgs.length === 0) return;
    const p = await newPatient();
    const r = await createOrderView(admin, { packageId: pkgs[0].id, patientId: p.id, appointmentDate: '2026-10-14' });
    let reportPushed = false;
    for (const it of r.items) {
      const res = await completeItemView(admin, r.order.id, it.itemName);
      if (res.reportPushed) reportPushed = true;
    }
    expect(reportPushed).toBe(true);
    const detail = await getOrderView(admin, r.order.id);
    expect(detail.order.status).toBe('completed');
    expect(detail.progress).toBe(100);
  });
  it('越权 403（无 healthcheck:manage）', async () => {
    const pkgs = await listPackagesView(admin);
    if (pkgs.length === 0) return;
    const p = await newPatient();
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: ['healthcheck:view'] };
      await createOrderView(fake, { packageId: pkgs[0].id, patientId: p.id, appointmentDate: '2026-10-14' });
    } catch (e) { if (e instanceof HealthCheckError) status = e.status; }
    expect(status).toBe(403);
  });
});
