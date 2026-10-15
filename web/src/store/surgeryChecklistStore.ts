/**
 * 健澜科技 jlmedaios - 手术安全核查表 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  getChecklist,
  signChecklist,
  type ChecklistItem,
  type ChecklistPhase,
  type ChecklistView,
  type PhaseView,
} from '@/services/api/surgeryChecklist';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface SurgeryChecklistState {
  view: ChecklistView | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: (surgeryId: string) => Promise<void>;
  sign: (surgeryId: string, phase: ChecklistPhase, items: ChecklistItem[]) => Promise<PhaseView | null>;
}

export const useSurgeryChecklistStore = create<SurgeryChecklistState>((set, get) => ({
  view: null,
  loading: false,
  saving: false,
  error: null,
  async load(surgeryId) {
    set({ loading: true, error: null });
    try {
      set({ view: await getChecklist(surgeryId), loading: false });
    } catch (e) {
      set({ view: null, loading: false, error: `核查表加载失败：${errMsg(e)}` });
    }
  },
  async sign(surgeryId, phase, items) {
    set({ saving: true, error: null });
    try {
      const signed = await signChecklist({ surgeryId, phase, items });
      const prev = get().view;
      set({
        saving: false,
        view: prev
          ? {
              ...prev,
              phases: prev.phases.map((p) => (p.phase === phase ? signed : p)),
            }
          : { surgeryId, phases: [signed] },
      });
      return signed;
    } catch (e) {
      set({ saving: false, error: `签署失败：${errMsg(e)}` });
      return null;
    }
  },
}));
