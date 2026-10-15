/**
 * 健澜科技 jlmedaios - 学习引擎权重自进化聚合器（纯函数）
 *
 * 在最近 7 天医生反馈窗口上，按「采纳率」对推荐权重做乘性自动调整：
 *   - autoEvolveWeights：采纳率 > 0.7 的建议类型权重 ×1.1（升权），
 *     采纳率 < 0.3 的类型权重 ×0.9（降权），中间区间与无反馈类型保持不动；
 *     调整后逐权重截断到 [0.1, 2.0]，防止权重发散或塌陷；
 *   - compareWeights：对比新旧权重分布，折算「被采纳（升权）」与
 *     「被拒绝（降权）」的权重总偏移量，作为进化留痕的核心指标。
 *
 * 依据宪法第三章：权重策略变更影响临床推荐排序结果，进化结果必须可追溯——
 *               本模块产出的 log 即路由层写入 medmuse.weight_evolution_log 的留痕。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/weightEvolution.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 权重分布：建议类型（diagnosis/drug/pathway/...）-> 权重 */
export type WeightMap = Record<string, number>;

/** 单类型最近反馈窗口的反馈计数（仅采纳/拒绝两态，modified 计入采纳侧） */
export interface TypeFeedback {
  /** 被采纳的次数（含修改后采纳） */
  adopted: number;
  /** 被拒绝的次数 */
  rejected: number;
}

/** 反馈统计：建议类型 -> 计数 */
export type FeedbackStats = Record<string, TypeFeedback>;

/** compareWeights 的偏移结果 */
export interface WeightDelta {
  /** 升权（new > old）的权重偏移合计 */
  acceptedDelta: number;
  /** 降权（new < old）的权重偏移合计 */
  rejectedDelta: number;
}

/** autoEvolveWeights 的完整返回：新权重 + 供落库的 log 片段 */
export interface WeightEvolutionResult {
  /** 进化后的新权重分布（已截断） */
  newWeights: WeightMap;
  /** 供路由层写入 medmuse.weight_evolution_log 的留痕片段 */
  log: {
    oldWeights: WeightMap;
    newWeights: WeightMap;
    feedbackWindowDays: number;
    acceptedDelta: number;
    rejectedDelta: number;
  };
}

/** 反馈窗口天数：最近 7 天 */
export const FEEDBACK_WINDOW_DAYS = 7;
/** 升权阈值：采纳率严格大于该值时权重 ×1.1 */
export const BOOST_THRESHOLD = 0.7;
/** 降权阈值：采纳率严格小于该值时权重 ×0.9 */
export const DAMPEN_THRESHOLD = 0.3;
/** 升权倍率 */
export const BOOST_FACTOR = 1.1;
/** 降权倍率 */
export const DAMPEN_FACTOR = 0.9;
/** 权重截断下界 */
export const MIN_WEIGHT = 0.1;
/** 权重截断上界 */
export const MAX_WEIGHT = 2.0;

/** 保留 4 位小数，避免 jsonb 落库出现浮点长尾 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * 由某类型的采纳/拒绝次数折算采纳率。
 *
 * 无任何反馈（分母为 0）时返回 null——调用方据此判定「冷启动类型」，
 * 保持其原权重不动，避免在样本不足时被噪声误调。
 *
 * @param fb 单类型反馈计数
 * @returns 采纳率 [0,1]；无样本时返回 null
 */
export function adoptionRateOf(fb: TypeFeedback): number | null {
  const total = fb.adopted + fb.rejected;
  if (total <= 0) return null;
  return fb.adopted / total;
}

/**
 * 按最近 7 天采纳率自动进化权重分布。
 *
 * 规则：
 *   1. 对 currentWeights 中每个建议类型，取其反馈采纳率 rate；
 *   2. rate > 0.7 → w' = w × 1.1（升权）；
 *      rate < 0.3 → w' = w × 0.9（降权）；
 *      0.3 ≤ rate ≤ 0.7 或无反馈 → w' = w（保持不动）；
 *   3. 逐权重截断到 [0.1, 2.0]，防止发散/塌陷；
 *   4. 空权重分布直接返回空对象、零偏移（空数据兜底）。
 *
 * 本函数不修改入参，返回新对象；log 内用 compareWeights 折算本次偏移量。
 *
 * @param currentWeights 当前权重分布
 * @param feedbackStats  各建议类型最近窗口的反馈统计
 * @returns 新权重分布 + 落库留痕片段
 */
export function autoEvolveWeights(
  currentWeights: WeightMap,
  feedbackStats: FeedbackStats,
): WeightEvolutionResult {
  const oldWeights: WeightMap = { ...currentWeights };
  const entries = Object.entries(currentWeights);

  // 空数据兜底：空权重分布返回空对象，偏移为 0
  if (entries.length === 0) {
    return {
      newWeights: {},
      log: {
        oldWeights: {},
        newWeights: {},
        feedbackWindowDays: FEEDBACK_WINDOW_DAYS,
        acceptedDelta: 0,
        rejectedDelta: 0,
      },
    };
  }

  const newWeights: WeightMap = {};
  for (const [type, w] of entries) {
    let next = w;
    const fb = feedbackStats[type];
    if (fb) {
      const rate = adoptionRateOf(fb);
      if (rate !== null) {
        if (rate > BOOST_THRESHOLD) next = w * BOOST_FACTOR;
        else if (rate < DAMPEN_THRESHOLD) next = w * DAMPEN_FACTOR;
      }
    }
    // 逐权重截断到 [0.1, 2.0]
    const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, next));
    newWeights[type] = round4(clamped);
  }

  const { acceptedDelta, rejectedDelta } = compareWeights(oldWeights, newWeights);

  return {
    newWeights,
    log: {
      oldWeights,
      newWeights,
      feedbackWindowDays: FEEDBACK_WINDOW_DAYS,
      acceptedDelta,
      rejectedDelta,
    },
  };
}

/**
 * 对比新旧权重分布，折算升权/降权的权重总偏移量。
 *
 *   acceptedDelta = Σ max(0, new[type] - old[type])
 *   rejectedDelta = Σ max(0, old[type] - new[type])
 *
 * 键集合以旧权重为准；旧权重中缺失的新键不计入（新键不在纯函数内臆造权重）。
 * 结果保留 4 位小数。
 *
 * @param oldW 进化前权重分布
 * @param newW 进化后权重分布
 * @returns 升权/降权偏移合计
 */
export function compareWeights(oldW: WeightMap, newW: WeightMap): WeightDelta {
  let accepted = 0;
  let rejected = 0;
  for (const [type, oldV] of Object.entries(oldW)) {
    const newV = newW[type] ?? oldV;
    if (newV > oldV) accepted += newV - oldV;
    else if (newV < oldV) rejected += oldV - newV;
  }
  return { acceptedDelta: round4(accepted), rejectedDelta: round4(rejected) };
}
