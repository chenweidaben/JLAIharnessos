/**
 * 健澜科技 jlmedaios - 院感管理驾驶舱 API（M832）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InfectionOverview {
  id: string;
  infectionRate: number;
  handHygieneCompliance: number;
  disinfectionPassRate: number;
  antibioticDensity: number;
  trend: { date: string; cases: number }[];
  siteInfections: { site: string; rate: number }[];
  outbreakWarning: { ward: string; cases: number; threshold: number }[];
}

const DEMO: InfectionOverview[] = [
  {
    id: 'IC-001',
    infectionRate: 1.85,
    handHygieneCompliance: 92.5,
    disinfectionPassRate: 99.0,
    antibioticDensity: 38.5,
    trend: [
      { date: '10-09', cases: 4 },
      { date: '10-12', cases: 5 },
      { date: '10-15', cases: 3 },
      { date: '10-18', cases: 6 },
      { date: '10-21', cases: 4 },
    ],
    siteInfections: [
      { site: 'VAP（呼吸机相关肺炎）', rate: 8.5 },
      { site: 'CAUTI（导尿管相关尿路感染）', rate: 2.8 },
      { site: 'CLABSI（中心静脉导管相关血流感染）', rate: 1.2 },
    ],
    outbreakWarning: [
      { ward: '呼吸内科', cases: 3, threshold: 2 },
    ],
  },
];

export interface InfectionOverviewResult {
  items: InfectionOverview[];
  demo: boolean;
}

export async function fetchInfectionOverview(): Promise<InfectionOverviewResult> {
  try {
    const res = await get<{ items: InfectionOverview[] }>('/dashboard/infection-overview');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
