/**
 * 健澜科技 jlmedaios - 设备管理看板 Zustand store（M486）
 * 聚合 /equipment/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchLifecycle,
  fetchMaintenance,
  fetchUtilization,
  type LifecycleRow,
  type MaintenanceRow,
  type UtilizationRow,
} from '@/services/api/equipmentBoard';

interface EquipmentBoardState {
  lifecycle: LifecycleRow[];
  maintenance: MaintenanceRow[];
  utilization: UtilizationRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEquipmentBoardStore = create<EquipmentBoardState>((set) => ({
  lifecycle: [],
  maintenance: [],
  utilization: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [l, m, u] = await Promise.all([
        fetchLifecycle(),
        fetchMaintenance(),
        fetchUtilization(),
      ]);
      set({
        lifecycle: l.data,
        maintenance: m.data,
        utilization: u.data,
        demo: l.demo || m.demo || u.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '设备看板加载失败',
      });
    }
  },
}));
