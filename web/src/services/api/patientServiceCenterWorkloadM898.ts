/**
 * 健澜科技 jlmedaios - 患者服务中心管理 API（M898）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PatientServiceCenterWorkload {
  id: string;
  date: string;
  consultations: number;
  complaints: number;
  praises: number;
  followups: number;
  satisfaction: number;
  status: string;
  consultBreakdown: { name: string; count: number }[];
  complaintBreakdown: { name: string; count: number }[];
  praiseRecords: string;
  followupBreakdown: { name: string; count: number }[];
  satisfactionSurvey: string;
}

const DEMO: PatientServiceCenterWorkload[] = [
  {
    id: 'PSC-898',
    date: '2026-10-22',
    consultations: 280,
    complaints: 4,
    praises: 8,
    followups: 120,
    satisfaction: 96.5,
    status: '正常运行',
    consultBreakdown: [
      { name: '就医流程咨询', count: 120 },
      { name: '医保政策咨询', count: 80 },
      { name: '检查结果咨询', count: 50 },
      { name: '预约挂号咨询', count: 30 },
    ],
    complaintBreakdown: [
      { name: '服务态度', count: 2 },
      { name: '就医环境', count: 1 },
      { name: '医疗费用', count: 1 },
      { name: '等待时间', count: 0 },
    ],
    praiseRecords: '表扬记录：今日收到锦旗 2 面；感谢信 4 封；12345 表扬 2 次（均涉及导诊/护士站）。',
    followupBreakdown: [
      { name: '出院随访', count: 80 },
      { name: '慢病随访', count: 30 },
      { name: '术后随访', count: 10 },
    ],
    satisfactionSurvey: '满意度调查：出院患者满意度 96.5%（有效问卷 240 份）；门诊满意度 95.8%。',
  },
];

export interface PatientServiceCenterWorkloadListResult {
  items: PatientServiceCenterWorkload[];
  demo: boolean;
}

export async function fetchPatientServiceCenterWorkload(): Promise<PatientServiceCenterWorkloadListResult> {
  try {
    const res = await get<{ items: PatientServiceCenterWorkload[] }>('/patient-service/center/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
