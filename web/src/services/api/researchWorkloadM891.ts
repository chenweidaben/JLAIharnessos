/**
 * 健澜科技 jlmedaios - 科研管理 API（M891）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ResearchWorkload {
  id: string;
  date: string;
  ongoingProjects: number;
  newProjects: number;
  papers: number;
  patents: number;
  funding: number;
  status: string;
  projectBreakdown: { name: string; count: number }[];
  paperBreakdown: { name: string; count: number }[];
  patentBreakdown: { name: string; count: number }[];
  collaboration: string;
  ethics: string;
}

const DEMO: ResearchWorkload[] = [
  {
    id: 'RS-891',
    date: '2026-10-22',
    ongoingProjects: 36,
    newProjects: 3,
    papers: 12,
    patents: 2,
    funding: 480,
    status: '正常运行',
    projectBreakdown: [
      { name: '国家级（国自然）', count: 4 },
      { name: '省部级（省自然/卫健委）', count: 12 },
      { name: '市厅级', count: 12 },
      { name: '院级', count: 8 },
    ],
    paperBreakdown: [
      { name: 'SCI 论文', count: 4 },
      { name: '中文核心', count: 5 },
      { name: '统计源', count: 3 },
    ],
    patentBreakdown: [
      { name: '发明专利', count: 1 },
      { name: '实用新型', count: 1 },
      { name: '外观设计', count: 0 },
    ],
    collaboration: '科研合作：与浙江大学合作课题 2 项；与企业横向合作 3 项；与中科院联合实验室 1 个。',
    ethics: '伦理审查：本月新上项目伦理审查 6 项；通过 5 项；修改后再审 1 项；无违规事件。',
  },
];

export interface ResearchWorkloadListResult {
  items: ResearchWorkload[];
  demo: boolean;
}

export async function fetchResearchWorkload(): Promise<ResearchWorkloadListResult> {
  try {
    const res = await get<{ items: ResearchWorkload[] }>('/research/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
