/**
 * 健澜科技 jlmedaios - 出院计划 v2 API（M666，配套 M561）
 *
 * 对接 BFF：GET /api/v1/discharge/plans
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PlanStatus = 'draft' | 'active' | 'executed' | 'closed';

export interface DischargePlan {
  id: string;
  patientId: string;
  ward: string;
  estimatedDischargeDate: string;
  followupItems: string[];
  homeCare: string;
  medicationGuidance: string;
  status: PlanStatus;
  caseManager: string;
}

export const PLAN_STATUS_META: Record<PlanStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  active: { label: '执行中', color: 'blue' },
  executed: { label: '已执行', color: 'orange' },
  closed: { label: '已闭环', color: 'green' },
};

const DEMO_PLANS: DischargePlan[] = [
  {
    id: 'DP-001',
    patientId: 'P10005',
    ward: '心内科',
    estimatedDischargeDate: '2026-10-25',
    followupItems: ['PCI 术后 1 个月门诊随访', 'INR 监测每周 1 次', '心脏康复评估'],
    homeCare: '低盐低脂饮食，避免剧烈运动，家属掌握心肺复苏基础。',
    medicationGuidance: '阿司匹林 + 氯吡格雷双联抗血小板 12 个月，不可自行停药。',
    status: 'active',
    caseManager: '王个案',
  },
  {
    id: 'DP-002',
    patientId: 'P10011',
    ward: 'ICU',
    estimatedDischargeDate: '2026-11-02',
    followupItems: ['呼吸科门诊随访', '肺功能复查'],
    homeCare: '家庭氧疗 2L/min 12h/d。',
    medicationGuidance: '布地奈德福莫特罗吸入剂 1 吸 bid。',
    status: 'draft',
    caseManager: '李个案',
  },
];

export interface PlanListResult {
  items: DischargePlan[];
  totalCount: number;
  demo: boolean;
}

export async function fetchDischargePlans(): Promise<PlanListResult> {
  try {
    const res = await get<{ items: DischargePlan[]; totalCount: number }>('/discharge/plans');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_PLANS, totalCount: DEMO_PLANS.length, demo: true };
  }
}
