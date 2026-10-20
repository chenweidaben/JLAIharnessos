/**
 * 健澜科技 jlmedaios - 科研管理看板 Zustand store（M485）
 * 聚合 /research/* 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchFunds,
  fetchPapers,
  fetchPatents,
  fetchProjects,
  type FundRow,
  type PaperRow,
  type PatentRow,
  type ProjectRow,
} from '@/services/api/researchBoard';

interface ResearchBoardState {
  projects: ProjectRow[];
  papers: PaperRow[];
  patents: PatentRow[];
  funds: FundRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useResearchBoardStore = create<ResearchBoardState>((set) => ({
  projects: [],
  papers: [],
  patents: [],
  funds: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [pj, pp, pt, f] = await Promise.all([
        fetchProjects(),
        fetchPapers(),
        fetchPatents(),
        fetchFunds(),
      ]);
      set({
        projects: pj.data,
        papers: pp.data,
        patents: pt.data,
        funds: f.data,
        demo: pj.demo || pp.demo || pt.demo || f.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '科研看板加载失败',
      });
    }
  },
}));
