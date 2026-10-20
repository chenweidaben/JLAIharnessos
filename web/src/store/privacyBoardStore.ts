/**
 * 健澜科技 jlmedaios - 隐私授权看板 Zustand store（M501）
 * 聚合 /privacy/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAccessLog,
  fetchConsent,
  fetchViolation,
  type AccessLogRow,
  type ConsentRow,
  type ViolationRow,
} from '@/services/api/privacyBoard';

interface PrivacyBoardState {
  consents: ConsentRow[];
  accessLogs: AccessLogRow[];
  violations: ViolationRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const usePrivacyBoardStore = create<PrivacyBoardState>((set) => ({
  consents: [],
  accessLogs: [],
  violations: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [c, a, v] = await Promise.all([
        fetchConsent(),
        fetchAccessLog(),
        fetchViolation(),
      ]);
      set({
        consents: c.data,
        accessLogs: a.data,
        violations: v.data,
        demo: c.demo || a.demo || v.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '隐私看板加载失败',
      });
    }
  },
}));
