/**
 * 健澜科技 jlmedaios - 医院运营分析聚合（M163-B，安全与运营）
 *
 * 四大分析维度，全部基于汇总后的科室原始数据做纯函数计算：
 *  - 收入分析：门诊 / 住院 / 药品 / 检查（结构占比、总收入、同比口径由上层传入）；
 *  - 成本分析：人力 / 药品 / 耗材 / 设备折旧（结构占比、总成本、成本效益）；
 *  - 效率指标：床位周转 / 平均住院日 / 手术台次；
 *  - 资源利用：医生工时产出 / 设备利用率 / 空间利用率。
 *
 * 本模块不触库、不发起网络请求，便于单元测试与 BFF 路由复用；
 * 所有金额单位为「万元」，比率保留 2 位小数，产出指标保留 1 位小数。
 *
 * 安全与运营：
 *  - 纯聚合结果，不暴露患者级 PII，仅科室级汇总；
 *  - 阈值规则用于运营预警，不直接触发任何扣费 / 停诊等副作用；
 *  - 数据缺失（0 或空）按保守口径处理，除零返回 0，不抛 NaN。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 收入明细（万元） */
export interface RevenueBreakdown {
  /** 门诊收入 */
  outpatient: number;
  /** 住院收入 */
  inpatient: number;
  /** 药品收入 */
  drug: number;
  /** 检查检验收入 */
  exam: number;
}

/** 成本明细（万元） */
export interface CostBreakdown {
  /** 人力成本 */
  labor: number;
  /** 药品成本 */
  drug: number;
  /** 卫生耗材成本 */
  consumable: number;
  /** 设备折旧 */
  depreciation: number;
}

/** 效率指标 */
export interface EfficiencyMetrics {
  /** 床位周转次数（次/周期），越高越好 */
  bedTurnover: number;
  /** 平均住院日（天），越低越好 */
  avgLodDays: number;
  /** 手术台次（台/周期） */
  surgeryCases: number;
}

/** 资源利用指标 */
export interface ResourceUtilization {
  /** 医生周期内总工时（小时） */
  doctorWorkHours: number;
  /** 设备利用率 0-1，越高越好 */
  deviceUtilization: number;
  /** 空间（床位/诊室）利用率 0-1，越高越好 */
  spaceUtilization: number;
}

/**
 * 科室运营原始数据（由 BFF 路由从各业务库汇总后传入；
 * 未接库前使用模块底部 DEMO_OPERATION_DATA 作为内存兜底）。
 */
export interface DeptOperationRaw {
  deptCode: string;
  deptName: string;
  /** 归属统计周期，如「2026-10」 */
  period: string;
  /** 开放床位数 */
  beds: number;
  /** 周期内出院人次 */
  discharges: number;
  /** 周期内门诊人次 */
  outpatientVisits: number;
  revenue: RevenueBreakdown;
  cost: CostBreakdown;
  efficiency: EfficiencyMetrics;
  resource: ResourceUtilization;
}

/** 收入分析结果 */
export interface RevenueAnalysis {
  breakdown: RevenueBreakdown;
  /** 收入合计（万元） */
  total: number;
  /** 各项收入占比（0-1，保留 2 位小数） */
  structure: RevenueBreakdown;
  /** 药品收入占总收入比（药占比，越低越合规） */
  drugRatio: number;
  /** 检查收入占总收入比 */
  examRatio: number;
}

/** 成本分析结果 */
export interface CostAnalysis {
  breakdown: CostBreakdown;
  /** 成本合计（万元） */
  total: number;
  /** 各项成本占比（0-1） */
  structure: CostBreakdown;
  /** 人力成本占比 */
  laborRatio: number;
  /** 药品成本占比 */
  drugCostRatio: number;
  /** 耗材成本占比 */
  consumableRatio: number;
  /** 折旧成本占比 */
  depreciationRatio: number;
}

/** 运营分析报告 */
export interface OperationAnalysisReport {
  deptCode: string;
  deptName: string;
  period: string;
  revenue: RevenueAnalysis;
  cost: CostAnalysis;
  efficiency: EfficiencyMetrics;
  resource: ResourceUtilization;
  /** 结余 = 收入 - 成本（万元） */
  netBalance: number;
  /** 收支结余率 = 结余 / 收入 */
  margin: number;
  /** 每床收入（万元/床） */
  revenuePerBed: number;
  /** 每出院人次成本（万元/人次） */
  costPerDischarge: number;
}

