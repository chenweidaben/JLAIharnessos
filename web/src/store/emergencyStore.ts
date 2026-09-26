/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊核心事务状态管理（M1-B1，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/emergency），无 mock：
 *  - 启动先探活 /system/health，BFF/数据库不可用时 ready=false 并显式报错；
 *  - 队列 / 统计 / 绿色通道 / 抢救 / 留观异步加载；
 *  - 写操作成功后自动刷新对应读模型。
 */
import { create } from 'zustand';

import type {
  AiTriageAdviceDto,
  ArrivalInput,
  ArrivalResult,
  ChannelTypeDto,
  DispositionCode,
  EmergencyHealth,
  EmergencyQueueItem,
  EmergencyStatsDto,
  GreenChannelDto,
  GreenChannelType,
  ObservationDto,
  ObsTaskDto,
  ResuscitationDto,
  ResusEventDto,
  ResusMedicationDto,
  TriageFormPayload,
  TriageResult,
} from '@/types/emergency';
import * as api from '@/services/api/emergency';

interface EmergencyState {
  /** 后端就绪状态：null=探测中 / true=就绪 / false=不可用 */
  ready: boolean | null;
  health: EmergencyHealth | null;

  queue: EmergencyQueueItem[];
  stats: EmergencyStatsDto | null;
  channelTypes: ChannelTypeDto[];
  greenChannels: GreenChannelDto[];
  resuscitations: ResuscitationDto[];
  observations: ObservationDto[];

  loadingHealth: boolean;
  loadingQueue: boolean;
  loadingGc: boolean;
  loadingResus: boolean;
  loadingObs: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<void>;
  fetchQueue: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchChannelTypes: () => Promise<void>;
  fetchGreenChannels: () => Promise<void>;
  fetchResuscitations: () => Promise<void>;
  fetchObservations: () => Promise<void>;
  refreshAll: () => Promise<void>;

  createArrival: (payload: ArrivalInput) => Promise<ArrivalResult>;
  submitTriage: (visitId: string, payload: TriageFormPayload) => Promise<TriageResult>;
  fetchAiAdvice: (visitId: string, payload: Omit<TriageFormPayload, 'level'>) => Promise<AiTriageAdviceDto>;

  startGreenChannel: (visitId: string, type: GreenChannelType, subtype?: string) => Promise<GreenChannelDto>;
  recordNode: (channelId: string, nodeKey: string, actualTime?: string) => Promise<GreenChannelDto>;
  closeGreenChannel: (channelId: string, outcome: string, qualityNote?: string | null) => Promise<GreenChannelDto>;

  startResuscitation: (visitId: string, bedNo?: string, diagnosis?: string) => Promise<ResuscitationDto>;
  addResusEvent: (resusId: string, event: ResusEventDto) => Promise<ResuscitationDto>;
  addResusMedication: (resusId: string, med: ResusMedicationDto) => Promise<ResuscitationDto>;
  completeResuscitation: (
    resusId: string,
    body: { status: 'stabilized' | 'transferred_icu' | 'deceased'; outcome: string; summary?: string | null },
  ) => Promise<ResuscitationDto>;

  startObservation: (
    visitId: string,
    body: { bedNo?: string; diagnosis?: string; nursingLevel?: string; expectedOutcome?: string; pendingTasks?: ObsTaskDto[] },
  ) => Promise<ObservationDto>;
  updateObservation: (
    obsId: string,
    patch: { status?: ObservationDto['status']; vitals?: Record<string, unknown>; ivStatus?: string; pendingTasks?: ObsTaskDto[]; nursingLevel?: string },
  ) => Promise<ObservationDto>;
  endObservation: (obsId: string, status: 'discharged' | 'admitted') => Promise<ObservationDto>;

  recordDisposition: (
    visitId: string,
    body: { disposition: DispositionCode; destination?: string | null; wardId?: string | null; bedId?: string | null; remark?: string | null },
  ) => Promise<void>;
}

