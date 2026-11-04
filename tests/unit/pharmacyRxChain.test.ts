/**
 * 健澜AI原生医院操作系统OS - P0-4 处方审核→发药链路 单测
 *
 * 覆盖：医生开方 200 / 药师审核 200 留痕；doctor、nurse 审核→403；
 * doctor 发药→403；nurse、pharmacist 发药 OK；未审核先发药 409、重复发药 409、
 * 已停止发药 409、重复审核 409；行级 visitId-patient 绑定；数量非法 400。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore as resetCpoe,
} from '../../src/bff/aggregators/orderCpoeAggregator';
import {
  __resetStore as resetPharm,
  createPrescription,
  reviewPrescription,
  dispensePrescription,
  stopPrescription,
  PharmacyDispenseTradeError,
} from '../../src/bff/aggregators/pharmacyDispenseTradeAggregator';

const doctorActor = { roles: ['doctor'], permissions: [] };
const pharmacistActor = { roles: ['pharmacist'], permissions: [] };
const nurseActor = { roles: ['nurse'], permissions: [] };
const noRoleActor = { roles: [], permissions: [] };

beforeEach(() => {
  resetCpoe();
  resetPharm();
});

function makeRx(actor = doctorActor, visitId = 'VISIT-A100', patientId = 'PT-P001'): string {
  const rx = createPrescription({
    visitId,
    patientId,
    patientName: '张某某',
    drugName: '阿莫西林胶囊',
    specification: '0.25g*24粒',
    quantity: 1,
    unitFeeCents: 225,
    actor,
    prescribedBy: 'u_doc01',
    prescribedByName: '王医生',
  });
  return rx.rxNo;
}

function approve(rxNo: string): void {
  reviewPrescription({ rxNo, decision: 'approve', comment: '同意', actor: pharmacistActor, reviewerId: 'u_pharm01', reviewerName: '药师丙' });
}

describe('P0-4 开方（write 域）', () => {
  test('医生开方 → pending_review 且 feeCents=单价*数量', () => {
    const rx = makeRx();
    expect(rx).toMatch(/^RX-/);
    const rec = createPrescription({
      visitId: 'VISIT-A100', patientId: 'PT-P001', patientName: '张某某',
      drugName: 'ibuprofen', specification: '0.3g', quantity: 2, unitFeeCents: 140,
      actor: doctorActor, prescribedBy: 'd',
    });
    expect(rec.status).toBe('pending_review');
    expect(rec.feeCents).toBe(280);
  });

  test('数量非正整数 → 400', () => {
    expect(() => createPrescription({
      visitId: 'VISIT-A100', patientId: 'PT-P001', patientName: '张某某',
      drugName: 'x', specification: '', quantity: -1, unitFeeCents: 100,
      actor: doctorActor, prescribedBy: 'd',
    })).toThrow(PharmacyDispenseTradeError);
  });

  test('行级绑定：visitId 与 patientId 不匹配 → 抛错', () => {
    expect(() => makeRx(doctorActor, 'VISIT-A100', 'PT-WRONG')).toThrow();
  });

  test('护士开方（write 域外）→ 403', () => {
    let status = 0;
    try { makeRx(nurseActor); } catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });
});

describe('P0-4 审核（review 域）', () => {
  test('药师审核 approve → approved 且 reviewer 留痕', () => {
    const rxNo = makeRx();
    const r = reviewPrescription({ rxNo, decision: 'approve', comment: '同意', actor: pharmacistActor, reviewerId: 'u_pharm01', reviewerName: '药师丙' });
    expect(r.status).toBe('approved');
    expect(r.reviewerName).toBe('药师丙');
    expect(typeof r.reviewedAt).toBe('number');
  });

  test('医生审核 → 403', () => {
    const rxNo = makeRx();
    let status = 0;
    try { reviewPrescription({ rxNo, decision: 'approve', actor: doctorActor, reviewerId: 'd' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });

  test('护士审核 → 403', () => {
    const rxNo = makeRx();
    let status = 0;
    try { reviewPrescription({ rxNo, decision: 'approve', actor: nurseActor, reviewerId: 'n' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });

  test('重复审核 → 409', () => {
    const rxNo = makeRx();
    approve(rxNo);
    let status = 0;
    try { reviewPrescription({ rxNo, decision: 'approve', actor: pharmacistActor, reviewerId: 'p' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(409);
  });
});

describe('P0-4 发药（execute 域 + 状态机）', () => {
  test('未审核先发药 → 409', () => {
    const rxNo = makeRx();
    let status = 0;
    try { dispensePrescription({ rxNo, actor: pharmacistActor, dispenserId: 'p' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(409);
  });

  test('药师发药 approved 处方 → dispensed', () => {
    const rxNo = makeRx();
    approve(rxNo);
    const r = dispensePrescription({ rxNo, actor: pharmacistActor, dispenserId: 'u_pharm01', dispenserName: '药师丙' });
    expect(r.status).toBe('dispensed');
  });

  test('护士发药 approved 处方 → dispensed（execute 域含护士）', () => {
    const rxNo = makeRx();
    approve(rxNo);
    const r = dispensePrescription({ rxNo, actor: nurseActor, dispenserId: 'u_nurse01' });
    expect(r.status).toBe('dispensed');
  });

  test('医生发药 → 403', () => {
    const rxNo = makeRx();
    approve(rxNo);
    let status = 0;
    try { dispensePrescription({ rxNo, actor: doctorActor, dispenserId: 'd' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });

  test('重复发药 → 409', () => {
    const rxNo = makeRx();
    approve(rxNo);
    dispensePrescription({ rxNo, actor: pharmacistActor, dispenserId: 'p' });
    let status = 0;
    try { dispensePrescription({ rxNo, actor: pharmacistActor, dispenserId: 'p' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(409);
  });

  test('已停止处方不得发药 → 409', () => {
    const rxNo = makeRx();
    stopPrescription({ rxNo, actor: doctorActor });
    let status = 0;
    try { dispensePrescription({ rxNo, actor: pharmacistActor, dispenserId: 'p' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(409);
  });

  test('无角色访问任何操作 → 403', () => {
    const rxNo = makeRx();
    let status = 0;
    try { reviewPrescription({ rxNo, decision: 'approve', actor: noRoleActor, reviewerId: 'x' }); }
    catch (e) { status = (e as { status: number }).status; }
    expect(status).toBe(403);
  });
});
