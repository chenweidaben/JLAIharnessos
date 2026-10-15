/**
 * 健澜科技 jlmedaios - 推荐策略进化聚合器（纯函数）
 *
 * 在 M108 反馈学习闭环（medmuse.ai_feedback_log）之上，做策略层（strategy）的
 * 进化调度：
 *   - evolveWeights：按医生反馈统计自动调整某条策略的权重分布——
 *     采纳率高的建议类型权重上升，被反复拒绝的类型权重下降；
 *   - compareStrategies：对两条策略的采纳率做 A/B 对比，返回优胜方；
 *   - 版本回滚：策略以多行版本形式持久化（medmuse.recommendation_strategy），
 *     pickRollbackVersion 从版本历史中定位回滚目标，nextVersion 给出下一版本号。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/strategyEvolution.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 策略权重分布：建议类型（diagnosis/drug/pathway/...）-> 权重 */
export type StrategyWeights = Record<string, number>;

/** 单个建议类型的反馈计数（与 medmuse.ai_feedback_log 的 doctor_decision 对齐） */
export interface TypeFeedbackCount {
  /** 被直接采纳的次数 */
  adopted: number;
  /** 被医生修改后采纳的次数（部分认可，按半权计入正向） */
  modified: number;
  /** 被直接拒绝的次数 */
  rejected: number;
}

/** 反馈统计：建议类型 -> 计数 */
export type FeedbackStats = Record<string, TypeFeedbackCount>;

/** 单条策略的 A/B 对比指标 */
export interface StrategyPerformance {
  /** 策略版本行主键 */
  strategyId: string;
  /** 策略名 */
  strategyName: string;
  /** 策略版本号 */
  version: number;
  /** 采纳率，取值 [0,1] */
  adoptionRate: number;
  /** 参与计算的反馈样本条数 */
  sampleSize: number;
}

/** compareStrategies 的胜负结果 */
export type StrategyWinner = 'a' | 'b' | 'tie';

/** 策略版本历史记录（与 medmuse.recommendation_strategy 的关键字段对齐） */
export interface StrategyVersionRecord {
  id: string;
  strategyName: string;
  version: number;
  active: boolean;
}

/** 进化学习率：采纳率每偏离中性基准 0.1，权重乘性调整 2% */
export const EVOLVE_LEARNING_RATE = 0.2;
/** 中性采纳率基准：高于此值的类型升权，低于此值的类型降权 */
export const NEUTRAL_RATE = 0.5;

/**
 * 由某类型的采纳/修改/拒绝次数折算采纳率。
 *
 * modified 按半权计入正向（医生部分认可）；无任何反馈时返回中性基准，
 * 避免「冷启动类型」在第一轮进化中被误杀。
 *
 * @param fb 单类型反馈计数
 * @returns 采纳率，取值 [0,1]
 */
export function adoptionRateOf(fb: TypeFeedbackCount): number {
  const total = fb.adopted + fb.modified + fb.rejected;
  if (total <= 0) return NEUTRAL_RATE;
  return (fb.adopted + fb.modified * 0.5) / total;
}

/**
 * 根据反馈统计自动进化一条策略的权重分布。
 *
 * 规则：
 *   1. 对当前权重中每个建议类型，取其反馈采纳率 rate；
 *   2. 乘性调整：w' = w * (1 + η * (rate - 0.5))，η = EVOLVE_LEARNING_RATE；
 *      采纳率高于 0.5 的类型权重上升，低于 0.5（被拒绝居多）的下降；
 *   3. 无任何反馈的类型保持原权重，不被噪声扰动；
 *   4. 调整后重新归一化，使权重分布总和为 1，保证下游排序口径稳定；
 *   5. 退化保护：全部权重被压到 0 时退化为均分，不产出空分布。
 *
 * 本函数不修改入参，返回新对象。
 *
 * @param currentWeights 当前策略的权重分布
 * @param feedback       各建议类型的反馈统计
 * @returns 进化后的新权重分布（归一化，保留 4 位小数）
 */
export function evolveWeights(
  currentWeights: StrategyWeights,
  feedback: FeedbackStats,
): StrategyWeights {
  const entries = Object.entries(currentWeights);
  if (entries.length === 0) return { ...currentWeights };

  const adjusted: Array<[string, number]> = entries.map(([type, w]) => {
    const fb = feedback[type];
    if (!fb) return [type, w];
    const rate = adoptionRateOf(fb);
    const factor = 1 + EVOLVE_LEARNING_RATE * (rate - NEUTRAL_RATE);
    return [type, w * factor];
  });

  const raw = adjusted.map(([, w]) => Math.max(0, w));
  const sum = raw.reduce((acc, w) => acc + w, 0);

  // 退化保护：权重全为 0 时均分给各类型，避免排序链路无权重可用
  if (sum <= 0) {
    const each = Math.round((1 / entries.length) * 10000) / 10000;
    return Object.fromEntries(entries.map(([type]) => [type, each]));
  }

  const next: StrategyWeights = {};
  for (let i = 0; i < adjusted.length; i += 1) {
    next[adjusted[i][0]] = Math.round((raw[i] / sum) * 10000) / 10000;
  }
  return next;
}

