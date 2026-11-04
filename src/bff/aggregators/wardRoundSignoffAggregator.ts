/**
 * 健澜AI原生医院操作系统OS - P1-1 三级检诊工作流（resident/attending/chief）
 *
 * 病程记录三级签审时间线：
 *   draft（住院医写）─主治 approve─► chief_sign（主治已审）─主任终签─► archived
 *   reject / return → 回 draft 可重写；archived 不可改。
 *
 * 越级签审留痕：
 *   - 主治未审、主任直接终签（draft → archived）：escalated=true, bypassedLevel='attending'
 *   - 主治审（approve）正常流转不越级。
 * 每条动作写签审意见留痕 {recordId, noteId, reviewerId, reviewerRole, action, comment, signedAt}。
 * 行级 visitId-patientId 绑定（复用 assertVisitPatientBinding + 本对象 patientId 一致性）。
 *
 * 与既有 PG 二级 rounds（inpatientCare）/ m547 时间递进 rounds 独立，不遮蔽。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export type NoteStatus = 'draft' | 'attending_review' | 'chief_sign' | 'archived';
export type TrailAction = 'submit' | 'approve' | 'reject' | 'chief-sign' | 'return';
export type SignerRole = 'resident' | 'attending' | 'chief' | 'admin';

export interface SignoffNote {
  noteId: string;
  visitId: string;
  patientId: string;
  content: string;
  status: NoteStatus;
  /** 越级签审标记：true 表示有级别被跳过 */
  escalated: boolean;
  /** 被跳过的级别：attending（主治未审主任直签） */
  bypassedLevel?: 'attending';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface TrailRecord {
  recordId: string;
  noteId: string;
  reviewerId: string;
  reviewerRole: string;
  action: TrailAction;
  comment: string;
  signedAt: number;
  escalated?: boolean;
  bypassedLevel?: 'attending';
}

export class WardRoundSignoffError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const notes = new Map<string, SignoffNote>();
const trail = new Map<string, TrailRecord[]>();
let noteSeq = 0;
let recordSeq = 0;

const HOUR_MS = 3_600_000;

function pushTrail(noteId: string, rec: Omit<TrailRecord, 'recordId' | 'signedAt'>, now: number): TrailRecord {
  recordSeq += 1;
  const full: TrailRecord = {
    recordId: `TRAIL-${String(recordSeq).padStart(4, '0')}`,
    signedAt: now,
    ...rec,
  };
  const list = trail.get(noteId) ?? [];
  list.push(full);
  trail.set(noteId, list);
  return full;
}

function requireRoles(roles: string[], allowed: SignerRole[]): void {
  if (roles.includes('admin')) return;
  if (!roles.some((r) => (allowed as string[]).includes(r))) {
    throw new WardRoundSignoffError(403, '权限不足：当前角色无权执行该签审动作');
  }
}

/* ------------------------------------------------------------------ */
/* 对外                                                                */
/* ------------------------------------------------------------------ */

export interface CreateNoteInput {
  visitId: string;
  patientId: string;
  content: string;
  roles: string[];
  authorId: string;
  now?: number;
}

/** 住院医写病程（submit）→ draft。 */
export function createNote(input: CreateNoteInput): SignoffNote {
  const now = input.now ?? Date.now();
  requireRoles(input.roles, ['resident']);
  if (!input.visitId) throw new WardRoundSignoffError(400, 'visitId 必填');
  if (!input.patientId) throw new WardRoundSignoffError(400, 'patientId 必填');
  if (!input.content || !input.content.trim()) throw new WardRoundSignoffError(400, '病程内容 content 必填');

  // 行级绑定：visitId ↔ patientId（复用既有校验）
  assertVisitPatientBinding(input.visitId, input.patientId);

  noteSeq += 1;
  const note: SignoffNote = {
    noteId: `WRSN-${String(noteSeq).padStart(4, '0')}`,
    visitId: input.visitId,
    patientId: input.patientId,
    content: input.content.trim(),
    status: 'draft',
    escalated: false,
    createdBy: input.authorId,
    createdAt: now,
    updatedAt: now,
  };
  notes.set(note.noteId, note);
  pushTrail(note.noteId, {
    noteId: note.noteId, reviewerId: input.authorId, reviewerRole: 'resident',
    action: 'submit', comment: '住院医提交病程草稿',
  }, now);
  return note;
}

