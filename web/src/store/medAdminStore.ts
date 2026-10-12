/**
 * 健澜科技 jlmedaios - 给药三查七对状态管理（M17-B，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/medAdmin），无 mock：
 *  - 启动先探活 /system/health，BFF/DB 不可用时 dbUp=false 并显式报错，红色 Alert+水印、不渲染业务数据；
 *  - 给药记录/指标异步加载；写操作经健康门禁，失败 set error 并 rethrow（不吞、不假成功）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import * as api from '@/services/api/medAdmin';
import { getSystemHealth } from '@/services/api/care';
import type { CareHealth } from '@/types/care';
import type {
  ExecuteMedPayload,
  ExecuteMedResultView,
  MedAdministration,
  MedErrorMetricsResponse,
} from '@/types/medAdmin';

interface MedAdminState {
  dbUp: boolean | null;
  health: CareHealth | null;
  loadingHealth: boolean;

  records: MedAdministration[];
  metrics: MedErrorMetricsResponse | null;

  loadingRecords: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadRecords: (visitId?: string) => Promise<void>;
  loadMetrics: () => Promise<void>;
  execute: (payload: ExecuteMedPayload) => Promise<ExecuteMedResultView>;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedAdminStore = create<MedAdminState>((set, get) => {
  const requireReady = (): void => {
    if (get().dbUp !== true) throw new Error('BFF 或数据库不可用，禁止写操作');
  };

  return {
    dbUp: null,
    health: null,
    loadingHealth: false,
    records: [],
    metrics: null,
    loadingRecords: false,
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

    loadRecords: async (visitId) => {
      set({ loadingRecords: true, error: null });
      try {
        const records = await api.listMedAdmins({ visitId });
        set({ records, loadingRecords: false });
      } catch (e) {
        set({ loadingRecords: false, error: errMsg(e, '给药记录加载失败') });
      }
    },

    loadMetrics: async () => {
      set({ error: null });
      try {
        const metrics = await api.getMedErrorMetrics();
        set({ metrics });
      } catch (e) {
        set({ error: errMsg(e, '给药差错指标加载失败') });
      }
    },

    execute: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.executeMed(payload);
      } catch (e) {
        set({ error: errMsg(e, '给药执行失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },
  };
});
