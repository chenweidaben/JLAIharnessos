/**
 * 健澜科技 jlmedaios - 员工档案管理 API（M733）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EmpStatus = 'active' | 'on_leave' | 'resigned';

export interface EmployeeRecord {
  id: string;
  empNo: string;
  name: string;
  dept: string;
  title: string;
  joinedAt: string;
  status: EmpStatus;
  basicInfo: string;
  education: { school: string; degree: string; period: string }[];
  workExperience: { org: string; role: string; period: string }[];
  titleHistory: { from: string; to: string; change: string }[];
}

export const EMP_STATUS_META: Record<EmpStatus, { label: string; color: string }> = {
  active: { label: '在职', color: 'green' },
  on_leave: { label: '休假/借调', color: 'orange' },
  resigned: { label: '离职', color: 'red' },
};

const DEMO: EmployeeRecord[] = [
  {
    id: 'EMP-001',
    empNo: 'GH-10086',
    name: '陈维',
    dept: '信息科',
    title: '高级工程师',
    joinedAt: '2018-07-01',
    status: 'active',
    basicInfo: '男，1977 年生，本科计算机科学与技术。',
    education: [
      { school: '浙江大学', degree: '本科', period: '2000-2004' },
    ],
    workExperience: [
      { org: '某三甲医院信息中心', role: '系统架构师', period: '2008-2018' },
      { org: '健澜科技', role: '技术总监', period: '2018-至今' },
    ],
    titleHistory: [
      { from: '2018-07', to: '2022-12', change: '工程师' },
      { from: '2023-01', to: '至今', change: '高级工程师' },
    ],
  },
];

export interface EmployeeListResult {
  items: EmployeeRecord[];
  demo: boolean;
}

export async function fetchEmployees(): Promise<EmployeeListResult> {
  try {
    const res = await get<{ items: EmployeeRecord[] }>('/hr/employees');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
