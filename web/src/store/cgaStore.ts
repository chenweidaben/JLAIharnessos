/**
 * 健澜科技 jlmedaios - 老年综合评估 store（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { assessCga, listCga } from '@/services/api/cga';
import type { CgaAssessment } from '@/types/cga';

interface CgaState {
  dbUp: boolean | null;
  visitId: string;
  items: CgaAssessment[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string) => Promise<void>;
  assess: (input: { adlScore: number; iadlScore: number; mmseScore: number; fallRisk?: boolean; mnaScore: number; gdsScore: number }) => Promise<void>;
}

export const useCgaStore = create<CgaState>((set, get) => ({
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
    try { set({ items: await listCga(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  assess: async (input) => {
    const { visitId, dbUp } = get();
    if (!visitId) throw new Error('缺少 visitId');
    if (dbUp !== true) throw new Error('数据库不可用');
    await assessCga({ ...input, visitId });
    await get().setVisit(visitId);
  },
}));