/** 成本效益结果 */
export interface CostEffectiveness {
  deptCode: string;
  deptName: string;
  period: string;
  /** 每 1 元收入对应的成本（成本/收入，越低越高效） */
  costPerRevenue: number;
  /** 收支结余率（%） */
  marginPct: number;
  /** 医生工时产出（万元/工时） */
  outputPerDoctorHour: number;
  /** 成本效益综合得分 0-100（越高越健康） */
  score: number;
  /** 效益等级 A/B/C/D */
  grade: 'A' | 'B' | 'C' | 'D';
}

/** 对标单项 */
export interface BenchmarkItem {
  metric: string;
  label: string;
  deptValue: number;
  peerAvg: number;
  /** 偏离 = dept - peerAvg（百分点 / 绝对量） */
  delta: number;
  /** 优于均值 true / 劣于 false / 持平 null */
  betterThanAvg: boolean | null;
}

/** 对标结果 */
export interface BenchmarkResult {
  deptCode: string;
  deptName: string;
  peerCount: number;
  items: BenchmarkItem[];
  /** 全院排名（按成本效益得分降序，1 起） */
  rank: number;
}

/** 运营问题级别 */
export type IssueLevel = 'warning' | 'critical';

/** 运营问题项 */
export interface OperationIssue {
  deptCode: string;
  level: IssueLevel;
  dimension: 'revenue' | 'cost' | 'efficiency' | 'resource';
  metric: string;
  /** 实际值 */
  value: number;
  /** 阈值 */
  threshold: number;
  message: string;
  suggestion: string;
}

/* ------------------------------- 内部工具 ------------------------------- */

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;
/** 安全除法：分母 <= 0 返回 0 */
const safeDiv = (a: number, b: number): number => (b > 0 ? a / b : 0);

/** 把明细按合计归一化为占比（合计为 0 时各项为 0） */
function toStructure<T extends object>(breakdown: T): T {
  const entries = Object.entries(breakdown) as Array<[string, number]>;
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  const out: Record<string, number> = {};
  for (const [k, v] of entries) {
    out[k] = total > 0 ? round2(v / total) : 0;
  }
  return { ...breakdown, ...out };
}

