/**
 * 健澜AI原生医院操作系统OS - P0-3 护士站工作台补全 单测
 *
 * 覆盖：体征区间越界（体温/心率/收缩压/舒张压逐项 400）、正常录入；
 * 护理记录 content 空 / recordType 非法 / 正常；PDA 扫错患者 409+拒绝留痕、
 * 重复执行 409、slip 不存在 404；权限 nurse OK / doctor 403 / noRole 403；
 * 执行单汇总字段齐全。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore as resetCpoe,
  createOrder,
  reviewOrder,
  executeOrder,
  buildExecutionSlip,
  OrderCpoeError,
} from '../../src/bff/aggregators/orderCpoeAggregator';
import {
  __resetStore as resetWard,
  recordVitals,
  writeNursingRecord,
  pdaExecuteBySlip,
  lastPdaDenial,
  buildWardExecutionSheet,
} from '../../src/bff/aggregators/nurseStationWardAggregator';

const nurseActor = { roles: ['nurse'], permissions: [] };
const doctorActor = { roles: ['doctor'], permissions: [] };
const noRoleActor = { roles: [], permissions: [] };

beforeEach(() => {
  resetCpoe();
  resetWard();
});

function expect400(fn: () => unknown): void {
  try {
    fn();
    throw new Error('应抛出 OrderCpoeError(400) 但未抛');
  } catch (e) {
    expect(e).toBeInstanceOf(OrderCpoeError);
    expect((e as OrderCpoeError).status).toBe(400);
  }
}

/** 造一条已执行医嘱并生成执行单，返回 slipNo。 */
function makeExecutedSlip(patientId = 'PT-P001', visitId = 'VISIT-A100'): string {
  const o = createOrder({
    visitId,
    patientId,
    orderType: 'medication',
    content: '生理盐水静滴',
    feeCents: 2000,
    orderedBy: 'u_doc01',
    orderedByName: '王医生',
  });
  reviewOrder({ orderId: o.orderId, decision: 'approve', comment: '同意', reviewerId: 'u_pharm01', reviewerName: '药师丙' });
  executeOrder({ orderId: o.orderId, executedBy: 'u_nurse01', executedByName: '护士钱' });
  const slip = buildExecutionSlip({ orderIds: [o.orderId], generatedBy: 'u_nurse01' });
  return slip.slipNo;
}

describe('P0-3 体征录入（生理区间硬校验）', () => {
  test('体温 46.2℃ 越界 → 400 且指明体温/区间', () => {
    let msg = '';
    try {
      recordVitals({ visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 46.2, heartRateBpm: 80, sbp: 120, dbp: 80, recordedBy: 'n1' });
    } catch (e) { msg = (e as Error).message; }
    expect(msg).toContain('体温');
    expect(msg).toContain('46.2');
    expect(msg).toContain('超出区间 30~45');
  });

  test('心率 10 越界 → 400', () => {
    expect400(() => recordVitals({ visitId: 'V', patientId: 'P', temperatureC: 37, heartRateBpm: 10, sbp: 120, dbp: 80, recordedBy: 'n' }));
  });

  test('收缩压 350 越界 → 400', () => {
    let msg = '';
    try { recordVitals({ visitId: 'V', patientId: 'P', temperatureC: 37, heartRateBpm: 80, sbp: 350, dbp: 80, recordedBy: 'n' }); }
    catch (e) { msg = (e as Error).message; }
    expect(msg).toContain('收缩压');
    expect(msg).toContain('超出区间 40~300');
  });

  test('舒张压 10 越界 → 400', () => {
    expect400(() => recordVitals({ visitId: 'V', patientId: 'P', temperatureC: 37, heartRateBpm: 80, sbp: 120, dbp: 10, recordedBy: 'n' }));
  });

  test('visitId 必填 → 400', () => {
    expect400(() => recordVitals({ visitId: '', patientId: 'P', temperatureC: 37, heartRateBpm: 80, sbp: 120, dbp: 80, recordedBy: 'n' }));
  });

  test('正常录入 → 返回带 vitalsId 留痕', () => {
    const rec = recordVitals({ visitId: 'VISIT-A100', patientId: 'PT-P001', temperatureC: 36.8, heartRateBpm: 78, sbp: 122, dbp: 78, recordedBy: 'u_nurse01' });
    expect(rec.vitalsId).toMatch(/^VIT-/);
    expect(rec.temperatureC).toBe(36.8);
  });
});

