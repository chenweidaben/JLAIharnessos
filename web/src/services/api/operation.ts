/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 运营分析 / 仪表盘 API
 */
import { get } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import {
  mockDashboard,
  mockDepartmentStats,
  mockDRGD,
  mockQualityIndicators,
  mockOperationTrend,
} from '@/mock/operation';

export const operationApi = {
  async dashboard() {
    if (env.mockEnabled) {
      await delay(150, 350);
      return mockDashboard;
    }
    return get<typeof mockDashboard>('/operation/dashboard');
  },
  async departments() {
    if (env.mockEnabled) {
      await delay(120, 300);
      return mockDepartmentStats;
    }
    return get<typeof mockDepartmentStats>('/operation/departments');
  },
  async drgDip() {
    if (env.mockEnabled) {
      await delay(120, 300);
      return mockDRGD;
    }
    return get<typeof mockDRGD>('/operation/drg-dip');
  },
  async qualityIndicators() {
    if (env.mockEnabled) {
      await delay(120, 300);
      return mockQualityIndicators;
    }
    return get<typeof mockQualityIndicators>('/operation/quality-indicators');
  },
  async trend() {
    if (env.mockEnabled) {
      await delay(120, 300);
      return mockOperationTrend;
    }
    return get<typeof mockOperationTrend>('/operation/trend');
  },
};
