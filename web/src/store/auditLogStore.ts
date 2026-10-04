/* ============================================================================
 * 健澜科技杠OS - 审计日志查询状态（M8-C）
 *
 * 真实 BFF：操作审计日志分页/筛选、概览、分布与趋势（只读）。
 * 健康门禁：BFF/DB 不可用时显式报错，绝不以假数据冒充审计结果。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as adminLogApi from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  AuditDistribution,
  AuditLogItem,
  AuditOverview,
  DailyTrend,
} from '@/types/adminLog';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface AuditFilterState {
  actorKeyword: string;
  action?: string;
  resourceType?: string;
  result?: string;
  riskLevel?: string;
  page: number;
  pageSize: number;
}

interface AuditLogState {
  dbUp: boolean;
  healthChecking: boolean;
  items: AuditLogItem[];
  total: number;
  overview: AuditOverview | null;
  distribution: AuditDistribution[];
  trend: DailyTrend[];
  selected: AuditLogItem | null;
  loading: boolean;
  error: string | null;
  filter: AuditFilterState;

  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  setFilter: (patch: Partial<AuditFilterState>) => void;
  resetFilter: () => void;
  openDetail: (seq: number) => Promise<void>;
  closeDetail: () => void;
  clearError: () => void;
}

const initialFilter: AuditFilterState = {
  actorKeyword: '',
  page: 1,
  pageSize: 12,
};

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  items: [],
  total: 0,
  overview: null,
  distribution: [],
  trend: [],
  selected: null,
  loading: false,
  error: null,
  filter: { ...initialFilter },

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  load: async () => {
    const f = get().filter;
    set({ loading: true, error: null });
    try {
      const [paged, overview, distribution, trend] = await Promise.all([
        adminLogApi.fetchAuditLogs({
          actorKeyword: f.actorKeyword || undefined,
          action: f.action,
          resourceType: f.resourceType,
          result: f.result,
          riskLevel: f.riskLevel,
          page: f.page,
          pageSize: f.pageSize,
        }),
        adminLogApi.fetchAuditOverview(),
        adminLogApi.fetchAuditDistribution(),
        adminLogApi.fetchAuditTrend(7),
      ]);
      set({
        items: paged.items,
        total: paged.total,
        overview,
        distribution,
        trend,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: `审计日志加载失败：${errMsg(e)}` });
    }
  },

  setFilter: (patch) => {
    set({ filter: { ...get().filter, ...patch, ...(patch.page ? {} : { page: 1 }) } });
    void get().load();
  },

  resetFilter: () => {
    set({ filter: { ...initialFilter } });
    void get().load();
  },

  openDetail: async (seq) => {
    try {
      const item = await adminLogApi.fetchAuditLog(seq);
      set({ selected: item });
    } catch (e) {
      set({ error: `日志详情加载失败：${errMsg(e)}` });
    }
  },

  closeDetail: () => set({ selected: null }),
  clearError: () => set({ error: null }),
}));
