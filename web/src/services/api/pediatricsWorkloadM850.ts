/**
 * 健澜科技 jlmedaios - 儿科管理（M850 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PediatricsWorkloadM850 {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  feverClinic: number;
  newborn: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  vaccination: string;
  growthMonitoring: string;
  surgeries: string;
}

const DEMO: PediatricsWorkloadM850[] = [
  {
    id: 'PD-850',
    date: '2026-10-22',
    outpatient: 220,
    inpatient: 28,
    feverClinic: 80,
    newborn: 12,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '呼吸道感染（上感/支气管炎/肺炎）', count: 120 },
      { name: '消化道（腹泻/呕吐）', count: 52 },
      { name: '感染性疾病（手足口/疱疹性咽峡炎）', count: 28 },
      { name: '其他（湿疹/过敏性紫癜等）', count: 20 },
    ],
    vaccination: '疫苗接种记录：一类苗 86 剂；二类苗 24 剂；异常反应 0 例。',
    growthMonitoring: '生长发育监测：身高/体重/头围测量 60 例；营养不良筛查阳性 4 例（已转诊营养）。',
    surgeries: '儿科手术：腹股沟斜疝 2 例；包皮 1 例；扁桃体腺样体 1 例。',
  },
];

export interface PediatricsWorkloadM850Result {
  items: PediatricsWorkloadM850[];
  demo: boolean;
}

export async function fetchPediatricsWorkloadM850(): Promise<PediatricsWorkloadM850Result> {
  try {
    const res = await get<{ items: PediatricsWorkloadM850[] }>('/pediatrics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
