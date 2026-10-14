/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱聚合器（院长版）
 *
 * buildCeoDashboard 为纯函数：仅依据六大核心指标原始输入计算院长版驾驶舱视图，
 * 不读 DB、不发请求、不取当前时间，便于单测。listView 返回内置演示数据（demo:true）。
 *
 * 六大核心指标：床位使用率 / 日门诊 / 日住院 / DRG 结算 / 质控通过率 / 抗菌药使用强度。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 床位：实际占用 / 实际开放 */
export interface BedOccupancyInput {
  occupiedBeds: number;
  totalBeds: number;
}

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

/** DRG 结算：已结算例数 / 结算金额（万元） */
export interface DrgSettlementInput {
  settledCases: number;
  settledAmountWan: number;
}

/** 质控通过率：合格数 / 抽查总数 */
export interface QcPassRateInput {
  passed: number;
  total: number;
}

/** 抗菌药使用强度：DDDs 总量 / 同期住院床日（计算 DDDs/100 床日） */
export interface AntibioticUseInput {
  ddds: number;
  inpatientDays: number;
}

/** 院长版驾驶舱聚合入参 */
export interface CeoDashboardInput {
  bedOccupancy: BedOccupancyInput;
  outpatientDaily: OutpatientDailyInput;
  inpatientDaily: InpatientDailyInput;
  drgSettlement: DrgSettlementInput;
  qcPassRate: QcPassRateInput;
  antibioticUse: AntibioticUseInput;
}

/** 指标健康度：good 正常 / warn 预警 / danger 超标 */
export type CeoMetricStatus = 'good' | 'warn' | 'danger';

export type CeoMetricKey =
  | 'bedOccupancy'
  | 'outpatientDaily'
  | 'inpatientDaily'
  | 'drgSettlement'
  | 'qcPassRate'
  | 'antibioticUse';

/** 单张核心指标卡 */
export interface CeoMetric {
  key: CeoMetricKey;
  title: string;
  /** 大字号主数值（前端 24px+ 展示） */
  value: number;
  unit: string;
  status: CeoMetricStatus;
  /** 辅助说明（分母、环比、阈值等） */
  detail: string;
}

/** buildCeoDashboard 输出（纯、无时间戳） */
export interface CeoDashboardMetrics {
  demo: boolean;
  metrics: CeoMetric[];
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
 * 院长版驾驶舱纯函数聚合：汇总六大核心指标并给出健康度判定。
 * 阈值参考公立医院运营与抗菌药专项整治常用口径：
 *  - 床位使用率：>95% 过度紧张(danger)，<75% 资源闲置(warn)，其余良好(good)
 *  - 质控通过率：≥95% good，≥90% warn，其余 danger
 *  - 抗菌药强度：≤40 DDDs/100 床日 good，≤50 warn，其余 danger
 */
export function buildCeoDashboard(input: CeoDashboardInput): CeoDashboardMetrics {
  const { bedOccupancy, outpatientDaily, inpatientDaily, drgSettlement, qcPassRate, antibioticUse } = input;

  // 床位使用率（%）
  const bedRate = ratio(bedOccupancy.occupiedBeds, bedOccupancy.totalBeds, 100);
  const bedStatus: CeoMetricStatus = bedRate > 95 ? 'danger' : bedRate < 75 ? 'warn' : 'good';

  // 质控通过率（%）
  const qcRate = ratio(qcPassRate.passed, qcPassRate.total, 100);
  const qcStatus: CeoMetricStatus = qcRate >= 95 ? 'good' : qcRate >= 90 ? 'warn' : 'danger';

  // 抗菌药使用强度（DDDs/100 床日）
  const abxIntensity = ratio(antibioticUse.ddds, antibioticUse.inpatientDays, 100);
  const abxStatus: CeoMetricStatus = abxIntensity <= 40 ? 'good' : abxIntensity <= 50 ? 'warn' : 'danger';

  const metrics: CeoMetric[] = [
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
      key: 'outpatientDaily',
      title: '日门诊',
      value: outpatientDaily.visits,
      unit: '人次',
      status: 'good',
      detail: '当日门诊就诊量',
    },
    {
      key: 'inpatientDaily',
      title: '日住院',
      value: inpatientDaily.current,
      unit: '人',
      status: 'good',
      detail: `入院 ${inpatientDaily.admitted} · 出院 ${inpatientDaily.discharged}`,
    },
    {
      key: 'drgSettlement',
      title: 'DRG 结算',
      value: drgSettlement.settledCases,
      unit: '例',
      status: 'good',
      detail: `结算金额 ¥${drgSettlement.settledAmountWan} 万`,
    },
    {
      key: 'qcPassRate',
      title: '质控通过率',
      value: qcRate,
      unit: '%',
      status: qcStatus,
      detail: `${qcPassRate.passed}/${qcPassRate.total} 项合格`,
    },
    {
      key: 'antibioticUse',
      title: '抗菌药强度',
      value: abxIntensity,
      unit: 'DDDs/100床日',
      status: abxStatus,
      detail: `DDDs ${antibioticUse.ddds} · 床日 ${antibioticUse.inpatientDays}`,
    },
  ];

  return { demo: false, metrics };
}

/** 内置演示数据（demo:true），供院长版大屏在无库时演示。 */
export function listView(): CeoDashboardView {
  const base = buildCeoDashboard({
    bedOccupancy: { occupiedBeds: 1786, totalBeds: 2000 },
    outpatientDaily: { visits: 10246 },
    inpatientDaily: { current: 1812, admitted: 132, discharged: 118 },
    drgSettlement: { settledCases: 86, settledAmountWan: 412.5 },
    qcPassRate: { passed: 964, total: 1000 },
    antibioticUse: { ddds: 6820, inpatientDays: 17860 },
  });
  return { demo: true, generatedAt: new Date().toISOString(), metrics: base.metrics };
}
