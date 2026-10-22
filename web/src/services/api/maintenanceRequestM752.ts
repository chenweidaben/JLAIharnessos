/**
 * 健澜科技 jlmedaios - 后勤报修管理 API（M752）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MaintenanceRequestStatus = 'submitted' | 'assigned' | 'repairing' | 'done' | 'closed';

export interface MaintenanceRequest {
  id: string;
  requestNo: string;
  reporter: string;
  location: string;
  content: string;
  status: MaintenanceRequestStatus;
  repairLogs: { time: string; note: string; by: string }[];
  acceptance: string;
}

export const MAINT_STATUS_META: Record<MaintenanceRequestStatus, { label: string; color: string }> = {
  submitted: { label: '已报修', color: 'blue' },
  assigned: { label: '已派单', color: 'orange' },
  repairing: { label: '维修中', color: 'processing' },
  done: { label: '已修复', color: 'green' },
  closed: { label: '已验收', color: 'default' },
};

const DEMO: MaintenanceRequest[] = [
  {
    id: 'MR-001',
    requestNo: 'MR-261001',
    reporter: '普外科 王护士',
    location: '住院部 5F 普外科病房 05 床',
    content: '呼叫铃无声，患者无法呼叫护士站。',
    status: 'repairing',
    repairLogs: [
      { time: '2026-10-22 09:30', note: '派单给总务科电工班', by: '总务科' },
      { time: '2026-10-22 10:00', note: '到场检查，更换呼叫铃电池', by: '电工班 李师傅' },
    ],
    acceptance: '待验收。',
  },
];

export interface MaintListResult {
  items: MaintenanceRequest[];
  demo: boolean;
}

export async function fetchMaintenanceRequests(): Promise<MaintListResult> {
  try {
    const res = await get<{ items: MaintenanceRequest[] }>('/admin/maintenance-requests');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
