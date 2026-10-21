/**
 * 健澜科技 jlmedaios - 患者诊疗时间线 Zustand store（M544，P0）
 *
 * 注：M470 存量 patientTimelineStore.ts 为既有模块，本文件按 M544 独立命名避让。
 *
 * state：events / patientId / from / to / loading / error / demo。
 * 默认患者 P10001；日期 RangePicker 变更区间后自动重新加载。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchTimelineEvents, type TimelineEvent } from '@/services/api/patientTimeline';

interface PatientTimelineM544State {
  events: TimelineEvent[];
  patientId: string;
  from: string;
  to: string;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string, from?: string, to?: string) => Promise<void>;
  setPatient: (patientId: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePatientTimelineM544Store = create<PatientTimelineM544State>((set, get) => ({
  events: [],
  patientId: 'P10001',
  from: '',
  to: '',
  loading: false,
  error: null,
  demo: false,

  load: async (patientId, from, to) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    const f = from ?? get().from;
    const t = to ?? get().to;
    set({ loading: true, error: null, patientId: pid, from: f, to: t });
    try {
      const res = await fetchTimelineEvents({ patientId: pid, from: f || undefined, to: t || undefined });
      set({ events: res.events, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '患者时间线加载失败') });
    }
  },

  setPatient: async (patientId) => {
    await get().load(patientId);
  },

  clearError: () => set({ error: null }),
}));
