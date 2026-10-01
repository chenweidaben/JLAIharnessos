/**
 * 健澜科技 jlmedaios - 数字陪诊 Store（M3-Q）
 *
 * 患者演示登录 → 就诊人 → 家属代办授权管理；陪诊向导。
 * 健康门禁：BFF/DB 断链时明确提示，不以缓存冒充。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { systemApi } from '../services/api/system';
import {
  patientLoginApi,
  listMyProfilesApi,
  addProfileApi,
} from '../services/api/patientPortal';
import {
  grantDelegationApi,
  revokeDelegationApi,
  listDelegationHistoryApi,
} from '../services/api/delegation';
import { tokenStorage } from '../utils/auth';
import type { PatientProfileView } from '@/types/internetHospital';
import type { DelegationRecord } from '@/types/delegation';

interface DigitalCompanionState {
  healthOk: boolean;
  healthMsg: string;
  checking: boolean;
  loggedIn: boolean;
  accountId: string | null;
  isDemoLogin: boolean;
  profiles: PatientProfileView[];
  currentProfile: PatientProfileView | null;
  history: DelegationRecord[];
  loading: boolean;
  submitting: boolean;
  checkHealth: () => Promise<boolean>;
  login: (code: string) => Promise<void>;
  logout: () => void;
  loadProfiles: () => Promise<void>;
  addProfile: (input: {
    relation: PatientProfileView['relation'];
    name: string;
    gender?: '男' | '女' | '未知';
    birthDate?: string;
  }) => Promise<void>;
  selectProfile: (p: PatientProfileView | null) => void;
  grant: (input: {
    profileId: string;
    scopes: string[];
    note?: string;
    confirmHighRisk?: boolean;
  }) => Promise<void>;
  revoke: (profileId: string, note?: string) => Promise<void>;
  loadHistory: (profileId: string) => Promise<void>;
}

const initialFlags = {
  healthOk: false,
  healthMsg: '',
  checking: false,
  loggedIn: false,
  accountId: null as string | null,
  isDemoLogin: false,
  currentProfile: null as PatientProfileView | null,
  history: [] as DelegationRecord[],
};

export const useDigitalCompanionStore = create<DigitalCompanionState>(
  (set, get) => ({
    ...initialFlags,
    profiles: [],
    loading: false,
    submitting: false,

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
        set({
          healthOk: false,
          healthMsg: err instanceof Error ? err.message : 'BFF 不可用',
        });
        return false;
      } finally {
        set({ checking: false });
      }
    },

    login: async (code) => {
      set({ submitting: true });
      try {
        const r = await patientLoginApi(code);
        tokenStorage.set({
          accessToken: r.token,
          refreshToken: '',
          expiresIn: 7200,
        });
        set({
          loggedIn: true,
          accountId: r.accountId,
          isDemoLogin: r.isDemoLogin,
        });
        await get().loadProfiles();
      } finally {
        set({ submitting: false });
      }
    },

    logout: () => {
      tokenStorage.clear();
      set({
        ...initialFlags,
        profiles: [],
        loading: false,
        submitting: false,
        healthOk: get().healthOk,
        healthMsg: get().healthMsg,
      });
    },

    loadProfiles: async () => {
      set({ loading: true });
      try {
        const profiles = await listMyProfilesApi();
        set({ profiles });
      } finally {
        set({ loading: false });
      }
    },

    addProfile: async (input) => {
      set({ submitting: true });
      try {
        await addProfileApi(input);
        await get().loadProfiles();
      } finally {
        set({ submitting: false });
      }
    },

    selectProfile: (p) => set({ currentProfile: p, history: p ? get().history : [] }),

    grant: async (input) => {
      set({ submitting: true });
      try {
        await grantDelegationApi(input);
        await get().loadProfiles();
        const cur = get().currentProfile;
        if (cur) {
          await get().loadHistory(cur.id);
        }
      } finally {
        set({ submitting: false });
      }
    },

    revoke: async (profileId, note) => {
      set({ submitting: true });
      try {
        await revokeDelegationApi({ profileId, note });
        await get().loadProfiles();
        await get().loadHistory(profileId);
      } finally {
        set({ submitting: false });
      }
    },

    loadHistory: async (profileId) => {
      set({ loading: true });
      try {
        const history = await listDelegationHistoryApi(profileId);
        set({ history });
      } finally {
        set({ loading: false });
      }
    },
  }),
);
