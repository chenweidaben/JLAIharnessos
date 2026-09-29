/**
 * 健澜科技 jlmedaios - 医保对账 store（M3-G）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { ReconRun, ReconRunDetail } from '@/types/recon';
import * as api from '../services/api/recon';

interface ReconState {
  runs: ReconRun[];
  detail: ReconRunDetail | null;
  error: string | null;
  loading: boolean;
  load: () => Promise<void>;
  trigger: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  confirm: (id: string) => Promise<void>;
  dispute: (id: string, note: string) => Promise<void>;
}

export const useReconStore = create<ReconState>((set) => ({
  runs: [],
  detail: null,
  error: null,
  loading: false,
  async load() {
    set({ loading: true, error: null });
    try {
      set({ runs: await api.listReconRuns(), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载对账批次失败', loading: false });
    }
  },
  async trigger() {
    set({ loading: true, error: null });
    try {
      await api.triggerReconRun();
      set({ runs: await api.listReconRuns(), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '生成对账失败', loading: false });
    }
  },
  async loadDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getReconRun(id), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载明细失败', loading: false });
    }
  },
  async confirm(id) {
    set({ error: null });
    try {
      await api.confirmReconRun(id);
      set({ detail: await api.getReconRun(id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '确认失败' });
    }
  },
  async dispute(id, note) {
    set({ error: null });
    try {
      await api.disputeReconRun(id, note);
      set({ detail: await api.getReconRun(id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '挂起失败' });
    }
  },
}));