/**
 * A/B 对比两条策略的采纳率，返回优胜方。
 *
 * 判定口径：采纳率高者胜；在 1e-9 浮点误差内相等判 tie。
 * 样本量不作为决胜因子——A/B 实验的胜负以采纳率本身为准，
 * 样本量由调用方在展示层提示可信度。
 *
 * @param metricsA 策略 A 的指标
 * @param metricsB 策略 B 的指标
 * @returns 'a'（A 胜）| 'b'（B 胜）| 'tie'（持平）
 */
export function compareStrategies(
  metricsA: Pick<StrategyPerformance, 'adoptionRate'>,
  metricsB: Pick<StrategyPerformance, 'adoptionRate'>,
): StrategyWinner {
  const diff = metricsA.adoptionRate - metricsB.adoptionRate;
  if (Math.abs(diff) < 1e-9) return 'tie';
  return diff > 0 ? 'a' : 'b';
}

/**
 * 按策略当前权重分布，结合各类型采纳率，折算该策略的期望采纳率。
 *
 * 策略之间的横向对比用：把「权重分布」与「类型采纳率」两张表对齐，
 * 以权重为期望折算综合采纳率——权重向高采纳率类型倾斜的策略得分更高。
 * 无反馈数据的类型按中性基准 0.5 计入，避免冷启动类型拖垮评分。
 *
 * @param weights   策略权重分布
 * @param typeRates 各建议类型的采纳率
 * @returns 该策略的期望采纳率，取值 [0,1]
 */
export function expectedAdoptionRate(
  weights: StrategyWeights,
  typeRates: Record<string, number>,
): number {
  const entries = Object.entries(weights);
  const sumW = entries.reduce((acc, [, w]) => acc + w, 0);
  if (entries.length === 0 || sumW <= 0) return NEUTRAL_RATE;
  let acc = 0;
  for (const [type, w] of entries) {
    acc += w * (typeRates[type] ?? NEUTRAL_RATE);
  }
  return acc / sumW;
}

/**
 * 对多条策略的采纳率做排序对比，产出看板视图。
 *
 * 按采纳率降序排列；ranked[0] 与 ranked[1] 之间用 compareStrategies 给出
 * 头名判定（verdict），供接口直接返回「当前头名是谁、与次席差距如何」。
 *
 * @param metrics 各策略的采纳率指标列表
 * @returns ranked 降序列表、winner 头名（空列表为 null）、verdict 头名判定
 */
export function rankStrategies(
  metrics: StrategyPerformance[],
): { ranked: StrategyPerformance[]; winner: StrategyPerformance | null; verdict: StrategyWinner } {
  const ranked = [...metrics].sort((a, b) => b.adoptionRate - a.adoptionRate);
  const winner = ranked.length > 0 ? ranked[0] : null;
  const verdict =
    ranked.length >= 2 ? compareStrategies(ranked[0], ranked[1]) : 'tie';
  return { ranked, winner, verdict };
}

/**
 * 从策略版本历史中定位回滚目标版本。
 *
 * 版本记录可回滚：发布新版本时旧版本行保留在表中，运营如需回退，
 * 用本函数按目标 version 找到历史行，再由发布流程将其 active 置真、
 * 其余版本置假。找不到目标版本返回 null（路由层转 404）。
 *
 * @param history     某策略的版本历史（含全部历史版本行）
 * @param targetVersion 要回滚到的版本号
 * @returns 目标版本行；不存在时返回 null
 */
export function pickRollbackVersion(
  history: StrategyVersionRecord[],
  targetVersion: number,
): StrategyVersionRecord | null {
  return history.find((row) => row.version === targetVersion) ?? null;
}

/**
 * 计算新版本号：在既有版本历史上取 max(version)+1。
 * 空历史视为首版，从 1 开始。
 *
 * @param history 某策略的版本历史
 * @returns 下一版本号
 */
export function nextVersion(history: StrategyVersionRecord[]): number {
  if (history.length === 0) return 1;
  return Math.max(...history.map((row) => row.version)) + 1;
}
