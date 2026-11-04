/**
 * 健澜AI原生医院操作系统OS - P1-6 院前住院管家
 *
 * 五模块：
 *  1) 预入院 + 到院报到（重复报到 409，过期 >7 天 400）
 *  2) 住院准备清单（默认 10 条，pending→done|skipped，done 再 toggle 幂等）
 *  3) 入院宣教推送（sms/wechat/app）
 *  4) 检查检验预约联动（mock 排班表；同 patientId 同 examType 同 slot 409，时段非法 400）
 *  5) 家属代办授权链（patient 授权 family scope；family 无授权 403 code=40300）
 *
 * 角色：patient 操作本人、family 凭授权、nurse 报到/推送/toggle/代发起、admin 全放行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class ConciergeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type PreStatus = 'pre-admitted' | 'checked-in';

export interface PreAdmission {
  preAdmissionId: string;
  patientId: string;
  scheduledAdmissionAt: number;
  department: string;
  expectedStayDays: number;
  status: PreStatus;
  checkedInAt?: number;
  createdAt: number;
}

export interface ChecklistItem {
  itemId: string;
  preAdmissionId: string;
  label: string;
  state: 'pending' | 'done' | 'skipped';
}

export interface EducationPush {
  pushId: string;
  preAdmissionId: string;
  topic: string;
  content: string;
  pushChannel: 'sms' | 'wechat' | 'app';
  pushedAt: number;
  pushedBy: string;
}

export interface ExamBooking {
  bookingId: string;
  preAdmissionId: string;
  patientId: string;
  examType: string;
  slotTime: number;
  department: string;
}

export interface Authorization {
  patientId: string;
  familyMemberId: string;
  familyMemberName: string;
  scope: string[];
  grantedAt: number;
}

const preAdmissions = new Map<string, PreAdmission>();
const checklist = new Map<string, ChecklistItem[]>(); // preAdmissionId -> items
const educationPushes = new Map<string, EducationPush[]>();
const bookings: ExamBooking[] = [];
const authorizations = new Map<string, Authorization>(); // key = patientId|familyMemberId
let seq = 0;

const DEFAULT_CHECKLIST = [
  '身份证原件', '医保卡', '住院押金', '生活用品', '既往病历资料',
  '停药告知（抗凝/降糖等）', '禁食禁水（术前 8h）', '陪护人信息', '出院证件照', '新冠/核酸阴性报告',
];

// mock 检查排班：每科 8 个时段（当日整点 8~15 点）
function availableSlots(examType: string): number[] {
  const dayStart = new Date();
  dayStart.setHours(8, 0, 0, 0);
  const base = dayStart.getTime();
  return Array.from({ length: 8 }, (_, i) => base + i * 3600_000);
}

function mustPre(id: string): PreAdmission {
  const r = preAdmissions.get(id);
  if (!r) throw new ConciergeError(404, `预入院单不存在：${id}`);
  return r;
}

/** 解析 actor 对某 patientId 的操作权限与所需 scope。 */
function assertAccess(actor: { roles: string[]; id: string }, patientId: string, scope: string): void {
  const roles = actor.roles;
  if (roles.includes('admin') || roles.includes('nurse')) return;
  if (roles.includes('patient')) {
    // patient 本人操作：actor.id 即 patientId（E2E 中自签 sub 与 patientId 对齐）
    if (actor.id === patientId) return;
    throw new ConciergeError(403, '患者只能操作本人预入院');
  }
  if (roles.includes('family')) {
    const key = `${patientId}|${actor.id}`;
    const auth = authorizations.get(key);
    if (!auth || !auth.scope.includes(scope)) {
      throw new ConciergeError(403, `家属 ${actor.id} 对患者 ${patientId} 无 ${scope} 代办授权`);
    }
    return;
  }
  throw new ConciergeError(403, '无权限');
}

// ---------- 1) 预入院 + 报到 ----------
export interface PreInput { patientId: string; scheduledAdmissionAt: number; department: string; expectedStayDays: number; roles: string[]; actorId: string; }
export function createPreAdmission(input: PreInput): PreAdmission {
  assertAccess({ roles: input.roles, id: input.actorId }, input.patientId, 'pre-admission');
  if (!input.patientId) throw new ConciergeError(400, 'patientId 必填');
  if (!input.scheduledAdmissionAt) throw new ConciergeError(400, 'scheduledAdmissionAt 必填');
  seq += 1;
  const p: PreAdmission = {
    preAdmissionId: `PA-${String(seq).padStart(4, '0')}`,
    patientId: input.patientId,
    scheduledAdmissionAt: input.scheduledAdmissionAt,
    department: input.department,
    expectedStayDays: input.expectedStayDays,
    status: 'pre-admitted',
    createdAt: Date.now(),
  };
  preAdmissions.set(p.preAdmissionId, p);
  checklist.set(p.preAdmissionId, DEFAULT_CHECKLIST.map((label, i) => ({
    itemId: `${p.preAdmissionId}-C${i + 1}`, preAdmissionId: p.preAdmissionId, label, state: 'pending',
  })));
  educationPushes.set(p.preAdmissionId, []);
  return p;
}

