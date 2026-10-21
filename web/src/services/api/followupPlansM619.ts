/**
 * 健澜科技 jlmedaios - 随访计划 API（M619，P12 患者侧深度）
 *
 * 对接 BFF：GET /api/v1/followup/plans（m451 真实）+ POST /api/v1/followup/plans
 *   （POST 未注册则本地 DEMO 落地并打标）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type FollowupStatus = 'pending' | 'done' | 'missed';

export interface FollowupPlan {
  id: string;
  patientId: string;
  disease: string;
  item: string;
  planDate: string;
  frequency: string;
  owner: string;
  status: FollowupStatus;
}

export interface FollowupCreateInput {
  patientId: string;
  disease: string;
  item: string;
  planDate: string;
  frequency: string;
  owner: string;
}

export const FOLLOWUP_STATUS_META: Record<FollowupStatus, { label: string; color: string }> = {
  pending: { label: '待随访', color: 'orange' },
  done: { label: '已完成', color: 'green' },
  missed: { label: '已失访', color: 'red' },
};

const DEMO_PLANS: FollowupPlan[] = [
  { id: 'FU-001', patientId: 'P10001', disease: '高血压', item: '家庭血压记录随访', planDate: '2026-10-25', frequency: '每周 1 次', owner: '王医师', status: 'pending' },
  { id: 'FU-002', patientId: 'P10001', disease: '高血压', item: '用药依从性电话随访', planDate: '2026-10-28', frequency: '每月 1 次', owner: '随访护士-周敏', status: 'pending' },
  { id: 'FU-003', patientId: 'P10002', disease: '糖尿病', item: '血糖控制复查', planDate: '2026-10-10', frequency: '每 2 周 1 次', owner: '李医师', status: 'done' },
  { id: 'FU-004', patientId: 'P10003', disease: '冠心病', item: '术后 30 天门诊复诊', planDate: '2026-10-05', frequency: '一次性', owner: '陈医师', status: 'missed' },
];

export interface FollowupListResult {
  items: FollowupPlan[];
  totalCount: number;
  demo: boolean;
}

export async function fetchFollowupPlans(patientId: string): Promise<FollowupListResult> {
  try {
    const res = await get<{ items: FollowupPlan[]; totalCount: number }>('/followup/plans', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_PLANS.filter((p) => p.patientId === patientId), totalCount: 0, demo: true };
  }
}

/** 新建随访计划：POST 失败不做成功兜底 */
export async function createFollowupPlan(input: FollowupCreateInput): Promise<FollowupPlan> {
  return post<FollowupPlan>('/followup/plans', input);
}
