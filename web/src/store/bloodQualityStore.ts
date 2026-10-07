/**
 * 健澜科技 jlmedaios - 临床用血质量 store（M10-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/bloodQuality';
import type {
  BloodQualityDetail,
  EfficacyAssessment,
  QualityMetricsResponse,
  UtilizationReview,
} from '@/types/bloodQuality';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface BloodQualityState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;
  metrics: QualityMetricsResponse | null;
  efficacyList: EfficacyAssessment[];
  utilizationList: UtilizationReview[];
  detail: BloodQualityDetail | null;

  checkHealth: () => Promise<boolean>;
  loadMetrics: (from: string, to: string) => Promise<void>;
  loadEfficacyList: () => Promise<void>;
  loadUtilizationList: () => Promise<void>;
  loadDetail: (requestId: string) => Promise<void>;
  assess: (body: api.AssessEfficacyBody) => Promise<void>;
  review: (body: api.ReviewUtilizationBody) => Promise<void>;
}

export const useBloodQualityStore = create<BloodQualityState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,
  metrics: null,
  efficacyList: [],
  utilizationList: [],
  detail: null,

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

  async loadMetrics(from, to) {
    set({ loading: true, error: null });
    try {
      set({ metrics: await api.getQualityMetrics(from, to), loading: false });
    } catch (e) {
      set({ error: `加载质控指标失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadEfficacyList() {
    set({ loading: true, error: null });
    try {
      set({ efficacyList: await api.listEfficacy(), loading: false });
    } catch (e) {
      set({ error: `加载疗效评估列表失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadUtilizationList() {
    set({ loading: true, error: null });
    try {
      set({ utilizationList: await api.listUtilization(), loading: false });
    } catch (e) {
      set({ error: `加载合理性评价列表失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadDetail(requestId) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getBloodQualityDetail(requestId), loading: false });
    } catch (e) {
      set({ error: `加载用血详情失败：${errMsg(e)}`, loading: false });
    }
  },

  async assess(body) {
    set({ error: null });
    try {
      await api.assessEfficacy(body);
      await get().loadDetail(body.requestId);
      await get().loadEfficacyList();
    } catch (e) {
      set({ error: `疗效评估失败：${errMsg(e)}` });
      throw e;
    }
  },

  async review(body) {
    set({ error: null });
    try {
      await api.reviewUtilization(body);
      await get().loadDetail(body.requestId);
      await get().loadUtilizationList();
    } catch (e) {
      set({ error: `合理性评价失败：${errMsg(e)}` });
      throw e;
    }
  },
}));
