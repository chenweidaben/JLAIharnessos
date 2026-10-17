/**
 * 健澜科技 jlmedaios - 成功案例蒸馏与最佳实践库 V10 纯函数（M292-B）
 *
 * distillBestPracticeV10 / rankBestPracticeV10 / buildPracticeLibraryV10
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 成功案例 */
export interface SuccessCaseV10 {
  dept: string;
  condition: string;
  title: string;
  description: string;
}

/** 最佳实践 */
export interface BestPracticeV10 {
  id: string;
  dept: string;
  condition: string;
  title: string;
  description: string;
  sourceCaseCnt: number;
  upvoteCnt: number;
}

/**
 * 蒸馏最佳实践 V10（纯函数）：按 dept+condition 聚合，source_case_cnt 累加。
 *
 * @param cases 成功案例列表
 * @returns 蒸馏后的最佳实践
 */
export function distillBestPracticeV10(cases: SuccessCaseV10[]): BestPracticeV10[] {
  const bucket = new Map<string, BestPracticeV10>();
  for (const c of cases) {
    const key = `${c.dept}::${c.condition}`;
    const cur = bucket.get(key);
    if (cur) {
      cur.sourceCaseCnt += 1;
    } else {
      bucket.set(key, {
        id: `bp-${key}`,
        dept: c.dept,
        condition: c.condition,
        title: c.title,
        description: c.description,
        sourceCaseCnt: 1,
        upvoteCnt: 0,
      });
    }
  }
  return Array.from(bucket.values());
}

/**
 * 最佳实践排序 V10（纯函数）：score = upvote_cnt×2 + source_case_cnt，降序。
 *
 * @param practices 实践列表
 * @returns 排序后列表
 */
export function rankBestPracticeV10(practices: BestPracticeV10[]): BestPracticeV10[] {
  return [...practices].sort(
    (a, b) => (b.upvoteCnt * 2 + b.sourceCaseCnt) - (a.upvoteCnt * 2 + a.sourceCaseCnt),
  );
}

/**
 * 最佳实践库统计 V10（纯函数）：total/topDept/avgUpvote。
 *
 * @param practices 实践列表
 * @returns 统计
 */
export function buildPracticeLibraryV10(practices: BestPracticeV10[]): {
  total: number;
  topDept: string;
  avgUpvote: number;
} {
  if (practices.length === 0) {
    return { total: 0, topDept: "—", avgUpvote: 0 };
  }
  const deptCount = new Map<string, number>();
  for (const p of practices) {
    deptCount.set(p.dept, (deptCount.get(p.dept) ?? 0) + 1);
  }
  const topDept = Array.from(deptCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const avgUpvote = Math.round(
    (practices.reduce((s, p) => s + p.upvoteCnt, 0) / practices.length) * 10,
  ) / 10;
  return {
    total: practices.length,
    topDept,
    avgUpvote,
  };
}
