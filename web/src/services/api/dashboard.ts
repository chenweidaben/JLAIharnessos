/**
 * 健澜科技 jlmedaios - 院长驾驶舱 API 服务（M9-A）
 *
 * 真实 BFF（src/bff/routes/dashboard.ts），从 PostgreSQL 统计，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get } from '../request';
import type { DashboardStats } from '@/types/dashboardStats';

/** 院长驾驶舱统计（趋势天数，默认 14，上限 90） */
export function fetchDashboardStats(days = 14): Promise<DashboardStats> {
  return get<DashboardStats>('/dashboard/stats', { days });
}
