/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 科室管理与运营 - Zustand 状态管理
 */
import { create } from 'zustand';
import type {
  DepartmentInfo,
  OverviewData,
  OperationAnalysis,
  DRGDAnalysis,
  QualityIndicators,
  StaffInfo,
  Schedule,
  Performance,
  EquipmentInfo,
  Consumable,
  InventoryAlert,
  EquipmentStats,
  StaffStats,
} from '@/types/operation';
import { delay } from '@/mock/utils';
import {
  mockDepartment,
  mockOverview,
  mockOperationAnalysis,
  mockDRGDAnalysis,
  mockQualityIndicators,
  mockStaffList,
  mockSchedule,
  mockPerformance,
  mockStaffStats,
  mockEquipmentList,
  mockConsumables,
  mockInventoryAlerts,
  mockEquipmentStats,
} from '@/mock/operationMock';

interface OperationState {
  loading: boolean;
  department: DepartmentInfo;
  overview: OverviewData;
  analysis: OperationAnalysis;
  drgDip: DRGDAnalysis;
  qualityIndicators: QualityIndicators;
  staffList: StaffInfo[];
  schedule: Schedule[];
  performance: Performance[];
  staffStats: StaffStats;
  equipmentList: EquipmentInfo[];
  consumables: Consumable[];
  inventoryAlerts: InventoryAlert[];
  equipmentStats: EquipmentStats;
  lastUpdated: Date | null;

  // Actions
  fetchDepartmentInfo: () => Promise<void>;
  fetchOverview: () => Promise<void>;
  fetchAnalysis: () => Promise<void>;
  fetchDRGDAnalysis: () => Promise<void>;
  fetchQualityIndicators: () => Promise<void>;
  fetchStaffList: () => Promise<void>;
  fetchEquipmentList: () => Promise<void>;
  updateStaff: (staffId: string, patch: Partial<StaffInfo>) => void;
  updateEquipment: (equipId: string, patch: Partial<EquipmentInfo>) => void;
}

export const useOperationStore = create<OperationState>()((set) => ({
  loading: false,
  department: mockDepartment,
  overview: mockOverview,
  analysis: mockOperationAnalysis,
  drgDip: mockDRGDAnalysis,
  qualityIndicators: mockQualityIndicators,
  staffList: mockStaffList,
  schedule: mockSchedule,
  performance: mockPerformance,
  staffStats: mockStaffStats,
  equipmentList: mockEquipmentList,
  consumables: mockConsumables,
  inventoryAlerts: mockInventoryAlerts,
  equipmentStats: mockEquipmentStats,
  lastUpdated: new Date(),

  fetchDepartmentInfo: async () => {
    set({ loading: true });
    await delay(150, 350);
    set({ department: mockDepartment, loading: false, lastUpdated: new Date() });
  },

  fetchOverview: async () => {
    set({ loading: true });
    await delay(200, 400);
    set({ overview: mockOverview, loading: false, lastUpdated: new Date() });
  },

  fetchAnalysis: async () => {
    set({ loading: true });
    await delay(250, 500);
    set({ analysis: mockOperationAnalysis, loading: false, lastUpdated: new Date() });
  },

  fetchDRGDAnalysis: async () => {
    set({ loading: true });
    await delay(250, 500);
    set({ drgDip: mockDRGDAnalysis, loading: false, lastUpdated: new Date() });
  },

  fetchQualityIndicators: async () => {
    set({ loading: true });
    await delay(200, 450);
    set({ qualityIndicators: mockQualityIndicators, loading: false, lastUpdated: new Date() });
  },

  fetchStaffList: async () => {
    set({ loading: true });
    await delay(200, 400);
    set({
      staffList: mockStaffList,
      schedule: mockSchedule,
      performance: mockPerformance,
      staffStats: mockStaffStats,
      loading: false,
      lastUpdated: new Date(),
    });
  },

  fetchEquipmentList: async () => {
    set({ loading: true });
    await delay(200, 400);
    set({
      equipmentList: mockEquipmentList,
      consumables: mockConsumables,
      inventoryAlerts: mockInventoryAlerts,
      equipmentStats: mockEquipmentStats,
      loading: false,
      lastUpdated: new Date(),
    });
  },

  updateStaff: (staffId, patch) =>
    set((state) => ({
      staffList: state.staffList.map((s) => (s.staffId === staffId ? { ...s, ...patch } : s)),
    })),

  updateEquipment: (equipId, patch) =>
    set((state) => ({
      equipmentList: state.equipmentList.map((e) =>
        e.equipId === equipId ? { ...e, ...patch } : e,
      ),
    })),
}));

// ============ Selectors ============
export const selectBedStats = (s: OperationState) => {
  const beds = s.overview.bedUsage.beds;
  return {
    in: beds.filter((b) => b.status === 'in').length,
    empty: beds.filter((b) => b.status === 'empty').length,
    preDischarge: beds.filter((b) => b.status === 'pre_discharge').length,
    isolated: beds.filter((b) => b.status === 'isolated').length,
  };
};

export const selectProfitSummary = (s: OperationState) => s.drgDip.profitOverview;
