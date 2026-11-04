/**
 * 健澜AI原生医院操作系统OS - P1-6 院前住院管家 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  createPreAdmission,
  checkIn,
  getChecklist,
  toggleItem,
  pushEducation,
  listEducation,
  listSlots,
  bookExam,
  grantAuthorization,
  ConciergeError,
} from '../../src/bff/aggregators/inpatientConciergeAggregator';

const PATIENT = (id: string) => ({ roles: ['patient'], id });
const FAMILY = (id: string) => ({ roles: ['family'], id });
const NURSE = { roles: ['nurse'], id: 'nurse1' };
const NOW = Date.now();

beforeEach(() => { __resetStore(); });

function makePre(patientId = 'P-MAIN', scheduled = NOW + 24 * 3600_000) {
  return createPreAdmission({ patientId, scheduledAdmissionAt: scheduled, department: '消化内科', expectedStayDays: 5, roles: ['patient'], actorId: patientId });
}

describe('P1-6 预入院与报到', () => {
  test('patient 本人创建预入院 → pre-admitted + 默认 10 条清单', () => {
    const p = makePre();
    expect(p.status).toBe('pre-admitted');
    expect(getChecklist(p.preAdmissionId).length).toBe(10);
  });
  test('patient 给别人创建 → 403', () => {
    let s = 0;
    try { createPreAdmission({ patientId: 'P-OTHER', scheduledAdmissionAt: NOW, department: 'x', expectedStayDays: 1, roles: ['patient'], actorId: 'P-ME' }); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
  test('nurse 报到 → checked-in；重复报到 → 409', () => {
    const p = makePre();
    const c = checkIn(p.preAdmissionId, NURSE.roles, NOW);
    expect(c.status).toBe('checked-in');
    let s = 0;
    try { checkIn(p.preAdmissionId, NURSE.roles, NOW); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(409);
  });
  test('过期 >7 天预约报到 → 400', () => {
    const p = makePre('P-OLD', NOW - 8 * 24 * 3600_000);
    let s = 0;
    try { checkIn(p.preAdmissionId, NURSE.roles, NOW); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(400);
  });
  test('patient 自己报到 → 403（须护士站）', () => {
    const p = makePre();
    let s = 0;
    try { checkIn(p.preAdmissionId, ['patient'], NOW); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
});

describe('P1-6 准备清单', () => {
  test('toggle done → done；再 toggle done 幂等', () => {
    const p = makePre();
    const items = getChecklist(p.preAdmissionId);
    const t = toggleItem(p.preAdmissionId, items[0].itemId, 'done', PATIENT(p.patientId).roles, p.patientId);
    expect(t.state).toBe('done');
    const again = toggleItem(p.preAdmissionId, items[0].itemId, 'done', PATIENT(p.patientId).roles, p.patientId);
    expect(again.state).toBe('done');
  });
  test('patient 给别人的清单 toggle → 403', () => {
    const p = makePre();
    const items = getChecklist(p.preAdmissionId);
    let s = 0;
    try { toggleItem(p.preAdmissionId, items[0].itemId, 'done', PATIENT('P-INTRUDER').roles, 'P-INTRUDER'); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
});

describe('P1-6 宣教推送', () => {
  test('nurse 推送宣教 → 入列表', () => {
    const p = makePre();
    const e = pushEducation({ preAdmissionId: p.preAdmissionId, topic: '呼吸功能锻炼', content: '缩唇呼吸', pushChannel: 'app', roles: NURSE.roles, actorId: NURSE.id });
    expect(e.pushChannel).toBe('app');
    expect(listEducation(p.preAdmissionId).length).toBe(1);
  });
});

describe('P1-6 检查检验预约', () => {
  test('listSlots 返回 8 个时段；非法 examType → 400', () => {
    expect(listSlots('ct').length).toBe(8);
    let s = 0;
    try { listSlots('ecg'); } catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(400);
  });
  test('book 合法时段 → 200；同 patientId 同 examType 同 slot → 409', () => {
    const p = makePre();
    const slots = listSlots('ct');
    const b = bookExam({ preAdmissionId: p.preAdmissionId, examType: 'ct', slotTime: slots[0], department: '放射科', roles: PATIENT(p.patientId).roles, actorId: p.patientId });
    expect(b.examType).toBe('ct');
    let s = 0;
    try { bookExam({ preAdmissionId: p.preAdmissionId, examType: 'ct', slotTime: slots[0], department: '放射科', roles: PATIENT(p.patientId).roles, actorId: p.patientId }); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(409);
  });
  test('book 非法时段（不在排班表）→ 400', () => {
    const p = makePre();
    let s = 0;
    try { bookExam({ preAdmissionId: p.preAdmissionId, examType: 'mri', slotTime: NOW, department: 'x', roles: PATIENT(p.patientId).roles, actorId: p.patientId }); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(400);
  });
});

describe('P1-6 家属授权链', () => {
  test('patient 授权家属 scope=checklist；家属 toggle OK；无 scope → 403', () => {
    const p = makePre('P-FAM');
    grantAuthorization({ patientId: 'P-FAM', familyMemberId: 'F-1', familyMemberName: '家属甲', scope: ['checklist'], roles: ['patient'], actorId: 'P-FAM' });
    const items = getChecklist(p.preAdmissionId);
    // 家属有 checklist scope
    const ok = toggleItem(p.preAdmissionId, items[1].itemId, 'done', FAMILY('F-1').roles, 'F-1');
    expect(ok.state).toBe('done');
    // 家属无 education scope，推送应 403
    let s = 0;
    try { pushEducation({ preAdmissionId: p.preAdmissionId, topic: 'x', content: 'y', pushChannel: 'sms', roles: FAMILY('F-1').roles, actorId: 'F-1' }); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
  test('未授权家属调 checklist → 403 code=40300 等价', () => {
    const p = makePre('P-NOAUTH');
    const items = getChecklist(p.preAdmissionId);
    let s = 0;
    try { toggleItem(p.preAdmissionId, items[0].itemId, 'done', FAMILY('F-NO').roles, 'F-NO'); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
  test('非患者本人授权家属 → 403', () => {
    let s = 0;
    try { grantAuthorization({ patientId: 'P-X', familyMemberId: 'F', familyMemberName: 'x', scope: [], roles: ['patient'], actorId: 'P-Y' }); }
    catch (e) { s = (e as ConciergeError).status; }
    expect(s).toBe(403);
  });
});
