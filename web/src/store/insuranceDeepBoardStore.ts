/**
 * 健澜科技 jlmedaios - 医保智能审核深度看板 Zustand store（M513）
 * 聚合 /insurance/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAuditRules,
  fetchDenials,
  fetchSettlementStats,
  type AuditRuleRow,
  type DenialRow,
  type SettlementStats,
} from '@/services/api/insuranceDeepBoard';

interface InsuranceDeepBoardState {
  rules: AuditRuleRow[];
  denials: DenialRow[];
  stats: SettlementStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useInsuranceDeepBoardStore = create<InsuranceDeepBoardState>((set) => ({
  rules: [],
  denials: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [r, d, s] = await Promise.all([
        fetchAuditRules(),
        fetchDenials(),
        fetchSettlementStats(),
      ]);
      set({
        rules: r.data,
        denials: d.data,
        stats: s.data,
        demo: r.demo || d.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '医保审核看板加载失败',
      });
    }
  },
}));
