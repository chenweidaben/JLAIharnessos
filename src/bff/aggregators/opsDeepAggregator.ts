/**
 * 健澜科技 jlmedaios — 【安全质量与运营】医院运营与管理深化聚合器（M172-C，纯函数）
 *
 * 运营分析要有数据，不能拍脑袋。本聚合器把科室运营从「年终估个数」升级为
 * 「门诊/住院/手术/财务四域落数 → 效率加权评分 → 对标标杆 → 瓶颈自动识别」闭环：
 *
 *   - buildDeepOperationSystem：输出深度运营管理体系蓝图——四域、指标项、单位、
 *     方向（越高越好/越低越好/区间最优）、标杆值与管理目标，作为全院统一口径；
 *   - analyzeOperationEfficiency：吃科室四域原始指标，派生 三四级手术占比 / 利润率 /
 *     成本率 等效率指标，按指标标杆加权打分（0~100），给出四域得分与全院运营效率等级；
 *   - benchmarkOperation：把科室指标逐项与标杆（全院均值/区域标杆）对照，算差距与
 *     领先/持平/落后评级；
 *   - identifyOperationBottleneck：按红线阈值扫描，识别候诊、住院日、床位拥挤、
 *     三四级占比、手术等待、亏损、医保拒付、DRG 超支等瓶颈，给严重度与改进建议。
 *
 * 全部无副作用、不触库，便于单测；数据库读写由路由层负责。
 * 医疗安全红线：仅运营管理辅助，不触发诊疗、不自动改医嘱/结算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 四大运营域 */
export type OpsDomain = 'outpatient' | 'inpatient' | 'surgery' | 'finance';

/** 域中文名 */
export const DOMAIN_LABEL: Record<OpsDomain, string> = {
  outpatient: '门诊运营',
  inpatient: '住院运营',
  surgery: '手术运营',
  finance: '财务运营',
};

