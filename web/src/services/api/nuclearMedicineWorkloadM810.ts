/**
 * 健澜科技 jlmedaios - 核医学科管理 API（M810）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NuclearMedicineWorkload {
  id: string;
  date: string;
  examItem: string;
  studies: number;
  radiopharmaceutical: string;
  status: string;
  itemBreakdown: { name: string; count: number }[];
  drugUsage: { drug: string; activity: string; studies: number }[];
  radiationSafety: string;
}

const DEMO: NuclearMedicineWorkload[] = [
  {
    id: 'NM-001',
    date: '2026-10-22',
    examItem: '综合',
    studies: 28,
    radiopharmaceutical: 'F-18 FDG / Tc-99m MDP',
    status: '正常运行',
    itemBreakdown: [
      { name: 'PET-CT', count: 8 },
      { name: 'SPECT', count: 12 },
      { name: '骨扫描', count: 8 },
    ],
    drugUsage: [
      { drug: 'F-18 FDG', activity: '约 370 MBq/人', studies: 8 },
      { drug: 'Tc-99m MDP', activity: '约 740 MBq/人', studies: 8 },
    ],
    radiationSafety: '辐射工作人员剂量监测合格；患者候检区屏蔽达标；放射性废物衰变库记录齐全。',
  },
];

export interface NuclearMedicineListResult {
  items: NuclearMedicineWorkload[];
  demo: boolean;
}

export async function fetchNuclearMedicineWorkload(): Promise<NuclearMedicineListResult> {
  try {
    const res = await get<{ items: NuclearMedicineWorkload[] }>('/nuclear-medicine/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
