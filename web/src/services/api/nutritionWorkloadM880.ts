/**
 * 健澜科技 jlmedaios - 营养科管理（M880 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NutritionWorkloadM880 {
  id: string;
  date: string;
  consultations: number;
  enteral: number;
  parenteral: number;
  screening: number;
  status: string;
  nrs: string;
  consultBreakdown: { name: string; count: number }[];
  enteralFormulas: { name: string; count: number }[];
  tpn: string;
  dietOrders: string;
}

const DEMO: NutritionWorkloadM880[] = [
  {
    id: 'NT-880',
    date: '2026-10-22',
    consultations: 24,
    enteral: 18,
    parenteral: 8,
    screening: 120,
    status: '正常运行',
    nrs: '营养风险筛查（NRS2002）：120 例；NRS≥3 分 32 例（26.7%），已全部开营养会诊。',
    consultBreakdown: [
      { name: 'ICU 危重', count: 8 },
      { name: '肿瘤术后', count: 8 },
      { name: '糖尿病肾病', count: 4 },
      { name: '炎症性肠病', count: 4 },
    ],
    enteralFormulas: [
      { name: '瑞素（整蛋白型）', count: 8 },
      { name: '瑞能（肿瘤型）', count: 4 },
      { name: '百普力（短肽型）', count: 4 },
      { name: '瑞代（糖尿病型）', count: 2 },
    ],
    tpn: '肠外营养（TPN）：8 例（ICU 4/术后肠瘘 2/肠功能衰竭 2）；均按个体化配方，双腔袋。',
    dietOrders: '饮食医嘱：治疗饮食 86 份（低盐/低脂/糖尿病/流质）；试验饮食 12 份（潜血/肌酐）。',
  },
];

export interface NutritionWorkloadM880Result {
  items: NutritionWorkloadM880[];
  demo: boolean;
}

export async function fetchNutritionWorkloadM880(): Promise<NutritionWorkloadM880Result> {
  try {
    const res = await get<{ items: NutritionWorkloadM880[] }>('/nutrition/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
