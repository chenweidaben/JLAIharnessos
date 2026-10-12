/**
 * 健澜科技 jlmedaios - 结算分析 API（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { AnalyticPoint } from '@/types/settlementAnalytics';

export function analytics(months = 12) { return get<AnalyticPoint[]>(`/settlement-analytics?months=${months}`); }
