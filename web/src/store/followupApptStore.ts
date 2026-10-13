/**
 * 健澜科技 jlmedaios - 复诊预约 store（M62-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import {
  bookFollowupAppt, cancelFollowupAppt, listFollowupAppt, recommendFollowup,
} from '@/services/api/followupAppt';
import type { FollowupAppt, SlotOption } from '@/types/followupAppt';

interface FollowupState {
  dbUp: boolean | null;
  visitId: string;
  planId: string;
  options: SlotOption[];
  suggested: SlotOption | null;
  items: FollowupAppt[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setVisit: (visitId: string, planId: string) => Promise<void>;
  recommend: () => Promise<void>;
  book: (opt: SlotOption) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

export const useFollowupStore = create<FollowupState>((set, get) => ({
  dbUp: null,
  visitId: '',
  planId: '',
  options: [],
  suggested: null,
  items: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  setVisit: async (visitId, planId) => {
    set({ visitId, planId });
    if (!visitId || get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ items: await listFollowupAppt(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
    if (planId) await get().recommend();
  },
  recommend: async () => {
    const { planId, dbUp } = get();
    if (!planId || dbUp !== true) return;
    try {
      const r = await recommendFollowup(planId);
      set({ options: r.options, suggested: r.suggested });
    } catch (err) { set({ error: err instanceof Error ? err.message : '号源加载失败' }); }
  },
  book: async (opt) => {
    const { visitId, planId, dbUp } = get();
    if (!planId || dbUp !== true) throw new Error('不可用');
    await bookFollowupAppt(planId, { scheduleId: opt.scheduleId, appointmentDate: opt.appointmentDate, department: opt.department });
    await get().setVisit(visitId, planId);
  },
  cancel: async (id) => {
    const { visitId, planId, dbUp } = get();
    if (dbUp !== true) throw new Error('不可用');
    await cancelFollowupAppt(id);
    await get().setVisit(visitId, planId);
  },
}));
