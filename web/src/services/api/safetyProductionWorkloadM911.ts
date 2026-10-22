/**
 * 健澜科技 jlmedaios - 安全生产 API（M911）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface SafetyProductionWorkload {
  id: string;
  date: string;
  inspections: number;
  hazardsRectified: number;
  accidents: number;
  fireDrills: number;
  trainingVisits: number;
  status: string;
  inspectionBreakdown: { name: string; count: number }[];
  hazardDetail: string;
  fireSafety: string;
  specialEquipment: string;
  hazmat: string;
  emergency: string;
}

const DEMO: SafetyProductionWorkload[] = [
  {
    id: 'SAF-911',
    date: '2026-10-22',
    inspections: 4,
    hazardsRectified: 6,
    accidents: 0,
    fireDrills: 1,
    trainingVisits: 36,
    status: '正常运行',
    inspectionBreakdown: [
      { name: '综合检查', count: 1 },
      { name: '专项检查', count: 2 },
      { name: '季节性检查', count: 1 },
    ],
    hazardDetail: '隐患排查与整改：本月排查隐患 12 条；已整改 6 条（整改率 50%）；限期整改 6 条（消防通道占用 3/配电箱老化 3）。',
    fireSafety: '消防安全：消防通道全部畅通；灭火器 480 具（月度检查合格率 100%）；喷淋系统 12 套（月检正常）；烟感 3200 个（在线率 100%）。',
    specialEquipment: '特种设备：电梯 24 台（年检合格）；锅炉 2 台（在线监测）；压力容器 18 台（安全阀校验 100%）。',
    hazmat: '危化品管理：毒麻精药品双人双锁；易燃易爆品独立库房；MSDS 全配备；月检合格率 100%。',
    emergency: '安全事故应急：今日事故 0 起；最近应急演练（2026-10-15 消防疏散）；响应时间 < 3min。',
  },
];

export interface SafetyProductionWorkloadListResult {
  items: SafetyProductionWorkload[];
  demo: boolean;
}

export async function fetchSafetyProductionWorkload(): Promise<SafetyProductionWorkloadListResult> {
  try {
    const res = await get<{ items: SafetyProductionWorkload[] }>('/safety/production/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
