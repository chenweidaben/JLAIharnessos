/**
 * 健澜科技 jlmedaios - 护士站工作台 API（M673）
 *
 * 对接 BFF：GET /api/v1/nurse/workbench
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CareLevel = 'special' | 'level1' | 'level2' | 'level3';

export const CARE_LEVEL_META: Record<CareLevel, { label: string; color: string }> = {
  special: { label: '特级护理', color: 'red' },
  level1: { label: '一级护理', color: 'orange' },
  level2: { label: '二级护理', color: 'blue' },
  level3: { label: '三级护理', color: 'default' },
};

export interface WardPatient {
  bedNo: string;
  patientId: string;
  name: string;
  diagnosis: string;
  careLevel: CareLevel;
  admissionDate: string;
}

export interface NurseWorkbench {
  ward: string;
  total: number;
  special: number;
  level1: number;
  pendingOrders: number;
  patients: WardPatient[];
}

const DEMO_WORKBENCH: NurseWorkbench = {
  ward: '呼吸一病区',
  total: 28,
  special: 2,
  level1: 8,
  pendingOrders: 14,
  patients: [
    { bedNo: '01-01', patientId: 'P10001', name: '张**', diagnosis: '慢阻肺急性加重', careLevel: 'level1', admissionDate: '2026-10-15' },
    { bedNo: '01-02', patientId: 'P10002', name: '李**', diagnosis: '肺炎（社区获得性）', careLevel: 'level2', admissionDate: '2026-10-20' },
    { bedNo: '02-01', patientId: 'P10003', name: '王**', diagnosis: '支气管扩张伴感染', careLevel: 'special', admissionDate: '2026-10-10' },
    { bedNo: '02-03', patientId: 'P10004', name: '赵**', diagnosis: '胸腔积液', careLevel: 'level3', admissionDate: '2026-10-21' },
    { bedNo: '03-01', patientId: 'P10005', name: '陈**', diagnosis: '肺栓塞（抗凝中）', careLevel: 'level1', admissionDate: '2026-10-18' },
  ],
};

export interface WorkbenchResult {
  data: NurseWorkbench;
  demo: boolean;
}

export async function fetchNurseWorkbench(ward: string): Promise<WorkbenchResult> {
  try {
    const res = await get<NurseWorkbench>('/nurse/workbench', { ward });
    return { data: res, demo: false };
  } catch {
    return { data: { ...DEMO_WORKBENCH, ward }, demo: true };
  }
}
