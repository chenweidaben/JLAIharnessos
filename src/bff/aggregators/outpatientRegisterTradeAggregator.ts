/**
 * 健澜AI原生医院操作系统OS - P0-1 门诊挂号交易闭环聚合器
 *
 * 号源预占 / 释放 / 挂号 / 退号申请 / 退号审批 / 叫号状态机。
 * DEMO_MODE 下纯内存台账，不连 PostgreSQL；生产落地时以 repo 调用替换本文件内
 * 三个 Map 读写点（已在每个写方法注释标 TODO-prod）。
 *
 * 金额一律整数分（*Cents 字段）；状态机非法跃迁一律 409。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class OutpatientRegisterTradeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** 号源记录：记录该号源当前被哪个预占占用 */
export interface SlotRecord {
  slotId: string;
  activeReservationId: string | null;
}

/** 号源预占记录 */
export interface ReservationRecord {
  reservationId: string;
  slotId: string;
  patientId: string;
  patientName: string;
  createdAt: number; // epoch ms
  expiresAt: number;  // epoch ms
  consumed: boolean;
}

export type RegistrationStatus =
  | 'registered'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'skipped'
  | 'cancel_requested'
  | 'cancelled';

/** 挂号记录 */
export interface RegistrationRecord {
  regNo: string;
  reservationId: string;
  slotId: string;
  patientId: string;
  patientName: string;
  feeCents: number;
  paymentMethod?: string;
  status: RegistrationStatus;
  refundCents?: number;
  cancelReason?: string;
  cancelRequestedAt?: number;
  approverNote?: string;
  approved?: boolean;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_TTL_SECONDS = 900;

// 内存台账（TODO-prod: 替换为 repositories/outpatientRegisterRepo 调 PostgreSQL）
const slots = new Map<string, SlotRecord>();
const reservations = new Map<string, ReservationRecord>();
const registrations = new Map<string, RegistrationRecord>();

let reservationSeq = 0;
let regSeq = 0;

/** 惰性过期清理：把已过期且未被消耗的预占释放，并把号源指针归位。 */
function sweepExpired(now: number): void {
  for (const [rid, r] of reservations) {
    if (!r.consumed && r.expiresAt <= now) {
      const slot = slots.get(r.slotId);
      if (slot && slot.activeReservationId === rid) {
        slot.activeReservationId = null;
      }
      reservations.delete(rid);
    }
  }
}

/**
 * 号源预占。同一 slotId 存在未过期预占 → 409；成功返回 reservationId 与过期时间。
 * ttlSeconds 默认 900 秒；过期后由 sweepExpired 惰性释放（超时释放语义）。
 */
export function reserveSlot(input: {
  slotId: string;
  patientId: string;
  patientName: string;
  ttlSeconds?: number;
  now?: number;
}): { reservationId: string; slotId: string; expiresAt: string; remaining: number } {
  const now = input.now ?? Date.now();
  if (!input.slotId) throw new OutpatientRegisterTradeError(400, 'slotId 必填');
  if (!input.patientId) throw new OutpatientRegisterTradeError(400, 'patientId 必填');
  if (!input.patientName) throw new OutpatientRegisterTradeError(400, 'patientName 必填');

  sweepExpired(now);

  const slot = slots.get(input.slotId);
  if (slot && slot.activeReservationId) {
    throw new OutpatientRegisterTradeError(409, '号源已被占用');
  }

  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new OutpatientRegisterTradeError(400, 'ttlSeconds 必须为正整数秒');
  }
  const reservationId = `RSV-${++reservationSeq}`;
  const expiresAt = now + ttl * 1000;
  const rec: ReservationRecord = {
    reservationId,
    slotId: input.slotId,
    patientId: input.patientId,
    patientName: input.patientName,
    createdAt: now,
    expiresAt,
    consumed: false,
  };
  reservations.set(reservationId, rec);
  slots.set(input.slotId, { slotId: input.slotId, activeReservationId: reservationId });

  return {
    reservationId,
    slotId: input.slotId,
    expiresAt: new Date(expiresAt).toISOString(),
    remaining: ttl,
  };
}

/** 主动释放预占。不存在 → 404；已过期 → 409；已消耗 → 409。 */
export function releaseSlot(reservationId: string, nowIn?: number): { ok: true; releasedReservationId: string } {
  const now = nowIn ?? Date.now();
  sweepExpired(now);
  const r = reservations.get(reservationId);
  if (!r) throw new OutpatientRegisterTradeError(404, '预占不存在');
  if (r.expiresAt <= now) throw new OutpatientRegisterTradeError(409, '预占已过期');
  if (r.consumed) throw new OutpatientRegisterTradeError(409, '预占已被消耗');
  const slot = slots.get(r.slotId);
  if (slot && slot.activeReservationId === reservationId) {
    slot.activeReservationId = null;
  }
  reservations.delete(reservationId);
  return { ok: true, releasedReservationId: reservationId };
}

