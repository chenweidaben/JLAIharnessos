/**
 * 健澜科技 jlmedaios - M108 诊疗反馈学习闭环聚合器（纯函数）
 *
 * 核心思想：把医生对 AI 建议的历史处置（采纳/修改/拒绝）折算成每个
 * 「建议类型」的推荐权重——多次采纳的类型升权、多次拒绝的类型降权，
 * 从而让 MedMuse 在后续推荐时自然把版面让给更受临床信任的建议。
 *
 * 本模块全部为无副作用纯函数，便于单测与在 BFF / 推荐链路两侧复用；
 * 与数据库的读写由路由层（routes/aiFeedback.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医生对一条 AI 建议的最终处置决策 */
export type DoctorDecision = 'adopted' | 'modified' | 'rejected';

/** 一条反馈样本（与 medmuse.ai_feedback_log 的业务字段对齐） */
export interface Feedback {
  /** 建议类型，如 'diagnosis' | 'drug' | 'pathway' | 'lab_interpret' */
  suggestionType: string;
  /** 医生决策：采纳 / 修改后采纳 / 拒绝 */
  doctorDecision: DoctorDecision;
}

/** 单个建议类型的汇总统计与当前推荐权重 */
export interface TypeAggregate {
  /** 被直接采纳的次数 */
  adopted: number;
  /** 被医生修改后采纳的次数（部分认可，按半权计入正向） */
  modified: number;
  /** 被直接拒绝的次数 */
  rejected: number;
  /**
   * 当前推荐权重：默认 1.0。
   * 每条采纳 +0.2、每条修改 +0.1、每条拒绝 -0.3，
   * 最终截断到 [MIN_WEIGHT, MAX_WEIGHT]。
   */
  weight: number;
}

/** 无历史反馈时的默认权重（中性） */
export const DEFAULT_WEIGHT = 1.0;
/** 权重下限：即使被反复拒绝也保留少量曝光，避免类型被彻底雪藏 */
export const MIN_WEIGHT = 0.1;
/** 权重上限：防止某一类型无限放大、挤占其他建议 */
export const MAX_WEIGHT = 2.0;

/** 单条「采纳」对权重的正向贡献 */
const WEIGHT_PER_ADOPTED = 0.2;
/** 单条「修改后采纳」的正向贡献（认可但不完全信任，半权） */
const WEIGHT_PER_MODIFIED = 0.1;
/** 单条「拒绝」对权重的负向贡献（惩罚权重最高，抑制不可靠建议） */
const WEIGHT_PER_REJECTED = 0.3;

/**
 * 由某类型的采纳/修改/拒绝次数计算推荐权重。
 *
 * 规则：以 DEFAULT_WEIGHT 为中性基准，采纳升权、拒绝降权，修改为半权正向；
 * 结果按 MIN_WEIGHT / MAX_WEIGHT 截断，保留两位小数，保证数值稳定可断言。
 *
 * @param adopted  采纳次数
 * @param modified 修改后采纳次数
 * @param rejected 拒绝次数
 * @returns 截断后的推荐权重（[0.1, 2.0]）
 */
export function computeWeight(adopted: number, modified: number, rejected: number): number {
  const raw =
    DEFAULT_WEIGHT +
    adopted * WEIGHT_PER_ADOPTED +
    modified * WEIGHT_PER_MODIFIED -
    rejected * WEIGHT_PER_REJECTED;
  const clamped = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, raw));
  return Math.round(clamped * 100) / 100;
}

/**
 * 将历史反馈按建议类型聚合成统计与权重表。
 *
 * 遍历 history，对每个 suggestion_type 累加 adopted / modified / rejected，
 * 再用 computeWeight 折算出该类型当前的推荐权重。空历史返回空对象。
 *
 * @param history 累积的反馈样本列表
 * @returns 以 suggestion_type 为键的聚合结果；未出现过的类型不在表中
 */
export function aggregateByType(history: Feedback[]): Record<string, TypeAggregate> {
  const acc = new Map<string, TypeAggregate>();
  for (const fb of history) {
    const key = fb.suggestionType || 'unknown';
    let row = acc.get(key);
    if (!row) {
      row = { adopted: 0, modified: 0, rejected: 0, weight: DEFAULT_WEIGHT };
      acc.set(key, row);
    }
    if (fb.doctorDecision === 'adopted') row.adopted += 1;
    else if (fb.doctorDecision === 'modified') row.modified += 1;
    else row.rejected += 1;
  }
  // 累计次数完成后统一折算权重，避免逐条重算
  const out: Record<string, TypeAggregate> = {};
  for (const [key, row] of acc) {
    out[key] = { ...row, weight: computeWeight(row.adopted, row.modified, row.rejected) };
  }
  return out;
}

/**
 * 根据历史反馈，为「当前待推荐的某类建议」计算应施加的推荐权重。
 *
 * 闭环落点：推荐链路在排序/展示 AI 建议时调用本函数——
 *  - 该类型历史被多次拒绝 -> 返回明显低于 1.0 的权重（降权、弱化或后置）；
 *  - 该类型历史被多次采纳 -> 返回高于 1.0 的权重（升权、优先展示）；
 *  - 该类型尚无任何反馈 -> 返回 DEFAULT_WEIGHT（中性，不干预）。
 *
 * @param history  累积的历史反馈样本
 * @param current  当前待打分的建议（至少含 suggestionType）
 * @returns 0.1 ~ 2.0 之间的推荐权重；无历史时为 1.0
 */
export function scoreSuggestion(
  history: Feedback[],
  current: Pick<Feedback, 'suggestionType'>,
): number {
  const stats = aggregateByType(history);
  const row = stats[current.suggestionType];
  return row ? row.weight : DEFAULT_WEIGHT;
}
