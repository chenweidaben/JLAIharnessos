/**
 * 健澜科技 jlmedaios - 手术核查表 store（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  createSurgicalChecklist, signinStage, signoutStage, timeoutStage,
} from '@/services/api/surgicalChecklist';
import type { StageInput, SurgicalChecklist } from '@/types/surgicalChecklist';

interface SurgicalCheckState {
  current: SurgicalChecklist | null;
  loading: boolean;
  error: string | null;
  create: (surgeryId: string) => Promise<void>;
  signin: (input: StageInput) => Promise<void>;
  timeout: (input: StageInput) => Promise<void>;
  signout: (input: StageInput) => Promise<void>;
}

export const useSurgicalCheckStore = create<SurgicalCheckState>((set, get) => ({
  current: null,
  loading: false,
  error: null,
  create: async (surgeryId) => {
    set({ loading: true, error: null });
    try { set({ current: await createSurgicalChecklist(surgeryId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '建单失败' }); }
    finally { set({ loading: false }); }
  },
  signin: async (input) => {
    const c = get().current; if (!c) return;
    set({ loading: true });
    try { set({ current: await signinStage(c.id, input) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '录入失败' }); }
    finally { set({ loading: false }); }
  },
  timeout: async (input) => {
    const c = get().current; if (!c) return;
    set({ loading: true });
    try { set({ current: await timeoutStage(c.id, input) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '录入失败' }); }
    finally { set({ loading: false }); }
  },
  signout: async (input) => {
    const c = get().current; if (!c) return;
    set({ loading: true });
    try { set({ current: await signoutStage(c.id, input) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '录入失败' }); }
    finally { set({ loading: false }); }
  },
}));
