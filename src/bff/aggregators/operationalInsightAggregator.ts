/**
 * 健澜科技 jlmedaios - 管理驾驶舱运营规律洞察聚合器（纯函数）
 *
 * 依据宪法第四章：「越用越懂运营规律」——在运营指标时间序列之上，
 * 由纯函数识别三类洞察，产出 AI 异常卡片：
 *   - anomaly     异常点：当前读数偏离历史均值 ±2σ 控制带（detectAnomaly）；
 *   - seasonality 周期规律：按星期分组，同星期几的值显著聚簇（周末效应/高峰）；
 *   - trend       趋势：历史序列线性回归斜率显著，进入上升/下滑通道。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/operationalInsight.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 历史采样点：一个指标在某自然日的读数 */
export interface MetricPoint {
  /** 采样日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 当日指标值 */
  value: number;
}

/** 当前指标读数（待与历史对比的最新一日） */
export interface CurrentMetric {
  /** 指标名，如 outpatient_visits / bed_occupancy / avg_wait_minutes */
  metricName: string;
  /** 当前读数所属日期，ISO 格式 yyyy-mm-dd */
  date: string;
  /** 当前读数 */
  value: number;
}

/** 洞察卡片类型 */
export type InsightKind = 'anomaly' | 'seasonality' | 'trend';

/** buildOperationalInsight 产出的单张洞察卡片（与 medmuse.operational_insight 字段对齐） */
export interface OperationalInsight {
  /** 指标名 */
  metricName: string;
  /** 洞察类型：异常点 / 周期规律 / 趋势 */
  kind: InsightKind;
  /** 洞察日期（当前读数日期） */
  insightDate: string;
  /** 当前读数 */
  currentValue: number;
  /** 预期值（历史均值 / 同星期几均值 / 趋势外推值） */
  expectedValue: number;
  /** 偏差百分比，相对 expectedValue 的百分比偏差，保留 2 位小数 */
  deviationPct: number;
  /** AI 解读文案 */
  aiAnalysis: string;
  /** 建议动作文案 */
  suggestedAction: string;
}

/** 2σ 控制带阈值：末点落在 μ±2σ 之外即判异常 */
export const ANOMALY_SIGMA_THRESHOLD = 2;
/** 周期规律判定：组内方差占整体方差之比低于该阈值，视为存在星期周期性 */
export const SEASONALITY_WITHIN_VAR_RATIO = 0.5;
/** 趋势判定：斜率相对均值的绝对值超过该比例，视为显著趋势通道 */
export const TREND_SLOPE_REL = 0.01;
/** 周期/趋势判定所需的最小历史样本数 */
export const MIN_HISTORY_FOR_SEASONALITY = 14;
export const MIN_HISTORY_FOR_TREND = 7;

/**
 * 计算样本均值。空序列返回 0（调用方应在样本不足时提前短路）。
 *
 * @param values 数值序列
 * @returns 算术平均值
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/**
 * 计算总体标准差（σ）。样本不足两点时返回 0。
 *
 * @param values 数值序列
 * @returns 总体标准差
 */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  const acc = values.reduce((s, v) => s + (v - mu) * (v - mu), 0);
  return Math.sqrt(acc / values.length);
}

/**
 * 计算相对偏差百分比：(current - expected) / expected * 100。
 *
 * 口径：以预期值为基准的百分比偏差，正数表示偏高、负数表示偏低，
 * 保留 2 位小数。预期值为 0 或缺失时返回 0——避免除零产生 Infinity，
 * 此类指标不做百分比偏差解读，由调用方按绝对差另行展示。
 *
 * @param current  当前读数
 * @param expected 预期值
 * @returns 偏差百分比（如 +12.5 表示偏高 12.5%）
 */
export function computeDeviation(current: number, expected: number): number {
  if (!Number.isFinite(expected) || Math.abs(expected) < 1e-9) return 0;
  const pct = ((current - expected) / expected) * 100;
  return Math.round(pct * 100) / 100;
}

/**
 * 2σ 异常检测：判定序列末点是否偏离其前序样本均值 ±2σ 控制带。
 *
 * 口径：以序列前 n-1 个点估计 μ 与 σ（末点本身不参与估计，
 * 否则异常点会把均值/方差一起拉偏，漏检）；n<3 或 σ≈0（序列几乎恒值）
 * 时不判异常，避免冷启动与恒定指标误报。
 *
 * @param series 按时间升序的指标数值序列（末点为待判定读数）
 * @returns 末点落在 μ±2σ 之外返回 true，否则 false
 */
export function detectAnomaly(series: number[]): boolean {
  if (series.length < 3) return false;
  const history = series.slice(0, -1);
  const mu = mean(history);
  const sigma = stdDev(history);
  if (!(sigma > 1e-9)) return false;
  const last = series[series.length - 1];
  return Math.abs(last - mu) > ANOMALY_SIGMA_THRESHOLD * sigma;
}

/**
 * 取某日期对应的星期几（0=周日 … 6=周六）。
 *
 * @param isoDate yyyy-mm-dd
 * @returns 星期序号
 */
