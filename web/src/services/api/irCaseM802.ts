/**
 * 健澜科技 jlmedaios - 介入放射科管理 API（M802）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IrCase {
  id: string;
  opNo: string;
  patient: string;
  opName: string;
  access: string;
  angiography: string;
  status: string;
  preOp: string;
  opRecord: string;
  angioFindings: string;
  complications: string;
  followup: string;
}

const DEMO: IrCase[] = [
  {
    id: 'IR-001',
    opNo: 'IR-261101',
    patient: '潘患者',
    opName: '肝动脉化疗栓塞术（TACE）',
    access: '右股动脉 Seldinger 穿刺',
    angiography: '肝右叶占位染色，主要由肝右动脉供血',
    status: '术后第 2 天',
    preOp: 'Child-Pugh A 级；ECOG 0；AFP 1200 ng/mL。',
    opRecord: 'RH 导管超选肝右动脉分支；注入表阿霉素 40mg + 碘化油 10mL 乳剂 + 明胶海绵颗粒栓塞。',
    angioFindings: '造影示肝右叶 S6 段肿瘤染色约 4cm；栓塞后肿瘤血管完全闭塞。',
    complications: '术后低热（T 38.1℃）2 天，考虑栓塞后综合征；予对症处理后缓解。',
    followup: '术后 4-6 周复查增强 CT/MRI + AFP；评估再次 TACE 指征。',
  },
];

export interface IrListResult {
  items: IrCase[];
  demo: boolean;
}

export async function fetchIrCases(): Promise<IrListResult> {
  try {
    const res = await get<{ items: IrCase[] }>('/clinical/ir-cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
