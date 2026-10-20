/**
 * 健澜科技 jlmedaios - 患者统一时间线 Zustand store（M470 P0 合规）
 *
 * 按 patientId 拉取 /timeline/events，按 eventTime 倒序排序；
 * BFF 不可用时由 service 层降级为 DEMO 数据，页面照常渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchTimelineEvents,
  type TimelineEvent,
} from '@/services/api/timeline';

interface PatientTimelineState {
  patientId: string | null;
  events: TimelineEvent[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  setPatientId: (id: string) => void;
  load: () => Promise<void>;
}

const byTimeDesc = (a: TimelineEvent, b: TimelineEvent): number =>
  new Date(b.eventTime.replace(' ', 'T')).getTime() -
  new Date(a.eventTime.replace(' ', 'T')).getTime();

export const usePatientTimelineStore = create<PatientTimelineState>((set, get) => ({
  patientId: null,
  events: [],
  loading: false,
  error: null,
  demo: false,

  setPatientId: (id) => set({ patientId: id }),

  load: async () => {
    const patientId = get().patientId;
    if (!patientId) return;
    set({ loading: true, error: null });
    try {
      const events = await fetchTimelineEvents(patientId);
      const sorted = [...events].sort(byTimeDesc);
      set({
        events: sorted,
        loading: false,
        demo: sorted.some((e) => e.demo),
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '时间线加载失败' });
    }
  },
}));
