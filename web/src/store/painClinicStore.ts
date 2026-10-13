/**
 * 健澜科技 jlmedaios - 疼痛门诊 store（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listPainClinic, recordPainClinic } from '@/services/api/painClinic';
import type { PainClinicRecord } from '@/types/painClinic';

interface PainState {
  dbUp: boolean | null;
  patientId: string;
  items: PainClinicRecord[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setPatient: (patientId: string) => Promise<void>;
  record: (input: { baselineNrs: number; currentNrs: number; breakthroughCount?: number; analgesic: string; doseNote?: string | null }) => Promise<void>;
}

export const usePainStore = create<PainState>((set, get) => ({
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
    if (!patientId) return;
    if (get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listPainClinic(patientId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  record: async (input) => {
    const { patientId, dbUp } = get();
    if (!patientId) throw new Error('缺少 patientId');
    if (dbUp !== true) throw new Error('数据库不可用');
    await recordPainClinic({ ...input, patientId });
    await get().setPatient(patientId);
  },
}));
