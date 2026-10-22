/**
 * 健澜科技 jlmedaios - 手术患者交接单 API（M696）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface SurgeryHandover {
  id: string;
  patientId: string;
  surgeryName: string;
  handoverAt: string;
  fromDept: string;
  toDept: string;
  preopItems: string[];
  intraopItems: string[];
  postopItems: string[];
  giver: string;
  receiver: string;
}

const DEMO: SurgeryHandover[] = [
  {
    id: 'HO-001',
    patientId: 'P10002',
    surgeryName: '腹腔镜胆囊切除术',
    handoverAt: '2026-10-22T10:50:00+08:00',
    fromDept: '手术室 PACU',
    toDept: '普外科病房',
    preopItems: ['身份核对', '手术部位标记', '知情同意书签署', '术前禁食 8h'],
    intraopItems: ['全麻顺利', '出血 50ml', '尿量 200ml', '生命体征平稳'],
    postopItems: ['意识清醒', '气道通畅', '管路：尿管+静脉留置', '切口敷料干燥'],
    giver: 'PACU 李护士',
    receiver: '病房周护士',
  },
];

export interface HandoverListResult {
  items: SurgeryHandover[];
  demo: boolean;
}

export async function fetchSurgeryHandovers(): Promise<HandoverListResult> {
  try {
    const res = await get<{ items: SurgeryHandover[] }>('/nurse/surgery-handovers');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
