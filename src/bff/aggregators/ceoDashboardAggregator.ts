/**
 * 健澜科技 jlmedaios - 全院数据驾驶舱聚合器（院长版）
 *
 * buildCeoDashboard 为纯函数：仅依据八大核心运营指标原始输入计算院长版驾驶舱视图，
 * 不读 DB、不发请求、不取当前时间，便于单测。buildTrend 同样为纯函数：依据日总量
 * 按 24 小时昼夜节律权重分布为逐时趋势点，同一输入恒等输出。listView 返回内置演示
 * 数据（demo:true），含八大指标 + 24h 趋势。
 *
 * 八大核心指标：门诊量 / 住院量 / 手术量 / 床位使用率 / DRG 结余 /
 *                病历合格率 / 抗菌药使用强度 / 患者满意度。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 日门诊：当日就诊人次 */
export interface OutpatientDailyInput {
  visits: number;
}

/** 日住院：当前在院 / 当日入院 / 当日出院 */
export interface InpatientDailyInput {
  current: number;
  admitted: number;
  discharged: number;
}

/** 日手术：当日完成台数 / 当日计划台数 */
export interface SurgeryDailyInput {
  completed: number;
  scheduled: number;
}

/** 床位：实际占用 / 实际开放 */
export interface BedOccupancyInput {
  occupiedBeds: number;
  totalBeds: number;
}

/** DRG 结余：已结算例数 / DRG 总结余（万元，正为盈余、负为亏损） */
export interface DrgSettlementInput {
  settledCases: number;
  surplusWan: number;
}

/** 病历合格率：合格病历数 / 抽查病历总数 */
export interface QcPassRateInput {
  passed: number;
  total: number;
}

/** 抗菌药使用强度：DDDs 总量 / 同期住院床日（计算 DDDs/100 床日） */
export interface AntibioticUseInput {
  ddds: number;
  inpatientDays: number;
}

/** 患者满意度：满意问卷数 / 回收问卷总数 */
export interface PatientSatisfactionInput {
  satisfied: number;
  surveyed: number;
}

/** 院长版驾驶舱聚合入参 */
export interface CeoDashboardInput {
  outpatientDaily: OutpatientDailyInput;
  inpatientDaily: InpatientDailyInput;
  surgeryDaily: SurgeryDailyInput;
  bedOccupancy: BedOccupancyInput;
  drgSettlement: DrgSettlementInput;
  qcPassRate: QcPassRateInput;
  antibioticUse: AntibioticUseInput;
  patientSatisfaction: PatientSatisfactionInput;
}

/** 指标健康度：good 正常 / warn 预警 / danger 超标 */
export type CeoMetricStatus = 'good' | 'warn' | 'danger';

export type CeoMetricKey =
  | 'outpatientDaily'
  | 'inpatientDaily'
  | 'surgeryDaily'
  | 'bedOccupancy'
  | 'drgSettlement'
  | 'qcPassRate'
  | 'antibioticUse'
  | 'patientSatisfaction';

/** 单张核心指标卡 */
export interface CeoMetric {
  key: CeoMetricKey;
  title: string;
  /** 大字号主数值（前端 44px+ 展示） */
  value: number;
  unit: string;
  status: CeoMetricStatus;
  /** 辅助说明（分母、环比、阈值等） */
  detail: string;
}

/** 24h 趋势：单小时数据点（门诊/住院/手术三线） */
export interface CeoTrendPoint {
  /** 时刻标签，如 "09:00" */
  hour: string;
  /** 当小时门诊人次 */
  outpatient: number;
  /** 当小时在院/入院人次 */
  inpatient: number;
  /** 当小时手术台数 */
  surgery: number;
}

/** buildTrend 入参：当日三条曲线的日总量 */
export interface CeoTrendHistory {
  outpatient: number;
  inpatient: number;
  surgery: number;
}

/** buildCeoDashboard 输出（纯、无时间戳） */
export interface CeoDashboardMetrics {
  demo: boolean;
  metrics: CeoMetric[];
  trend: CeoTrendPoint[];
}

/** listView 视图（带生成时间戳） */
export interface CeoDashboardView extends CeoDashboardMetrics {
  demo: true;
  generatedAt: string;
}

/** 保留一位小数；分母为 0 时返回 0，避免 NaN/Infinity */
function ratio(numerator: number, denominator: number, scale = 1): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * scale * 10) / 10;
}

