/**
 * 健澜科技 jlmedaios - 护理 NQI 看板 Zustand store（M545，P0）
 *
 * 注：M510 存量 nursing/NqiDashboard 页面与 nursingNqiBoard* store 为既有模块，
 * 本文件按 M545 独立命名避让。
 *
 * state：指标字典 / 事件 / 选中 code / loading / eventsLoading / acting / error / demo。
 * 上报成功后刷新当前指标事件列表；上报失败抛后端 message，不吞错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNqiEvents,
  fetchNqiIndicators,
  submitNqiReport,
  type IndicatorCode,
  type NqiEvent,
  type NqiIndicator,
  type NqiReportInput,
} from '@/services/api/nqiDashboard';

interface NqiDashboardM545State {
  indicators: NqiIndicator[];
  events: NqiEvent[];
  selectedCode: IndicatorCode;
  loading: boolean;
  eventsLoading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  selectIndicator: (code: IndicatorCode) => Promise<void>;
  submitReport: (input: NqiReportInput) => Promise<NqiEvent | null>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNqiDashboardM545Store = create<NqiDashboardM545State>((set, get) => ({
  indicators: [],
  events: [],
  selectedCode: 'fallRate',
  loading: false,
  eventsLoading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNqiIndicators();
      set({ indicators: res.items, demo: res.demo || get().demo, loading: false });
      await get().selectIndicator(get().selectedCode);
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'NQI 指标加载失败') });
    }
  },

  selectIndicator: async (code) => {
    set({ selectedCode: code, eventsLoading: true, error: null });
    try {
      const res = await fetchNqiEvents(code);
      set({ events: res.items, demo: res.demo || get().demo, eventsLoading: false });
    } catch (e) {
      set({ eventsLoading: false, error: errMsg(e, 'NQI 事件列表加载失败') });
    }
  },

  submitReport: async (input) => {
    set({ acting: true, error: null });
    try {
      const ev = await submitNqiReport(get().selectedCode, input);
      set({ acting: false });
      await get().selectIndicator(get().selectedCode);
      return ev;
    } catch (e) {
      set({ acting: false, error: errMsg(e, 'NQI 事件上报失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
