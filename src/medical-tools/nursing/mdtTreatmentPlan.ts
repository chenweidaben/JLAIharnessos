/**
 * 健澜科技 jlmedaios - MDT 治疗方案纯函数（M67-A）
 * 方案类型推断 / 确认状态 / 排程判定。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type PlanType = 'chemotherapy' | 'surgery' | 'radiotherapy' | 'targeted' | 'immunotherapy' | 'supportive';

/** 按参与科室推断方案类型。 */
export function suggestPlanType(departments: string[], conclusion: string): PlanType {
  const text = departments.join(' ') + ' ' + conclusion;
  if (text.includes('外科') || text.includes('手术')) return 'surgery';
  if (text.includes('放疗') || text.includes('放射')) return 'radiotherapy';
  if (text.includes('靶向')) return 'targeted';
  if (text.includes('免疫')) return 'immunotherapy';
  if (text.includes('化疗')) return 'chemotherapy';
  return 'supportive';
}

/** draft -> confirmed。 */
export function confirmStatus(current: string): string {
  return current === 'draft' ? 'confirmed' : current;
}

/** confirmed 但无排程 -> 需要排程。 */
export function needsScheduling(status: string, scheduledAt: string | null): boolean {
  return status === 'confirmed' && !scheduledAt;
}
