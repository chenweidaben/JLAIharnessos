/**
 * 健澜科技 jlmedaios - 推荐策略自学习聚合器（越用越聪明深化 · 纯函数）
 *
 * 自学习要可控，不能权重调得太激进：
 *   - autoOptimizeRecommendations：在医生反馈窗口上，按「采纳率」对推荐权重做
 *     有界乘性调整——高采纳率(>0.7)权重提升、低采纳率(<0.3)权重下降，
 *     单次调整幅度严格封顶 ±20%，调整后逐权重截断到 [0.1, 3.0]；
 *   - 新场景（尚未上线的建议类型）在样本积累到阈值且采纳率健康后自动上线；
 *     样本不足者标记 pending，不直接上线，避免噪声误调；
 *   - getSelfLearningLog：按时间窗口过滤 / 排序历史留痕（纯函数，行由路由层注入）；
 *   - compareStrategyBeforeAfter：对比某策略在窗口首日 vs 最新一次的权重分布，
 *     折算逐类型变化与总升/降权偏移。
 *
 * 依据宪法第三章：权重策略变更影响临床推荐排序结果，自学习结果必须可追溯——
 *               本模块产出的 log 片段即路由层写入 medmuse.strategy_weight_log 的留痕。
 *
 * 本模块全部为无副作用纯函数，不触库、不取当前时间，便于单测；
 * 数据库读写与 run_date 注入由路由层（routes/selfLearning.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 权重分布：建议类型（diagnosis/drug/pathway/...）-> 权重（正数） */
export type WeightMap = Record<string, number>;

/** 单类型反馈计数（仅采纳/拒绝两态，modified 计入采纳侧） */
export interface TypeFeedback {
  adopted: number;
  rejected: number;
}

/** 新场景样本计数（尚未上线的建议类型） */
export interface ScenarioSample {
  /** 累计曝光样本数 */
  samples: number;
  /** 其中被采纳数 */
  adopted: number;
  /** 其中被拒绝数 */
  rejected: number;
}

/** autoOptimizeRecommendations 的入参：当前权重 + 反馈 + 新场景样本 */
export interface FeedbackData {
  /** 当前已上线权重分布（可空，空权重分布走冷启动兜底） */
  currentWeights?: WeightMap;
  /** 各建议类型最近窗口的采纳/拒绝反馈（缺省为空，权重保持不动） */
  typeFeedback?: Record<string, TypeFeedback>;
  /** 新场景样本（缺省为空，无新场景上线） */
  scenarioSamples?: Record<string, ScenarioSample>;
}

/** 新场景评估结果 */
export interface PendingScenario {
  scenario: string;
  samples: number;
  adopted: number;
  adoptedRate: number | null;
  /** 是否达到自动上线阈值（样本足 + 采纳率健康） */
  autoOnline: boolean;
}

/** 一次自学习优化的留痕片段（供路由层落 medmuse.strategy_weight_log） */
export interface SelfLearningLog {
  oldWeights: WeightMap;
  newWeights: WeightMap;
  adoptedCount: number;
  rejectedCount: number;
  adoptedRate: number;
  /** 本次各类型中最大的相对调整幅度（带符号绝对值，封顶 ±0.20） */
  adjustmentRatio: number;
  acceptedDelta: number;
  rejectedDelta: number;
  /** applied = 权重已生效；held = 样本不足/无有效调整，未上线 */
  status: 'applied' | 'held';
}

/** autoOptimizeRecommendations 返回：优化后的策略 + 留痕片段 */
export interface Strategy {
  strategyId: string;
  weights: WeightMap;
  pendingScenarios: PendingScenario[];
  log: SelfLearningLog;
}

/** strategy_weight_log 的原始行（路由层从 DB 取出后注入本模块） */
export interface WeightLogRow {
  strategyId: string;
  runDate: string;
  oldWeights: WeightMap;
  newWeights: WeightMap;
  adoptedCount: number;
  rejectedCount: number;
  adoptedRate: number;
  adjustmentRatio: number;
  status: string;
  createdAt: string;
}

