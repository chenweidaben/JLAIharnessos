/**
 * 健澜科技 jlmedaios - 心胸外科管理 API（M794）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CtSurgPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  surgery: string;
  ecmo: string;
  status: string;
  preOp: string;
  opRecord: string;
  postOpIcu: string;
  chestDrain: string;
  rehab: string;
}

const DEMO: CtSurgPatient[] = [
  {
    id: 'CT-001',
    inpatientNo: 'ZY-261121',
    patient: '薛患者',
    diagnosis: '风湿性心脏病，二尖瓣狭窄伴关闭不全',
    surgery: '体外循环下二尖瓣置换术（机械瓣）+ 三尖瓣成形',
    ecmo: '体外循环时间 128 min，主动脉阻断 82 min，未使用 ECMO',
    status: '术后第 5 天',
    preOp: 'LVEF 55%，二尖瓣口面积 1.0 cm²，肺动脉压 55 mmHg；NYHA III。',
    opRecord: '胸骨正中切口，升主动脉 + 上下腔静脉插管；切除病变二尖瓣，置入 27# 机械瓣；DeVega 三尖瓣成形。',
    postOpIcu: '术后 24h 拔除气管插管；胸引量 200 mL；正性肌力药小剂量维持。',
    chestDrain: '心包 + 纵隔引流各 1 根，术后 48h 拔除，总量 350 mL。',
    rehab: '术后第 3 天床边活动，第 5 天步行训练；华法林抗凝目标 INR 2.0-3.0。',
  },
];

export interface CtSurgListResult {
  items: CtSurgPatient[];
  demo: boolean;
}

export async function fetchCtSurgPatients(): Promise<CtSurgListResult> {
  try {
    const res = await get<{ items: CtSurgPatient[] }>('/clinical/ct-surg-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
