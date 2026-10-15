/**
 * 健澜科技 jlmedaios - 医疗质量监控聚合器（M127-C，管理驾驶舱）
 *
 * 面向三级医院评审（三甲）核心质量指标，将各月原始计数归并为一页红绿灯总览 +
 * 趋势序列。本模块全部为纯函数：不读库、不发请求、不触碰 WebSocket，便于单测与复用。
 *
 * 六项指标（方向 + 评审常用目标值）：
 *  - 三级手术占比（%，越高越好）
 *  - 临床路径入径率（%，越高越好）
 *  - 抗菌药物使用强度（DDDs/100 人天，越低越好）
 *  - 院内感染发生率（%，越低越好）
 *  - 病历甲级率（%，越高越好）
 *  - 危急值报告及时率（%，越高越好）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 红绿灯结论 */
export type IndicatorLight = 'green' | 'yellow' | 'red';

/** 指标方向：higher=越高越好，lower=越低越好 */
export type IndicatorDirection = 'higher' | 'lower';

/** 指标键 */
export const INDICATOR_KEYS = [
  'level3SurgeryRatio',
  'pathwayEnrollRate',
  'antibioticIntensity',
  'infectionRate',
  'recordGradeARate',
  'criticalOnTimeRate',
] as const;
export type IndicatorKey = (typeof INDICATOR_KEYS)[number];

/** 单项指标目标（用于 judgeIndicator） */
export interface IndicatorTarget {
  /** 目标阈值 */
  value: number;
  /** 方向 */
  direction: IndicatorDirection;
  /** 黄灯容差：相对 target 的比例，默认 0.05（即目标值 ±5% 内为黄灯） */
  tolerance?: number;
}

/** 某一个月的原始计数输入 */
export interface QualityMonthPoint {
  /** 月份 YYYY-MM */
  month: string;
  /** 三级手术：当月手术总台次 / 其中三级手术台次 */
  surgeryTotal: number;
  surgeryLevel3: number;
  /** 临床路径：应入径人次 / 实际入径人次 */
  pathwayTotal: number;
  pathwayEnrolled: number;
  /** 抗菌药物：累计 DDDs / 同期住院人天 */
  antibioticDdd: number;
  patientDays: number;
  /** 院内感染：感染例数 / 出院人数 */
  infectionCases: number;
  dischargedCount: number;
  /** 病历：已评病历数 / 其中甲级病历数 */
  gradedTotal: number;
  recordGradeA: number;
  /** 危急值：危急值总次数 / 其中及时报告次数 */
  criticalTotal: number;
  criticalOnTime: number;
}

/** 单月输入 + 可选目标值覆盖（默认采用评审常用阈值） */
export interface QualityMonitorInput {
  points: QualityMonthPoint[];
  /** 覆盖默认目标值（仅传阈值，方向与单位不变） */
  targetOverrides?: Partial<Record<IndicatorKey, number>>;
}

/** 单个指标的展示卡片 */
export interface IndicatorCard {
  key: IndicatorKey;
  name: string;
  unit: string;
  direction: IndicatorDirection;
  /** 当前（最新月）实际值 */
  actual: number;
  /** 目标阈值 */
  target: number;
  /** 红绿灯 */
  light: IndicatorLight;
  /** 相对目标的偏差（actual - target，带符号，供前端展示） */
  deviation: number;
  /** 该指标逐月序列（与传入 points 同序） */
  series: Array<{ month: string; value: number }>;
}

/** 整页监控结论 */
export interface QualityMonitor {
  /** 红绿灯汇总计数 */
  counts: Record<IndicatorLight, number>;
  /** 整体灯：任一红=红，否则任一黄=黄，否则绿 */
  overall: IndicatorLight;
  /** 最新月份 */
  currentMonth: string | null;
  /** 六项指标卡片 */
  indicators: IndicatorCard[];
}

/** 安全相除：分母非正时返回 0 */
function safeRatio(numerator: number, denominator: number, scale = 100): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return (numerator / denominator) * scale;
}

