/**
 * 健澜科技 jlmedaios — 【质量与体验】医院运营分析深化聚合器（M180-B，纯函数）
 *
 * 运营分析要有数据，不能拍脑袋。本模块在 M172-C「单期效率评分」之上，补三件事：
 *
 *   - buildDeepOperationAnalysis：输出深度运营分析蓝图——门诊/住院/手术/财务四域指标
 *     目录、方向（越高越好/越低越好/区间最优）、以及趋势/对标/预测三类分析的口径；
 *   - analyzeOperationTrend：吃科室多期历史（period 升序），按最小二乘算斜率、首末
 *     变化率、变异系数，判定 上升/下降/平稳，并按 trendType 过滤；
 *   - benchmarkOperation：把科室当期指标逐项与标杆（全院均值/区域标杆）对照，按指标
 *     方向算差距与 领先/持平/落后 评级；
 *   - predictOperationTrend：对每个指标做线性回归，外推未来 days 期，给点预测值 +
 *     95% 置信区间 + 拟合优度 R²（置信度），数据不足时显式说明、不硬猜。
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

/** 科室引用：history 为多期历史快照（路由层从 ops_metric 聚合后传入） */
export interface DeptRef {
  deptCode: string;
  deptName: string;
  /** 多期历史：{ period: '2026-07', metrics: { outpatient_visits: 92000, ... } } */
  history?: PeriodMetricSnapshot[];
}

/** 单期指标快照：metric_key → 值 */
export interface PeriodMetricSnapshot {
  period: string;
  metrics: Record<string, number>;
}

/** 指标方向：越高越好 / 越低越好 / 区间最优 */
export type MetricDirection = 'higher_better' | 'lower_better' | 'band';

/** 一条指标的完整口径（与 medmuse.ops_metric.metric_key 对齐） */
export interface MetricSpec {
  key: string;
  name: string;
  unit: string;
  domain: OpsDomain;
  direction: MetricDirection;
  /** band 区间最优上下限（如床位使用率 0.85~0.93） */
  bandLow?: number;
  bandHigh?: number;
}

/** 四域指标目录（2000 床、日门诊 1 万三甲参考口径） */
export const OPS_METRIC_CATALOG: MetricSpec[] = [
  // 门诊运营
  { key: 'outpatient_visits', name: '门诊量', unit: '人次/期', domain: 'outpatient', direction: 'higher_better' },
  { key: 'avg_cost_per_visit', name: '次均费用', unit: '元/人次', domain: 'outpatient', direction: 'lower_better' },
  { key: 'avg_wait_minutes', name: '平均等待时间', unit: '分钟', domain: 'outpatient', direction: 'lower_better' },
  { key: 'appointment_rate', name: '预约率', unit: '0..1', domain: 'outpatient', direction: 'higher_better' },
  { key: 'no_show_rate', name: '爽约率', unit: '0..1', domain: 'outpatient', direction: 'lower_better' },
  // 住院运营
  { key: 'in_hospital', name: '平均在院人数', unit: '人', domain: 'inpatient', direction: 'higher_better' },
  { key: 'admissions', name: '入院人数', unit: '人/期', domain: 'inpatient', direction: 'higher_better' },
  { key: 'discharges', name: '出院人数', unit: '人/期', domain: 'inpatient', direction: 'higher_better' },
  { key: 'avg_los', name: '平均住院日', unit: '天', domain: 'inpatient', direction: 'lower_better' },
  { key: 'bed_occupancy', name: '床位使用率', unit: '0..1', domain: 'inpatient', direction: 'band', bandLow: 0.85, bandHigh: 0.93 },
  // 手术运营
  { key: 'surgery_count', name: '手术量', unit: '台/期', domain: 'surgery', direction: 'higher_better' },
  { key: 'high_level_surgery', name: '三四级手术量', unit: '台/期', domain: 'surgery', direction: 'higher_better' },
  { key: 'surgery_wait_hours', name: '手术等待时间', unit: '小时', domain: 'surgery', direction: 'lower_better' },
  { key: 'pacu_turnover', name: 'PACU 周转率', unit: '台/床日', domain: 'surgery', direction: 'higher_better' },
  // 财务运营
  { key: 'revenue', name: '收入', unit: '元/期', domain: 'finance', direction: 'higher_better' },
  { key: 'cost', name: '成本', unit: '元/期', domain: 'finance', direction: 'lower_better' },
  { key: 'profit', name: '利润', unit: '元/期', domain: 'finance', direction: 'higher_better' },
  { key: 'drg_surplus', name: 'DRG 结余', unit: '元/期', domain: 'finance', direction: 'higher_better' },
  { key: 'insurance_denial_rate', name: '医保拒付率', unit: '0..1', domain: 'finance', direction: 'lower_better' },
];

