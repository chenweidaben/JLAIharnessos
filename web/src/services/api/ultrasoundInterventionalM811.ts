/**
 * 健澜科技 jlmedaios - 超声介入管理 API（M811）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UltrasoundInterventionalCase {
  id: string;
  patient: string;
  procedure: string;
  access: string;
  pathology: string;
  status: string;
  preOp: string;
  record: string;
  pathologyResult: string;
  complications: string;
  followup: string;
}

const DEMO: UltrasoundInterventionalCase[] = [
  {
    id: 'UI-001',
    patient: '唐患者',
    procedure: '超声引导下甲状腺右叶结节细针穿刺活检（FNA）',
    access: '右侧卧位，颈前入路',
    pathology: 'Bethesda III 类（意义不明确的细胞非典型）',
    status: '已完成',
    preOp: '凝血功能正常；穿刺前超声评估结节大小 1.6cm，TI-RADS 4a。',
    record: '22G 细针穿刺 2 针；标本满意；局部压迫 15min。',
    pathologyResult: 'Bethesda III；建议 3 个月后复查或再次穿刺。',
    complications: '无出血、无喉返神经损伤。',
    followup: '1 周后电话随访；3 月超声复查。',
  },
];

export interface UltrasoundInterventionalListResult {
  items: UltrasoundInterventionalCase[];
  demo: boolean;
}

export async function fetchUltrasoundInterventionalCases(): Promise<UltrasoundInterventionalListResult> {
  try {
    const res = await get<{ items: UltrasoundInterventionalCase[] }>('/ultrasound/interventional-cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
