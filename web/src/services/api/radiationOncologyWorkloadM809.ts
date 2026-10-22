/**
 * 健澜科技 jlmedaios - 放疗科管理 API（M809）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RadiationOncologyPatient {
  id: string;
  patient: string;
  diagnosis: string;
  modality: string;
  doseGy: number;
  fractions: number;
  status: string;
  plan: string;
  targetVolume: string;
  doseDistribution: string;
  record: string;
  adverseEvents: string;
}

const DEMO: RadiationOncologyPatient[] = [
  {
    id: 'RT-001',
    patient: '宋患者',
    diagnosis: '左肺上叶鳞癌 cT2N0M0 IIA 期',
    modality: 'VMAT 调强放疗',
    doseGy: 60,
    fractions: 30,
    status: '已完成第 20/30 次',
    plan: 'RTOG 0615 方案；PTV 60Gy/30f，脊髓 Dmax <45Gy。',
    targetVolume: 'GTV 68cc；PTV 210cc；双肺 V20 18%。',
    doseDistribution: 'DVH 评估：95% PTV 覆盖 59.4Gy；正常组织在限值内。',
    record: '本周完成 5 次；体位误差 <3mm；在线 CBCT 验证通过。',
    adverseEvents: 'I 级放射性肺炎（CTCAE）；予对症处理。',
  },
];

export interface RadiationOncologyListResult {
  items: RadiationOncologyPatient[];
  demo: boolean;
}

export async function fetchRadiationOncologyWorkload(): Promise<RadiationOncologyListResult> {
  try {
    const res = await get<{ items: RadiationOncologyPatient[] }>('/radiation-oncology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
