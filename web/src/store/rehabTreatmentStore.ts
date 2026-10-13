/**
 * 健澜科技 jlmedaios - 康复治疗执行 store（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listTreatments, prescribeTreatment, signTreatment, completeTreatment } from '@/services/api/rehabTreatment';
import type { RehabTreatment } from '@/types/rehabTreatment';

interface RehabState {
  dbUp: boolean | null;
  visitId: string;
  items: RehabTreatment[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  prescribe: (input: { modality: string; scheduledDate: string; note?: string | null }) => Promise<void>;
  sign: (id: string) => Promise<void>;
  complete: (id: string, efficacy: string, note?: string | null) => Promise<void>;
}

export const useRehabStore = create<RehabState>((set, get) => ({
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
    if (!visitId) return;
    if (get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listTreatments(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  prescribe: async (input) => {
    const { visitId, dbUp } = get();
    if (!visitId) throw new Error('缺少 visitId');
    if (dbUp !== true) throw new Error('数据库不可用');
    await prescribeTreatment({ ...input, visitId });
    await get().setVisit(visitId);
  },
  sign: async (id) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await signTreatment(id);
    await get().setVisit(get().visitId);
  },
  complete: async (id, efficacy, note) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await completeTreatment(id, { efficacy, note });
    await get().setVisit(get().visitId);
  },
}));
