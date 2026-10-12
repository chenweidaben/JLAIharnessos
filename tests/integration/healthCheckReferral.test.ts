/**
 * 健澜科技 jlmedaios - M40-B 体检转诊集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { mapFinding, severity } from '../../src/medical-tools/nursing/healthCheckReferral.js';
import { createReferralView, listReferralsView, dismissView, ReferralError } from '../../src/bff/aggregators/healthCheckReferralAggregator.js';

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

describe('纯函数', () => {
  it('科室映射', () => {
    expect(mapFinding('blood_pressure_high')).toBe('心血管内科');
    expect(mapFinding('fasting_glucose_high')).toBe('内分泌科');
    expect(mapFinding('lung_nodule')).toBe('胸外科');
    expect(mapFinding('unknown')).toBe('全科');
  });
  it('严重度', () => {
    expect(severity('critical')).toBe('high');
    expect(severity('abnormal')).toBe('medium');
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
    await db`DELETE FROM clinical.healthcheck_referrals WHERE order_id IN (SELECT id FROM clinical.health_check_orders WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M40B_TEST"]'::jsonb))`;
    await db`DELETE FROM clinical.health_check_orders WHERE patient_id IN (SELECT id FROM clinical.patients WHERE tags @> '["M40B_TEST"]'::jsonb)`;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M40B_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('体检转诊（真实 PG）', () => {
  it('建 referral 200 且科室映射正确', async () => {
    const db = getDb();
    const p = await createPatient({ mrn: `M40B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男', birthDate: '1960-01-01', tags: ['M40B_TEST'] });
    const pkgRow = await db`SELECT id FROM clinical.health_check_packages LIMIT 1`;
    const pkgId = String(pkgRow[0].id);
    const orderRow = await db`
      INSERT INTO clinical.health_check_orders (package_id, patient_id, appointment_date)
      VALUES (${pkgId}, ${p.id}, '2026-10-14') RETURNING id`;
    const orderId = String(orderRow[0].id);
    const r = await createReferralView(admin, { orderId, abnormalItem: 'blood_pressure_high', findingDetail: 'SBP 160' });
    expect(r.suggestedDepartment).toBe('心血管内科');
  });
  it('dismiss 后状态', async () => {
    const db = getDb();
    const p = await createPatient({ mrn: `M40B${seq()}`, nameMasked: `P*${seq().slice(-4)}`, gender: '男', birthDate: '1960-01-01', tags: ['M40B_TEST'] });
    const pkgRow = await db`SELECT id FROM clinical.health_check_packages LIMIT 1`;
    const orderRow = await db`
      INSERT INTO clinical.health_check_orders (package_id, patient_id, appointment_date)
      VALUES (${String(pkgRow[0].id)}, ${p.id}, '2026-10-14') RETURNING id`;
    const orderId = String(orderRow[0].id);
    const r = await createReferralView(admin, { orderId, abnormalItem: 'TEST_REF_DISMISS' });
    const d = await dismissView(admin, r.id);
    expect(d.appointmentStatus).toBe('dismissed');
  });
  it('越权 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await createReferralView(fake, { orderId: '00000000-0000-0000-0000-000000000001', abnormalItem: 'x' });
    } catch (e) { if (e instanceof ReferralError) status = e.status; }
    expect(status).toBe(403);
  });
});
