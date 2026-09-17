/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质控 API
 */
import { get, post } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import { mockQualityReports, mockQualityStats, mockQualityCheck } from '@/mock/quality';

export const qualityApi = {
  async tasks() {
    if (env.mockEnabled) {
      await delay(150, 350);
      return mockQualityReports;
    }
    return get<typeof mockQualityReports>('/quality/tasks');
  },
  async stats() {
    if (env.mockEnabled) {
      await delay(100, 250);
      return mockQualityStats;
    }
    return get<typeof mockQualityStats>('/quality/stats');
  },
  async checkMedicalRecord(context: Record<string, unknown>) {
    if (env.mockEnabled) {
      await delay(300, 600);
      return mockQualityCheck('medical_record');
    }
    return post('/quality/check/medical-record', context);
  },
  async checkFrontPage(context: Record<string, unknown>) {
    if (env.mockEnabled) {
      await delay(300, 600);
      return mockQualityCheck('front_page');
    }
    return post('/quality/check/front-page', context);
  },
  async checkCoreSystem(context: Record<string, unknown>) {
    if (env.mockEnabled) {
      await delay(300, 600);
      return mockQualityCheck('core_system');
    }
    return post('/quality/check/core-system', context);
  },
};
