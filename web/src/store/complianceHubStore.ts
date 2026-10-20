/**
 * 健澜科技 jlmedaios - 全院合规总览驾驶舱 Zustand store（M482）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchComplianceHub,
  type HubGap,
  type HubKpi,
} from '@/services/api/complianceHub';

interface ComplianceHubState {
  kpis: HubKpi[];
  gaps: HubGap[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useComplianceHubStore = create<ComplianceHubState>((set) => ({
  kpis: [],
  gaps: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const bundle = await fetchComplianceHub();
      set({
        kpis: bundle.kpis,
        gaps: bundle.gaps,
        demo: bundle.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '合规驾驶舱加载失败',
      });
    }
  },
}));
