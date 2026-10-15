/**
 * 健澜科技 jlmedaios - 个人智能体成长报告聚合器（M146-B · 让每个员工有成就感）
 *
 * 【越用越聪明深化】Personal Agent 每被员工使用一次，就在其个人成长台账里
 * 留下一笔正反馈：经验沉淀（成功+失败教训）、AI 建议采纳、技能标签演进、
 * 帮助同事、月度成长分。本聚合器把这些零散行为收敛为一张可炫耀的成长报告，
 * 并与同侪均值对比，让员工直观看到「我越用越强」。
 *
 * 医疗安全与隐私红线：
 *  - 仅产出员工本人的脱敏统计与标签，不含患者 PII / 诊疗明细；
 *  - 同侪对比只发聚合均值与分位，不下发任何他人姓名 / 明细；
 *  - 纯函数：不触库、不碰 WebSocket、零新增依赖；入参唯一、结果确定可单测。
 *
 * 真实环境应替换为 medmuse.personal_growth_snapshot 持久层读取；此处以
 * staffId 哈希派生确定性种子台账，保证路由在无库时仍可返回稳定可测结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 经验沉淀汇总（成功 + 失败教训，失败同样是财富） */
export interface ExperienceSummary {
  /** 累计成功经验条数 */
  totalSuccess: number;
  /** 累计失败教训条数 */
  totalFailure: number;
  /** 沉淀总量 */
  total: number;
  /** 教训占比 0~1（失败/总量，帮助复盘） */
  lessonRate: number;
}

/** AI 采纳情况 */
export interface AiAdoption {
  /** 建议下发总次数 */
  suggested: number;
  /** 建议被采纳次数 */
  accepted: number;
  /** 采纳率 0~1（accepted/suggested；suggested 为 0 时记 0） */
  rate: number;
}

/** 技能标签变化（当月 vs 3 月前） */
export interface SkillTagChange {
  /** 当月技能标签 */
  current: string[];
  /** 3 个月前技能标签 */
  threeMonthsAgo: string[];
  /** 3 个月内新增标签 */
  added: string[];
  /** 3 个月内退出标签 */
  removed: string[];
}

/** 单月成长点 */
export interface GrowthPoint {
  /** 月份 YYYY-MM */
  month: string;
  /** 成长分 0~100 */
  score: number;
}

/** 成长曲线（含 vs 3 月前对比） */
export interface GrowthCurve {
  /** 近 6 个月成长曲线 */
  months: GrowthPoint[];
  /** 当月成长分 */
  currentScore: number;
  /** 3 个月前成长分 */
  scoreThreeMonthsAgo: number;
  /** 差值 = 当月 - 3 月前 */
  delta: number;
  /** 趋势方向 */
  direction: 'up' | 'down' | 'flat';
}

/** 成就徽章 */
export interface AchievementBadge {
  /** 徽章 code（稳定标识，用于前端映射图标） */
  code: string;
  /** 徽章名 */
  name: string;
  /** 解锁条件描述 */
  description: string;
  /** 是否已解锁 */
  earned: boolean;
  /** 解锁月份 YYYY-MM（未解锁为 null） */
  earnedAt: string | null;
}

/** 个人智能体成长报告 */
export interface PersonalAgentReport {
  staffId: string;
  /** 报告生成时间（ISO） */
  generatedAt: string;
  /** 经验沉淀（成功/失败） */
  experience: ExperienceSummary;
  /** AI 采纳率 */
  aiAdoption: AiAdoption;
  /** 技能标签变化 */
  skillTags: SkillTagChange;
  /** 帮助同事人次 */
  helpedColleagues: number;
  /** 成长曲线 vs 3 月前 */
  growth: GrowthCurve;
  /** 全部徽章（含未解锁，前端可灰度展示） */
  badges: AchievementBadge[];
  /** 已解锁徽章数 */
  earnedBadgeCount: number;
}

/** 单个指标的同侪对比 */
export interface PeerMetric {
  /** 本人取值 */
  self: number;
  /** 同侪均值 */
  cohortAvg: number;
  /** 差值 = 本人 - 均值 */
  delta: number;
  /** 在同侪中的分位 0~100（越高越靠前） */
  percentile: number;
  /** 一句话评价 */
  label: string;
}

/** 同侪对比结果 */
export interface PeerComparison {
  staffId: string;
  /** 同侪样本规模（含本人） */
  cohortSize: number;
  experienceTotal: PeerMetric;
  aiAdoptionRate: PeerMetric;
  helpedColleagues: PeerMetric;
  growthScore: PeerMetric;
  /** 一句话总结 */
  summary: string;
}

