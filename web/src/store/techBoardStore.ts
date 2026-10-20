/**
 * 健澜科技 jlmedaios - 医疗技术临床应用管理看板 Zustand store（M498）
 * 聚合 /tech/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAuthority,
  fetchCatalog,
  fetchQuality,
  type AuthorityRow,
  type CatalogRow,
  type QualityRow,
} from '@/services/api/techBoard';

interface TechBoardState {
  catalog: CatalogRow[];
  authority: AuthorityRow[];
  quality: QualityRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useTechBoardStore = create<TechBoardState>((set) => ({
  catalog: [],
  authority: [],
  quality: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [c, a, q] = await Promise.all([
        fetchCatalog(),
        fetchAuthority(),
        fetchQuality(),
      ]);
      set({
        catalog: c.data,
        authority: a.data,
        quality: q.data,
        demo: c.demo || a.demo || q.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '技术管理看板加载失败',
      });
    }
  },
}));
