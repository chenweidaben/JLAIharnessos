/**
 * 健澜科技 jlmedaios - 内镜中心管理 API（M808）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EndoscopyWorkload {
  id: string;
  date: string;
  scopeType: string;
  exams: number;
  treatments: number;
  biopsies: number;
  status: string;
  typeBreakdown: { name: string; exams: number; treatments: number; biopsies: number }[];
  polypectomy: number;
  complications: { time: string; patient: string; type: string; action: string }[];
  disinfection: string;
}

const DEMO: EndoscopyWorkload[] = [
  {
    id: 'EN-001',
    date: '2026-10-22',
    scopeType: '综合',
    exams: 68,
    treatments: 12,
    biopsies: 24,
    status: '正常运行',
    typeBreakdown: [
      { name: '胃镜', exams: 40, treatments: 5, biopsies: 12 },
      { name: '肠镜', exams: 22, treatments: 7, biopsies: 10 },
      { name: '支气管镜', exams: 6, treatments: 0, biopsies: 2 },
    ],
    polypectomy: 8,
    complications: [
      { time: '11:20', patient: '周患者', type: '术后少量出血', action: '钛夹止血 1 枚，观察 30min 后安返' },
    ],
    disinfection: '本日洗消 76 台次；测漏 3 台；洗消追溯记录齐全。',
  },
];

export interface EndoscopyWorkloadListResult {
  items: EndoscopyWorkload[];
  demo: boolean;
}

export async function fetchEndoscopyWorkload(): Promise<EndoscopyWorkloadListResult> {
  try {
    const res = await get<{ items: EndoscopyWorkload[] }>('/endoscopy/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
