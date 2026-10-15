/**
 * 健澜科技数智医院智能体 - 系统智慧度评分聚合器（M133-D）
 *
 * 【SaaS化+智慧度】面向多租户医院的统一智慧度度量：把分散在各业务域的
 * 原始计数，折算成一个 0-100 的「系统智慧度总分」，并按六维加权给出明细，
 * 让每家医院在管理驾驶舱里都能看到「我这所医院的 AI 到底变聪明了多少」。
 *
 * 六维加权（百分制，权重之和 = 100%）：
 *   - experienceAccumulation 经验沉淀量   20%  专家经验/病例复盘/FAQ 累计条数
 *   - recommendationAdoption  推荐采纳率   20%  被医生采纳（含修改采纳*0.5）/ 推荐总数
 *   - learningEngineActivity  学习引擎活跃度 15%  周期内学习/微调/知识更新动作次数
 *   - knowledgeCoverage       知识覆盖率   15%  已覆盖知识域 / 应覆盖知识域
 *   - automationRate          自动化率   15%  自动闭环任务 / 总任务
 *   - userSatisfaction       用户满意度   15%  满意评价 / 评价总数
 *
 * 分层（与 systemIntelligenceAggregator 同款生产纪律）：
 *  - calculateSystemIntelligenceScore(hospitalId, metrics)：纯函数。输入采集端
 *    原始计数快照，输出总分、六维明细（含每维怎么算的）、等级与弱项列表，
 *    无 IO、无时钟副作用，可直接单测。
 *  - getIntelligenceTrend(hospitalId, days, history?)：纯函数。把多天的快照
 *    聚合成趋势线 + 环比/均值/极值，供管理端折线图使用。
 *  - recordXxx / collectRawMetrics：模块内内存采集（零新依赖），计数器在进程内
 *    累加；DEMO 或尚无样本时由路由层打 demo 标记，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                 */
/* ------------------------------------------------------------------ */

/** 六个维度的稳定键名 */
export type IntelligenceDimension =
  | 'experienceAccumulation'
  | 'recommendationAdoption'
  | 'learningEngineActivity'
  | 'knowledgeCoverage'
  | 'automationRate'
  | 'userSatisfaction';

/** 等级 */
export type IntelligenceTier = 'outstanding' | 'excellent' | 'good' | 'pass' | 'weak';

/** 采集端原始计数快照（未折算比率）：纯函数仅消费本结构 */
export interface IntelligenceMetrics {
  /** 经验沉淀量：累计沉淀的经验条目数（专家经验、病例复盘、FAQ 等） */
  experienceEntries: number;
  /** 推荐：医生直接采纳条数 */
  recommendationAdopted: number;
  /** 推荐：医生修改后采纳条数（按半权计入正向） */
  recommendationModified: number;
  /** 推荐：推荐总条数 */
  recommendationTotal: number;
  /** 学习引擎活跃度：周期内学习/微调/知识更新动作次数 */
  learningActivities: number;
  /** 知识覆盖率：已覆盖知识域数 */
  knowledgeCovered: number;
  /** 知识覆盖率：应覆盖知识域总数（分母） */
  knowledgeTotal: number;
  /** 自动化率：自动闭环任务数 */
  automatedTasks: number;
  /** 自动化率：任务总数（分母） */
  totalTasks: number;
  /** 用户满意度：满意评价条数 */
  satisfactionPositive: number;
  /** 用户满意度：评价总条数（分母） */
  satisfactionTotal: number;
}

/** 单维度明细（可解释：前端要能看到「这 80 分是怎么算出来的」） */
export interface DimensionDetail {
  /** 维度键 */
  key: IntelligenceDimension;
  /** 维度中文名 */
  name: string;
  /** 权重（0-100） */
  weight: number;
  /** 该维度折算后的百分制得分（0-100） */
  score: number;
  /** 加权贡献 = score * weight / 100（加到总分上的部分） */
  weightedContribution: number;
  /** 原始输入快照（让前端展示分子/分母或计数） */
  raw: Record<string, number>;
  /** 人话解释：本维度怎么算的 */
  formula: string;
  /** 是否弱项（< 60 分） */
  isWeak: boolean;
}