/** 过滤后的日志条目（对外视图） */
export interface LogEntry {
  runDate: string;
  strategyId: string;
  oldWeights: WeightMap;
  newWeights: WeightMap;
  adoptedCount: number;
  rejectedCount: number;
  adoptedRate: number;
  adjustmentRatio: number;
  status: 'applied' | 'held';
  createdAt: string;
}

/** compareStrategyBeforeAfter 的逐类型变化 */
export interface WeightChange {
  before: number;
  after: number;
  change: number;
  /** 相对变化百分比（after - before) / before，保留 4 位 */
  pct: number;
}

/** compareStrategyBeforeAfter 的对比结果 */
export interface StrategyComparison {
  strategyId: string;
  windowDays: number;
  before: WeightMap;
  after: WeightMap;
  changes: Record<string, WeightChange>;
  /** 升权偏移合计 */
  totalUp: number;
  /** 降权偏移合计 */
  totalDown: number;
  /** 窗口内留痕条数 */
  samples: number;
}

/* ---------------------------------------------------------------------------
 * 自学习可控常量：高采纳率升权 / 低采纳率降权 / 单次幅度 ±20% / 权重 [0.1, 3.0]
 * ------------------------------------------------------------------------- */
/** 升权阈值：采纳率严格大于该值时权重提升 */
export const ADOPTED_HIGH = 0.7;
/** 降权阈值：采纳率严格小于该值时权重下降 */
export const ADOPTED_LOW = 0.3;
/** 单次权重调整幅度上限（±20%）——自学习要可控 */
export const MAX_ADJUST_RATIO = 0.2;
/** 权重截断下界 */
export const MIN_WEIGHT = 0.1;
/** 权重截断上界（越用越聪明，但不能无限放大） */
export const MAX_WEIGHT = 3.0;
/** 新场景自动上线所需最小样本数 */
export const MIN_SAMPLES_ONLINE = 30;
/** 新场景自动上线所需最低采纳率 */
export const MIN_RATE_ONLINE = 0.5;
/** 新场景自动上线后的默认初始权重 */
export const NEW_SCENARIO_INIT_WEIGHT = 1.0;

/** 保留 4 位小数，避免 jsonb 落库出现浮点长尾 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * 由某类型的采纳/拒绝次数折算采纳率。
 * 无样本（分母为 0）时返回 null——调用方据此保持原权重不动，避免冷启动噪声。
 */
function adoptionRateOf(fb: TypeFeedback | undefined): number | null {
  if (!fb) return null;
  const total = fb.adopted + fb.rejected;
  if (total <= 0) return null;
  return fb.adopted / total;
}

/**
 * 由采纳率折算本次相对调整幅度（带符号）。
 *   rate > 0.7：调整 = +min(0.2, rate - 0.7)，越超阈值调得越多，但封顶 +20%；
 *   rate < 0.3：调整 = -min(0.2, 0.3 - rate)，越低调得越多，但封顶 -20%；
 *   中间区间 / 无样本：0，保持不动。
 */
function computeAdjustment(rate: number | null): number {
  if (rate === null) return 0;
  if (rate > ADOPTED_HIGH) {
    return Math.min(MAX_ADJUST_RATIO, rate - ADOPTED_HIGH);
  }
  if (rate < ADOPTED_LOW) {
    return -Math.min(MAX_ADJUST_RATIO, ADOPTED_LOW - rate);
  }
  return 0;
}

/** 评估单个新场景是否达到自动上线条件 */
function evaluateScenario(name: string, sample: ScenarioSample): PendingScenario {
  const rate = sample.samples > 0 ? sample.adopted / sample.samples : null;
  const autoOnline =
    sample.samples >= MIN_SAMPLES_ONLINE &&
    rate !== null &&
    rate >= MIN_RATE_ONLINE;
  return {
    scenario: name,
    samples: sample.samples,
    adopted: sample.adopted,
    adoptedRate: rate === null ? null : round4(rate),
    autoOnline,
  };
}

