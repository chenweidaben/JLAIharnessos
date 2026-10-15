/**
 * 健澜科技 jlmedaios - 学习引擎监控看板聚合器（纯函数）
 *
 * 在 M108 学习闭环（medmuse.ai_feedback_log）、可版本化推荐策略
 * （medmuse.recommendation_strategy）与患者画像（medmuse.patient_learning_profile）
 * 之上，做一张「学习引擎监控看板」：
 *   - adoptionRate        采纳率日趋势（医生对 AI 建议的采纳情况逐日曲线）；
 *   - weightDistribution   当前激活策略的权重分布（饼图口径）；
 *   - knowledgeGrowth      知识库累计增长曲线（知识资产沉淀节奏）；
 *   - patientProfileCoverage 患者学习画像覆盖率（已画像 / 引擎已触达患者）。
 *
 * 注释标注：看板指标与权限分级依据宪法第三章（国家机构民生保障与
 *           公共服务信息化职责）精神设计，不采集患者直接标识符。
 *
 * 本模块全部为无副作用纯函数，不触库、不修改入参，便于单测；
 * 数据库读写由路由层（routes/learningDashboard.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { adoptionRateOf, type TypeFeedbackCount } from './strategyEvolutionAggregator';

/** 反馈日志行（与 medmuse.ai_feedback_log 字段对齐，由路由层塑形） */
export interface FeedbackRow {
  /** 建议类型：diagnosis / drug / pathway / ... */
  suggestionType: string | null;
  /** 医生决策：adopted / modified / rejected */
  decision: string;
  /** 反馈时间（ISO 字符串，按本地日期归组） */
  createdAt: string;
}

/** 策略版本行（取激活版本的权重分布即可） */
export interface StrategyRow {
  /** 该版本对各建议类型的权重 */
  weights: Record<string, number>;
  /** 是否当前生效版本 */
  active: boolean;
}

/** 知识库新增条目（用于增长曲线） */
export interface KnowledgeEntry {
  /** 入库时间（ISO 字符串） */
  createdAt: string;
}

/** 画像覆盖率历史点（日期升序，最后一项为今日快照） */
export interface CoveragePoint {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 已画像患者数 */
  profiled: number;
  /** 引擎已触达患者总数（覆盖率分母） */
  total: number;
  /** 当日覆盖率 [0,1] */
  rate: number;
}

/** 知识库与画像状态（路由层从 knowledge.documents + patient_learning_profile 塑形） */
export interface KnowledgeState {
  /** 知识库新增条目列表 */
  entries: KnowledgeEntry[];
  /** 画像覆盖率每日序列（日期升序） */
  coverageSeries: CoveragePoint[];
}

/** 趋势对比结果：今日 vs 昨日 */
export interface Trend {
  /** 今日值 - 昨日值（绝对值） */
  delta: number;
  /** 环比变化率 [-1, +∞)，无昨日样本时为 0 */
  pctChange: number;
}

/** 采纳率趋势图数据 */
export interface AdoptionRateChart {
  /** 逐日采纳率序列（日期升序） */
  series: Array<{ date: string; rate: number }>;
  /** 最新一日采纳率 [0,1]，无样本为 0 */
  current: number;
  /** 今日 vs 昨日趋势 */
  trend: Trend;
}

/** 权重分布饼图分片 */
export interface WeightSlice {
  /** 建议类型 */
  type: string;
  /** 归一化权重 [0,1] */
  weight: number;
}

/** 权重分布图数据 */
export interface WeightDistributionChart {
  /** 按权重降序的分片列表 */
  slices: WeightSlice[];
}

/** 知识增长曲线图数据 */
export interface KnowledgeGrowthChart {
  /** 逐日累计条目数序列（日期升序） */
  series: Array<{ date: string; count: number }>;
  /** 知识条目总数 */
  total: number;
  /** 今日 vs 昨日（当日净增条目数口径） */
  trend: Trend;
}

/** 画像覆盖率图数据 */
export interface PatientProfileCoverageChart {
  /** 今日已画像患者数 */
  profiled: number;
  /** 今日触达患者总数 */
  total: number;
  /** 今日覆盖率 [0,1]，total=0 时为 0 */
  rate: number;
  /** 今日 vs 昨日覆盖率趋势 */
  trend: Trend;
}

/** 看板四张图的聚合结果 */
export interface LearningDashboard {
  adoptionRate: AdoptionRateChart;
  weightDistribution: WeightDistributionChart;
  knowledgeGrowth: KnowledgeGrowthChart;
  patientProfileCoverage: PatientProfileCoverageChart;
}

