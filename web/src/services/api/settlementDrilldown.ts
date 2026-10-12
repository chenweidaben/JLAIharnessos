/**
 * 健澜科技 jlmedaios - 结算下钻 API（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { DrilldownResult } from '@/types/settlementDrilldown';

export function drilldown(period: string) { return get<DrilldownResult>(`/settlement-drilldown?period=${encodeURIComponent(period)}`); }