/** 科室四域原始运营指标（周期内实际发生量，数据落 medmuse.ops_metric） */
export interface RawOpsMetrics {
  // 门诊
  outpatientVisits: number;      // 门诊量（人次/周期）
  avgCostPerVisit: number;       // 次均费用（元）
  avgWaitMinutes: number;        // 平均等待时间（分钟）
  appointmentRate: number;       // 预约率（0..1）
  noShowRate: number;            // 爽约率（0..1）
  // 住院
  inHospital: number;            // 平均在院人数（人）
  admissions: number;            // 入院人数（人/周期）
  discharges: number;             // 出院人数（人/周期）
  avgLOS: number;                 // 平均住院日（天）
  bedOccupancy: number;           // 床位使用率（0..1）
  totalBeds: number;              // 编制床位（张）
  // 手术
  surgeryCount: number;           // 手术量（台/周期）
  highLevelSurgery: number;       // 三四级手术量（台/周期）
  surgeryWaitHours: number;       // 手术等待时间（小时）
  pacuTurnover: number;           // PACU 周转率（台/床日）
  // 财务
  revenue: number;                // 收入（元/周期）
  cost: number;                   // 成本（元/周期）
  profit: number;                 // 利润（元/周期）
  drgSurplus: number;             // DRG 结余（元/周期，负为超支）
  insuranceDenialRate: number;   // 医保拒付率（0..1）
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * 派生效率指标（库里不落库，实时算，避免口径漂移）。
 */
export interface DerivedOpsMetrics {
  /** 三四级手术占比 = 三四级手术量 / 手术量 */
  highLevelRatio: number;
  /** 利润率 = 利润 / 收入 */
  profitMargin: number;
  /** 成本率 = 成本 / 收入 */
  costRatio: number;
}

export function deriveOpsMetrics(m: RawOpsMetrics): DerivedOpsMetrics {
  const highLevelRatio = m.surgeryCount > 0 ? m.highLevelSurgery / m.surgeryCount : 0;
  const profitMargin = m.revenue > 0 ? m.profit / m.revenue : 0;
  const costRatio = m.revenue > 0 ? m.cost / m.revenue : 0;
  return {
    highLevelRatio: round3(highLevelRatio),
    profitMargin: round3(profitMargin),
    costRatio: round3(costRatio),
  };
}

/* ---------------------------------------------------------------------------
 * 指标评分口径：一条可评分指标的统一描述（标杆来自 2000 床、日门诊 1 万三甲参考值）
 * ------------------------------------------------------------------------- */
type ScoreKey =
  | 'avgWaitMinutes' | 'appointmentRate' | 'noShowRate' | 'avgCostPerVisit'
  | 'bedOccupancy' | 'avgLOS'
  | 'highLevelRatio' | 'surgeryWaitHours' | 'pacuTurnover'
  | 'profitMargin' | 'insuranceDenialRate' | 'drgSurplus';

interface MetricSpec {
  key: ScoreKey;
  label: string;
  unit: string;
  domain: OpsDomain;
  /** higher_better: 越高越好；lower_better: 越低越好；band: 区间最优（床位使用率） */
  direction: 'higher_better' | 'lower_better' | 'band';
  /** 标杆值（direction=band 时不用，用 bandLow/bandHigh） */
  benchmark?: number;
  /** band 区间最优下限/上限 */
  bandLow?: number;
  bandHigh?: number;
  /** 域内权重 */
  weight: number;
}

const SPEC: MetricSpec[] = [
  // 门诊
  { key: 'avgWaitMinutes', label: '平均等待时间', unit: '分钟', domain: 'outpatient', direction: 'lower_better', benchmark: 20, weight: 0.3 },
  { key: 'appointmentRate', label: '预约率', unit: '', domain: 'outpatient', direction: 'higher_better', benchmark: 0.55, weight: 0.25 },
  { key: 'noShowRate', label: '爽约率', unit: '', domain: 'outpatient', direction: 'lower_better', benchmark: 0.1, weight: 0.25 },
  { key: 'avgCostPerVisit', label: '次均费用', unit: '元', domain: 'outpatient', direction: 'lower_better', benchmark: 350, weight: 0.2 },
  // 住院
  { key: 'bedOccupancy', label: '床位使用率', unit: '', domain: 'inpatient', direction: 'band', bandLow: 0.85, bandHigh: 0.93, weight: 0.45 },
  { key: 'avgLOS', label: '平均住院日', unit: '天', domain: 'inpatient', direction: 'lower_better', benchmark: 8.5, weight: 0.55 },
  // 手术
  { key: 'highLevelRatio', label: '三四级手术占比', unit: '', domain: 'surgery', direction: 'higher_better', benchmark: 0.4, weight: 0.4 },
  { key: 'surgeryWaitHours', label: '手术等待时间', unit: '小时', domain: 'surgery', direction: 'lower_better', benchmark: 24, weight: 0.35 },
  { key: 'pacuTurnover', label: 'PACU 周转率', unit: '台/床日', domain: 'surgery', direction: 'higher_better', benchmark: 4, weight: 0.25 },
  // 财务
  { key: 'profitMargin', label: '利润率', unit: '', domain: 'finance', direction: 'higher_better', benchmark: 0.05, weight: 0.4 },
  { key: 'insuranceDenialRate', label: '医保拒付率', unit: '', domain: 'finance', direction: 'lower_better', benchmark: 0.01, weight: 0.35 },
  { key: 'drgSurplus', label: 'DRG 结余', unit: '元', domain: 'finance', direction: 'higher_better', benchmark: 0, weight: 0.25 },
];

/** 取某指标实际值（派生指标在 derived 里） */
function valueOf(key: ScoreKey, raw: RawOpsMetrics, derived: DerivedOpsMetrics): number {
  switch (key) {
    case 'highLevelRatio': return derived.highLevelRatio;
    case 'profitMargin': return derived.profitMargin;
    default: return raw[key as keyof RawOpsMetrics] as number;
  }
}

/** 单指标得分 0~100（数据相对标杆的达成度） */
function scoreOne(spec: MetricSpec, value: number): number {
  if (spec.direction === 'band') {
    const lo = spec.bandLow ?? 0.85;
    const hi = spec.bandHigh ?? 0.93;
    if (value >= lo && value <= hi) return 100;
    // 越出区间按距离衰减：低于 lo 按闲置扣分，高于 hi 按拥挤扣分
    const dist = value < lo ? lo - value : value - hi;
    return clamp100(100 - (dist / lo) * 100);
  }
  if (value <= 0) return 0;
  const b = spec.benchmark ?? 0;
  if (spec.direction === 'higher_better') {
    // 达标即 100，超额不超 100；DRG 结余以 0 为及格线
    if (b <= 0) return value > 0 ? 100 : clamp100(100 + value / 10000);
    return clamp100((value / b) * 100);
  }
  // lower_better：达标即 100，越差越扣分
  return clamp100((b / value) * 100);
}

/** 运营效率等级 */
export type OpsGrade = 'A' | 'B' | 'C' | 'D';
function gradeOf(score: number): OpsGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}
export const GRADE_LABEL: Record<OpsGrade, string> = {
  A: '优秀', B: '良好', C: '一般', D: '待改进',
};