export type EmergencyStore = EmergencyState;

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmergencyStore = create<EmergencyStore>((set, get) => ({
  ready: null,
  health: null,

  queue: [],
  stats: null,
  channelTypes: [],
  greenChannels: [],
  resuscitations: [],
  observations: [],

  loadingHealth: false,
  loadingQueue: false,
  loadingGc: false,
  loadingResus: false,
  loadingObs: false,
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

  fetchQueue: async () => {
    set({ loadingQueue: true });
    try {
      const queue = await api.getQueue();
      set({ queue, loadingQueue: false, error: null });
    } catch (e) {
      set({ loadingQueue: false, error: errMsg(e, '分诊队列加载失败') });
    }
  },

  fetchStats: async () => {
    try {
      const stats = await api.getStats();
      set({ stats, error: null });
    } catch (e) {
      set({ error: errMsg(e, '急诊统计加载失败') });
    }
  },

  fetchChannelTypes: async () => {
    try {
      const channelTypes = await api.getChannelTypes();
      set({ channelTypes });
    } catch {
      /* 元数据失败不阻断主流程 */
    }
  },

  fetchGreenChannels: async () => {
    set({ loadingGc: true });
    try {
      const r = await api.listGreenChannels();
      set({ greenChannels: r.items, loadingGc: false, error: null });
    } catch (e) {
      set({ loadingGc: false, error: errMsg(e, '绿色通道加载失败') });
    }
  },

  fetchResuscitations: async () => {
    set({ loadingResus: true });
    try {
      const r = await api.listResuscitations();
      set({ resuscitations: r.items, loadingResus: false, error: null });
    } catch (e) {
      set({ loadingResus: false, error: errMsg(e, '抢救列表加载失败') });
    }
  },

  fetchObservations: async () => {
    set({ loadingObs: true });
    try {
      const r = await api.listObservations();
      set({ observations: r.items, loadingObs: false, error: null });
    } catch (e) {
      set({ loadingObs: false, error: errMsg(e, '留观列表加载失败') });
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchQueue(),
      get().fetchStats(),
      get().fetchGreenChannels(),
      get().fetchResuscitations(),
      get().fetchObservations(),
    ]);
  },

  createArrival: async (payload) => {
    set({ acting: true });
    try {
      const r = await api.createArrival(payload);
      await Promise.all([get().fetchQueue(), get().fetchStats()]);
      return r;
    } finally {
      set({ acting: false });
    }
  },

  submitTriage: async (visitId, payload) => {
    set({ acting: true });
    try {
      const r = await api.submitTriage(visitId, payload);
      await Promise.all([get().fetchQueue(), get().fetchStats()]);
      return r;
    } finally {
      set({ acting: false });
    }
  },

  fetchAiAdvice: async (visitId, payload) => api.fetchAiAdvice(visitId, payload),

  startGreenChannel: async (visitId, type, subtype) => {
    set({ acting: true });
    try {
      const r = await api.startGreenChannel(visitId, { type, subtype });
      await Promise.all([get().fetchQueue(), get().fetchGreenChannels()]);
      return r.channel;
    } finally {
      set({ acting: false });
    }
  },

  recordNode: async (channelId, nodeKey, actualTime) => {
    set({ acting: true });
    try {
      const r = await api.recordGreenChannelNode(channelId, nodeKey, actualTime);
      await get().fetchGreenChannels();
      return r.channel;
    } finally {
      set({ acting: false });
    }
  },

  closeGreenChannel: async (channelId, outcome, qualityNote) => {
    set({ acting: true });
    try {
      const r = await api.closeGreenChannel(channelId, { outcome, qualityNote });
      await Promise.all([get().fetchQueue(), get().fetchGreenChannels()]);
      return r.channel;
    } finally {
      set({ acting: false });
    }
  },

  startResuscitation: async (visitId, bedNo, diagnosis) => {
    set({ acting: true });
    try {
      const r = await api.startResuscitation(visitId, { bedNo, diagnosis });
      await Promise.all([get().fetchQueue(), get().fetchResuscitations()]);
      return r.resuscitation;
    } finally {
      set({ acting: false });
    }
  },

  addResusEvent: async (resusId, event) => {
    set({ acting: true });
    try {
      const r = await api.addResusEvent(resusId, event);
      await get().fetchResuscitations();
      return r.resuscitation;
    } finally {
      set({ acting: false });
    }
  },

  addResusMedication: async (resusId, med) => {
    set({ acting: true });
    try {
      const r = await api.addResusMedication(resusId, med);
      await get().fetchResuscitations();
      return r.resuscitation;
    } finally {
      set({ acting: false });
    }
  },

  completeResuscitation: async (resusId, body) => {
    set({ acting: true });
    try {
      const r = await api.completeResuscitation(resusId, body);
      await Promise.all([get().fetchQueue(), get().fetchResuscitations(), get().fetchStats()]);
      return r.resuscitation;
    } finally {
      set({ acting: false });
    }
  },

  startObservation: async (visitId, body) => {
    set({ acting: true });
    try {
      const r = await api.startObservation(visitId, body);
      await Promise.all([get().fetchQueue(), get().fetchObservations()]);
      return r.observation;
    } finally {
      set({ acting: false });
    }
  },

  updateObservation: async (obsId, patch) => {
    set({ acting: true });
    try {
      const r = await api.updateObservation(obsId, patch);
      await get().fetchObservations();
      return r.observation;
    } finally {
      set({ acting: false });
    }
  },

  endObservation: async (obsId, status) => {
    set({ acting: true });
    try {
      const r = await api.endObservation(obsId, status);
      await Promise.all([get().fetchQueue(), get().fetchObservations(), get().fetchStats()]);
      return r.observation;
    } finally {
      set({ acting: false });
    }
  },

  recordDisposition: async (visitId, body) => {
    set({ acting: true });
    try {
      await api.recordDisposition(visitId, body);
      await Promise.all([get().fetchQueue(), get().fetchStats()]);
    } finally {
      set({ acting: false });
    }
  },
}));
