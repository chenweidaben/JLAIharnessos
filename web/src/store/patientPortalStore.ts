/**
 * 健澜科技 jlmedaios - 患者端门户 store（M80-A + 简化工作台）
 *
 * - 既有：患者端首页门户聚合（/patient/portal）。
 * - 新增：患者端简化工作台（待支付 / 待取药 / 随访提醒 / 在线咨询入口），
 *   数据由 services/api/patientPortal.getPatientWorkbenchApi 合并已有 internet 端点产出。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  getPatientPortalApi,
  getPatientWorkbenchApi,
  type PatientWorkbenchView,
} from '@/services/api/patientPortal';
import type { PortalView } from '@/types/patientPortal';

interface PatientPortalState {
  data: PortalView | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;

  /** 简化工作台 */
  workbench: PatientWorkbenchView | null;
  workbenchLoading: boolean;
  workbenchError: string | null;
  loadWorkbench: () => Promise<void>;
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

  workbench: null,
  workbenchLoading: false,
  workbenchError: null,
  loadWorkbench: async () => {
    set({ workbenchLoading: true, workbenchError: null });
    try { set({ workbench: await getPatientWorkbenchApi() }); }
    catch (err) {
      set({ workbenchError: err instanceof Error ? err.message : '工作台加载失败' });
    } finally { set({ workbenchLoading: false }); }
  },
}));
