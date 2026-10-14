/**
 * 健澜科技 jlmedaios - MEDMUSE 审批中心 store（Sentinel 人在回路审批台）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  decideApproval,
  listApprovals,
  type ApprovalStatus,
  type MedmuseApproval,
} from '@/services/api/medmuse';

interface MedmuseApprovalState {
  /** 当前列表 */
  list: MedmuseApproval[];
  /** 顶部状态筛选：pending / approved / rejected */
  status: ApprovalStatus;
  loading: boolean;
  deciding: boolean;
  error: string | null;
  setStatus: (s: ApprovalStatus) => void;
  /** 按当前 status 拉取列表 */
  load: () => Promise<void>;
  /** 通过/驳回；成功后自动刷新列表 */
  decide: (id: string, approved: boolean, comment?: string) => Promise<boolean>;
}

export const useMedmuseApprovalStore = create<MedmuseApprovalState>((set, get) => ({
  list: [],
  status: 'pending',
  loading: false,
  deciding: false,
  error: null,

  setStatus: (s) => set({ status: s }),

  load: async () => {
    const { status } = get();
    set({ loading: true, error: null });
    try {
      set({ list: await listApprovals(status) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审批列表加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  decide: async (id, approved, comment) => {
    set({ deciding: true, error: null });
    try {
      await decideApproval(id, { approved, comment: comment?.trim() || undefined });
      set({ deciding: false });
      // 操作后刷新当前状态筛选下的列表
      await get().load();
      return true;
    } catch (err) {
      set({ deciding: false, error: err instanceof Error ? err.message : '审批操作失败' });
      return false;
    }
  },
}));