/* ---------------------------------------------------------------------------
 * 1. buildDeepOperationSystem：深度运营管理体系蓝图
 * ------------------------------------------------------------------------- */
export interface OpsMetricSpecOut {
  key: string;
  label: string;
  unit: string;
  direction: 'higher_better' | 'lower_better' | 'band';
  benchmark: number;
}
export interface OpsDomainSpec {
  key: OpsDomain;
  name: string;
  managementGoal: string;
  metrics: OpsMetricSpecOut[];
}
export interface DeepOperationSystem {
  version: string;
  principles: string[];
  domains: OpsDomainSpec[];
}

const DOMAIN_GOAL: Record<OpsDomain, string> = {
  outpatient: '缩短候诊、提升预约与就诊效率，控制次均费用合理增长',
  inpatient:  '提高床位周转效率，压缩平均住院日，床位使用率保持 85%~93% 黄金区间',
  surgery:    '提升三四级手术占比与手术周转，缩短手术等待，保障 PACU 高效流转',
  finance:    '收支结构优化，提升利润率与 DRG 结余，压降医保拒付',
};

/**
 * 深度运营管理体系（纯函数）：输出四域指标口径、方向、标杆与管理目标，
 * 作为全院统一运营看板与考核口径，避免各科室各算各的。
 */
export function buildDeepOperationSystem(): DeepOperationSystem {
  const domains: OpsDomainSpec[] = (['outpatient', 'inpatient', 'surgery', 'finance'] as OpsDomain[])
    .map((key) => ({
      key,
      name: DOMAIN_LABEL[key],
      managementGoal: DOMAIN_GOAL[key],
      metrics: SPEC.filter((s) => s.domain === key).map((s) => ({
        key: s.key,
        label: s.label,
        unit: s.unit,
        direction: s.direction,
        benchmark: s.direction === 'band'
          ? round3(((s.bandLow ?? 0) + (s.bandHigh ?? 0)) / 2)
          : round3(s.benchmark ?? 0),
      })),
    }));
  return {
    version: 'M172-C',
    principles: [
      '运营分析要有数据：每个指标都有来源、单位、标杆，不拍脑袋',
      '派生效率指标实时计算，口径全院统一',
      '瓶颈只出建议不自动处置，不触发诊疗行为',
    ],
    domains,
  };
}

/* ---------------------------------------------------------------------------
 * 2. analyzeOperationEfficiency：运营效率分析
 * ------------------------------------------------------------------------- */
export interface DomainScore {
  domain: OpsDomain;
  name: string;
  score: number;
  grade: OpsGrade;
  gradeLabel: string;
  metricScores: { key: string; label: string; value: number; benchmark: number; score: number }[];
}
export interface EfficiencyReport {
  deptCode: string;
  deptName: string;
  period: string;
  derived: DerivedOpsMetrics;
  domains: DomainScore[];
  overallScore: number;
  overallGrade: OpsGrade;
  overallGradeLabel: string;
}

/**
 * 运营效率分析（纯函数）：按标杆对四域指标加权打分，输出四域得分与整体效率等级。
 *
 * @param dept   科室标识
 * @param period 周期标识（如 2026-09）
 * @param raw    科室四域原始指标（来自 medmuse.ops_metric）
 */
export function analyzeOperationEfficiency(
  dept: { deptCode: string; deptName: string },
  period: string,
  raw: RawOpsMetrics,
): EfficiencyReport {
  const derived = deriveOpsMetrics(raw);
  const domains: DomainScore[] = (['outpatient', 'inpatient', 'surgery', 'finance'] as OpsDomain[])
    .map((domain) => {
      const specs = SPEC.filter((s) => s.domain === domain);
      let weighted = 0;
      let weightSum = 0;
      const metricScores: DomainScore['metricScores'] = specs.map((s) => {
        const value = valueOf(s.key, raw, derived);
        const score = scoreOne(s, value);
        weighted += score * s.weight;
        weightSum += s.weight;
        return {
          key: s.key,
          label: s.label,
          value: round3(value),
          benchmark: s.direction === 'band' ? round3(((s.bandLow ?? 0) + (s.bandHigh ?? 0)) / 2) : round3(s.benchmark ?? 0),
          score: round2(score),
        };
      });
      const score = weightSum > 0 ? weighted / weightSum : 0;
      return {
        domain,
        name: DOMAIN_LABEL[domain],
        score: round2(score),
        grade: gradeOf(score),
        gradeLabel: GRADE_LABEL[gradeOf(score)],
        metricScores,
      };
    });

  const overallScore = round2(domains.reduce((s, d) => s + d.score, 0) / domains.length);
  const overallGrade = gradeOf(overallScore);
  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    period,
    derived,
    domains,
    overallScore,
    overallGrade,
    overallGradeLabel: GRADE_LABEL[overallGrade],
  };
}

