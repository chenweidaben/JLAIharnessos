/**
 * 健澜科技 jlmedaios - Doctor MUSE 推荐效果追踪聚合器（纯函数）
 *
 * 核心函数：
 *   - computeAdoptionRate(rows, doctorId, timeRange)：
 *     按医生 + 时间窗口计算采纳率（adopted + modified 计入采纳侧）；
 *   - identifyLowAdoptionRecommendations(rows, threshold)：
 *     识别采纳率低于阈值的推荐类型，供 Personal Agent 主动优化。
 *
 * 设计原则：全部为无副作用纯函数，不触库、不依赖网络，便于单测；
 *           数据库查询由路由层负责，本模块只做统计与决策。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条推荐结局记录（与 medmuse.personal_agent_recommendations 对齐） */
export interface RecommendationRow {
  /** 推荐 ID */
  id: string;
  /** 医生 ID */
  doctorId: string;
  /** 推荐类型（diagnosis / drug / pathway / lab / ...） */
  suggestionType: string;
  /** 推荐标题 */
  suggestionTitle: string;
  /** 结局：pending / adopted / modified / rejected */
  outcome: 'pending' | 'adopted' | 'modified' | 'rejected';
  /** 推荐下发时间（ISO 字符串） */
  recommendedAt: string;
}

/** 时间窗口 */
export interface TimeRange {
  /** 起始时间（ISO） */
  from: string;
  /** 结束时间（ISO），缺省为 now */
  to?: string;
}

/** 采纳率统计结果 */
export interface AdoptionRateResult {
  /** 医生 ID */
  doctorId: string;
  /** 时间窗口 */
  timeRange: TimeRange;
  /** 总推荐数（不含 pending） */
  totalResolved: number;
  /** 采纳数（adopted + modified） */
  adoptedCount: number;
  /** 修改数（modified） */
  modifiedCount: number;
  /** 拒绝数（rejected） */
  rejectedCount: number;
  /** 待处置数（pending） */
  pendingCount: number;
  /** 采纳率 = (adopted + modified) / totalResolved；无已处置样本时为 null */
  adoptionRate: number | null;
  /** 修改率 = modified / totalResolved；无已处置样本时为 null */
  modificationRate: number | null;
  /** 拒绝率 = rejected / totalResolved；无已处置样本时为 null */
  rejectionRate: number | null;
  /** 按推荐类型分组的明细 */
  byType: Array<{
    suggestionType: string;
    total: number;
    adopted: number;
    modified: number;
    rejected: number;
    pending: number;
    rate: number | null;
  }>;
}

/**
 * 计算某个医生在指定时间窗口内的推荐采纳率。
 *
 * 规则：
 *  - adopted + modified 均计入「采纳侧」；
 *  - pending 不计入分母（视为尚未闭环）；
 *  - 无已处置样本（totalResolved = 0）时采纳率为 null，避免除零。
 *
 * @param rows 推荐结局记录列表
 * @param doctorId 医生 ID
 * @param timeRange 时间窗口（from/to）
 * @returns 采纳率统计结果
 */
