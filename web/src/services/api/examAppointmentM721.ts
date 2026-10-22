/**
 * 健澜科技 jlmedaios - 检查检验预约 API（M721）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ExamStatus = 'booked' | 'arrived' | 'completed' | 'cancelled';

export interface ExamAppointment {
  id: string;
  apptNo: string;
  patientId: string;
  examItem: string;
  examAt: string;
  location: string;
  dept: string;
  status: ExamStatus;
  requirement: string;
  notes: string;
}

export const EXAM_STATUS_META: Record<ExamStatus, { label: string; color: string }> = {
  booked: { label: '已预约', color: 'blue' },
  arrived: { label: '已到检', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
};

const DEMO: ExamAppointment[] = [
  {
    id: 'EA-001',
    apptNo: 'EA-26102301',
    patientId: 'P10002',
    examItem: '胸部 CT 平扫',
    examAt: '2026-10-23T09:30:00+08:00',
    location: '影像楼 2F CT-2 室',
    dept: '放射科',
    status: 'booked',
    requirement: '检查前 4 小时禁食禁水；去除金属饰品。',
    notes: '孕妇/备孕者请提前告知。',
  },
  {
    id: 'EA-002',
    apptNo: 'EA-26102302',
    patientId: 'P10008',
    examItem: '腹部 B 超（肝胆胰脾）',
    examAt: '2026-10-23T10:00:00+08:00',
    location: '超声楼 1F US-1 室',
    dept: '超声科',
    status: 'booked',
    requirement: '检查前一日晚 10 点后禁食；当日晨空腹。',
    notes: '需憋尿者请自备温水。',
  },
];

export interface ExamApptListResult {
  items: ExamAppointment[];
  demo: boolean;
}

export async function fetchExamAppointments(): Promise<ExamApptListResult> {
  try {
    const res = await get<{ items: ExamAppointment[] }>('/patient-service/exam-appointments');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
