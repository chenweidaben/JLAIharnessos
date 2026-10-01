/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 Store（M3-P）
 *
 * 健康门禁：BFF/DB 断链时明确提示，不以缓存冒充导诊/预问诊结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { systemApi } from '../services/api/system';
import {
  startTriageApi,
  chooseDepartmentApi,
  submitPreliminaryApi,
  listMyTriageApi,
  listPreliminaryApi,
  consumePreliminaryApi,
} from '../services/api/smartTriage';
import type {
  TriageSession,
  PreliminaryConsultation,
  DepartmentRecommendation,
  StartTriageInput,
  SubmitPreliminaryInput,
} from '../types/smartTriage';

interface SmartTriageState {
  healthOk: boolean;
  healthMsg: string;
  checking: boolean;
  loading: boolean;
  submitting: boolean;
  currentSession: TriageSession | null;
  recommendations: DepartmentRecommendation[];
  mySessions: TriageSession[];
  staffPreliminary: PreliminaryConsultation[];
  currentReport: PreliminaryConsultation | null;
  checkHealth: () => Promise<boolean>;
  startTriage: (input: StartTriageInput) => Promise<void>;
  chooseDepartment: (sessionId: string, department: string) => Promise<void>;
  submitPreliminary: (input: SubmitPreliminaryInput) => Promise<void>;
  loadMySessions: () => Promise<void>;
  loadStaffPreliminary: (patientId?: string) => Promise<void>;
  consumePreliminary: (id: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  healthOk: false,
  healthMsg: '',
  checking: false,
  loading: false,
  submitting: false,
  currentSession: null as TriageSession | null,
  recommendations: [] as DepartmentRecommendation[],
  mySessions: [] as TriageSession[],
  staffPreliminary: [] as PreliminaryConsultation[],
  currentReport: null as PreliminaryConsultation | null,
};

export const useSmartTriageStore = create<SmartTriageState>((set, get) => ({
  ...initialState,

  checkHealth: async () => {
    if (get().checking) return get().healthOk;
    set({ checking: true });
    try {
      const h = (await systemApi.health()) as {
        db?: string;
        data?: { db?: string };
      };
      const db = h.db ?? h.data?.db;
      const ok = db === 'up';
      set({ healthOk: ok, healthMsg: ok ? '' : '数据库不可用' });
      return ok;
    } catch (err) {
      set({ healthOk: false, healthMsg: err instanceof Error ? err.message : 'BFF 不可用' });
      return false;
    } finally {
      set({ checking: false });
    }
  },

  startTriage: async (input) => {
    set({ submitting: true });
    try {
      const r = await startTriageApi(input);
      set({ currentSession: r.session, recommendations: r.recommendations });
    } finally {
      set({ submitting: false });
    }
  },

  chooseDepartment: async (sessionId, department) => {
    set({ submitting: true });
    try {
      const session = await chooseDepartmentApi({ sessionId, department });
      set({ currentSession: session });
    } finally {
      set({ submitting: false });
    }
  },

  submitPreliminary: async (input) => {
    set({ submitting: true });
    try {
      const r = await submitPreliminaryApi(input);
      set({ currentReport: r.consultation });
    } finally {
      set({ submitting: false });
    }
  },

  loadMySessions: async () => {
    set({ loading: true });
    try {
      const sessions = await listMyTriageApi();
      set({ mySessions: sessions });
    } finally {
      set({ loading: false });
    }
  },

  loadStaffPreliminary: async (patientId) => {
    set({ loading: true });
    try {
      const list = await listPreliminaryApi(patientId);
      set({ staffPreliminary: list });
    } finally {
      set({ loading: false });
    }
  },

  consumePreliminary: async (id) => {
    set({ submitting: true });
    try {
      await consumePreliminaryApi(id);
      const list = await listPreliminaryApi();
      set({ staffPreliminary: list });
    } finally {
      set({ submitting: false });
    }
  },

  reset: () =>
    set((state) => ({
      healthOk: state.healthOk,
      healthMsg: state.healthMsg,
      checking: false,
      loading: false,
      submitting: false,
      currentSession: null,
      recommendations: [],
      mySessions: [],
      staffPreliminary: [],
      currentReport: null,
    })),
}));
