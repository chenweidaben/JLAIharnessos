/**
 * 健澜科技 jlmedaios - M127-D 医院运营趋势分析聚合器（管理驾驶舱，纯函数）
 *
 * 「管理驾驶舱」：面向院领导层的运营趋势总览，覆盖四条分析主线——
 *   1. 门诊量增长趋势：按月聚合门诊/住院量，计算环比与平均月增速，判定上升/下滑通道；
 *   2. 疾病谱变化：按病种统计占比，并与上一周期对比得出变化率；
 *   3. 患者来源分析：按来源地统计结构占比，识别辐射范围变化；
 *   4. 资源需求预测：基于历史门诊量线性外推下月门诊量，并给出预测区间。
 *
 * 本模块全部为无副作用纯函数，不触库、不读环境变量，便于单测；
 * 数据采集与鉴权由路由层（routes/adminTrends.ts）负责。
 *
 * 生产约束：
 *   - 预测一律标注「基于历史数据估算」，不构成经营承诺；
 *   - 所有入参不被修改（内部先克隆再聚合）；
 *   - 除零、空序列、样本不足等边界均保守降级，不产生 Infinity / NaN。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 「管理驾驶舱」预测统一免责标注 */
export const PREDICTION_NOTE = '基于历史数据估算' as const;

/** 按月聚合的运营量采样点 */
export interface MonthlyVolumePoint {
  /** 月份，格式 yyyy-mm */
  month: string;
  /** 当月门诊量（人次） */
  outpatientVisits: number;
  /** 当月住院量（人次） */
  inpatientAdmissions: number;
}

/** 病种条目 */
export interface DiseaseEntry {
  /** 病种名称 */
  name: string;
  /** 当期例数 */
  count: number;
  /** 上一周期例数（用于计算变化率；缺省则不对比） */
  previousCount?: number;
}

/** 患者来源条目 */
export interface PatientSourceEntry {
  /** 来源名称（本市 / 本省外市 / 外省 等） */
  name: string;
  /** 来源患者数 */
  count: number;
}

/** 路由层采集后传入本聚合器的原始数据 */
export interface HospitalTrendInput {
  /** 按月运营量序列（可乱序，内部按月份升序重排） */
  volumes: MonthlyVolumePoint[];
  /** 病种分布 */
  diseases: DiseaseEntry[];
  /** 患者来源分布 */
  sources: PatientSourceEntry[];
}

/** 趋势方向 */
export type TrendDirection = 'up' | 'down' | 'flat';

/** 门诊量趋势段 */
export interface VolumeTrend {
  /** 月份序列（升序） */
  months: string[];
  /** 门诊量序列（与 months 对齐） */
  outpatient: number[];
  /** 住院量序列（与 months 对齐） */
  inpatient: number[];
  /** 最近一月环比增速（%）；样本不足为 null */
  latestMomGrowthPct: number | null;
  /** 平均月环比增速（%） */
  avgMonthlyGrowthPct: number;
  /** 趋势方向判定 */
  direction: TrendDirection;
}

/** 病种谱条目（含占比与变化率） */
export interface DiseaseSpectrumItem {
  name: string;
  count: number;
  /** 占当期病种总量百分比 */
  sharePct: number;
  /** 较上一周期变化率（%）；无对比数据为 null */
  changePct: number | null;
}

/** 患者来源条目（含占比） */
export interface PatientSourceItem {
  name: string;
  count: number;
  sharePct: number;
}

/** 下月门诊量预测结果 */
export interface VolumePrediction {
  /** 预测目标月份 yyyy-mm；无历史数据为 null */
  nextMonth: string | null;
  /** 预测门诊量（取整） */
  predictedOutpatient: number;
  /** 预测区间下限 */
  lowerBound: number;
  /** 预测区间上限 */
  upperBound: number;
  /** 月均增量（线性回归斜率，人次/月） */
  monthlySlope: number;
  /** 预测免责标注 */
  note: typeof PREDICTION_NOTE;
}

/** buildHospitalTrendAnalysis 主产出 */
export interface TrendAnalysis {
  /** 时间范围描述（如 近6个月） */
  timeRange: string;
  /** 门诊/住院量增长趋势 */
  volumeTrend: VolumeTrend;
  /** 疾病谱（按例数降序） */
  diseaseSpectrum: DiseaseSpectrumItem[];
  /** 患者来源（按患者数降序） */
  patientSources: PatientSourceItem[];
  /** 下月资源需求（门诊量）预测 */
  prediction: VolumePrediction;
}

/** 趋势方向判定阈值：平均月增速绝对值超过该值（%）才判上升/下滑 */
const DIRECTION_THRESHOLD_PCT = 2;

/** 四舍五入到 2 位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 样本均值；空序列返回 0 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** 总体标准差；样本不足两点返回 0 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - mu) ** 2, 0) / values.length);
}

/**
 * 由月份 yyyy-mm 推出下一个月（yyyy-mm）。
 *
 * @param month 当前月份，格式 yyyy-mm
 * @returns 下一个月
 */
export function nextMonthOf(month: string): string {
  const [y, m] = month.split('-').map((p) => Number(p));
  let year = y;
  let mon = m + 1;
  if (mon > 12) {
    mon = 1;
    year += 1;
  }
  return `${year}-${String(mon).padStart(2, '0')}`;
}

