/**
 * 健澜科技 jlmedaios - 改进任务 store（M22-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listMine, transition } from '@/services/api/improvementTask';
import type { ImprovementTask } from '@/types/improvementTask';

interface ImprovementState {
  dbUp: boolean | null;
  tasks: ImprovementTask[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  act: (id: string, to: string, resolutionNote?: string) => Promise<void>;
}

export const useImprovementStore = create<ImprovementState>((set, get) => ({
  dbUp: null,
  tasks: [],
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
      set({ tasks: await listMine() });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  act: async (id, to, resolutionNote) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await transition(id, { to, resolutionNote });
    await get().load();
  },
}));
