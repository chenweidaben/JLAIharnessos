/**
 * 健澜科技 jlmedaios - VTE 智能防治 store（M13-A）
 *
 * 健康门禁 + 高危看板 + 评估/预防/结局 + 质控指标。
 * 写操作失败 set error 并 rethrow（页面 fire-and-forget 用 run() 吞 rethrow，错误由 Alert 展示）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/vte';
import type {
  VteAssessment,
  VteHighRiskItem,
  VteMetricsResponse,
  VteOutcome,
  VtePrevention,
  VteVisitDetail,
} from '@/types/vte';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface VteState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;
  highRiskList: VteHighRiskItem[];
  metrics: VteMetricsResponse | null;
  visitDetail: VteVisitDetail | null;
  assessmentList: VteAssessment[];
  preventionList: VtePrevention[];
  outcomeList: VteOutcome[];
  lastVisitId: string;

  checkHealth: () => Promise<boolean>;
  loadHighRisk: () => Promise<void>;
  loadMetrics: (from: string, to: string) => Promise<void>;
  loadVisitDetail: (visitId: string) => Promise<void>;
  loadAssessments: (visitId?: string) => Promise<void>;
  loadPreventions: (visitId?: string) => Promise<void>;
  loadOutcomes: (visitId?: string) => Promise<void>;
  refreshAfterWrite: () => Promise<void>;
  assess: (body: api.AssessVteBody) => Promise<void>;
  confirm: (id: string, overrideReason?: string) => Promise<void>;
  execute: (id: string) => Promise<void>;
  contraindicate: (id: string, reason: string) => Promise<void>;
  recordOutcome: (body: api.RecordOutcomeBody) => Promise<void>;
}

export const useVteStore = create<VteState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,
  highRiskList: [],
  metrics: null,
  visitDetail: null,
  assessmentList: [],
  preventionList: [],
  outcomeList: [],
  lastVisitId: '',

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

  async loadHighRisk() {
    set({ loading: true, error: null });
    try {
      set({ highRiskList: await api.listHighRisk(), loading: false });
    } catch (e) {
      set({ error: `加载高危患者看板失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadMetrics(from, to) {
    set({ loading: true, error: null });
    try {
      set({ metrics: await api.getVteMetrics(from, to), loading: false });
    } catch (e) {
      set({ error: `加载 VTE 质控指标失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadVisitDetail(visitId) {
    set({ loading: true, error: null });
    try {
      set({ visitDetail: await api.getVisitDetail(visitId), loading: false, lastVisitId: visitId });
    } catch (e) {
      set({ error: `加载就诊 VTE 详情失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadAssessments(visitId) {
    set({ loading: true, error: null });
    try {
      set({ assessmentList: await api.listAssessments(visitId ? { visitId } : undefined), loading: false });
    } catch (e) {
      set({ error: `加载评估列表失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadPreventions(visitId) {
    set({ loading: true, error: null });
    try {
      set({ preventionList: await api.listPreventions(visitId ? { visitId } : undefined), loading: false });
    } catch (e) {
      set({ error: `加载预防措施失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadOutcomes(visitId) {
    set({ loading: true, error: null });
    try {
      set({ outcomeList: await api.listOutcomes(visitId ? { visitId } : undefined), loading: false });
    } catch (e) {
      set({ error: `加载结局/不良事件失败：${errMsg(e)}`, loading: false });
    }
  },

  /** 写后刷新：若已加载某就诊详情则刷新该详情与高危看板。 */
  async refreshAfterWrite() {
    const { lastVisitId } = get();
    await Promise.all([
      get().loadHighRisk(),
      ...(lastVisitId ? [get().loadVisitDetail(lastVisitId)] : []),
    ]);
  },

  async assess(body) {
    set({ error: null });
    try {
      await api.assessVte(body);
      await get().refreshAfterWrite();
    } catch (e) {
      set({ error: `风险评估提交失败：${errMsg(e)}` });
      throw e;
    }
  },

  async confirm(id, overrideReason) {
    set({ error: null });
    try {
      await api.confirmPrevention(id, overrideReason);
      await get().refreshAfterWrite();
    } catch (e) {
      set({ error: `药物预防确认失败：${errMsg(e)}` });
      throw e;
    }
  },

  async execute(id) {
    set({ error: null });
    try {
      await api.executePrevention(id);
      await get().refreshAfterWrite();
    } catch (e) {
      set({ error: `机械预防执行失败：${errMsg(e)}` });
      throw e;
    }
  },

  async contraindicate(id, reason) {
    set({ error: null });
    try {
      await api.contraindicatePrevention(id, reason);
      await get().refreshAfterWrite();
    } catch (e) {
      set({ error: `标记禁忌失败：${errMsg(e)}` });
      throw e;
    }
  },

  async recordOutcome(body) {
    set({ error: null });
    try {
      await api.recordOutcome(body);
      await get().refreshAfterWrite();
    } catch (e) {
      set({ error: `记录结局/不良事件失败：${errMsg(e)}` });
      throw e;
    }
  },
}));
