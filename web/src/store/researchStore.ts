/**
 * 健澜科技 jlmedaios - 科研专病队列状态管理（M5-B）
 *
 * 真实 BFF：队列创建/编辑/发布/归档、运行匹配、成员、统计、脱敏导出。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as researchApi from '@/services/api/research';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  CohortMember,
  CohortStats,
  CohortRunResult,
  CreateCohortInput,
  ResearchCohort,
} from '@/types/research';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface ResearchState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  cohorts: ResearchCohort[];
  loading: boolean;

  current: ResearchCohort | null;
  currentId: string | null;
  members: CohortMember[];
  stats: CohortStats | null;

  running: boolean;
  runResult: CohortRunResult | null;
  submitting: boolean;
  exportRows: Array<Record<string, unknown>> | null;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadCohorts: (status?: string) => Promise<void>;
  openCohort: (id: string) => Promise<boolean>;
  createCohort: (input: CreateCohortInput) => Promise<boolean>;
  updateCohort: (id: string, patch: Partial<CreateCohortInput>) => Promise<boolean>;
  publishCohort: (id: string) => Promise<boolean>;
  archiveCohort: (id: string) => Promise<boolean>;
  runMatching: (id: string) => Promise<boolean>;
  doExport: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export const useResearchStore = create<ResearchState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  cohorts: [],
  loading: false,

  current: null,
  currentId: null,
  members: [],
  stats: null,

  running: false,
  runResult: null,
  submitting: false,
  exportRows: null,
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

  loadCohorts: async (status) => {
    set({ loading: true, error: null });
    try {
      const cohorts = await researchApi.fetchCohorts(status);
      set({ cohorts, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openCohort: async (id) => {
    set({ loading: true, error: null, currentId: id, exportRows: null });
    try {
      const current = await researchApi.fetchCohort(id);
      const members = await researchApi.fetchCohortMembers(id);
      let stats: CohortStats | null = null;
      try {
        stats = await researchApi.fetchCohortStats(id);
      } catch {
        stats = null;
      }
      set({ current, members, stats, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, current: null, members: [], stats: null, error: errMsg(e) });
      return false;
    }
  },

  createCohort: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法创建队列' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      const cohort = await researchApi.createCohortApi(input);
      set({ submitting: false });
      await get().loadCohorts();
      return await get().openCohort(cohort.id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  updateCohort: async (id, patch) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法保存' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await researchApi.updateCohortApi(id, patch);
      set({ submitting: false });
      await get().loadCohorts();
      return await get().openCohort(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  publishCohort: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法发布' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await researchApi.publishCohort(id);
      set({ submitting: false });
      await get().loadCohorts();
      return await get().openCohort(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  archiveCohort: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法归档' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await researchApi.archiveCohort(id);
      set({ submitting: false });
      await get().loadCohorts();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  runMatching: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法运行匹配' });
      return false;
    }
    set({ running: true, error: null, runResult: null });
    try {
      const result = await researchApi.runCohort(id);
      set({ running: false, runResult: result });
      await get().openCohort(id);
      return true;
    } catch (e) {
      set({ running: false, error: errMsg(e) });
      return false;
    }
  },

  doExport: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法导出' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      const rows = await researchApi.exportCohort(id);
      set({ submitting: false, exportRows: rows });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
