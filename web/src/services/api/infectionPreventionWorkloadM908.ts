/**
 * 健澜科技 jlmedaios - 院感防控 API（M908）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InfectionPreventionWorkload {
  id: string;
  date: string;
  cases: number;
  handHygiene: number;
  disinfection: number;
  antibioticUse: number;
  mdro: number;
  status: string;
  caseBreakdown: { name: string; count: number }[];
  handHygieneDetail: string;
  disinfectionDetail: string;
  antibiotic: string;
  mdroPrevention: string;
  outbreakWarning: string;
}

const DEMO: InfectionPreventionWorkload[] = [
  {
    id: 'INFP-908',
    date: '2026-10-22',
    cases: 6,
    handHygiene: 95.2,
    disinfection: 100,
    antibioticUse: 38.5,
    mdro: 3,
    status: '正常运行',
    caseBreakdown: [
      { name: '呼吸道院感', count: 2 },
      { name: '泌尿道院感', count: 2 },
      { name: '手术部位感染', count: 1 },
      { name: '血液院感', count: 1 },
    ],
    handHygieneDetail: '手卫生依从性（5 时刻）：接触患者前 96%；无菌操作前 98%；接触患者后 95%；接触患者环境后 93%；接触体液后 97%。',
    disinfectionDetail: '消毒灭菌效果：空气培养 32 份（合格率 100%）；物表 48 份（100%）；灭菌器 BI 监测 6 台（全部阴性）。',
    antibiotic: '抗菌药物管理：门诊抗菌药使用率 18%（≤20% 达标）；住院 38.5%（≤60%）；DDDs 45；限制级/特殊级使用比例 25%。',
    mdroPrevention: 'MDRO 防控：今日检出 MRSA 1 例、CRE 1 例、VRE 1 例；全部落实接触隔离；环境消毒（含氯 1000mg/L）每班 2 次；转归：3 例均好转。',
    outbreakWarning: '院感暴发预警：今日预警 0 次；近 7 日同一科室同种病原菌检出 1 次（未达暴发阈值 3 例）。',
  },
];

export interface InfectionPreventionWorkloadListResult {
  items: InfectionPreventionWorkload[];
  demo: boolean;
}

export async function fetchInfectionPreventionWorkload(): Promise<InfectionPreventionWorkloadListResult> {
  try {
    const res = await get<{ items: InfectionPreventionWorkload[] }>('/infection/prevention/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
