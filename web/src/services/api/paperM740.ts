/**
 * 健澜科技 jlmedaios - 论文管理 API（M740）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PaperStatus = 'submitted' | 'accepted' | 'published' | 'rejected';

export interface Paper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  publishedAt: string;
  impactFactor: number;
  status: PaperStatus;
  abstract: string;
  contribution: string;
  indexedIn: string;
}

export const PAPER_STATUS_META: Record<PaperStatus, { label: string; color: string }> = {
  submitted: { label: '已投稿', color: 'blue' },
  accepted: { label: '已录用', color: 'orange' },
  published: { label: '已发表', color: 'green' },
  rejected: { label: '已拒稿', color: 'red' },
};

const DEMO: Paper[] = [
  {
    id: 'PP-001',
    title: 'AI 原生医院 OS：面向三甲医院的智能体调度架构',
    authors: '陈维, 张三, 李四',
    journal: '《中国数字医学》',
    publishedAt: '2026-08-15',
    impactFactor: 1.8,
    status: 'published',
    abstract: '本文提出一种基于智能体编排的 AI 原生医院操作系统架构，覆盖 HIS/EMR/CDS 全栈。',
    contribution: '陈维（通讯作者）：架构设计与实验。',
    indexedIn: '万方 / 知网',
  },
];

export interface PaperListResult {
  items: Paper[];
  demo: boolean;
}

export async function fetchPapers(): Promise<PaperListResult> {
  try {
    const res = await get<{ items: Paper[] }>('/research/papers');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
