/**
 * 健澜科技 jlmedaios - 医院运营实时大屏 Zustand store（M480）
 * 聚合 /operation/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDailyVisits,
  fetchInpatientStatus,
  fetchOperationRoom,
  type DailyVisits,
  type InpatientStatus,
  type OperationRoom,
} from '@/services/api/operationBoard';

interface OperationBoardState {
  visits: DailyVisits | null;
  inpatient: InpatientStatus | null;
  opRoom: OperationRoom | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useOperationBoardStore = create<OperationBoardState>((set) => ({
  visits: null,
  inpatient: null,
  opRoom: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [v, i, o] = await Promise.all([
        fetchDailyVisits(),
        fetchInpatientStatus(),
        fetchOperationRoom(),
      ]);
      set({
        visits: v.data,
        inpatient: i.data,
        opRoom: o.data,
        demo: v.demo || i.demo || o.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '运营大屏加载失败',
      });
    }
  },
}));
