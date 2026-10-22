/**
 * 健澜科技 jlmedaios - 核医学科管理（M881 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NuclearMedicineWorkloadM881 {
  id: string;
  date: string;
  spect: number;
  petCt: number;
  i131Treatment: number;
  boneScan: number;
  status: string;
  examBreakdown: { name: string; count: number }[];
  treatmentBreakdown: { name: string; count: number }[];
  radiopharmaceuticals: string;
  radiationProtection: string;
}

const DEMO: NuclearMedicineWorkloadM881[] = [
  {
    id: 'NM-881',
    date: '2026-10-22',
    spect: 18,
    petCt: 6,
    i131Treatment: 4,
    boneScan: 10,
    status: '正常运行',
    examBreakdown: [
      { name: 'SPECT（心肌/甲状腺/肾）', count: 8 },
      { name: 'PET-CT（肿瘤分期）', count: 6 },
      { name: '骨扫描（全身骨显像）', count: 10 },
      { name: '甲状腺吸碘率', count: 4 },
    ],
    treatmentBreakdown: [
      { name: '碘131 治疗甲亢', count: 2 },
      { name: '碘131 治疗分化型甲状腺癌', count: 2 },
      { name: '云克治疗类风湿', count: 2 },
    ],
    radiopharmaceuticals: '放射性药物：99mTc 淋洗 4 次；18F-FDG 合成 6 批；131I 到货 200mCi；活度监测全部在控。',
    radiationProtection: '辐射防护记录：工作人员个人剂量计 12 人（月剂量均 <1mSv）；场所辐射监测每日 2 次合格；患者陪护告知 100%。',
  },
];

export interface NuclearMedicineWorkloadM881Result {
  items: NuclearMedicineWorkloadM881[];
  demo: boolean;
}

export async function fetchNuclearMedicineWorkloadM881(): Promise<NuclearMedicineWorkloadM881Result> {
  try {
    const res = await get<{ items: NuclearMedicineWorkloadM881[] }>('/nuclear-medicine/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
