/**
 * 健澜科技 jlmedaios - 老年综合评估展示工具（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { CgaRiskLevel } from '@/types/cga';

export const RISK_LABEL: Record<CgaRiskLevel, string> = {
  low: '低危',
  moderate: '中危',
  high: '高危',
};

export const RISK_COLOR: Record<CgaRiskLevel, string> = {
  low: 'green',
  moderate: 'orange',
  high: 'red',
};

export const FLAG_LABEL: Record<string, string> = {
  adl_dependent: 'ADL 依赖',
  iadl_declined: '工具性 ADL 下降',
  cognitive_impairment: '认知损害',
  fall_risk: '跌倒风险',
  malnutrition: '营养不良',
  depression_screen: '抑郁筛查阳性',
};
