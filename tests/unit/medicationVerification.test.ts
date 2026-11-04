/**
 * 健澜AI原生医院操作系统OS - P1-7 医嘱执行机读核对 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  levelRequirements,
  createOrder,
  scanWristband,
  scanBarcode,
  execute,
  rejectOrder,
  pauseOrder,
  resumeOrder,
  discontinueOrder,
  MedVerifError,
} from '../../src/bff/aggregators/medicationVerificationAggregator';

const DOCTOR = ['doctor'];
const NURSE = ['nurse'];
const NOW = Date.now();

beforeEach(() => { __resetStore(); });

function makeOrder(orderNo = 'ORD-1', level: 1|2|3|4|5|6 = 1, drugCode = 'DRUG-A') {
  return createOrder({ visitId: 'V-1', patientId: 'P-1', orderNo, drugName: '药A', drugCode, dose: '10mg', route: 'po', scheduledAt: NOW, safetyLevel: level, isHighAlert: level >= 3, roles: DOCTOR });
}

function statusOf(fn: () => unknown): number {
  try { fn(); return 0; } catch (e) { return (e as MedVerifError).status; }
}

describe('P1-7 6 级评级矩阵', () => {
  test('L1/L2 单人可核；L3~L6 双人；L5/L6 停药需主任审批', () => {
    expect(levelRequirements(1).requireDouble).toBe(false);
    expect(levelRequirements(2).requireDouble).toBe(false);
    for (const l of [3,4,5,6]) expect(levelRequirements(l).requireDouble).toBe(true);
    expect(levelRequirements(5).requireChiefApproval).toBe(true);
    expect(levelRequirements(6).requireChiefApproval).toBe(true);
    expect(levelRequirements(4).requireChiefApproval).toBe(false);
  });
  test('非法 safetyLevel → 400', () => {
    expect(statusOf(() => levelRequirements(7))).toBe(400);
  });
});

describe('P1-7 创建与角色', () => {
  test('nurse 创建医嘱 → 403；doctor 创建 → created', () => {
    expect(statusOf(() => createOrder({ visitId:'V', patientId:'P', orderNo:'X', drugName:'d', drugCode:'c', dose:'', route:'', scheduledAt:NOW, safetyLevel:1, isHighAlert:false, roles:['nurse'] }))).toBe(403);
    expect(makeOrder('ORD-OK').state).toBe('created');
  });
  test('重复 orderNo → 409', () => {
    makeOrder('DUP');
    expect(statusOf(() => makeOrder('DUP'))).toBe(409);
  });
});

describe('P1-7 扫腕带', () => {
  test('L1 单人扫腕带 → wristband_scanned', () => {
    const o = makeOrder('O1', 1);
    expect(scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE).state).toBe('wristband_scanned');
  });
  test('L3 缺 witness → 400；witness==nurse → 400', () => {
    const o = makeOrder('O3', 3);
    expect(statusOf(() => scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE))).toBe(400);
    expect(statusOf(() => scanWristband(o.orderNo, 'P-1', 'n1', 'n1', NURSE))).toBe(400);
  });
  test('腕带不匹配（patientIdScanned ≠ order.patientId）→ 403', () => {
    const o = makeOrder('OBAD', 1);
    expect(statusOf(() => scanWristband(o.orderNo, 'P-INTRUDER', 'n1', undefined, NURSE))).toBe(403);
  });
});

describe('P1-7 扫药品条码', () => {
  test('未扫腕带直接扫条码 → 409', () => {
    const o = makeOrder('ONO');
    expect(statusOf(() => scanBarcode(o.orderNo, 'DRUG-A', 'n1', undefined, NURSE))).toBe(409);
  });
  test('药品条码不符 → 422', () => {
    const o = makeOrder('OBADCODE', 1, 'DRUG-A');
    scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE);
    expect(statusOf(() => scanBarcode(o.orderNo, 'DRUG-WRONG', 'n1', undefined, NURSE))).toBe(422);
  });
});

describe('P1-7 执行与状态机', () => {
  test('完整链路：腕带→条码→执行 → executed；重复执行 409', () => {
    const o = makeOrder('EXEC', 1);
    scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE);
    scanBarcode(o.orderNo, 'DRUG-A', 'n1', undefined, NURSE);
    const ex = execute(o.orderNo, 'n1', undefined, NURSE);
    expect(ex.state).toBe('executed');
    expect(statusOf(() => execute(o.orderNo, 'n1', undefined, NURSE))).toBe(409);
  });
  test('未扫腕带就执行 → 409', () => {
    const o = makeOrder('NOWB');
    expect(statusOf(() => execute(o.orderNo, 'n1', undefined, NURSE))).toBe(409);
  });
  test('未扫条码就执行 → 409', () => {
    const o = makeOrder('NOBC');
    scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE);
    expect(statusOf(() => execute(o.orderNo, 'n1', undefined, NURSE))).toBe(409);
  });
  test('doctor 执行 → 403', () => {
    const o = makeOrder('DOC');
    expect(statusOf(() => execute(o.orderNo, 'd1', undefined, DOCTOR))).toBe(403);
  });
});

describe('P1-7 拒接/暂停/恢复/停药', () => {
  test('拒接 → rejected（终态）', () => {
    const o = makeOrder('RJ');
    expect(rejectOrder(o.orderNo, 'n1', '患者拒绝', NURSE).state).toBe('rejected');
  });
  test('暂停→恢复回到 barcode 节点', () => {
    const o = makeOrder('RS');
    scanWristband(o.orderNo, 'P-1', 'n1', undefined, NURSE);
    scanBarcode(o.orderNo, 'DRUG-A', 'n1', undefined, NURSE);
    pauseOrder(o.orderNo, 'n1', '临时停药', NURSE);
    expect(resumeOrder(o.orderNo, 'n1', NURSE).state).toBe('barcode_scanned');
  });
  test('L5 停药无 approverId → 400；带 approver → discontinued', () => {
    const o = makeOrder('L5DISC', 5);
    expect(statusOf(() => discontinueOrder(o.orderNo, 'n1', undefined, NURSE))).toBe(400);
    expect(discontinueOrder(o.orderNo, 'n1', 'chief-1', NURSE).state).toBe('discontinued');
  });
  test('L1 停药无需 approver → discontinued', () => {
    const o = makeOrder('L1DISC', 1);
    expect(discontinueOrder(o.orderNo, 'n1', undefined, NURSE).state).toBe('discontinued');
  });
});
