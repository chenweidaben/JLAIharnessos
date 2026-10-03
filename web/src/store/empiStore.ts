/* ============================================================================
 * 健澜科技杠OS - EMPI 患者主索引状态管理（M5-C）
 *
 * 真实 BFF：标识登记、扫描匹配、候选确认/拒绝、链接查询。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as empiApi from '@/services/api/empi';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  EmpiLink,
  EmpiScanSummary,
  MatchCandidate,
  RegisterIdentifierInput,
} from '@/types/empi';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface EmpiState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  candidates: MatchCandidate[];
  links: EmpiLink[];
  loading: boolean;
  scanning: boolean;
  scanSummary: EmpiScanSummary | null;
  submitting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadAll: () => Promise<void>;
  runScan: () => Promise<boolean>;
  confirm: (id: string) => Promise<boolean>;
  reject: (id: string) => Promise<boolean>;
  registerIdentifier: (input: RegisterIdentifierInput) => Promise<boolean>;
  clearError: () => void;
}

export const useEmpiStore = create<EmpiState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  candidates: [],
  links: [],
  loading: false,
  scanning: false,
  scanSummary: null,
  submitting: false,
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
      const [candidates, links] = await Promise.all([
        empiApi.fetchCandidates(),
        empiApi.fetchEmpiLinks(),
      ]);
      set({ candidates, links, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  runScan: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法扫描' });
      return false;
    }
    set({ scanning: true, error: null, scanSummary: null });
    try {
      const summary = await empiApi.runEmpiScanApi();
      set({ scanning: false, scanSummary: summary });
      await get().loadAll();
      return true;
    } catch (e) {
      set({ scanning: false, error: errMsg(e) });
      return false;
    }
  },

  confirm: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法确认' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await empiApi.confirmCandidateApi(id);
      set({ submitting: false });
      await get().loadAll();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  reject: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法拒绝' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await empiApi.rejectCandidateApi(id);
      set({ submitting: false });
      await get().loadAll();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  registerIdentifier: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法登记标识' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await empiApi.registerIdentifierApi(input);
      set({ submitting: false });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