/** 评分输出 */
export interface IntelligenceScore {
  hospitalId: string;
  /** 总分（0-100，保留 1 位小数） */
  totalScore: number;
  /** 等级 */
  tier: IntelligenceTier;
  /** 等级中文名 */
  tierLabel: string;
  /** 六维明细（按权重降序） */
  dimensions: DimensionDetail[];
  /** 弱项维度（score < 60） */
  weakDimensions: DimensionDetail[];
  /** 是否演示模式（无真实样本时由采集端置位） */
  demo: boolean;
  /** 生成时间（注入，便于测试） */
  generatedAt: string;
}

/** 趋势单点 */
export interface IntelligenceTrendPoint {
  /** 日期标签（YYYY-MM-DD，由调用方注入） */
  date: string;
  /** 当日总分（0-100） */
  score: number;
  /** 当日等级 */
  tier: IntelligenceTier;
}

/** 趋势输出 */
export interface IntelligenceTrend {
  hospitalId: string;
  /** 查询天数窗口 */
  days: number;
  /** 趋势点（旧→新） */
  points: IntelligenceTrendPoint[];
  /** 期末较期初变化（末点 - 首点，正=上升） */
  delta: number;
  /** 窗口内平均分 */
  avgScore: number;
  /** 窗口内最高分 */
  bestScore: number;
  /** 窗口内最低分 */
  worstScore: number;
}

/* ------------------------------------------------------------------ */
/* 维度元数据（权重、目标值、说明）                                     */
/* ------------------------------------------------------------------ */

/** 经验沉淀量目标：累计 500 条经验 = 满分（饱和曲线阈值） */
const EXPERIENCE_TARGET = 500;
/** 学习引擎活跃度目标：周期内 200 次学习动作 = 满分 */
const LEARNING_ACTIVITY_TARGET = 200;

interface DimensionMeta {
  key: IntelligenceDimension;
  name: string;
  weight: number;
  /** 把原始 metrics 折算成 0-100 分 */
  normalize: (m: IntelligenceMetrics) => { score: number; raw: Record<string, number>; formula: string };
}

/** 比率折算：分子/分母；分母 ≤ 0 返回 0；clamp 到 [0,1]；乘 100 转百分制 */
function rateToScore(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const r = Math.min(1, Math.max(0, numerator / denominator));
  return Math.round(r * 1000) / 10; // 保留 1 位小数
}

/** 计数饱和折算：达到 target 即满分；未达则按比例；超过 target 截 100 */
function countToScore(count: number, target: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  const s = (count / target) * 100;
  return Math.round(Math.min(100, Math.max(0, s)) * 10) / 10;
}

const DIMENSION_META: DimensionMeta[] = [
  {
    key: 'experienceAccumulation',
    name: '经验沉淀量',
    weight: 20,
    normalize: (m) => {
      const score = countToScore(m.experienceEntries, EXPERIENCE_TARGET);
      return {
        score,
        raw: { entries: m.experienceEntries, target: EXPERIENCE_TARGET },
        formula: `累计经验 ${m.experienceEntries} 条 / 目标 ${EXPERIENCE_TARGET} 条 × 100（饱和截顶 100）`,
      };
    },
  },
  {
    key: 'recommendationAdoption',
    name: '推荐采纳率',
    weight: 20,
    normalize: (m) => {
      const positive = m.recommendationAdopted + m.recommendationModified * 0.5;
      const score = rateToScore(positive, m.recommendationTotal);
      return {
        score,
        raw: {
          adopted: m.recommendationAdopted,
          modified: m.recommendationModified,
          total: m.recommendationTotal,
        },
        formula: `(直接采纳 ${m.recommendationAdopted} + 修改采纳 ${m.recommendationModified}×0.5) / 推荐总数 ${m.recommendationTotal} × 100`,
      };
    },
  },
  {
    key: 'learningEngineActivity',
    name: '学习引擎活跃度',
    weight: 15,
    normalize: (m) => {
      const score = countToScore(m.learningActivities, LEARNING_ACTIVITY_TARGET);
      return {
        score,
        raw: { activities: m.learningActivities, target: LEARNING_ACTIVITY_TARGET },
        formula: `周期内学习动作 ${m.learningActivities} 次 / 目标 ${LEARNING_ACTIVITY_TARGET} 次 × 100（饱和截顶 100）`,
      };
    },
  },
  {
    key: 'knowledgeCoverage',
    name: '知识覆盖率',
    weight: 15,
    normalize: (m) => {
      const score = rateToScore(m.knowledgeCovered, m.knowledgeTotal);
      return {
        score,
        raw: { covered: m.knowledgeCovered, total: m.knowledgeTotal },
        formula: `已覆盖知识域 ${m.knowledgeCovered} / 应覆盖 ${m.knowledgeTotal} × 100`,
      };
    },
  },
  {
    key: 'automationRate',
    name: '自动化率',
    weight: 15,
    normalize: (m) => {
      const score = rateToScore(m.automatedTasks, m.totalTasks);
      return {
        score,
        raw: { automated: m.automatedTasks, total: m.totalTasks },
        formula: `自动闭环任务 ${m.automatedTasks} / 任务总数 ${m.totalTasks} × 100`,
      };
    },
  },
  {
    key: 'userSatisfaction',
    name: '用户满意度',
    weight: 15,
    normalize: (m) => {
      const score = rateToScore(m.satisfactionPositive, m.satisfactionTotal);
      return {
        score,
        raw: { positive: m.satisfactionPositive, total: m.satisfactionTotal },
        formula: `满意评价 ${m.satisfactionPositive} / 评价总数 ${m.satisfactionTotal} × 100`,
      };
    },
  },
];

