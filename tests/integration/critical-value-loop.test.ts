/**
 * 健澜科技 jlmedaios - 危急值闭环 Repository 集成测试（M3-F）
 *
 * 直连 PostgreSQL（本地库可用时跑），**完全自包含夹具**（不依赖全局扫描顺序、
 * 不做全表删除），验证：
 *  - 扫描上报幂等：为自有的危急值结果产生且仅产生一条告警；
 *  - 状态机：raised -> acked -> resolved，非法跳转（raised 直接 resolved、
 *    resolved 再签收）返回 null。
 *
 * 与 M7 critical-realtime 测试隔离：本测试只创建并操作带 M3F_TEST 标记的自有数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { getDb, verifyDbConnection, closeDbForTest } from '../../src/db/pool.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { createLabResult } from '../../src/db/repositories/labResultRepo.js';
import {
  scanAndRaise,
  setStatus,
} from '../../src/db/repositories/criticalValueRepo.js';

let dbAvailable = false;
let testUserId = '';

const TAG = 'M3F_TEST';
const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const patientIds: string[] = [];

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
  const db = getDb();
  const admin = await db`SELECT id FROM iam.users WHERE username = 'admin' LIMIT 1`;
  testUserId = String(admin[0].id);
} catch {
  dbAvailable = false;
}

/** 创建自包含夹具：患者 + 就诊 + 一条危急值检验结果（无告警）。 */
async function makeFixture() {
  const patient = await createPatient({
    mrn: `M3F${seq()}`,
    nameMasked: `测*${seq().slice(-4)}`,
    gender: '男',
    birthDate: '1970-01-01',
    tags: [TAG],
  });
  patientIds.push(patient.id);
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'inpatient',
    department: '急诊科',
    chiefComplaint: '危急值闭环测试',
  });
  const lr = await createLabResult({
    visitId: visit.id,
    patientId: patient.id,
    itemCode: 'TROP_I',
    itemName: '肌钙蛋白I',
    numericValue: 0.2,
    unit: 'ng/mL',
    refLow: 0,
    refHigh: 0.04,
    abnormalFlag: 'HH',
    isCritical: true,
  });
  return { patient, visit, lr };
}

/** 按 lab_result_id 查其告警 id（无则 null）。 */
async function getAlertIdByLab(labResultId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db`
    SELECT id FROM clinical.critical_value_alerts WHERE lab_result_id = ${labResultId}`;
  return rows.length > 0 ? String(rows[0].id) : null;
}

async function countAlertsForLab(labResultId: string): Promise<number> {
  const db = getDb();
  const rows = await db`
    SELECT count(*)::int AS n FROM clinical.critical_value_alerts
    WHERE lab_result_id = ${labResultId}`;
  return Number(rows[0].n);
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 仅清理自有的夹具，绝不全表删除（避免破坏并行测试）
    await db`DELETE FROM clinical.critical_value_alerts WHERE patient_id IN ${db(patientIds)}`;
    await db`DELETE FROM clinical.lab_results WHERE patient_id IN ${db(patientIds)}`;
    await db`DELETE FROM clinical.visits WHERE patient_id IN ${db(patientIds)}`;
    await db`DELETE FROM clinical.patients WHERE id IN ${db(patientIds)}`;
    await closeDbForTest();
  }
});

describe.skipIf(!dbAvailable)('M3-F CriticalValue Repository（自包含夹具）', () => {
  it('扫描上报：为自有危急值产生且仅产生一条告警（幂等）', async () => {
    const { lr } = await makeFixture();
    expect(await getAlertIdByLab(lr.id)).toBeNull();

    // 仅扫描自有的 lab_result（不碰全局危急值，避免与并行测试冲突）
    const first = await scanAndRaise(undefined, { labResultIds: [lr.id] });
    expect(first.length).toBe(1);
    expect(await getAlertIdByLab(lr.id)).toBeTruthy();

    // 重复扫描：该结果仍只有一条告警
    const second = await scanAndRaise(undefined, { labResultIds: [lr.id] });
    expect(second.length).toBe(0);
    expect(await countAlertsForLab(lr.id)).toBe(1);
  });

  it('状态机：raised -> acked -> resolved，非法跳转拒绝', async () => {
    const { lr } = await makeFixture();
    const raised = await scanAndRaise(undefined, { labResultIds: [lr.id] });
    const id = raised[0].id;
    const db = getDb();

    // raised 直接 resolved 应拒绝（须先签收）
    expect(
      await setStatus(id, ['acked'], 'resolved', { resolvedBy: testUserId, dispositionNote: 'x' }, db),
    ).toBeNull();

    // raised -> acked
    const acked = await setStatus(id, ['raised'], 'acked', { ackedBy: testUserId }, db);
    expect(acked?.status).toBe('acked');

    // acked -> resolved
    const resolved = await setStatus(
      id,
      ['acked'],
      'resolved',
      { resolvedBy: testUserId, dispositionNote: '已复查心电图' },
      db,
    );
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.dispositionNote).toBe('已复查心电图');

    // resolved 再签收应拒绝
    expect(await setStatus(id, ['raised'], 'acked', { ackedBy: testUserId }, db)).toBeNull();
  });
});
