/**
 * 健澜科技 jlmedaios - 急诊留观 store（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { closeEdObservation, listEdObservations, registerEdObservation } from '@/services/api/edObservation';
import type { EdObservation } from '@/types/edObservation';

interface EdObsState {
  dbUp: boolean | null;
  patientId: string;
  items: EdObservation[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setPatient: (patientId: string) => Promise<void>;
  register: (input: { triageLevel: string }) => Promise<void>;
  close: (id: string, disposition: string) => Promise<void>;
}

export const useEdObsStore = create<EdObsState>((set, get) => ({
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
    try { set({ items: await listEdObservations({ patientId }) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  register: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await registerEdObservation({ patientId: get().patientId, ...input });
    await get().setPatient(get().patientId);
  },
  close: async (id, disposition) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await closeEdObservation(id, disposition);
    await get().setPatient(get().patientId);
  },
}));
