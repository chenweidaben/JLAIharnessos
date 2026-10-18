/**
 * 健澜科技 jlmedaios - 质控评分历史对比 V14 聚合器（M492-C）
 *
 * 纯函数：评分历史构建 + 历史对比。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 评分历史记录 */
export interface ScoreHistoryRecordV14 {
  date: string;
  score: number;
}

/** 评分历史 */
export interface ScoreHistoryV14 {
  records: ScoreHistoryRecordV14[];
}

/**
 * 构建评分历史。
 *
 * @param records 评分历史记录
 * @returns 评分历史
 */
export function buildScoreHistory(records: ScoreHistoryRecordV14[]): ScoreHistoryV14 {
  return { records };
}

/**
 * 对比评分历史（最新-上一次）。
 *
 * @param records 评分历史记录
 * @returns 对比结果
 */
export function compareScoreHistory(records: ScoreHistoryRecordV14[]): { current: number; previous: number; change: number } {
  if (records.length === 0) {
    return { current: 0, previous: 0, change: 0 };
  }
  // 手算：current = 最新一条的分数，previous = 上一条的分数，change = current - previous
  const current = records[records.length - 1].score;
  const previous = records.length >= 2 ? records[records.length - 2].score : 0;
  const change = current - previous;
  return { current, previous, change };
}
