/**
 * 健澜科技 jlmedaios - 护理管理后台状态管理（M16-B，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/nursingAdmin），无 mock：
 *  - 启动先探活 /system/health，BFF/DB 不可用时 dbUp=false 并显式报错，红色 Alert+水印、不渲染业务数据；
 *  - 排班看板 / 指标库按病区/周异步加载；写操作经健康门禁，失败 set error 并 rethrow（不吞、不假成功）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import * as api from '@/services/api/nursingAdmin';
import { getSystemHealth } from '@/services/api/care';
import type { CareHealth } from '@/types/care';
import type {
  IndicatorEntry,
  IndicatorLibraryView,
  LeaveRequest,
  LeaveType,
  ScheduleAssignment,
  ScheduleBoard,
  ShiftDef,
} from '@/types/nursingAdmin';

interface NursingAdminState {
  dbUp: boolean | null;
  health: CareHealth | null;
  loadingHealth: boolean;

  board: ScheduleBoard | null;
  library: IndicatorLibraryView | null;

  loadingBoard: boolean;
  loadingLibrary: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadBoard: (wardCode: string, weekStart: string) => Promise<void>;
  loadLibrary: () => Promise<void>;

  upsertShift: (payload: Partial<ShiftDef>) => Promise<unknown>;
  assignShift: (payload: Partial<ScheduleAssignment>) => Promise<unknown>;
  removeAssignment: (id: string) => Promise<void>;
  createLeave: (payload: {
    wardCode: string;
    nurseId: string;
    nurseName: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason?: string;
  }) => Promise<LeaveRequest>;
  publish: (wardCode: string, period: string, note?: string) => Promise<unknown>;
  submitEntry: (payload: {
    indicatorCode: string;
    period: string;
    numerator: number;
    denominator: number;
    note?: string;
  }) => Promise<IndicatorEntry>;
  verifyEntry: (id: string) => Promise<IndicatorEntry>;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingAdminStore = create<NursingAdminState>((set, get) => {
  const requireReady = (): void => {
    if (get().dbUp !== true) throw new Error('BFF 或数据库不可用，禁止写操作');
  };

  return {
    dbUp: null,
    health: null,
    loadingHealth: false,
    board: null,
    library: null,
    loadingBoard: false,
    loadingLibrary: false,
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

    loadBoard: async (wardCode, weekStart) => {
      set({ loadingBoard: true, error: null });
      try {
        const board = await api.getScheduleBoard(wardCode, weekStart);
        set({ board, loadingBoard: false });
      } catch (e) {
        set({ loadingBoard: false, error: errMsg(e, '排班看板加载失败') });
      }
    },

    loadLibrary: async () => {
      set({ loadingLibrary: true, error: null });
      try {
        const library = await api.getIndicatorLibrary();
        set({ library, loadingLibrary: false });
      } catch (e) {
        set({ loadingLibrary: false, error: errMsg(e, '指标库加载失败') });
      }
    },

    upsertShift: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.upsertShift(payload);
      } catch (e) {
        set({ error: errMsg(e, '班次保存失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    assignShift: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.assignShift(payload);
      } catch (e) {
        set({ error: errMsg(e, '排班失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    removeAssignment: async (id) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        await api.removeAssignment(id);
      } catch (e) {
        set({ error: errMsg(e, '取消排班失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    createLeave: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.createLeave(payload);
      } catch (e) {
        set({ error: errMsg(e, '休假登记失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    publish: async (wardCode, period, note) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.publishSchedule({ wardCode, period, note });
      } catch (e) {
        set({ error: errMsg(e, '发布失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    submitEntry: async (payload) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.submitIndicatorEntry(payload);
      } catch (e) {
        set({ error: errMsg(e, '指标录入失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    verifyEntry: async (id) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.verifyIndicatorEntry(id);
      } catch (e) {
        set({ error: errMsg(e, '指标核实/上报失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },
  };
});
