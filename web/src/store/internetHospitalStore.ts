/**
 * 健澜科技 jlmedaios - 互联网医院管理端 store（M3-J）
 *
 * 医护线上资质列表、审核（通过/驳回）。健康门禁：BFF/DB 不可用时阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import type { InternetPractitionerView } from '@/types/internetHospital';
import * as api from '../services/api/internetHospital';
import { getSystemHealth } from '@/services/api/pharmacy';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface InternetHospitalState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  list: InternetPractitionerView[];
  loading: boolean;
  statusFilter: string | undefined;

  auditing: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  setStatusFilter: (status: string | undefined) => void;
  audit: (id: string, decision: 'approved' | 'rejected', reason?: string) => Promise<boolean>;
  clearError: () => void;
}

export const useInternetHospitalStore = create<InternetHospitalState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  list: [],
  loading: false,
  statusFilter: undefined,

  auditing: false,
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

  load: async () => {
    set({ loading: true, error: null });
    try {
      const list = await api.listPractitioners(get().statusFilter);
      set({ list, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  setStatusFilter: (status) => {
    set({ statusFilter: status });
    void get().load();
  },

  audit: async (id, decision, reason) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法审核资质' });
      return false;
    }
    set({ auditing: true, error: null });
    try {
      await api.auditPractitioner(id, decision, reason);
      set({ auditing: false });
      await get().load();
      return true;
    } catch (e) {
      set({ auditing: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
