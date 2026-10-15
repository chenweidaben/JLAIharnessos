/**
 * 健澜科技 jlmedaios - 护理敏感质量指标（NQI）API
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { NqiTrendData } from '@/types/nursingNqi';

const base = '/nursing/nqi';

/** 月度趋势（跌倒/压疮/管路滑脱/给药错误） */
export function getNqiTrend() {
  return get<NqiTrendData>(base);
}
