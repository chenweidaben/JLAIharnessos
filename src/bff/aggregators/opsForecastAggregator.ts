/**
 * 健澜科技 jlmedaios — 【AI深化与运营预测】医院运营智能预测聚合器（纯函数）
 *
 * 依据宪法第四章「越用越懂运营规律」：在门诊量 / 床位负荷 / 手术量三类
 * 运营时间序列之上，由纯函数产出未来 N 天预测。方法（可解释、不拍脑袋）：
 *
 *   1) 移动平均去趋势：7 天中心化移动平均得到趋势项 trend[i]；
 *   2) 季节因子：按星期几（0=周日…6=周六）对「实际值/趋势项」求组内均值，
 *      再归一化到组均值=1，消除周内高峰/周末效应；
 *   3) 趋势外推：对趋势项做最小二乘线性回归（slope/intercept），向后外推；
 *   4) 点预测：forecast[k] = trend_proj(n+k) * seasonal[weekday(预测日)]；
 *   5) 置信区间：用样本内拟合残差 e[i] = y[i] - trend[i]*seasonal[w] 的
 *      样本标准差 s 构造 95% 预测区间 ±1.96·s·√(1 + k/n)（k 为预测步长，
 *      越远越宽——外推越久不确定性越大），下界截断为非负。
 *
 * 全部无副作用、不触库，便于单测；数据库读写由路由层负责。
 * 历史样本不足（< MIN_HISTORY_DAYS=14）时返回 degraded 空集，不编造数字。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 历史采样点：一个运营指标在某自然日的读数 */
export interface HistoryPoint {
  /** 采样日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 当日指标值（门诊人次 / 床位负荷 / 手术台次） */
  value: number;
}

/** 预测序列中的单日预测点（含 95% 置信区间） */
export interface ForecastPoint {
  /** 预测日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 点预测值 */
  value: number;
  /** 置信区间下界 */
  lower: number;
  /** 置信区间上界 */
  upper: number;
}

/** 预测结果 */
export interface ForecastResult {
  /** 指标名：outpatient_volume / bed_occupancy / surgery_volume */
  metric: string;
  /** 历史样本区间（无样本时为 null） */
  historyStart: string | null;
  historyEnd: string | null;
  /** 参与拟合的历史样本天数 */
  historyPoints: number;
  /** 未来 days 天的逐日预测点 */
  forecast: ForecastPoint[];
  /** 样本内残差标准差（区间宽度来源，可解释） */
  residualStd: number;
  /** 置信水平（固定 0.95） */
  confidenceLevel: number;
  /** 模型方法说明 */
  modelMethod: string;
  /** 降级标志：历史不足时 true，forecast 为空数组，不编造 */
  degraded: boolean;
}

/** 预测回测准确率（预测 vs 实际） */
export interface Accuracy {
  /** 配对样本数 */
  samples: number;
  /** 平均绝对误差 MAE */
  mae: number;
  /** 平均绝对百分比误差 MAPE（%），实际值为 0 的点不参与 */
  mape: number;
  /** 均方根误差 RMSE */
  rmse: number;
  /** 实际值落在预测置信区间内的比例（%） */
  withinIntervalPct: number;
}

/** 最小历史样本天数（两周）：少于此数不做预测，降级空集 */
export const MIN_HISTORY_DAYS = 14;
/** 移动平均窗口（7 天，覆盖一个完整周周期） */
export const MA_WINDOW = 7;
/** 95% 双侧正态分位数 z */
export const Z_95 = 1.96;

/**
 * 计算样本均值。空序列返回 0。
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, v) => a + v, 0) / values.length;
}

/**
 * 样本标准差（ddof=1）。样本不足 2 个返回 0。
 */
function sampleStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  const acc = values.reduce((s, v) => s + (v - mu) * (v - mu), 0);
  return Math.sqrt(acc / (values.length - 1));
}

/** ISO 日期（yyyy-mm-dd）加 n 天，返回 ISO 日期。 */
function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO 日期 → 星期几（0=周日…6=周六），与 Date.getUTCDay 一致。 */
function weekdayOf(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00Z').getUTCDay();
}

/** 数值四舍五入到指定小数位 */
function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/**
 * 核心预测：移动平均 + 星期季节因子 + 趋势线性外推 + 残差置信区间。
 *
 * @param metric  指标名（仅用于回填结果）
 * @param history 按日期升序的历史采样点；非有限值会被过滤
 * @param days    预测未来天数（<=0 返回空 forecast）
 * @param digits  输出保留小数位（人次/台次传 0，百分比传 1）
 */
