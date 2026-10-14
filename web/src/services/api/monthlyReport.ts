/**
 * 健澜科技 jlmedaios - 科室月度运营报表 API
 *
 * 直连 BFF（baseURL 已含 /api/v1，此处路径不重复前缀）。
 * 演示模式：BFF 返回 demo:true 的演示数据，页面据此标注。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export type ReportStatus = 'good' | 'warn' | 'bad';

export interface MonthlyReportRow {
  indicator: string;
  value: string;
  target: string;
  status: ReportStatus;
}

export interface MonthlyReportData {
  month: string;
  demo: boolean;
  kpi: {
    outpatientCount: number;
    inpatientCount: number;
    totalVolume: number;
    drgProfitLoss: number;
    drgStatus: 'profit' | 'loss' | 'balanced';
    qcScore: number;
    qcGrade: 'A' | 'B' | 'C' | 'D';
    antibioticUse: number;
    antibioticCompliant: boolean;
  };
  summary: MonthlyReportRow[];
}

/** 拉取科室月度运营报表（GET），month 形如 2026-09。 */
export function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  return get<MonthlyReportData>('/monthly-report', { month });
}
