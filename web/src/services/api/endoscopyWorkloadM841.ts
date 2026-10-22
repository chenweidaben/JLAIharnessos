/**
 * 健澜科技 jlmedaios - 内镜中心管理（M841 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EndoscopyWorkloadM841 {
  id: string;
  date: string;
  gastroscopy: number;
  colonoscopy: number;
  bronchoscopy: number;
  eus: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  biopsyRecords: string;
  polypectomyRecords: string;
  anesthesia: string;
  complications: { time: string; patient: string; type: string; action: string }[];
}

const DEMO: EndoscopyWorkloadM841[] = [
  {
    id: 'EN-841',
    date: '2026-10-22',
    gastroscopy: 40,
    colonoscopy: 22,
    bronchoscopy: 6,
    eus: 4,
    status: '正常运行',
    typeBreakdown: [
      { name: '胃镜', count: 40 },
      { name: '肠镜', count: 22 },
      { name: '支气管镜', count: 6 },
      { name: '超声内镜（EUS）', count: 4 },
    ],
    biopsyRecords: '活检 24 例；病理 3 个工作日回传。',
    polypectomyRecords: '息肉切除 8 例（EMR 5 / ESD 2 / 氩气刀 1）。',
    anesthesia: '镇静麻醉 32 例（丙泊酚）；清醒镇静 30 例。',
    complications: [
      { time: '11:20', patient: '章患者', type: '肠镜后少量出血', action: '钛夹 1 枚止血，观察 30min 安返' },
    ],
  },
];

export interface EndoscopyWorkloadM841Result {
  items: EndoscopyWorkloadM841[];
  demo: boolean;
}

export async function fetchEndoscopyWorkloadM841(): Promise<EndoscopyWorkloadM841Result> {
  try {
    const res = await get<{ items: EndoscopyWorkloadM841[] }>('/endoscopy/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
