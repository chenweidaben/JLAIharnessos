/**
 * 健澜科技 jlmedaios - 整形外科管理 API（M799）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PlasticPatient {
  id: string;
  caseNo: string;
  patient: string;
  surgeryType: string;
  procedure: string;
  anesthesia: string;
  status: string;
  preDesign: string;
  opRecord: string;
  dressing: string;
  scar: string;
  followup: string;
}

const DEMO: PlasticPatient[] = [
  {
    id: 'PS-001',
    caseNo: 'KC-261102',
    patient: '董患者',
    surgeryType: '瘢痕整形',
    procedure: '右前臂增生性瘢痕切除 + Z 成形术 + 局部皮瓣转移',
    anesthesia: '局麻 + 镇静',
    status: '术后第 10 天',
    preDesign: '瘢痕长 8cm，宽 3cm；设计 3 个 Z 成形三角瓣，边长 2cm。',
    opRecord: '沿设计线切除瘢痕，三角瓣交叉易位，5-0 可吸收线分层缝合。',
    dressing: '术区凡士林纱布 + 棉垫加压包扎；术后第 2 天首次换药，对合良好。',
    scar: '术后 3 个月开始硅酮贴片 + 激光干预；避免日晒 6 个月。',
    followup: '术后 2 周、1 月、3 月、6 月门诊随访瘢痕评分（POSAS）。',
  },
];

export interface PlasticListResult {
  items: PlasticPatient[];
  demo: boolean;
}

export async function fetchPlasticPatients(): Promise<PlasticListResult> {
  try {
    const res = await get<{ items: PlasticPatient[] }>('/clinical/plastic-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