/** 弱项阈值：维度得分 < 60 视为待提升 */
export const WEAK_DIMENSION_THRESHOLD = 60;

/* ------------------------------------------------------------------ */
/* 纯函数：等级判定                                                    */
/* ------------------------------------------------------------------ */

/** 总分 → 等级 */
export function tierOf(totalScore: number): { tier: IntelligenceTier; label: string } {
  if (totalScore >= 90) return { tier: 'outstanding', label: '卓越' };
  if (totalScore >= 80) return { tier: 'excellent', label: '优秀' };
  if (totalScore >= 70) return { tier: 'good', label: '良好' };
  if (totalScore >= 60) return { tier: 'pass', label: '合格' };
  return { tier: 'weak', label: '待提升' };
}

/* ------------------------------------------------------------------ */
/* 纯函数：calculateSystemIntelligenceScore                             */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：把六维原始计数折算成系统智慧度总分。
 *
 * - 每一维先按各自口径折算成 0-100 分；
 * - 总分 = Σ(维度分 × 权重 / 100)，权重和 = 100%；
 * - 返回每一维的明细（原始输入、公式、加权贡献、是否弱项），可解释；
 * - 不读时钟、不查库，generatedAt 由调用方注入。
 *
 * @param hospitalId 医院 ID（租户隔离标签，纯透传）
 * @param metrics    六维原始计数快照
 * @param nowIso     生成时间（注入，便于测试）；默认 new Date().toISOString()
 * @param demo       是否演示模式（无真实样本时由采集端置位）
 */
