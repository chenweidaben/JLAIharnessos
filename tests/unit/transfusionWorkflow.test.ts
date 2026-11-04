/**
 * 健澜AI原生医院操作系统OS - P1-4 输血闭环 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  createRequest,
  typeBlood,
  crossmatch,
  issueBlood,
  bedsideCheck,
  startTransfuse,
  completeTransfuse,
  recordReaction,
  TransfusionWorkflowError,
} from '../../src/bff/aggregators/transfusionWorkflowAggregator';

const DOCTOR = ['doctor'];
const BBT = ['blood_bank_tech'];
const NURSE = ['nurse'];

beforeEach(() => { __resetStore(); });

function fullFlow(suffix: string) {
  const r = createRequest({ visitId: `V-${suffix}`, patientId: 'PT-P001', bloodType: 'A', units: 2, indication: '失血', roles: DOCTOR });
  typeBlood({ reqId: r.reqId, abo: 'A', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b1' });
  crossmatch({ reqId: r.reqId, donorBagNo: `BAG-${suffix}`, compatibility: 'compatible', roles: BBT, operatorId: 'b1' });
  issueBlood({ reqId: r.reqId, bagNo: `BAG-${suffix}`, expiresAt: Date.now() + 5 * 3600_000, roles: BBT, operatorId: 'b1' });
  bedsideCheck({ reqId: r.reqId, nurseId: 'n1', witnessNurseId: 'n2', patientId: 'PT-P001', bagNo: `BAG-${suffix}`, matched: true, roles: NURSE });
  startTransfuse(r.reqId, NURSE, 'n1');
  return r;
}

describe('P1-4 申请与血型', () => {
  test('doctor 申请 → application', () => {
    const r = createRequest({ visitId: 'V-1', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    expect(r.status).toBe('application'); expect(r.reqId).toMatch(/^TX-/);
  });
  test('nurse 申请 → 403', () => {
    let s = 0;
    try { createRequest({ visitId: 'V', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: NURSE }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(403);
  });
  test('units=11 → 400', () => {
    let s = 0;
    try { createRequest({ visitId: 'V', patientId: 'PT-P001', bloodType: 'O', units: 11, indication: 'x', roles: DOCTOR }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('blood_bank_tech 血型鉴定 → typed', () => {
    const r = createRequest({ visitId: 'V-2', patientId: 'PT-P001', bloodType: 'B', units: 1, indication: 'x', roles: DOCTOR });
    const t = typeBlood({ reqId: r.reqId, abo: 'B', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    expect(t.status).toBe('typed'); expect(t.typeResult?.abo).toBe('B');
  });
  test('doctor 血型鉴定 → 403', () => {
    const r = createRequest({ visitId: 'V', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    let s = 0;
    try { typeBlood({ reqId: r.reqId, abo: 'O', rh: '+', antibodyScreen: 'n', roles: DOCTOR, operatorId: 'd' }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(403);
  });
});

describe('P1-4 交叉配血与发血', () => {
  test('配血不合 → 409', () => {
    const r = createRequest({ visitId: 'V-3', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: r.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    let s = 0; let m = '';
    try { crossmatch({ reqId: r.reqId, donorBagNo: 'B1', compatibility: 'incompatible', roles: BBT, operatorId: 'b' }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; m = (e as Error).message; }
    expect(s).toBe(409); expect(m).toContain('不合');
  });
  test('配血相合 → crossmatched', () => {
    const r = createRequest({ visitId: 'V-4', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: r.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    const c = crossmatch({ reqId: r.reqId, donorBagNo: 'B2', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    expect(c.status).toBe('crossmatched');
  });
  test('重复发同一血袋 → 409', () => {
    const a = createRequest({ visitId: 'V-A', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: a.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: a.reqId, donorBagNo: 'DUP', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    issueBlood({ reqId: a.reqId, bagNo: 'DUP', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' });
    const b = createRequest({ visitId: 'V-B', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: b.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: b.reqId, donorBagNo: 'DUP', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    let s = 0;
    try { issueBlood({ reqId: b.reqId, bagNo: 'DUP', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(409);
  });
});

describe('P1-4 双人核对与输注', () => {
  test('双人核对 nurseId==witnessNurseId → 400', () => {
    const r = fullFlow('chk');
    let s = 0;
    // fullFlow 已核对，这里单独构造一个 issued 的
    const q = createRequest({ visitId: 'V-Q', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: q.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: q.reqId, donorBagNo: 'BQ', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    issueBlood({ reqId: q.reqId, bagNo: 'BQ', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' });
    try { bedsideCheck({ reqId: q.reqId, nurseId: 'n9', witnessNurseId: 'n9', patientId: 'PT-P001', bagNo: 'BQ', matched: true, roles: NURSE }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('matched=false → 409 拒输', () => {
    const q = createRequest({ visitId: 'V-M', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: q.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: q.reqId, donorBagNo: 'BM', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    issueBlood({ reqId: q.reqId, bagNo: 'BM', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' });
    let s = 0;
    try { bedsideCheck({ reqId: q.reqId, nurseId: 'n1', witnessNurseId: 'n2', patientId: 'PT-P001', bagNo: 'BM', matched: false, roles: NURSE }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(409);
  });
  test('bedside 患者不匹配 → 403', () => {
    const q = createRequest({ visitId: 'V-P', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: q.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: q.reqId, donorBagNo: 'BP', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    issueBlood({ reqId: q.reqId, bagNo: 'BP', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' });
    let s = 0;
    try { bedsideCheck({ reqId: q.reqId, nurseId: 'n1', witnessNurseId: 'n2', patientId: 'WRONG', bagNo: 'BP', matched: true, roles: NURSE }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(403);
  });
  test('fullFlow 逐级到 transfusing；完成 → completed', () => {
    const r = fullFlow('end');
    expect(r.status).toBe('transfusing');
    const c = completeTransfuse(r.reqId, NURSE);
    expect(c.status).toBe('completed');
  });
});

describe('P1-4 不良反应', () => {
  test('severity=5 → 400', () => {
    const r = fullFlow('rx');
    let s = 0;
    try { recordReaction({ reqId: r.reqId, type: 'febrile', severity: 5, description: 'x', roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('记录不良反应 → 入列表', () => {
    const r = fullFlow('rx2');
    const rec = recordReaction({ reqId: r.reqId, type: 'allergic', severity: 2, description: '皮疹', roles: NURSE, operatorId: 'n' });
    expect(rec.adverseReactions.length).toBe(1);
    expect(rec.adverseReactions[0].type).toBe('allergic');
  });
  test('doctor 床边核对 → 403', () => {
    const q = createRequest({ visitId: 'V-D', patientId: 'PT-P001', bloodType: 'O', units: 1, indication: 'x', roles: DOCTOR });
    typeBlood({ reqId: q.reqId, abo: 'O', rh: '+', antibodyScreen: 'neg', roles: BBT, operatorId: 'b' });
    crossmatch({ reqId: q.reqId, donorBagNo: 'BD', compatibility: 'compatible', roles: BBT, operatorId: 'b' });
    issueBlood({ reqId: q.reqId, bagNo: 'BD', expiresAt: Date.now() + 3600_000, roles: BBT, operatorId: 'b' });
    let s = 0;
    try { bedsideCheck({ reqId: q.reqId, nurseId: 'n1', witnessNurseId: 'n2', patientId: 'PT-P001', bagNo: 'BD', matched: true, roles: DOCTOR }); }
    catch (e) { s = (e as TransfusionWorkflowError).status; }
    expect(s).toBe(403);
  });
});
