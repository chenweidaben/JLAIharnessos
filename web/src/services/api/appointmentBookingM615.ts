/**
 * 健澜科技 jlmedaios - 预约挂号 API（M615，P11 智慧服务）
 *
 * 对接真实 BFF（m586）：GET /api/v1/appointments（列表）+ POST /api/v1/appointments
 *   body: patientId/doctorId/deptCode/appointmentDate/timeSlot/visitType/source
 *   同 patient+doctor+date+slot 已 booked → 409 already_booked
 * GET /appointments/slots 未注册，本地按号源日历 DEMO 兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface AppointmentRecord {
  id: string;
  patientId: string;
  doctorId: string;
  deptCode: string;
  appointmentDate: string;
  timeSlot: string;
  visitType: 'outpatient' | 'followup' | 'expert';
  source: 'patient_portal' | 'wechat' | 'window';
  status: 'booked' | 'checkedIn' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface SlotItem {
  doctorId: string;
  doctorName: string;
  deptCode: string;
  date: string;
  timeSlot: string;
  remain: number;
}

export interface AppointmentCreateInput {
  patientId: string;
  doctorId: string;
  deptCode: string;
  appointmentDate: string;
  timeSlot: string;
  visitType: AppointmentRecord['visitType'];
  source: AppointmentRecord['source'];
}

const DEMO_SLOTS: SlotItem[] = [
  { doctorId: 'DR-001', doctorName: '王主任', deptCode: 'DEPT-INT', date: '', timeSlot: '08:00-09:00', remain: 5 },
  { doctorId: 'DR-001', doctorName: '王主任', deptCode: 'DEPT-INT', date: '', timeSlot: '09:00-10:00', remain: 3 },
  { doctorId: 'DR-002', doctorName: '李医生', deptCode: 'DEPT-SURG', date: '', timeSlot: '10:00-11:00', remain: 8 },
  { doctorId: 'DR-003', doctorName: '陈医生', deptCode: 'DEPT-PED', date: '', timeSlot: '14:00-15:00', remain: 0 },
];

export interface AppointmentListResult {
  items: AppointmentRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAppointments(patientId: string): Promise<AppointmentListResult> {
  try {
    const res = await get<{ items: AppointmentRecord[]; totalCount: number }>('/appointments', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: [], totalCount: 0, demo: true };
  }
}

export async function fetchSlots(date: string): Promise<SlotItem[]> {
  try {
    return await get<SlotItem[]>('/appointments/slots', { date });
  } catch {
    return DEMO_SLOTS.map((s) => ({ ...s, date }));
  }
}

/** 预约：409 already_booked 由 store 透传给页面 message */
export async function createAppointment(input: AppointmentCreateInput): Promise<AppointmentRecord> {
  return post<AppointmentRecord>('/appointments', input);
}
