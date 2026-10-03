/* ============================================================================
 * 健澜科技杠OS - 数据治理状态管理（M5-E）
 *
 * 真实 BFF：质量检测、评分/趋势/结果/规则、隐私分级扫描/台账/人工修正。
 * 健康门禁：BFF/DB 不可用时阻断检测/修正并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as govApi from '@/services/api/dataGovernance';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  ClassificationView,
  DqRuleView,
  QualityRunSummary,
  QualityRunView,
  RuleResultView,
} from '@/types/dataGovernance';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface GovState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  latestRun: QualityRunView | null;
  trend: QualityRunView[];
  detailRun: QualityRunView | null;
  detailResults: RuleResultView[];
  rules: DqRuleView[];
  classification: ClassificationView[];
  lastSummary: QualityRunSummary | null;

  loading: boolean;
  running: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadOverview: () => Promise<void>;
  loadResults: (runId?: string) => Promise<boolean>;
  loadRules: () => Promise<void>;
  loadClassification: (filter?: {
    schema?: string;
    level?: number;
  }) => Promise<void>;
  runQualityCheck: () => Promise<boolean>;
  scanClassification: () => Promise<boolean>;
  overrideClassification: (input: {
    schemaName: string;
    tableName: string;
    columnName: string;
    level: number;
    reason?: string;
  }) => Promise<boolean>;
  clearError: () => void;
}

export const useDataGovernanceStore = create<GovState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  latestRun: null,
  trend: [],
  detailRun: null,
  detailResults: [],
  rules: [],
  classification: [],
  lastSummary: null,

  loading: false,
  running: false,
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

  loadOverview: async () => {
    set({ loading: true, error: null });
    try {
      const [latestRun, trend] = await Promise.all([
        govApi.fetchLatestRun(),
        govApi.fetchQualityTrend(10),
      ]);
      set({ latestRun, trend, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadResults: async (runId) => {
    set({ loading: true, error: null });
    try {
      const { run, results } = await govApi.fetchRunResults(runId);
      set({ detailRun: run, detailResults: results, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
      return false;
    }
  },

  loadRules: async () => {
    set({ loading: true, error: null });
    try {
      const rules = await govApi.fetchRules();
      set({ rules, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadClassification: async (filter) => {
    set({ loading: true, error: null });
    try {
      const classification = await govApi.fetchClassification(filter);
      set({ classification, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  runQualityCheck: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法执行质量检测' });
      return false;
    }
    set({ running: true, error: null, lastSummary: null });
    try {
      const summary = await govApi.runQualityCheckApi();
      set({ running: false, lastSummary: summary });
      await get().loadOverview();
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  scanClassification: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法扫描分级' });
      return false;
    }
    set({ running: true, error: null });
    try {
      await govApi.scanClassificationApi();
      set({ running: false });
      await get().loadClassification();
      set({ error: null, lastSummary: null });
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  overrideClassification: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法修正分级' });
      return false;
    }
    set({ running: true, error: null });
    try {
      await govApi.overrideClassificationApi(input);
      set({ running: false });
      await get().loadClassification();
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
