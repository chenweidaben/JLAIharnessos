/**
 * 健澜科技 jlmedaios - 内分泌科管理 API（M862）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EndocrinologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  diabetesFollowUp: number;
  thyroidNodule: number;
  osteoporosis: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  diabetesRecords: string;
  thyroidBiopsy: string;
  boneDensity: string;
}

const DEMO: EndocrinologyWorkload[] = [
  {
    id: 'EN-862',
    date: '2026-10-22',
    outpatient: 200,
    inpatient: 22,
    diabetesFollowUp: 86,
    thyroidNodule: 24,
    osteoporosis: 18,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '糖尿病（1 型/2 型/妊娠）', count: 98 },
      { name: '甲状腺功能亢进', count: 28 },
      { name: '甲状腺功能减退', count: 32 },
      { name: '骨质疏松症', count: 18 },
      { name: '其他（肥胖/代谢综合征）', count: 24 },
    ],
    diabetesRecords: '糖尿病随访：HbA1c 平均 7.2%（达标 <7% 占 52%）；血糖监测（CGM）12 例；胰岛素强化治疗 8 例。',
    thyroidBiopsy: '甲状腺结节穿刺（FNA）：6 例（TI-RADS 4 类 4 / 5 类 2）；恶性 1 例（已转外科）。',
    boneDensity: '骨密度检查（DXA）：腰椎/髋部 18 例；骨质疏松 T≤-2.5 8 例（已启动抗骨松治疗）；骨量减少 6 例。',
  },
];

export interface EndocrinologyWorkloadListResult {
  items: EndocrinologyWorkload[];
  demo: boolean;
}

export async function fetchEndocrinologyWorkload(): Promise<EndocrinologyWorkloadListResult> {
  try {
    const res = await get<{ items: EndocrinologyWorkload[] }>('/endocrinology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
