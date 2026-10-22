/**
 * 健澜科技 jlmedaios - 泌尿外科管理 API（M797）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UroPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  opApproach: string;
  anesthesia: string;
  status: string;
  preOp: string;
  opRecord: string;
  catheter: string;
  voiding: string;
  discharge: string;
}

const DEMO: UroPatient[] = [
  {
    id: 'UR-001',
    inpatientNo: 'ZY-261124',
    patient: '葛患者',
    diagnosis: '前列腺增生（BPH），IPSS 24 分',
    opApproach: '经尿道前列腺电切术（TURP）',
    anesthesia: '腰硬联合麻醉',
    status: '术后第 3 天',
    preOp: 'PSA 2.8 ng/mL；前列腺体积 65 mL；残余尿 120 mL。',
    opRecord: '切除前列腺组织约 30g；术中出血 100 mL；术后三腔导尿管持续膀胱冲洗。',
    catheter: 'F22 三腔气囊导尿管，术后 3-5 天根据尿液颜色拔除；会阴护理 q4h。',
    voiding: '导尿期间膀胱冲洗通畅，尿液淡血色；计划术后第 5 天拔管测残余尿。',
    discharge: '拔管后排尿通畅即可出院；术后 4 周避免骑跨、用力排便；门诊随访尿流率。',
  },
];

export interface UroListResult {
  items: UroPatient[];
  demo: boolean;
}

export async function fetchUroPatients(): Promise<UroListResult> {
  try {
    const res = await get<{ items: UroPatient[] }>('/clinical/uro-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
