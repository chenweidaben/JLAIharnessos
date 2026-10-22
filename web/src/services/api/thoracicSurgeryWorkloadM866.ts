/**
 * 健澜科技 jlmedaios - 胸外科管理 API（M866）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ThoracicSurgeryWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  lobectomy: number;
  esophagectomy: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  vatsRecords: string;
  lobectomyRecords: string;
  postOp: string;
}

const DEMO: ThoracicSurgeryWorkload[] = [
  {
    id: 'TH-866',
    date: '2026-10-22',
    outpatient: 100,
    inpatient: 20,
    surgeries: 10,
    lobectomy: 4,
    esophagectomy: 2,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '肺癌手术（肺叶/楔形）', count: 4 },
      { name: '食管癌手术', count: 2 },
      { name: '纵隔肿瘤', count: 2 },
      { name: '气胸/肺大疱', count: 2 },
    ],
    vatsRecords: '胸腔镜手术（VATS）：8 例（肺叶切除 4/楔形 2/纵隔肿瘤 2）。',
    lobectomyRecords: '肺叶切除：右肺上叶 2 例；左肺下叶 1 例；右肺中叶 1 例（均为肺癌）。',
    postOp: '术后管理：胸腔引流平均 3.2 天；呼吸功能训练（激励式肺量计）100% 覆盖；术后肺部并发症 1 例（肺不张，已治愈）。',
  },
];

export interface ThoracicSurgeryWorkloadListResult {
  items: ThoracicSurgeryWorkload[];
  demo: boolean;
}

export async function fetchThoracicSurgeryWorkload(): Promise<ThoracicSurgeryWorkloadListResult> {
  try {
    const res = await get<{ items: ThoracicSurgeryWorkload[] }>('/thoracic-surgery/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
