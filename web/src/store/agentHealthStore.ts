/* ============================================================================
 * 健澜科技数智医院智能体 - MEDMUSE Agent 健康度看板状态（Zustand）
 *
 * 真实 BFF：GET /api/v1/medmuse/agent-health；失败显式报错，不以假数据冒充正常。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 * ==========================================================================*/

import { create } from 'zustand';
import { fetchAgentHealthBoard, type AgentHealthBoard } from '@/services/api/medmuseAgentHealth';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface AgentHealthState {
  board: AgentHealthBoard | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  clearError: () => void;
}

export const useAgentHealthStore = create<AgentHealthState>((set) => ({
  board: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const board = await fetchAgentHealthBoard();
      set({ board, loading: false });
    } catch (e) {
      set({ loading: false, error: `Agent 健康度看板加载失败：${errMsg(e)}` });
    }
  },

  clearError: () => set({ error: null }),
}));
