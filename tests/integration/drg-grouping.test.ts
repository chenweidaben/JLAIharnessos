/**
 * 健澜科技 jlmedaios - DRG 分组 Repository 集成测试（M3-D）
 *
 * 直连 PostgreSQL（本地库可用时跑）：
 *  - 幂等分组：同一 visit_id 重分组只覆盖一行；
 *  - 状态机：grouped -> confirmed 成功，二次确认返回 null；
 *  - 规则目录可读。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { getDb, verifyDbConnection, closeDbForTest } from '../../src/db/pool.js';
import { upsertFrontPage } from '../../src/db/repositories/frontPageRepo.js';
import {
  listDrgRules,
  upsertGroupResult,
  getResultByVisit,
  setResultStatus,
  countResults,
} from '../../src/db/repositories/drgRepo.js';

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
  const any = await db`SELECT id, patient_id FROM clinical.visits LIMIT 1`;
  if (any.length === 0) throw new Error('no visit');
  testVisitId = String(any[0].id);
  testPatientId = String(any[0].patient_id);
  testDept = '心血管内科';
} catch {
  dbAvailable = false;
}

afterAll(async () => {
  if (dbAvailable && testVisitId) {
    const db = getDb();
    await db`DELETE FROM clinical.drg_group_results WHERE visit_id = ${testVisitId}`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-D DRG Repository', () => {
  it('规则目录可读且含兜底组', async () => {
    const rules = await listDrgRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.groupCode === 'UZ00')).toBe(true);
  });

  it('幂等重分组：同一 visit_id 只覆盖一行', async () => {
    const db = getDb();
    await upsertFrontPage(
      {
        visitId: testVisitId,
        patientId: testPatientId,
        department: testDept,
        primaryDiagnosis: '心力衰竭',
        primaryDiagnosisCode: 'I50.9',
        operations: [],
        totalFee: 8000,
      },
      db,
    );

    const before = await countResults();
    const r1 = await upsertGroupResult(
      {
        visitId: testVisitId,
        patientId: testPatientId,
        department: testDept,
        primaryDxCode: 'I50.9',
        hasOrp: false,
        groupCode: 'FB29',
        groupName: '内科-心衰',
        mdc: 'F',
        grouperVersion: 'local-1.0',
        weight: 0.9,
        estimatedPayment: 9000,
        totalFee: 8000,
        balance: 1000,
        explanation: { matched: 'I50' },
        groupedBy: testUserId,
      },
      db,
    );
    const afterFirst = await countResults();
    expect(afterFirst - before).toBe(1);

    const r2 = await upsertGroupResult(
      {
        visitId: testVisitId,
        patientId: testPatientId,
        department: testDept,
        primaryDxCode: 'I50.9',
        hasOrp: false,
        groupCode: 'FB29',
        groupName: '内科-心衰',
        mdc: 'F',
        grouperVersion: 'local-1.0',
        weight: 0.9,
        estimatedPayment: 9000,
        totalFee: 9500,
        balance: -500,
        explanation: { matched: 'I50', regroup: true },
        groupedBy: testUserId,
      },
      db,
    );
    expect(r2.id).toBe(r1.id);
    expect(await countResults()).toBe(afterFirst);
    const got = await getResultByVisit(testVisitId);
    expect(got?.totalFee).toBe('9500.00');
    expect(got?.status).toBe('grouped');
  });

  it('状态机：grouped -> confirmed 成功，二次确认返回 null', async () => {
    const db = getDb();
    const row = await getResultByVisit(testVisitId);
    expect(row).not.toBeNull();
    const confirmed = await setResultStatus(
      row!.id,
      ['grouped'],
      'confirmed',
      { confirmedBy: testUserId },
      db,
    );
    expect(confirmed?.status).toBe('confirmed');
    const again = await setResultStatus(
      row!.id,
      ['grouped'],
      'confirmed',
      { confirmedBy: testUserId },
      db,
    );
    expect(again).toBeNull();
  });
});
