/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 住院查房场景 - 状态管理（Zustand）
 */
import { create } from 'zustand';
import type {
  AssessmentRecord,
  HandoverRecord,
  OrderItem,
  RoomGroup,
  RoundPatient,
  RoundRecord,
  WardInfo,
  WardState,
} from '@/types/ward';
import {
  mockAssessments,
  mockDischarges,
  mockHandovers,
  mockOrders,
  mockRoomGroups,
  mockRoundList,
  mockSurgeries,
  mockWardInfo,
  roundRecordFor,
} from '@/mock/wardMock';

/** 模拟网络延迟 */
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

interface WardActions {
  fetchWardInfo: () => Promise<void>;
  fetchBedMap: () => Promise<void>;
  fetchRoundList: () => Promise<void>;
  startRound: (patientId: string) => Promise<RoundPatient | null>;
  saveRoundRecord: (record: RoundRecord) => Promise<void>;
  submitOrder: (order: OrderItem) => Promise<void>;
  stopOrder: (orderId: string) => Promise<void>;
  finishRound: (patientId: string) => Promise<void>;
  saveHandover: (record: HandoverRecord) => Promise<void>;
  addAssessment: (record: AssessmentRecord) => Promise<void>;
}

export type WardStore = WardState & WardActions;

export const useWardStore = create<WardStore>((set, get) => ({
  wardInfo: null,
  roomGroups: [],
  roundList: [],
  currentRoundPatient: null,
  currentRoundRecord: null,
  allOrders: [],
  assessments: [],
  handovers: [],
  discharges: [],
  surgeries: [],
  loading: false,

  fetchWardInfo: async () => {
    set({ loading: true });
    await delay();
    set({ wardInfo: mockWardInfo, loading: false });
  },

  fetchBedMap: async () => {
    set({ loading: true });
    await delay();
    set({ roomGroups: mockRoomGroups, loading: false });
  },

  fetchRoundList: async () => {
    set({ loading: true });
    await delay();
    set({
      roundList: mockRoundList,
      allOrders: mockOrders,
      assessments: mockAssessments,
      handovers: mockHandovers,
      discharges: mockDischarges,
      surgeries: mockSurgeries,
      loading: false,
    });
  },

  startRound: async (patientId: string) => {
    await delay(150);
    const patient = get().roundList.find((r) => r.patient.id === patientId) ?? null;
    const record = roundRecordFor(patientId);
    set({
      currentRoundPatient: patient ? { ...patient, roundStatus: 'in_progress' } : null,
      currentRoundRecord: record,
      roundList: get().roundList.map((r) =>
        r.patient.id === patientId ? { ...r, roundStatus: 'in_progress' } : r,
      ),
    });
    return patient;
  },

  saveRoundRecord: async (record: RoundRecord) => {
    await delay(100);
    set({ currentRoundRecord: { ...record, signed: true } });
  },

  submitOrder: async (order: OrderItem) => {
    await delay(100);
    set({ allOrders: [order, ...get().allOrders] });
  },

  stopOrder: async (orderId: string) => {
    await delay(100);
    set({
      allOrders: get().allOrders.map((o) =>
        o.id === orderId
          ? { ...o, status: 'stopped' as const, stopTime: new Date().toISOString() }
          : o,
      ),
    });
  },

  finishRound: async (patientId: string) => {
    await delay(100);
    set({
      roundList: get().roundList.map((r) =>
        r.patient.id === patientId
          ? {
              ...r,
              roundStatus: 'finished' as const,
              thirdRound: { ...r.thirdRound, resident: true },
            }
          : r,
      ),
      currentRoundPatient: null,
      currentRoundRecord: null,
    });
  },

  saveHandover: async (record: HandoverRecord) => {
    await delay(150);
    set({ handovers: [record, ...get().handovers] });
  },

  addAssessment: async (record: AssessmentRecord) => {
    await delay(100);
    set({ assessments: [record, ...get().assessments] });
  },
}));

/** 选择器：根据患者ID过滤医嘱 */
export const selectOrdersByPatient = (state: WardStore, patientId: string): OrderItem[] =>
  state.allOrders.filter((o) => o.patientId === patientId);

/** 选择器：根据患者ID过滤评估记录 */
export const selectAssessmentsByPatient = (
  state: WardStore,
  patientId: string,
): AssessmentRecord[] => state.assessments.filter((a) => a.patientId === patientId);

/** 选择器：病区统计汇总 */
export const selectWardSummary = (state: WardStore): WardInfo | null => state.wardInfo;

/** 选择器：全部床位分组 */
export const selectRoomGroups = (state: WardStore): RoomGroup[] => state.roomGroups;
