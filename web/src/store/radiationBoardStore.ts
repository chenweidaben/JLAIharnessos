/**
 * 健澜科技 jlmedaios - 放射防护监控看板 Zustand store（M520）
 * 聚合 /radiation/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDoses,
  fetchEquipment,
  fetchPersonnel,
  type DoseRow,
  type EquipmentRow,
  type PersonnelRow,
} from '@/services/api/radiationBoard';

interface RadiationBoardState {
  doses: DoseRow[];
  equipment: EquipmentRow[];
  personnel: PersonnelRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useRadiationBoardStore = create<RadiationBoardState>((set) => ({
  doses: [],
  equipment: [],
  personnel: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [d, e, p] = await Promise.all([
        fetchDoses(),
        fetchEquipment(),
        fetchPersonnel(),
      ]);
      set({
        doses: d.data,
        equipment: e.data,
        personnel: p.data,
        demo: d.demo || e.demo || p.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '放射防护看板加载失败',
      });
    }
  },
}));
