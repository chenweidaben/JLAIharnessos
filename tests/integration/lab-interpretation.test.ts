/**
 * 健澜科技 jlmedaios - 检验解读 Repository 集成测试（M3-E）
 *
 * 直连 PostgreSQL（本地库可用时跑）：
 *  - 幂等生成：同一 visit_id 重复生成只覆盖一行；
 *  - 状态机：pending_review -> signed 成功，二次签名返回 null；
 *  - 能读到该就诊的检验结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { getDb, verifyDbConnection, closeDbForTest } from '../../src/db/pool.js';
import {
  listLabResultsByVisit,
  upsertInterpretation,
  getByVisit,
  setStatus,
  countInterpretations,
} from '../../src/db/repositories/labInterpretRepo.js';

let dbAvailable = false;
let testVisitId = '';
let testPatientId = '';
let testDept = '';
let testUserId = '';

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
  const db = getDb();
  const admin = await db`SELECT id FROM iam.users WHERE username = 'admin' LIMIT 1`;
  testUserId = String(admin[0].id);
  const v = await db`
    SELECT lr.visit_id, v.patient_id, v.department
    FROM clinical.lab_results lr
    JOIN clinical.visits v ON v.id = lr.visit_id
    GROUP BY lr.visit_id, v.patient_id, v.department
    LIMIT 1
  `;
  if (v.length === 0) throw new Error('no lab visit');
  testVisitId = String(v[0].visit_id);
  testPatientId = String(v[0].patient_id);
  testDept = String(v[0].department);
} catch {
  dbAvailable = false;
}

afterAll(async () => {
  if (dbAvailable && testVisitId) {
    const db = getDb();
    await db`DELETE FROM clinical.lab_interpretations WHERE visit_id = ${testVisitId}`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-E LabInterp Repository', () => {
  it('能读到就诊检验结果', async () => {
    const rows = await listLabResultsByVisit(testVisitId);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('幂等生成：同一 visit_id 只覆盖一行', async () => {
    const db = getDb();
    const before = await countInterpretations();
    const r1 = await upsertInterpretation(
      {
        visitId: testVisitId, patientId: testPatientId, department: testDept,
        itemCount: 5, abnormalCount: 1, criticalCount: 1,
        summary: '草稿v1', abnormalItems: [{ item: 'cTnI' }], criticalItems: [{ item: 'cTnI' }],
        engineVersion: 'lab-rule-1.0',
      },
      db,
    );
    expect(await countInterpretations() - before).toBe(1);

    const r2 = await upsertInterpretation(
      {
        visitId: testVisitId, patientId: testPatientId, department: testDept,
        itemCount: 6, abnormalCount: 2, criticalCount: 1,
        summary: '草稿v2', abnormalItems: [{ item: 'cTnI' }, { item: 'WBC' }],
        criticalItems: [{ item: 'cTnI' }], engineVersion: 'lab-rule-1.0',
      },
      db,
    );
    expect(r2.id).toBe(r1.id);
    expect(await countInterpretations()).toBe(before + 1);
    const got = await getByVisit(testVisitId);
    expect(got?.summary).toBe('草稿v2');
    expect(got?.status).toBe('pending_review');
  });

  it('状态机：pending_review -> signed，二次签名返回 null', async () => {
    const db = getDb();
    const row = await getByVisit(testVisitId);
    expect(row).not.toBeNull();
    const signed = await setStatus(row!.id, ['pending_review'], 'signed', { reviewedBy: testUserId }, db);
    expect(signed?.status).toBe('signed');
    const again = await setStatus(row!.id, ['pending_review'], 'signed', { reviewedBy: testUserId }, db);
    expect(again).toBeNull();
  });
});
