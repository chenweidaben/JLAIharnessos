/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警状态管理（M17-A，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/nursingRisk），无 mock：
 *  - 启动先探活 /system/health，BFF/DB 不可用时 dbUp=false 并显式报错，红色 Alert+水印、不渲染业务数据；
 *  - 高危看板/评估/事件/指标异步加载；写操作经健康门禁，失败 set error 并 rethrow（不吞、不假成功）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import * as api from '@/services/api/nursingRisk';
import { getSystemHealth } from '@/services/api/care';
import type { CareHealth } from '@/types/care';
import type {
  AssessResultView,
  HighRiskBoardItem,
  NursingRiskAssessment,
  NursingRiskEvent,
  NursingRiskPrevention,
  RiskEventType,
  RiskMetricsView,
  RiskType,
  VisitDetailView,
} from '@/types/nursingRisk';

interface NursingRiskState {
  dbUp: boolean | null;
  health: CareHealth | null;
  loadingHealth: boolean;

  board: HighRiskBoardItem[];
  assessments: NursingRiskAssessment[];
  preventions: NursingRiskPrevention[];
  events: NursingRiskEvent[];
  metrics: RiskMetricsView | null;
  detail: VisitDetailView | null;

  loadingBoard: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadBoard: () => Promise<void>;
  loadAssessments: (visitId?: string) => Promise<void>;
  loadEvents: (visitId?: string) => Promise<void>;
  loadMetrics: (from: string, to: string) => Promise<void>;
  loadDetail: (visitId: string) => Promise<void>;

  assess: (payload: { visitId: string; riskType: RiskType; items: Record<string, number>; note?: string }) => Promise<AssessResultView>;
  accept: (id: string) => Promise<NursingRiskPrevention>;
  execute: (id: string, signature: string) => Promise<{ prevention: NursingRiskPrevention; nursingTaskId: string | null }>;
  cancel: (id: string) => Promise<NursingRiskPrevention>;
  recordEvent: (payload: { visitId: string; eventType: RiskEventType; description?: string; occurredAt?: string }) => Promise<NursingRiskEvent>;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingRiskStore = create<NursingRiskState>((set, get) => {
  const requireReady = (): void => {
    if (get().dbUp !== true) throw new Error('BFF 或数据库不可用，禁止写操作');
  };

  return {
    dbUp: null,
    health: null,
    loadingHealth: false,
    board: [],
    assessments: [],
    preventions: [],
    events: [],
    metrics: null,
    detail: null,
    loadingBoard: false,
    acting: false,
    error: null,

    checkHealth: async () => {
      set({ loadingHealth: true, error: null });
      try {
        const health = await getSystemHealth();
        const up = health.db === 'up' || health.db === 'skipped';
        set({ health, dbUp: up, loadingHealth: false });
        return up;
      } catch (e) {
        set({ dbUp: false, loadingHealth: false, error: errMsg(e, 'BFF 或数据库不可用') });
        return false;
      }
    },

    loadBoard: async () => {
      set({ loadingBoard: true, error: null });
      try {
        const board = await api.getHighRiskBoard();
        set({ board, loadingBoard: false });
      } catch (e) {
        set({ loadingBoard: false, error: errMsg(e, '高危看板加载失败') });
      }
    },

    loadAssessments: async (visitId) => {
      set({ error: null });
      try {
        const assessments = await api.listAssessments({ visitId });
        set({ assessments });
      } catch (e) {
        set({ error: errMsg(e, '评估列表加载失败') });
      }
    },

    loadEvents: async (visitId) => {
      set({ error: null });
      try {
        const events = await api.listEvents({ visitId });
        set({ events });
      } catch (e) {
        set({ error: errMsg(e, '事件列表加载失败') });
      }
    },

    loadMetrics: async (from, to) => {
      set({ error: null });
      try {
        const metrics = await api.getRiskMetrics({ from, to });
        set({ metrics });
      } catch (e) {
        set({ error: errMsg(e, '指标加载失败') });
      }
    },

    loadDetail: async (visitId) => {
      set({ error: null });
      try {
        const detail = await api.getVisitDetail(visitId);
        set({ detail, preventions: detail.preventions });
      } catch (e) {
        set({ error: errMsg(e, '就诊详情加载失败') });
      }
    },

    assess: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.assessRisk(payload);
      } catch (e) {
        set({ error: errMsg(e, '风险评估登记失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    accept: async (id) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.acceptPrevention(id);
      } catch (e) {
        set({ error: errMsg(e, '预防确认失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    execute: async (id, signature) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.executePrevention(id, { signature });
      } catch (e) {
        set({ error: errMsg(e, '预防执行失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    cancel: async (id) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.cancelPrevention(id);
      } catch (e) {
        set({ error: errMsg(e, '预防取消失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    recordEvent: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.recordEvent(payload);
      } catch (e) {
        set({ error: errMsg(e, '结局事件登记失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },
  };
});
