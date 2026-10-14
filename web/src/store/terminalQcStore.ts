/**
 * 健澜科技 jlmedaios - 病历终末质控评分 store（M90-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { listTerminalQc, scanTerminalQc, type TerminalQcRecord } from '@/services/api/terminalQc';

interface TerminalQcState {
  visitId: string;
  records: TerminalQcRecord[];
  loading: boolean;
  scanning: boolean;
  error: string | null;
  setVisitId: (v: string) => void;
  load: () => Promise<void>;
  scan: () => Promise<void>;
}

export const useTerminalQcStore = create<TerminalQcState>((set, get) => ({
  visitId: '',
  records: [],
  loading: false,
  scanning: false,
  error: null,

  setVisitId: (v) => set({ visitId: v }),

  load: async () => {
    const { visitId } = get();
    if (!visitId.trim()) { set({ records: [] }); return; }
    set({ loading: true, error: null });
    try {
      set({ records: await listTerminalQc(visitId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  scan: async () => {
    const { visitId } = get();
    if (!visitId.trim()) { set({ error: '请输入就诊号 visitId' }); return; }
    set({ scanning: true, error: null });
    try {
      await scanTerminalQc(visitId.trim());
      // 扫描后刷新历史记录（records[0] 即本次最新结果）
      set({ records: await listTerminalQc(visitId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '评分失败' });
    } finally {
      set({ scanning: false });
    }
  },
}));
