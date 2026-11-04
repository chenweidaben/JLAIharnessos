/**
 * 健澜AI原生医院操作系统OS - P1-2 体温单/医嘱单 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore as resetVitals,
  recordEntry,
  getCurve,
  VitalsSheetError,
} from '../../src/bff/aggregators/vitalsSheetAggregator';
import {
  __resetStore as resetPrint,
  printOrderSheet,
  listPrints,
  OrderSheetPrintError,
} from '../../src/bff/aggregators/orderSheetPrintAggregator';

const NURSE = ['nurse'];
const DOCTOR = ['doctor'];

beforeEach(() => { resetVitals(); resetPrint(); });

describe('P1-2 体温单录入硬校验', () => {
  test('护士正常录入 → 返回 entry', () => {
    const e = recordEntry({ visitId: 'V-1', patientId: 'PT-P001', temperatureC: 36.8, pulseBpm: 78, sbp: 120, dbp: 75, roles: NURSE, recordedBy: 'n1' });
    expect(e.entryId).toMatch(/^VTSE-/);
    expect(e.temperatureC).toBe(36.8);
  });
  test('体温 43℃ → 400 指明项', () => {
    let m = '';
    try { recordEntry({ visitId: 'V-1', patientId: 'PT-P001', temperatureC: 43, roles: NURSE, recordedBy: 'n' }); }
    catch (e) { m = (e as VitalsSheetError).message; }
    expect(m).toContain('体温'); expect(m).toContain('43');
  });
  test('收缩压 230 → 400', () => {
    let s = 0;
    try { recordEntry({ visitId: 'V-1', patientId: 'PT-P001', sbp: 230, roles: NURSE, recordedBy: 'n' }); }
    catch (e) { s = (e as VitalsSheetError).status; }
    expect(s).toBe(400);
  });
  test('舒张压 140 → 400', () => {
    let s = 0;
    try { recordEntry({ visitId: 'V-1', patientId: 'PT-P001', dbp: 140, roles: NURSE, recordedBy: 'n' }); }
    catch (e) { s = (e as VitalsSheetError).status; }
    expect(s).toBe(400);
  });
  test('呼吸 5 → 400', () => {
    let s = 0;
    try { recordEntry({ visitId: 'V-1', patientId: 'PT-P001', respirationRate: 5, roles: NURSE, recordedBy: 'n' }); }
    catch (e) { s = (e as VitalsSheetError).status; }
    expect(s).toBe(400);
  });
  test('医生不能录入 → 403', () => {
    let s = 0;
    try { recordEntry({ visitId: 'V-1', patientId: 'PT-P001', temperatureC: 36.5, roles: DOCTOR, recordedBy: 'd' }); }
    catch (e) { s = (e as VitalsSheetError).status; }
    expect(s).toBe(403);
  });
  test('医生可查看曲线', () => {
    const day = new Date('2026-11-04T00:00:00+08:00').getTime();
    recordEntry({ visitId: 'V-1', patientId: 'PT-P001', temperatureC: 37, roles: NURSE, recordedBy: 'n', recordedAt: day });
    const c = getCurve('V-1', '2026-11-04', DOCTOR);
    expect((c.temperatureCurve as Array<{ value: number | null }>)[0].value).toBe(37);
  });
});

describe('P1-2 曲线 4h 时间轴对齐', () => {
  test('6 个槽位，缺失点为 null', () => {
    const day = new Date('2026-11-04T00:00:00+08:00').getTime();
    recordEntry({ visitId: 'V-2', patientId: 'PT-P001', temperatureC: 36.5, sbp: 110, dbp: 70, roles: NURSE, recordedBy: 'n', recordedAt: day });
    recordEntry({ visitId: 'V-2', patientId: 'PT-P001', temperatureC: 38.0, sbp: 130, dbp: 85, roles: NURSE, recordedBy: 'n', recordedAt: day + 12 * 3600_000 });
    const c = getCurve('V-2', '2026-11-04', NURSE);
    const tc = c.temperatureCurve as Array<{ t: string; value: number | null }>;
    expect(tc.length).toBe(6);
    expect(tc[0].value).toBe(36.5);
    expect(tc[3].value).toBe(38.0); // 12:00 槽
    expect(tc[1].value).toBeNull(); // 04:00 缺失
    const bp = c.bpSeries as Array<{ t: string; sbp: number | null; dbp: number | null }>;
    expect(bp[3].sbp).toBe(130);
    expect(bp[0].dbp).toBe(70);
  });
});

describe('P1-2 医嘱单打印', () => {
  test('continuation 续打 nextPage 递增', () => {
    const r1 = printOrderSheet({ visitId: 'V-9', patientId: 'PT-P001', printMode: 'continuation', roles: NURSE, operatorId: 'n1' });
    expect(r1.pageFrom).toBe(1); expect(r1.nextPage).toBe(1);
    const r2 = printOrderSheet({ visitId: 'V-9', patientId: 'PT-P001', printMode: 'continuation', roles: NURSE, operatorId: 'n1' });
    expect(r2.pageFrom).toBe(2); expect(r2.nextPage).toBe(2);
  });
  test('reissue 补打记录 reissuedPages', () => {
    const r = printOrderSheet({ visitId: 'V-9', patientId: 'PT-P001', printMode: 'reissue', range: { from: 2, to: 4 }, roles: NURSE, operatorId: 'n' });
    expect(r.reissuedPages).toEqual([2, 3, 4]);
  });
  test('reprint 重打作废前次', () => {
    printOrderSheet({ visitId: 'V-X', patientId: 'PT-P001', printMode: 'continuation', roles: NURSE, operatorId: 'n' });
    const r = printOrderSheet({ visitId: 'V-X', patientId: 'PT-P001', printMode: 'reprint', roles: NURSE, operatorId: 'n' });
    expect(r.pageFrom).toBe(1);
    const hist = listPrints('V-X');
    expect(hist.find((h) => h.printMode === 'continuation')?.voided).toBe(true);
  });
  test('同模式重复 printCount+1（非 409）', () => {
    const r1 = printOrderSheet({ visitId: 'V-C', patientId: 'PT-P001', printMode: 'reprint', roles: NURSE, operatorId: 'n' });
    const r2 = printOrderSheet({ visitId: 'V-C', patientId: 'PT-P001', printMode: 'reprint', roles: NURSE, operatorId: 'n' });
    expect(r1.printCount).toBe(1);
    expect(r2.printCount).toBe(2);
  });
  test('非法 printMode → 400', () => {
    let s = 0;
    try { printOrderSheet({ visitId: 'V', patientId: 'PT-P001', printMode: 'bogus', roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as OrderSheetPrintError).status; }
    expect(s).toBe(400);
  });
  test('患者角色打印 → 403', () => {
    let s = 0;
    try { printOrderSheet({ visitId: 'V', patientId: 'PT-P001', printMode: 'reprint', roles: ['patient'], operatorId: 'p' }); }
    catch (e) { s = (e as OrderSheetPrintError).status; }
    expect(s).toBe(403);
  });
  test('reissue range 非法 → 400', () => {
    let s = 0;
    try { printOrderSheet({ visitId: 'V', patientId: 'PT-P001', printMode: 'reissue', range: { from: 5, to: 2 }, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as OrderSheetPrintError).status; }
    expect(s).toBe(400);
  });
});
