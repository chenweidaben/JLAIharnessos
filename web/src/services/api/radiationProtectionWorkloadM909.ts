/**
 * 健澜科技 jlmedaios - 放射防护 API（M909）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiationProtectionWorkload {
  id: string;
  date: string;
  devices: number;
  doseMonitored: number;
  envMonitoring: number;
  accidents: number;
  protectionGoodRate: number;
  status: string;
  deviceBreakdown: { name: string; count: number }[];
  doseResult: string;
  envResult: string;
  healthMonitoring: string;
  protectionGear: string;
  emergency: string;
}

const DEMO: RadiationProtectionWorkload[] = [
  {
    id: 'RAD-909',
    date: '2026-10-22',
    devices: 28,
    doseMonitored: 86,
    envMonitoring: 12,
    accidents: 0,
    protectionGoodRate: 100,
    status: '正常运行',
    deviceBreakdown: [
      { name: 'CT', count: 6 },
      { name: 'DR', count: 12 },
      { name: 'DSA', count: 2 },
      { name: '介入设备', count: 8 },
    ],
    doseResult: '个人剂量监测：86 名放射工作人员均佩戴个人剂量计；本周期人均 0.8mSv（限值 20mSv/年）；超阈值 0 人。',
    envResult: '环境辐射监测：机房 8 个监测点（本底 0.12-0.18μSv/h，合格）；周边 4 个监测点（均在管理目标值 0.25μSv/h 以下）。',
    healthMonitoring: '放射工作人员健康监护：上岗前体检率 100%；在岗体检率 100%（年度）；离岗体检率 100%；职业禁忌证 0 人。',
    protectionGear: '防护用品：铅衣 48 件、铅围脖 24 件、铅眼镜 24 副；全部按月检查；完好率 100%；破损报废 0。',
    emergency: '放射事故应急：今日事故 0 起；最近一次应急演练（2026-09-15）；应急响应时间 < 5min。',
  },
];

export interface RadiationProtectionWorkloadListResult {
  items: RadiationProtectionWorkload[];
  demo: boolean;
}

export async function fetchRadiationProtectionWorkload(): Promise<RadiationProtectionWorkloadListResult> {
  try {
    const res = await get<{ items: RadiationProtectionWorkload[] }>('/radiation/protection/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
