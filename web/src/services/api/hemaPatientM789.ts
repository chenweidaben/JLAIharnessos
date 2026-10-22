/**
 * 健澜科技 jlmedaios - 血液科管理 API（M789）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HemaPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  wbc: number;
  hgb: number;
  plt: number;
  status: string;
  boneMarrow: string;
  flowCytometry: string;
  chemoRegimen: string;
  transfusionRecords: { date: string; product: string; volume: string }[];
  infectionPrevention: string;
}

const DEMO: HemaPatient[] = [
  {
    id: 'HM-001',
    inpatientNo: 'ZY-261116',
    patient: '沈患者',
    diagnosis: '急性 B 淋巴细胞白血病（B-ALL），中危组',
    wbc: 3.2,
    hgb: 78,
    plt: 45,
    status: '化疗中',
    boneMarrow: '骨髓增生明显活跃，原始淋巴细胞占 62%。',
    flowCytometry: 'CD19+ CD10+ CD20- CD34+，符合 Common-B-ALL 表型。',
    chemoRegimen: 'VDLP 方案（长春新碱 + 柔红霉素 + 左旋门冬酰胺酶 + 泼尼松），第 1 疗程。',
    transfusionRecords: [
      { date: '2026-10-20', product: '去白红细胞', volume: '2U' },
      { date: '2026-10-20', product: '单采血小板', volume: '1治疗量' },
    ],
    infectionPrevention: '层流病房保护性隔离，G-CSF 升白，口腔肛周护理。',
  },
];

export interface HemaListResult {
  items: HemaPatient[];
  demo: boolean;
}

export async function fetchHemaPatients(): Promise<HemaListResult> {
  try {
    const res = await get<{ items: HemaPatient[] }>('/clinical/hema-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
