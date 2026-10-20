/**
 * 健澜科技 jlmedaios - 智慧服务三级运营看板 Zustand store（M479）
 * 聚合 /smart-service/* 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAppointment,
  fetchFollowup,
  fetchPayment,
  fetchReportQuery,
  type AppointmentRow,
  type FollowupRow,
  type PaymentRow,
  type ReportQueryRow,
} from '@/services/api/smartServiceBoard';

interface SmartServiceBoardState {
  appointments: AppointmentRow[];
  payments: PaymentRow[];
  reportQueries: ReportQueryRow[];
  followups: FollowupRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useSmartServiceBoardStore = create<SmartServiceBoardState>((set) => ({
  appointments: [],
  payments: [],
  reportQueries: [],
  followups: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [a, p, r, f] = await Promise.all([
        fetchAppointment(),
        fetchPayment(),
        fetchReportQuery(),
        fetchFollowup(),
      ]);
      set({
        appointments: a.data,
        payments: p.data,
        reportQueries: r.data,
        followups: f.data,
        demo: a.demo || p.demo || r.demo || f.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '智慧服务看板加载失败',
      });
    }
  },
}));
