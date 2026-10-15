/**
 * 健澜科技 jlmedaios - 医院智慧资产看板聚合器（M146-A，越用越聪明深化）
 *
 * 让院长一眼看到「医院越来越聪明」：把全院智慧资产的五个维度
 *   经验沉淀总量 / 知识覆盖病种数 / AI 助手使用量 / 医生成长曲线 / 智慧度评分
 * 汇总成一页可汇报、可回溯的看板，并按时间序列产出「智慧资产增长报告」。
 *
 * 【越用越聪明深化】设计口径：
 *  - 资产只增不减（经验累计、病种覆盖累计、AI 调用按周期累计），
 *    随系统使用时长自然上行；六维雷达把绝对量折算成 0-100 分，
 *    便于跨院、跨期横向对比；
 *  - 六维加权（权重和 = 100%）：
 *      experienceDepth        经验沉淀深度   20%  累计经验条数 / 目标 2000
 *      diseaseCoverage       知识覆盖病种   20%  覆盖病种数   / 目标 300
 *      aiActivity            AI 助手活跃    20%  周期调用量   / 目标 50000
 *      doctorGrowth          医生成长       15%  医生成长均分（0-100）
 *      recommendationAdoption 推荐采纳率    15%  (采纳+修改×0.5)/推荐总数
 *      satisfaction          满意度闭环     10%  满意评价 / 评价总数
 *
 * 纯函数核心（不触库、不读时钟、可直接单测）：
 *  - buildHospitalWisdomDashboard(hospitalId, input?, nowIso?)：
 *      五维资产卡 + 六维雷达 + 医生成长画像，一次产出；
 *  - getWisdomGrowthReport(hospitalId, period, snapshots?, nowIso?)：
 *      把有序日/月快照聚合成增长曲线 + 环比 + 段位跃迁 + 结论话术。
 *
 * 空输入一律返回结构完整的零值结果并打 demo 标记，绝不抛异常；
 * 任何非法数值（NaN/负数/分母为 0）均安全收敛为 0。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 智慧度段位（与系统智慧度口径一致，便于横向对比） */
export type WisdomTier = 'outstanding' | 'excellent' | 'good' | 'pass' | 'weak';

/** 六维稳定键名 */
export type WisdomRadarDimension =
  | 'experienceDepth'
  | 'diseaseCoverage'
  | 'aiActivity'
  | 'doctorGrowth'
  | 'recommendationAdoption'
  | 'satisfaction';

/** 医生成长画像单条（当前快照截面） */
export interface DoctorGrowthPoint {
  /** 医生脱敏主键 */
  doctorId: string;
  /** 医生姓名（画像展示用；聚合统计不外露明细） */
  doctorName: string;
  /** 所属科室编码 */
  deptCode: string;
  /** 成长分 0~100（经验沉淀 + 采纳 + 学习综合折算） */
  growthScore: number;
  /** 该医生累计经验条数 */
  experienceCount: number;
}

/** 看板输入快照（路由层从内存计数 / DB 行装入；纯函数只读不写） */
export interface WisdomAssetInput {
  /** 经验沉淀总量（累计） */
  experienceTotal: number;
  /** 知识覆盖病种数（累计去重） */
  coveredDiseases: number;
  /** 当日 AI 助手调用量（周期增量） */
  aiAssistantCalls: number;
  /** 当日活跃沉淀医生数 */
  activeDoctors: number;
  /** 医生成长画像列表 */
  doctorGrowth: DoctorGrowthPoint[];
  /** 推荐：直接采纳条数 */
  recommendationAdopted: number;
  /** 推荐：修改后采纳条数（按半权计入正向） */
  recommendationModified: number;
  /** 推荐：推荐总条数（分母） */
  recommendationTotal: number;
  /** 满意度：满意评价条数 */
  satisfactionPositive: number;
  /** 满意度：评价总条数（分母） */
  satisfactionTotal: number;
}

/** 六维单维明细（可解释：院长能看到这分是怎么算的） */
export interface RadarDimension {
  key: WisdomRadarDimension;
  name: string;
  weight: number;
  /** 折算后的百分制得分 0~100 */
  score: number;
  /** 加权贡献 = score * weight / 100 */
  weightedContribution: number;
  /** 原始输入（分子/分母或计数） */
  raw: Record<string, number>;
  /** 人话公式 */
  formula: string;
  /** 是否弱项（< 60） */
  isWeak: boolean;
}