const SPEC_BY_KEY: Record<string, MetricSpec> = Object.fromEntries(
  OPS_METRIC_CATALOG.map((s) => [s.key, s]),
);

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/* ---------------------------------------------------------------------------
 * buildDeepOperationAnalysis：深度运营分析蓝图
 * ------------------------------------------------------------------------- */
export interface DeepOperationAnalysisBlueprint {
  principles: string[];
  domains: Array<{ key: OpsDomain; name: string; metrics: MetricSpec[] }>;
  analyses: Array<{ key: string; name: string; description: string }>;
}

/** 输出四域指标目录与三类分析口径，作为全院统一口径（不拍脑袋） */
export function buildDeepOperationAnalysis(): DeepOperationAnalysisBlueprint {
  const domains = (Object.keys(DOMAIN_LABEL) as OpsDomain[]).map((d) => ({
    key: d,
    name: DOMAIN_LABEL[d],
    metrics: OPS_METRIC_CATALOG.filter((m) => m.domain === d),
  }));
  return {
    principles: [
      '运营分析要有数据，不能拍脑袋',
      '指标按门诊/住院/手术/财务四域落库，按期可追溯、可复算',
      '趋势与预测基于多期历史外推，数据不足显式说明、不硬猜',
      '仅运营管理辅助，不触发诊疗、不自动改医嘱/结算',
    ],
    domains,
    analyses: [
      { key: 'trend', name: '运营趋势分析', description: '多期历史斜率/变化率/波动性，判定上升/下降/平稳' },
      { key: 'benchmark', name: '运营对标', description: '与全院标杆逐项对照，领先/持平/落后' },
      { key: 'forecast', name: '运营预测', description: '线性回归外推未来 N 期，给点预测 + 95% 置信区间' },
    ],
  };
}

/* ---------------------------------------------------------------------------
 * 通用统计：最小二乘线性拟合 y = a + b*x，返回斜率/截距/R²
 * ------------------------------------------------------------------------- */
interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}
function linearFit(values: number[]): LinearFit | null {
  const n = values.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += values[i]; sxy += i * values[i]; sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  // R²
  const meanY = sy / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    ssRes += (values[i] - pred) ** 2;
    ssTot += (values[i] - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : Math.max(0, Math.min(1, 1 - ssRes / ssTot));
  return { slope, intercept, r2 };
}

/** 变异系数 CV = stdev / |mean|（mean=0 返回 0） */
function cv(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

/* ---------------------------------------------------------------------------
 * analyzeOperationTrend：运营趋势分析
 * ------------------------------------------------------------------------- */
export type TrendType = 'up' | 'down' | 'flat' | 'all';

export interface TrendMetricPoint {
  period: string;
  value: number;
}
export interface TrendMetricResult {
  metricKey: string;
  metricName: string;
  domain: OpsDomain;
  unit: string;
  points: TrendMetricPoint[];       // 按时间升序
  slope: number;                    // 每期变化量
  changePct: number;                 // 首末变化率（小数）
  volatility: number;                // 变异系数
  trend: 'up' | 'down' | 'flat';
  directionLabel: string;            // 方向说明
  interpretation: string;            // 人话解读
}
export interface TrendReport {
  deptCode: string;
  deptName: string;
  period: string;
  trendType: TrendType;
  metricCount: number;
  metrics: TrendMetricResult[];
  summary: { up: number; down: number; flat: number };
}

const FLAT_EPS = 0.03; // 首末变化率绝对值 < 3% 视为平稳

function judgeTrend(changePct: number): 'up' | 'down' | 'flat' {
  if (Math.abs(changePct) < FLAT_EPS) return 'flat';
  return changePct > 0 ? 'up' : 'down';
}

/**
 * 运营趋势分析：dept.history 按 period 升序传入。
 * trendType: up/down/flat 过滤；all 返回全部指标。
 */
export function analyzeOperationTrend(
  dept: DeptRef,
  period: string,
  trendType: TrendType = 'all',
): TrendReport {
  const history = (dept.history ?? []).slice().sort((a, b) => a.period.localeCompare(b.period));
  const metrics: TrendMetricResult[] = [];

  for (const spec of OPS_METRIC_CATALOG) {
    const points: TrendMetricPoint[] = [];
    for (const snap of history) {
      const v = snap.metrics[spec.key];
      if (typeof v === 'number' && Number.isFinite(v)) points.push({ period: snap.period, value: v });
    }
    if (points.length < 2) continue; // 数据不足 2 期，不硬判趋势
    const values = points.map((p) => p.value);
    const fit = linearFit(values);
    const first = values[0];
    const last = values[values.length - 1];
    const changePct = first === 0 ? 0 : (last - first) / Math.abs(first);
    const trend = judgeTrend(changePct);
    const upLabel = spec.direction === 'higher_better' ? '向好' : spec.direction === 'lower_better' ? '承压' : '区间内波动';
    const interp = trend === 'flat'
      ? `${spec.name}近 ${points.length} 期基本持平（变化 ${(changePct * 100).toFixed(1)}%），属稳态运行`
      : `${spec.name}近 ${points.length} 期${trend === 'up' ? '上升' : '下降'} ${(Math.abs(changePct) * 100).toFixed(1)}%，按指标方向${upLabel}`;

    metrics.push({
      metricKey: spec.key,
      metricName: spec.name,
      domain: spec.domain,
      unit: spec.unit,
      points,
      slope: fit ? round2(fit.slope) : 0,
      changePct: round4(changePct),
      volatility: round4(cv(values)),
      trend,
      directionLabel: upLabel,
      interpretation: interp,
    });
  }

  const filtered = trendType === 'all' ? metrics : metrics.filter((m) => m.trend === trendType);
  const summary = {
    up: metrics.filter((m) => m.trend === 'up').length,
    down: metrics.filter((m) => m.trend === 'down').length,
    flat: metrics.filter((m) => m.trend === 'flat').length,
  };

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    period,
    trendType,
    metricCount: filtered.length,
    metrics: filtered,
    summary,
  };
}

/* ---------------------------------------------------------------------------
 * benchmarkOperation：运营对标
 * ------------------------------------------------------------------------- */
export type BenchmarkRating = 'leading' | 'on_par' | 'lagging';

/** 对标输入：科室当期值 vs 标杆值（record<metricKey, number>） */
export interface BenchmarkData {
  current: Record<string, number>;
  benchmark: Record<string, number>;
}
export interface BenchmarkItem {
  metricKey: string;
  metricName: string;
  domain: OpsDomain;
  unit: string;
  deptValue: number;
  benchmarkValue: number;
  gapPct: number;          // 相对标杆的偏离率（有方向）
  rating: BenchmarkRating;
  note: string;
}
export interface BenchmarkReport {
  deptCode: string;
  deptName: string;
  leadingCount: number;
  laggingCount: number;
  overallRating: BenchmarkRating;
  items: BenchmarkItem[];
}

const ON_PAR_EPS = 0.05; // ±5% 视为持平

/**
 * 运营对标：按指标方向计算「相对标杆的优劣」。
 * higher_better：值越高越好；lower_better：值越低越好；band：落区间内视为持平。
 */
export function benchmarkOperation(dept: DeptRef, benchmarkData: BenchmarkData): BenchmarkReport {
  const items: BenchmarkItem[] = [];
  for (const spec of OPS_METRIC_CATALOG) {
    const cur = benchmarkData.current[spec.key];
    const ben = benchmarkData.benchmark[spec.key];
    if (typeof cur !== 'number' || typeof ben !== 'number' || !Number.isFinite(cur) || !Number.isFinite(ben)) continue;
    if (ben === 0) continue;

    // 归一化偏离率：相对标杆差多少（带方向符号，正=优于标杆）
    let gapPct: number;
    let rating: BenchmarkRating;
    if (spec.direction === 'band') {
      const inBand = cur >= (spec.bandLow ?? -Infinity) && cur <= (spec.bandHigh ?? Infinity);
      gapPct = 0;
      rating = inBand ? 'on_par' : cur > (spec.bandHigh ?? Infinity) ? 'lagging' : 'lagging';
    } else {
      const rawGap = (cur - ben) / Math.abs(ben);
      gapPct = spec.direction === 'higher_better' ? rawGap : -rawGap;
      if (gapPct > ON_PAR_EPS) rating = 'leading';
      else if (gapPct < -ON_PAR_EPS) rating = 'lagging';
      else rating = 'on_par';
    }

    const note = rating === 'leading'
      ? `${spec.name}优于标杆 ${(Math.abs(gapPct) * 100).toFixed(1)}%`
      : rating === 'lagging'
        ? `${spec.name}落后标杆 ${(Math.abs(gapPct) * 100).toFixed(1)}%，需关注`
        : `${spec.name}与标杆基本持平`;

    items.push({
      metricKey: spec.key,
      metricName: spec.name,
      domain: spec.domain,
      unit: spec.unit,
      deptValue: round2(cur),
      benchmarkValue: round2(ben),
      gapPct: round4(gapPct),
      rating,
      note,
    });
  }

  const leadingCount = items.filter((i) => i.rating === 'leading').length;
  const laggingCount = items.filter((i) => i.rating === 'lagging').length;
  const overall: BenchmarkRating =
    leadingCount > laggingCount ? 'leading' : laggingCount > leadingCount ? 'lagging' : 'on_par';

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    leadingCount,
    laggingCount,
    overallRating: overall,
    items,
  };
}

