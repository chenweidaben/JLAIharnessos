/**
 * 健澜科技 jlmedaios - 设备维护保养管理 API（M729）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MaintType = 'routine' | 'preventive' | 'corrective';
export type MaintStatus = 'planned' | 'in_progress' | 'completed' | 'overdue';

export interface MaintenancePlan {
  id: string;
  equipName: string;
  type: MaintType;
  plannedAt: string;
  owner: string;
  status: MaintStatus;
  content: string;
  records: { date: string; result: string }[];
  faults: { date: string; fault: string }[];
}

export const MAINT_TYPE_META: Record<MaintType, { label: string; color: string }> = {
  routine: { label: '日常保养', color: 'blue' },
  preventive: { label: '预防性维护', color: 'processing' },
  corrective: { label: '故障维修', color: 'orange' },
};

export const MAINT_STATUS_META: Record<MaintStatus, { label: string; color: string }> = {
  planned: { label: '已计划', color: 'blue' },
  in_progress: { label: '执行中', color: 'processing' },
  completed: { label: '已完成', color: 'green' },
  overdue: { label: '已逾期', color: 'red' },
};

const DEMO: MaintenancePlan[] = [
  {
    id: 'MT-001',
    equipName: '1.5T 磁共振成像系统',
    type: 'preventive',
    plannedAt: '2026-10-25',
    owner: '设备科王工',
    status: 'planned',
    content: '冷头检查、梯度液更换、图像质量测试。',
    records: [
      { date: '2026-07-25', result: '完成预防性维护，图像质量测试合格。' },
    ],
    faults: [
      { date: '2026-04-10', fault: '冷头噪音偏大，已调整。' },
    ],
  },
];

export interface MaintListResult {
  items: MaintenancePlan[];
  demo: boolean;
}

export async function fetchMaintenancePlans(): Promise<MaintListResult> {
  try {
    const res = await get<{ items: MaintenancePlan[] }>('/equipment/maintenance');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