/**
 * 判断单项指标红绿灯（纯函数）。
 *  - higher：actual >= target 绿；actual >= target*(1-tol) 黄；否则红。
 *  - lower： actual <= target 绿；actual <= target*(1+tol) 黄；否则红。
 */
export function judgeIndicator(actual: number, target: IndicatorTarget): IndicatorLight {
  if (!Number.isFinite(actual)) return 'red';
  const tol = target.tolerance ?? 0.05;
  const margin = Math.abs(target.value) * tol;
  if (target.direction === 'higher') {
    if (actual >= target.value) return 'green';
    if (actual >= target.value - margin) return 'yellow';
    return 'red';
  }
  // lower 越好
  if (actual <= target.value) return 'green';
  if (actual <= target.value + margin) return 'yellow';
  return 'red';
}

/** 指标元数据：名称 / 单位 / 方向 / 默认目标值（评审常用阈值） */
const INDICATOR_META: Record<
  IndicatorKey,
  { name: string; unit: string; direction: IndicatorDirection; defaultTarget: number }
> = {
  level3SurgeryRatio: { name: '三级手术占比', unit: '%', direction: 'higher', defaultTarget: 25 },
  pathwayEnrollRate: { name: '临床路径入径率', unit: '%', direction: 'higher', defaultTarget: 50 },
  antibioticIntensity: { name: '抗菌药物使用强度', unit: 'DDDs/100人天', direction: 'lower', defaultTarget: 40 },
  infectionRate: { name: '院内感染发生率', unit: '%', direction: 'lower', defaultTarget: 10 },
  recordGradeARate: { name: '病历甲级率', unit: '%', direction: 'higher', defaultTarget: 90 },
  criticalOnTimeRate: { name: '危急值报告及时率', unit: '%', direction: 'higher', defaultTarget: 95 },
};

/** 由单月原始计数计算六项实际值 */
function computePoint(p: QualityMonthPoint): Record<IndicatorKey, number> {
  return {
    level3SurgeryRatio: safeRatio(p.surgeryLevel3, p.surgeryTotal),
    pathwayEnrollRate: safeRatio(p.pathwayEnrolled, p.pathwayTotal),
    antibioticIntensity: safeRatio(p.antibioticDdd, p.patientDays),
    infectionRate: safeRatio(p.infectionCases, p.dischargedCount),
    recordGradeARate: safeRatio(p.recordGradeA, p.gradedTotal),
    criticalOnTimeRate: safeRatio(p.criticalOnTime, p.criticalTotal),
  };
}

/**
 * 构建医疗质量监控页（纯函数，管理驾驶舱）。
 * points 建议按月份升序传入；最新月取末位。
 */
export function buildMedicalQualityMonitor(data: QualityMonitorInput): QualityMonitor {
  const points = Array.isArray(data.points) ? data.points : [];
  const values = points.map(computePoint);

  const indicators: IndicatorCard[] = INDICATOR_KEYS.map((key) => {
    const meta = INDICATOR_META[key];
    const target = data.targetOverrides?.[key] ?? meta.defaultTarget;
    const series = values.map((v, i) => ({ month: points[i].month, value: round2(v[key]) }));
    const actual = values.length ? values[values.length - 1][key] : 0;
    const light = judgeIndicator(actual, { value: target, direction: meta.direction });
    return {
      key,
      name: meta.name,
      unit: meta.unit,
      direction: meta.direction,
      actual: round2(actual),
      target,
      light,
      deviation: round2(actual - target),
      series,
    };
  });

  const counts: Record<IndicatorLight, number> = { green: 0, yellow: 0, red: 0 };
  for (const ind of indicators) counts[ind.light] += 1;

  const overall: IndicatorLight = counts.red > 0 ? 'red' : counts.yellow > 0 ? 'yellow' : 'green';

  return {
    counts,
    overall,
    currentMonth: points.length ? points[points.length - 1].month : null,
    indicators,
  };
}

/** 保留两位小数，避免展示长尾浮点 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
