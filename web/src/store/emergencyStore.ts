/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊分诊场景 - 状态管理（Zustand）
 */
import { create } from 'zustand';

import type {
  EmergencyState,
  GreenChannel,
  GreenChannelType,
  TriageLevel,
  TriagePatient,
  TriageRecord,
} from '@/types/emergency';
import {
  mockEmergencyRecord,
  mockEmergencyStats,
  mockGreenChannels,
  mockObservationPatients,
  mockResuscitationBeds,
  mockResuscitationRecords,
  mockTriageQueue,
  mockTriageRecords,
  triageRecordFor,
} from '@/mock/emergencyMock';

/** 模拟网络延迟 */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

interface EmergencyActions {
  /** 拉取分诊队列 */
  fetchTriageQueue: () => Promise<void>;
  /** 开始分诊（进入分诊工作台） */
  startTriage: (patientId: string) => Promise<TriagePatient | null>;
  /** 保存分诊记录（护士确认级别） */
  saveTriage: (record: TriageRecord) => Promise<void>;
  /** 直接指定分诊级别 */
  assignTriageLevel: (patientId: string, level: TriageLevel) => Promise<void>;
  /** 激活绿色通道 */
  activateGreenChannel: (patientId: string, type: GreenChannelType) => Promise<GreenChannel | null>;
  /** 关闭绿色通道 */
  closeGreenChannel: (id: string, outcome: string, qualityNote: string) => Promise<void>;
  /** 拉取抢救室状态 */
  fetchResuscitationStatus: () => Promise<void>;
  /** 拉取留观列表 */
  fetchObservationList: () => Promise<void>;
  /** 拉取急诊统计 */
  fetchEmergencyStats: () => Promise<void>;
  /** 加载急诊病历 */
  loadEmergencyRecord: (patientId: string) => Promise<void>;
  /** 保存并签名病历 */
  signEmergencyRecord: () => Promise<void>;
}

export type EmergencyStore = EmergencyState & EmergencyActions;

export const useEmergencyStore = create<EmergencyStore>((set, get) => ({
  triageQueue: [],
  currentPatient: null,
  triageRecord: null,
  triageHistory: mockTriageRecords,
  resuscitationBeds: [],
  resuscitationRecords: mockResuscitationRecords,
  observationPatients: [],
  greenChannels: mockGreenChannels,
  emergencyStats: null,
  currentRecord: mockEmergencyRecord,
  loading: false,

  fetchTriageQueue: async () => {
    set({ loading: true });
    await delay();
    set({ triageQueue: mockTriageQueue, loading: false });
  },

  startTriage: async (patientId: string) => {
    await delay(150);
    const patient = get().triageQueue.find((p) => p.id === patientId) ?? null;
    if (!patient) return null;
    set({
      currentPatient: patient,
      triageRecord: triageRecordFor(patient),
    });
    return patient;
  },

  saveTriage: async (record: TriageRecord) => {
    await delay(150);
    const confirmed: TriageRecord = { ...record, confirmed: true };
    set({
      triageRecord: confirmed,
      triageHistory: [confirmed, ...get().triageHistory],
      triageQueue: get().triageQueue.map((p) =>
        p.id === record.patientId
          ? {
              ...p,
              level: record.level,
              status: 'triaged' as const,
              triageTime: record.triageTime,
            }
          : p,
      ),
    });
  },

  assignTriageLevel: async (patientId: string, level: TriageLevel) => {
    await delay(100);
    set({
      triageQueue: get().triageQueue.map((p) =>
        p.id === patientId ? { ...p, level, status: 'triaged' as const } : p,
      ),
    });
  },

  activateGreenChannel: async (patientId: string, type: GreenChannelType) => {
    await delay(200);
    const patient = get().triageQueue.find((p) => p.id === patientId);
    if (!patient) return null;
    const gc: GreenChannel = {
      id: `GC${Date.now().toString(36)}`,
      patientId,
      patientName: patient.name,
      type,
      subtype: '待评估',
      status: 'active',
      arriveTime: patient.arriveTime,
      activateTime: new Date().toISOString(),
      nodes: [],
      notifiedTeams: ['急诊科', '相关专科团队'],
    };
    set({
      greenChannels: [gc, ...get().greenChannels],
      triageQueue: get().triageQueue.map((p) =>
        p.id === patientId
          ? { ...p, greenChannelType: type, greenChannelActive: true, level: p.level ?? 2 }
          : p,
      ),
    });
    return gc;
  },

  closeGreenChannel: async (id: string, outcome: string, qualityNote: string) => {
    await delay(150);
    set({
      greenChannels: get().greenChannels.map((g) =>
        g.id === id
          ? { ...g, status: 'completed', outcome, qualityNote, endTime: new Date().toISOString() }
          : g,
      ),
    });
  },

  fetchResuscitationStatus: async () => {
    set({ loading: true });
    await delay();
    set({ resuscitationBeds: mockResuscitationBeds, loading: false });
  },

  fetchObservationList: async () => {
    set({ loading: true });
    await delay();
    set({ observationPatients: mockObservationPatients, loading: false });
  },

  fetchEmergencyStats: async () => {
    set({ loading: true });
    await delay();
    set({ emergencyStats: mockEmergencyStats, loading: false });
  },

  loadEmergencyRecord: async (patientId: string) => {
    await delay(120);
    const patient = get().triageQueue.find((p) => p.id === patientId);
    set({
      currentRecord: {
        ...mockEmergencyRecord,
        patientId,
        patientName: patient?.name ?? mockEmergencyRecord.patientName,
      },
    });
  },

  signEmergencyRecord: async () => {
    await delay(200);
    set((state) => ({
      currentRecord: state.currentRecord ? { ...state.currentRecord, signed: true } : null,
    }));
  },
}));

/** 选择器：候诊中（待分诊+已分诊待诊）队列 */
export const selectWaitingQueue = (s: EmergencyStore): TriagePatient[] =>
  s.triageQueue.filter((p) => p.status === 'waiting_triage' || p.status === 'triaged');

/** 超时阈值（分钟）：Ⅰ级立即=0，Ⅱ级10，Ⅲ级30，Ⅳ级120 */
export const LEVEL_TIMEOUT: Record<TriageLevel, number> = {
  1: 0,
  2: 10,
  3: 30,
  4: 120,
};
