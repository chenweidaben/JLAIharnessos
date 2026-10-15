/**
 * 健澜科技 jlmedaios - 护理敏感质量指标（NQI）月度趋势聚合器
 *
 * 汇总四类护理敏感结局指标的月度趋势：
 *   - 跌倒发生率（fall）
 *   - 住院患者压疮发生率（pressureUlcer）
 *   - 管路滑脱发生率（tubeDislodgement）
 *   - 给药错误发生率（medError）
 *
 * 口径统一为「每千住院床日发生例数（‰）」，分母为当月住院床日 patientDays。
 * 本模块职责：纯函数 buildNqiTrend 负责汇总/排序/算率；listView 提供离线演示数据
 * （demo: true），供前端在数据库未就绪时仍可渲染看板。AI 不直接修改原始事件，
 * 此处仅做统计聚合。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 四类护理敏感指标键 */
export type NqiIndicatorKey = 'fall' | 'pressureUlcer' | 'tubeDislodgement' | 'medError';

/** 单个月份的原始统计行（由上层从事件明细/字典汇总而来） */
export interface NqiMonthRow {
  /** 月份，格式 YYYY-MM */
  month: string;
  /** 跌倒发生例数 */
  fall: number;
  /** 压疮发生例数 */
  pressureUlcer: number;
  /** 管路滑脱发生例数 */
  tubeDislodgement: number;
  /** 给药错误发生例数 */
  medError: number;
  /** 当月住院床日数（分母） */
  patientDays: number;
}

/** 单个指标的月度趋势点 */
export interface NqiTrendPoint {
  month: string;
  /** 当月发生例数 */
  events: number;
  /** 当月发生率（‰，每千住院床日） */
  rate: number;
}

/** 单个指标的汇总卡片数据 */
export interface NqiIndicatorSummary {
  key: NqiIndicatorKey;
  /** 中文名称 */
  name: string;
  /** 统计单位（‰） */
  unit: string;
  /** 统计区间内累计发生例数 */
  totalEvents: number;
  /** 最近一个月发生率（‰） */
  latestRate: number;
  /** 区间平均发生率（‰） */
  avgRate: number;
  /** 逐月趋势（月份升序） */
  trend: NqiTrendPoint[];
}

/** buildNqiTrend 的输出（即看板卡片 + 折线图所需数据） */
export interface NqiTrendResult {
  /** 全部月份升序（YYYY-MM），供折线图 x 轴 */
  months: string[];
  /** 四类指标汇总（固定顺序：跌倒/压疮/管路滑脱/给药错误） */
  indicators: NqiIndicatorSummary[];
  /** 是否为离线演示数据 */
  demo: boolean;
}

interface IndicatorMeta {
  key: NqiIndicatorKey;
  name: string;
}

/** 指标元数据（固定顺序 = 卡片渲染顺序） */
export const NQI_INDICATORS: IndicatorMeta[] = [
  { key: 'fall', name: '跌倒发生率' },
  { key: 'pressureUlcer', name: '压疮发生率' },
  { key: 'tubeDislodgement', name: '管路滑脱发生率' },
  { key: 'medError', name: '给药错误发生率' },
];

/** 四舍五入到两位小数（‰ 保留两位） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 计算某指标某月发生率（‰）；分母为 0/缺失时返回 0 */
function ratePerMille(events: number, patientDays: number): number {
  if (!patientDays || patientDays <= 0) return 0;
  return round2((events / patientDays) * 1000);
}

/**
 * 纯函数：将逐月原始行汇总为看板结果。
 * - 按月份升序排列；
 * - 每个指标生成逐月 trend（events + rate‰）；
 * - 卡片给出累计例数、最近月率、平均率。
 *
 * @param monthlyData 逐月原始行（可乱序、可空）
 * @param demo        是否标记为演示数据，默认 false
 */
export function buildNqiTrend(
  monthlyData: NqiMonthRow[],
  demo = false,
): NqiTrendResult {
  const rows = [...(monthlyData ?? [])].sort((a, b) =>
    a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
  );
  const months = rows.map((r) => r.month);

  const indicators: NqiIndicatorSummary[] = NQI_INDICATORS.map((meta) => {
    const trend: NqiTrendPoint[] = rows.map((r) => {
      const events = Number(r[meta.key]) || 0;
      return {
        month: r.month,
        events,
        rate: ratePerMille(events, Number(r.patientDays) || 0),
      };
    });

    const totalEvents = trend.reduce((s, p) => s + p.events, 0);
    const latestRate = trend.length ? trend[trend.length - 1].rate : 0;
    const avgRate = trend.length
      ? round2(trend.reduce((s, p) => s + p.rate, 0) / trend.length)
      : 0;

    return {
      key: meta.key,
      name: meta.name,
      unit: '‰',
      totalEvents,
      latestRate,
      avgRate,
      trend,
    };
  });

  return { months, indicators, demo };
}

/** 近 12 个月演示数据（2025-11 ~ 2026-10），发生率呈轻微下降趋势 */
const DEMO_MONTHLY: NqiMonthRow[] = [
  { month: '2025-11', fall: 6, pressureUlcer: 4, tubeDislodgement: 5, medError: 3, patientDays: 18200 },
  { month: '2025-12', fall: 7, pressureUlcer: 4, tubeDislodgement: 6, medError: 4, patientDays: 18600 },
  { month: '2026-01', fall: 5, pressureUlcer: 3, tubeDislodgement: 5, medError: 3, patientDays: 17900 },
  { month: '2026-02', fall: 5, pressureUlcer: 3, tubeDislodgement: 4, medError: 2, patientDays: 16800 },
  { month: '2026-03', fall: 4, pressureUlcer: 3, tubeDislodgement: 4, medError: 3, patientDays: 18400 },
  { month: '2026-04', fall: 4, pressureUlcer: 2, tubeDislodgement: 3, medError: 2, patientDays: 18100 },
  { month: '2026-05', fall: 3, pressureUlcer: 2, tubeDislodgement: 3, medError: 2, patientDays: 18700 },
  { month: '2026-06', fall: 3, pressureUlcer: 2, tubeDislodgement: 2, medError: 1, patientDays: 18300 },
  { month: '2026-07', fall: 2, pressureUlcer: 2, tubeDislodgement: 2, medError: 2, patientDays: 18900 },
  { month: '2026-08', fall: 2, pressureUlcer: 1, tubeDislodgement: 2, medError: 1, patientDays: 19100 },
  { month: '2026-09', fall: 2, pressureUlcer: 1, tubeDislodgement: 1, medError: 1, patientDays: 18500 },
  { month: '2026-10', fall: 1, pressureUlcer: 1, tubeDislodgement: 1, medError: 1, patientDays: 17600 },
];

/**
 * 演示视图：返回固定近 12 个月演示数据，demo 恒为 true。
 * 不依赖数据库/BFF 上下文，供前端在无真实数据时渲染。
 */
export function listView(): NqiTrendResult {
  return buildNqiTrend(DEMO_MONTHLY, true);
}
