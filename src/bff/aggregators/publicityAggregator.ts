/**
 * 健澜科技 jlmedaios - 宣传管理纯函数（M194-D）
 *
 * buildPublicityReport / analyzePublicSentiment / calculatePublicityEffectiveness
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 宣传数据 */
export interface PublicityData {
  websiteVisits: number;
  wechatFollowers: number;
  weiboFollowers: number;
  douyinFollowers: number;
  positiveNews: number;
  negativeNews: number;
}

/**
 * 舆情分析（纯函数）。
 *
 * @param data 宣传数据
 * @returns 舆情等级
 */
export function analyzePublicSentiment(data: PublicityData): 'positive' | 'neutral' | 'negative' {
  const total = data.positiveNews + data.negativeNews;
  if (total === 0) return 'neutral';
  const ratio = data.positiveNews / total;
  if (ratio > 0.8) return 'positive';
  if (ratio < 0.3) return 'negative';
  return 'neutral';
}

/**
 * 宣传效果计算（纯函数）。
 *
 * @param data 宣传数据
 * @returns 效果评分
 */
export function calculatePublicityEffectiveness(data: PublicityData): number {
  const score =
    Math.min(data.websiteVisits / 10000, 20) +
    Math.min(data.wechatFollowers / 10000, 20) +
    Math.min(data.weiboFollowers / 10000, 15) +
    Math.min(data.douyinFollowers / 10000, 15) +
    Math.min(data.positiveNews * 2, 30);
  return Math.min(100, Math.round(score));
}

/** 宣传报告输出 */
export interface PublicityReport {
  dept: string;
  timeRange: string;
  channels: { website: number; wechat: number; weibo: number; douyin: number; videoAccount: number };
  news: { published: number; mediaCoverage: number };
  brandActivities: { count: number };
  healthEducation: { articles: number; videos: number };
  sentiment: { level: string; positive: number; negative: number };
  culture: { events: number };
  effectiveness: number;
  team: { members: number };
  suggestions: string[];
}

/**
 * 构建宣传报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 宣传报告
 */
export function buildPublicityReport(dept: string, timeRange: string): PublicityReport {
  const pData: PublicityData = {
    websiteVisits: 50000,
    wechatFollowers: 30000,
    weiboFollowers: 10000,
    douyinFollowers: 20000,
    positiveNews: 40,
    negativeNews: 5,
  };

  const sentiment = analyzePublicSentiment(pData);
  const effectiveness = calculatePublicityEffectiveness(pData);

  return {
    dept,
    timeRange,
    channels: { website: 50000, wechat: 30000, weibo: 10000, douyin: 20000, videoAccount: 15000 },
    news: { published: 60, mediaCoverage: 25 },
    brandActivities: { count: 4 },
    healthEducation: { articles: 80, videos: 20 },
    sentiment: { level: sentiment, positive: pData.positiveNews, negative: pData.negativeNews },
    culture: { events: 3 },
    effectiveness,
    team: { members: 6 },
    suggestions: ['加强短视频平台运营', '提升健康科普内容质量'],
  };
}
