/**
 * 健澜科技 jlmedaios - PICC 维护 store（M68-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listPicc, recordPicc } from '@/services/api/picc';
import type { PiccMaintenance } from '@/types/picc';

interface PiccState {
  dbUp: boolean | null;
  patientId: string;
  items: PiccMaintenance[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setPatient: (patientId: string) => Promise<void>;
  record: (input: {
    deviceType: 'picc' | 'port'; insertedAt: string; lastMaintainedAt: string;
    dressingChanged?: boolean; flushed?: boolean; complication?: 'none' | 'thrombosis' | 'infection' | 'dislodged' | 'occluded' | null; notes?: string | null;
  }) => Promise<void>;
}

export const usePiccStore = create<PiccState>((set, get) => ({
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
    try { set({ items: await listPicc(patientId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  record: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await recordPicc({ patientId: get().patientId, ...input });
    await get().setPatient(get().patientId);
  },
}));
