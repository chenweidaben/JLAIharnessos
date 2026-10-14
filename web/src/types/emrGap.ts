/**
 * 健澜科技 jlmedaios - EMR 差距分析前端类型（出院小结 / M87-C 时效 / M87-D 评级自评）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 出院小结 */
export interface DischargeSummary {
  id: string;
  visitId: string;
  admissionDate: string;
  dischargeDate: string;
  dischargeType: string;
  dischargeDiagnoses: string;
  admissionDiagnoses: string;
  treatmentCourse: string;
  dischargeOrders: string;
  followupPlan: string | null;
  attendingDoctor: string | null;
  status: 'draft' | 'submitted' | 'verified';
  submittedAt: string | null;
  verifiedAt: string | null;
}

/** 出院小结新建 / 编辑提交体 */
export interface DischargeSummaryPayload {
  visitId: string;
  admissionDate: string;
  dischargeDate: string;
  dischargeType?: string;
  dischargeDiagnoses: string;
  admissionDiagnoses: string;
  treatmentCourse: string;
  dischargeOrders: string;
  followupPlan?: string | null;
}

/** 文书时效台账条目（M87-C） */
export interface TimelinessItem {
  id: string;
  visitId: string;
  docType: string;
  requiredMinutes: number;
  createdAt: string;
  dueAt: string;
  completedAt: string | null;
  status: 'pending' | 'ontime' | 'late';
  lateMinutes: number | null;
}

/** 电子病历评级自评指标（M87-D） */
export interface EmrMetric {
  id: string;
  metricCode: string;
  metricName: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  status: 'pending' | 'pass' | 'fail';
  measuredAt: string | null;
}
