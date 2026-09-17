/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 临床决策支持(CDS) API
 */
import { get, post } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import { mockCDSRules, mockDrugInfo, mockDrugInteractions } from '@/mock/cds';

export const cdsApi = {
  async rules() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockCDSRules;
    }
    return get<typeof mockCDSRules>('/cds/rules');
  },
  async checkCDS(context: Record<string, unknown>) {
    if (env.mockEnabled) {
      await delay(120, 300);
      return { passed: true, blocked: false, summary: '未发现阻断性问题', alerts: [] };
    }
    return post<{ passed: boolean; blocked: boolean; summary: string; alerts: unknown[] }>(
      '/cds/check',
      context,
    );
  },
  async drugInfo(name: string) {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockDrugInfo[name] ?? { name, indications: '', contraindications: '' };
    }
    return get('/cds/drug', { name });
  },
  async drugInteraction(drugs: string[]) {
    if (env.mockEnabled) {
      await delay(100, 250);
      return mockDrugInteractions;
    }
    return post<typeof mockDrugInteractions>('/cds/drug-interaction', { drugs });
  },
};