/** 成本效益得分 → 等级 */
function gradeOf(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

/* ------------------------------- 纯函数导出 ------------------------------- */

/**
 * 纯函数：构建科室四维运营分析报告（收入 / 成本 / 效率 / 资源利用）。
 * @param deptCode 科室编码（在 DEMO_OPERATION_DATA 中查找；未找到抛错，路由映射为 400）
 * @param period   展示用统计周期
 */
export function buildOperationAnalysis(
  deptCode: string,
  period: string,
): OperationAnalysisReport {
  const raw = DEMO_OPERATION_DATA.find((d) => d.deptCode === deptCode);
  if (!raw) throw new Error(`科室不存在: ${deptCode}`);

  const revenueTotal =
    raw.revenue.outpatient + raw.revenue.inpatient + raw.revenue.drug + raw.revenue.exam;
  const costTotal =
    raw.cost.labor + raw.cost.drug + raw.cost.consumable + raw.cost.depreciation;

  const revenue: RevenueAnalysis = {
    breakdown: { ...raw.revenue },
    total: round1(revenueTotal),
    structure: toStructure(raw.revenue),
    drugRatio: round2(safeDiv(raw.revenue.drug, revenueTotal)),
    examRatio: round2(safeDiv(raw.revenue.exam, revenueTotal)),
  };

  const cost: CostAnalysis = {
    breakdown: { ...raw.cost },
    total: round1(costTotal),
    structure: toStructure(raw.cost),
    laborRatio: round2(safeDiv(raw.cost.labor, costTotal)),
    drugCostRatio: round2(safeDiv(raw.cost.drug, costTotal)),
    consumableRatio: round2(safeDiv(raw.cost.consumable, costTotal)),
    depreciationRatio: round2(safeDiv(raw.cost.depreciation, costTotal)),
  };

  const netBalance = round1(revenueTotal - costTotal);

  return {
    deptCode: raw.deptCode,
    deptName: raw.deptName,
    period,
    revenue,
    cost,
    efficiency: { ...raw.efficiency },
    resource: { ...raw.resource },
    netBalance,
    margin: round2(safeDiv(netBalance, revenueTotal)),
    revenuePerBed: round1(safeDiv(revenueTotal, raw.beds)),
    costPerDischarge: round2(safeDiv(costTotal, raw.discharges)),
  };
}

/**
 * 纯函数：计算科室成本效益（每元收入成本 / 结余率 / 工时产出 / 综合得分）。
 * @param deptCode 科室编码
 * @param period   展示用统计周期
 */
export function calculateCostEffectiveness(
  deptCode: string,
  period: string,
): CostEffectiveness {
  const report = buildOperationAnalysis(deptCode, period);
  const revenueTotal = report.revenue.total;
  const costTotal = report.cost.total;

  const costPerRevenue = round2(safeDiv(costTotal, revenueTotal));
  const marginPct = round1(report.margin * 100);
  const outputPerDoctorHour = round2(safeDiv(revenueTotal, report.resource.doctorWorkHours));

  /* 成本效益综合得分（0-100，越高越健康）：
     - 结余率达标（≥20% 满分）权重 50；
     - 每元收入成本 ≤0.8 得满分，>1 不得分，线性折算权重 30；
     - 医生工时产出归一化（目标 0.05 万元/工时）权重 20。 */
  const marginScore = Math.min(1, Math.max(0, report.margin / 0.2)) * 50;
  const costRatioScore = Math.min(1, Math.max(0, (1 - costPerRevenue) / 0.2)) * 30;
  const outputScore = Math.min(1, Math.max(0, outputPerDoctorHour / 0.05)) * 20;
  const score = round1(marginScore + costRatioScore + outputScore);

  return {
    deptCode: report.deptCode,
    deptName: report.deptName,
    period,
    costPerRevenue,
    marginPct,
    outputPerDoctorHour,
    score,
    grade: gradeOf(score),
  };
}

/**
 * 纯函数：将科室与同行（benchmarkData）做多维对标，返回偏离度与排名。
 * @param deptCode     目标科室编码（应包含在 benchmarkData 内）
 * @param benchmarkData 全部参与对标的科室运营原始数据
 */
export function benchmarkOperation(
  deptCode: string,
  benchmarkData: DeptOperationRaw[],
): BenchmarkResult {
  const dept = benchmarkData.find((d) => d.deptCode === deptCode);
  if (!dept) throw new Error(`科室不存在: ${deptCode}`);

  const peers = benchmarkData.filter((d) => d.deptCode !== deptCode);
  const avg = (fn: (d: DeptOperationRaw) => number): number => {
    if (peers.length === 0) return 0;
    return round2(peers.reduce((s, d) => s + fn(d), 0) / peers.length);
  };

  const rev = (d: DeptOperationRaw) =>
    d.revenue.outpatient + d.revenue.inpatient + d.revenue.drug + d.revenue.exam;
  const cst = (d: DeptOperationRaw) =>
    d.cost.labor + d.cost.drug + d.cost.consumable + d.cost.depreciation;

  /** 方向性：true 表示数值越高越好 */
  const metrics: Array<{
    metric: string;
    label: string;
    deptValue: number;
    peerAvg: number;
    higherBetter: boolean;
  }> = [
    { metric: 'revenueTotal', label: '收入合计(万元)', deptValue: round1(rev(dept)), peerAvg: round1(avg(rev)), higherBetter: true },
    { metric: 'costTotal', label: '成本合计(万元)', deptValue: round1(cst(dept)), peerAvg: round1(avg(cst)), higherBetter: false },
    { metric: 'margin', label: '收支结余率', deptValue: round2(safeDiv(rev(dept) - cst(dept), rev(dept))), peerAvg: round2(avg((d) => safeDiv(rev(d) - cst(d), rev(d)))), higherBetter: true },
    { metric: 'bedTurnover', label: '床位周转(次)', deptValue: dept.efficiency.bedTurnover, peerAvg: avg((d) => d.efficiency.bedTurnover), higherBetter: true },
    { metric: 'avgLodDays', label: '平均住院日(天)', deptValue: dept.efficiency.avgLodDays, peerAvg: avg((d) => d.efficiency.avgLodDays), higherBetter: false },
    { metric: 'deviceUtilization', label: '设备利用率', deptValue: dept.resource.deviceUtilization, peerAvg: avg((d) => d.resource.deviceUtilization), higherBetter: true },
  ];

  const items: BenchmarkItem[] = metrics.map((m) => {
    const delta = round2(m.deptValue - m.peerAvg);
    const betterThanAvg: boolean | null =
      delta === 0 ? null : m.higherBetter ? delta > 0 : delta < 0;
    return {
      metric: m.metric,
      label: m.label,
      deptValue: m.deptValue,
      peerAvg: m.peerAvg,
      delta,
      betterThanAvg,
    };
  });

  /* 排名：按成本效益得分降序 */
  const scored = benchmarkData
    .map((d) => ({ d, ce: calculateCostEffectiveness(d.deptCode, d.period) }))
    .sort((a, b) => b.ce.score - a.ce.score);
  const rank = scored.findIndex((s) => s.d.deptCode === deptCode) + 1;

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    peerCount: peers.length,
    items,
    rank: rank > 0 ? rank : 1,
  };
}

