/**
 * 健澜科技 jlmedaios - DIP store（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listPackets, listPoints } from '@/services/api/dip';
import type { MonthlyPoint, PacketScore } from '@/types/dip';

interface DipState {
  dbUp: boolean | null;
  packets: PacketScore[];
  points: MonthlyPoint[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
}

export const useDipStore = create<DipState>((set, get) => ({
  dbUp: null,
  packets: [],
  points: [],
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
      const [p, m] = await Promise.all([listPackets(), listPoints()]);
      set({ packets: p, points: m });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