/**
 * 纯函数：按采纳率自动优化推荐策略权重（越用越聪明深化）。
 *
 * 规则：
 *   1. 对 currentWeights 中每个已上线类型，取其反馈采纳率 rate；
 *      rate > 0.7 → w' = w × (1 + min(0.2, rate-0.7))（升权，封顶 +20%）；
 *      rate < 0.3 → w' = w × (1 - min(0.2, 0.3-rate))（降权，封顶 -20%）；
 *      0.3 ≤ rate ≤ 0.7 或无反馈 → w' = w（保持不动）；
 *   2. 逐权重截断到 [0.1, 3.0]，防止权重发散/塌陷；
 *   3. 新场景样本足(≥30)且采纳率健康(≥0.5)者自动上线，初始权重 1.0；
 *      其余进入 pendingScenarios，不上线；
 *   4. 空权重分布直接返回空对象、零偏移（空数据兜底）。
 *
 * 本函数不修改入参，返回新对象；log 片段供路由层落库留痕。
 *
 * @param strategyId 策略标识
 * @param data       当前权重 + 反馈 + 新场景样本
 * @returns 优化后的策略（新权重 + pending 新场景 + 留痕片段）
 */
export function autoOptimizeRecommendations(
  strategyId: string,
  data: FeedbackData,
): Strategy {
  const currentWeights = data.currentWeights ?? {};
  const oldWeights: WeightMap = { ...currentWeights };
  const entries = Object.entries(currentWeights);

  // 新场景评估（即使当前权重为空也要评估，便于冷启动策略上线首个场景）
  const pendingScenarios: PendingScenario[] = Object.entries(
    data.scenarioSamples ?? {},
  ).map(([name, sample]) => evaluateScenario(name, sample));

  const newWeights: WeightMap = {};
  let maxAbsAdjust = 0;
  let adoptedCount = 0;
  let rejectedCount = 0;

  for (const [type, w] of entries) {
    const fb = data.typeFeedback?.[type];
    const rate = adoptionRateOf(fb);
    if (fb) {
      adoptedCount += fb.adopted;
      rejectedCount += fb.rejected;
    }
    const adj = computeAdjustment(rate);
    if (Math.abs(adj) > maxAbsAdjust) maxAbsAdjust = Math.abs(adj);
    const next = w * (1 + adj);
    const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, next));
    newWeights[type] = round4(clamped);
  }

  // 新场景自动上线：达到阈值者写入新权重分布
  for (const sc of pendingScenarios) {
    if (sc.autoOnline && !(sc.scenario in newWeights)) {
      newWeights[sc.scenario] = NEW_SCENARIO_INIT_WEIGHT;
    }
  }

  const total = adoptedCount + rejectedCount;
  const overallRate = total > 0 ? adoptedCount / total : 0;
  const { acceptedDelta, rejectedDelta } = compareWeights(oldWeights, newWeights);

  // 是否有实质变化：权重变了，或有新场景上线
  const touched =
    acceptedDelta > 0 ||
    rejectedDelta > 0 ||
    pendingScenarios.some((s) => s.autoOnline);
  const status: SelfLearningLog['status'] = touched ? 'applied' : 'held';

  return {
    strategyId,
    weights: newWeights,
    pendingScenarios,
    log: {
      oldWeights,
      newWeights,
      adoptedCount,
      rejectedCount,
      adoptedRate: round4(overallRate),
      adjustmentRatio: round4(maxAbsAdjust),
      acceptedDelta: round4(acceptedDelta),
      rejectedDelta: round4(rejectedDelta),
      status,
    },
  };
}

/**
 * 对比新旧权重分布，折算升权/降权的权重总偏移量。
 *   acceptedDelta = Σ max(0, new[type] - old[type])
 *   rejectedDelta = Σ max(0, old[type] - new[type])
 * 键集合以旧权重为准；旧权重中缺失的新键（新上线场景）不计入偏移。
 */