/**
 * 纯函数：基于运营指标做规则化问题识别（安全与运营：只预警，不自动处置）。
 * @param deptCode 科室编码
 * @param metrics  科室运营分析报告（buildOperationAnalysis 的输出）
 */
export function identifyOperationIssue(
  deptCode: string,
  metrics: OperationAnalysisReport,
): OperationIssue[] {
  const issues: OperationIssue[] = [];
  const push = (
    level: IssueLevel,
    dimension: OperationIssue['dimension'],
    metric: string,
    value: number,
    threshold: number,
    message: string,
    suggestion: string,
  ) => issues.push({ deptCode, level, dimension, metric, value, threshold, message, suggestion });

  /* ---- 成本维度 ---- */
  if (metrics.cost.drugCostRatio > 0.45) {
    push(
      metrics.cost.drugCostRatio > 0.55 ? 'critical' : 'warning',
      'cost',
      'drugCostRatio',
      metrics.cost.drugCostRatio,
      0.45,
      `药品成本占比 ${(metrics.cost.drugCostRatio * 100).toFixed(0)}%，高于 45% 控制线`,
      '优化处方点评与合理用药，压缩辅助用药占比，推进集采落地。',
    );
  }
  if (metrics.cost.consumableRatio > 0.18) {
    push(
      'warning',
      'cost',
      'consumableRatio',
      metrics.cost.consumableRatio,
      0.18,
      `耗材成本占比 ${(metrics.cost.consumableRatio * 100).toFixed(0)}%，高于 18% 参考线`,
      '推行高值耗材 SPD 精细化管理，建立单耗定额与超标预警。',
    );
  }
  if (metrics.cost.laborRatio > 0.5) {
    push(
      'warning',
      'cost',
      'laborRatio',
      metrics.cost.laborRatio,
      0.5,
      `人力成本占比 ${(metrics.cost.laborRatio * 100).toFixed(0)}%，高于 50% 参考线`,
      '评估医师工时产出，通过 AI 病历与流程自动化释放有效工时。',
    );
  }

  /* ---- 收入维度 ---- */
  if (metrics.netBalance < 0) {
    push(
      'critical',
      'revenue',
      'netBalance',
      metrics.netBalance,
      0,
      `周期收支结余 ${metrics.netBalance.toFixed(1)} 万元，处于亏损`,
      '开展病种成本核算（DRG/DIP），重点管控亏损病组，调整收入结构。',
    );
  }
  if (metrics.revenue.examRatio > 0.3) {
    push(
      'warning',
      'revenue',
      'examRatio',
      metrics.revenue.examRatio,
      0.3,
      `检查收入占比 ${(metrics.revenue.examRatio * 100).toFixed(0)}%，存在过度检查倾向`,
      '强化检查检验阳性率考核，落实合理检查与互认制度。',
    );
  }

  /* ---- 效率维度 ---- */
  if (metrics.efficiency.avgLodDays > 9) {
    push(
      metrics.efficiency.avgLodDays > 11 ? 'critical' : 'warning',
      'efficiency',
      'avgLodDays',
      metrics.efficiency.avgLodDays,
      9,
      `平均住院日 ${metrics.efficiency.avgLodDays.toFixed(1)} 天，高于 9 天参考线`,
      '推行临床路径与日间手术，压缩术前等待与出院准备时间。',
    );
  }
  if (metrics.efficiency.bedTurnover < 2) {
    push(
      'warning',
      'efficiency',
      'bedTurnover',
      metrics.efficiency.bedTurnover,
      2,
      `床位周转 ${metrics.efficiency.bedTurnover.toFixed(1)} 次，低于 2 次参考线`,
      '优化入院排队与床位跨科调度，减少压床与空床并存。',
    );
  }

  /* ---- 资源利用维度 ---- */
  if (metrics.resource.deviceUtilization < 0.6) {
    push(
      'warning',
      'resource',
      'deviceUtilization',
      metrics.resource.deviceUtilization,
      0.6,
      `设备利用率 ${(metrics.resource.deviceUtilization * 100).toFixed(0)}%，低于 60%`,
      '建立设备预约与共享排程，分析闲置时段并开放跨科使用。',
    );
  }
  if (metrics.resource.spaceUtilization < 0.6) {
    push(
      'warning',
      'resource',
      'spaceUtilization',
      metrics.resource.spaceUtilization,
      0.6,
      `空间利用率 ${(metrics.resource.spaceUtilization * 100).toFixed(0)}%，低于 60%`,
      '复盘诊室/病区排班，平峰错峰开诊，提升单位空间产出。',
    );
  }

  return issues;
}

