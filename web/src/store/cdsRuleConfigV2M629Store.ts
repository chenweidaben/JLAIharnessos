/**
 * 健澜科技 jlmedaios - CDS 规则配置 v2 Zustand store（M629，P0 合规）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createCdsRule,
  fetchCdsRules,
  type CdsRule,
  type CdsRuleCreateInput,
} from '@/services/api/cdsRuleConfigV2M629';

interface CdsRuleConfigV2M629State {
  items: CdsRule[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  create: (input: CdsRuleCreateInput) => Promise<boolean>;
  toggleEnabled: (id: string, enabled: boolean) => void;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCdsRuleConfigV2M629Store = create<CdsRuleConfigV2M629State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCdsRules();
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '规则列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createCdsRule(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建规则失败') });
      return false;
    }
  },

  toggleEnabled: (id, enabled) =>
    set({ items: get().items.map((r) => (r.id === id ? { ...r, enabled } : r)) }),

  clearError: () => set({ error: null }),
}));