/** 医生成长画像（看板截面输出） */
export interface DoctorGrowthEntry {
  doctorId: string;
  doctorName: string;
  deptCode: string;
  growthScore: number;
  experienceCount: number;
}

/** buildHospitalWisdomDashboard 总产出 */
export interface WisdomDashboard {
  hospitalId: string;
  /** 生成时间（注入，便于测试） */
  asOf: string;
  /** 是否演示模式（无真实样本时置位） */
  demo: boolean;
  /** 五维资产卡 */
  assets: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    activeDoctors: number;
    wisdomScore: number;
    tier: WisdomTier;
    tierLabel: string;
  };
  /** 六维雷达明细（按权重降序） */
  radar: RadarDimension[];
  /** 弱项维度（score < 60） */
  weakDimensions: RadarDimension[];
  /** 医生成长曲线截面 */
  doctorGrowth: {
    /** 全院医生成长均分 0~100 */
    avgGrowth: number;
    /** 成长达标（>=70）医生数 */
    risingDoctors: number;
    /** 成长画像（按成长分降序 → 经验数降序 → 姓名升序） */
    entries: DoctorGrowthEntry[];
  };
}

/** 增长报告的历史快照点（由调用方按时间正序注入） */
export interface WisdomSnapshotPoint {
  /** 统计期标签（YYYY-MM 或 YYYY-MM-DD，字典序即时间序） */
  period: string;
  /** 期末经验沉淀总量 */
  experienceTotal: number;
  /** 期末知识覆盖病种数 */
  coveredDiseases: number;
  /** 当期 AI 助手调用量 */
  aiAssistantCalls: number;
  /** 当期六维智慧度总分 0~100 */
  wisdomScore: number;
  /** 当期医生成长均分 */
  avgDoctorGrowth: number;
}

/** 增长报告总产出 */
export interface WisdomGrowthReport {
  hospitalId: string;
  /** 报告窗口标签（如 month / quarter，由调用方注入） */
  period: string;
  generatedAt: string;
  /** 时间序列（旧→新） */
  series: WisdomSnapshotPoint[];
  /** 期末 - 期初各资产量变化 */
  delta: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    wisdomScore: number;
  };
  /** 各资产量增长率（%，首点为 0 时安全回落 0） */
  growthRate: {
    experienceTotal: number;
    coveredDiseases: number;
    aiAssistantCalls: number;
    wisdomScore: number;
  };
  /** 智慧度段位是否跃迁（末 vs 首） */
  tierMigration: {
    from: WisdomTier;
    to: WisdomTier;
    label: string;
  };
  /** 院长视角结论话术（「医院越来越聪明」的可汇报版本） */
  conclusion: string;
  /** 是否整体上行（期末智慧度 > 期初） */
  rising: boolean;
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 计数类维度饱和目标：达到即满分 */
const EXPERIENCE_TARGET = 2000;
const DISEASE_TARGET = 300;
const AI_CALLS_TARGET = 50000;

/** 弱项阈值 */
export const WEAK_DIMENSION_THRESHOLD = 60;
/** 医生成长达标线 */
export const DOCTOR_GROWTH_PASS_LINE = 70;

/** 安全收敛为非负整数 */
function asCount(n: unknown): number {
  const v = Math.floor(Number(n) || 0);
  return v > 0 ? v : 0;
}

/** 安全收敛 0~100 分 */
function asScore100(n: unknown): number {
  const v = Number(n) || 0;
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

/** 计数饱和折算：count/target*100，截顶 100，保留 1 位小数 */
function countToScore(count: number, target: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  const s = (count / target) * 100;
  return Math.round(Math.min(100, Math.max(0, s)) * 10) / 10;
}

/** 比率折算：分子/分母；分母 ≤ 0 返回 0；clamp [0,1] × 100 */
function rateToScore(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  const r = Math.min(1, Math.max(0, numerator / denominator));
  return Math.round(r * 1000) / 10;
}

/** 保留 1 位小数 */
function r1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
}

/** 保留 0 位百分数 */
function r0(n: number): number {
  return Math.round(Number.isFinite(n) ? n : 0);
}

