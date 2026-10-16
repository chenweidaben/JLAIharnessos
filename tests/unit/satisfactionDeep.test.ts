/**
 * 健澜科技 jlmedaios - 【患者体验深化】M174-D 满意度闭环纯函数单测
 *
 * 覆盖：
 *   - analyzeEmotion：正面/中性/负面三分类与情感分区间；
 *   - classifyNps / calcNps：NPS 三档分类与净推荐值计算；
 *   - analyzeFiveWhy：5Why 根因追问链、根因编码与置信度；
 *   - buildDeepSatisfactionLoop：多渠道收集、情感分布、PDCA 阶段分布、NPS 汇总；
 *   - analyzeSatisfactionTrend：rising/stable/falling 趋势判定与 Δ 计算；
 *   - benchmarkSatisfaction：位次、与标杆差距、简评；
 *   - generatePatientVoiceReport：高频负面词、正/负面原声、改进建议。
 *
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  analyzeEmotion,
  analyzeFiveWhy,
  analyzeSatisfactionTrend,
  benchmarkSatisfaction,
  buildDeepSatisfactionLoop,
  calcNps,
  classifyNps,
  generatePatientVoiceReport,
  type DeepSatisfactionSignal,
  type PdcaAction,
  type TrendPoint,
} from '../../src/bff/aggregators/satisfactionDeepAggregator';

/* -------------------------------------------------------------------------- */
/* analyzeEmotion                                                              */
/* -------------------------------------------------------------------------- */

