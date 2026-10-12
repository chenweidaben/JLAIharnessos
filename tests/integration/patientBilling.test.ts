/**
 * 健澜科技 jlmedaios - 患者端住院费用视图集成测试（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, execTestCleanup, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { patientBillingView, PatientBillingError } from '../../src/bff/aggregators/patientBillingAggregator.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';

let dbAvailable = false;
let admin: AuthView;
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const cleanupPatientIds: string[] = [];

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (!u) throw new Error('缺 admin');
  admin = buildAuthView(u, await getUserRoleLinks(u.id));
}

afterAll(async () => {
  if (dbAvailable) {
    await execTestCleanup(async (sql) => {
      for (const pid of cleanupPatientIds) {
        await sql`DELETE FROM clinical.fee_items WHERE patient_id = ${pid}`;
        await sql`DELETE FROM clinical.visits WHERE patient_id = ${pid}`;
        await sql`DELETE FROM clinical.patients WHERE id = ${pid}`;
      }
    });
    await closeDbForTest();
  }
});

const D = dbAvailable ? describe : describe.skip;

async function seedPatientWithFees() {
  const patient = await createPatient({
    mrn: `M50${seq()}`, nameMasked: `费*${seq().slice(-4)}`, gender: '男',
    birthDate: '1960-01-01', tags: ['M50_TEST'],
  });
  cleanupPatientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id, visitType: 'inpatient', department: '心血管内科',
    chiefComplaint: 'x', status: 'ongoing',
  });
  const db = getDb();
  await db`INSERT INTO clinical.fee_items (patient_id, visit_id, category, item_name, quantity, unit_price, source_type, status, department)
    VALUES
      (${patient.id}, ${visit.id}, 'drug', '阿莫西林', 1, 50, 'drug', 'active', '心血管内科'),
      (${patient.id}, ${visit.id}, 'lab', '血常规', 1, 30, 'lab', 'active', '检验科'),
      (${patient.id}, ${visit.id}, 'treatment', '输液', 2, 10, 'treatment', 'active', '心血管内科')`;
  return { patientId: patient.id, visitId: visit.id };
}

D('患者端住院费用视图（真实 PG）', () => {
  it('admin 权限码在位', () => {
    expect(admin.permissions).toContain('patient_billing:view');
  });

  it('患者查自己（admin 代查）200：分类汇总+医保预估+押金余额', async () => {
    const { patientId } = await seedPatientWithFees();
    const view = await patientBillingView(admin, patientId);
    expect(view.patientId).toBe(patientId);
    expect(view.visitStatus).toBe('ongoing');
    expect(view.breakdown.byCategory.drug).toBe(50);
    expect(view.breakdown.byCategory.exam).toBe(30);
    expect(view.breakdown.byCategory.treatment).toBe(20);
    expect(view.breakdown.total).toBe(100);
    // 默认比例 0.6 → 自付 40，医保 60
    expect(view.insuranceEstimate.patientOutOfPocket).toBe(40);
    expect(view.insuranceEstimate.estimatedInsurancePaid).toBe(60);
    // 无押金记录 → 余额 = 0 − 100 = -100
    expect(view.deposit.balance).toBe(-100);
    expect(view.itemCount).toBe(3);
  });

  it('非院方角色查别人 patient_id → 403', async () => {
    const { patientId } = await seedPatientWithFees();
    const patientView: AuthView = {
      ...admin,
      id: '00000000-0000-4000-8000-0000000000aa',
      rawRoles: ['patient'],
      permissions: ['patient_billing:view'],
    };
    let err: unknown = null;
    try { await patientBillingView(patientView, patientId); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(PatientBillingError);
    expect((err as PatientBillingError).status).toBe(403);
  });

  it('无 patient_billing:view 权限 → 403', async () => {
    const { patientId } = await seedPatientWithFees();
    const noPerm: AuthView = { ...admin, permissions: [] };
    let err: unknown = null;
    try { await patientBillingView(noPerm, patientId); } catch (e) { err = e; }
    expect(err).toBeInstanceOf(PatientBillingError);
    expect((err as PatientBillingError).status).toBe(403);
  });
});
