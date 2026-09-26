/**
 * 健澜科技 jlmedaios - 住院在院诊疗日常状态管理（M1-B2，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/care），无 mock：
 *  - 启动先探活 /system/health，BFF/数据库不可用时 ready=false 并显式报错；
 *  - 查房、护理记录、护理任务、在院医嘱按所选在院就诊异步加载；
 *  - 写操作经健康门禁，成功后刷新对应读模型。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import * as api from '@/services/api/care';
import type {
  CareHealth,
  InpatientOrderCreatePayload,
  InpatientOrderView,
  NursingRecordCreatePayload,
  NursingRecordDto,
  NursingTaskCreatePayload,
  NursingTaskDto,
  OrderAdministerPayload,
  OrderDto,
  TaskExecutionResult,
  WardRoundCreatePayload,
  WardRoundDto,
} from '@/types/care';

interface CareState {
  /** 后端就绪状态：null=探测中 / true=就绪 / false=不可用 */
  ready: boolean | null;
  health: CareHealth | null;
  selectedVisitId: string | null;

  rounds: WardRoundDto[];
  nursingRecords: NursingRecordDto[];
  nursingTasks: NursingTaskDto[];
  orderView: InpatientOrderView | null;

  loadingHealth: boolean;
  loadingRounds: boolean;
  loadingRecords: boolean;
  loadingTasks: boolean;
  loadingOrders: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<void>;
  selectVisit: (visitId: string | null) => Promise<void>;
  fetchRounds: (visitId?: string) => Promise<void>;
  fetchNursingRecords: (visitId?: string) => Promise<void>;
  fetchNursingTasks: (visitId?: string) => Promise<void>;
  fetchOrders: (visitId?: string) => Promise<void>;
  refreshVisit: (visitId?: string) => Promise<void>;

  createRound: (payload: WardRoundCreatePayload) => Promise<WardRoundDto>;
  signRound: (id: string) => Promise<WardRoundDto>;
  countersignRound: (id: string) => Promise<WardRoundDto>;
  returnRound: (id: string, reason: string) => Promise<WardRoundDto>;

  createNursingRecord: (payload: NursingRecordCreatePayload) => Promise<NursingRecordDto>;
  signNursingRecord: (id: string) => Promise<NursingRecordDto>;
  createNursingTask: (payload: NursingTaskCreatePayload) => Promise<NursingTaskDto>;
  executeNursingTask: (id: string, result?: string) => Promise<TaskExecutionResult>;

  createOrder: (payload: InpatientOrderCreatePayload) => Promise<OrderDto>;
  reviewOrder: (id: string) => Promise<OrderDto>;
  rejectOrder: (id: string, reason: string) => Promise<OrderDto>;
  administerOrder: (id: string, payload: OrderAdministerPayload) => Promise<OrderDto>;
  stopOrder: (id: string) => Promise<OrderDto>;
}

