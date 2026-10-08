/**
 * 健澜科技 jlmedaios - 临床路径管理 store（M15-A）
 *
 * 健康门禁 + 路径定义 + 可入径患者/入径 + 入径详情（表单/执行/变异）+ 退出/完成出径 + 质控指标。
 * 写操作失败 set error 并 rethrow（页面 fire-and-forget 用 run() 吞 rethrow，错误由 Alert 展示）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/pathway';
import type {
  EligiblePatient,
  EnrollmentDetail,
  PathwayDefinition,
  PathwayEnrollment,
  PathwayMetrics,
  VariationCategory,
} from '@/types/pathway';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface PathwayState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;

  definitions: PathwayDefinition[];
  eligible: EligiblePatient[];
  enrollments: PathwayEnrollment[];
  detail: EnrollmentDetail | null;
  metrics: PathwayMetrics | null;

  checkHealth: () => Promise<boolean>;
  loadDefinitions: () => Promise<void>;
  loadEligible: () => Promise<void>;
  loadEnrollments: () => Promise<void>;
  enroll: (body: {
    visitId: string;
    pathwayId: string;
    confirmedInclusion: string[];
    confirmedExclusion: string[];
  }) => Promise<void>;
  selectEnrollment: (id: string) => Promise<void>;
  executeFormItem: (enrollmentId: string, formItemId: string) => Promise<void>;
  skipFormItem: (
    enrollmentId: string,
    body: { formItemId: string; status: 'skipped' | 'replaced'; note?: string },
  ) => Promise<void>;
  recordVariation: (
    enrollmentId: string,
    body: { category: VariationCategory; description: string; stageDay?: number },
  ) => Promise<void>;
  withdraw: (enrollmentId: string, reason: string) => Promise<void>;
  complete: (enrollmentId: string, confirmedDischarge: string[]) => Promise<void>;
  loadMetrics: (from: string, to: string) => Promise<void>;
}

export const usePathwayStore = create<PathwayState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,

  definitions: [],
  eligible: [],
  enrollments: [],
  detail: null,
  metrics: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  async loadDefinitions() {
    set({ loading: true, error: null });
    try {
      set({ definitions: await api.listDefinitions({ status: 'active' }), loading: false });
    } catch (e) {
      set({ error: `加载路径定义失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadEligible() {
    set({ loading: true, error: null });
    try {
      set({ eligible: await api.listEligible(), loading: false });
    } catch (e) {
      set({ error: `加载可入径患者失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadEnrollments() {
    set({ loading: true, error: null });
    try {
      set({ enrollments: await api.listEnrollments(), loading: false });
    } catch (e) {
      set({ error: `加载入径记录失败：${errMsg(e)}`, loading: false });
    }
  },

  async enroll(body) {
    set({ error: null });
    try {
      await api.enroll(body);
      await Promise.all([get().loadEligible(), get().loadEnrollments()]);
    } catch (e) {
      set({ error: `入径失败：${errMsg(e)}` });
      throw e;
    }
  },

  async selectEnrollment(id) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getEnrollment(id), loading: false });
    } catch (e) {
      set({ error: `加载入径详情失败：${errMsg(e)}`, loading: false });
    }
  },

  async executeFormItem(enrollmentId, formItemId) {
    set({ error: null });
    try {
      await api.executeFormItem(enrollmentId, { formItemId });
      await get().selectEnrollment(enrollmentId);
    } catch (e) {
      set({ error: `一键下达失败：${errMsg(e)}` });
      throw e;
    }
  },

  async skipFormItem(enrollmentId, body) {
    set({ error: null });
    try {
      await api.skipFormItem(enrollmentId, body);
      await get().selectEnrollment(enrollmentId);
    } catch (e) {
      set({ error: `标记项目失败：${errMsg(e)}` });
      throw e;
    }
  },

  async recordVariation(enrollmentId, body) {
    set({ error: null });
    try {
      await api.recordVariation(enrollmentId, body);
      await get().selectEnrollment(enrollmentId);
    } catch (e) {
      set({ error: `记录变异失败：${errMsg(e)}` });
      throw e;
    }
  },

  async withdraw(enrollmentId, reason) {
    set({ error: null });
    try {
      await api.withdraw(enrollmentId, { reason });
      await Promise.all([get().selectEnrollment(enrollmentId), get().loadEnrollments()]);
    } catch (e) {
      set({ error: `退出路径失败：${errMsg(e)}` });
      throw e;
    }
  },

  async complete(enrollmentId, confirmedDischarge) {
    set({ error: null });
    try {
      await api.complete(enrollmentId, { confirmedDischarge });
      await Promise.all([get().selectEnrollment(enrollmentId), get().loadEnrollments()]);
    } catch (e) {
      set({ error: `完成出径失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadMetrics(from, to) {
    set({ loading: true, error: null });
    try {
      set({ metrics: await api.getPathwayMetrics(from, to), loading: false });
    } catch (e) {
      set({ error: `加载临床路径质控指标失败：${errMsg(e)}`, loading: false });
    }
  },
}));
