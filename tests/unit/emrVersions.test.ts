/**
 * 健澜AI原生医院操作系统OS - P2-1 病历版本管理 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore,
  createNote,
  revise,
  listVersions,
  getVersion,
  diffBetween,
  finalize,
  unlockForEdit,
  reLock,
  EmrVersionError,
} from '../../src/bff/aggregators/emrVersionsAggregator';

const RESIDENT = ['resident'];
const ATTENDING = ['attending'];
const NURSE = ['nurse'];

beforeEach(() => { __resetStore(); });

function makeNote() {
  return createNote({
    visitId: 'V-1', patientId: 'P-1', title: '入院记录', noteType: 'admission',
    content: { chiefComplaint: '腹痛1天', presentIllness: '伴恶心' },
    roles: RESIDENT, authorId: 'r1', authorRole: 'resident',
  });
}
function statusOf(fn: () => unknown): number {
  try { fn(); return 0; } catch (e) { return (e as EmrVersionError).status; }
}

describe('P2-1 新建与角色', () => {
  test('创建 → v1，versions 长度 1', () => {
    const n = makeNote();
    expect(n.curVersion).toBe(1);
    expect(listVersions(n.noteId).length).toBe(1);
  });
  test('nurse 建病历 → 403', () => {
    expect(statusOf(() => createNote({ visitId:'V', patientId:'P', title:'t', noteType:'admission', content:{a:'b'}, roles: NURSE, authorId:'n1', authorRole:'nurse' }))).toBe(403);
  });
  test('非法 noteType → 400', () => {
    expect(statusOf(() => createNote({ visitId:'V', patientId:'P', title:'t', noteType:'fake', content:{a:'b'}, roles: RESIDENT, authorId:'r1', authorRole:'r' }))).toBe(400);
  });
  test('空 content → 400', () => {
    expect(statusOf(() => createNote({ visitId:'V', patientId:'P', title:'t', noteType:'admission', content:{}, roles: RESIDENT, authorId:'r1', authorRole:'r' }))).toBe(400);
  });
});

describe('P2-1 版本递增与 diff', () => {
  test('revise → v2，字段级 diff 只列变化', () => {
    const n = makeNote();
    const r = revise(n.noteId, { chiefComplaint: '腹痛3天', presentIllness: '伴恶心', physicalExam: '腹软' }, RESIDENT, 'r1', 'resident');
    expect(r.curVersion).toBe(2);
    const v2 = r.versions[1];
    const fields = v2.diffFromPrev.map((d) => d.field).sort();
    expect(fields).toEqual(['chiefComplaint', 'physicalExam']);
    const cc = v2.diffFromPrev.find((d) => d.field === 'chiefComplaint');
    expect(cc?.before).toBe('腹痛1天'); expect(cc?.after).toBe('腹痛3天');
  });
  test('历史版本只读不可改（getVersion 返回原内容）', () => {
    const n = makeNote();
    revise(n.noteId, { chiefComplaint: '改了' }, RESIDENT, 'r1', 'r');
    const v1 = getVersion(n.noteId, 1);
    expect(v1.content.chiefComplaint).toBe('腹痛1天');
  });
  test('非法 version 号 → 404', () => {
    const n = makeNote();
    expect(statusOf(() => getVersion(n.noteId, 99))).toBe(404);
  });
  test('diff?from=v1&to=v2 返回对比', () => {
    const n = makeNote();
    revise(n.noteId, { chiefComplaint: '腹痛3天' }, RESIDENT, 'r1', 'r');
    const d = diffBetween(n.noteId, 1, 2);
    // chiefComplaint 变；presentIllness v2 缺省变 null（也是变化）
    expect(d.changes.length).toBe(2);
    expect(d.changes[0].field).toBe('chiefComplaint');
  });
});

describe('P2-1 终稿锁定与解锁', () => {
  test('resident finalize → 403；attending finalize → finalized', () => {
    const n = makeNote();
    expect(statusOf(() => finalize(n.noteId, RESIDENT))).toBe(403);
    expect(finalize(n.noteId, ATTENDING).state).toBe('finalized');
  });
  test('finalized 状态 revise → 409', () => {
    const n = makeNote();
    finalize(n.noteId, ATTENDING);
    expect(statusOf(() => revise(n.noteId, { chiefComplaint: 'x' }, RESIDENT, 'r1', 'r'))).toBe(409);
  });
  test('unlock 无 reason → 400；unlock 后 revise → OK', () => {
    const n = makeNote();
    finalize(n.noteId, ATTENDING);
    expect(statusOf(() => unlockForEdit(n.noteId, '', 'a1', ATTENDING))).toBe(400);
    const u = unlockForEdit(n.noteId, '补充体征', 'a1', ATTENDING);
    expect(u.state).toBe('unlocked'); expect(u.unlockReason).toBe('补充体征');
    const r = revise(n.noteId, { physicalExam: '腹软' }, RESIDENT, 'r1', 'r');
    expect(r.curVersion).toBe(2);
  });
  test('re-lock → finalized；非 unlocked re-lock → 409', () => {
    const n = makeNote();
    finalize(n.noteId, ATTENDING);
    unlockForEdit(n.noteId, 'x', 'a1', ATTENDING);
    revise(n.noteId, { x: 'y' }, RESIDENT, 'r1', 'r');
    expect(reLock(n.noteId, ATTENDING).state).toBe('finalized');
    expect(statusOf(() => reLock(n.noteId, ATTENDING))).toBe(409);
  });
  test('resident unlock → 403', () => {
    const n = makeNote();
    finalize(n.noteId, ATTENDING);
    expect(statusOf(() => unlockForEdit(n.noteId, 'x', 'r1', RESIDENT))).toBe(403);
  });
});
