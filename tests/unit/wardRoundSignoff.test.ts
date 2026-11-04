/**
 * 健澜AI原生医院操作系统OS - P1-1 三级检诊工作流 单测
 *
 * 覆盖：三级状态机（draft→chief_sign→archived）、越级留痕（draft 直签标 bypassedLevel=attending）、
 * reject 回 draft、archived 不可改、角色越权 403、行级错配 403、意见留痕字段。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  createNote,
  reviewNote,
  chiefSignNote,
  noteTrail,
  WardRoundSignoffError,
} from '../../src/bff/aggregators/wardRoundSignoffAggregator';

const RES = { roles: ['resident'], authorId: 'res-1' };
const ATT = { roles: ['attending'], reviewerId: 'att-1' };
const CHF = { roles: ['chief'], reviewerId: 'chf-1' };

beforeEach(() => __resetStore());

function makeDraft(content = '患者今日病情稳定，继续观察。') {
  return createNote({ visitId: 'V-A100', patientId: 'PT-P001', content, roles: RES.roles, authorId: RES.authorId });
}

describe('P1-1 病程创建', () => {
  test('住院医写病程 → draft 且 trail 含 submit', () => {
    const n = makeDraft();
    expect(n.status).toBe('draft');
    const t = noteTrail(n.noteId);
    expect(t[0].action).toBe('submit');
    expect(t[0].reviewerRole).toBe('resident');
  });
  test('缺 visitId → 400', () => {
    let s = 0;
    try { createNote({ visitId: '', patientId: 'P', content: 'x', roles: RES.roles, authorId: 'r' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(400);
  });
  test('空 content → 400', () => {
    let s = 0;
    try { createNote({ visitId: 'V', patientId: 'P', content: '  ', roles: RES.roles, authorId: 'r' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(400);
  });
  test('主治不能写病程（403）', () => {
    let s = 0;
    try { createNote({ visitId: 'V', patientId: 'P', content: 'x', roles: ['attending'], authorId: 'a' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(403);
  });
});

describe('P1-1 主治审', () => {
  test('approve → chief_sign', () => {
    const n = makeDraft();
    const r = reviewNote({ noteId: n.noteId, action: 'approve', comment: '同意', roles: ATT.roles, reviewerId: ATT.reviewerId });
    expect(r.status).toBe('chief_sign');
  });
  test('reject 回 draft 且意见必填', () => {
    const n = makeDraft();
    let s = 0;
    try { reviewNote({ noteId: n.noteId, action: 'reject', roles: ATT.roles, reviewerId: 'a' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(400);
    const r = reviewNote({ noteId: n.noteId, action: 'reject', comment: '补充查体', roles: ATT.roles, reviewerId: ATT.reviewerId });
    expect(r.status).toBe('draft');
  });
  test('住院医不能审（403）', () => {
    const n = makeDraft();
    let s = 0;
    try { reviewNote({ noteId: n.noteId, action: 'approve', roles: ['resident'], reviewerId: 'r' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(403);
  });
  test('行级错配 patientId → 403', () => {
    const n = makeDraft();
    let s = 0;
    try { reviewNote({ noteId: n.noteId, action: 'approve', patientId: 'PT-WRONG', roles: ATT.roles, reviewerId: 'a' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(403);
  });
});

describe('P1-1 主任终签与越级', () => {
  test('正常终签（chief_sign → archived）', () => {
    const n = makeDraft();
    reviewNote({ noteId: n.noteId, action: 'approve', roles: ATT.roles, reviewerId: 'a' });
    const r = chiefSignNote({ noteId: n.noteId, roles: CHF.roles, reviewerId: CHF.reviewerId });
    expect(r.status).toBe('archived');
    expect(r.escalated).toBe(false);
  });
  test('越级：主治未审主任直签 → escalated=true bypassedLevel=attending', () => {
    const n = makeDraft();
    const r = chiefSignNote({ noteId: n.noteId, roles: CHF.roles, reviewerId: 'chf' });
    expect(r.status).toBe('archived');
    expect(r.escalated).toBe(true);
    expect(r.bypassedLevel).toBe('attending');
    const t = noteTrail(n.noteId);
    const cs = t[t.length - 1];
    expect(cs.action).toBe('chief-sign');
    expect(cs.escalated).toBe(true);
    expect(cs.bypassedLevel).toBe('attending');
  });
  test('住院医不能终签（403）', () => {
    const n = makeDraft();
    let s = 0;
    try { chiefSignNote({ noteId: n.noteId, roles: ['resident'], reviewerId: 'r' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(403);
  });
  test('已归档重复终签 → 409', () => {
    const n = makeDraft();
    chiefSignNote({ noteId: n.noteId, roles: CHF.roles, reviewerId: 'c' });
    let s = 0;
    try { chiefSignNote({ noteId: n.noteId, roles: CHF.roles, reviewerId: 'c' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(409);
  });
  test('已归档再审 → 409', () => {
    const n = makeDraft();
    chiefSignNote({ noteId: n.noteId, roles: CHF.roles, reviewerId: 'c' });
    let s = 0;
    try { reviewNote({ noteId: n.noteId, action: 'approve', roles: ATT.roles, reviewerId: 'a' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(409);
  });
  test('不存在 note → 404', () => {
    let s = 0;
    try { chiefSignNote({ noteId: 'NOPE', roles: CHF.roles, reviewerId: 'c' }); }
    catch (e) { s = (e as WardRoundSignoffError).status; }
    expect(s).toBe(404);
  });
  test('trail 字段齐全（reviewerId/role/action/comment/signedAt）', () => {
    const n = makeDraft();
    reviewNote({ noteId: n.noteId, action: 'approve', comment: '同意', roles: ATT.roles, reviewerId: 'att-1' });
    const t = noteTrail(n.noteId);
    const approve = t.find((x) => x.action === 'approve')!;
    expect(approve.reviewerId).toBe('att-1');
    expect(approve.reviewerRole).toBe('attending');
    expect(approve.comment).toBe('同意');
    expect(typeof approve.signedAt).toBe('number');
  });
});
