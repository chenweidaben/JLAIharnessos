/**
 * 健澜科技 jlmedaios - 医保与应急管理看板 Zustand store（M483）
 * 聚合 /insurance/* 与 /emergency/* 六端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDipSettlement,
  fetchDrgSettlement,
  fetchEmergencyPlans,
  fetchEmergencySupplies,
  fetchExpenseAudit,
  fetchRejection,
  type DipSettlementRow,
  type DrgSettlementRow,
  type EmergencyPlanRow,
  type EmergencySupplyRow,
  type ExpenseAuditRow,
  type RejectionRow,
} from '@/services/api/insuranceBoard';

interface InsuranceBoardState {
  audit: ExpenseAuditRow[];
  drg: DrgSettlementRow[];
  dip: DipSettlementRow[];
  rejection: RejectionRow[];
  plans: EmergencyPlanRow[];
  supplies: EmergencySupplyRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useInsuranceBoardStore = create<InsuranceBoardState>((set) => ({
  audit: [],
  drg: [],
  dip: [],
  rejection: [],
  plans: [],
  supplies: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [a, d, p, r, ep, es] = await Promise.all([
        fetchExpenseAudit(),
        fetchDrgSettlement(),
        fetchDipSettlement(),
        fetchRejection(),
        fetchEmergencyPlans(),
        fetchEmergencySupplies(),
      ]);
      set({
        audit: a.data,
        drg: d.data,
        dip: p.data,
        rejection: r.data,
        plans: ep.data,
        supplies: es.data,
        demo: a.demo || d.demo || p.demo || r.demo || ep.demo || es.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '医保与应急看板加载失败',
      });
    }
  },
}));
