/**
 * 健澜科技 jlmedaios - AI病历质控 store（M90-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { listAiNoteQc, scanAiNoteQc, type AiNoteQcRecord } from '@/services/api/aiNoteQc';

interface AiNoteQcState {
  visitId: string;
  records: AiNoteQcRecord[];
  loading: boolean;
  scanning: boolean;
  error: string | null;
  setVisitId: (v: string) => void;
  load: () => Promise<void>;
  scan: () => Promise<void>;
}

export const useAiNoteQcStore = create<AiNoteQcState>((set, get) => ({
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
      set({ records: await listAiNoteQc(visitId.trim()) });
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
      await scanAiNoteQc(visitId.trim());
      // 扫描后刷新历史记录（records[0] 即本次最新结果）
      set({ records: await listAiNoteQc(visitId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '扫描失败' });
    } finally {
      set({ scanning: false });
    }
  },
}));