export function compareWeights(oldW: WeightMap, newW: WeightMap): {
  acceptedDelta: number;
  rejectedDelta: number;
} {
  let accepted = 0;
  let rejected = 0;
  for (const [type, oldV] of Object.entries(oldW)) {
    const newV = newW[type] ?? oldV;
    if (newV > oldV) accepted += newV - oldV;
    else if (newV < oldV) rejected += oldV - newV;
  }
  return { acceptedDelta: round4(accepted), rejectedDelta: round4(rejected) };
}

/**
 * 纯函数：按时间窗口过滤自学习日志（越用越聪明深化）。
 *
 * 行由路由层从 medmuse.strategy_weight_log 取出后注入，本函数只做：
 *   按 createdAt 落在最近 days 天内过滤 → 按时间倒序返回对外视图。
 * 不触库、不依赖当前时间源——cutoffMs 由路由层注入（便于测试与时钟解耦）。
 *
 * @param period  窗口描述（days：最近 N 天）
 * @param rows    原始日志行（路由层注入）
 * @param nowMs   当前时间戳（路由层注入，默认 Date.now 仅在缺省调用时）
 */
export function getSelfLearningLog(
  period: { days: number },
  rows: readonly WeightLogRow[],
  nowMs: number = Date.now(),
): LogEntry[] {
  const days = Number.isFinite(period.days)
    ? Math.max(1, Math.floor(period.days))
    : 7;
  const cutoff = nowMs - days * 24 * 3600 * 1000;
  return rows
    .filter((r) => new Date(r.createdAt).getTime() >= cutoff)
    .map((r) => ({
      runDate: r.runDate,
      strategyId: r.strategyId,
      oldWeights: r.oldWeights,
      newWeights: r.newWeights,
      adoptedCount: r.adoptedCount,
      rejectedCount: r.rejectedCount,
      adoptedRate: r.adoptedRate,
      adjustmentRatio: r.adjustmentRatio,
      status: (r.status === 'held' ? 'held' : 'applied') as LogEntry['status'],
      createdAt: r.createdAt,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * 纯函数：对比某策略在窗口内「首日 vs 最新一次」的权重分布。
 *
 *   - 在 rows 中筛出 strategyId 匹配且落在最近 days 天的留痕；
 *   - before = 窗口内最早一条的 newWeights（即上一阶段基线）；
 *   - after  = 窗口内最新一条的 newWeights；
 *   - 逐类型折算 before/after/绝对变化/相对百分比，以及总升/降权偏移。
 * 无窗口数据时返回 before=after=空、零偏移、samples=0。
 *
 * @param strategyId 策略标识
 * @param days       对比窗口天数
 * @param rows       原始日志行（路由层注入）
 * @param nowMs      当前时间戳（路由层注入）
 */
export function compareStrategyBeforeAfter(
  strategyId: string,
  days: number,
  rows: readonly WeightLogRow[],
  nowMs: number = Date.now(),
): StrategyComparison {
  const windowDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 7;
  const cutoff = nowMs - windowDays * 24 * 3600 * 1000;

  const matched = rows
    .filter((r) => r.strategyId === strategyId && new Date(r.createdAt).getTime() >= cutoff)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const empty: StrategyComparison = {
    strategyId,
    windowDays,
    before: {},
    after: {},
    changes: {},
    totalUp: 0,
    totalDown: 0,
    samples: 0,
  };
  if (matched.length === 0) return empty;

  const before = matched[0].newWeights;
  const after = matched[matched.length - 1].newWeights;

  const changes: Record<string, WeightChange> = {};
  let totalUp = 0;
  let totalDown = 0;
  for (const [type, oldV] of Object.entries(before)) {
    const newV = after[type] ?? oldV;
    const change = round4(newV - oldV);
    const pct = oldV !== 0 ? round4(change / oldV) : 0;
    changes[type] = {
      before: oldV,
      after: newV,
      change,
      pct,
    };
    if (change > 0) totalUp += change;
    else if (change < 0) totalDown += -change;
  }

  return {
    strategyId,
    windowDays,
    before,
    after,
    changes,
    totalUp: round4(totalUp),
    totalDown: round4(totalDown),
    samples: matched.length,
  };
}
