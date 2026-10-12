/**
 * 健澜科技 jlmedaios - 护理出入量 Zustand store（M17-E）
 *
 * 健康门禁：db!=='up' 不渲染业务、拒绝写。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { getBalance, listIo, recordIo } from '@/services/api/nursingIo';
import type { IoBalanceView, IoRecord, RecordIoReq } from '@/types/nursingIo';

interface HealthInfo { status: string; version: string; demoMode: boolean; db: 'up' | 'down' | 'skipped'; }

interface NursingIoState {
  dbUp: boolean | null;
  health: HealthInfo | null;
  records: IoRecord[];
  balance: IoBalanceView | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId: string) => Promise<void>;
  submit: (body: RecordIoReq) => Promise<IoRecord>;
}

export const useNursingIoStore = create<NursingIoState>((set, get) => ({
  dbUp: null,
  health: null,
  records: [],
  balance: null,
  loading: false,
  acting: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, health: h, error: up ? null : '数据库连接异常，业务数据不可用' });
      return up;
    } catch (err) {
      set({ dbUp: false, health: null, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const [records, balance] = await Promise.all([listIo(visitId), getBalance(visitId)]);
      set({ records, balance });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (body) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    set({ acting: true, error: null });
    try {
      const r = await recordIo(body);
      await get().load(body.visitId);
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '录入失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },
}));
