/**
 * 健澜科技 jlmedaios - 手术麻醉 store（M3-H）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { SurgeryRequest, SurgeryDetail } from '@/types/surgery';
import * as api from '../services/api/surgery';

interface SurgeryState {
  list: SurgeryRequest[];
  detail: SurgeryDetail | null;
  error: string | null;
  loading: boolean;
  load: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  discharge: (id: string) => Promise<void>;
}

export const useSurgeryStore = create<SurgeryState>((set) => ({
  list: [],
  detail: null,
  error: null,
  loading: false,
  async load() {
    set({ loading: true, error: null });
    try {
      set({ list: await api.listSurgeries(), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载手术列表失败', loading: false });
    }
  },
  async loadDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getSurgery(id), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载手术详情失败', loading: false });
    }
  },
  async discharge(id) {
    set({ error: null });
    try {
      await api.dischargeSurgery(id);
      set({ detail: await api.getSurgery(id) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '离室失败' });
    }
  },
}));
