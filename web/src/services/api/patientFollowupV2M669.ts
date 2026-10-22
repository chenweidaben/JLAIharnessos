/**
 * 健澜科技 jlmedaios - 患者随访 v2 API（M669，配套 M564）
 *
 * 对接 BFF：GET /api/v1/patient/followups
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type FollowupType = 'phone' | 'outpatient' | 'home' | 'telemedicine';
export type FollowupStatus = 'planned' | 'completed' | 'missed' | 'cancelled';

export interface PatientFollowup {
  id: string;
  patientId: string;
  type: FollowupType;
  plannedDate: string;
  completedAt: string | null;
  status: FollowupStatus;
  summary: string;
  followupBy: string;
}

export const FOLLOWUP_TYPE_META: Record<FollowupType, { label: string; color: string }> = {
  phone: { label: '电话随访', color: 'blue' },
  outpatient: { label: '门诊复诊', color: 'green' },
  home: { label: '家庭访视', color: 'orange' },
  telemedicine: { label: '互联网复诊', color: 'purple' },
};

export const FOLLOWUP_STATUS_META: Record<FollowupStatus, { label: string; color: string }> = {
  planned: { label: '待执行', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  missed: { label: '失访', color: 'red' },
  cancelled: { label: '已取消', color: 'default' },
};

const DEMO_FOLLOWUPS: PatientFollowup[] = [
  { id: 'FU-001', patientId: 'P10005', type: 'phone', plannedDate: '2026-10-29', completedAt: null, status: 'planned', summary: '', followupBy: '王个案' },
  { id: 'FU-002', patientId: 'P10002', type: 'outpatient', plannedDate: '2026-10-25', completedAt: null, status: 'planned', summary: '', followupBy: '李医师' },
  { id: 'FU-003', patientId: 'P10011', type: 'telemedicine', plannedDate: '2026-10-15', completedAt: '2026-10-15T10:00:00+08:00', status: 'completed', summary: 'SpO2 稳定 96%，已调整氧流量至 1.5L/min。', followupBy: '陈医师' },
];

export interface FollowupListResult {
  items: PatientFollowup[];
  totalCount: number;
  demo: boolean;
}

export async function fetchPatientFollowups(): Promise<FollowupListResult> {
  try {
    const res = await get<{ items: PatientFollowup[]; totalCount: number }>('/patient/followups');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_FOLLOWUPS, totalCount: DEMO_FOLLOWUPS.length, demo: true };
  }
}
