/**
 * 健澜科技 jlmedaios - 配药任务 store（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { completeTask, listPendingTasks } from '@/services/api/pharmacyTask';
import type { PharmacyTaskItem } from '@/types/pharmacy';

interface PharmacyTaskState {
  dbUp: boolean | null;
  items: PharmacyTaskItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  complete: (id: string) => Promise<void>;
}

export const usePharmacyTaskStore = create<PharmacyTaskState>((set, get) => ({
  dbUp: null,
  items: [],
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
      const r = await listPendingTasks();
      set({ items: r });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  complete: async (id) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await completeTask(id);
    await get().load();
  },
}));
