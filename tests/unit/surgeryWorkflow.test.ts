/**
 * 健澜AI原生医院操作系统OS - P1-3 手术麻醉闭环 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  createRequest,
  scheduleRequest,
  transition,
  recordAnesthesia,
  recordPacu,
  SurgeryWorkflowError,
} from '../../src/bff/aggregators/surgeryWorkflowAggregator';

const SURGEON = ['surgeon'];
const ANES = ['anesthetist'];
const NURSE = ['nurse'];
const ADMIN = ['admin'];
const NOW = Date.now();

beforeEach(() => { __resetStore(); });

function seedFlow(suffix: string) {
  const r = createRequest({ visitId: `V-${suffix}`, patientId: 'PT-P001', surgeryName: `阑尾切除${suffix}`, plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's1', roles: SURGEON });
  scheduleRequest({ reqId: r.reqId, orRoom: 'OR-1', scheduledStart: NOW + 3600_000, scheduledEnd: NOW + 2 * 3600_000, roles: ADMIN });
  transition({ reqId: r.reqId, toState: 'in_or', roles: SURGEON });
  transition({ reqId: r.reqId, toState: 'in_progress', roles: SURGEON });
  return r;
}

describe('P1-3 申请与排班', () => {
  test('surgeon 创建申请 → status=draft', () => {
    const r = createRequest({ visitId: 'V-1', patientId: 'PT-P001', surgeryName: '胆囊', plannedStart: NOW, plannedDurationMin: 90, surgeonId: 's', roles: SURGEON });
    expect(r.status).toBe('draft'); expect(r.reqId).toMatch(/^SR-/);
  });
  test('anesthetist 创建申请 → 403', () => {
    let s = 0;
    try { createRequest({ visitId: 'V', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: ANES }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(403);
  });
  test('plannedDurationMin=20 → 400', () => {
    let s = 0;
    try { createRequest({ visitId: 'V', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 20, surgeonId: 's', roles: SURGEON }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('admin 排班 → status=scheduled 且记录手术间', () => {
    const r = createRequest({ visitId: 'V-2', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    const s = scheduleRequest({ reqId: r.reqId, orRoom: 'OR-2', scheduledStart: NOW + 3600_000, scheduledEnd: NOW + 4 * 3600_000, roles: ADMIN });
    expect(s.status).toBe('scheduled'); expect(s.scheduledOrRoom).toBe('OR-2');
  });
  test('surgeon 排班 → 403', () => {
    const r = createRequest({ visitId: 'V', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    let s = 0;
    try { scheduleRequest({ reqId: r.reqId, orRoom: 'OR-1', scheduledStart: NOW, scheduledEnd: NOW + 3600_000, roles: SURGEON }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(403);
  });
  test('手术间时段重叠 → 409', () => {
    const r1 = createRequest({ visitId: 'V-A', patientId: 'PT-P001', surgeryName: 'a', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    scheduleRequest({ reqId: r1.reqId, orRoom: 'OR-3', scheduledStart: NOW + 10 * 3600_000, scheduledEnd: NOW + 12 * 3600_000, roles: ADMIN });
    const r2 = createRequest({ visitId: 'V-B', patientId: 'PT-P001', surgeryName: 'b', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    let s = 0;
    try { scheduleRequest({ reqId: r2.reqId, orRoom: 'OR-3', scheduledStart: NOW + 11 * 3600_000, scheduledEnd: NOW + 13 * 3600_000, roles: ADMIN }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(409);
  });
});

describe('P1-3 状态机', () => {
  test('逐级流转 draft→scheduled→in_or→in_progress', () => {
    const r = seedFlow('flow');
    expect(r.status).toBe('in_progress');
  });
  test('越级 draft 直接 in_pacu → 409', () => {
    const r = createRequest({ visitId: 'V-J', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    let s = 0;
    try { transition({ reqId: r.reqId, toState: 'in_pacu', roles: SURGEON }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(409);
  });
  test('非法 toState 字符串 → 400', () => {
    const r = createRequest({ visitId: 'V-K', patientId: 'PT-P001', surgeryName: 'x', plannedStart: NOW, plannedDurationMin: 60, surgeonId: 's', roles: SURGEON });
    let s = 0;
    try { transition({ reqId: r.reqId, toState: 'bogus', roles: SURGEON }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('重复同一状态 → 200 幂等', () => {
    const r = seedFlow('idem');
    const again = transition({ reqId: r.reqId, toState: 'in_progress', roles: SURGEON });
    expect(again.status).toBe('in_progress');
  });
});

describe('P1-3 麻醉与 PACU', () => {
  test('anesthetist 术中记录麻醉 → 写入 drugs/fluids', () => {
    const r = seedFlow('anes');
    const rec = recordAnesthesia({ reqId: r.reqId, anesthesiaType: '全麻', drugs: ['丙泊酚'], fluidsIn: 1500, fluidsOut: 400, roles: ANES, operatorId: 'a1' });
    expect(rec.anesthesiaRecord?.drugs).toEqual(['丙泊酚']);
    expect(rec.anesthesiaRecord?.fluidsIn).toBe(1500);
  });
  test('nurse 记录麻醉 → 403', () => {
    const r = seedFlow('an2');
    let s = 0;
    try { recordAnesthesia({ reqId: r.reqId, drugs: [], roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(403);
  });
  test('nurse 入 PACU 后记录复苏（aldrete/pain）', () => {
    const r = seedFlow('pac');
    transition({ reqId: r.reqId, toState: 'in_pacu', roles: SURGEON });
    const rec = recordPacu({ reqId: r.reqId, aldreteScore: 9, consciousness: '清醒', painScore: 2, roles: NURSE, operatorId: 'n' });
    expect(rec.pacuNote?.aldreteScore).toBe(9);
    expect(rec.pacuNote?.painScore).toBe(2);
  });
  test('aldreteScore=11 → 400', () => {
    const r = seedFlow('pa2');
    transition({ reqId: r.reqId, toState: 'in_pacu', roles: SURGEON });
    let s = 0;
    try { recordPacu({ reqId: r.reqId, aldreteScore: 11, consciousness: 'x', painScore: 2, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('painScore=-1 → 400', () => {
    const r = seedFlow('pa3');
    transition({ reqId: r.reqId, toState: 'in_pacu', roles: SURGEON });
    let s = 0;
    try { recordPacu({ reqId: r.reqId, aldreteScore: 8, consciousness: 'x', painScore: -1, roles: NURSE, operatorId: 'n' }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(400);
  });
  test('surgeon 记 PACU → 403', () => {
    const r = seedFlow('pa4');
    transition({ reqId: r.reqId, toState: 'in_pacu', roles: SURGEON });
    let s = 0;
    try { recordPacu({ reqId: r.reqId, aldreteScore: 9, consciousness: 'x', painScore: 0, roles: SURGEON, operatorId: 's' }); }
    catch (e) { s = (e as SurgeryWorkflowError).status; }
    expect(s).toBe(403);
  });
});