describe('P0-3 护理记录书写', () => {
  test('content 空 → 400', () => {
    expect400(() => writeNursingRecord({ visitId: 'V', patientId: 'P', recordType: 'nursing_note', content: '   ', writtenBy: 'n' }));
  });

  test('recordType 非法 → 400', () => {
    let msg = '';
    try { writeNursingRecord({ visitId: 'V', patientId: 'P', recordType: 'bogus', content: 'ok', writtenBy: 'n' }); }
    catch (e) { msg = (e as Error).message; }
    expect(msg).toContain('recordType');
  });

  test('正常书写 → 返回 recordId', () => {
    const rec = writeNursingRecord({ visitId: 'VISIT-A100', patientId: 'PT-P001', recordType: 'shift_handover', content: '交班记录', writtenBy: 'u_nurse01' });
    expect(rec.recordId).toMatch(/^NR-/);
    expect(rec.recordType).toBe('shift_handover');
  });
});

describe('P0-3 PDA 按执行单床边执行', () => {
  test('slipNo 不存在 → 404', () => {
    try {
      pdaExecuteBySlip({ slipNo: 'NO-SUCH-SLIP', scannedPatientId: 'PT-P001', executedBy: 'n1', actor: nurseActor });
      throw new Error('应抛 404');
    } catch (e) {
      expect((e as OrderCpoeError).status).toBe(404);
    }
  });

  test('扫错患者 → 409 且写拒绝留痕（含 scannedPatientId/expectedPatientId/reason）', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    try {
      pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-WRONG', executedBy: 'u_nurse01', actor: nurseActor });
      throw new Error('应抛 409');
    } catch (e) {
      expect((e as OrderCpoeError).status).toBe(409);
    }
    const d = lastPdaDenial();
    expect(d).not.toBeNull();
    expect(d?.slipNo).toBe(slipNo);
    expect(d?.scannedPatientId).toBe('PT-WRONG');
    expect(d?.expectedPatientId).toBe('PT-P001');
    expect(d?.reason).toBe('腕带与执行单患者不匹配');
  });

  test('患者一致首次执行 → 200 留痕 checks.patientMatched=true', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    const rec = pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'u_nurse01', actor: nurseActor });
    expect(rec.checks.patientMatched).toBe(true);
    expect(rec.patientId).toBe('PT-P001');
  });

  test('同一 slip 重复执行 → 409', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'n1', actor: nurseActor });
    try {
      pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'n1', actor: nurseActor });
      throw new Error('应抛 409');
    } catch (e) {
      expect((e as OrderCpoeError).status).toBe(409);
    }
  });
});

describe('P0-3 权限（execute 域）', () => {
  test('nurse 角色 execute → 通过', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    expect(() => pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'n', actor: nurseActor })).not.toThrow();
  });

  test('doctor 角色 execute → 403', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    try {
      pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'd', actor: doctorActor });
      throw new Error('应抛 403');
    } catch (e) {
      expect((e as OrderCpoeError).status).toBe(403);
    }
  });

  test('无角色 execute → 403', () => {
    const slipNo = makeExecutedSlip('PT-P001');
    try {
      pdaExecuteBySlip({ slipNo, scannedPatientId: 'PT-P001', executedBy: 'x', actor: noRoleActor });
      throw new Error('应抛 403');
    } catch (e) {
      expect((e as OrderCpoeError).status).toBe(403);
    }
  });
});

describe('P0-3 护理执行单汇总', () => {
  test('返回 visitId/pendingItems/executedItems/vitalsCount/nursingRecordsCount/generatedAt 字段', () => {
    makeExecutedSlip('PT-P001');
    const sheet = buildWardExecutionSheet({ visitId: 'VISIT-A100' });
    expect(sheet.visitId).toBe('VISIT-A100');
    expect(Array.isArray(sheet.pendingItems)).toBe(true);
    expect(Array.isArray(sheet.executedItems)).toBe(true);
    expect(typeof sheet.vitalsCount).toBe('number');
    expect(typeof sheet.nursingRecordsCount).toBe('number');
    expect(typeof sheet.generatedAt).toBe('number');
  });
});
