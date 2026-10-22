/**
 * 健澜科技 jlmedaios - 后勤保障 API（M912）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface LogisticsWorkload {
  id: string;
  date: string;
  repairOrders: number;
  repairCompleted: number;
  laundryBatches: number;
  cateringVisits: number;
  greenArea: number;
  status: string;
  repairBreakdown: { name: string; count: number }[];
  laundryDetail: string;
  cateringDetail: string;
  greenCleaning: string;
  medicalWaste: string;
  sewage: string;
}

const DEMO: LogisticsWorkload[] = [
  {
    id: 'LOG-912',
    date: '2026-10-22',
    repairOrders: 48,
    repairCompleted: 44,
    laundryBatches: 320,
    cateringVisits: 2400,
    greenArea: 12000,
    status: '正常运行',
    repairBreakdown: [
      { name: '水电维修', count: 18 },
      { name: '空调维修', count: 12 },
      { name: '电梯维修', count: 4 },
      { name: '家具维修', count: 14 },
    ],
    laundryDetail: '被服洗涤：病区被服 240 批；手术室敷料 60 批；ICU 专用被服 20 批；洗涤合格率 100%；转运追溯 100%。',
    cateringDetail: '餐饮供应：职工餐 1200 人次；患者餐 1200 人次（含糖尿病/低盐/流食特殊餐 180）；手术餐 240 份；餐饮投诉 1 起（已整改）。',
    greenCleaning: '绿化保洁：院内绿化 12000 ㎡（月修剪 2 次）；公共区域保洁 80000 ㎡（日扫 2 次）；卫生间巡检 48 次/日。',
    medicalWaste: '医疗废物处置：今日医疗废物 480kg（感染性 420/损伤性 30/病理性 20/化学性 10）；日清日结；资质转运 100%。',
    sewage: '污水污物处理：医院污水处理站日处理 800 吨；余氯 0.5mg/L（达标）；粪大肠菌群 < 5000/L；在线监测联网卫健委。',
  },
];

export interface LogisticsWorkloadListResult {
  items: LogisticsWorkload[];
  demo: boolean;
}

export async function fetchLogisticsWorkload(): Promise<LogisticsWorkloadListResult> {
  try {
    const res = await get<{ items: LogisticsWorkload[] }>('/logistics/management/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
