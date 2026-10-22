/**
 * 健澜科技 jlmedaios - 病案管理 API（M877）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface MedicalRecordsWorkload {
  id: string;
  date: string;
  discharged: number;
  archived: number;
  copies: number;
  borrowed: number;
  codingQualifiedRate: number;
  status: string;
  archiveRate: string;
  homepageQuality: string;
  codingAccuracy: string;
  copyTime: string;
  borrowRecords: string;
}

const DEMO: MedicalRecordsWorkload[] = [
  {
    id: 'MR-877',
    date: '2026-10-22',
    discharged: 110,
    archived: 108,
    copies: 35,
    borrowed: 8,
    codingQualifiedRate: 98.5,
    status: '正常运行',
    archiveRate: '病案归档率：3 个工作日内归档率 98.2%（目标 ≥95%）；逾期归档 2 份。',
    homepageQuality: '病案首页合格率：甲级 98.5%；乙级 1.5%；丙级 0%（无重大缺陷）。',
    codingAccuracy: '编码准确率：ICD-10 主诊断编码符合率 97.8%；手术操作编码 96.5%。',
    copyTime: '复印申请处理时间：平均 1.5 天；当日出证率 70%。',
    borrowRecords: '借阅记录：今日借阅 8 份（临床科研 5/医保核查 2/司法 1）；到期未还 0 份。',
  },
];

export interface MedicalRecordsWorkloadListResult {
  items: MedicalRecordsWorkload[];
  demo: boolean;
}

export async function fetchMedicalRecordsWorkload(): Promise<MedicalRecordsWorkloadListResult> {
  try {
    const res = await get<{ items: MedicalRecordsWorkload[] }>('/medical-records/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
