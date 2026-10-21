/**
 * 健澜科技 jlmedaios - 排班日历 API（M614，P0）
 *
 * 对接真实 BFF（m602Routes）：
 *   GET /api/v1/scheduling/shifts?deptCode=&date=   班次列表（ShiftRecord[]）
 *   GET /api/v1/scheduling/coverage                 覆盖率（{deptCode,expected,actual,gap,rate}[]）
 *
 * GET 类失败降级本地 DEMO 镜像并打标 demo:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import dayjs from 'dayjs';

import { get } from '../request';

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'on_call';
export type StaffRole = 'doctor' | 'nurse' | 'technician';

export interface ShiftRecord {
  id: string;
  staffId: string;
  staffName: string;
  deptCode: string;
  shiftDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  role: StaffRole;
  createdAt: string;
}

export interface CoverageRow {
  deptCode: string;
  expected: number;
  actual: number;
  gap: number;
  rate: number;
}

export const SHIFT_TYPE_META: Record<ShiftType, { label: string; color: string }> = {
  morning: { label: '早班', color: 'gold' },
  afternoon: { label: '中班', color: 'blue' },
  night: { label: '夜班', color: 'purple' },
  on_call: { label: '值班', color: 'cyan' },
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  doctor: '医师',
  nurse: '护士',
  technician: '技师',
};

function seedDemo(): ShiftRecord[] {
  const types: ShiftType[] = ['morning', 'afternoon', 'night', 'on_call'];
  const depts = ['DEPT-INT', 'DEPT-SURG', 'DEPT-PED'];
  const names = ['张伟', '李娜', '王强', '刘洋', '陈静'];
  const out: ShiftRecord[] = [];
  for (let d = -6; d <= 6; d += 1) {
    for (let i = 0; i < 4; i += 1) {
      out.push({
        id: `DEMO-${d}-${i}`,
        staffId: `STF-${i + 1}`,
        staffName: names[i % names.length],
        deptCode: depts[i % depts.length],
        shiftDate: dayjs().add(d, 'day').format('YYYY-MM-DD'),
        shiftType: types[i],
        startTime: ['08:00', '16:00', '00:00', '00:00'][i],
        endTime: ['16:00', '00:00', '08:00', '24:00'][i],
        role: (['doctor', 'nurse', 'nurse', 'technician'] as StaffRole[])[i],
        createdAt: new Date().toISOString(),
      });
    }
  }
  return out;
}

const DEMO_SHIFTS = seedDemo();

const DEMO_COVERAGE: CoverageRow[] = [
  { deptCode: 'DEPT-INT', expected: 10, actual: 9, gap: 1, rate: 90 },
  { deptCode: 'DEPT-SURG', expected: 10, actual: 10, gap: 0, rate: 100 },
  { deptCode: 'DEPT-PED', expected: 6, actual: 4, gap: 2, rate: 66.7 },
];

export interface ShiftListResult {
  items: ShiftRecord[];
  totalCount: number;
  demo: boolean;
}

export interface CoverageResult {
  items: CoverageRow[];
  totalCount: number;
  demo: boolean;
}

export async function fetchShifts(params?: { deptCode?: string; date?: string }): Promise<ShiftListResult> {
  try {
    const res = await get<{ items: ShiftRecord[]; totalCount: number }>('/scheduling/shifts', params);
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_SHIFTS, totalCount: DEMO_SHIFTS.length, demo: true };
  }
}

export async function fetchCoverage(): Promise<CoverageResult> {
  try {
    const res = await get<{ items: CoverageRow[]; totalCount: number }>('/scheduling/coverage');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_COVERAGE, totalCount: DEMO_COVERAGE.length, demo: true };
  }
}
