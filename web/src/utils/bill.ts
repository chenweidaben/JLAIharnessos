/**
 * 健澜科技 jlmedaios - 住院费用清单格式化工具
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 金额格式化为两位小数元。 */
export function formatMoney(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0.00';
  return v.toFixed(2);
}

/** 费用类别中文标签（与 BFF FeeCategory 对齐）。 */
export const CATEGORY_LABEL: Record<string, string> = {
  registration: '挂号',
  consultation: '诊查',
  lab: '检验',
  imaging: '检查',
  drug: '药品',
  treatment: '治疗',
  bed: '床位',
  nursing: '护理',
  surgery: '手术',
  material: '材料',
  other: '其他',
};

/** 类别标签兜底：未知类别原样返回。 */
export function categoryLabel(cat: string): string {
  return CATEGORY_LABEL[cat] ?? cat;
}

/** 明细行状态中文标签。 */
export const STATUS_LABEL: Record<string, string> = {
  active: '未结算',
  settled: '已结算',
  refunded: '已退费',
  void: '已作废',
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}
