/**
 * 健澜科技 jlmedaios - 住院工作台状态管理（M1-A ADT，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/inpatient），无 mock：
 *  - 启动先探活 /system/health，BFF/数据库不可用时 ready=false 并显式报错；
 *  - 床位图、在院列表异步加载；ADT 写操作成功后自动刷新读模型。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type {
  AdmitPayload,
  BedMapResponse,
  InpatientBedStatus,
  InpatientDetail,
  InpatientListItem,
  SystemHealth,
} from '@/types/inpatient';
import * as api from '@/services/api/inpatient';

export interface InpatientQuery {
  campusCode?: string;
  department?: string;
  wardId?: string;
}

interface InpatientState {
  /** 后端就绪状态：null=探测中 / true=就绪 / false=不可用 */
  ready: boolean | null;
  health: SystemHealth | null;
  bedMap: BedMapResponse | null;
  patients: InpatientListItem[];
  total: number;
  selectedVisitId: string | null;
  detail: InpatientDetail | null;

  loadingHealth: boolean;
  loadingMap: boolean;
  loadingList: boolean;
  loadingDetail: boolean;
  acting: boolean;
  error: string | null;

  query: InpatientQuery;

  checkHealth: () => Promise<void>;
  setQuery: (q: InpatientQuery) => void;
  fetchBedMap: () => Promise<void>;
  fetchPatients: () => Promise<void>;
  selectVisit: (visitId: string | null) => Promise<void>;
  refreshAll: () => Promise<void>;

  admit: (payload: AdmitPayload) => Promise<InpatientListItem>;
  changeBed: (visitId: string, targetBedId: string, reason?: string) => Promise<void>;
  transfer: (
    visitId: string,
    targetWardId: string,
    targetBedId?: string,
    reason?: string,
  ) => Promise<void>;
  discharge: (visitId: string, reason?: string) => Promise<void>;
  setBedStatus: (
    bedId: string,
    status: Extract<InpatientBedStatus, 'available' | 'maintenance' | 'isolation'>,
    reason?: string,
  ) => Promise<void>;
}

export type InpatientStore = InpatientState;

export const useInpatientStore = create<InpatientStore>((set, get) => ({
  ready: null,
  health: null,
  bedMap: null,
  patients: [],
  total: 0,
  selectedVisitId: null,
  detail: null,

  loadingHealth: false,
  loadingMap: false,
  loadingList: false,
  loadingDetail: false,
  acting: false,
  error: null,
  query: {},

  checkHealth: async () => {
    set({ loadingHealth: true, error: null });
    try {
      const health = await api.getSystemHealth();
      set({ health, ready: health.db === 'up' || health.db === 'skipped', loadingHealth: false });
    } catch (err) {
      set({
        ready: false,
        loadingHealth: false,
        error: err instanceof Error ? err.message : 'BFF 或数据库不可用',
      });
    }
  },

  setQuery: (q) => {
    set({ query: q });
    void get().fetchBedMap();
    void get().fetchPatients();
  },

  fetchBedMap: async () => {
    set({ loadingMap: true });
    try {
      const bedMap = await api.getBedMap(get().query);
      set({ bedMap, loadingMap: false, error: null });
    } catch (err) {
      set({
        loadingMap: false,
        error: err instanceof Error ? err.message : '床位图加载失败',
      });
    }
  },

  fetchPatients: async () => {
    set({ loadingList: true });
    try {
      const res = await api.getInpatients(get().query);
      set({ patients: res.items, total: res.total, loadingList: false, error: null });
    } catch (err) {
      set({ loadingList: false, error: err instanceof Error ? err.message : '在院列表加载失败' });
    }
  },

  selectVisit: async (visitId) => {
    if (!visitId) {
      set({ selectedVisitId: null, detail: null });
      return;
    }
    set({ selectedVisitId: visitId, loadingDetail: true });
    try {
      const detail = await api.getInpatient(visitId);
      set({ detail, loadingDetail: false });
    } catch (err) {
      set({ loadingDetail: false, error: err instanceof Error ? err.message : '患者详情加载失败' });
    }
  },

  refreshAll: async () => {
    await Promise.all([get().fetchBedMap(), get().fetchPatients()]);
    const { selectedVisitId } = get();
    if (selectedVisitId) await get().selectVisit(selectedVisitId);
  },

  admit: async (payload) => {
    set({ acting: true });
    try {
      const item = await api.createAdmission(payload);
      await get().refreshAll();
      return item;
    } finally {
      set({ acting: false });
    }
  },

  changeBed: async (visitId, targetBedId, reason) => {
    set({ acting: true });
    try {
      await api.changeBed(visitId, targetBedId, reason);
      await get().refreshAll();
    } finally {
      set({ acting: false });
    }
  },

  transfer: async (visitId, targetWardId, targetBedId, reason) => {
    set({ acting: true });
    try {
      await api.transfer(visitId, targetWardId, targetBedId, reason);
      await get().refreshAll();
    } finally {
      set({ acting: false });
    }
  },

  discharge: async (visitId, reason) => {
    set({ acting: true });
    try {
      await api.discharge(visitId, reason);
      if (get().selectedVisitId === visitId) set({ selectedVisitId: null, detail: null });
      await get().refreshAll();
    } finally {
      set({ acting: false });
    }
  },

  setBedStatus: async (bedId, status, reason) => {
    set({ acting: true });
    try {
      await api.setBedStatus(bedId, status, reason);
      await get().refreshAll();
    } finally {
      set({ acting: false });
    }
  },
}));
