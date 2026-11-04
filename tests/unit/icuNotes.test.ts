/**
 * 健澜AI原生医院操作系统OS - P1-5 ICU 监护文书 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  admit,
  discharge,
  recordVitals,
  listVitals,
  recordScore,
  listScores,
  IcuNotesError,
} from '../../src/bff/aggregators/icuNotesAggregator';

const DOC = ['icu_doctor'];
const NURSE = ['icu_nurse'];
const PID = 'PT-P001';

beforeEach(() => { __resetStore(); });

function okVitals(visitId: string, recordedAt: number) {
  return recordVitals({
    visitId, patientId: PID, recordedAt,
    heartRate: 80, sbp: 120, dbp: 75, respRate: 16, spo2: 98,
    temperatureC: 37, gcsScore: 15, urineOutputMl: 100,
    roles: NURSE, operatorId: 'n1',
  });
}

describe('P1-5 转入转出', () => {
  test('icu_doctor 转入 → admitted', () => {
    const a = admit({ visitId: 'V-1', patientId: PID, reason: '呼衰', acuityLevel: 3, plannedVentHours: 24, roles: DOC, operatorId: 'd1' });
    expect(a.status).toBe('admitted'); expect(a.acuityLevel).toBe(3);
  });
  test('icu_nurse 转入 → 403', () => {
    let s = 0;
    try { admit({ visitId: 'V', patientId: PID, reason: 'x', acuityLevel: 2, plannedVentHours: 0, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(403);
  });
  test('重复转入同 visitId → 409', () => {
    admit({ visitId: 'V-DUP', patientId: PID, reason: 'x', acuityLevel: 2, plannedVentHours: 0, roles: DOC, operatorId: 'd' });
    let s = 0;
    try { admit({ visitId: 'V-DUP', patientId: PID, reason: 'y', acuityLevel: 2, plannedVentHours: 0, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(409);
  });
  test('未转入就转出 → 409', () => {
    let s = 0;
    try { discharge({ visitId: 'V-NEVER', patientId: PID, disposition: 'ward', roles: DOC }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(409);
  });
  test('转出后重复转出 → 409', () => {
    admit({ visitId: 'V-DC', patientId: PID, reason: 'x', acuityLevel: 2, plannedVentHours: 0, roles: DOC, operatorId: 'd' });
    discharge({ visitId: 'V-DC', patientId: PID, disposition: 'ward', roles: DOC });
    let s = 0;
    try { discharge({ visitId: 'V-DC', patientId: PID, disposition: 'ward', roles: DOC }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(409);
  });
  test('acuityLevel=5 → 400', () => {
    let s = 0;
    try { admit({ visitId: 'V-X', patientId: PID, reason: 'x', acuityLevel: 5, plannedVentHours: 0, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(400);
  });
});

describe('P1-5 多时间点体征', () => {
  test('icu_nurse 录体征 → 200；HR 越界 → 400', () => {
    const p = okVitals('V-V', 1000);
    expect(p.heartRate).toBe(80);
    let s = 0;
    try { recordVitals({ visitId: 'V-V', patientId: PID, recordedAt: 2000, heartRate: 999, sbp: 120, dbp: 75, respRate: 16, spo2: 98, temperatureC: 37, gcsScore: 15, urineOutputMl: 100, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(400);
  });
  test('同时间点重复录 → 409', () => {
    okVitals('V-T', 5000);
    let s = 0;
    try { recordVitals({ visitId: 'V-T', patientId: PID, recordedAt: 5000, heartRate: 81, sbp: 120, dbp: 75, respRate: 16, spo2: 98, temperatureC: 37, gcsScore: 15, urineOutputMl: 100, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(409);
  });
  test('GCS=20 → 400；SpO2<70 → 400', () => {
    let s1 = 0, s2 = 0;
    try { recordVitals({ visitId: 'V-G', patientId: PID, recordedAt: 1, heartRate: 80, sbp: 120, dbp: 75, respRate: 16, spo2: 98, temperatureC: 37, gcsScore: 20, urineOutputMl: 100, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s1 = (e as IcuNotesError).status; }
    try { recordVitals({ visitId: 'V-G', patientId: PID, recordedAt: 2, heartRate: 80, sbp: 120, dbp: 75, respRate: 16, spo2: 50, temperatureC: 37, gcsScore: 15, urineOutputMl: 100, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s2 = (e as IcuNotesError).status; }
    expect(s1).toBe(400); expect(s2).toBe(400);
  });
  test('icu_doctor 录体征 → 403', () => {
    let s = 0;
    try { recordVitals({ visitId: 'V-D', patientId: PID, recordedAt: 1, heartRate: 80, sbp: 120, dbp: 75, respRate: 16, spo2: 98, temperatureC: 37, gcsScore: 15, urineOutputMl: 100, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(403);
  });
  test('listVitals 按 recordedAt 升序', () => {
    okVitals('V-L', 3000); okVitals('V-L', 1000); okVitals('V-L', 2000);
    const list = listVitals('V-L');
    expect(list.map((v) => v.recordedAt)).toEqual([1000, 2000, 3000]);
  });
});

describe('P1-5 评分引擎测试向量', () => {
  test('APACHE II 正常(全正常) → 0', () => {
    const s = recordScore({
      visitId: 'V-A1', patientId: PID, scoreType: 'apache2',
      items: { age: 40, temperatureC: 37, map: 90, heartRate: 80, respRate: 16, gcsScore: 15, chronicPoints: 0 },
      recordedAt: 1, roles: DOC, operatorId: 'd',
    });
    expect(s.totalScore).toBe(0);
  });
  test('APACHE II 重病向量 → 28（age78=4 + temp39.5=3 + map55=4 + hr130=2 + resp35=3 + gcs8=7 + chronic5=5）', () => {
    const s = recordScore({
      visitId: 'V-A2', patientId: PID, scoreType: 'apache2',
      items: { age: 78, temperatureC: 39.5, map: 55, heartRate: 130, respRate: 35, gcsScore: 8, chronicPoints: 5 },
      recordedAt: 1, roles: DOC, operatorId: 'd',
    });
    expect(s.totalScore).toBe(28);
  });
  test('SOFA 各系统 1 → 6；全 4 → 24', () => {
    const s1 = recordScore({ visitId: 'V-S1', patientId: PID, scoreType: 'sofa', items: { respiratory: 1, coagulation: 1, liver: 1, cardiovascular: 1, cns: 1, renal: 1 }, recordedAt: 1, roles: DOC, operatorId: 'd' });
    expect(s1.totalScore).toBe(6);
    const s2 = recordScore({ visitId: 'V-S2', patientId: PID, scoreType: 'sofa', items: { respiratory: 4, coagulation: 4, liver: 4, cardiovascular: 4, cns: 4, renal: 4 }, recordedAt: 1, roles: DOC, operatorId: 'd' });
    expect(s2.totalScore).toBe(24);
  });
  test('SOFA 某系统 5 → 400', () => {
    let s = 0;
    try { recordScore({ visitId: 'V-S3', patientId: PID, scoreType: 'sofa', items: { respiratory: 5 }, recordedAt: 1, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(400);
  });
  test('RASS=3 → 3；RASS=6 → 400', () => {
    const ok = recordScore({ visitId: 'V-R1', patientId: PID, scoreType: 'rass', items: { value: 3 }, recordedAt: 1, roles: DOC, operatorId: 'd' });
    expect(ok.totalScore).toBe(3);
    let s = 0;
    try { recordScore({ visitId: 'V-R2', patientId: PID, scoreType: 'rass', items: { value: 6 }, recordedAt: 1, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(400);
  });
  test('Ramsay=4 → 4；Ramsay=0 → 400', () => {
    const ok = recordScore({ visitId: 'V-Ra1', patientId: PID, scoreType: 'ramsay', items: { value: 4 }, recordedAt: 1, roles: DOC, operatorId: 'd' });
    expect(ok.totalScore).toBe(4);
    let s = 0;
    try { recordScore({ visitId: 'V-Ra2', patientId: PID, scoreType: 'ramsay', items: { value: 0 }, recordedAt: 1, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(400);
  });
  test('nurse 评分 → 403', () => {
    let s = 0;
    try { recordScore({ visitId: 'V-N', patientId: PID, scoreType: 'sofa', items: {}, recordedAt: 1, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(403);
  });
  test('同 visitId 同 scoreType 同 recordedAt → 409', () => {
    recordScore({ visitId: 'V-DUP2', patientId: PID, scoreType: 'rass', items: { value: 2 }, recordedAt: 100, roles: DOC, operatorId: 'd' });
    let s = 0;
    try { recordScore({ visitId: 'V-DUP2', patientId: PID, scoreType: 'rass', items: { value: 3 }, recordedAt: 100, roles: DOC, operatorId: 'd' }); }
    catch (e) { s = (e as IcuNotesError).status; }
    expect(s).toBe(409);
  });
  test('listScores 返回列表', () => {
    recordScore({ visitId: 'V-LS', patientId: PID, scoreType: 'rass', items: { value: 1 }, recordedAt: 1, roles: DOC, operatorId: 'd' });
    expect(listScores('V-LS').length).toBe(1);
  });
});