export function computeAdoptionRate(
  rows: RecommendationRow[],
  doctorId: string,
  timeRange: TimeRange,
): AdoptionRateResult {
  const fromMs = new Date(timeRange.from).getTime();
  const toMs = timeRange.to ? new Date(timeRange.to).getTime() : Date.now();

  // 过滤：指定医生 + 时间窗口内
  const filtered = rows.filter((r) => {
    if (r.doctorId !== doctorId) return false;
    const ts = new Date(r.recommendedAt).getTime();
    return ts >= fromMs && ts <= toMs;
  });

  let adopted = 0;
  let modified = 0;
  let rejected = 0;
  let pending = 0;

  const typeMap = new Map<string, { total: number; adopted: number; modified: number; rejected: number; pending: number }>();

  for (const r of filtered) {
    const bucket = typeMap.get(r.suggestionType) ?? { total: 0, adopted: 0, modified: 0, rejected: 0, pending: 0 };
    bucket.total += 1;
    bucket[r.outcome === 'adopted' ? 'adopted' : r.outcome === 'modified' ? 'modified' : r.outcome === 'rejected' ? 'rejected' : 'pending'] += 1;
    typeMap.set(r.suggestionType, bucket);

    if (r.outcome === 'adopted') adopted += 1;
    else if (r.outcome === 'modified') modified += 1;
    else if (r.outcome === 'rejected') rejected += 1;
    else pending += 1;
  }

  const totalResolved = adopted + modified + rejected;
  const rate = totalResolved > 0 ? (adopted + modified) / totalResolved : null;
  const modRate = totalResolved > 0 ? modified / totalResolved : null;
  const rejRate = totalResolved > 0 ? rejected / totalResolved : null;

  const byType = Array.from(typeMap.entries())
    .map(([suggestionType, b]) => {
      const resolved = b.adopted + b.modified + b.rejected;
      return {
        suggestionType,
        total: b.total,
        adopted: b.adopted,
        modified: b.modified,
        rejected: b.rejected,
        pending: b.pending,
        rate: resolved > 0 ? (b.adopted + b.modified) / resolved : null,
      };
    })
    .sort((a, b) => (a.rate ?? Number.POSITIVE_INFINITY) - (b.rate ?? Number.POSITIVE_INFINITY));

  return {
    doctorId,
    timeRange,
    totalResolved,
    adoptedCount: adopted,
    modifiedCount: modified,
    rejectedCount: rejected,
    pendingCount: pending,
    adoptionRate: rate,
    modificationRate: modRate,
    rejectionRate: rejRate,
    byType,
  };
}

/** 低采纳推荐项 */
export interface LowAdoptionItem {
  /** 推荐类型 */
  suggestionType: string;
  /** 已处置样本数 */
  resolved: number;
  /** 采纳率 */
  rate: number;
  /** 建议优化方向 */
  suggestion: string;
}

/**
 * 识别采纳率低于阈值的推荐类型。
 *
 * @param rows 推荐结局记录
 * @param threshold 采纳率阈值（默认 0.5），低于该值的类型被标记为低采纳
 * @param minSamples 最少样本数（默认 5），样本不足不参与判定，避免冷启动噪声
 * @returns 低采纳推荐列表（按采纳率升序）
 */
export function identifyLowAdoptionRecommendations(
  rows: RecommendationRow[],
  threshold = 0.5,
  minSamples = 5,
): LowAdoptionItem[] {
  const typeMap = new Map<string, { adopted: number; modified: number; rejected: number }>();

  for (const r of rows) {
    if (r.outcome === 'pending') continue;
    const bucket = typeMap.get(r.suggestionType) ?? { adopted: 0, modified: 0, rejected: 0 };
    if (r.outcome === 'adopted') bucket.adopted += 1;
    else if (r.outcome === 'modified') bucket.modified += 1;
    else bucket.rejected += 1;
    typeMap.set(r.suggestionType, bucket);
  }

  const result: LowAdoptionItem[] = [];
  for (const [suggestionType, b] of typeMap.entries()) {
    const resolved = b.adopted + b.modified + b.rejected;
    if (resolved < minSamples) continue;
    const rate = (b.adopted + b.modified) / resolved;
    if (rate < threshold) {
      result.push({
        suggestionType,
        resolved,
        rate,
        suggestion: buildSuggestion(suggestionType, rate, b.rejected / resolved),
      });
    }
  }

  return result.sort((a, b) => a.rate - b.rate);
}

/** 根据采纳率/拒绝率生成优化建议文案 */
function buildSuggestion(type: string, rate: number, rejectRatio: number): string {
  if (rate < 0.2) {
    return `「${type}」推荐采纳率仅 ${(rate * 100).toFixed(0)}%，拒绝率 ${(rejectRatio * 100).toFixed(0)}%，建议回查推荐依据与临床口径`;
  }
  if (rejectRatio > 0.6) {
    return `「${type}」拒绝率偏高（${(rejectRatio * 100).toFixed(0)}%），建议调整推荐触发条件`;
  }
  return `「${type}」采纳率 ${(rate * 100).toFixed(0)}% 低于阈值，建议补充医生个性化偏好学习`;
}
