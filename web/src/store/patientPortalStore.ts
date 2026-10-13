/**
 * 健澜科技 jlmedaios - 患者端门户 store（M80-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getPatientPortalApi } from '@/services/api/patientPortal';
import type { PortalView } from '@/types/patientPortal';

interface PatientPortalState {
  data: PortalView | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const usePatientPortalStore = create<PatientPortalState>((set) => ({
  data: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try { set({ data: await getPatientPortalApi() }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
