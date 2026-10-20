/**
 * 健澜科技 jlmedaios - FHIR 网关看板 Zustand store（M507）
 * 聚合 /fhir/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * KPI 由 list + consistency 聚合推导（不依赖额外 stats 端点）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchConsistency,
  fetchObservation,
  fetchPatient,
  type ConsistencyRow,
  type ObservationResource,
  type PatientResource,
} from '@/services/api/fhirGatewayBoard';

interface FhirGatewayBoardState {
  patients: PatientResource[];
  observations: ObservationResource[];
  consistency: ConsistencyRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useFhirGatewayBoardStore = create<FhirGatewayBoardState>((set) => ({
  patients: [],
  observations: [],
  consistency: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [p, o, c] = await Promise.all([
        fetchPatient(),
        fetchObservation(),
        fetchConsistency(),
      ]);
      set({
        patients: p.data,
        observations: o.data,
        consistency: c.data,
        demo: p.demo || o.demo || c.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'FHIR 网关看板加载失败',
      });
    }
  },
}));
