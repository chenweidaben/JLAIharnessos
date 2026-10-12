/**
 * 健澜科技 jlmedaios - 报告推送前端类型（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface ReportPushItem {
  id: string;
  reportType: 'lab' | 'imaging';
  reportId: string;
  patientId: string;
  pushedAt: string;
  viewedAt: string | null;
  viewCount: number;
  status: 'pushed' | 'viewed';
}