/* ------------------------------ 常量与口径 ------------------------------ */

/** 成长曲线月数 */
export const GROWTH_MONTHS = 6;
/** 同侪样本规模（合成种子同侪数，不含本人） */
export const PEER_POOL_SIZE = 12;
/** AI 搭子徽章门槛：采纳率 */
export const AI_BUDDY_RATE = 0.5;
/** 良师益友徽章门槛：帮助同事人次 */
export const MENTOR_HELP_THRESHOLD = 5;
/** 经验丰饶徽章门槛：成功经验数 */
export const RICH_SUCCESS_THRESHOLD = 20;
/** 屡败屡战徽章门槛：失败教训数 */
export const RESILIENT_FAILURE_THRESHOLD = 3;

/** 技能标签池（脱敏通用标签） */
const SKILL_POOL = [
  '病历书写',
  '处方审核',
  '急诊分诊',
  '静脉护理',
  '抗凝管理',
  '老年综合',
  '儿科常见',
  '影像判读',
  '用药教育',
  '出院随访',
  '检验解读',
  '感染防控',
];

/* ------------------------------ 确定性台账 ------------------------------ */

/** djb2 字符串哈希：把 staffId 收敛为 32 位种子 */
function djb2(input: string): number {
  let h = 5381;
  const s = input ?? '';
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32：由种子产出确定性 [0,1) 随机序列（纯函数、结果可复现） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 近 N 个月 YYYY-MM 标签（含当月），最旧在前 */
function recentMonths(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** 单月台账（越用越聪明深化：每个月的行为流水） */
interface MonthlyLedger {
  month: string;
  success: number;
  failure: number;
  aiSuggested: number;
  aiAccepted: number;
  helped: number;
  score: number;
  tags: string[];
}

/** 由 staffId 哈希派生近 6 个月确定性台账 */
function buildMonthlyLedger(staffId: string): MonthlyLedger[] {
  const rand = mulberry32(djb2(staffId || 'anonymous'));
  const months = recentMonths(GROWTH_MONTHS);
  const ledger: MonthlyLedger[] = [];

  for (let i = 0; i < GROWTH_MONTHS; i++) {
    const success = 1 + Math.floor(rand() * 6); // 1..6
    const failure = Math.floor(rand() * 3); // 0..2
    const aiSuggested = 4 + Math.floor(rand() * 9); // 4..12
    const aiAccepted = Math.floor(rand() * (aiSuggested + 1)); // 0..aiSuggested
    const helped = Math.floor(rand() * 4); // 0..3

    // 成长分 0~100：采纳率 40 + 经验 35 + 互助 25
    const adoptionRate = aiSuggested > 0 ? aiAccepted / aiSuggested : 0;
    const score = Math.round(
      Math.min(
        100,
        40 * adoptionRate + 35 * Math.min(1, success / 6) + 25 * Math.min(1, helped / 3),
      ),
    );

    // 技能标签：每月从池中选 3~6 个，按哈希漂移
    const tagCount = 3 + Math.floor(rand() * 4);
    const offset = Math.floor(rand() * SKILL_POOL.length);
    const tags: string[] = [];
    for (let k = 0; k < tagCount; k++) {
      tags.push(SKILL_POOL[(offset + k) % SKILL_POOL.length]);
    }

    ledger.push({ month: months[i], success, failure, aiSuggested, aiAccepted, helped, score, tags });
  }
  return ledger;
}

/* ------------------------------ 徽章计算 ------------------------------ */

/**
 * evaluateBadges：根据累计指标评估徽章解锁（纯函数，便于单测）。
 *
 * 【越用越聪明深化】徽章是给员工的正反馈设计：哪怕刚起步也能拿到「初露锋芒」，
 * 失败教训多了反而解锁「屡败屡战」——鼓励复盘而不是只表扬成功。
 */
export function evaluateBadges(input: {
  totalSuccess: number;
  totalFailure: number;
  aiAdoptionRate: number;
  aiSuggested: number;
  helpedColleagues: number;
  growthDirection: 'up' | 'down' | 'flat';
  currentMonth: string;
  earliestBadgeMonth: string;
}): AchievementBadge[] {
  const { totalSuccess, totalFailure, aiAdoptionRate, aiSuggested, helpedColleagues, growthDirection, currentMonth, earliestBadgeMonth } = input;

  const defs: Array<{ code: string; name: string; description: string; earned: boolean; earnedAt: string | null }> = [
    {
      code: 'first_lesson',
      name: '初露锋芒',
      description: '沉淀第 1 条经验',
      earned: totalSuccess + totalFailure >= 1,
      earnedAt: totalSuccess + totalFailure >= 1 ? earliestBadgeMonth : null,
    },
    {
      code: 'resilient',
      name: '屡败屡战',
      description: `累计 ${RESILIENT_FAILURE_THRESHOLD} 条失败教训（复盘是成长的捷径）`,
      earned: totalFailure >= RESILIENT_FAILURE_THRESHOLD,
      earnedAt: totalFailure >= RESILIENT_FAILURE_THRESHOLD ? currentMonth : null,
    },
    {
      code: 'ai_buddy',
      name: 'AI 搭子',
      description: `AI 建议采纳率 ≥ ${Math.round(AI_BUDDY_RATE * 100)}% 且建议 ≥ 10 次`,
      earned: aiAdoptionRate >= AI_BUDDY_RATE && aiSuggested >= 10,
      earnedAt: aiAdoptionRate >= AI_BUDDY_RATE && aiSuggested >= 10 ? currentMonth : null,
    },
    {
      code: 'mentor',
      name: '良师益友',
      description: `累计帮助同事 ≥ ${MENTOR_HELP_THRESHOLD} 人次`,
      earned: helpedColleagues >= MENTOR_HELP_THRESHOLD,
      earnedAt: helpedColleagues >= MENTOR_HELP_THRESHOLD ? currentMonth : null,
    },
    {
      code: 'steady_climber',
      name: '稳健进阶',
      description: '成长分较 3 个月前上升',
      earned: growthDirection === 'up',
      earnedAt: growthDirection === 'up' ? currentMonth : null,
    },
    {
      code: 'rich_knowledge',
      name: '经验丰饶',
      description: `累计成功经验 ≥ ${RICH_SUCCESS_THRESHOLD} 条`,
      earned: totalSuccess >= RICH_SUCCESS_THRESHOLD,
      earnedAt: totalSuccess >= RICH_SUCCESS_THRESHOLD ? currentMonth : null,
    },
  ];

  return defs.map((d) => ({ ...d }));
}

/* ------------------------------ 报告构建 ------------------------------ */

/**
 * buildPersonalAgentReport：构建个人智能体成长报告（纯函数）。
 *
 * 口径：
 *  1. 由 staffId 哈希派生近 6 个月台账（确定性、无副作用）；
 *  2. 汇总 6 个月的经验、AI 采纳、互助；
 *  3. 技能标签对比「当月」与「3 个月前那一月」；
 *  4. 成长曲线取各月成长分，vs 3 月前那一月算 delta 与方向；
 *  5. 徽章经 evaluateBadges 评估，至少保证「初露锋芒」这类起步徽章可达成。
 */
export function buildPersonalAgentReport(staffId: string): PersonalAgentReport {
  const ledger = buildMonthlyLedger(staffId);
  const months = ledger.map((l) => l.month);
  const currentMonth = months[months.length - 1];
  const earliestMonth = months[0];

  // 汇总 6 个月
  const totalSuccess = ledger.reduce((s, l) => s + l.success, 0);
  const totalFailure = ledger.reduce((s, l) => s + l.failure, 0);
  const aiSuggested = ledger.reduce((s, l) => s + l.aiSuggested, 0);
  const aiAccepted = ledger.reduce((s, l) => s + l.aiAccepted, 0);
  const helpedColleagues = ledger.reduce((s, l) => s + l.helped, 0);

  const aiAdoptionRate = aiSuggested > 0 ? aiAccepted / aiSuggested : 0;

  // 技能标签：当月 vs 3 个月前（index 2 = 距当月 3 个月的那一月）
  const cur = ledger[ledger.length - 1].tags.slice().sort();
  const threeBackIdx = Math.max(0, ledger.length - 4); // 6 个月里第 3 个（距当月 3 个月）
  const threeBack = ledger[threeBackIdx].tags.slice().sort();
  const added = cur.filter((t) => !threeBack.includes(t));
  const removed = threeBack.filter((t) => !cur.includes(t));

  // 成长曲线 vs 3 月前
  const currentScore = ledger[ledger.length - 1].score;
  const scoreThreeMonthsAgo = ledger[threeBackIdx].score;
  const delta = currentScore - scoreThreeMonthsAgo;
  const direction: 'up' | 'down' | 'flat' = delta > 2 ? 'up' : delta < -2 ? 'down' : 'flat';

  const badges = evaluateBadges({
    totalSuccess,
    totalFailure,
    aiAdoptionRate,
    aiSuggested,
    helpedColleagues,
    growthDirection: direction,
    currentMonth,
    earliestBadgeMonth: earliestMonth,
  });

  return {
    staffId,
    generatedAt: new Date().toISOString(),
    experience: {
      totalSuccess,
      totalFailure,
      total: totalSuccess + totalFailure,
      lessonRate: totalSuccess + totalFailure > 0 ? totalFailure / (totalSuccess + totalFailure) : 0,
    },
    aiAdoption: {
      suggested: aiSuggested,
      accepted: aiAccepted,
      rate: aiAdoptionRate,
    },
    skillTags: {
      current: cur,
      threeMonthsAgo: threeBack,
      added,
      removed,
    },
    helpedColleagues,
    growth: {
      months: ledger.map((l) => ({ month: l.month, score: l.score })),
      currentScore,
      scoreThreeMonthsAgo,
      delta,
      direction,
    },
    badges,
    earnedBadgeCount: badges.filter((b) => b.earned).length,
  };
}

/* ------------------------------ 同侪对比 ------------------------------ */

/** 把单个指标收敛成 PeerMetric（纯函数） */
function buildPeerMetric(self: number, cohort: number[], label: string): PeerMetric {
  const arr = cohort.slice().sort((a, b) => a - b);
  const cohortAvg = arr.reduce((s, v) => s + v, 0) / (arr.length || 1);
  // 分位：小于等于 self 的样本占比（含本人）
  const percentile = arr.length === 0 ? 50 : Math.round(((arr.filter((v) => v <= self).length) / arr.length) * 100);
  const delta = self - cohortAvg;
  return {
    self,
    cohortAvg: Math.round(cohortAvg * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    percentile,
    label: percentile >= 60 ? `${label}·领先同侪` : percentile <= 40 ? `${label}·有待提升` : `${label}·接近均值`,
  };
}

/**
 * getPeerComparison：本人 vs 合成同侪池（纯函数）。
 *
 * 【越用越聪明深化】同侪对比只发聚合均值与分位，绝不发任何他人姓名/明细，
 * 让员工知道自己在人群中的位置，又不制造排名焦虑。
 */
export function getPeerComparison(staffId: string): PeerComparison {
  const self = buildPersonalAgentReport(staffId);

  // 合成同侪池：由 staffId 派生另一颗种子，独立生成 PEER_POOL_SIZE 个同侪
  const rand = mulberry32(djb2(`peer:${staffId || 'anonymous'}`));
  const peerSuccess: number[] = [];
  const peerFailure: number[] = [];
  const peerAdoption: number[] = [];
  const peerHelped: number[] = [];
  const peerScore: number[] = [];

  for (let i = 0; i < PEER_POOL_SIZE; i++) {
    peerSuccess.push(6 + Math.floor(rand() * 30)); // 6..35
    peerFailure.push(Math.floor(rand() * 10)); // 0..9
    peerAdoption.push(Math.round(rand() * 100) / 100);
    peerHelped.push(Math.floor(rand() * 12)); // 0..11
    peerScore.push(Math.floor(rand() * 80) + 20); // 20..99
  }

  // 把本人并入同侪数组算分位（含本人）
  const expTotal = buildPeerMetric(
    self.experience.total,
    [...peerSuccess.map((s, i) => s + peerFailure[i]), self.experience.total],
    '经验沉淀',
  );
  const adoption = buildPeerMetric(
    Math.round(self.aiAdoption.rate * 100) / 100,
    [...peerAdoption, Math.round(self.aiAdoption.rate * 100) / 100],
    'AI 采纳',
  );
  const helped = buildPeerMetric(
    self.helpedColleagues,
    [...peerHelped, self.helpedColleagues],
    '互助',
  );
  const score = buildPeerMetric(
    self.growth.currentScore,
    [...peerScore, self.growth.currentScore],
    '成长分',
  );

  const avgPercentile = Math.round((expTotal.percentile + adoption.percentile + helped.percentile + score.percentile) / 4);
  const summary =
    avgPercentile >= 60
      ? '你在同侪中处于前列，继续保持「越用越聪明」的势头。'
      : avgPercentile <= 40
        ? '你刚起步或近期投入偏少，多用多沉淀，成长曲线会很快抬头。'
        : '你与同侪均值接近，再坚持一两个周期就能看到明显领先。';

  return {
    staffId,
    cohortSize: PEER_POOL_SIZE + 1,
    experienceTotal: expTotal,
    aiAdoptionRate: adoption,
    helpedColleagues: helped,
    growthScore: score,
    summary,
  };
}
