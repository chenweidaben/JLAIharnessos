/**
 * 健澜科技 jlmedaios - 职业健康 API（M910）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OccupationalHealthWorkload {
  id: string;
  date: string;
  exposures: number;
  physicalExam: number;
  occupationalDiseases: number;
  workInjury: number;
  trainingVisits: number;
  status: string;
  exposureBreakdown: { name: string; count: number }[];
  postExposure: string;
  physicalExamDetail: string;
  diseaseDiagnosis: string;
  workInjuryBenefits: string;
  trainingRecords: string;
}

const DEMO: OccupationalHealthWorkload[] = [
  {
    id: 'OCC-910',
    date: '2026-10-22',
    exposures: 4,
    physicalExam: 320,
    occupationalDiseases: 0,
    workInjury: 1,
    trainingVisits: 48,
    status: '正常运行',
    exposureBreakdown: [
      { name: '针刺伤', count: 2 },
      { name: '血液体液暴露', count: 1 },
      { name: '化学暴露', count: 1 },
      { name: '放射暴露', count: 0 },
    ],
    postExposure: '暴露后处置：针刺 2 例均 24h 内完成挤血/冲洗/消毒；HIV/HBV/HCV 基线检测 100%；随访 6 月；预防性用药 1 例。',
    physicalExamDetail: '职业健康体检：上岗前体检 24 人；在岗体检 288 人（放射 86/消毒 48/医护 154）；离岗 8 人；异常率 3.2%（均为慢性咽炎/腰突等常见职业相关）。',
    diseaseDiagnosis: '职业病诊断与鉴定：今日职业病 0 例；疑似职业病 0 例；已完成诊断 0 例；无鉴定争议。',
    workInjuryBenefits: '工伤认定与待遇：今日工伤 1 例（护士搬床扭伤）；已申报工伤认定；待遇落实 100%。',
    trainingRecords: '职业防护培训：本月完成 4 场培训（针刺伤防护/化学防护/放射防护/手卫生）；48 人次；考核合格率 100%。',
  },
];

export interface OccupationalHealthWorkloadListResult {
  items: OccupationalHealthWorkload[];
  demo: boolean;
}

export async function fetchOccupationalHealthWorkload(): Promise<OccupationalHealthWorkloadListResult> {
  try {
    const res = await get<{ items: OccupationalHealthWorkload[] }>('/occupational/health/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
