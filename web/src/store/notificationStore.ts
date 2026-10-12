/**
 * 健澜科技 jlmedaios - 通知中心 store（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listNotifications, markAllRead, markRead } from '@/services/api/notification';
import type { NotificationItem } from '@/types/notification';

interface NotificationState {
  dbUp: boolean | null;
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (patientId: string) => Promise<void>;
  read: (id: string, patientId: string) => Promise<void>;
  readAll: (patientId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  dbUp: null,
  items: [],
  unread: 0,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (patientId) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      const r = await listNotifications(patientId);
      set({ items: r.items, unread: r.unread });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  read: async (id, patientId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await markRead(id, patientId);
    await get().load(patientId);
  },
  readAll: async (patientId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await markAllRead(patientId);
    await get().load(patientId);
  },
}));