export interface ReviewInput {
  noteId: string;
  action: 'approve' | 'reject';
  comment?: string;
  patientId?: string;
  roles: string[];
  reviewerId: string;
  now?: number;
}

/** 主治审（approve → chief_sign；reject → 回 draft）。 */
export function reviewNote(input: ReviewInput): SignoffNote {
  const now = input.now ?? Date.now();
  requireRoles(input.roles, ['attending']);
  const note = notes.get(input.noteId);
  if (!note) throw new WardRoundSignoffError(404, `病程记录不存在: ${input.noteId}`);
  if (note.status === 'archived') throw new WardRoundSignoffError(409, '已归档病程不可再审');
  if (note.status !== 'draft') {
    throw new WardRoundSignoffError(409, `当前状态 ${note.status} 不可主治审（需为 draft）`);
  }
  if (input.patientId && input.patientId !== note.patientId) {
    throw new WardRoundSignoffError(403, `行级归属失败：记录绑定患者 ${note.patientId}，与传入不一致`);
  }

  if (input.action === 'approve') {
    note.status = 'chief_sign';
    note.updatedAt = now;
    pushTrail(note.noteId, {
      noteId: note.noteId, reviewerId: input.reviewerId, reviewerRole: 'attending',
      action: 'approve', comment: input.comment?.trim() || '主治审核通过，转主任终签',
    }, now);
  } else {
    if (!input.comment?.trim()) throw new WardRoundSignoffError(400, '驳回意见 comment 必填');
    note.status = 'draft';
    note.updatedAt = now;
    pushTrail(note.noteId, {
      noteId: note.noteId, reviewerId: input.reviewerId, reviewerRole: 'attending',
      action: 'reject', comment: input.comment.trim(),
    }, now);
  }
  return note;
}

export interface ChiefSignInput {
  noteId: string;
  comment?: string;
  patientId?: string;
  roles: string[];
  reviewerId: string;
  now?: number;
}

/** 主任终签。draft 直签 → 越级留痕（bypassedLevel=attending）。 */
export function chiefSignNote(input: ChiefSignInput): SignoffNote {
  const now = input.now ?? Date.now();
  requireRoles(input.roles, ['chief']);
  const note = notes.get(input.noteId);
  if (!note) throw new WardRoundSignoffError(404, `病程记录不存在: ${input.noteId}`);
  if (note.status === 'archived') throw new WardRoundSignoffError(409, '已归档病程不可重复终签');
  if (input.patientId && input.patientId !== note.patientId) {
    throw new WardRoundSignoffError(403, `行级归属失败：记录绑定患者 ${note.patientId}，与传入不一致`);
  }

  let escalated = false;
  if (note.status === 'draft') {
    // 主治未审、主任直接终签 → 越级
    escalated = true;
    note.escalated = true;
    note.bypassedLevel = 'attending';
  } else if (note.status !== 'chief_sign') {
    throw new WardRoundSignoffError(409, `当前状态 ${note.status} 不可主任终签`);
  }

  note.status = 'archived';
  note.updatedAt = now;
  pushTrail(note.noteId, {
    noteId: note.noteId, reviewerId: input.reviewerId, reviewerRole: 'chief',
    action: 'chief-sign', comment: input.comment?.trim() || '主任终签',
    ...(escalated ? { escalated: true, bypassedLevel: 'attending' as const } : {}),
  }, now);
  return note;
}

/** 列表（可按 visitId 过滤）。 */
export function listNotes(visitId?: string): SignoffNote[] {
  const all = Array.from(notes.values());
  const filtered = visitId ? all.filter((n) => n.visitId === visitId) : all;
  filtered.sort((a, b) => b.createdAt - a.createdAt);
  return filtered;
}

/** 签审意见时间线。 */
export function noteTrail(noteId: string): TrailRecord[] {
  const note = notes.get(noteId);
  if (!note) throw new WardRoundSignoffError(404, `病程记录不存在: ${noteId}`);
  return trail.get(noteId) ?? [];
}

export function __resetStore(): void {
  notes.clear();
  trail.clear();
  noteSeq = 0;
  recordSeq = 0;
}

void HOUR_MS;