/**
 * 下月门诊量预测：以历史门诊量序列做最小二乘线性外推。
 *
 * 口径：
 *   - x 取 0..n-1 的序列下标，拟合 y = a + b*x；
 *   - 预测值取拟合线在 x=n 处的取值（较「末值+斜率」更稳健）；
 *   - 预测区间取 ±1.5 倍拟合残差标准差，下限不低于 0；
 *   - 样本不足两点时退化为「末值 + ±10%」的保守区间，斜率记 0。
 *
 * @param currentTrend 历史门诊量序列（按月份升序）
 * @returns 预测结果（始终携带「基于历史数据估算」标注）
 */
export function predictNextMonthVolume(currentTrend: number[]): VolumePrediction {
  const values = currentTrend.filter((v) => Number.isFinite(v) && v >= 0);
  const fallback = (pred: number, slope: number, nextMonth: string | null): VolumePrediction => {
    const band = Math.max(Math.abs(pred) * 0.1, 10);
    return {
      nextMonth,
      predictedOutpatient: Math.round(pred),
      lowerBound: Math.round(Math.max(pred - band, 0)),
      upperBound: Math.round(pred + band),
      monthlySlope: round2(slope),
      note: PREDICTION_NOTE,
    };
  };

  if (values.length === 0) {
    return fallback(0, 0, null);
  }

  const n = values.length;
  if (n < 2) {
    return fallback(values[values.length - 1], 0, null);
  }

  // 最小二乘斜率
  const xMean = mean(Array.from({ length: n }, (_, i) => i));
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den > 1e-9 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  // 拟合残差标准差
  const residuals = values.map((v, i) => v - (intercept + slope * i));
  const residStd = stdDev(residuals);

  const predicted = intercept + slope * n;
  const band = Math.max(residStd * 1.5, Math.abs(predicted) * 0.05);

  return {
    nextMonth: null, // 具体月份由主入口结合最后一个历史月份补全
    predictedOutpatient: Math.max(Math.round(predicted), 0),
    lowerBound: Math.max(Math.round(predicted - band), 0),
    upperBound: Math.round(predicted + band),
    monthlySlope: round2(slope),
    note: PREDICTION_NOTE,
  };
}

/**
 * 医院运营趋势分析主入口（管理驾驶舱）。
 *
 * @param timeRange 时间范围描述，如「近6个月」
 * @param data      原始运营数据（月度量 / 病种 / 来源）
 * @returns 聚合后的趋势分析结果
 */
export function buildHospitalTrendAnalysis(
  timeRange: string,
  data: HospitalTrendInput,
): TrendAnalysis {
  // 1) 门诊量增长趋势（先按月份升序，不修改入参）
  const volumes = [...(data.volumes ?? [])].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
  const months = volumes.map((p) => p.month);
  const outpatient = volumes.map((p) => Math.max(0, Math.round(p.outpatientVisits)));
  const inpatient = volumes.map((p) => Math.max(0, Math.round(p.inpatientAdmissions)));

  // 逐期环比增速
  const momRates: number[] = [];
  for (let i = 1; i < outpatient.length; i += 1) {
    const prev = outpatient[i - 1];
    if (prev > 0) momRates.push(((outpatient[i] - prev) / prev) * 100);
  }
  const latestMomGrowthPct =
    momRates.length > 0 ? round2(momRates[momRates.length - 1]) : null;
  const avgMonthlyGrowthPct = round2(mean(momRates));
  const direction: TrendDirection =
    avgMonthlyGrowthPct > DIRECTION_THRESHOLD_PCT
      ? 'up'
      : avgMonthlyGrowthPct < -DIRECTION_THRESHOLD_PCT
        ? 'down'
        : 'flat';

  // 2) 疾病谱变化
  const diseaseTotal = (data.diseases ?? []).reduce((s, d) => s + Math.max(0, d.count), 0);
  const diseaseSpectrum: DiseaseSpectrumItem[] = (data.diseases ?? [])
    .map((d) => {
      const count = Math.max(0, Math.round(d.count));
      const sharePct = diseaseTotal > 0 ? round2((count / diseaseTotal) * 100) : 0;
      let changePct: number | null = null;
      if (typeof d.previousCount === 'number' && d.previousCount > 0) {
        changePct = round2(((count - d.previousCount) / d.previousCount) * 100);
      }
      return { name: d.name, count, sharePct, changePct };
    })
    .sort((a, b) => b.count - a.count);

  // 3) 患者来源分析
  const sourceTotal = (data.sources ?? []).reduce((s, p) => s + Math.max(0, p.count), 0);
  const patientSources: PatientSourceItem[] = (data.sources ?? [])
    .map((p) => {
      const count = Math.max(0, Math.round(p.count));
      return {
        name: p.name,
        count,
        sharePct: sourceTotal > 0 ? round2((count / sourceTotal) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 4) 资源需求预测（基于门诊量序列）
  const prediction = predictNextMonthVolume(outpatient);
  if (months.length > 0) {
    prediction.nextMonth = nextMonthOf(months[months.length - 1]);
  }

  return {
    timeRange,
    volumeTrend: {
      months,
      outpatient,
      inpatient,
      latestMomGrowthPct,
      avgMonthlyGrowthPct,
      direction,
    },
    diseaseSpectrum,
    patientSources,
    prediction,
  };
}
