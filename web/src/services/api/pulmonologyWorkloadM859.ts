/**
 * 健澜科技 jlmedaios - 呼吸内科管理 API（M859）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PulmonologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  bronchoscopy: number;
  pulmonaryFunction: number;
  ventilator: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  bronchoscopyRecords: string;
  pulmonaryFunctionRecords: string;
  nonInvasiveVentilation: string;
}

const DEMO: PulmonologyWorkload[] = [
  {
    id: 'PUL-859',
    date: '2026-10-22',
    outpatient: 180,
    inpatient: 32,
    bronchoscopy: 8,
    pulmonaryFunction: 24,
    ventilator: 6,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '慢阻肺（COPD）', count: 48 },
      { name: '支气管哮喘', count: 36 },
      { name: '社区获得性肺炎', count: 42 },
      { name: '肺癌', count: 18 },
      { name: '其他（支扩/间质性肺病）', count: 36 },
    ],
    bronchoscopyRecords: '支气管镜检查 8 例（活检 4 / 刷检 2 / 灌洗 2）；超声支气管镜（EBUS）1 例（纵隔淋巴结穿刺）。',
    pulmonaryFunctionRecords: '肺功能检查 24 例；支气管舒张试验阳性 8 例；弥散功能下降 6 例。',
    nonInvasiveVentilation: '无创通气（NIV）6 例（AECOPD 4 / 心源性肺水肿 2）；有创机械通气 4 例。',
  },
];

export interface PulmonologyWorkloadListResult {
  items: PulmonologyWorkload[];
  demo: boolean;
}

export async function fetchPulmonologyWorkload(): Promise<PulmonologyWorkloadListResult> {
  try {
    const res = await get<{ items: PulmonologyWorkload[] }>('/pulmonology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
