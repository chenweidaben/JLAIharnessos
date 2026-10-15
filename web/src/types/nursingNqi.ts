/**
 * 健澜科技 jlmedaios - 护理敏感质量指标（NQI）月度趋势类型
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 四类护理敏感指标键 */
export type NqiIndicatorKey =
  | 'fall'
  | 'pressureUlcer'
  | 'tubeDislodgement'
  | 'medError';

/** 单个指标的月度趋势点 */
export interface NqiTrendPoint {
  month: string;
  /** 当月发生例数 */
  events: number;
  /** 当月发生率（‰，每千住院床日） */
  rate: number;
}

/** 单个指标的汇总卡片数据 */
export interface NqiIndicatorSummary {
  key: NqiIndicatorKey;
  name: string;
  unit: string;
  /** 统计区间累计发生例数 */
  totalEvents: number;
  /** 最近一个月发生率（‰） */
  latestRate: number;
  /** 区间平均发生率（‰） */
  avgRate: number;
  trend: NqiTrendPoint[];
}

/** GET /api/v1/nursing/nqi 的 data */
export interface NqiTrendData {
  months: string[];
  indicators: NqiIndicatorSummary[];
  /** 是否为离线演示数据 */
  demo: boolean;
}
