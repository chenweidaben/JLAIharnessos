/**
 * 健澜科技 jlmedaios - 护士站四合一屏前端类型（M18-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface WardRow {
  visitId: string;
  patientName: string;
  bedNo: string | null;
  department: string | null;
  latestVitals: { temperature: number | null; sbp: number | null; pulse: number | null; recordedAt: string | null };
  ioBalance24h: number | null;
  pendingMeds: number;
  activeTubes: number;
  riskLevel: string;
  unresolvedHardCds: number;
  outstanding: number;
}
