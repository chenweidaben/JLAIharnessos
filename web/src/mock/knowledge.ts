/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 知识库 Mock
 */
import { uid } from '@/mock/utils';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: string;
  summary: string;
  updatedAt: string;
}

export const mockKnowledgeDocs: KnowledgeDocument[] = [
  {
    id: uid('kd'),
    title: '社区获得性肺炎诊疗指南(2026)',
    category: '临床指南',
    summary: '成人CAP经验性抗感染方案。',
    updatedAt: new Date().toISOString(),
  },
  {
    id: uid('kd'),
    title: '急性心梗急诊处理路径',
    category: '临床路径',
    summary: 'STEMI 再灌注时间窗。',
    updatedAt: new Date().toISOString(),
  },
  {
    id: uid('kd'),
    title: '病历书写规范(五级评级)',
    category: '制度规范',
    summary: '运行病历时效与签名要求。',
    updatedAt: new Date().toISOString(),
  },
];

export function mockKnowledgeSearch(
  query: string,
): { title: string; snippet: string; score: number }[] {
  return mockKnowledgeDocs
    .map((d, i) => ({
      title: d.title,
      snippet: d.summary,
      score: 0.9 - i * 0.1 - (query && !d.title.includes(query) ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score);
}
