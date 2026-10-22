/**
 * 健澜科技 jlmedaios - 护理排班 v2 API（M664，配套 M559）
 *
 * 对接 BFF：GET /api/v1/nursing/schedules
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ShiftType = 'day' | 'evening' | 'night' | 'rest';

export interface NursingSchedule {
  id: string;
  nurseId: string;
  nurseName: string;
  dept: string;
  date: string;
  shift: ShiftType;
}

export const SHIFT_META: Record<ShiftType, { label: string; color: string; time: string }> = {
  day: { label: '白班', color: 'blue', time: '08:00-16:00' },
  evening: { label: '小夜班', color: 'orange', time: '16:00-24:00' },
  night: { label: '大夜班', color: 'purple', time: '00:00-08:00' },
  rest: { label: '休息', color: 'default', time: '—' },
};

const DEMO_SCHEDULES: NursingSchedule[] = [
  { id: 'NS-001', nurseId: 'N-01', nurseName: '周敏', dept: '呼吸一病区', date: '2026-10-22', shift: 'day' },
  { id: 'NS-002', nurseId: 'N-02', nurseName: '李慧', dept: '呼吸一病区', date: '2026-10-22', shift: 'evening' },
  { id: 'NS-003', nurseId: 'N-03', nurseName: '王芳', dept: '呼吸一病区', date: '2026-10-22', shift: 'night' },
  { id: 'NS-004', nurseId: 'N-04', nurseName: '陈静', dept: '呼吸一病区', date: '2026-10-22', shift: 'rest' },
  { id: 'NS-005', nurseId: 'N-01', nurseName: '周敏', dept: '呼吸一病区', date: '2026-10-23', shift: 'evening' },
  { id: 'NS-006', nurseId: 'N-02', nurseName: '李慧', dept: '呼吸一病区', date: '2026-10-23', shift: 'night' },
];

export interface ScheduleListResult {
  items: NursingSchedule[];
  totalCount: number;
  demo: boolean;
}

export async function fetchNursingSchedules(dept: string): Promise<ScheduleListResult> {
  try {
    const res = await get<{ items: NursingSchedule[]; totalCount: number }>('/nursing/schedules', { dept });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_SCHEDULES.filter((s) => s.dept === dept), totalCount: 0, demo: true };
  }
}
