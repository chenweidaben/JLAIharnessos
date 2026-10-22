/**
 * 健澜科技 jlmedaios - 骨科管理 API（M796）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OrthoPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  fractureSite: string;
  opApproach: string;
  status: string;
  imaging: string;
  opRecord: string;
  rehabPlan: string;
  weightBearing: string;
  complications: string;
}

const DEMO: OrthoPatient[] = [
  {
    id: 'OR-001',
    inpatientNo: 'ZY-261123',
    patient: '吕患者',
    diagnosis: '左股骨颈骨折（Garden III 型）',
    fractureSite: '左髋（股骨颈头下型）',
    opApproach: '人工全髋关节置换术（THA）',
    status: '术后第 7 天',
    imaging: '髋关节正侧位 X 线：左股骨颈骨皮质中断，Pauwels 角 50°。',
    opRecord: '后外侧入路，髋臼外展 40°、前倾角 15°；股骨柄生物型固定；术中出血 400 mL。',
    rehabPlan: '术后第 1 天 CPM 机被动活动；第 3 天助行器部分负重；6 周后逐步完全负重。',
    weightBearing: '当前：助行器部分负重（10-15 kg），左髋避免内收内旋。',
    complications: '术后 48h 出现 D-二聚体 5.6 mg/L，已启动低分子肝素抗凝；切口愈合良好。',
  },
];

export interface OrthoListResult {
  items: OrthoPatient[];
  demo: boolean;
}

export async function fetchOrthoPatients(): Promise<OrthoListResult> {
  try {
    const res = await get<{ items: OrthoPatient[] }>('/clinical/ortho-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
