/**
 * 健澜科技 jlmedaios - 院感管理 API（M892）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InfectionWorkload {
  id: string;
  date: string;
  cases: number;
  handHygiene: number;
  disinfectionPass: number;
  antibioticsUse: number;
  mdro: number;
  status: string;
  siteBreakdown: { name: string; count: number }[];
  handHygieneDetail: string;
  disinfection: string;
  auc: string;
  mdroBreakdown: { name: string; count: number }[];
  outbreak: string;
}

const DEMO: InfectionWorkload[] = [
  {
    id: 'IC-892',
    date: '2026-10-22',
    cases: 18,
    handHygiene: 92,
    disinfectionPass: 99.2,
    antibioticsUse: 45.5,
    mdro: 6,
    status: '正常运行',
    siteBreakdown: [
      { name: '呼吸道感染', count: 8 },
      { name: '泌尿道感染', count: 4 },
      { name: '手术部位感染', count: 3 },
      { name: '血液感染（CLABSI）', count: 3 },
    ],
    handHygieneDetail: '手卫生依从率：92%（目标 ≥90%）；正确率 95%；ICU 科室依从率最高 96%。',
    disinfection: '消毒灭菌效果监测：空气培养合格率 99.2%；物表 99.5%；使用中消毒液 100%。',
    auc: '抗菌药物使用强度（DDDs）：45.5 DDDs/100 人天（目标 ≤40）；门诊抗菌药物使用率 18%；住院 65%。',
    mdroBreakdown: [
      { name: 'MRSA（耐甲氧西林金葡）', count: 2 },
      { name: 'VRE（耐万古肠球菌）', count: 1 },
      { name: 'CRE（耐碳青霉烯肠杆菌）', count: 3 },
    ],
    outbreak: '暴发疫情处置：今日无暴发事件；上月 1 起 ICU 多重耐药菌聚集已闭环（接触隔离+主动筛查+环境采样）。',
  },
];

export interface InfectionWorkloadListResult {
  items: InfectionWorkload[];
  demo: boolean;
}

export async function fetchInfectionWorkload(): Promise<InfectionWorkloadListResult> {
  try {
    const res = await get<{ items: InfectionWorkload[] }>('/infection/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
