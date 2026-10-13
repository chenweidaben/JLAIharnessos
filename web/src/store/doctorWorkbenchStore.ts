/**
 * 健澜科技 jlmedaios - 医生站工作台 store（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getDoctorWorkbench } from '@/services/api/doctorWorkbench';
import type { WorkbenchView } from '@/types/doctorWorkbench';

interface DoctorWorkbenchState {
  data: WorkbenchView | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useDoctorWorkbenchStore = create<DoctorWorkbenchState>((set) => ({
  data: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try { set({ data: await getDoctorWorkbench() }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
