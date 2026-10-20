/**
 * 健澜科技 jlmedaios - 安全与隐私合规看板 Zustand store（M478）
 * 聚合 /security/* 两端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAuditAnomaly,
  fetchPrivacyClassification,
  type AnomalyRow,
  type PrivacyRow,
} from '@/services/api/securityBoard';

interface SecurityBoardState {
  privacy: PrivacyRow[];
  anomalies: AnomalyRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useSecurityBoardStore = create<SecurityBoardState>((set) => ({
  privacy: [],
  anomalies: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [p, a] = await Promise.all([
        fetchPrivacyClassification(),
        fetchAuditAnomaly(),
      ]);
      set({
        privacy: p.data,
        anomalies: a.data,
        demo: p.demo || a.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '安全看板加载失败',
      });
    }
  },
}));
