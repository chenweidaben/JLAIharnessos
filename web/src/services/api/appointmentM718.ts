/**
 * 健澜科技 jlmedaios - 预约挂号管理 API（M718）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ApptStatus = 'booked' | 'arrived' | 'completed' | 'cancelled' | 'noshow';
export type ApptChannel = 'wechat' | 'app' | 'onsite' | 'phone';

export interface Appointment {
  id: string;
  apptNo: string;
  patientId: string;
  dept: string;
  doctor: string;
  scheduledAt: string;
  status: ApptStatus;
  channel: ApptChannel;
}

export const APPT_STATUS_META: Record<ApptStatus, { label: string; color: string }> = {
  booked: { label: '已预约', color: 'blue' },
  arrived: { label: '已到院', color: 'processing' },
  completed: { label: '已就诊', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
  noshow: { label: '爽约', color: 'red' },
};

export const APPT_CHANNEL_META: Record<ApptChannel, string> = {
  wechat: '微信公众号',
  app: '医院 APP',
  onsite: '窗口/自助机',
  phone: '电话预约',
};

const DEMO: Appointment[] = [
  {
    id: 'AP-001',
    apptNo: 'AP-26102201',
    patientId: 'P10002',
    dept: '呼吸内科',
    doctor: '陈主任',
    scheduledAt: '2026-10-23T09:00:00+08:00',
    status: 'booked',
    channel: 'wechat',
  },
  {
    id: 'AP-002',
    apptNo: 'AP-26102202',
    patientId: 'P10008',
    dept: '心内科',
    doctor: '王医师',
    scheduledAt: '2026-10-22T10:30:00+08:00',
    status: 'arrived',
    channel: 'app',
  },
];

export interface ApptListResult {
  items: Appointment[];
  demo: boolean;
}

export async function fetchAppointments(): Promise<ApptListResult> {
  try {
    const res = await get<{ items: Appointment[] }>('/patient-service/appointments');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
