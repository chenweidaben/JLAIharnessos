/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS 前端 utils（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { CdsSeverity } from '@/types/orderCds';

export function severityColor(s: CdsSeverity): string {
  if (s === 'hard') return 'red';
  if (s === 'warn') return 'orange';
  return 'blue';
}

export function severityLabel(s: CdsSeverity): string {
  if (s === 'hard') return '拦截';
  if (s === 'warn') return '提醒';
  return '提示';
}

export function ruleLabel(r: string): string {
  const m: Record<string, string> = {
    allergy: '过敏',
    duplicate_active_order: '重复医嘱',
    dose_range: '剂量范围',
    frequent_dose: '频次过频',
  };
  return m[r] ?? r;
}
