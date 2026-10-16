/**
 * 健澜科技 jlmedaios - 宣传管理纯函数单测（M194-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzePublicSentiment,
  buildPublicityReport,
  calculatePublicityEffectiveness,
  type PublicityData,
} from '../../src/bff/aggregators/publicityAggregator';

describe('analyzePublicSentiment', () => {
  it('正面为主 → positive', () => {
    const data: PublicityData = { websiteVisits: 10000, wechatFollowers: 5000, weiboFollowers: 2000, douyinFollowers: 3000, positiveNews: 40, negativeNews: 5 };
    expect(analyzePublicSentiment(data)).toBe('positive');
  });

  it('负面为主 → negative', () => {
    const data: PublicityData = { websiteVisits: 10000, wechatFollowers: 5000, weiboFollowers: 2000, douyinFollowers: 3000, positiveNews: 2, negativeNews: 10 };
    expect(analyzePublicSentiment(data)).toBe('negative');
  });
});

describe('calculatePublicityEffectiveness', () => {
  it('得分不超过 100', () => {
    const data: PublicityData = { websiteVisits: 1000000, wechatFollowers: 1000000, weiboFollowers: 1000000, douyinFollowers: 1000000, positiveNews: 1000, negativeNews: 10 };
    expect(calculatePublicityEffectiveness(data)).toBeLessThanOrEqual(100);
  });
});

describe('buildPublicityReport', () => {
  it('生成渠道数据', () => {
    const r = buildPublicityReport('宣传科', '30d');
    expect(r.channels.wechat).toBeGreaterThan(0);
  });

  it('生成新闻发布', () => {
    const r = buildPublicityReport('宣传科', '30d');
    expect(r.news.published).toBeGreaterThan(0);
  });

  it('生成舆情', () => {
    const r = buildPublicityReport('宣传科', '30d');
    expect(r.sentiment.level).toBeDefined();
  });

  it('生成建议', () => {
    const r = buildPublicityReport('宣传科', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