/* ------------------------------- 演示数据集（路由兜底） ------------------------------- */
/* 安全与运营：未接业务库实时汇总前，BFF 以此内存数据驱动运营分析页；
   后续接入 financeRepo / bedRepo / equipmentRepo 时仅替换数据源，纯函数不变。 */

export const DEMO_OPERATION_DATA: DeptOperationRaw[] = [
  {
    deptCode: 'D001', deptName: '心血管内科', period: '2026-10',
    beds: 60, discharges: 320, outpatientVisits: 2400,
    revenue: { outpatient: 480, inpatient: 1560, drug: 620, exam: 340 },
    cost: { labor: 720, drug: 560, consumable: 260, depreciation: 180 },
    efficiency: { bedTurnover: 2.8, avgLodDays: 6.5, surgeryCases: 60 },
    resource: { doctorWorkHours: 2400, deviceUtilization: 0.82, spaceUtilization: 0.88 },
  },
  {
    deptCode: 'D002', deptName: '普通外科', period: '2026-10',
    beds: 70, discharges: 280, outpatientVisits: 1800,
    revenue: { outpatient: 360, inpatient: 1420, drug: 520, exam: 300 },
    cost: { labor: 640, drug: 480, consumable: 420, depreciation: 200 },
    efficiency: { bedTurnover: 2.2, avgLodDays: 8.2, surgeryCases: 110 },
    resource: { doctorWorkHours: 2600, deviceUtilization: 0.74, spaceUtilization: 0.7 },
  },
  {
    deptCode: 'D003', deptName: '神经内科', period: '2026-10',
    beds: 55, discharges: 260, outpatientVisits: 2100,
    revenue: { outpatient: 420, inpatient: 1180, drug: 560, exam: 380 },
    cost: { labor: 600, drug: 520, consumable: 180, depreciation: 160 },
    efficiency: { bedTurnover: 2.0, avgLodDays: 7.8, surgeryCases: 20 },
    resource: { doctorWorkHours: 2200, deviceUtilization: 0.68, spaceUtilization: 0.66 },
  },
  {
    deptCode: 'D004', deptName: '骨科', period: '2026-10',
    beds: 65, discharges: 220, outpatientVisits: 1500,
    revenue: { outpatient: 300, inpatient: 1280, drug: 460, exam: 360 },
    cost: { labor: 580, drug: 440, consumable: 560, depreciation: 240 },
    efficiency: { bedTurnover: 1.8, avgLodDays: 9.5, surgeryCases: 130 },
    resource: { doctorWorkHours: 2500, deviceUtilization: 0.58, spaceUtilization: 0.55 },
  },
  {
    deptCode: 'D005', deptName: '儿科', period: '2026-10',
    beds: 40, discharges: 180, outpatientVisits: 3200,
    revenue: { outpatient: 520, inpatient: 620, drug: 380, exam: 180 },
    cost: { labor: 460, drug: 320, consumable: 120, depreciation: 90 },
    efficiency: { bedTurnover: 3.2, avgLodDays: 5.2, surgeryCases: 15 },
    resource: { doctorWorkHours: 2000, deviceUtilization: 0.64, spaceUtilization: 0.9 },
  },
  {
    deptCode: 'D006', deptName: '呼吸与危重症医学科', period: '2026-10',
    beds: 62, discharges: 290, outpatientVisits: 1700,
    revenue: { outpatient: 340, inpatient: 1080, drug: 640, exam: 320 },
    cost: { labor: 620, drug: 660, consumable: 240, depreciation: 190 },
    efficiency: { bedTurnover: 2.1, avgLodDays: 8.8, surgeryCases: 10 },
    resource: { doctorWorkHours: 2300, deviceUtilization: 0.62, spaceUtilization: 0.63 },
  },
];