/** 总分 → 段位 */
export function tierOf(totalScore: number): { tier: WisdomTier; label: string } {
  if (totalScore >= 90) return { tier: 'outstanding', label: '卓越' };
  if (totalScore >= 80) return { tier: 'excellent', label: '优秀' };
  if (totalScore >= 70) return { tier: 'good', label: '良好' };
  if (totalScore >= 60) return { tier: 'pass', label: '合格' };
  return { tier: 'weak', label: '待提升' };
}

/** 输入安全归一化：缺失字段回落零值，绝不抛错 */
function normalizeInput(input?: Partial<WisdomAssetInput> | null): WisdomAssetInput {
  const i = input ?? {};
  return {
    experienceTotal: asCount(i.experienceTotal),
    coveredDiseases: asCount(i.coveredDiseases),
    aiAssistantCalls: asCount(i.aiAssistantCalls),
    activeDoctors: asCount(i.activeDoctors),
    doctorGrowth: Array.isArray(i.doctorGrowth) ? i.doctorGrowth : [],
    recommendationAdopted: asCount(i.recommendationAdopted),
    recommendationModified: asCount(i.recommendationModified),
    recommendationTotal: asCount(i.recommendationTotal),
    satisfactionPositive: asCount(i.satisfactionPositive),
    satisfactionTotal: asCount(i.satisfactionTotal),
  };
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildHospitalWisdomDashboard：医院智慧资产看板（越用越聪明深化）。
 *
 * 流程：
 *  1. 五维资产卡：经验总量 / 病种覆盖 / AI 调用 / 活跃医生直接透传；
 *  2. 六维雷达：各维按饱和曲线或比率折算 0-100，加权求和得智慧度总分；
 *  3. 医生成长截面：均分、达标人数、Top 画像排序；
 *  4. 空输入（或全零）返回 demo=true 的零值结构，绝不抛异常。
 *
 * 纯函数：不修改入参；不触库；nowIso 由调用方注入（默认当前时间）。
 *
 * @param hospitalId 医院租户 ID（纯透传，多租户隔离标签）
 * @param input      资产输入快照（可空，空即零值）
 * @param nowIso     生成时间 ISO 串（注入，便于测试）
 */
export function buildHospitalWisdomDashboard(
  hospitalId: string,
  input?: Partial<WisdomAssetInput> | null,
  nowIso: string = new Date().toISOString(),
): WisdomDashboard {
  const m = normalizeInput(input);

  /* 1) 六维雷达 */
  const expScore = countToScore(m.experienceTotal, EXPERIENCE_TARGET);
  const disScore = countToScore(m.coveredDiseases, DISEASE_TARGET);
  const aiScore = countToScore(m.aiAssistantCalls, AI_CALLS_TARGET);

  /* 医生成长均分：入参列表取均值；无列表则按 0 分 */
  const growthList = m.doctorGrowth
    .filter((d) => !!d)
    .map((d) => asScore100(d.growthScore));
  const avgGrowth = growthList.length
    ? r1(growthList.reduce((a, b) => a + b, 0) / growthList.length)
    : 0;

  const positive = m.recommendationAdopted + m.recommendationModified * 0.5;
  const recScore = rateToScore(positive, m.recommendationTotal);
  const satScore = rateToScore(m.satisfactionPositive, m.satisfactionTotal);

  const radar: RadarDimension[] = [
    {
      key: 'experienceDepth',
      name: '经验沉淀深度',
      weight: 20,
      score: expScore,
      weightedContribution: r1((expScore * 20) / 100),
      raw: { total: m.experienceTotal, target: EXPERIENCE_TARGET },
      formula: `累计经验 ${m.experienceTotal} 条 / 目标 ${EXPERIENCE_TARGET} × 100（饱和截顶 100）`,
      isWeak: expScore < WEAK_DIMENSION_THRESHOLD,
    },
    {
      key: 'diseaseCoverage',
      name: '知识覆盖病种',
      weight: 20,
      score: disScore,
      weightedContribution: r1((disScore * 20) / 100),
      raw: { covered: m.coveredDiseases, target: DISEASE_TARGET },
      formula: `覆盖病种 ${m.coveredDiseases} 种 / 目标 ${DISEASE_TARGET} 种 × 100（饱和截顶 100）`,
      isWeak: disScore < WEAK_DIMENSION_THRESHOLD,
    },
    {
      key: 'aiActivity',
      name: 'AI 助手活跃',
      weight: 20,
      score: aiScore,
      weightedContribution: r1((aiScore * 20) / 100),
      raw: { calls: m.aiAssistantCalls, target: AI_CALLS_TARGET },
      formula: `周期调用 ${m.aiAssistantCalls} 次 / 目标 ${AI_CALLS_TARGET} 次 × 100（饱和截顶 100）`,
      isWeak: aiScore < WEAK_DIMENSION_THRESHOLD,
    },
    {
      key: 'doctorGrowth',
      name: '医生成长',
      weight: 15,
      score: avgGrowth,
      weightedContribution: r1((avgGrowth * 15) / 100),
      raw: { avgGrowth, doctors: growthList.length },
      formula: `全院 ${growthList.length} 名医生成长均分 ${avgGrowth}（直接计 0-100）`,
      isWeak: avgGrowth < WEAK_DIMENSION_THRESHOLD,
    },
    {
      key: 'recommendationAdoption',
      name: '推荐采纳率',
      weight: 15,
      score: recScore,
      weightedContribution: r1((recScore * 15) / 100),
      raw: {
        adopted: m.recommendationAdopted,
        modified: m.recommendationModified,
        total: m.recommendationTotal,
      },
      formula: `(直接采纳 ${m.recommendationAdopted} + 修改采纳 ${m.recommendationModified}×0.5) / 推荐总数 ${m.recommendationTotal} × 100`,
      isWeak: recScore < WEAK_DIMENSION_THRESHOLD,
    },
    {
      key: 'satisfaction',
      name: '满意度闭环',
      weight: 10,
      score: satScore,
      weightedContribution: r1((satScore * 10) / 100),
      raw: { positive: m.satisfactionPositive, total: m.satisfactionTotal },
      formula: `满意评价 ${m.satisfactionPositive} / 评价总数 ${m.satisfactionTotal} × 100`,
      isWeak: satScore < WEAK_DIMENSION_THRESHOLD,
    },
  ];

  const wisdomScore = r1(radar.reduce((sum, d) => sum + d.weightedContribution, 0));
  const { tier, label } = tierOf(wisdomScore);

  /* 2) 医生成长画像排序 */
  const rising = m.doctorGrowth.filter(
    (d) => d && asScore100(d.growthScore) >= DOCTOR_GROWTH_PASS_LINE,
  ).length;
  const entries: DoctorGrowthEntry[] = m.doctorGrowth
    .filter((d) => !!d)
    .map((d) => ({
      doctorId: (d.doctorId ?? '').trim(),
      doctorName: (d.doctorName ?? '').trim() || (d.doctorId ?? '').trim() || '未命名医生',
      deptCode: (d.deptCode ?? '').trim(),
      growthScore: asScore100(d.growthScore),
      experienceCount: asCount(d.experienceCount),
    }))
    .sort((a, b) => {
      if (b.growthScore !== a.growthScore) return b.growthScore - a.growthScore;
      if (b.experienceCount !== a.experienceCount)
        return b.experienceCount - a.experienceCount;
      return a.doctorName.localeCompare(b.doctorName, 'zh-CN');
    });

  /* 3) demo 标记：任一资产量为 0 视为无真实样本 */
  const hasSamples =
    m.experienceTotal > 0 ||
    m.coveredDiseases > 0 ||
    m.aiAssistantCalls > 0 ||
    m.recommendationTotal > 0 ||
    m.satisfactionTotal > 0 ||
    growthList.length > 0;

  return {
    hospitalId,
    asOf: nowIso,
    demo: !hasSamples,
    assets: {
      experienceTotal: m.experienceTotal,
      coveredDiseases: m.coveredDiseases,
      aiAssistantCalls: m.aiAssistantCalls,
      activeDoctors: m.activeDoctors,
      wisdomScore,
      tier,
      tierLabel: label,
    },
    radar,
    weakDimensions: radar.filter((d) => d.isWeak),
    doctorGrowth: {
      avgGrowth,
      risingDoctors: rising,
      entries,
    },
  };
}

/**
 * getWisdomGrowthReport：智慧资产增长报告（越用越聪明深化的汇报版本）。
 *
 * 流程：
 *  1. 把有序快照按 period 字典序升序（YYYY-MM 即时间序）；
 *  2. 取首/末点算各资产量的 delta 与增长率（首点为 0 时安全回落 0）；
 *  3. 段位跃迁：末 vs 首 wisdomScore 对应段位；
 *  4. 结论话术：智慧度上行即「医院越用越聪明」，附带量化结论。
 *
 * 纯函数：不触库；空 snapshots 返回合法空结构，绝不抛异常。
 *
 * @param hospitalId 医院租户 ID
 * @param period     报告窗口标签（如 'month' / 'quarter'）
 * @param snapshots  有序快照序列（旧→新，可空）
 * @param nowIso     生成时间（注入）
 */
export function getWisdomGrowthReport(
  hospitalId: string,
  period: string,
  snapshots?: readonly WisdomSnapshotPoint[] | null,
  nowIso: string = new Date().toISOString(),
): WisdomGrowthReport {
  const list = (snapshots ?? [])
    .filter((s) => !!s)
    .map((s) => ({
      period: (s.period ?? '').trim(),
      experienceTotal: asCount(s.experienceTotal),
      coveredDiseases: asCount(s.coveredDiseases),
      aiAssistantCalls: asCount(s.aiAssistantCalls),
      wisdomScore: asScore100(s.wisdomScore),
      avgDoctorGrowth: asScore100(s.avgDoctorGrowth),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const empty: WisdomGrowthReport = {
    hospitalId,
    period: (period ?? '').trim() || 'month',
    generatedAt: nowIso,
    series: [],
    delta: { experienceTotal: 0, coveredDiseases: 0, aiAssistantCalls: 0, wisdomScore: 0 },
    growthRate: { experienceTotal: 0, coveredDiseases: 0, aiAssistantCalls: 0, wisdomScore: 0 },
    tierMigration: { from: 'weak', to: 'weak', label: '暂无历史快照' },
    conclusion: '暂无历史快照。随着经验沉淀、病种覆盖与 AI 助手使用，智慧资产将自动累积。',
    rising: false,
  };
  if (list.length === 0) return empty;

  const first = list[0];
  const last = list[list.length - 1];

  const delta = {
    experienceTotal: last.experienceTotal - first.experienceTotal,
    coveredDiseases: last.coveredDiseases - first.coveredDiseases,
    aiAssistantCalls: last.aiAssistantCalls - first.aiAssistantCalls,
    wisdomScore: r1(last.wisdomScore - first.wisdomScore),
  };

  const growthRate = {
    experienceTotal: first.experienceTotal > 0 ? r0((delta.experienceTotal / first.experienceTotal) * 100) : 0,
    coveredDiseases:
      first.coveredDiseases > 0 ? r0((delta.coveredDiseases / first.coveredDiseases) * 100) : 0,
    aiAssistantCalls:
      first.aiAssistantCalls > 0 ? r0((delta.aiAssistantCalls / first.aiAssistantCalls) * 100) : 0,
    wisdomScore: first.wisdomScore > 0 ? r0((delta.wisdomScore / first.wisdomScore) * 100) : 0,
  };

  const from = tierOf(first.wisdomScore);
  const to = tierOf(last.wisdomScore);
  const rising = last.wisdomScore > first.wisdomScore;
  const tierMigration = {
    from: from.tier,
    to: to.tier,
    label:
      from.tier === to.tier
        ? `段位保持「${to.label}」`
        : `段位由「${from.label}」跃迁至「${to.label}」`,
  };

  const conclusion = rising
    ? `医院越用越聪明：${period}窗口内智慧度由 ${first.wisdomScore.toFixed(1)} 升至 ${last.wisdomScore.toFixed(1)} 分（+${delta.wisdomScore.toFixed(1)}），` +
      `经验沉淀 ${first.experienceTotal} → ${last.experienceTotal} 条（+${delta.experienceTotal}），` +
      `知识覆盖病种 ${first.coveredDiseases} → ${last.coveredDiseases} 种（+${delta.coveredDiseases}）。`
    : `本窗口智慧度由 ${first.wisdomScore.toFixed(1)} 变动至 ${last.wisdomScore.toFixed(1)} 分，` +
      `建议在经验沉淀、病种覆盖与 AI 助手使用上持续运营，推动资产曲线回升。`;

  return {
    hospitalId,
    period: (period ?? '').trim() || 'month',
    generatedAt: nowIso,
    series: list,
    delta,
    growthRate,
    tierMigration,
    conclusion,
    rising,
  };
}
