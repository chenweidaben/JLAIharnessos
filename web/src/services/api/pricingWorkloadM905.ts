/**
 * 健澜科技 jlmedaios - 物价管理 API（M905）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PricingWorkload {
  id: string;
  date: string;
  serviceItems: number;
  drugPrices: number;
  consumablePrices: number;
  adjustments: number;
  violations: number;
  status: string;
  serviceBreakdown: { name: string; count: number }[];
  drugCatalog: string;
  consumableCatalog: string;
  adjustmentRecords: string;
  violationRectification: string;
  publicity: string;
}

const DEMO: PricingWorkload[] = [
  {
    id: 'PRC-905',
    date: '2026-10-22',
    serviceItems: 3200,
    drugPrices: 1800,
    consumablePrices: 480,
    adjustments: 6,
    violations: 0,
    status: '正常运行',
    serviceBreakdown: [
      { name: '综合医疗服务', count: 800 },
      { name: '医技检查', count: 1200 },
      { name: '治疗服务', count: 900 },
      { name: '手术服务', count: 300 },
    ],
    drugCatalog: '药品价格目录：执行国家集采中选价（380 种）；省平台联动价（1200 种）；医院制剂 220 种；价格公示率 100%。',
    consumableCatalog: '耗材价格目录：高值耗材 180 种（UDI 追溯）；普通耗材 300 种；集采耗材中选率 100%。',
    adjustmentRecords: '价格调整记录：本月调整 6 项（药品 4/耗材 2）；均为省平台联动；调整后 24h 内完成系统同步。',
    violationRectification: '违规收费整改：本月飞检 12 科室；发现违规收费 0 例；历史问题整改率 100%。',
    publicity: '物价公示：门诊大厅电子屏、自助机、APP 三端同步公示；价格投诉 0 起。',
  },
];

export interface PricingWorkloadListResult {
  items: PricingWorkload[];
  demo: boolean;
}

export async function fetchPricingWorkload(): Promise<PricingWorkloadListResult> {
  try {
    const res = await get<{ items: PricingWorkload[] }>('/pricing/management/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
