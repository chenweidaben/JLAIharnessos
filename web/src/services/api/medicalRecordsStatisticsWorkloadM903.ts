/**
 * 健澜科技 jlmedaios - 病案统计管理 API（M903）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface MedicalRecordsStatisticsWorkload {
  id: string;
  date: string;
  discharges: number;
  archived: number;
  homepageQuality: number;
  drgGrouped: number;
  icdAccuracy: number;
  status: string;
  dischargeBreakdown: { name: string; count: number }[];
  archiveTimeliness: string;
  homepageDefects: string;
  drgResult: string;
  icdQuality: string;
  reports: string;
}

const DEMO: MedicalRecordsStatisticsWorkload[] = [
  {
    id: 'MRST-903',
    date: '2026-10-22',
    discharges: 240,
    archived: 232,
    homepageQuality: 96.5,
    drgGrouped: 218,
    icdAccuracy: 98.2,
    status: '正常运行',
    dischargeBreakdown: [
      { name: '内科病区', count: 90 },
      { name: '外科病区', count: 80 },
      { name: '妇儿科病区', count: 40 },
      { name: 'ICU/急诊病区', count: 30 },
    ],
    archiveTimeliness: '病案归档时效：7 个工作日内归档率 96.7%；今日待归档 8 份（均为在架未复印）。',
    homepageDefects: '病案首页质控缺陷：甲级率 96.5%；乙级率 3.0%；丙级率 0.5%；主要缺陷为主要诊断填写不规范 6 份。',
    drgResult: 'DRG 分组结果：今日入组 218 例（入组率 90.8%）；QY 0 例；ADRG 覆盖 48 组；权重最高组为心脏介入。',
    icdQuality: 'ICD 编码质量：ICD-10 主诊断编码正确率 98.2%；ICD-9-CM-3 手术编码正确率 97.5%；编码员 6 人双盲复核率 100%。',
    reports: '统计报表：今日完成日报 1 份、周报 1 份、月报 0 份；上报卫健委数据 0 次。',
  },
];

export interface MedicalRecordsStatisticsWorkloadListResult {
  items: MedicalRecordsStatisticsWorkload[];
  demo: boolean;
}

export async function fetchMedicalRecordsStatisticsWorkload(): Promise<MedicalRecordsStatisticsWorkloadListResult> {
  try {
    const res = await get<{ items: MedicalRecordsStatisticsWorkload[] }>('/medical-records/statistics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
