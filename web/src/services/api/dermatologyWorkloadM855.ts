/**
 * 健澜科技 jlmedaios - 皮肤科管理（M855 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DermatologyWorkloadM855 {
  id: string;
  date: string;
  outpatient: number;
  laser: number;
  cryotherapy: number;
  fungal: number;
  dermoscopy: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  treatmentRecords: string;
  fungalExam: string;
  skinTumorScreen: string;
}

const DEMO: DermatologyWorkloadM855[] = [
  {
    id: 'DM-855',
    date: '2026-10-22',
    outpatient: 180,
    laser: 24,
    cryotherapy: 18,
    fungal: 30,
    dermoscopy: 22,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '湿疹/皮炎', count: 68 },
      { name: '银屑病', count: 18 },
      { name: '痤疮', count: 42 },
      { name: '白癜风', count: 8 },
      { name: '真菌感染（手足癣/体癣）', count: 28 },
      { name: '其他', count: 16 },
    ],
    treatmentRecords: '激光治疗（光子嫩肤/调 Q 激光）24 例；冷冻治疗 18 例；窄谱 UVB 光疗 12 例。',
    fungalExam: '真菌直接镜检 30 例（阳性 18 例）；真菌培养 4 例（结果待回）。',
    skinTumorScreen: '皮肤肿瘤筛查：皮肤镜检查 22 例；可疑黑素瘤 1 例（已建议手术切除病理）；基底细胞癌 1 例。',
  },
];

export interface DermatologyWorkloadM855Result {
  items: DermatologyWorkloadM855[];
  demo: boolean;
}

export async function fetchDermatologyWorkloadM855(): Promise<DermatologyWorkloadM855Result> {
  try {
    const res = await get<{ items: DermatologyWorkloadM855[] }>('/dermatology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
