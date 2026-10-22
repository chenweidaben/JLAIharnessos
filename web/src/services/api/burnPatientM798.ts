/**
 * 健澜科技 jlmedaios - 烧伤科管理 API（M798）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type BurnDepth = 'I' | 'superficialII' | 'deepII' | 'III';

export const BURN_DEPTH_META: Record<BurnDepth, { label: string; color: string }> = {
  I: { label: 'I 度', color: 'blue' },
  superficialII: { label: '浅 II 度', color: 'orange' },
  deepII: { label: '深 II 度', color: 'volcano' },
  III: { label: 'III 度', color: 'red' },
};

export interface BurnPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  tbsa: number;
  depth: BurnDepth;
  site: string;
  status: string;
  assessment: string;
  woundCare: string;
  fluid: string;
  infection: string;
  graftSurgery: { date: string; procedure: string; outcome: string }[];
}

const DEMO: BurnPatient[] = [
  {
    id: 'BR-001',
    inpatientNo: 'ZY-261125',
    patient: '邹患者',
    tbsa: 25,
    depth: 'deepII',
    site: '双上肢、躯干前侧',
    status: '创面换药中',
    assessment: 'TBSA 25%（深 II 度 20% + 浅 II 度 5%），吸入性损伤待排。',
    woundCare: '1% SD-Ag 包扎换药 qod；创面已行磨痂术。',
    fluid: '第一个 24h 补液计划：晶胶比 2:1，总量 6500 mL；已补充 4200 mL。',
    infection: '创面分泌物培养：金黄色葡萄球菌（MRSA 阴性）；T 38.2℃。',
    graftSurgery: [
      { date: '2026-10-20', procedure: '双上肢创面自体皮移植（刃厚皮 0.25mm）', outcome: '移植皮片成活率约 85%' },
    ],
  },
];

export interface BurnListResult {
  items: BurnPatient[];
  demo: boolean;
}

export async function fetchBurnPatients(): Promise<BurnListResult> {
  try {
    const res = await get<{ items: BurnPatient[] }>('/clinical/burn-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