/** 保留 4 位小数，与既有聚合器口径一致 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** 取 ISO 时间戳的本地日期键 YYYY-MM-DD（按 UTC 日期，避免时区漂移） */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * 纯函数：今日 vs 昨日趋势对比。
 *
 * 约定：
 *   - values 为按日期升序的每日指标序列，取末两项做对比；
 *   - 样本不足两项（无昨日）时 delta / pctChange 均返回 0；
 *   - 昨日为 0 且今日 > 0：记 pctChange = 1（即「从无到有」+100%）；
 *   - 昨日为 0 且今日也为 0：pctChange = 0，避免除零噪声。
 *
 * @param values 按日期升序的每日指标值序列
 * @returns { delta, pctChange }
 */
export function trend(values: number[]): Trend {
  if (values.length < 2) return { delta: 0, pctChange: 0 };
  const curr = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = round4(curr - prev);
  let pctChange = 0;
  if (prev !== 0) {
    pctChange = round4((curr - prev) / Math.abs(prev));
  } else if (curr > 0) {
    pctChange = 1;
  }
  return { delta, pctChange };
}

/**
 * 纯函数：汇总学习引擎监控看板四张图数据。
 *
 * 口径：
 *   1. adoptionRate：按日归组反馈日志，逐日折算
 *      （采纳 + 0.5*修改）/ 反馈总数（复用策略进化同口径 adoptionRateOf）；
 *   2. weightDistribution：合并全部激活策略版本的权重（同类型加总），
 *      再归一化为总和 1；无激活策略时退化为空分片列表；
 *   3. knowledgeGrowth：按日归组知识条目新增，逐日累计出增长曲线；
 *   4. patientProfileCoverage：取 knowledge.coverageSeries 末点为今日值，
 *      total=0 时覆盖率兜底为 0。
 *
 * 空数据兜底：任一输入为空时对应图返回零值/空序列，不抛错。
 * 本函数不修改入参，返回新对象。
 *
 * @param feedbackLog 医生反馈日志（M108）
 * @param strategies  推荐策略版本列表
 * @param knowledge   知识条目与画像覆盖率状态
 * @returns 看板四张图数据
 */
export function buildLearningDashboard(
  feedbackLog: FeedbackRow[],
  strategies: StrategyRow[],
  knowledge: KnowledgeState,
): LearningDashboard {
  // ---- 1) 采纳率日趋势 -------------------------------------------------
  const daily: Record<string, TypeFeedbackCount> = {};
  for (const row of feedbackLog) {
    const key = dayKey(row.createdAt);
    if (!daily[key]) daily[key] = { adopted: 0, modified: 0, rejected: 0 };
    if (row.decision === 'adopted') daily[key].adopted += 1;
    else if (row.decision === 'modified') daily[key].modified += 1;
    else if (row.decision === 'rejected') daily[key].rejected += 1;
  }
  const adoptionSeries = Object.keys(daily)
    .sort()
    .map((date) => ({ date, rate: round4(adoptionRateOf(daily[date])) }));
  const adoptionValues = adoptionSeries.map((p) => p.rate);
  const adoptionRate: AdoptionRateChart = {
    series: adoptionSeries,
    current: adoptionSeries.length > 0 ? adoptionSeries[adoptionSeries.length - 1].rate : 0,
    trend: trend(adoptionValues),
  };

  // ---- 2) 权重分布饼图（仅激活版本，合并后归一化） --------------------
  const merged: Record<string, number> = {};
  for (const s of strategies) {
    if (!s.active) continue;
    for (const [type, w] of Object.entries(s.weights)) {
      merged[type] = (merged[type] ?? 0) + w;
    }
  }
  const weightSum = Object.values(merged).reduce((acc, w) => acc + w, 0);
  const weightDistribution: WeightDistributionChart = { slices: [] };
  if (weightSum > 0) {
    weightDistribution.slices = Object.entries(merged)
      .map(([type, w]) => ({ type, weight: round4(w / weightSum) }))
      .sort((a, b) => b.weight - a.weight);
  }

  // ---- 3) 知识增长曲线（逐日累计） ------------------------------------
  const perDay: Record<string, number> = {};
  for (const e of knowledge.entries) {
    const key = dayKey(e.createdAt);
    perDay[key] = (perDay[key] ?? 0) + 1;
  }
  const growthSeries: Array<{ date: string; count: number }> = [];
  let acc = 0;
  for (const date of Object.keys(perDay).sort()) {
    acc += perDay[date];
    growthSeries.push({ date, count: acc });
  }
  const knowledgeGrowth: KnowledgeGrowthChart = {
    series: growthSeries,
    total: knowledge.entries.length,
    trend: trend(growthSeries.map((p) => p.count)),
  };

  // ---- 4) 患者画像覆盖率 ------------------------------------------------
  const last = knowledge.coverageSeries[knowledge.coverageSeries.length - 1];
  const patientProfileCoverage: PatientProfileCoverageChart = {
    profiled: last?.profiled ?? 0,
    total: last?.total ?? 0,
    rate: last && last.total > 0 ? round4(last.rate) : 0,
    trend: trend(knowledge.coverageSeries.map((p) => p.rate)),
  };

  return { adoptionRate, weightDistribution, knowledgeGrowth, patientProfileCoverage };
}
