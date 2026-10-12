/**
 * 健澜科技 jlmedaios - 报告推送 store（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listMine, markViewed } from '@/services/api/reportPush';
import type { ReportPushItem } from '@/types/reportPush';

interface ReportPushState {
  dbUp: boolean | null;
  items: ReportPushItem[];
  unread: number;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (patientId: string) => Promise<void>;
  view: (id: string, patientId: string) => Promise<void>;
}

export const useReportPushStore = create<ReportPushState>((set, get) => ({
  dbUp: null,
  items: [],
  unread: 0,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up });
      return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (patientId) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      const r = await listMine(patientId);
      set({ items: r.items, unread: r.unread });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  view: async (id, patientId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await markViewed(id);
    await get().load(patientId);
  },
}));
