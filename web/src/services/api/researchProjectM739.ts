/**
 * 健澜科技 jlmedaios - 科研项目管理 API（M739）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ProjectStatus = 'approved' | 'ongoing' | 'completed' | 'archived';

export interface ResearchProject {
  id: string;
  code: string;
  name: string;
  pi: string;
  budget: number;
  period: string;
  status: ProjectStatus;
  summary: string;
  expenses: { item: string; amount: number }[];
  deliverables: string;
}

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  approved: { label: '已立项', color: 'blue' },
  ongoing: { label: '在研', color: 'processing' },
  completed: { label: '已结题', color: 'green' },
  archived: { label: '已归档', color: 'default' },
};

const DEMO: ResearchProject[] = [
  {
    id: 'RP-001',
    code: '2026-ZJ-001',
    name: 'AI 原生医院操作系统关键技术研究',
    pi: '陈维',
    budget: 500000,
    period: '2026-01 ~ 2028-12',
    status: 'ongoing',
    summary: '面向三甲医院的 AI 原生 HIS/EMR 一体化架构研究。',
    expenses: [
      { item: '设备费', amount: 180000 },
      { item: '材料费', amount: 60000 },
      { item: '差旅费', amount: 20000 },
    ],
    deliverables: '已发表 SCI 2 篇、申请发明专利 3 项、开源仓库 1 个。',
  },
];

export interface ProjectListResult {
  items: ResearchProject[];
  demo: boolean;
}

export async function fetchResearchProjects(): Promise<ProjectListResult> {
  try {
    const res = await get<{ items: ResearchProject[] }>('/research/projects');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
