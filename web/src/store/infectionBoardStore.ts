/**
 * 健澜科技 jlmedaios - 院感与患者安全看板 Zustand store（M481）
 * 聚合 /infection/* + /patient-safety/* 五端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchHandHygiene,
  fetchHospitalAcquired,
  fetchMDRO,
  fetchPatientEvents,
  fetchRCA,
  type HandHygieneRow,
  type HaiRow,
  type MdrRow,
  type PatientEventRow,
  type RcaRow,
} from '@/services/api/infectionBoard';

interface InfectionBoardState {
  hai: HaiRow[];
  handHygiene: HandHygieneRow[];
  mdr: MdrRow[];
  events: PatientEventRow[];
  rca: RcaRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useInfectionBoardStore = create<InfectionBoardState>((set) => ({
  hai: [],
  handHygiene: [],
  mdr: [],
  events: [],
  rca: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [h, hh, m, e, r] = await Promise.all([
        fetchHospitalAcquired(),
        fetchHandHygiene(),
        fetchMDRO(),
        fetchPatientEvents(),
        fetchRCA(),
      ]);
      set({
        hai: h.data,
        handHygiene: hh.data,
        mdr: m.data,
        events: e.data,
        rca: r.data,
        demo: h.demo || hh.demo || m.demo || e.demo || r.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '院感与患者安全看板加载失败',
      });
    }
  },
}));
