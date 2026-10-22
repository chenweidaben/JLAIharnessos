/**
 * 健澜科技 jlmedaios - 住院预约管理 API（M720）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type InpatientApptStatus = 'waiting' | 'admitted' | 'cancelled';
export type Priority = 'routine' | 'urgent' | 'critical';

export interface InpatientAppointment {
  id: string;
  apptNo: string;
  patientId: string;
  dept: string;
  bedType: string;
  expectedAdmitAt: string;
  status: InpatientApptStatus;
  priority: Priority;
  reason: string;
  summary: string;
}

export const INPATIENT_APPT_STATUS_META: Record<InpatientApptStatus, { label: string; color: string }> = {
  waiting: { label: '等待入院', color: 'orange' },
  admitted: { label: '已入院', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  routine: { label: '常规', color: 'default' },
  urgent: { label: '紧急', color: 'orange' },
  critical: { label: '危重', color: 'red' },
};

const DEMO: InpatientAppointment[] = [
  {
    id: 'IA-001',
    apptNo: 'IA-261001',
    patientId: 'P10005',
    dept: '呼吸内科',
    bedType: '普通三人间',
    expectedAdmitAt: '2026-10-25',
    status: 'waiting',
    priority: 'routine',
    reason: '社区获得性肺炎需住院抗感染治疗。',
    summary: '老年男性，反复发热 5 天，CT 右下肺实变，WBC 12×10^9/L。',
  },
  {
    id: 'IA-002',
    apptNo: 'IA-261002',
    patientId: 'P10011',
    dept: 'ICU',
    bedType: 'ICU 监护床',
    expectedAdmitAt: '2026-10-22',
    status: 'admitted',
    priority: 'critical',
    reason: '重症肺炎合并 ARDS。',
    summary: '气管插管机械通气中，需 ICU 密切监护。',
  },
];

export interface InpatientApptListResult {
  items: InpatientAppointment[];
  demo: boolean;
}

export async function fetchInpatientAppointments(): Promise<InpatientApptListResult> {
  try {
    const res = await get<{ items: InpatientAppointment[] }>('/patient-service/inpatient-appointments');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