/* ---------------------------------------------------------------------------
 * 3. benchmarkOperation：运营对标
 * ------------------------------------------------------------------------- */
export type BenchmarkRating = 'leading' | 'on_par' | 'lagging';
export const BENCHMARK_RATING_LABEL: Record<BenchmarkRating, string> = {
  leading: '领先', on_par: '持平', lagging: '落后',
};
export interface BenchmarkItem {
  domain: OpsDomain;
  domainName: string;
  metricKey: ScoreKey;
  metricLabel: string;
  unit: string;
  deptValue: number;
  benchmarkValue: number;
  /** 差距 = 科室值 − 标杆值（方向敏感，见 rating） */
  gap: number;
  rating: BenchmarkRating;
}
export interface BenchmarkReport {
  deptCode: string;
  deptName: string;
  items: BenchmarkItem[];
  leadingCount: number;
  laggingCount: number;
  overallRating: BenchmarkRating;
}

/**
 * 运营对标（纯函数）：把科室指标逐项与标杆（全院均值/区域标杆）对照，
 * 按指标方向判断 领先/持平/落后。
 *
 * @param dept         科室标识
 * @param deptRaw      科室原始指标
 * @param benchmarkRaw 标杆科室/全院均值原始指标（同口径）
 */
export function benchmarkOperation(
  dept: { deptCode: string; deptName: string },
  deptRaw: RawOpsMetrics,
  benchmarkRaw: RawOpsMetrics,
): BenchmarkReport {
  const dDerived = deriveOpsMetrics(deptRaw);
  const bDerived = deriveOpsMetrics(benchmarkRaw);
  const items: BenchmarkItem[] = SPEC.map((s) => {
    const deptValue = valueOf(s.key, deptRaw, dDerived);
    const benchmarkValue = valueOf(s.key, benchmarkRaw, bDerived);
    const gap = deptValue - benchmarkValue;
    // 方向敏感：lower_better 时 gap<0 更好
    let rating: BenchmarkRating = 'on_par';
    if (benchmarkValue > 1e-9) {
      const rel = gap / benchmarkValue;
      const better = s.direction === 'lower_better' ? rel < -0.05 : rel > 0.05;
      const worse = s.direction === 'lower_better' ? rel > 0.05 : rel < -0.05;
      if (better) rating = 'leading';
      else if (worse) rating = 'lagging';
    } else if (s.key === 'drgSurplus') {
      rating = deptValue > 0 ? 'leading' : deptValue < 0 ? 'lagging' : 'on_par';
    }
    return {
      domain: s.domain,
      domainName: DOMAIN_LABEL[s.domain],
      metricKey: s.key,
      metricLabel: s.label,
      unit: s.unit,
      deptValue: round3(deptValue),
      benchmarkValue: round3(benchmarkValue),
      gap: round3(gap),
      rating,
    };
  });
  const leadingCount = items.filter((i) => i.rating === 'leading').length;
  const laggingCount = items.filter((i) => i.rating === 'lagging').length;
  const overallRating: BenchmarkRating =
    laggingCount > leadingCount + 1 ? 'lagging' : leadingCount > laggingCount + 1 ? 'leading' : 'on_par';
  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    items,
    leadingCount,
    laggingCount,
    overallRating,
  };
}

/* ---------------------------------------------------------------------------
 * 4. identifyOperationBottleneck：运营瓶颈识别
 * ------------------------------------------------------------------------- */
export type Severity = 'warning' | 'critical';
export interface Bottleneck {
  domain: OpsDomain;
  domainName: string;
  metricKey: ScoreKey;
  metricLabel: string;
  unit: string;
  value: number;
  threshold: number;
  severity: Severity;
  reason: string;
  suggestedAction: string;
}
export interface BottleneckReport {
  deptCode: string;
  deptName: string;
  bottlenecks: Bottleneck[];
  criticalCount: number;
  warningCount: number;
  topBottleneck: Bottleneck | null;
}

