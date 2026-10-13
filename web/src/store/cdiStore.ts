/**
 * 健澜科技 jlmedaios - CDI 用药审查 store（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listCdi, resolveCdi, reviewDrug } from '@/services/api/cdi';
import type { CdiReview } from '@/types/cdi';

interface CdiState {
  dbUp: boolean | null;
  patientId: string;
  items: CdiReview[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setPatient: (patientId: string) => Promise<void>;
  review: (input: { drugName: string; currentDrugs?: string[]; allergies?: string[]; doseMg?: number; weightKg?: number }) => Promise<void>;
  resolve: (id: string) => Promise<void>;
}

export const useCdiStore = create<CdiState>((set, get) => ({
  dbUp: null,
  patientId: '',
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
  setPatient: async (patientId) => {
    set({ patientId });
    if (!patientId || get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listCdi(patientId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  review: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await reviewDrug({ patientId: get().patientId, ...input });
    await get().setPatient(get().patientId);
  },
  resolve: async (id) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await resolveCdi(id);
    await get().setPatient(get().patientId);
  },
}));
