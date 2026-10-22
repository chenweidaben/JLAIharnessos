/**
 * 健澜科技 jlmedaios - ICU 管理（M884 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IcuWorkloadM884 {
  id: string;
  date: string;
  openBeds: number;
  occupiedBeds: number;
  apacheAvg: number;
  vent: number;
  crrt: number;
  status: string;
  apacheDistribution: { name: string; count: number }[];
  ventilation: string;
  crrtDetail: string;
  cvc: string;
  haiRates: string;
  mortality: string;
}

const DEMO: IcuWorkloadM884[] = [
  {
    id: 'ICU-884',
    date: '2026-10-22',
    openBeds: 60,
    occupiedBeds: 55,
    apacheAvg: 18.5,
    vent: 22,
    crrt: 6,
    status: '正常运行',
    apacheDistribution: [
      { name: 'APACHE II <15（轻）', count: 12 },
      { name: '15-25（中）', count: 28 },
      { name: '>25（重）', count: 15 },
    ],
    ventilation: '机械通气：插管 18 例；气切 4 例；平均通气时间 5.2 天；VAP 发生率 8.2‰。',
    crrtDetail: 'CRRT：6 例（AKI 4 / 横纹肌溶解 1 / 严重酸碱失衡 1）；平均治疗 36h。',
    cvc: '中心静脉导管（CVC）：在管 38 例；CLABSI 发生率 1.5‰；CAUTI 3.2‰。',
    haiRates: '院内感染：VAP 8.2‰；CLABSI 1.5‰；CAUTI 3.2‰；均低于国家控制线。',
    mortality: 'ICU 死亡率：今日 2 例（脓毒性休克/MODS）；28 天死亡率 18.2%。',
  },
];

export interface IcuWorkloadM884Result {
  items: IcuWorkloadM884[];
  demo: boolean;
}

export async function fetchIcuWorkloadM884(): Promise<IcuWorkloadM884Result> {
  try {
    const res = await get<{ items: IcuWorkloadM884[] }>('/icu/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
