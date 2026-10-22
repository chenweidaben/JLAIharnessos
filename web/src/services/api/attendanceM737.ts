/**
 * 健澜科技 jlmedaios - 考勤管理 API（M737）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AttendanceStatus = 'normal' | 'late' | 'early' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string;
  employee: string;
  dept: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  leaves: { type: string; days: number; reason: string }[];
  overtime: { date: string; hours: number; reason: string }[];
}

export const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  late: { label: '迟到', color: 'orange' },
  early: { label: '早退', color: 'orange' },
  absent: { label: '旷工', color: 'red' },
  leave: { label: '请假', color: 'blue' },
};

const DEMO: AttendanceRecord[] = [
  {
    id: 'AT-001',
    employee: '陈维',
    dept: '信息科',
    date: '2026-10-22',
    clockIn: '08:32',
    clockOut: '18:10',
    status: 'late',
    leaves: [
      { type: '年休假', days: 1, reason: '家事（10-21 已休）' },
    ],
    overtime: [
      { date: '2026-10-20', hours: 3, reason: 'M698-M702 前端收口联调' },
    ],
  },
];

export interface AttendanceListResult {
  items: AttendanceRecord[];
  demo: boolean;
}

export async function fetchAttendance(): Promise<AttendanceListResult> {
  try {
    const res = await get<{ items: AttendanceRecord[] }>('/hr/attendance');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
