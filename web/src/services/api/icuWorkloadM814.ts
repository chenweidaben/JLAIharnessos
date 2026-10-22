/**
 * 健澜科技 jlmedaios - ICU 管理 API（M814）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IcuWorkload {
  id: string;
  date: string;
  beds: number;
  admissions: number;
  discharges: number;
  deaths: number;
  status: string;
  bedUsage: string;
  apache2: string;
  ventilation: string;
  vasopressors: string;
  crrt: string;
}

const DEMO: IcuWorkload[] = [
  {
    id: 'ICU-001',
    date: '2026-10-22',
    beds: 16,
    admissions: 3,
    discharges: 2,
    deaths: 1,
    status: '正常运行',
    bedUsage: '在床 15/16；床位使用率 93.8%；空床 1（待转出普通病房）。',
    apache2: '入院 APACHE II 平均 22.5 分；预计病死率 28%。',
    ventilation: '有创机械通气 8 例；无创通气 3 例；日均通气时间 14.2h。',
    vasopressors: '使用血管活性药物 6 例（去甲肾上腺素 5 / 多巴胺 1）。',
    crrt: 'CRRT 在治 2 例；累计治疗时长 36h。',
  },
];

export interface IcuWorkloadListResult {
  items: IcuWorkload[];
  demo: boolean;
}

export async function fetchIcuWorkload(): Promise<IcuWorkloadListResult> {
  try {
    const res = await get<{ items: IcuWorkload[] }>('/icu/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
