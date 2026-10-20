/**
 * 健澜科技 jlmedaios - CDS 临床决策支持看板 Zustand store（M474）
 * 聚合 /cds/* 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchCdsAdherence,
  fetchCdsAlerts,
  fetchCdsRules,
  fetchCdsSuggestions,
  type CdsAdherenceRow,
  type CdsAlertRow,
  type CdsRuleRow,
  type CdsSuggestionRow,
} from '@/services/api/cdsBoard';

interface CdsBoardState {
  rules: CdsRuleRow[];
  alerts: CdsAlertRow[];
  suggestions: CdsSuggestionRow[];
  adherence: CdsAdherenceRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useCdsBoardStore = create<CdsBoardState>((set) => ({
  rules: [],
  alerts: [],
  suggestions: [],
  adherence: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [r, a, s, ad] = await Promise.all([
        fetchCdsRules(),
        fetchCdsAlerts(),
        fetchCdsSuggestions(),
        fetchCdsAdherence(),
      ]);
      set({
        rules: r.data,
        alerts: a.data,
        suggestions: s.data,
        adherence: ad.data,
        demo: r.demo || a.demo || s.demo || ad.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'CDS 看板加载失败',
      });
    }
  },
}));
