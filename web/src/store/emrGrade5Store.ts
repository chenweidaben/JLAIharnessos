/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评 store（M99-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  getGrade5Assessment,
  submitGrade5Assessment,
  type Grade5Assessment,
  type Grade5DimensionInput,
} from '@/services/api/emrGrade5';

interface EmrGrade5State {
  data: Grade5Assessment | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: () => Promise<void>;
  submit: (dimensions: Grade5DimensionInput[]) => Promise<void>;
}

/**
 * 八维度自评 store：
 *  - load：拉取最新一批评分（雷达图 + 得分表 + 整改建议）；
 *  - submit：发起新一轮自评，成功后自动刷新视图。
 */
export const useEmrGrade5Store = create<EmrGrade5State>((set) => ({
  data: null,
  loading: false,
  submitting: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ data: await getGrade5Assessment() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (dimensions) => {
    set({ submitting: true, error: null });
    try {
      set({ data: await submitGrade5Assessment(dimensions) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '自评提交失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));
