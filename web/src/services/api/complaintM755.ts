/**
 * 健澜科技 jlmedaios - 投诉管理 API（M755）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ComplaintStatus = 'submitted' | 'investigating' | 'resolved' | 'closed';

export interface Complaint {
  id: string;
  complaintNo: string;
  complainant: string;
  target: string;
  type: string;
  filedAt: string;
  status: ComplaintStatus;
  content: string;
  investigation: string;
  resolution: string;
  callback: string;
}

export const COMPLAINT_STATUS_META: Record<ComplaintStatus, { label: string; color: string }> = {
  submitted: { label: '已受理', color: 'blue' },
  investigating: { label: '调查中', color: 'orange' },
  resolved: { label: '已处理', color: 'green' },
  closed: { label: '已结案', color: 'default' },
};

const DEMO: Complaint[] = [
  {
    id: 'CP-001',
    complaintNo: 'CP-261001',
    complainant: '张患者',
    target: '门诊皮肤科 李医师',
    type: '服务态度',
    filedAt: '2026-10-20',
    status: 'investigating',
    content: '反映候诊等待时间过长、医师沟通态度不耐烦。',
    investigation: '已调取当日叫号记录、约谈当事人，正在核实。',
    resolution: '待调查结束后反馈。',
    callback: '2026-10-22 电话回访：患者理解流程，待最终答复。',
  },
];

export interface ComplaintListResult {
  items: Complaint[];
  demo: boolean;
}

export async function fetchComplaints(): Promise<ComplaintListResult> {
  try {
    const res = await get<{ items: Complaint[] }>('/patient-service/complaints');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
