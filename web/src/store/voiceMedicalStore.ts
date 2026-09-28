/**
 * 健澜科技 jlmedaios - 语音电子病历状态管理（M2-C）
 *
 * 真实 BFF：口述转写、会话查询、复核转病历（本人签名）、作废。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as voiceApi from '@/services/api/voiceMedical';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  ConvertDictationPayload,
  CreateDictationPayload,
  VoiceDictationDto,
  VoiceDictationStatus,
} from '@/types/voiceMedical';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface VoiceMedicalState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  dictations: VoiceDictationDto[];
  loading: boolean;

  current: VoiceDictationDto | null;
  currentId: string | null;

  transcribing: boolean;
  working: boolean;
  error: string | null;
  lastRecordId: string | null;

  checkHealth: () => Promise<boolean>;
  loadDictations: (filters?: {
    visitId?: string;
    status?: VoiceDictationStatus;
  }) => Promise<void>;
  selectDictation: (id: string) => Promise<boolean>;
  dictate: (payload: CreateDictationPayload) => Promise<boolean>;
  convert: (payload: ConvertDictationPayload) => Promise<boolean>;
  discard: () => Promise<boolean>;
  clearError: () => void;
}

export const useVoiceMedicalStore = create<VoiceMedicalState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  dictations: [],
  loading: false,

  current: null,
  currentId: null,

  transcribing: false,
  working: false,
  error: null,
  lastRecordId: null,

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

  loadDictations: async (filters) => {
    set({ loading: true, error: null });
    try {
      const res = await voiceApi.fetchDictations(filters);
      set({ dictations: res.items, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  selectDictation: async (id) => {
    set({ error: null, currentId: id, lastRecordId: null });
    try {
      const res = await voiceApi.fetchDictation(id);
      set({ current: res.dictation });
      return true;
    } catch (e) {
      set({ current: null, error: errMsg(e) });
      return false;
    }
  },

  dictate: async (payload) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法发起语音转写' });
      return false;
    }
    set({ transcribing: true, error: null });
    try {
      const res = await voiceApi.dictate(payload);
      set({ transcribing: false, current: res.dictation, currentId: res.dictation.id });
      await get().loadDictations();
      return true;
    } catch (e) {
      set({ transcribing: false, error: errMsg(e) });
      return false;
    }
  },

  convert: async (payload) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法转病历' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ working: true, error: null });
    try {
      const res = await voiceApi.convertDictation(id, payload);
      set({ working: false, current: res.dictation, lastRecordId: res.recordId });
      await get().loadDictations();
      return true;
    } catch (e) {
      set({ working: false, error: errMsg(e) });
      return false;
    }
  },

  discard: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法作废' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ working: true, error: null });
    try {
      const res = await voiceApi.discardDictation(id);
      set({ working: false, current: res.dictation });
      await get().loadDictations();
      return true;
    } catch (e) {
      set({ working: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
