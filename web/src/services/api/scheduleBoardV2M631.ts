/**
 * 健澜科技 jlmedaios - 护理排班看板 v2 API（M631，P0 合规）
 *
 * 对接 BFF：GET /api/v1/nursing/schedules + GET /api/v1/nursing/staff
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ShiftType = 'day' | 'evening' | 'night';

export const SHIFT_META: Record<ShiftType, { label: string; color: string }> = {
  day: { label: '白班', color: 'blue' },
  evening: { label: '小夜', color: 'orange' },
  night: { label: '大夜', color: 'purple' },
};

export interface NursingStaff {
  staffId: string;
  name: string;
  level: string;
}

export interface ScheduleAssignment {
  staffId: string;
  shift: ShiftType;
  date: string;
}

const DEMO_STAFF: NursingStaff[] = [
  { staffId: 'N-001', name: '周敏', level: '护师' },
  { staffId: 'N-002', name: '李慧', level: '主管护师' },
  { staffId: 'N-003', name: '王芳', level: '护士' },
  { staffId: 'N-004', name: '赵雪', level: '护士' },
];

const DEMO_ASSIGNMENTS: ScheduleAssignment[] = [
  { staffId: 'N-001', shift: 'day', date: '2026-10-22' },
  { staffId: 'N-002', shift: 'evening', date: '2026-10-22' },
  { staffId: 'N-003', shift: 'night', date: '2026-10-22' },
  { staffId: 'N-001', shift: 'day', date: '2026-10-23' },
  { staffId: 'N-004', shift: 'evening', date: '2026-10-23' },
  { staffId: 'N-002', shift: 'night', date: '2026-10-23' },
];

export interface ScheduleBoardResult {
  staff: NursingStaff[];
  assignments: ScheduleAssignment[];
  demo: boolean;
}

export async function fetchScheduleBoard(): Promise<ScheduleBoardResult> {
  try {
    const [staffRes, schedRes] = await Promise.all([
      get<{ items: NursingStaff[] }>('/nursing/staff'),
      get<{ items: ScheduleAssignment[] }>('/nursing/schedules'),
    ]);
    return { staff: staffRes.items, assignments: schedRes.items, demo: false };
  } catch {
    return { staff: DEMO_STAFF, assignments: DEMO_ASSIGNMENTS, demo: true };
  }
}
