/**
 * 健澜科技 jlmedaios - 营养科会诊展示工具（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { PlanTier } from '@/types/nutritionConsult';

export const TIER_LABEL: Record<PlanTier, string> = {
  low: '低能量',
  normal: '常规',
  high: '高能量',
};

export const TIER_COLOR: Record<PlanTier, string> = {
  low: 'orange',
  normal: 'green',
  high: 'red',
};

export const STATUS_LABEL: Record<string, string> = {
  consulted: '已会诊',
  followed_up: '已随访',
  closed: '已闭环',
};
