/**
 * 健澜科技 jlmedaios - 急诊转诊 v2 Zustand store（M672）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEmergencyReferrals,
  type EmergencyReferral,
} from '@/services/api/emergencyReferralV2M672';

interface EmergencyReferralV2M672State {
  items: EmergencyReferral[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmergencyReferralV2M672Store = create<EmergencyReferralV2M672State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmergencyReferrals();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '急诊转诊加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