/* ---------------------------------------------------------------------------
 * predictOperationTrend：运营预测（线性回归外推 + 95% 置信区间）
 * ------------------------------------------------------------------------- */
export interface ForecastPoint {
  horizon: number;       // 第 N 期（1 起）
  targetPeriod: string;  // 目标周期（按历史周期推算，月/季）
  value: number;
  lowerBound: number;
  upperBound: number;
}
export interface ForecastMetricResult {
  metricKey: string;
  metricName: string;
  domain: OpsDomain;
  unit: string;
  historyPoints: TrendMetricPoint[];
  confidence: number;     // R² 0..1
  method: string;
  forecasts: ForecastPoint[];
  note: string;
}
export interface ForecastReport {
  deptCode: string;
  deptName: string;
  anchorPeriod: string;
  days: number;
  metrics: ForecastMetricResult[];
  note: string;
}

/** 由历史 period 推断下一个 period（支持 YYYY-MM 与 YYYY-Qn） */
function nextPeriod(period: string, step: number): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1 + step;
    const ny = y + Math.floor(mo / 12);
    const nm = ((mo % 12) + 12) % 12 + 1;
    return `${ny}-${String(nm).padStart(2, '0')}`;
  }
  const q = period.match(/^(\d{4})-Q([1-4])$/);
  if (q) {
    const y = Number(q[1]);
    const qq = (Number(q[2]) - 1) + step;
    const ny = y + Math.floor(qq / 4);
    const nq = ((qq % 4) + 4) % 4 + 1;
    return `${ny}-Q${nq}`;
  }
  return `${period}+${step}`;
}

/**
 * 运营预测：对每个有 ≥3 期历史的指标做线性回归，外推未来 days 期。
 * days 为「期数」（月粒度即未来 N 个月）；不足 3 期的指标跳过并在 note 说明。
 */
export function predictOperationTrend(dept: DeptRef, period: string, days: number): ForecastReport {
  const history = (dept.history ?? []).slice().sort((a, b) => a.period.localeCompare(b.period));
  const safeDays = Math.max(1, Math.min(24, Math.floor(days) || 1));
  const metrics: ForecastMetricResult[] = [];
  const skipped: string[] = [];

  for (const spec of OPS_METRIC_CATALOG) {
    const points: TrendMetricPoint[] = [];
    for (const snap of history) {
      const v = snap.metrics[spec.key];
      if (typeof v === 'number' && Number.isFinite(v)) points.push({ period: snap.period, value: v });
    }
    if (points.length < 3) {
      skipped.push(spec.name);
      continue;
    }
    const values = points.map((p) => p.value);
    const fit = linearFit(values);
    if (!fit) {
      skipped.push(spec.name);
      continue;
    }
    // 残差标准差 → 95% 置信区间（近似 1.96 * se * sqrt(1 + 1/n)）
    const n = values.length;
    let ssRes = 0;
    for (let i = 0; i < n; i++) ssRes += (values[i] - (fit.intercept + fit.slope * i)) ** 2;
    const se = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;

    const meanX = (n - 1) / 2;
    let sxx = 0;
    for (let i = 0; i < n; i++) sxx += (i - meanX) ** 2;
    const lastIdx = n - 1;
    const forecasts: ForecastPoint[] = [];
    for (let h = 1; h <= safeDays; h++) {
      const x = lastIdx + h;
      const pred = fit.intercept + fit.slope * x;
      // 预测区间随外推距离（x 离 meanX 越远）略放宽
      const margin = sxx === 0
        ? 1.96 * se
        : 1.96 * se * Math.sqrt(1 + 1 / n + (x - meanX) ** 2 / sxx);
      forecasts.push({
        horizon: h,
        targetPeriod: nextPeriod(points[points.length - 1].period, h),
        value: round2(pred),
        lowerBound: round2(pred - margin),
        upperBound: round2(pred + margin),
      });
    }

    metrics.push({
      metricKey: spec.key,
      metricName: spec.name,
      domain: spec.domain,
      unit: spec.unit,
      historyPoints: points,
      confidence: round4(fit.r2),
      method: 'linear_regression',
      forecasts,
      note: fit.r2 >= 0.7
        ? `拟合优度 ${(fit.r2 * 100).toFixed(0)}%，预测趋势较可信`
        : fit.r2 >= 0.4
          ? `拟合优度 ${(fit.r2 * 100).toFixed(0)}%，趋势仅供参考`
          : `拟合优度 ${(fit.r2 * 100).toFixed(0)}%，历史波动大，预测不确定性高`,
    });
  }

  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    anchorPeriod: period,
    days: safeDays,
    metrics,
    note: skipped.length > 0
      ? `数据不足 3 期，跳过预测：${skipped.join('、')}`
      : `全部 ${metrics.length} 项指标均完成未来 ${safeDays} 期线性外推`,
  };
}
