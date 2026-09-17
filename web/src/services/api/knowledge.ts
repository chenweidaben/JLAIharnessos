/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 知识库 API
 */
import { get, post } from '../request';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import { mockKnowledgeDocs, mockKnowledgeSearch, type KnowledgeDocument } from '@/mock/knowledge';

export interface KnowledgeDocResult {
  title: string;
  snippet: string;
  score: number;
}

export const knowledgeApi = {
  async search(query: string): Promise<KnowledgeDocResult[]> {
    if (env.mockEnabled) {
      await delay(120, 300);
      return mockKnowledgeSearch(query);
    }
    return post<KnowledgeDocResult[]>('/knowledge/search', { query });
  },
  async list(): Promise<KnowledgeDocument[]> {
    if (env.mockEnabled) {
      await delay(100, 250);
      return mockKnowledgeDocs;
    }
    return get<KnowledgeDocument[]>('/knowledge/documents');
  },
  categories(): Promise<string[]> {
    return get<string[]>('/knowledge/categories');
  },
};