/** 正式挂号：消耗预占，生成挂号记录。feeCents 必须为非负整数分。 */
export function register(input: {
  reservationId: string;
  feeCents: number;
  paymentMethod?: string;
  now?: number;
}): RegistrationRecord {
  const now = input.now ?? Date.now();
  sweepExpired(now);
  const r = reservations.get(input.reservationId);
  if (!r || r.consumed || r.expiresAt <= now) {
    throw new OutpatientRegisterTradeError(409, '预占无效或已过期');
  }
  if (!Number.isInteger(input.feeCents) || input.feeCents < 0) {
    throw new OutpatientRegisterTradeError(400, '金额必须为整数分');
  }
  r.consumed = true;
  const regNo = `RG-T-${++regSeq}`;
  const rec: RegistrationRecord = {
    regNo,
    reservationId: r.reservationId,
    slotId: r.slotId,
    patientId: r.patientId,
    patientName: r.patientName,
    feeCents: input.feeCents,
    paymentMethod: input.paymentMethod,
    status: 'registered',
    createdAt: now,
    updatedAt: now,
  };
  registrations.set(regNo, rec);
  return rec;
}

/** 退号申请：仅 registered / called 状态可申请。 */
export function requestCancel(input: { regNo: string; reason: string; now?: number }): RegistrationRecord {
  const now = input.now ?? Date.now();
  const rec = registrations.get(input.regNo);
  if (!rec) throw new OutpatientRegisterTradeError(404, '挂号记录不存在');
  if (!input.reason) throw new OutpatientRegisterTradeError(400, '退号原因必填');
  if (rec.status !== 'registered' && rec.status !== 'called') {
    throw new OutpatientRegisterTradeError(409, '当前状态不可退号');
  }
  rec.status = 'cancel_requested';
  rec.cancelReason = input.reason;
  rec.cancelRequestedAt = now;
  rec.updatedAt = now;
  return rec;
}

/** 退号审批：仅 cancel_requested 状态可审批。通过 → cancelled 全额退；驳回 → 回 registered。 */
export function approveCancel(input: {
  regNo: string;
  approved: boolean;
  approverNote?: string;
  now?: number;
}): RegistrationRecord {
  const now = input.now ?? Date.now();
  const rec = registrations.get(input.regNo);
  if (!rec) throw new OutpatientRegisterTradeError(404, '挂号记录不存在');
  if (rec.status !== 'cancel_requested') {
    throw new OutpatientRegisterTradeError(409, '当前状态不可审批');
  }
  rec.approverNote = input.approverNote;
  rec.approved = input.approved;
  if (input.approved) {
    rec.status = 'cancelled';
    rec.refundCents = rec.feeCents; // 全额退，整数分
  } else {
    rec.status = 'registered';
  }
  rec.updatedAt = now;
  return rec;
}

/** 叫号状态机合法跃迁表 */
const TRANSITIONS: Record<string, { from: RegistrationStatus[]; to: RegistrationStatus }> = {
  call:   { from: ['registered'], to: 'called' },
  start:  { from: ['called'], to: 'in_consultation' },
  complete: { from: ['in_consultation'], to: 'completed' },
  skip:   { from: ['registered', 'called'], to: 'skipped' },
};

/** 叫号状态机：非法动作或非法跃迁一律 409。 */
export function transition(input: { regNo: string; action: string; now?: number }): RegistrationRecord {
  const now = input.now ?? Date.now();
  const rec = registrations.get(input.regNo);
  if (!rec) throw new OutpatientRegisterTradeError(404, '挂号记录不存在');
  const t = TRANSITIONS[input.action];
  if (!t) throw new OutpatientRegisterTradeError(400, '非法动作');
  if (!t.from.includes(rec.status)) {
    throw new OutpatientRegisterTradeError(409, '非法状态跃迁');
  }
  rec.status = t.to;
  rec.updatedAt = now;
  return rec;
}

/** 按状态分组返回候诊队列。waiting 组即 registered（待叫号）。 */
export function listQueue(now?: number): {
  waiting: RegistrationRecord[];
  called: RegistrationRecord[];
  in_consultation: RegistrationRecord[];
  completed: RegistrationRecord[];
  skipped: RegistrationRecord[];
  cancel_requested: RegistrationRecord[];
  cancelled: RegistrationRecord[];
} {
  sweepExpired(now ?? Date.now());
  const groups = {
    waiting: [] as RegistrationRecord[],
    called: [] as RegistrationRecord[],
    in_consultation: [] as RegistrationRecord[],
    completed: [] as RegistrationRecord[],
    skipped: [] as RegistrationRecord[],
    cancel_requested: [] as RegistrationRecord[],
    cancelled: [] as RegistrationRecord[],
  };
  for (const rec of registrations.values()) {
    if (rec.status === 'registered') groups.waiting.push(rec);
    else if (rec.status in groups) (groups as unknown as Record<string, RegistrationRecord[]>)[rec.status].push(rec);
  }
  return groups;
}

/** 全量挂号记录（窗口查询）。 */
export function listRegistrations(): RegistrationRecord[] {
  return Array.from(registrations.values());
}

/** 单测隔离：清空全部内存台账与序号。 */
export function __resetStore(): void {
  slots.clear();
  reservations.clear();
  registrations.clear();
  reservationSeq = 0;
  regSeq = 0;
}