export function calculateSystemIntelligenceScore(
  hospitalId: string,
  metrics: IntelligenceMetrics,
  nowIso: string = new Date().toISOString(),
  demo = false,
): IntelligenceScore {
  const dimensions: DimensionDetail[] = DIMENSION_META.map((meta) => {
    const { score, raw, formula } = meta.normalize(metrics);
    return {
      key: meta.key,
      name: meta.name,
      weight: meta.weight,
      score,
      weightedContribution: Math.round((score * meta.weight) / 100 * 10) / 10,
      raw,
      formula,
      isWeak: score < WEAK_DIMENSION_THRESHOLD,
    };
  });

  const total = Math.round(dimensions.reduce((sum, d) => sum + d.weightedContribution, 0) * 10) / 10;
  const { tier, label } = tierOf(total);

  return {
    hospitalId,
    totalScore: total,
    tier,
    tierLabel: label,
    dimensions,
    weakDimensions: dimensions.filter((d) => d.isWeak),
    demo,
    generatedAt: nowIso,
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数：getIntelligenceTrend                                        */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：把多天的快照聚合成趋势。
 *
 * - 入参 history 为「日期 + 当日原始计数」序列（旧→新）；
 * - 逐日用 calculateSystemIntelligenceScore 算分，再聚合 delta/avg/best/worst；
 * - 不读时钟、不查库；days 仅作为窗口标签透传，实际长度由 history 决定。
 *
 * @param hospitalId 医院 ID
 * @param days       窗口天数（标签，如 30）
 * @param history    历史日快照（由调用方从持久层/内存缓冲注入）
 */
export function getIntelligenceTrend(
  hospitalId: string,
  days: number,
  history: Array<{ date: string; metrics: IntelligenceMetrics }> = [],
): IntelligenceTrend {
  const points: IntelligenceTrendPoint[] = history.map((h) => {
    const s = calculateSystemIntelligenceScore(hospitalId, h.metrics, h.date);
    return { date: h.date, score: s.totalScore, tier: s.tier };
  });

  if (points.length === 0) {
    return {
      hospitalId,
      days,
      points: [],
      delta: 0,
      avgScore: 0,
      bestScore: 0,
      worstScore: 0,
    };
  }

  const scores = points.map((p) => p.score);
  const sum = scores.reduce((a, b) => a + b, 0);
  const first = scores[0];
  const last = scores[scores.length - 1];

  return {
    hospitalId,
    days,
    points,
    delta: Math.round((last - first) * 10) / 10,
    avgScore: Math.round((sum / scores.length) * 10) / 10,
    bestScore: Math.round(Math.max(...scores) * 10) / 10,
    worstScore: Math.round(Math.min(...scores) * 10) / 10,
  };
}

/* ------------------------------------------------------------------ */
/* 进程内内存采集（零新依赖）                                           */
/* ------------------------------------------------------------------ */

/** 趋势序列最大保留天数（滚动窗口） */
const HISTORY_CAP = 90;

const counter: IntelligenceMetrics = {
  experienceEntries: 0,
  recommendationAdopted: 0,
  recommendationModified: 0,
  recommendationTotal: 0,
  learningActivities: 0,
  knowledgeCovered: 0,
  knowledgeTotal: 0,
  automatedTasks: 0,
  totalTasks: 0,
  satisfactionPositive: 0,
  satisfactionTotal: 0,
};

/** 滚动历史序列（由旧到新） */
const historyBuffer: Array<{ date: string; metrics: IntelligenceMetrics }> = [];

/** 记录一条经验沉淀 */
export function recordExperience(count = 1): void {
  counter.experienceEntries += count;
}

/** 记录一次推荐的医生决策 */
export function recordRecommendation(decision: 'adopted' | 'modified' | 'rejected'): void {
  counter.recommendationTotal += 1;
  if (decision === 'adopted') counter.recommendationAdopted += 1;
  else if (decision === 'modified') counter.recommendationModified += 1;
}

/** 记录一次学习/微调/知识更新动作 */
export function recordLearningActivity(count = 1): void {
  counter.learningActivities += count;
}

/** 登记一个知识域的覆盖情况 */
export function recordKnowledgeDomain(covered: boolean): void {
  counter.knowledgeTotal += 1;
  if (covered) counter.knowledgeCovered += 1;
}

/** 记录一次任务的自动化闭环情况 */
export function recordTask(automated: boolean): void {
  counter.totalTasks += 1;
  if (automated) counter.automatedTasks += 1;
}

/** 记录一次用户评价 */
export function recordSatisfaction(positive: boolean): void {
  counter.satisfactionTotal += 1;
  if (positive) counter.satisfactionPositive += 1;
}

/**
 * 将当前累计计数作为一个历史日压入滚动窗口（日终调度触发；本模块不自带定时器）。
 * counters 不重置——趋势刻画的是「累计快照」而非重置后的增量，避免冷启动抖动。
 */
export function snapshotIntelligenceDay(date: string): void {
  historyBuffer.push({ date, metrics: { ...counter } });
  while (historyBuffer.length > HISTORY_CAP) historyBuffer.shift();
}

/** 采集当前原始快照（路由层唯一入口） */
export function collectRawMetrics(): { metrics: IntelligenceMetrics; demo: boolean } {
  const hasSamples =
    counter.experienceEntries > 0 ||
    counter.recommendationTotal > 0 ||
    counter.learningActivities > 0 ||
    counter.knowledgeTotal > 0 ||
    counter.totalTasks > 0 ||
    counter.satisfactionTotal > 0;
  return {
    metrics: { ...counter },
    demo: !hasSamples,
  };
}

/** 读取历史缓冲（路由层拼趋势用） */
export function collectHistory(): Array<{ date: string; metrics: IntelligenceMetrics }> {
  return historyBuffer.map((h) => ({ date: h.date, metrics: { ...h.metrics } }));
}
