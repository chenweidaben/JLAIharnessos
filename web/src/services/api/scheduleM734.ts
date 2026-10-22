/**
 * 健澜科技 jlmedaios - 排班管理 API（M734）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ShiftType = 'day' | 'swing' | 'night';
export type ScheduleStatus = 'draft' | 'published' | 'effective';

export interface Schedule {
  id: string;
  dept: string;
  date: string;
  shift: ShiftType;
  headcount: number;
  status: ScheduleStatus;
  personnel: string[];
  shiftTime: string;
  swaps: { date: string; from: string; to: string; reason: string }[];
}

export const SHIFT_META: Record<ShiftType, { label: string; color: string }> = {
  day: { label: '白班', color: 'blue' },
  swing: { label: '小夜', color: 'orange' },
  night: { label: '大夜', color: 'purple' },
};

export const SCHEDULE_STATUS_META: Record<ScheduleStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'blue' },
  effective: { label: '执行中', color: 'green' },
};

const DEMO: Schedule[] = [
  {
    id: 'SH-001',
    dept: '普外科病房',
    date: '2026-10-23',
    shift: 'day',
    headcount: 8,
    status: 'published',
    personnel: ['王护士长', '李护士', '周护士', '陈护士', '刘护士', '张护士', '赵护士', '孙护士'],
    shiftTime: '08:00-16:00',
    swaps: [
      { date: '2026-10-23', from: '李护士', to: '陈护士', reason: '李护士家事换班' },
    ],
  },
];

export interface ScheduleListResult {
  items: Schedule[];
  demo: boolean;
}

export async function fetchSchedules(): Promise<ScheduleListResult> {
  try {
    const res = await get<{ items: Schedule[] }>('/hr/schedules');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
