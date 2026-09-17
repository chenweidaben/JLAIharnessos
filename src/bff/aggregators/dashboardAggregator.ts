/**
 * 健澜科技数智医院智能体 - BFF 仪表盘数据聚合器
 *
 * 聚合 HIS（门诊/住院量）、运营（收入/床位）、CDS（告警）、质控（缺陷）多源指标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export function aggregateDashboard(): Record<string, unknown> {
  return {
    todayOutpatient: 2136,
    todayEmergency: 287,
    admitted: 92,
    discharged: 64,
    pendingOrders: 48,
    pendingPrescriptions: 21,
    criticalAlerts: 3,
    qcDefects: 7,
    occupancyTrend: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 86_400_000).toISOString().slice(0, 10),
      value: 760 + ((i * 37) % 180),
    })),
    latestAlerts: [
      {
        id: 'alt_1',
        level: 'critical',
        title: 'P100001 肌钙蛋白危急值',
        time: new Date().toISOString(),
      },
    ],
  };
}
