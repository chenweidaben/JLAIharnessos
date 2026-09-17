/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 运营分析 / 仪表盘 Mock
 */
import { rand } from '@/mock/utils';

function days(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.now() - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

export const mockDashboard = {
  todayOutpatient: rand(1800, 2400),
  todayEmergency: rand(220, 360),
  admitted: rand(60, 110),
  discharged: rand(40, 90),
  pendingOrders: rand(30, 80),
  pendingPrescriptions: rand(12, 40),
  criticalAlerts: rand(1, 5),
  qcDefects: rand(3, 12),
  occupancyTrend: days(14).map((date) => ({ date, value: rand(700, 980) })),
};

export const mockDepartmentStats = ['心内科', '呼吸内科', '普外科', '骨科', '急诊科', 'ICU'].map(
  (dept) => ({
    department: dept,
    outpatientVisits: rand(800, 3200),
    bedOccupancyRate: rand(70, 99),
    revenue: rand(300, 2600),
    yoy: rand(-80, 150) / 10,
  }),
);

export const mockDRGD = { groupRate: 91.6, caseCount: 1240, netBalance: 326.5 };

export const mockQualityIndicators = {
  gradeARate: 96.4,
  threeDayDiagnosisRate: 92.1,
  inpatientMortalityRate: 0.32,
  rescueSuccessRate: 88.6,
};

export const mockOperationTrend = days(14).map((date) => ({ date, value: rand(1800, 2600) }));
