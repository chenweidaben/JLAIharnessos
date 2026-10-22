/**
 * 健澜科技 jlmedaios - 护理管理 API（M889）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NursingWorkload {
  id: string;
  date: string;
  totalNursing: number;
  gradedCare: number;
  level1: number;
  special: number;
  adverseEvents: number;
  status: string;
  careLevelBreakdown: { name: string; count: number }[];
  qualityControl: string;
  training: string;
  scheduling: string;
  satisfaction: string;
}

const DEMO: NursingWorkload[] = [
  {
    id: 'NR-889',
    date: '2026-10-22',
    totalNursing: 1080,
    gradedCare: 980,
    level1: 320,
    special: 22,
    adverseEvents: 2,
    status: '正常运行',
    careLevelBreakdown: [
      { name: '特级护理', count: 22 },
      { name: '一级护理', count: 320 },
      { name: '二级护理', count: 520 },
      { name: '三级护理', count: 218 },
    ],
    qualityControl: '护理质控：压疮发生 2 例（院外带入 1/院内 1，已上报跟踪）；跌倒 1 例；管路滑脱 0 例。',
    training: '护理培训：新护士规培 8 人（OSCE 考核）；在职继续教育 120 人（年度学时达标率 95%）。',
    scheduling: '护理排班：白班 120 人；小夜 60 人；大夜 60 人；床护比 1:0.42（达标）。',
    satisfaction: '护患沟通满意度：患者满意度 96.5%；出院随访满意度 95.8%。',
  },
];

export interface NursingWorkloadListResult {
  items: NursingWorkload[];
  demo: boolean;
}

export async function fetchNursingWorkload(): Promise<NursingWorkloadListResult> {
  try {
    const res = await get<{ items: NursingWorkload[] }>('/nursing/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
