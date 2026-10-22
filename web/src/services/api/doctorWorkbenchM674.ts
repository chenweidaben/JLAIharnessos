/**
 * 健澜科技 jlmedaios - 医生站工作台 API（M674）
 *
 * 对接 BFF：GET /api/v1/doctor/workbench（DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TodoKind = 'orders_review' | 'notes_write' | 'lab_review' | 'rounds';

export interface DoctorTodo {
  id: string;
  kind: TodoKind;
  title: string;
  patientId: string;
  dueAt: string;
  urgent: boolean;
}

export interface DoctorWorkbench {
  doctor: string;
  dept: string;
  todo: DoctorTodo[];
}

export const TODO_KIND_META: Record<TodoKind, { label: string; color: string }> = {
  orders_review: { label: '待审医嘱', color: 'orange' },
  notes_write: { label: '待写病历', color: 'blue' },
  lab_review: { label: '待看检验', color: 'purple' },
  rounds: { label: '待查房', color: 'green' },
};

const DEMO: DoctorWorkbench = {
  doctor: '王主任',
  dept: '呼吸科',
  todo: [
    { id: 'T-001', kind: 'orders_review', title: 'P10005 新医嘱审核（4 条）', patientId: 'P10005', dueAt: '今日 11:00 前', urgent: true },
    { id: 'T-002', kind: 'notes_write', title: 'P10001 首次病程（8h 内）', patientId: 'P10001', dueAt: '今日 14:00 前', urgent: true },
    { id: 'T-003', kind: 'lab_review', title: 'P10002 急查血气', patientId: 'P10002', dueAt: '今日 09:30', urgent: false },
    { id: 'T-004', kind: 'rounds', title: '呼吸科早查房（28 床）', patientId: '—', dueAt: '今日 08:30', urgent: false },
    { id: 'T-005', kind: 'notes_write', title: 'P10011 出院小结', patientId: 'P10011', dueAt: '今日 16:00 前', urgent: false },
  ],
};

export interface WorkbenchResult {
  data: DoctorWorkbench;
  demo: boolean;
}

export async function fetchDoctorWorkbench(): Promise<WorkbenchResult> {
  try {
    const res = await get<DoctorWorkbench>('/doctor/workbench');
    return { data: res, demo: false };
  } catch {
    return { data: DEMO, demo: true };
  }
}
