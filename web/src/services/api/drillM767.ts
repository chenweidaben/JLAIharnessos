/**
 * 健澜科技 jlmedaios - 应急演练管理 API（M767）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DrillResult = 'excellent' | 'good' | 'fair' | 'poor';

export interface Drill {
  id: string;
  name: string;
  type: string;
  heldAt: string;
  participantCount: number;
  result: DrillResult;
  plan: string;
  process: string;
  evaluation: string;
  improvements: string;
}

export const DRILL_RESULT_META: Record<DrillResult, { label: string; color: string }> = {
  excellent: { label: '优秀', color: 'green' },
  good: { label: '良好', color: 'blue' },
  fair: { label: '合格', color: 'orange' },
  poor: { label: '不合格', color: 'red' },
};

const DEMO: Drill[] = [
  {
    id: 'DL-001',
    name: '2026 年度大规模伤员接收应急演练',
    type: '批量伤员救治',
    heldAt: '2026-10-15 14:00',
    participantCount: 80,
    result: 'good',
    plan: '模拟车祸 30 名伤员分级救治，含检伤分类、手术、ICU 联动。',
    process: '14:00 启动 → 14:20 首批伤员到院 → 15:30 全部安置完成。',
    evaluation: '整体响应 20 分钟达标；CT 通道拥堵为改进点。',
    improvements: '增开 1 个急诊 CT 检查通道，优化分诊流程。',
  },
];

export interface DrillListResult {
  items: Drill[];
  demo: boolean;
}

export async function fetchDrills(): Promise<DrillListResult> {
  try {
    const res = await get<{ items: Drill[] }>('/public-health/drills');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
