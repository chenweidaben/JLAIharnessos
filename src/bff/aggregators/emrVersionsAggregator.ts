/**
 * 健澜AI原生医院操作系统OS - P2-1 病历版本管理（电子病历 5 级合规核心）
 *
 * 每个 noteId 下 versions[] 不可变历史：
 *  - v1, v2, v3... 每版 {version, content, authorId, authorRole, savedAt, diffFromPrev, status}
 *  - finalized=true 后 revise → 409；必须先 unlock-for-edit（attending/chief + reason）留痕
 *  - re-lock 回到 finalized
 *
 * content 为结构化字段 {chiefComplaint, presentIllness, physicalExam, assessment, plan}，
 * diff 按字段级 before/after 只列变化项。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class EmrVersionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface NoteContent {
  chiefComplaint?: string;
  presentIllness?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
}

export interface DiffEntry { field: string; before: unknown; after: unknown; }
export interface NoteVersion {
  version: number;
  content: NoteContent;
  authorId: string;
  authorRole: string;
  savedAt: number;
  diffFromPrev: DiffEntry[];
  status: 'draft' | 'finalized';
}

export type NoteState = 'draft' | 'finalized' | 'unlocked';

export interface EmrNote {
  noteId: string;
  visitId: string;
  patientId: string;
  title: string;
  noteType: string;
  state: NoteState;
  curVersion: number;
  versions: NoteVersion[];
  unlockReason?: string;
  unlockApproverId?: string;
  unlockedAt?: number;
  createdAt: number;
}

const NOTETYPES = new Set(['progress', 'admission', 'transfer', 'discharge', 'consult', 'op-note']);
const notes = new Map<string, EmrNote>();
let seq = 0;

function must(noteId: string): EmrNote {
  const n = notes.get(noteId);
  if (!n) throw new EmrVersionError(404, `病历不存在：${noteId}`);
  return n;
}

function isClinicalWriter(roles: string[]): boolean {
  return roles.includes('resident') || roles.includes('doctor') || roles.includes('attending') || roles.includes('chief');
}
function isSenior(roles: string[]): boolean {
  return roles.includes('attending') || roles.includes('chief');
}

function diff(a: NoteContent, b: NoteContent): DiffEntry[] {
  const fields = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: DiffEntry[] = [];
  for (const f of fields) {
    const av = a[f as keyof NoteContent] ?? null;
    const bv = b[f as keyof NoteContent] ?? null;
    if (av !== bv) out.push({ field: f, before: av, after: bv });
  }
  return out;
}

// ---------- 新建 v1 ----------
export interface CreateInput { visitId: string; patientId: string; title: string; noteType: string; content: NoteContent; roles: string[]; authorId: string; authorRole: string; }
export function createNote(input: CreateInput): EmrNote {
  if (!isClinicalWriter(input.roles)) throw new EmrVersionError(403, '非临床医生不可建病历');
  if (!input.title || input.title.length > 100) throw new EmrVersionError(400, 'title 必填且 ≤100 字');
  if (!NOTETYPES.has(input.noteType)) throw new EmrVersionError(400, `非法 noteType：${input.noteType}`);
  if (!input.content || Object.keys(input.content).length === 0) throw new EmrVersionError(400, 'content 非空');
  seq += 1;
  const note: EmrNote = {
    noteId: `EMR-${String(seq).padStart(4, '0')}`,
    visitId: input.visitId, patientId: input.patientId,
    title: input.title, noteType: input.noteType,
    state: 'draft', curVersion: 1, createdAt: Date.now(),
    versions: [{
      version: 1, content: input.content, authorId: input.authorId,
      authorRole: input.authorRole, savedAt: Date.now(), diffFromPrev: [], status: 'draft',
    }],
  };
  notes.set(note.noteId, note);
  return note;
}

// ---------- 修订 ----------
export function revise(noteId: string, content: NoteContent, roles: string[], authorId: string, authorRole: string): EmrNote {
  if (!isClinicalWriter(roles)) throw new EmrVersionError(403, '非临床医生不可修订病历');
  const n = must(noteId);
  if (n.state === 'finalized') throw new EmrVersionError(409, '病历已终稿锁定，需主任 unlock-for-edit 后方可修订');
  if (!content || Object.keys(content).length === 0) throw new EmrVersionError(400, 'content 非空');
  const prev = n.versions[n.versions.length - 1];
  const v: NoteVersion = {
    version: n.curVersion + 1, content, authorId, authorRole,
    savedAt: Date.now(), diffFromPrev: diff(prev.content, content),
    status: n.state === 'unlocked' ? 'draft' : 'draft',
  };
  n.curVersion = v.version;
  n.versions.push(v);
  // 解锁后修订不自动 finalize，保持 unlocked 直到 re-lock
  return n;
}

// ---------- 列表 / 单版 / diff ----------
export function listVersions(noteId: string): NoteVersion[] {
  return must(noteId).versions;
}
export function getVersion(noteId: string, v: number): NoteVersion {
  const n = must(noteId);
  const found = n.versions.find((x) => x.version === v);
  if (!found) throw new EmrVersionError(404, `版本不存在：v${v}`);
  return found;
}
export function diffBetween(noteId: string, from: number, to: number): { from: number; to: number; changes: DiffEntry[] } {
  const n = must(noteId);
  const a = n.versions.find((x) => x.version === from);
  const b = n.versions.find((x) => x.version === to);
  if (!a || !b) throw new EmrVersionError(404, 'from/to 版本不存在');
  return { from, to, changes: diff(a.content, b.content) };
}

// ---------- 终稿 / 解锁 / 再锁 ----------
export function finalize(noteId: string, roles: string[]): EmrNote {
  if (!isSenior(roles)) throw new EmrVersionError(403, '终稿锁定需 attending/chief 权限');
  const n = must(noteId);
  n.state = 'finalized';
  const cur = n.versions[n.versions.length - 1];
  cur.status = 'finalized';
  return n;
}

export function unlockForEdit(noteId: string, reason: string, approverId: string, roles: string[]): EmrNote {
  if (!isSenior(roles)) throw new EmrVersionError(403, '终稿后修改需 attending/chief 审批');
  const n = must(noteId);
  if (!reason) throw new EmrVersionError(400, 'unlock reason 必填');
  if (n.state === 'unlocked') return n; // 幂等
  if (n.state !== 'finalized') throw new EmrVersionError(409, '仅终稿状态可 unlock-for-edit');
  n.state = 'unlocked';
  n.unlockReason = reason;
  n.unlockApproverId = approverId;
  n.unlockedAt = Date.now();
  return n;
}

export function reLock(noteId: string, roles: string[]): EmrNote {
  if (!isSenior(roles)) throw new EmrVersionError(403, '再锁定需 attending/chief 权限');
  const n = must(noteId);
  if (n.state !== 'unlocked') throw new EmrVersionError(409, '仅 unlocked 状态可 re-lock');
  n.state = 'finalized';
  n.unlockReason = undefined; n.unlockApproverId = undefined; n.unlockedAt = undefined;
  const cur = n.versions[n.versions.length - 1];
  cur.status = 'finalized';
  return n;
}

export function listNotes(visitId?: string): EmrNote[] {
  const arr = [...notes.values()];
  return visitId ? arr.filter((n) => n.visitId === visitId) : arr;
}

export function __resetStore(): void { notes.clear(); seq = 0; }
