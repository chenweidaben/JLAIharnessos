/**
 * 健澜科技 jlmedaios - 知识库管理与 RAG 检索状态管理（M4-A）
 *
 * 真实 BFF：知识库 CRUD、文档摄入（解析、分块、嵌入、索引）、混合检索。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as kbApi from '@/services/api/knowledgeBase';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  CreateKbInput,
  IngestDocumentInput,
  KnowledgeBase,
  KnowledgeDocument,
  RetrievalResult,
} from '@/types/knowledgeBase';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface KnowledgeBaseState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  kbs: KnowledgeBase[];
  documents: KnowledgeDocument[];
  selectedKbId: string | null;
  results: RetrievalResult[];

  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: string | null;

  checkHealth: () => Promise<boolean>;
  loadKbs: () => Promise<void>;
  selectKb: (id: string) => Promise<void>;
  createKb: (input: CreateKbInput) => Promise<boolean>;
  deleteKb: (id: string) => Promise<boolean>;
  ingestDocument: (input: IngestDocumentInput) => Promise<boolean>;
  retrieve: (query: string, kbIds?: string[], topK?: number) => Promise<boolean>;
  clearMessages: () => void;
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  kbs: [],
  documents: [],
  selectedKbId: null,
  results: [],

  loading: false,
  submitting: false,
  error: null,
  success: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ health, dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        health: null,
        dbUp: false,
        healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  loadKbs: async () => {
    set({ loading: true, error: null });
    try {
      const kbs = await kbApi.listKbsApi();
      set({ kbs, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  selectKb: async (id) => {
    set({ selectedKbId: id, loading: true, error: null });
    try {
      const documents = await kbApi.listDocumentsApi(id);
      set({ documents, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  createKb: async (input) => {
    if (!get().dbUp) {
      set({ error: 'BFF/数据库不可用，无法新建知识库' });
      return false;
    }
    set({ submitting: true, error: null, success: null });
    try {
      await kbApi.createKbApi(input);
      await get().loadKbs();
      set({ submitting: false, success: `知识库 ${input.name} 已创建` });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  deleteKb: async (id) => {
    if (!get().dbUp) {
      set({ error: 'BFF/数据库不可用，无法删除知识库' });
      return false;
    }
    set({ submitting: true, error: null, success: null });
    try {
      await kbApi.deleteKbApi(id);
      if (get().selectedKbId === id) {
        set({ selectedKbId: null, documents: [] });
      }
      await get().loadKbs();
      set({ submitting: false, success: `知识库 ${id} 已删除` });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  ingestDocument: async (input) => {
    const kbId = get().selectedKbId;
    if (!kbId) {
      set({ error: '请先选择目标知识库' });
      return false;
    }
    if (!get().dbUp) {
      set({ error: 'BFF/数据库不可用，无法摄入文档' });
      return false;
    }
    set({ submitting: true, error: null, success: null });
    try {
      const res = await kbApi.ingestDocumentApi(kbId, input);
      await get().selectKb(kbId);
      set({
        submitting: false,
        success: `文档已摄入，生成 ${res.chunkCount} 个分块（${res.embeddingProvider}）`,
      });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  retrieve: async (query, kbIds, topK) => {
    if (!get().dbUp) {
      set({ error: 'BFF/数据库不可用，无法检索' });
      return false;
    }
    set({ loading: true, error: null });
    try {
      const results = await kbApi.retrieveApi(query, { kbIds, topK });
      set({ results, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, results: [], error: errMsg(e) });
      return false;
    }
  },

  clearMessages: () => set({ error: null, success: null }),
}));