/**
 * 运营瓶颈识别（纯函数）：按红线阈值扫描四域指标，给出严重度与改进建议。
 * 阈值严于评分标杆（评分容忍、红线零容忍）。
 */
export function identifyOperationBottleneck(
  dept: { deptCode: string; deptName: string },
  raw: RawOpsMetrics,
): BottleneckReport {
  const derived = deriveOpsMetrics(raw);
  const list: Bottleneck[] = [];
  const push = (b: Omit<Bottleneck, 'domainName'>) => {
    list.push({ ...b, domainName: DOMAIN_LABEL[b.domain] });
  };

  // 门诊
  if (raw.avgWaitMinutes > 40) {
    push({ domain: 'outpatient', metricKey: 'avgWaitMinutes', metricLabel: '平均等待时间', unit: '分钟',
      value: round2(raw.avgWaitMinutes), threshold: 40, severity: 'critical',
      reason: `平均候诊 ${raw.avgWaitMinutes.toFixed(0)} 分钟，远超 40 分钟红线`,
      suggestedAction: '优化分时段预约与诊间调度，增开高峰时段号源，上线候诊实时叫号' });
  } else if (raw.avgWaitMinutes > 30) {
    push({ domain: 'outpatient', metricKey: 'avgWaitMinutes', metricLabel: '平均等待时间', unit: '分钟',
      value: round2(raw.avgWaitMinutes), threshold: 30, severity: 'warning',
      reason: `平均候诊 ${raw.avgWaitMinutes.toFixed(0)} 分钟，超过 30 分钟关注线`,
      suggestedAction: '分析高峰拥堵科室，弹性安排出诊医生' });
  }
  if (raw.noShowRate > 0.15) {
    push({ domain: 'outpatient', metricKey: 'noShowRate', metricLabel: '爽约率', unit: '',
      value: round3(raw.noShowRate), threshold: 0.15, severity: 'critical',
      reason: `爽约率 ${(raw.noShowRate * 100).toFixed(1)}%，号源浪费严重`,
      suggestedAction: '上线就诊前一日短信/APP 提醒，建立爽约名单与二次预约候补机制' });
  }
  if (raw.appointmentRate < 0.3) {
    push({ domain: 'outpatient', metricKey: 'appointmentRate', metricLabel: '预约率', unit: '',
      value: round3(raw.appointmentRate), threshold: 0.3, severity: 'warning',
      reason: `预约率仅 ${(raw.appointmentRate * 100).toFixed(0)}%，现场挂号为主、候诊不可控`,
      suggestedAction: '推行全预约制，提高预约号源占比' });
  }

  // 住院
  if (raw.bedOccupancy > 0.98) {
    push({ domain: 'inpatient', metricKey: 'bedOccupancy', metricLabel: '床位使用率', unit: '',
      value: round3(raw.bedOccupancy), threshold: 0.98, severity: 'critical',
      reason: `床位使用率 ${(raw.bedOccupancy * 100).toFixed(0)}%，超负荷运转，存在安全隐患`,
      suggestedAction: '加快出院流程、推行日间手术与预住院评估，必要时加床审批' });
  } else if (raw.bedOccupancy < 0.8) {
    push({ domain: 'inpatient', metricKey: 'bedOccupancy', metricLabel: '床位使用率', unit: '',
      value: round3(raw.bedOccupancy), threshold: 0.8, severity: 'warning',
      reason: `床位使用率 ${(raw.bedOccupancy * 100).toFixed(0)}%，低于 80%，床位闲置`,
      suggestedAction: '分析病种结构与转诊来源，加强医联体下转与床位调度' });
  }
  if (raw.avgLOS > 12) {
    push({ domain: 'inpatient', metricKey: 'avgLOS', metricLabel: '平均住院日', unit: '天',
      value: round2(raw.avgLOS), threshold: 12, severity: 'critical',
      reason: `平均住院日 ${raw.avgLOS.toFixed(1)} 天，超 12 天红线，周转效率低`,
      suggestedAction: '开展临床路径管理与术前等待压缩，建立平均住院日科主任考核' });
  } else if (raw.avgLOS > 10) {
    push({ domain: 'inpatient', metricKey: 'avgLOS', metricLabel: '平均住院日', unit: '天',
      value: round2(raw.avgLOS), threshold: 10, severity: 'warning',
      reason: `平均住院日 ${raw.avgLOS.toFixed(1)} 天，超过 10 天关注线`,
      suggestedAction: '梳理检查预约与出院结算堵点' });
  }

  // 手术
  if (derived.highLevelRatio < 0.25) {
    push({ domain: 'surgery', metricKey: 'highLevelRatio', metricLabel: '三四级手术占比', unit: '',
      value: round3(derived.highLevelRatio), threshold: 0.25, severity: 'warning',
      reason: `三四级手术占比仅 ${(derived.highLevelRatio * 100).toFixed(0)}%，疑难重症能力不足`,
      suggestedAction: '优化手术分级授权与亚专科建设，推进日间手术与四级手术提质' });
  }
  if (raw.surgeryWaitHours > 48) {
    push({ domain: 'surgery', metricKey: 'surgeryWaitHours', metricLabel: '手术等待时间', unit: '小时',
      value: round2(raw.surgeryWaitHours), threshold: 48, severity: 'critical',
      reason: `手术等待 ${raw.surgeryWaitHours.toFixed(0)} 小时，超 48 小时红线`,
      suggestedAction: '复盘手术排程与接台衔接，增加手术间与麻醉人力弹性' });
  } else if (raw.surgeryWaitHours > 36) {
    push({ domain: 'surgery', metricKey: 'surgeryWaitHours', metricLabel: '手术等待时间', unit: '小时',
      value: round2(raw.surgeryWaitHours), threshold: 36, severity: 'warning',
      reason: `手术等待 ${raw.surgeryWaitHours.toFixed(0)} 小时，超 36 小时关注线`,
      suggestedAction: '优化术前核查与耗材到位时点' });
  }
  if (raw.pacuTurnover < 3) {
    push({ domain: 'surgery', metricKey: 'pacuTurnover', metricLabel: 'PACU 周转率', unit: '台/床日',
      value: round2(raw.pacuTurnover), threshold: 3, severity: 'warning',
      reason: `PACU 周转率 ${raw.pacuTurnover.toFixed(1)} 台/床日，恢复室周转偏慢`,
      suggestedAction: '优化 PACU 床位与麻醉恢复评估流程' });
  }

  // 财务
  if (derived.profitMargin < 0) {
    push({ domain: 'finance', metricKey: 'profitMargin', metricLabel: '利润率', unit: '',
      value: round3(derived.profitMargin), threshold: 0, severity: 'critical',
      reason: `利润率 ${(derived.profitMargin * 100).toFixed(1)}%，科室亏损`,
      suggestedAction: '开展病种成本核算，优化收入结构与耗材管控' });
  }
  if (raw.insuranceDenialRate > 0.03) {
    push({ domain: 'finance', metricKey: 'insuranceDenialRate', metricLabel: '医保拒付率', unit: '',
      value: round3(raw.insuranceDenialRate), threshold: 0.03, severity: 'critical',
      reason: `医保拒付率 ${(raw.insuranceDenialRate * 100).toFixed(1)}%，超 3% 红线`,
      suggestedAction: '复盘拒付病历，加强病案首页与医保目录匹配审核' });
  } else if (raw.insuranceDenialRate > 0.02) {
    push({ domain: 'finance', metricKey: 'insuranceDenialRate', metricLabel: '医保拒付率', unit: '',
      value: round3(raw.insuranceDenialRate), threshold: 0.02, severity: 'warning',
      reason: `医保拒付率 ${(raw.insuranceDenialRate * 100).toFixed(1)}%，超 2% 关注线`,
      suggestedAction: '建立医保智能预审前置' });
  }
  if (raw.drgSurplus < -50000) {
    push({ domain: 'finance', metricKey: 'drgSurplus', metricLabel: 'DRG 结余', unit: '元',
      value: round2(raw.drgSurplus), threshold: -50000, severity: 'critical',
      reason: `DRG 超支 ${wan(-raw.drgSurplus)} 万元，病组成本失控`,
      suggestedAction: '分析超支病组路径，规范临床路径与高值耗材使用' });
  }

  const criticalCount = list.filter((b) => b.severity === 'critical').length;
  // topBottleneck：critical 优先，按影响最直接的（critical 中第一条）
  const topBottleneck = list.find((b) => b.severity === 'critical') ?? list[0] ?? null;
  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    bottlenecks: list,
    criticalCount,
    warningCount: list.length - criticalCount,
    topBottleneck,
  };
}

/** 元 → 万元（本地小工具，避免每个调用点重复除） */
function wan(v: number): string {
  return (v / 10000).toFixed(1);
}
