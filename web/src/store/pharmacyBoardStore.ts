/**
 * 健澜科技 jlmedaios - 药学管理看板 Zustand store（M484）
 * 聚合 /pharmacy/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchInventory,
  fetchPrescriptionReview,
  fetchSpecialDrug,
  type InventoryRow,
  type PrescriptionReviewRow,
  type SpecialDrugRow,
} from '@/services/api/pharmacyBoard';

interface PharmacyBoardState {
  inventory: InventoryRow[];
  review: PrescriptionReviewRow[];
  special: SpecialDrugRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const usePharmacyBoardStore = create<PharmacyBoardState>((set) => ({
  inventory: [],
  review: [],
  special: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [inv, rv, sp] = await Promise.all([
        fetchInventory(),
        fetchPrescriptionReview(),
        fetchSpecialDrug(),
      ]);
      set({
        inventory: inv.data,
        review: rv.data,
        special: sp.data,
        demo: inv.demo || rv.demo || sp.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '药学看板加载失败',
      });
    }
  },
}));
