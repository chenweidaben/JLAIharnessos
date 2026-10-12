/**
 * 健澜科技 jlmedaios - 患者端费用格式化工具（M50-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { BillingCategory } from '@/types/patientBilling';

/** 金额格式化为两位小数元。 */
export function formatMoney(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0.00';
  return v.toFixed(2);
}

export const CATEGORY_LABEL: Record<BillingCategory, string> = {
  drug: '药品',
  exam: '检查',
  treatment: '治疗',
  material: '材料',
  other: '其它',
};