export function checkIn(preAdmissionId: string, roles: string[], now: number): PreAdmission {
  if (!roles.includes('nurse') && !roles.includes('admin')) {
    throw new ConciergeError(403, '到院报到需护士站确认');
  }
  const p = mustPre(preAdmissionId);
  if (p.status === 'checked-in') throw new ConciergeError(409, '该预入院单已报到（重复报到）');
  // 过期超过 7 天
  if (p.scheduledAdmissionAt < now - 7 * 24 * 3600_000) {
    throw new ConciergeError(400, '预约入院时间已过期超过 7 天，需重新预约');
  }
  p.status = 'checked-in';
  p.checkedInAt = now;
  return p;
}

// ---------- 2) 清单 ----------
export function getChecklist(preAdmissionId: string): ChecklistItem[] {
  mustPre(preAdmissionId);
  return checklist.get(preAdmissionId) ?? [];
}

export function toggleItem(preAdmissionId: string, itemId: string, state: 'done' | 'skipped', roles: string[], actorId: string): ChecklistItem {
  const p = mustPre(preAdmissionId);
  assertAccess({ roles, id: actorId }, p.patientId, 'checklist');
  const items = checklist.get(preAdmissionId) ?? [];
  const item = items.find((i) => i.itemId === itemId);
  if (!item) throw new ConciergeError(404, `清单项不存在：${itemId}`);
  if (item.state === state) return item; // 幂等
  item.state = state;
  return item;
}

// ---------- 3) 宣教 ----------
export interface EduInput { preAdmissionId: string; topic: string; content: string; pushChannel: 'sms' | 'wechat' | 'app'; roles: string[]; actorId: string; }
export function pushEducation(input: EduInput): EducationPush {
  const p = mustPre(input.preAdmissionId);
  // 护士可主动推送；患者/家属本人也可请求推送
  if (!input.roles.includes('nurse') && !input.roles.includes('admin')) {
    assertAccess({ roles: input.roles, id: input.actorId }, p.patientId, 'education');
  }
  seq += 1;
  const push: EducationPush = {
    pushId: `EDU-${String(seq).padStart(4, '0')}`,
    preAdmissionId: input.preAdmissionId,
    topic: input.topic, content: input.content, pushChannel: input.pushChannel,
    pushedAt: Date.now(), pushedBy: input.actorId,
  };
  educationPushes.get(input.preAdmissionId)?.push(push);
  return push;
}

export function listEducation(preAdmissionId: string): EducationPush[] {
  mustPre(preAdmissionId);
  return educationPushes.get(preAdmissionId) ?? [];
}

// ---------- 4) 检查检验预约 ----------
export function listSlots(examType: string): number[] {
  if (!['ct', 'mri', 'xray', 'ultrasound', 'lab'].includes(examType)) {
    throw new ConciergeError(400, `非法 examType：${examType}`);
  }
  return availableSlots(examType);
}

export interface BookInput { preAdmissionId: string; examType: string; slotTime: number; department: string; roles: string[]; actorId: string; }
export function bookExam(input: BookInput): ExamBooking {
  const p = mustPre(input.preAdmissionId);
  assertAccess({ roles: input.roles, id: input.actorId }, p.patientId, 'pre-admission');
  if (!['ct', 'mri', 'xray', 'ultrasound', 'lab'].includes(input.examType)) {
    throw new ConciergeError(400, `非法 examType：${input.examType}`);
  }
  const slots = availableSlots(input.examType);
  if (!slots.includes(input.slotTime)) throw new ConciergeError(400, '所选时段不在开放排班表内');
  const dup = bookings.find((b) => b.patientId === p.patientId && b.examType === input.examType && b.slotTime === input.slotTime);
  if (dup) throw new ConciergeError(409, `该时段 ${input.examType} 已被本人预约（重复预约）`);
  seq += 1;
  const b: ExamBooking = {
    bookingId: `BK-${String(seq).padStart(4, '0')}`,
    preAdmissionId: p.preAdmissionId, patientId: p.patientId,
    examType: input.examType, slotTime: input.slotTime, department: input.department,
  };
  bookings.push(b);
  return b;
}

// ---------- 5) 家属授权 ----------
export interface AuthInput { patientId: string; familyMemberId: string; familyMemberName: string; scope: string[]; roles: string[]; actorId: string; }
export function grantAuthorization(input: AuthInput): Authorization {
  if (!input.roles.includes('admin') && input.actorId !== input.patientId) {
    // 只能患者本人或 admin 授权
    throw new ConciergeError(403, '仅患者本人或管理员可授权家属代办');
  }
  if (!input.patientId || !input.familyMemberId) throw new ConciergeError(400, 'patientId/familyMemberId 必填');
  const key = `${input.patientId}|${input.familyMemberId}`;
  const a: Authorization = {
    patientId: input.patientId, familyMemberId: input.familyMemberId,
    familyMemberName: input.familyMemberName, scope: input.scope, grantedAt: Date.now(),
  };
  authorizations.set(key, a);
  return a;
}

export function __resetStore(): void {
  preAdmissions.clear(); checklist.clear(); educationPushes.clear();
  bookings.length = 0; authorizations.clear(); seq = 0;
}