function runForecast(metric: string, history: HistoryPoint[], days: number, digits: number): ForecastResult {
  const empty = (): ForecastResult => ({
    metric,
    historyStart: null,
    historyEnd: null,
    historyPoints: 0,
    forecast: [],
    residualStd: 0,
    confidenceLevel: 0.95,
    modelMethod: 'ma7+seasonal7d+lin_trend',
    degraded: true,
  });

  const clean = history
    .filter((p) => p && typeof p.date === 'string' && Number.isFinite(p.value))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (clean.length < MIN_HISTORY_DAYS || days <= 0) return empty();

  const n = clean.length;
  const dates = clean.map((p) => p.date);
  const y = clean.map((p) => Math.max(0, p.value));

  // 1) 中心化移动平均趋势（边界用截断窗口，避免两端断崖）
  const trend: number[] = new Array(n).fill(0);
  const half = Math.floor(MA_WINDOW / 2);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    trend[i] = mean(y.slice(lo, hi + 1));
  }

  // 2) 星期季节因子：ratio[i] = y[i]/trend[i]，按星期分组取均值后归一化
  const ratio: number[] = y.map((v, i) => (trend[i] > 1e-9 ? v / trend[i] : 1));
  const byWeekday: number[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < n; i++) byWeekday[weekdayOf(dates[i])].push(ratio[i]);
  const rawSf = byWeekday.map((arr) => (arr.length > 0 ? mean(arr) : 1));
  const sfMean = mean(rawSf) || 1;
  const seasonal = rawSf.map((s) => s / sfMean);

  // 3) 趋势项最小二乘线性外推：trend[i] = a + b*i
  const xs = trend.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(trend);
  let denom = 0;
  let numer = 0;
  for (let i = 0; i < n; i++) {
    denom += (xs[i] - xMean) * (xs[i] - xMean);
    numer += (xs[i] - xMean) * (trend[i] - yMean);
  }
  const slope = denom > 1e-9 ? numer / denom : 0;
  const intercept = yMean - slope * xMean;

  // 4) 样本内残差标准差（区间宽度来源）
  const residuals: number[] = [];
  for (let i = 0; i < n; i++) {
    const fitted = trend[i] * seasonal[weekdayOf(dates[i])];
    residuals.push(y[i] - fitted);
  }
  const s = sampleStd(residuals);

  // 5) 外推未来 days 天：步长 k=1..days，区间随步长膨胀 √(1+k/n)
  const lastDate = dates[n - 1];
  const forecast: ForecastPoint[] = [];
  for (let k = 1; k <= days; k++) {
    const projDate = addDays(lastDate, k);
    const projTrend = intercept + slope * (n - 1 + k);
    const point = Math.max(0, projTrend * seasonal[weekdayOf(projDate)]);
    const halfW = Z_95 * s * Math.sqrt(1 + k / n);
    forecast.push({
      date: projDate,
      value: round(point, digits),
      lower: round(Math.max(0, point - halfW), digits),
      upper: round(point + halfW, digits),
    });
  }

  return {
    metric,
    historyStart: dates[0],
    historyEnd: lastDate,
    historyPoints: n,
    forecast,
    residualStd: round(s, digits),
    confidenceLevel: 0.95,
    modelMethod: 'ma7+seasonal7d+lin_trend',
    degraded: false,
  };
}

/**
 * 门诊量预测（人次，整数）。
 *
 * @param history 逐日门诊量历史
 * @param days    预测天数
 */
export function forecastOutpatientVolume(history: HistoryPoint[], days: number): ForecastResult {
  return runForecast('outpatient_volume', history, days, 0);
}

/**
 * 床位负荷预测（在院/入院负荷，保留 1 位小数）。
 *
 * @param history 逐日床位负荷历史（如在院人次 / 占用率）
 * @param days    预测天数
 */
export function forecastBedOccupancy(history: HistoryPoint[], days: number): ForecastResult {
  return runForecast('bed_occupancy', history, days, 1);
}

/**
 * 手术量预测（台次，整数）。
 *
 * @param history 逐日手术台次历史
 * @param days    预测天数
 */
export function forecastSurgeryVolume(history: HistoryPoint[], days: number): ForecastResult {
  return runForecast('surgery_volume', history, days, 0);
}

/**
 * 预测回测准确率：把预测点与实际值按日期配对后计算 MAE / MAPE / RMSE / 区间命中率。
 *
 * @param forecast 预测点序列（含 lower/upper）
 * @param actual   同期实际值序列
 * @returns 准确率；无配对样本时返回 samples=0 的零值（调用方应视为不可用）
 */
export function calculateForecastAccuracy(forecast: ForecastPoint[], actual: HistoryPoint[]): Accuracy {
  const actualMap = new Map(actual.map((p) => [p.date, p.value]));
  const errs: number[] = [];
  const pcts: number[] = [];
  let within = 0;

  for (const f of forecast) {
    if (!actualMap.has(f.date)) continue;
    const a = actualMap.get(f.date) as number;
    if (!Number.isFinite(a)) continue;
    const err = a - f.value;
    errs.push(err);
    if (Math.abs(a) > 1e-9) pcts.push(Math.abs(err) / a);
    if (a >= f.lower && a <= f.upper) within += 1;
  }

  const samples = errs.length;
  if (samples === 0) {
    return { samples: 0, mae: 0, mape: 0, rmse: 0, withinIntervalPct: 0 };
  }
  const mae = mean(errs.map((e) => Math.abs(e)));
  const mse = mean(errs.map((e) => e * e));
  return {
    samples,
    mae: round(mae, 2),
    mape: round((mean(pcts) || 0) * 100, 2),
    rmse: round(Math.sqrt(mse), 2),
    withinIntervalPct: round((within / samples) * 100, 2),
  };
}
