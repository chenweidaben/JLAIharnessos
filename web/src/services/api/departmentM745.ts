/**
 * 健澜科技 jlmedaios - 科室管理 API（M745）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DeptStatus = 'active' | 'closed';

export interface Department {
  id: string;
  code: string;
  name: string;
  type: string;
  parent: string;
  status: DeptStatus;
  staffing: { position: string; headcount: number }[];
  beds: number;
}

export const DEPT_STATUS_META: Record<DeptStatus, { label: string; color: string }> = {
  active: { label: '启用', color: 'green' },
  closed: { label: '已关闭', color: 'red' },
};

const DEMO: Department[] = [
  {
    id: 'DP-001',
    code: 'DEPT-NEURO',
    name: '神经内科',
    type: '临床科室',
    parent: '医疗副院长',
    status: 'active',
    staffing: [
      { position: '主任医师', headcount: 3 },
      { position: '主治医师', headcount: 12 },
      { position: '护士', headcount: 28 },
    ],
    beds: 60,
  },
];

export interface DeptListResult {
  items: Department[];
  demo: boolean;
}

export async function fetchDepartments(): Promise<DeptListResult> {
  try {
    const res = await get<{ items: Department[] }>('/system/departments');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