function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/**
 * 线性回归斜率（最小二乘，x 为序列下标）。
 *
 * @param values 历史数值序列
 * @returns 每日斜率；样本不足两点返回 0
 */
export function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  if (!(den > 1e-12)) return 0;
  return num / den;
}

/**
 * 运营规律洞察主入口：由历史序列与当前读数产出洞察卡片列表。
 *
 * 产出规则（按优先级，可同时多张卡片）：
 *   1. anomaly：detectAnomaly([...历史, 当前]) 命中时，以历史均值为预期值；
 *   2. seasonality：存在星期周期性时，以同星期几历史均值为周期预期值；
 *   3. trend：历史斜率相对均值超过阈值时，以「历史末值 + 斜率」外推为趋势预期值。
 *
 * 全部数值经 computeDeviation 折算为百分比偏差；不修改入参。
 *
 * @param history 历史采样点（按日期升序，至少覆盖当前日之前的采样）
 * @param current 当前指标读数
 * @returns 洞察卡片数组（无显著洞察时为空数组）
 */
export function buildOperationalInsight(
  history: MetricPoint[],
  current: CurrentMetric,
): OperationalInsight[] {
  const insights: OperationalInsight[] = [];
  const values = history.map((p) => p.value);
  const histMean = mean(values);

  // 1) 异常点：末点（当前读数）是否偏离历史均值 ±2σ
  if (detectAnomaly([...values, current.value])) {
    const deviation = computeDeviation(current.value, histMean);
    const direction = deviation >= 0 ? '偏高' : '偏低';
    insights.push({
      metricName: current.metricName,
      kind: 'anomaly',
      insightDate: current.date,
      currentValue: current.value,
      expectedValue: Math.round(histMean * 100) / 100,
      deviationPct: deviation,
      aiAnalysis: `指标「${current.metricName}」当前 ${current.value}，${direction}历史均值 ${Math.round(histMean * 100) / 100} 达 ${deviation}%，超出 ±2σ 控制带，疑似异常波动。`,
      suggestedAction: '建议运营核查当日排班、就诊结构与突发事件，48 小时内复盘确认后再决策。',
    });
  }

  // 2) 周期规律：同星期几聚簇
  if (history.length >= MIN_HISTORY_FOR_SEASONALITY) {
    const groups = new Map<number, number[]>();
    for (const p of history) {
      const wd = weekdayOf(p.date);
      const arr = groups.get(wd) ?? [];
      arr.push(p.value);
      groups.set(wd, arr);
    }
    const overallVar = stdDev(values) ** 2;
    if (overallVar > 1e-9) {
      let withinVarSum = 0;
      for (const arr of groups.values()) {
        const groupMean = mean(arr);
        withinVarSum += arr.reduce((s, v) => s + (v - groupMean) ** 2, 0);
      }
      const withinRatio = withinVarSum / values.length / overallVar;
      if (withinRatio < SEASONALITY_WITHIN_VAR_RATIO) {
        const targetWd = weekdayOf(current.date);
        const sameDay = groups.get(targetWd) ?? [];
        if (sameDay.length >= 1) {
          const seasonalExpected = mean(sameDay);
          const deviation = computeDeviation(current.value, seasonalExpected);
          insights.push({
            metricName: current.metricName,
            kind: 'seasonality',
            insightDate: current.date,
            currentValue: current.value,
            expectedValue: Math.round(seasonalExpected * 100) / 100,
            deviationPct: deviation,
            aiAnalysis: `指标「${current.metricName}」存在星期周期性：过去 ${sameDay.length} 个同星期几的均值为 ${Math.round(seasonalExpected * 100) / 100}，组内波动仅占整体波动的 ${Math.round(withinRatio * 100)}%。`,
            suggestedAction: '排班/物资请按星期几的历史规律滚动安排，勿按工作日均值一刀切。',
          });
        }
      }
    }
  }

  // 3) 趋势通道：斜率相对均值显著
  if (history.length >= MIN_HISTORY_FOR_TREND && histMean > 1e-9) {
    const slope = trendSlope(values);
    const relSlope = Math.abs(slope / histMean);
    if (relSlope > TREND_SLOPE_REL) {
      const lastHist = values[values.length - 1];
      const trendExpected = lastHist + slope;
      const deviation = computeDeviation(current.value, trendExpected);
      const dirText = slope > 0 ? '上升通道' : '下滑通道';
      insights.push({
        metricName: current.metricName,
        kind: 'trend',
        insightDate: current.date,
        currentValue: current.value,
        expectedValue: Math.round(trendExpected * 100) / 100,
        deviationPct: deviation,
        aiAnalysis: `指标「${current.metricName}」进入${dirText}：近 ${history.length} 天日均斜率 ${Math.round(slope * 100) / 100}（约均值的 ${Math.round(relSlope * 100)}%/天），趋势外推预期 ${Math.round(trendExpected * 100) / 100}。`,
        suggestedAction: '建议运营关注趋势走向，提前储备/压缩对应资源，避免趋势惯性触线。',
      });
    }
  }

  return insights;
}
