/**
 * 健澜科技 jlmedaios - 输血科管理 API（M878）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface BloodBankWorkload {
  id: string;
  date: string;
  rbc: number;
  plasma: number;
  platelets: number;
  cryoprecipitate: number;
  reactions: number;
  status: string;
  inbound: string;
  outbound: string;
  bloodTypeBreakdown: { name: string; count: number }[];
  reactionsBreakdown: { name: string; count: number }[];
  autologous: string;
}

const DEMO: BloodBankWorkload[] = [
  {
    id: 'BB-878',
    date: '2026-10-22',
    rbc: 42,
    plasma: 28,
    platelets: 12,
    cryoprecipitate: 6,
    reactions: 1,
    status: '正常运行',
    inbound: '血液入库：中心血站入悬浮红细胞 80U/血浆 60U/血小板 12 治疗量；血型 A/B/O/AB 均有库存预警。',
    outbound: '血液出库：手术用血 30U（普外/骨科/妇产）；抢救用血 18U（创伤/消化道出血）；贫血纠正 30U。',
    bloodTypeBreakdown: [
      { name: 'A 型', count: 48 },
      { name: 'B 型', count: 42 },
      { name: 'O 型', count: 52 },
      { name: 'AB 型', count: 16 },
    ],
    reactionsBreakdown: [
      { name: '发热反应', count: 1 },
      { name: '过敏反应', count: 0 },
      { name: '溶血反应', count: 0 },
    ],
    autologous: '自体输血记录：术中自体血回输 3 例（骨科/心血管）；储存式自体备血 2 例；未发生感染。',
  },
];

export interface BloodBankWorkloadListResult {
  items: BloodBankWorkload[];
  demo: boolean;
}

export async function fetchBloodBankWorkload(): Promise<BloodBankWorkloadListResult> {
  try {
    const res = await get<{ items: BloodBankWorkload[] }>('/blood-bank/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
