/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理 API
 */
import { get, put } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import {
  mockSystemConfig,
  mockTools,
  mockAgents,
  mockIntegrations,
  mockSystemMonitor,
  mockPerformance,
  mockHealth,
} from '@/mock/system';

export const systemApi = {
  async config() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockSystemConfig;
    }
    return get<typeof mockSystemConfig>('/system/config');
  },
  async updateConfig(data: Partial<typeof mockSystemConfig>) {
    if (env.mockEnabled) return { ...mockSystemConfig, ...data };
    return put<typeof mockSystemConfig>('/system/config', data);
  },
  async tools() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockTools;
    }
    return get<typeof mockTools>('/system/tools');
  },
  async agents() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockAgents;
    }
    return get<typeof mockAgents>('/system/agents');
  },
  async integrations() {
    if (env.mockEnabled) {
      await delay(100, 250);
      return mockIntegrations;
    }
    return get<typeof mockIntegrations>('/system/integrations');
  },
  async monitor() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockSystemMonitor;
    }
    return get<typeof mockSystemMonitor>('/system/monitor');
  },
  async performance() {
    if (env.mockEnabled) {
      await delay(80, 200);
      return mockPerformance;
    }
    return get<typeof mockPerformance>('/system/performance');
  },
  async health() {
    if (env.mockEnabled) {
      await delay(60, 150);
      return mockHealth;
    }
    return get<typeof mockHealth>('/system/health');
  },
};