describe('analyzeEmotion · 情感三分类', () => {
  it('正面评论 → positive，情感分 > 0', () => {
    const r = analyzeEmotion('医生非常耐心，解释清楚，非常满意，谢谢', 5);
    expect(r.label).toBe('positive');
    expect(r.score).toBeGreaterThan(0);
    expect(r.hitKeywords.length).toBeGreaterThan(0);
  });

  it('负面评论 → negative，情感分 < 0', () => {
    const r = analyzeEmotion('排队太久了，等了两个小时，态度差，不耐烦', 2);
    expect(r.label).toBe('negative');
    expect(r.score).toBeLessThan(0);
  });

  it('无情感词但低分 → 强制 negative（评分交叉验证）', () => {
    const r = analyzeEmotion('还可以吧', 1);
    expect(r.label).toBe('negative');
  });

  it('空评论无评分 → neutral，情感分 0', () => {
    const r = analyzeEmotion('');
    expect(r.label).toBe('neutral');
    expect(r.score).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* NPS                                                                         */
/* -------------------------------------------------------------------------- */

describe('classifyNps / calcNps · NPS 计算', () => {
  it('9-10 → promoter，7-8 → passive，0-6 → detractor', () => {
    expect(classifyNps(10)).toBe('promoter');
    expect(classifyNps(9)).toBe('promoter');
    expect(classifyNps(8)).toBe('passive');
    expect(classifyNps(7)).toBe('passive');
    expect(classifyNps(6)).toBe('detractor');
    expect(classifyNps(0)).toBe('detractor');
  });

  it('NPS = %promoter - %detractor', () => {
    // 10 人：5 promoter / 2 passive / 3 detractor → 50% - 30% = 20
    expect(calcNps(5, 2, 3)).toBe(20);
  });

  it('空样本 NPS = 0，不除零', () => {
    expect(calcNps(0, 0, 0)).toBe(0);
  });

  it('全贬损者 NPS = -100', () => {
    expect(calcNps(0, 0, 10)).toBe(-100);
  });
});

/* -------------------------------------------------------------------------- */
/* analyzeFiveWhy                                                              */
/* -------------------------------------------------------------------------- */

describe('analyzeFiveWhy · 5Why 根因追问', () => {
  it('输出 5 层追问链，根因编码非空', () => {
    const r = analyzeFiveWhy({ comment: '排队太久了，等了两个小时', score: 2, channel: 'outpatient' });
    expect(r.chain.length).toBe(5);
    expect(r.rootCause).toBeTruthy();
    expect(r.rootCauseLabel).toBeTruthy();
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('排队关键词命中 → staffing_gap 默认根因', () => {
    const r = analyzeFiveWhy({ comment: '排队太久，排长队，候诊时间太长', score: 2 });
    expect(r.rootCause).toBe('staffing_gap');
  });

  it('费用关键词命中 → policy_unclear 根因', () => {
    const r = analyzeFiveWhy({ comment: '药费贵，乱收费，收费高', score: 3, channel: 'pharmacy' });
    expect(r.rootCause).toBe('policy_unclear');
  });

  it('无评论但低分 → 兜底 wait_time 类，不崩', () => {
    const r = analyzeFiveWhy({ score: 1 });
    expect(r.chain.length).toBe(5);
    expect(r.rootCause).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* buildDeepSatisfactionLoop                                                   */
/* -------------------------------------------------------------------------- */

const SIGNALS: DeepSatisfactionSignal[] = [
  { channel: 'outpatient', score: 2, comment: '排队太久，等了半天', dept: 'outpatient', date: '2026-09-20', npsScore: 4 },
  { channel: 'outpatient', score: 2, comment: '候诊太久，排长队', dept: 'outpatient', date: '2026-09-25', npsScore: 5 },
  { channel: 'outpatient', score: 3, comment: '医生态度差，不耐烦', dept: 'outpatient', date: '2026-09-28', npsScore: 3 },
  { channel: 'pharmacy', score: 3, comment: '费用贵，乱收费', dept: 'pharmacy', date: '2026-10-02', npsScore: 5 },
  { channel: 'outpatient', score: 3, comment: '来回跑，手续多', dept: 'outpatient', date: '2026-10-05', npsScore: 6 },
  { channel: 'inpatient', score: 5, comment: '护士耐心，非常满意', dept: 'nursing', date: '2026-10-06', npsScore: 10 },
  { channel: 'inpatient', score: 5, comment: '医生专业，感谢', dept: 'internal', date: '2026-10-08', npsScore: 9 },
  { channel: 'logistics', score: 2, comment: '卫生间有异味，等候区太吵', dept: 'logistics', date: '2026-10-10', npsScore: 4 },
  { channel: 'outpatient', score: 4, comment: '整体不错', dept: 'outpatient', date: '2026-10-12', npsScore: 8 },
  { channel: 'exam', score: 4, comment: '检查预约顺利', dept: 'exam', date: '2026-10-13', npsScore: 9 },
];

const PDCA: PdcaAction[] = [
  { actionId: 'a1', category: 'wait_time', phase: 'check', action: '高峰弹性排班', owner: '门诊部', dueDays: 14, beforeScore: 2.1, afterScore: 3.8 },
  { actionId: 'a2', category: 'staff_attitude', phase: 'act', action: '服务礼仪培训', owner: '医务处', dueDays: 14, beforeScore: 2.3, afterScore: 4.6 },
  { actionId: 'a3', category: 'cost', phase: 'plan', action: '费用清单自助打印', owner: '财务', dueDays: 14, beforeScore: 3.0 },
];

describe('buildDeepSatisfactionLoop · 深化闭环', () => {
  it('多渠道收集：total = 10，覆盖多个 channel', () => {
    const loop = buildDeepSatisfactionLoop(SIGNALS, PDCA);
    expect(loop.collect.total).toBe(10);
    expect(loop.collect.channels.length).toBeGreaterThanOrEqual(4);
    const channels = loop.collect.channels.map((c) => c.channel);
    expect(channels).toContain('outpatient');
    expect(channels).toContain('pharmacy');
    expect(channels).toContain('inpatient');
  });

  it('情感分布：positive/neutral/negative 三类都统计', () => {
    const loop = buildDeepSatisfactionLoop(SIGNALS, PDCA);
    expect(loop.collect.emotion.positive).toBeGreaterThan(0);
    expect(loop.collect.emotion.negative).toBeGreaterThan(0);
    expect(loop.collect.emotion.positive + loop.collect.emotion.neutral + loop.collect.emotion.negative).toBe(10);
    expect(loop.collect.emotion.negativeRatio).toBeGreaterThan(0);
  });

  it('5Why 根因：负面信号至少产出 1 条根因', () => {
    const loop = buildDeepSatisfactionLoop(SIGNALS, PDCA);
    expect(loop.analyze.rootCauses.length).toBeGreaterThan(0);
    for (const rc of loop.analyze.rootCauses) {
      expect(rc.chain.length).toBe(5);
    }
  });

  it('PDCA 阶段分布：plan/do/check/act 计数正确', () => {
    const loop = buildDeepSatisfactionLoop(SIGNALS, PDCA);
    expect(loop.improve.phaseDistribution.plan).toBe(1);
    expect(loop.improve.phaseDistribution.do).toBe(0);
    expect(loop.improve.phaseDistribution.check).toBe(1);
    expect(loop.improve.phaseDistribution.act).toBe(1);
    expect(loop.improve.actions.length).toBe(3);
  });

  it('NPS 汇总：promoter/passive/detractor 三档计数', () => {
    const loop = buildDeepSatisfactionLoop(SIGNALS, PDCA);
    // npsScore: 4,5,3,5,6,10,9,4,8,9 → promoter(9-10): 10,9,9 = 3; passive(7-8): 8 = 1; detractor(0-6): 其余 6
    expect(loop.nps.sampleSize).toBe(10);
    expect(loop.nps.promoterCount).toBe(3);
    expect(loop.nps.passiveCount).toBe(1);
    expect(loop.nps.detractorCount).toBe(6);
    // NPS = 30% - 60% = -30
    expect(loop.nps.nps).toBe(-30);
  });

  it('样本量 <10 标记 underpowered', () => {
    const small = SIGNALS.slice(0, 5);
    const loop = buildDeepSatisfactionLoop(small);
    expect(loop.collect.underpowered).toBe(true);
  });

  it('空输入不崩，返回零值闭环', () => {
    const loop = buildDeepSatisfactionLoop([], []);
    expect(loop.collect.total).toBe(0);
    expect(loop.nps.nps).toBe(0);
    expect(loop.improve.actions).toEqual([]);
  });

  it('不修改入参', () => {
    const snapshot = SIGNALS.map((s) => ({ ...s }));
    buildDeepSatisfactionLoop(SIGNALS, PDCA);
    expect(SIGNALS).toEqual(snapshot);
  });
});

/* -------------------------------------------------------------------------- */
/* analyzeSatisfactionTrend                                                   */
/* -------------------------------------------------------------------------- */

describe('analyzeSatisfactionTrend · 趋势分析', () => {
  const improving: TrendPoint[] = [
    { period: '2026-W35', sampleSize: 18, avgScore: 3.2, negativeRatio: 0.44, nps: 12 },
    { period: '2026-W36', sampleSize: 22, avgScore: 3.4, negativeRatio: 0.38, nps: 18 },
    { period: '2026-W37', sampleSize: 25, avgScore: 3.6, negativeRatio: 0.32, nps: 24 },
    { period: '2026-W38', sampleSize: 28, avgScore: 3.9, negativeRatio: 0.25, nps: 32 },
  ];

  it('均分上升 + 负面占比下降 → falling（问题收敛）', () => {
    const t = analyzeSatisfactionTrend('outpatient', improving);
    expect(t.signal).toBe('falling');
    expect(t.scoreDelta).toBeCloseTo(0.7, 1);
    expect(t.negativeRatioDelta).toBeCloseTo(-0.19, 1);
    expect(t.npsDelta).toBeCloseTo(20, 0);
  });

  it('均分下降 + 负面占比上升 → rising（恶化）', () => {
    const worsening: TrendPoint[] = [
      { period: 'W1', sampleSize: 20, avgScore: 4.0, negativeRatio: 0.20, nps: 40 },
      { period: 'W2', sampleSize: 22, avgScore: 3.5, negativeRatio: 0.35, nps: 20 },
    ];
    const t = analyzeSatisfactionTrend('pharmacy', worsening);
    expect(t.signal).toBe('rising');
    expect(t.scoreDelta).toBeLessThan(0);
    expect(t.negativeRatioDelta).toBeGreaterThan(0);
  });

  it('波动在区间内 → stable', () => {
    const flat: TrendPoint[] = [
      { period: 'W1', sampleSize: 20, avgScore: 3.7, negativeRatio: 0.30, nps: 25 },
      { period: 'W2', sampleSize: 21, avgScore: 3.75, negativeRatio: 0.29, nps: 26 },
    ];
    const t = analyzeSatisfactionTrend('surgery', flat);
    expect(t.signal).toBe('stable');
  });

  it('空序列不崩，返回 stable 与兜底简评', () => {
    const t = analyzeSatisfactionTrend('exam', []);
    expect(t.signal).toBe('stable');
    expect(t.summary).toBeTruthy();
  });
});

/* -------------------------------------------------------------------------- */
/* benchmarkSatisfaction                                                       */
/* -------------------------------------------------------------------------- */

describe('benchmarkSatisfaction · 对标', () => {
  it('本科室第一 → rank=1，summary 含「位列对标组第 1」', () => {
    const b = benchmarkSatisfaction(
      { dept: '本院', avgScore: 4.5, negativeRatio: 0.10, nps: 60, sampleSize: 100 },
      [
        { name: '区域均值', avgScore: 3.7, negativeRatio: 0.30, nps: 25 },
        { name: '三甲标杆', avgScore: 4.4, negativeRatio: 0.12, nps: 55 },
      ],
    );
    expect(b.rank).toBe(1);
    expect(b.total).toBe(3);
    expect(b.scoreGapToBest).toBe(0);
    expect(b.summary).toContain('第 1');
  });

  it('本科室落后标杆 0.5+ → 差距为负，summary 含「落后」', () => {
    const b = benchmarkSatisfaction(
      { dept: '本院', avgScore: 3.2, negativeRatio: 0.45, nps: 10, sampleSize: 80 },
      [
        { name: '区域均值', avgScore: 3.7, negativeRatio: 0.30, nps: 25 },
        { name: '三甲标杆', avgScore: 4.4, negativeRatio: 0.12, nps: 55 },
      ],
    );
    expect(b.rank).toBe(3);
    expect(b.scoreGapToBest).toBeLessThan(0);
    expect(b.summary).toContain('落后');
  });

  it('只对标一个同行 → total=2', () => {
    const b = benchmarkSatisfaction(
      { dept: '本院', avgScore: 3.8, negativeRatio: 0.28, nps: 28, sampleSize: 60 },
      [{ name: '区域均值', avgScore: 3.7, negativeRatio: 0.30, nps: 25 }],
    );
    expect(b.total).toBe(2);
    expect(b.rank).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */
/* generatePatientVoiceReport                                                  */
/* -------------------------------------------------------------------------- */

describe('generatePatientVoiceReport · 患者之声', () => {
  it('输出高频负面词、正/负面原声、改进建议', () => {
    const r = generatePatientVoiceReport('2026-Q4', SIGNALS);
    expect(r.period).toBe('2026-Q4');
    expect(r.totalSignals).toBe(10);
    expect(r.topNegativeKeywords.length).toBeGreaterThan(0);
    expect(r.negativeQuotes.length).toBeGreaterThan(0);
    expect(r.positiveQuotes.length).toBeGreaterThan(0);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it('空输入不崩', () => {
    const r = generatePatientVoiceReport('2026-Q4', []);
    expect(r.totalSignals).toBe(0);
    expect(r.topNegativeKeywords).toEqual([]);
    expect(r.recommendations).toEqual([]);
  });
});
