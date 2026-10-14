/**
 * 健澜科技 jlmedaios - 电子病历模板状态管理
 *
 * 真实 BFF：模板全量列表（前端按分类筛选）、新建、编辑、删除。
 * 健康门禁：BFF/DB 不可用时显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import {
  createEmrTemplateApi,
  deleteEmrTemplateApi,
  listEmrTemplatesApi,
  updateEmrTemplateApi,
  type CreateEmrTemplateInput,
  type EmrTemplate,
  type UpdateEmrTemplateInput,
} from '@/services/api/emrTemplate';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 由模板列表派生分类清单（按出现顺序去重；空分类归入“未分类”）。 */
export function deriveCategories(templates: EmrTemplate[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of templates) {
    const key = t.category || '未分类';
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

interface EmrTemplateState {
  /** 全量模板列表 */
  templates: EmrTemplate[];
  /** 全部分类清单 */
  categories: string[];
  /** 当前选中分类；空串表示“全部” */
  activeCategory: string;

  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: string | null;

  setCategory: (category: string) => void;
  loadTemplates: () => Promise<void>;
  createTemplate: (input: CreateEmrTemplateInput) => Promise<boolean>;
  updateTemplate: (id: string, input: UpdateEmrTemplateInput) => Promise<boolean>;
  removeTemplate: (id: string) => Promise<boolean>;
  clearMessages: () => void;
}

export const useEmrTemplateStore = create<EmrTemplateState>((set, get) => ({
  templates: [],
  categories: [],
  activeCategory: '',

  loading: false,
  submitting: false,
  error: null,
  success: null,

  setCategory: (category) => set({ activeCategory: category }),

  loadTemplates: async () => {
    set({ loading: true, error: null });
    try {
      // 始终拉全量列表，分类筛选在前端完成（保证分类清单始终准确）。
      const templates = await listEmrTemplatesApi();
      set({
        templates,
        categories: deriveCategories(templates),
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: `模板加载失败：${errMsg(e)}` });
    }
  },

  createTemplate: async (input) => {
    set({ submitting: true, error: null, success: null });
    try {
      await createEmrTemplateApi(input);
      set({ success: '模板已创建' });
      await get().loadTemplates();
      set({ submitting: false });
      return true;
    } catch (e) {
      set({ submitting: false, error: `创建失败：${errMsg(e)}` });
      return false;
    }
  },

  updateTemplate: async (id, input) => {
    set({ submitting: true, error: null, success: null });
    try {
      await updateEmrTemplateApi(id, input);
      set({ success: '模板已更新' });
      await get().loadTemplates();
      set({ submitting: false });
      return true;
    } catch (e) {
      set({ submitting: false, error: `更新失败：${errMsg(e)}` });
      return false;
    }
  },

  removeTemplate: async (id) => {
    set({ submitting: true, error: null, success: null });
    try {
      await deleteEmrTemplateApi(id);
      set({ success: '模板已删除' });
      await get().loadTemplates();
      set({ submitting: false });
      return false;
    } catch (e) {
      set({ submitting: false, error: `删除失败：${errMsg(e)}` });
      return false;
    }
  },

  clearMessages: () => set({ error: null, success: null }),
}));
