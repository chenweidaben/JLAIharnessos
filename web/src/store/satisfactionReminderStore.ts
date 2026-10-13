/**
 * 健澜科技 jlmedaios - 满意度提醒 store（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { getMyPending, runNotifyScan } from '@/services/api/satisfactionReminder';

interface PendingItem { id: string; title: string; body: string; createdAt: string }

interface ReminderState {
  dbUp: boolean | null;
  items: PendingItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  loadPending: () => Promise<void>;
  scan: () => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  dbUp: null,
  items: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  loadPending: async () => {
    if (get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await getMyPending() }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  scan: async () => {
    if (get().dbUp !== true) throw new Error('不可用');
    await runNotifyScan();
    await get().loadPending();
  },
}));
