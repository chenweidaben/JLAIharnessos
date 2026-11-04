/**
 * 健澜AI原生医院操作系统OS - P1-3 手术麻醉闭环
 *
 * 状态机：draft(医生申请) → scheduled(排班定手术间+时段) → in_or(入手术间)
 * → in_progress(术中) → in_pacu(入复苏) → recovered(复苏完成) → ward_returned(回病房)。
 * 仅允许逐级前进；越级（如 draft→in_pacu）→ 409；重复同一状态 → 200 幂等。
 *
 * 手术间互斥：同 orRoom 时段重叠（start < otherEnd && end > otherStart）→ 409。
 * 角色：surgeon 建申请/推进状态、admin 排班、anesthetist 麻醉记录、nurse PACU 记录。
 * 行级 visitId-patientId 绑定复用 assertVisitPatientBinding。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { assertVisitPatientBinding } from './orderCpoeAggregator.js';

export class SurgeryWorkflowError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type SurgeryState =
  | 'draft'
  | 'scheduled'
  | 'in_or'
  | 'in_progress'
  | 'in_pacu'
  | 'recovered'
  | 'ward_returned';

export const STATE_ORDER: SurgeryState[] = [
  'draft', 'scheduled', 'in_or', 'in_progress', 'in_pacu', 'recovered', 'ward_returned',
];

export interface AnesthesiaRecord {
  vitals?: { hr?: number; sbp?: number; dbp?: number; spo2?: number };
  anesthesiaType?: string;
  drugs: string[];
  fluidsIn?: number;
  fluidsOut?: number;
  recordedBy: string;
  recordedAt: number;
}

export interface PacuNote {
  aldreteScore: number;
  consciousness: string;
  painScore: number;
  dischargedToWardAt?: number;
  recordedBy: string;
  recordedAt: number;
}

export interface SurgeryRequest {
  reqId: string;
  visitId: string;
  patientId: string;
  surgeryName: string;
  plannedStart: number;
  plannedDurationMin: number;
  surgeonId: string;
  status: SurgeryState;
  scheduledOrRoom?: string;
  scheduledStart?: number;
  scheduledEnd?: number;
  anesthesiaRecord?: AnesthesiaRecord;
  pacuNote?: PacuNote;
  createdAt: number;
}

interface RoomBooking { reqId: string; room: string; start: number; end: number; }

const requests = new Map<string, SurgeryRequest>();
const roomBookings: RoomBooking[] = [];
let reqSeq = 0;

function requireRole(roles: string[], allowed: string[], action: string): void {
  if (roles.includes('admin') && allowed.includes('admin')) return;
  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) throw new SurgeryWorkflowError(403, `${action} 需要角色：${allowed.join('/')}`);
}

export interface CreateInput {
  visitId: string;
  patientId: string;
  surgeryName: string;
  plannedStart: number;
  plannedDurationMin: number;
  surgeonId: string;
  roles: string[];
}

export function createRequest(input: CreateInput): SurgeryRequest {
  requireRole(input.roles, ['surgeon'], '创建手术申请');
  if (!input.visitId) throw new SurgeryWorkflowError(400, 'visitId 必填');
  if (!input.patientId) throw new SurgeryWorkflowError(400, 'patientId 必填');
  if (!input.surgeryName) throw new SurgeryWorkflowError(400, 'surgeryName 必填');
  if (input.plannedDurationMin < 30 || input.plannedDurationMin > 600) {
    throw new SurgeryWorkflowError(400, `plannedDurationMin ${input.plannedDurationMin} 超出 30~600 分钟`);
  }
  assertVisitPatientBinding(input.visitId, input.patientId);

  reqSeq += 1;
  const r: SurgeryRequest = {
    reqId: `SR-${String(reqSeq).padStart(4, '0')}`,
    visitId: input.visitId,
    patientId: input.patientId,
    surgeryName: input.surgeryName,
    plannedStart: input.plannedStart,
    plannedDurationMin: input.plannedDurationMin,
    surgeonId: input.surgeonId,
    status: 'draft',
    createdAt: Date.now(),
  };
  requests.set(r.reqId, r);
  return r;
}

export interface ScheduleInput {
  reqId: string;
  orRoom: string;
  scheduledStart: number;
  scheduledEnd: number;
  roles: string[];
}

export function scheduleRequest(input: ScheduleInput): SurgeryRequest {
  requireRole(input.roles, ['admin'], '手术排班');
  const r = mustGet(input.reqId);
  if (r.status !== 'draft') throw new SurgeryWorkflowError(409, `仅 draft 状态可排班，当前 ${r.status}`);
  if (input.scheduledEnd <= input.scheduledStart) {
    throw new SurgeryWorkflowError(400, 'scheduledEnd 必须晚于 scheduledStart');
  }
  // 手术间互斥
  for (const b of roomBookings) {
    if (b.room === input.orRoom && input.scheduledStart < b.end && input.scheduledEnd > b.start) {
      throw new SurgeryWorkflowError(409, `手术间 ${input.orRoom} 时段与 ${b.reqId} 重叠`);
    }
  }
  r.status = 'scheduled';
  r.scheduledOrRoom = input.orRoom;
  r.scheduledStart = input.scheduledStart;
  r.scheduledEnd = input.scheduledEnd;
  roomBookings.push({ reqId: r.reqId, room: input.orRoom, start: input.scheduledStart, end: input.scheduledEnd });
  return r;
}

export interface TransitionInput {
  reqId: string;
  toState: string;
  note?: string;
  roles: string[];
}

export function transition(input: TransitionInput): SurgeryRequest {
  requireRole(input.roles, ['surgeon', 'admin'], '推进手术状态');
  const r = mustGet(input.reqId);
  if (!STATE_ORDER.includes(input.toState as SurgeryState)) {
    throw new SurgeryWorkflowError(400, `非法 toState：${input.toState}`);
  }
  const to = input.toState as SurgeryState;
  const curIdx = STATE_ORDER.indexOf(r.status);
  const toIdx = STATE_ORDER.indexOf(to);
  if (toIdx === curIdx) return r; // 幂等
  if (toIdx !== curIdx + 1) {
    throw new SurgeryWorkflowError(409, `非法跃迁：${r.status} → ${to}（需逐级 ${STATE_ORDER[curIdx + 1]}）`);
  }
  r.status = to;
  return r;
}

export interface AnesthesiaInput {
  reqId: string;
  vitals?: { hr?: number; sbp?: number; dbp?: number; spo2?: number };
  anesthesiaType?: string;
  drugs?: string[];
  fluidsIn?: number;
  fluidsOut?: number;
  roles: string[];
  operatorId: string;
}

export function recordAnesthesia(input: AnesthesiaInput): SurgeryRequest {
  requireRole(input.roles, ['anesthetist'], '麻醉记录');
  const r = mustGet(input.reqId);
  if (r.status !== 'in_progress' && r.status !== 'in_or') {
    throw new SurgeryWorkflowError(409, `仅术中可记录麻醉，当前 ${r.status}`);
  }
  r.anesthesiaRecord = {
    vitals: input.vitals,
    anesthesiaType: input.anesthesiaType,
    drugs: input.drugs ?? [],
    fluidsIn: input.fluidsIn,
    fluidsOut: input.fluidsOut,
    recordedBy: input.operatorId,
    recordedAt: Date.now(),
  };
  return r;
}

export interface PacuInput {
  reqId: string;
  aldreteScore: number;
  consciousness: string;
  painScore: number;
  dischargedToWardAt?: number;
  roles: string[];
  operatorId: string;
}

export function recordPacu(input: PacuInput): SurgeryRequest {
  requireRole(input.roles, ['nurse'], 'PACU 复苏记录');
  const r = mustGet(input.reqId);
  if (r.status !== 'in_pacu' && r.status !== 'recovered') {
    throw new SurgeryWorkflowError(409, `仅 PACU 阶段可记录复苏，当前 ${r.status}`);
  }
  if (input.aldreteScore < 0 || input.aldreteScore > 10) {
    throw new SurgeryWorkflowError(400, `aldreteScore ${input.aldreteScore} 超出 0~10`);
  }
  if (input.painScore < 0 || input.painScore > 10) {
    throw new SurgeryWorkflowError(400, `painScore ${input.painScore} 超出 0~10`);
  }
  r.pacuNote = {
    aldreteScore: input.aldreteScore,
    consciousness: input.consciousness,
    painScore: input.painScore,
    dischargedToWardAt: input.dischargedToWardAt,
    recordedBy: input.operatorId,
    recordedAt: Date.now(),
  };
  return r;
}

export function listRequests(visitId?: string): SurgeryRequest[] {
  const all = Array.from(requests.values());
  const filtered = visitId ? all.filter((r) => r.visitId === visitId) : all;
  filtered.sort((a, b) => b.createdAt - a.createdAt);
  return filtered;
}

function mustGet(reqId: string): SurgeryRequest {
  const r = requests.get(reqId);
  if (!r) throw new SurgeryWorkflowError(404, `手术申请不存在：${reqId}`);
  return r;
}

export function __resetStore(): void {
  requests.clear();
  roomBookings.length = 0;
  reqSeq = 0;
}