/**
 * 24 小时昼夜节律权重（长度 24，下标即小时 0-23）。
 * - 门诊：夜间低谷，上午 9-11 点与下午 14-16 点双峰；
 * - 住院：全天平缓，日间略高；
 * - 手术：集中在 8-17 点手术间时段，9-12 点为高峰，夜间为 0。
 * 权重仅为相对分布，buildTrend 内会按各自总和归一化，不要求权重和为 1。
 */
const OUTPATIENT_WEIGHT = [
  0.2, 0.1, 0.1, 0.1, 0.2, 0.5,
  1.5, 3.5, 6.5, 9.0, 8.0, 5.0,
  3.0, 4.5, 7.5, 8.5, 6.0, 3.0,
  1.5, 1.0, 0.8, 0.6, 0.4, 0.3,
] as const;

const INPATIENT_WEIGHT = [
  0.3, 0.2, 0.2, 0.2, 0.3, 0.5,
  0.8, 1.2, 1.5, 1.6, 1.5, 1.3,
  1.2, 1.3, 1.4, 1.3, 1.1, 0.9,
  0.7, 0.6, 0.5, 0.4, 0.4, 0.3,
] as const;

const SURGERY_WEIGHT = [
  0, 0, 0, 0, 0, 0,
  0, 0.5, 2.5, 5.0, 6.5, 5.5,
  4.0, 3.5, 3.0, 2.0, 1.0, 0.3,
  0, 0, 0, 0, 0, 0,
] as const;

