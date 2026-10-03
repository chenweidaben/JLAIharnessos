/* ============================================================================
 * 健澜科技杠OS - 数据湖仓状态管理（M5-D）
 *
 * 真实 BFF：触发湖仓加工、查询运行历史/血缘、科室/院级指标。
 * 健康门禁：BFF/DB 不可用时阻断加工并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as dwApi from '@/services/api/dataWarehouse';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  DeptDailySummaryView,
  HospitalDailyMetricView,
  JobCode,
  JobRunView,
  LineageView,
  PipelineRunSummary,
  RunMode,
} from '@/types/dataWarehouse';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface DwState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  metrics: HospitalDailyMetricView[];
  deptSummary: DeptDailySummaryView[];
  runs: JobRunView[];
  lineage: LineageView[];
  loading: boolean;
  running: boolean;
  lastRun: PipelineRunSummary | null;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadAll: () => Promise<void>;
  runPipeline: (mode: RunMode) => Promise<boolean>;
  runJob: (jobCode: JobCode) => Promise<boolean>;
  clearError: () => void;
}

export const useDataWarehouseStore = create<DwState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  metrics: [],
  deptSummary: [],
  runs: [],
  lineage: [],
  loading: false,
  running: false,
  lastRun: null,
  error: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ health, dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        health: null,
        dbUp: false,
        healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [metrics, deptSummary, runs, lineage] = await Promise.all([
        dwApi.fetchHospitalMetrics(),
        dwApi.fetchDeptSummary(),
        dwApi.fetchJobRuns(),
        dwApi.fetchLineage(),
      ]);
      set({ metrics, deptSummary, runs, lineage, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  runPipeline: async (mode) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法加工' });
      return false;
    }
    set({ running: true, error: null, lastRun: null });
    try {
      const summary = await dwApi.runPipelineApi(mode);
      set({ running: false, lastRun: summary });
      await get().loadAll();
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  runJob: async (jobCode) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法重跑作业' });
      return false;
    }
    set({ running: true, error: null, lastRun: null });
    try {
      const summary = await dwApi.runJobApi(jobCode);
      set({ running: false, lastRun: summary });
      await get().loadAll();
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
