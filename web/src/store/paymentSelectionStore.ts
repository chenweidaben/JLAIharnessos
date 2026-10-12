/**
 * 健澜科技 jlmedaios - 病组选择 store（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { list } from '@/services/api/paymentSelection';
import type { SelectionRow } from '@/types/paymentSelection';

interface SelectionState {
  dbUp: boolean | null;
  rows: SelectionRow[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  dbUp: null,
  rows: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async () => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      set({ rows: await list() });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