function sumWeight(w: readonly number[]): number {
  return w.reduce((acc, x) => acc + x, 0);
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * 纯函数 buildTrend：把当日三条业务曲线的日总量按昼夜节律权重分布为逐时数据点。
 *
 * 幂等：同一 history 与 hours 恒等输出（无随机、无当前时间），便于单测与重放。
 * hours 默认 24（全天）；若传入其他正整数则只取前 N 个小时的权重。
 *
 * @param history 当日门诊 / 住院 / 手术总量
 * @param hours   生成的小时点数（默认 24）
 * @returns 长度为 hours 的逐时趋势点数组
 */
export function buildTrend(history: CeoTrendHistory, hours = 24): CeoTrendPoint[] {
  const n = Math.max(0, Math.min(24, Math.floor(hours) || 24));
  const totalOut = sumWeight(OUTPATIENT_WEIGHT);
  const totalIn = sumWeight(INPATIENT_WEIGHT);
  const totalSx = sumWeight(SURGERY_WEIGHT);

  const points: CeoTrendPoint[] = [];
  for (let h = 0; h < n; h += 1) {
    points.push({
      hour: fmtHour(h),
      outpatient: Math.round(((history.outpatient || 0) * OUTPATIENT_WEIGHT[h]) / totalOut),
      inpatient: Math.round(((history.inpatient || 0) * INPATIENT_WEIGHT[h]) / totalIn),
      surgery: Math.round(((history.surgery || 0) * SURGERY_WEIGHT[h]) / totalSx),
    });
  }
  return points;
}

/**
 * 院长版驾驶舱纯函数聚合：汇总八大核心指标并给出健康度判定。
 * 阈值参考公立医院运营、DRG 支付与抗菌药专项整治常用口径：
 *  - 床位使用率：>95% 过度紧张(danger)，<75% 资源闲置(warn)，其余良好(good)
 *  - 手术完成率：≥95% good，≥85% warn，其余 danger
 *  - DRG 结余：≥50 万 good，≥0 万 warn（盈亏平衡），<0 万 danger（亏损）
 *  - 病历合格率：≥95% good，≥90% warn，其余 danger
 *  - 抗菌药强度：≤40 DDDs/100 床日 good，≤50 warn，其余 danger
 *  - 患者满意度：≥95% good，≥90% warn，其余 danger
 */
export function buildCeoDashboard(input: CeoDashboardInput): CeoDashboardMetrics {
  const {
    outpatientDaily,
    inpatientDaily,
    surgeryDaily,
    bedOccupancy,
    drgSettlement,
    qcPassRate,
    antibioticUse,
    patientSatisfaction,
  } = input;

  // 床位使用率（%）
  const bedRate = ratio(bedOccupancy.occupiedBeds, bedOccupancy.totalBeds, 100);
  const bedStatus: CeoMetricStatus = bedRate > 95 ? 'danger' : bedRate < 75 ? 'warn' : 'good';

  // 手术完成率（%）
  const surgeryRate = ratio(surgeryDaily.completed, surgeryDaily.scheduled, 100);
  const surgeryStatus: CeoMetricStatus =
    surgeryRate >= 95 ? 'good' : surgeryRate >= 85 ? 'warn' : 'danger';

  // DRG 结余（万元）
  const surplus = drgSettlement.surplusWan;
  const drgStatus: CeoMetricStatus = surplus >= 50 ? 'good' : surplus >= 0 ? 'warn' : 'danger';

  // 病历合格率（%）
  const qcRate = ratio(qcPassRate.passed, qcPassRate.total, 100);
  const qcStatus: CeoMetricStatus = qcRate >= 95 ? 'good' : qcRate >= 90 ? 'warn' : 'danger';

  // 抗菌药使用强度（DDDs/100 床日）
  const abxIntensity = ratio(antibioticUse.ddds, antibioticUse.inpatientDays, 100);
  const abxStatus: CeoMetricStatus = abxIntensity <= 40 ? 'good' : abxIntensity <= 50 ? 'warn' : 'danger';

  // 患者满意度（%）
  const satisfaction = ratio(patientSatisfaction.satisfied, patientSatisfaction.surveyed, 100);
  const satisfactionStatus: CeoMetricStatus =
    satisfaction >= 95 ? 'good' : satisfaction >= 90 ? 'warn' : 'danger';

  const metrics: CeoMetric[] = [
    {
      key: 'outpatientDaily',
      title: '门诊量',
      value: outpatientDaily.visits,
      unit: '人次',
      status: 'good',
      detail: '当日门诊就诊量',
    },
    {
      key: 'inpatientDaily',
      title: '住院量',
      value: inpatientDaily.current,
      unit: '人',
      status: 'good',
      detail: `入院 ${inpatientDaily.admitted} · 出院 ${inpatientDaily.discharged}`,
    },
    {
      key: 'surgeryDaily',
      title: '手术量',
      value: surgeryDaily.completed,
      unit: '台',
      status: surgeryStatus,
      detail: `完成率 ${surgeryRate}% · 计划 ${surgeryDaily.scheduled} 台`,
    },
    {
      key: 'bedOccupancy',
      title: '床位使用率',
      value: bedRate,
      unit: '%',
      status: bedStatus,
      detail: `${bedOccupancy.occupiedBeds}/${bedOccupancy.totalBeds} 张 · 空床 ${Math.max(
        bedOccupancy.totalBeds - bedOccupancy.occupiedBeds,
        0,
      )} 张`,
    },
    {
      key: 'drgSettlement',
      title: 'DRG 结余',
      value: surplus,
      unit: '万元',
      status: drgStatus,
      detail: `已结算 ${drgSettlement.settledCases} 例`,
    },
    {
      key: 'qcPassRate',
      title: '病历合格率',
      value: qcRate,
      unit: '%',
      status: qcStatus,
      detail: `${qcPassRate.passed}/${qcPassRate.total} 份合格`,
    },
    {
      key: 'antibioticUse',
      title: '抗菌药强度',
      value: abxIntensity,
      unit: 'DDDs/100床日',
      status: abxStatus,
      detail: `DDDs ${antibioticUse.ddds} · 床日 ${antibioticUse.inpatientDays}`,
    },
    {
      key: 'patientSatisfaction',
      title: '患者满意度',
      value: satisfaction,
      unit: '%',
      status: satisfactionStatus,
      detail: `满意 ${patientSatisfaction.satisfied}/${patientSatisfaction.surveyed} 份`,
    },
  ];

  const trend = buildTrend(
    {
      outpatient: outpatientDaily.visits,
      inpatient: inpatientDaily.current,
      surgery: surgeryDaily.completed,
    },
    24,
  );

  return { demo: false, metrics, trend };
}

/** 内置演示数据（demo:true），供院长版大屏在无库时演示。 */
export function listView(): CeoDashboardView {
  const base = buildCeoDashboard({
    outpatientDaily: { visits: 10246 },
    inpatientDaily: { current: 1812, admitted: 132, discharged: 118 },
    surgeryDaily: { completed: 96, scheduled: 104 },
    bedOccupancy: { occupiedBeds: 1786, totalBeds: 2000 },
    drgSettlement: { settledCases: 86, surplusWan: 412.5 },
    qcPassRate: { passed: 964, total: 1000 },
    antibioticUse: { ddds: 6820, inpatientDays: 17860 },
    patientSatisfaction: { satisfied: 946, surveyed: 980 },
  });
  return { demo: true, generatedAt: new Date().toISOString(), metrics: base.metrics, trend: base.trend };
}
