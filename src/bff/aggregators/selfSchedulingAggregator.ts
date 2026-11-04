/**
 * 健澜AI原生医院操作系统OS - P3-3 号源池 + 患者自助预约挂号
 *
 * - Slot：科室/医生/日期/时段，capacity/booked 实时占用
 * - Booking：患者预约/取消，取消释放 slot.booked
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class SlotError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const TIME_SLOTS = [
  '08:00-08:30', '08:30-09:00', '09:00-09:30', '09:30-10:00', '10:00-10:30', '10:30-11:00',
  '14:00-14:30', '14:30-15:00', '15:00-15:30', '15:30-16:00',
] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const SLOT_TYPES = ['outpatient', 'checkup'] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

export const EXAM_TYPES = ['CT', 'MRI', 'US', 'ECG'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export interface Slot {
  slotId: string;
  departmentId: string;
  doctorId?: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  slotType: SlotType;
  examType?: ExamType;
  capacity: number;
  booked: number;
  status: 'open' | 'closed';
}

export interface Booking {
  bookingId: string;
  patientId: string;
  slotId: string;
  slotType: SlotType;
  departmentId: string;
  doctorId?: string;
  examType?: ExamType;
  date: string;
  timeSlot: TimeSlot;
  status: 'booked' | 'cancelled' | 'completed';
  bookedAt: string;
  cancelledAt?: string;
}

export interface Department { departmentId: string; departmentName: string; }

const slots = new Map<string, Slot>();
const bookings: Booking[] = [];
const DEPARTMENTS: Department[] = [
  { departmentId: 'cardiology', departmentName: '心血管内科' },
  { departmentId: 'respiratory', departmentName: '呼吸内科' },
  { departmentId: 'neurology', departmentName: '神经内科' },
  { departmentId: 'gastroenterology', departmentName: '消化内科' },
  { departmentId: 'infectious', departmentName: '感染科' },
  { departmentId: 'dermatology', departmentName: '皮肤科' },
  { departmentId: 'orthopedics', departmentName: '骨科' },
  { departmentId: 'ophthalmology', departmentName: '眼科' },
  { departmentId: 'checkup-center', departmentName: '检查中心' },
];
let seq = 0;

function pick<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw new SlotError(400, `${label} 非法：${String(v)}`);
  return v as T;
}

// ---------- Slots ----------
export function listSlots(q: { departmentId?: string; date?: string; slotType?: string }): Slot[] {
  let arr = [...slots.values()];
  if (q.departmentId) arr = arr.filter((s) => s.departmentId === q.departmentId);
  if (q.date) arr = arr.filter((s) => s.date === q.date);
  if (q.slotType) arr = arr.filter((s) => s.slotType === pick(q.slotType, SLOT_TYPES, 'slotType'));
  return arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.timeSlot.localeCompare(b.timeSlot)));
}

export function seedSlots(items: Array<Omit<Slot, 'slotId' | 'booked' | 'status'>>): Slot[] {
  const out: Slot[] = [];
  for (const it of items) {
    if (!TIME_SLOTS.includes(it.timeSlot)) throw new SlotError(400, `timeSlot 非法：${it.timeSlot}`);
    if (!SLOT_TYPES.includes(it.slotType)) throw new SlotError(400, `slotType 非法：${it.slotType}`);
    seq += 1;
    const s: Slot = { ...it, slotId: `SL-${String(seq).padStart(5, '0')}`, booked: 0, status: 'open' };
    slots.set(s.slotId, s);
    out.push(s);
  }
  return out;
}

function getSlot(slotId: string): Slot {
  const s = slots.get(slotId);
  if (!s) throw new SlotError(404, `号源不存在：${slotId}`);
  return s;
}

// ---------- Bookings ----------
export function createBooking(patientId: string, slotId: string): Booking {
  if (!patientId) throw new SlotError(400, 'patientId 必填');
  if (!slotId) throw new SlotError(400, 'slotId 必填');
  const slot = getSlot(slotId);
  if (slot.status === 'closed') throw new SlotError(409, '号源已关闭');
  if (slot.booked >= slot.capacity) throw new SlotError(409, '号源已满');
  // 同 patient 同 slot 重复预约
  if (bookings.some((b) => b.patientId === patientId && b.slotId === slotId && b.status === 'booked')) {
    throw new SlotError(409, '已预约该时段，重复预约');
  }
  seq += 1;
  const b: Booking = {
    bookingId: `BK-${String(seq).padStart(5, '0')}`,
    patientId, slotId: slot.slotId, slotType: slot.slotType,
    departmentId: slot.departmentId, doctorId: slot.doctorId, examType: slot.examType,
    date: slot.date, timeSlot: slot.timeSlot,
    status: 'booked', bookedAt: new Date().toISOString(),
  };
  bookings.push(b);
  slot.booked += 1;
  if (slot.booked >= slot.capacity) slot.status = 'closed';
  return b;
}

export function listBookings(patientId?: string): Booking[] {
  let arr = [...bookings];
  if (patientId) arr = arr.filter((b) => b.patientId === patientId);
  return arr.sort((a, b) => (a.bookedAt < b.bookedAt ? 1 : -1));
}

export function cancelBooking(patientId: string, bookingId: string): Booking {
  const b = bookings.find((x) => x.bookingId === bookingId);
  if (!b) throw new SlotError(404, `预约不存在：${bookingId}`);
  if (b.patientId !== patientId) throw new SlotError(403, '只能取消自己的预约');
  if (b.status === 'cancelled') throw new SlotError(409, '预约已取消，重复取消');
  b.status = 'cancelled';
  b.cancelledAt = new Date().toISOString();
  const slot = slots.get(b.slotId);
  if (slot) {
    slot.booked = Math.max(0, slot.booked - 1);
    if (slot.booked < slot.capacity && slot.status === 'closed') slot.status = 'open';
  }
  return b;
}

export function listDepartments(): Department[] { return [...DEPARTMENTS]; }

export function __resetStore(): void { slots.clear(); bookings.length = 0; seq = 0; }
