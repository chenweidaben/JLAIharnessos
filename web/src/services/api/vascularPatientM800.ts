/**
 * 健澜科技 jlmedaios - 血管外科管理 API（M800）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface VascularPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  lesion: string;
  opApproach: string;
  status: string;
  imaging: string;
  opRecord: string;
  anticoagulation: string;
  perfusion: string;
  followup: string;
}

const DEMO: VascularPatient[] = [
  {
    id: 'VS-001',
    inpatientNo: 'ZY-261126',
    patient: '余患者',
    diagnosis: '左下肢动脉硬化闭塞症（ASO），TASC II B 型',
    lesion: '左股浅动脉中段狭窄 85%，长约 5cm',
    opApproach: '左股浅动脉球囊扩张 + 药物涂层支架（DCB + DES）',
    status: '术后第 3 天',
    imaging: '下肢 CTA：左股浅动脉中段重度狭窄，远端流出道可。ABI：左 0.55 / 右 1.0。',
    opRecord: '右股入路，6F 导管；预扩张 4mm×150mm，植入 6×100mm 药物支架一枚，残余狭窄 <10%。',
    anticoagulation: '术后低分子肝素 4000IU q12h 皮下 × 3 天；长期阿司匹林 100mg qd + 氯吡格雷 75mg qd（双抗 12 个月）。',
    perfusion: '术后左下肢皮温恢复，足背动脉搏动可及；ABI 复查 0.92。',
    followup: '1、3、6、12 月门诊复查 ABI + 下肢血管超声；每 2 年 CTA。',
  },
];

export interface VascularListResult {
  items: VascularPatient[];
  demo: boolean;
}

export async function fetchVascularPatients(): Promise<VascularListResult> {
  try {
    const res = await get<{ items: VascularPatient[] }>('/clinical/vascular-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
