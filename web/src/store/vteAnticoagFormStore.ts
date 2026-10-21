/**
 * 健澜科技 jlmedaios - VTE 抗凝疗程 Zustand store（M521-C，P0 首批）
 *
 * 三态：loading / error / demo；提交成功或降级演示记录后前置到历史列表；
 * 出血评分 / 停用按记录 id 原地合并。写操作失败不吞错：error 由页面 Alert
 * 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchVteAnticoagRecords,
  submitVteAnticoag,
  recordBleedingScore,
  stopAnticoag,
  type BleedingInput,
  type StopInput,
  type VteAnticoagRecord,
  type VteAnticoagSubmitInput,
  type VteBleedingResult,
  type VteStopResult,
  type VteSubmitResult,
} from '@/services/api/vteAnticoagForm';

interface VteAnticoagFormState {
  records: VteAnticoagRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: VteSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: VteAnticoagSubmitInput) => Promise<VteSubmitResult>;
  recordBleeding: (original: VteAnticoagRecord, input: BleedingInput) => Promise<VteBleedingResult>;
  stop: (original: VteAnticoagRecord, input: StopInput) => Promise<VteStopResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useVteAnticoagFormStore = create<VteAnticoagFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchVteAnticoagRecords(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '抗凝疗程记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitVteAnticoag(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '抗凝疗程启动失败') });
      throw e;
    }
  },

  recordBleeding: async (original, input) => {
    set({ acting: true, error: null });
    try {
      const result = await recordBleedingScore(original, input);
      set((state) => ({
        records: state.records.map((r) => (r.id === result.record.id ? result.record : r)),
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '出血评分记录失败') });
      throw e;
    }
  },

  stop: async (original, input) => {
    set({ acting: true, error: null });
    try {
      const result = await stopAnticoag(original, input);
      set((state) => ({
        records: state.records.map((r) => (r.id === result.record.id ? result.record : r)),
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '抗凝疗程停用失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
