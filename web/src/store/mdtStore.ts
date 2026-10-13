/**
 * 健澜科技 jlmedaios - MDT store（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { createMdt, listMdt, minutesMdt, scheduleMdt } from '@/services/api/mdt';
import type { MdtConsult } from '@/types/mdt';

interface MdtState {
  dbUp: boolean | null;
  visitId: string;
  items: MdtConsult[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  create: (input: { title: string; reason: string; departments: string[] }) => Promise<void>;
  schedule: (id: string, scheduledAt: string) => Promise<void>;
  minutes: (id: string, minutes: string, conclusion: string) => Promise<void>;
}

export const useMdtStore = create<MdtState>((set, get) => ({
  dbUp: null,
  visitId: '',
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
  setVisit: async (visitId) => {
    set({ visitId });
    if (!visitId || get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listMdt(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  create: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await createMdt({ visitId: get().visitId, ...input });
    await get().setVisit(get().visitId);
  },
  schedule: async (id, scheduledAt) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await scheduleMdt(id, scheduledAt);
    await get().setVisit(get().visitId);
  },
  minutes: async (id, minutes, conclusion) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await minutesMdt(id, minutes, conclusion);
    await get().setVisit(get().visitId);
  },
}));
