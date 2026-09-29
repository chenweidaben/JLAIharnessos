/**
 * 健澜科技 jlmedaios - DRG 分组状态（M3-D）
 *
 * 拉取规则目录与分组结果队列；错误透传（断库时由上层 Alert 展示），不以空数组冒充。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { DrgResult, DrgResultListItem, DrgRule } from '@/types/drg';
import {
  confirmDrgResult,
  fetchDrgResults,
  fetchDrgRules,
  rejectDrgResult,
  runDrgGroup,
} from '@/services/api/drg';

interface DrgState {
  rules: DrgRule[];
  results: DrgResultListItem[];
  loading: boolean;
  error: string | null;

  loadRules: () => Promise<void>;
  loadResults: (status?: string) => Promise<void>;
  groupVisit: (visitId: string) => Promise<DrgResult>;
  confirm: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
}

export const useDrgStore = create<DrgState>()((set, get) => ({
  rules: [],
  results: [],
  loading: false,
  error: null,

  async loadRules() {
    set({ loading: true, error: null });
    try {
      const { rules } = await fetchDrgRules();
      set({ rules, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载规则失败' });
      throw e;
    }
  },

  async loadResults(status?: string) {
    set({ loading: true, error: null });
    try {
      const { results } = await fetchDrgResults(status);
      set({ results, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载分组结果失败' });
      throw e;
    }
  },

  async groupVisit(visitId: string) {
    set({ loading: true, error: null });
    try {
      const result = await runDrgGroup(visitId);
      set({ loading: false });
      return result;
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '分组失败' });
      throw e;
    }
  },

  async confirm(id: string) {
    set({ error: null });
    await confirmDrgResult(id);
    await get().loadResults();
  },

  async reject(id: string, reason: string) {
    set({ error: null });
    await rejectDrgResult(id, reason);
    await get().loadResults();
  },
}));
