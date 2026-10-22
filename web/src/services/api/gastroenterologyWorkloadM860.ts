/**
 * 健澜科技 jlmedaios - 消化内科管理 API（M860）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GastroenterologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  gastroscopy: number;
  colonoscopy: number;
  endoscopicTherapy: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  endoscopyRecords: string;
  therapyRecords: string;
  hPylori: string;
}

const DEMO: GastroenterologyWorkload[] = [
  {
    id: 'GAS-860',
    date: '2026-10-22',
    outpatient: 220,
    inpatient: 36,
    gastroscopy: 42,
    colonoscopy: 24,
    endoscopicTherapy: 12,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '慢性胃炎', count: 68 },
      { name: '消化性溃疡', count: 24 },
      { name: '炎症性肠病（IBD）', count: 12 },
      { name: '肝病（乙肝/脂肪肝）', count: 42 },
      { name: '其他（GERD/胰腺）', count: 74 },
    ],
    endoscopyRecords: '胃肠镜记录：胃镜 42 例（活检 18）；肠镜 24 例（息肉 12）。',
    therapyRecords: '内镜下治疗：息肉切除 8 例（EMR 6/ESD 2）；止血 2 例（钛夹/APC）；ERCP 2 例（胆总管结石取石）。',
    hPylori: '幽门螺杆菌检测：C13/C14 呼气 86 例（阳性 32，阳性率 37.2%）；粪便抗原 8 例。',
  },
];

export interface GastroenterologyWorkloadListResult {
  items: GastroenterologyWorkload[];
  demo: boolean;
}

export async function fetchGastroenterologyWorkload(): Promise<GastroenterologyWorkloadListResult> {
  try {
    const res = await get<{ items: GastroenterologyWorkload[] }>('/gastroenterology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