export type CareStore = CareState;

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCareStore = create<CareStore>((set, get) => {
  const requireReady = (): void => {
    const { ready, error } = get();
    if (ready !== true) throw new Error(error ?? 'BFF 或数据库不可用，禁止写操作');
  };

  const requireVisitId = (visitId?: string): string => {
    const id = visitId ?? get().selectedVisitId;
    if (!id) throw new Error('请先选择在院患者');
    return id;
  };

  return {
    ready: null,
    health: null,
    selectedVisitId: null,
    rounds: [],
    nursingRecords: [],
    nursingTasks: [],
    orderView: null,

    loadingHealth: false,
    loadingRounds: false,
    loadingRecords: false,
    loadingTasks: false,
    loadingOrders: false,
    acting: false,
    error: null,

    checkHealth: async () => {
      set({ loadingHealth: true, error: null });
      try {
        const health = await api.getSystemHealth();
        set({ health, ready: health.db === 'up' || health.db === 'skipped', loadingHealth: false });
      } catch (e) {
        set({ ready: false, loadingHealth: false, error: errMsg(e, 'BFF 或数据库不可用') });
      }
    },

    selectVisit: async (visitId) => {
      if (!visitId) {
        set({ selectedVisitId: null, rounds: [], nursingRecords: [], nursingTasks: [], orderView: null });
        return;
      }
      set({ selectedVisitId: visitId });
      await get().refreshVisit(visitId);
    },

    fetchRounds: async (visitId) => {
      const id = requireVisitId(visitId);
      set({ loadingRounds: true });
      try {
        const rounds = await api.listRounds(id);
        set({ rounds, loadingRounds: false, error: null });
      } catch (e) {
        set({ loadingRounds: false, error: errMsg(e, '查房记录加载失败') });
      }
    },

    fetchNursingRecords: async (visitId) => {
      const id = requireVisitId(visitId);
      set({ loadingRecords: true });
      try {
        const nursingRecords = await api.listNursingRecords(id);
        set({ nursingRecords, loadingRecords: false, error: null });
      } catch (e) {
        set({ loadingRecords: false, error: errMsg(e, '护理记录加载失败') });
      }
    },

    fetchNursingTasks: async (visitId) => {
      const id = requireVisitId(visitId);
      set({ loadingTasks: true });
      try {
        const nursingTasks = await api.listNursingTasks(id);
        set({ nursingTasks, loadingTasks: false, error: null });
      } catch (e) {
        set({ loadingTasks: false, error: errMsg(e, '护理任务加载失败') });
      }
    },

    fetchOrders: async (visitId) => {
      const id = requireVisitId(visitId);
      set({ loadingOrders: true });
      try {
        const orderView = await api.getOrderView(id);
        set({ orderView, loadingOrders: false, error: null });
      } catch (e) {
        set({ loadingOrders: false, error: errMsg(e, '在院医嘱加载失败') });
      }
    },

    refreshVisit: async (visitId) => {
      const id = requireVisitId(visitId);
      await Promise.all([
        get().fetchRounds(id),
        get().fetchNursingRecords(id),
        get().fetchNursingTasks(id),
        get().fetchOrders(id),
      ]);
    },

    createRound: async (payload) => {
      requireReady();
      set({ acting: true });
      try {
        const round = await api.createRound(payload);
        await get().fetchRounds(payload.visitId);
        return round;
      } finally {
        set({ acting: false });
      }
    },

    signRound: async (id) => {
      requireReady();
      set({ acting: true });
      try {
        const round = await api.signRound(id);
        await get().fetchRounds(round.visitId);
        return round;
      } finally {
        set({ acting: false });
      }
    },

    countersignRound: async (id) => {
      requireReady();
      set({ acting: true });
      try {
        const round = await api.countersignRound(id);
        await get().fetchRounds(round.visitId);
        return round;
      } finally {
        set({ acting: false });
      }
    },

    returnRound: async (id, reason) => {
      requireReady();
      set({ acting: true });
      try {
        const round = await api.returnRound(id, reason);
        await get().fetchRounds(round.visitId);
        return round;
      } finally {
        set({ acting: false });
      }
    },

    createNursingRecord: async (payload) => {
      requireReady();
      set({ acting: true });
      try {
        const record = await api.createNursingRecord(payload);
        await get().fetchNursingRecords(record.visitId);
        return record;
      } finally {
        set({ acting: false });
      }
    },

    signNursingRecord: async (id) => {
      requireReady();
      set({ acting: true });
      try {
        const record = await api.signNursingRecord(id);
        await get().fetchNursingRecords(record.visitId);
        return record;
      } finally {
        set({ acting: false });
      }
    },

    createNursingTask: async (payload) => {
      requireReady();
      set({ acting: true });
      try {
        const task = await api.createNursingTask(payload);
        await get().fetchNursingTasks(task.visitId);
        return task;
      } finally {
        set({ acting: false });
      }
    },

    executeNursingTask: async (id, result) => {
      requireReady();
      set({ acting: true });
      try {
        const r = await api.executeNursingTask(id, result);
        await get().fetchNursingTasks(r.task.visitId);
        return r;
      } finally {
        set({ acting: false });
      }
    },

    createOrder: async (payload) => {
      requireReady();
      set({ acting: true });
      try {
        const order = await api.createOrder(payload);
        await get().fetchOrders(order.visitId);
        return order;
      } finally {
        set({ acting: false });
      }
    },

    reviewOrder: async (id) => {
      requireReady();
      set({ acting: true });
      try {
        const order = await api.reviewOrder(id);
        await get().fetchOrders(order.visitId);
        return order;
      } finally {
        set({ acting: false });
      }
    },

    rejectOrder: async (id, reason) => {
      requireReady();
      set({ acting: true });
      try {
        const order = await api.rejectOrder(id, reason);
        await get().fetchOrders(order.visitId);
        return order;
      } finally {
        set({ acting: false });
      }
    },

    administerOrder: async (id, payload) => {
      requireReady();
      set({ acting: true });
      try {
        const r = await api.administerOrder(id, payload);
        await get().fetchOrders(r.order.visitId);
        return r.order;
      } finally {
        set({ acting: false });
      }
    },

    stopOrder: async (id) => {
      requireReady();
      set({ acting: true });
      try {
        const order = await api.stopOrder(id);
        await get().fetchOrders(order.visitId);
        return order;
      } finally {
        set({ acting: false });
      }
    },
  };
});
