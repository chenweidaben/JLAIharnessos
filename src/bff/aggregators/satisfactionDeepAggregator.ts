/**
 * 健澜科技 jlmedaios - 【患者体验深化】满意度闭环聚合器（M174-D，纯函数）
 *
 * 设计原则：满意度闭环要真改进，不能只是登记。
 *   M165-C 已建四阶段闭环（收集→分析→改进→验证）；本模块在其上深化：
 *
 *   - buildDeepSatisfactionLoop(signals, improvements)：
 *       多渠道收集（门诊/住院/手术/检查/药房/后勤）+
 *       情感自动分类（正面/中性/负面）+
 *       5Why 根因追问 +
 *       PDCA 阶段跟踪（Plan/Do/Check/Act）+
 *       患者 NPS（净推荐值）汇总；
 *   - analyzeSatisfactionTrend(dept, series)：
 *       按周/月趋势分析均分、负面占比、NPS 走向，识别 rising/stable/falling；
 *   - benchmarkSatisfaction(dept, self, peers)：
 *       本科室 vs 区域标杆/同级医院对标，输出差距与位次；
 *   - generatePatientVoiceReport(period, signals)：
 *       患者之声报告：高频负面词云 TOP、典型原声、改进建议。
 *
 * 本模块全部为无副作用纯函数，不触库、不发请求、便于单测；
 * 数据库读写由路由层 routes/satisfactionDeep.ts 负责。
 * 落库字段见 deploy/postgres/init/349-satisfaction-deep.sql
 *   （clinical.satisfaction_surveys 扩展 channel/emotion/5Why/PDCA/NPS）。
 *
 * 持续优化与新场景：未来新增触点（互联网医院/家庭病床/随访）只需扩 channel 枚举。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 多渠道触点（与 clinical.satisfaction_channel 枚举对齐） */
export type SatisfactionChannel =
  | 'outpatient'   // 门诊
  | 'inpatient'   // 住院
  | 'surgery'     // 手术
  | 'exam'        // 检查
  | 'pharmacy'    // 药房
  | 'logistics'   // 后勤
  | 'online';     // 互联网医院（持续优化与新场景）

/** 情感三分类 */
export type EmotionLabel = 'positive' | 'neutral' | 'negative';

/** PDCA 四阶段 */
export type PdcaPhase = 'plan' | 'do' | 'check' | 'act';

/** NPS 三档 */
export type NpsCategory = 'promoter' | 'passive' | 'detractor';

/** 趋势信号 */
export type TrendSignal = 'rising' | 'stable' | 'falling';

/** 一条原始满意度信号（深化版：带渠道 + NPS 分） */
export interface DeepSatisfactionSignal {
  /** 多渠道触点，缺省按 outpatient */
  channel?: SatisfactionChannel;
  /** 满意度评分 1-5 */
  score?: number;
  /** 自由文本评论 */
  comment?: string;
  /** 科室编码（用于趋势/对标下钻） */
  dept?: string;
  /** 发生日期 ISO yyyy-mm-dd */
  date?: string;
  /** NPS 推荐分 0-10（可缺省；缺省则不参与 NPS 统计） */
  npsScore?: number;
}

/** 情感分析结果 */
export interface EmotionAnalysis {
  label: EmotionLabel;
  /** 情感分 -1.0 ~ +1.0 */
  score: number;
  /** 命中的关键词（供运营追溯） */
  hitKeywords: string[];
}

/** 5Why 单步追问 */
export interface FiveWhyStep {
  level: number;
  question: string;
  answer: string;
}

/** 5Why 根因分析结果 */
export interface FiveWhyAnalysis {
  /** 根因编码（与 M165-C RootCauseCode 对齐） */
  rootCause: string;
  /** 中文释义 */
  rootCauseLabel: string;
  /** 追问链（最多 5 层） */
  chain: FiveWhyStep[];
  /** 置信度 0-1 */
  confidence: number;
}

/** PDCA 改进事项（深化版） */
export interface PdcaAction {
  /** 改进事项 ID */
  actionId: string;
  /** 问题类别（与 M165-C IssueCategory 对齐） */
  category: string;
  /** 当前 PDCA 阶段 */
  phase: PdcaPhase;
  /** 措施描述 */
  action: string;
  /** 责任岗位 */
  owner: string;
  /** 限期天数 */
  dueDays: number;
  /** 改进前均分 */
  beforeScore?: number;
  /** 改进后均分 */
  afterScore?: number;
}

/** 渠道维度统计 */
export interface ChannelStat {
  channel: SatisfactionChannel;
  label: string;
  count: number;
  avgScore: number;
  negativeRatio: number;
}

/** NPS 汇总 */
export interface NpsSummary {
  /** 参与 NPS 统计的样本数 */
  sampleSize: number;
  promoterCount: number;
  passiveCount: number;
  detractorCount: number;
  /** NPS = %promoter - %detractor，范围 -100 ~ +100 */
  nps: number;
}

/** 深化闭环总视图 */
export interface DeepSatisfactionLoop {
  /** 多渠道收集汇总 */
  collect: {
    total: number;
    channels: ChannelStat[];
    emotion: { positive: number; neutral: number; negative: number; negativeRatio: number };
    underpowered: boolean;
  };
  /** 情感分析 + 5Why 根因 */
  analyze: {
    emotionDistribution: EmotionAnalysis[];
    rootCauses: FiveWhyAnalysis[];
  };
  /** PDCA 改进跟踪 */
  improve: {
    actions: PdcaAction[];
    phaseDistribution: Record<PdcaPhase, number>;
  };
  /** NPS 净推荐值 */
  nps: NpsSummary;
}

/** 趋势数据点（单期） */
export interface TrendPoint {
  /** 期间标签，如 2026-W38 / 2026-09 */
  period: string;
  /** 样本数 */
  sampleSize: number;
  /** 满意度均分 */
  avgScore: number;
  /** 负面占比 0-1 */
  negativeRatio: number;
  /** 该期 NPS（无样本为 null） */
  nps: number | null;
}

/** 趋势分析结果 */
export interface SatisfactionTrend {
  dept: string;
  points: TrendPoint[];
  /** 整体走向 */
  signal: TrendSignal;
  /** 均分变化（末期 - 首期） */
  scoreDelta: number;
  /** 负面占比变化 */
  negativeRatioDelta: number;
  /** NPS 变化 */
  npsDelta: number | null;
  /** 简评 */
  summary: string;
}

/** 对标入参：本科室数据 */
export interface SelfBenchmark {
  dept: string;
  avgScore: number;
  negativeRatio: number;
  nps: number;
  sampleSize: number;
}

/** 对标入参：同行/标杆数据 */
export interface PeerBenchmark {
  /** 同行名称（如「区域同级医院均值」「三甲标杆」） */
  name: string;
  avgScore: number;
  negativeRatio: number;
  nps: number;
}

/** 对标结果 */
export interface SatisfactionBenchmark {
  self: SelfBenchmark;
  peers: PeerBenchmark[];
  /** 与最强标杆的差距（负=落后） */
  scoreGapToBest: number;
  /** 位次（1=最好） */
  rank: number;
  /** 总数 */
  total: number;
  /** 简评 */
  summary: string;
}

/** 患者之声报告：高频负面词 */
export interface VoiceKeyword {
  word: string;
  count: number;
  /** 归因类别 */
  category: string;
}

/** 患者之声报告：典型原声 */
export interface VoiceQuote {
  channel: SatisfactionChannel;
  text: string;
  emotion: EmotionLabel;
}

/** 患者之声报告 */
export interface PatientVoiceReport {
  period: string;
  totalSignals: number;
  /** 高频负面词 TOP */
  topNegativeKeywords: VoiceKeyword[];
  /** 正面原声 TOP */
  positiveQuotes: VoiceQuote[];
  /** 负面原声 TOP */
  negativeQuotes: VoiceQuote[];
  /** 给院方的改进建议 */
  recommendations: string[];
}

/* -------------------------------------------------------------------------- */
/* 词典与模板（内置，不引入外部依赖）                                           */
/* -------------------------------------------------------------------------- */

/** 渠道中文展示名 */
export const CHANNEL_LABEL: Readonly<Record<SatisfactionChannel, string>> = {
  outpatient: '门诊',
  inpatient: '住院',
  surgery: '手术',
  exam: '检查',
  pharmacy: '药房',
  logistics: '后勤',
  online: '互联网医院',
};

/** 正面情感词典 */
const POSITIVE_LEXICON: ReadonlyArray<string> = [
  '满意', '谢谢', '感谢', '周到', '耐心', '清楚', '专业', '赞', '不错', '贴心',
  '认真', '负责', '热情', '温暖', '好评', '舒服', '放心', '顺利', '快', '整洁',
];

/** 负面情感词典 */
const NEGATIVE_LEXICON: ReadonlyArray<string> = [
  '差', '慢', '久', '贵', '乱', '脏', '吵', '挤', '疼', '痛',
  '排队', '等待', '不耐烦', '冷漠', '敷衍', '态度', '投诉', '失望', '恼火', '生气',
  '跑断腿', '麻烦', '繁琐', '反复', '不清', '不懂', '没人管', '不作为',
];

/** 问题类别词典（与 M165-C 对齐） */
const CATEGORY_LEXICON: ReadonlyArray<{ category: string; label: string; keywords: string[] }> = [
  { category: 'wait_time', label: '等待/排队', keywords: ['排队', '等待', '候诊', '太久', '半天', '等了', '等很久', '排长队', '人太多', '慢'] },
  { category: 'staff_attitude', label: '医护态度', keywords: ['态度差', '态度恶劣', '不耐烦', '冷漠', '敷衍', '甩脸', '态度不好', '说话难听', '凶'] },
  { category: 'cost', label: '费用透明度', keywords: ['贵', '乱收费', '收费高', '费用高', '报销难', '发票', '隐形消费', '不合理收费'] },
  { category: 'environment', label: '就医环境', keywords: ['脏', '拥挤', '吵', '卫生间', '异味', '太热', '太冷', '环境差', '床脏'] },
  { category: 'communication', label: '医患沟通', keywords: ['解释不清', '不告知', '听不懂', '没说清', '沟通差', '不解释', '一问三不知', '不懂'] },
  { category: 'process', label: '就诊流程', keywords: ['跑多次', '麻烦', '繁琐', '来回跑', '折腾', '手续多', '跑断腿', '反复排队'] },
  { category: 'appointment', label: '预约挂号', keywords: ['约不上', '号贩子', '抢号', '挂不上', '挂号难', '一号难求'] },
  { category: 'treatment_effect', label: '疗效感知', keywords: ['没效果', '复发', '误诊', '治不好', '没治好', '不见好', '越治越重', '疼'] },
];

/** 根因中文释义 */
const ROOT_CAUSE_LABEL: Readonly<Record<string, string>> = {
  staffing_gap: '人力配置不足',
  process_bottleneck: '流程瓶颈',
  facility_aging: '设施老化/环境维护不足',
  communication_gap: '沟通与服务培训不足',
  policy_unclear: '制度与收费公示不清',
  resource_misconfig: '资源/号源配置不合理',
  clinical_quality: '临床质量与随访不足',
};

/** 类别 → 默认根因 */
const CATEGORY_DEFAULT_ROOT_CAUSE: Readonly<Record<string, string>> = {
  wait_time: 'staffing_gap',
  staff_attitude: 'communication_gap',
  cost: 'policy_unclear',
  environment: 'facility_aging',
  communication: 'communication_gap',
  process: 'process_bottleneck',
  appointment: 'resource_misconfig',
  treatment_effect: 'clinical_quality',
};

/* -------------------------------------------------------------------------- */
/* 内部工具                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return (text || '').trim().toLowerCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* -------------------------------------------------------------------------- */
/* 纯函数 0.1：情感分析（导出供 buildDeepSatisfactionLoop 复用）              */
/* -------------------------------------------------------------------------- */

/**
 * analyzeEmotion：根据评论文本自动分类正面/中性/负面。
 *
 * 规则：命中正面词典数 vs 负面词典数
 *   - 负面命中 > 正面命中 → negative，情感分 = -(neg - pos) / (pos + neg + 1)
 *   - 正面命中 > 负面命中 → positive，情感分 = +(pos - neg) / (pos + neg + 1)
 *   - 持平或无命中 → neutral，情感分 0
 * 评分辅助：overall_score ≤2 强制负面，≥4 强制正面。
 */
export function analyzeEmotion(text: string, score?: number): EmotionAnalysis {
  const normalized = normalize(text);
  const hitKeywords: string[] = [];
  let pos = 0;
  let neg = 0;
  for (const kw of POSITIVE_LEXICON) {
    if (normalized.includes(kw)) { pos += 1; hitKeywords.push(kw); }
  }
  for (const kw of NEGATIVE_LEXICON) {
    if (normalized.includes(kw)) { neg += 1; hitKeywords.push(kw); }
  }

  let label: EmotionLabel = 'neutral';
  let emotionScore = 0;
  if (neg > pos) {
    label = 'negative';
    emotionScore = -(neg - pos) / (pos + neg + 1);
  } else if (pos > neg) {
    label = 'positive';
    emotionScore = (pos - neg) / (pos + neg + 1);
  }

  // 评分交叉验证
  if (typeof score === 'number' && Number.isFinite(score)) {
    if (score <= 2 && label !== 'negative') {
      label = 'negative';
      emotionScore = Math.min(emotionScore, -0.3);
    } else if (score >= 4 && label !== 'positive') {
      label = 'positive';
      emotionScore = Math.max(emotionScore, 0.3);
    }
  }

  return { label, score: round2(clamp(emotionScore, -1, 1)), hitKeywords };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 0.2：NPS 分类（导出供测试）                                          */
/* -------------------------------------------------------------------------- */

/**
 * classifyNps：把 0-10 分映射为三档。
 *   9-10 → promoter（推荐者）
 *   7-8  → passive（被动者）
 *   0-6  → detractor（贬损者）
 */
export function classifyNps(npsScore: number): NpsCategory {
  if (npsScore >= 9) return 'promoter';
  if (npsScore >= 7) return 'passive';
  return 'detractor';
}

/** 计算 NPS = %promoter - %detractor（范围 -100 ~ +100） */
export function calcNps(promoter: number, passive: number, detractor: number): number {
  const total = promoter + passive + detractor;
  if (total === 0) return 0;
  const pctPromoter = (promoter / total) * 100;
  const pctDetractor = (detractor / total) * 100;
  return Math.round(pctPromoter - pctDetractor);
}

/* -------------------------------------------------------------------------- */
/* 纯函数 0.3：5Why 根因分析（导出供 buildDeepSatisfactionLoop 复用）          */
/* -------------------------------------------------------------------------- */

/**
 * analyzeFiveWhy：对一条负面信号做 5Why 追问。
 *
 * 传统做法停在「人多/排队久」；本函数沿类别词典 + 关键词追到根因编码，
 * 并输出 5 层追问链（问题现象 → 直接原因 → 系统原因 → 流程原因 → 根因），
 * 供运营例会追溯，不允许停在「护士态度差」这种表层结论。
 */
export function analyzeFiveWhy(input: {
  comment?: string;
  score?: number;
  channel?: SatisfactionChannel;
}): FiveWhyAnalysis {
  const text = normalize(input.comment ?? '');

  // 1) 归类
  let matchedCategory = CATEGORY_LEXICON[0];
  let maxHits = 0;
  for (const c of CATEGORY_LEXICON) {
    const hits = c.keywords.filter((kw) => text.includes(kw)).length;
    if (hits > maxHits) { maxHits = hits; matchedCategory = c; }
  }
  // 评分兜底：低分但无关键词命中 → wait_time 或 staff_attitude
  if (maxHits === 0 && typeof input.score === 'number' && input.score <= 2) {
    matchedCategory = CATEGORY_LEXICON[0];
  }

  const category = matchedCategory.category;
  const rootCause = CATEGORY_DEFAULT_ROOT_CAUSE[category] ?? 'process_bottleneck';
  const channelLabel = CHANNEL_LABEL[input.channel ?? 'outpatient'];

  // 2) 构造 5Why 链
  const phenomenon = input.comment?.trim() || `${channelLabel}满意度 ${input.score ?? 3} 分`;
  const chain: FiveWhyStep[] = [
    { level: 1, question: `为什么「${phenomenon}」？`, answer: `患者在${channelLabel}触点体验到「${matchedCategory.label}」问题。` },
    { level: 2, question: `为什么会有「${matchedCategory.label}」问题？`, answer: `该触点在高峰时段资源/人力/流程配置与就诊量不匹配。` },
    { level: 3, question: `为什么资源配置不匹配？`, answer: `排班/号源/窗口投放按历史均值静态配置，未按实时就诊曲线动态调整。` },
    { level: 4, question: `为什么不能动态调整？`, answer: `缺乏跨科室实时数据看板与快速调度机制，问题发现滞后于患者体验。` },
    { level: 5, question: `为什么缺乏快速调度机制？`, answer: `根因归属「${ROOT_CAUSE_LABEL[rootCause]}」，需从制度/流程/培训层面系统改进。` },
  ];

  const confidence = maxHits > 0 ? 0.8 : 0.5;
  return {
    rootCause,
    rootCauseLabel: ROOT_CAUSE_LABEL[rootCause],
    chain,
    confidence,
  };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 1：buildDeepSatisfactionLoop（深化闭环）                             */
/* -------------------------------------------------------------------------- */

/**
 * buildDeepSatisfactionLoop：多渠道 + 情感 + 5Why + PDCA + NPS 一体化闭环。
 *
 * @param signals 原始信号（带 channel / score / comment / npsScore / date）
 * @param pdcaActions 已入库的 PDCA 改进事项
 */
export function buildDeepSatisfactionLoop(
  signals: ReadonlyArray<DeepSatisfactionSignal>,
  pdcaActions?: ReadonlyArray<PdcaAction>,
): DeepSatisfactionLoop {
  const list = (signals ?? []).slice();

  /* ---- 多渠道收集 ---- */
  const channelBuckets = new Map<SatisfactionChannel, { count: number; scoreSum: number; scoreN: number; neg: number }>();
  const emotionDist: EmotionAnalysis[] = [];
  let npsPromoter = 0;
  let npsPassive = 0;
  let npsDetractor = 0;
  const rootCauseSet = new Map<string, FiveWhyAnalysis>();

  for (const s of list) {
    const channel = s.channel ?? 'outpatient';
    const bucket = channelBuckets.get(channel) ?? { count: 0, scoreSum: 0, scoreN: 0, neg: 0 };
    bucket.count += 1;
    if (typeof s.score === 'number' && Number.isFinite(s.score)) {
      bucket.scoreSum += s.score;
      bucket.scoreN += 1;
    }
    const emo = analyzeEmotion(s.comment ?? '', s.score);
    emotionDist.push(emo);
    if (emo.label === 'negative') bucket.neg += 1;
    channelBuckets.set(channel, bucket);

    // NPS
    if (typeof s.npsScore === 'number' && Number.isFinite(s.npsScore)) {
      const cat = classifyNps(s.npsScore);
      if (cat === 'promoter') npsPromoter += 1;
      else if (cat === 'passive') npsPassive += 1;
      else npsDetractor += 1;
    }

    // 负面信号 → 5Why
    if (emo.label === 'negative' || (typeof s.score === 'number' && s.score <= 2)) {
      const why = analyzeFiveWhy({ comment: s.comment, score: s.score, channel });
      if (!rootCauseSet.has(why.rootCause)) rootCauseSet.set(why.rootCause, why);
    }
  }

  const channels: ChannelStat[] = Array.from(channelBuckets.entries()).map(([ch, b]) => ({
    channel: ch,
    label: CHANNEL_LABEL[ch],
    count: b.count,
    avgScore: b.scoreN > 0 ? round2(b.scoreSum / b.scoreN) : 0,
    negativeRatio: b.count > 0 ? round2(b.neg / b.count) : 0,
  })).sort((a, b) => b.count - a.count);

  const posCount = emotionDist.filter((e) => e.label === 'positive').length;
  const neuCount = emotionDist.filter((e) => e.label === 'neutral').length;
  const negCount = emotionDist.filter((e) => e.label === 'negative').length;
  const total = list.length;

  /* ---- PDCA ---- */
  const actions = (pdcaActions ?? []).slice();
  const phaseDist: Record<PdcaPhase, number> = { plan: 0, do: 0, check: 0, act: 0 };
  for (const a of actions) phaseDist[a.phase] = (phaseDist[a.phase] ?? 0) + 1;

  /* ---- NPS ---- */
  const nps: NpsSummary = {
    sampleSize: npsPromoter + npsPassive + npsDetractor,
    promoterCount: npsPromoter,
    passiveCount: npsPassive,
    detractorCount: npsDetractor,
    nps: calcNps(npsPromoter, npsPassive, npsDetractor),
  };

  return {
    collect: {
      total,
      channels,
      emotion: {
        positive: posCount,
        neutral: neuCount,
        negative: negCount,
        negativeRatio: total > 0 ? round2(negCount / total) : 0,
      },
      underpowered: total < 10,
    },
    analyze: {
      emotionDistribution: emotionDist,
      rootCauses: Array.from(rootCauseSet.values()),
    },
    improve: { actions, phaseDistribution: phaseDist },
    nps,
  };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 2：analyzeSatisfactionTrend（趋势分析）                              */
/* -------------------------------------------------------------------------- */

/**
 * analyzeSatisfactionTrend：按科室 + 周期序列分析趋势。
 *
 * @param dept    科室编码
 * @param series  按时间排好的趋势点（一般由路由层按周/月聚合后传入）
 */
export function analyzeSatisfactionTrend(
  dept: string,
  series: ReadonlyArray<TrendPoint>,
): SatisfactionTrend {
  const points = (series ?? []).slice().sort((a, b) => a.period.localeCompare(b.period));
  if (points.length === 0) {
    return {
      dept, points, signal: 'stable', scoreDelta: 0, negativeRatioDelta: 0,
      npsDelta: null, summary: '暂无趋势数据。',
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const scoreDelta = round2(last.avgScore - first.avgScore);
  const negativeRatioDelta = round2(last.negativeRatio - first.negativeRatio);

  let npsDelta: number | null = null;
  if (typeof first.nps === 'number' && typeof last.nps === 'number') {
    npsDelta = round2(last.nps - first.nps);
  }

  // 趋势判定：均分上升 ≥0.2 且负面占比下降 → falling（好转）
  //              均分下降 ≥0.2 且负面占比上升 → rising（恶化）
  //              其余 → stable
  let signal: TrendSignal = 'stable';
  let summary: string;
  if (scoreDelta >= 0.2 && negativeRatioDelta <= -0.05) {
    signal = 'falling'; // 负面在下降，用 falling 表示问题在收敛
    summary = `「${dept}」满意度均分 ${first.avgScore.toFixed(2)} → ${last.avgScore.toFixed(2)}（+${scoreDelta.toFixed(2)}），负面占比 ${(first.negativeRatio * 100).toFixed(0)}% → ${(last.negativeRatio * 100).toFixed(0)}%，改进有效，继续保持。`;
  } else if (scoreDelta <= -0.2 && negativeRatioDelta >= 0.05) {
    signal = 'rising'; // 负面在上升
    summary = `「${dept}」满意度均分 ${first.avgScore.toFixed(2)} → ${last.avgScore.toFixed(2)}（${scoreDelta.toFixed(2)}），负面占比 ${(first.negativeRatio * 100).toFixed(0)}% → ${(last.negativeRatio * 100).toFixed(0)}%，体验恶化，需立即派单 PDCA。`;
  } else {
    summary = `「${dept}」满意度均分 ${first.avgScore.toFixed(2)} → ${last.avgScore.toFixed(2)}，波动在正常区间，持续观察。`;
  }

  return { dept, points, signal, scoreDelta, negativeRatioDelta, npsDelta, summary };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 3：benchmarkSatisfaction（对标）                                     */
/* -------------------------------------------------------------------------- */

/**
 * benchmarkSatisfaction：本科室 vs 同行/标杆对标。
 *
 * @param self   本科室数据
 * @param peers  同行/标杆列表
 */
export function benchmarkSatisfaction(
  self: SelfBenchmark,
  peers: ReadonlyArray<PeerBenchmark>,
): SatisfactionBenchmark {
  // 把 self 与 peers 放一起按均分排序，求位次
  const all: Array<{ name: string; avgScore: number; negativeRatio: number; nps: number; isSelf: boolean }> = [
    { name: self.dept, avgScore: self.avgScore, negativeRatio: self.negativeRatio, nps: self.nps, isSelf: true },
    ...peers.map((p) => ({ ...p, isSelf: false })),
  ];
  all.sort((a, b) => b.avgScore - a.avgScore);
  const rank = all.findIndex((x) => x.isSelf) + 1;
  const total = all.length;
  const best = all[0];
  const scoreGapToBest = round2(self.avgScore - best.avgScore);

  let summary: string;
  if (rank === 1) {
    summary = `「${self.dept}」均分 ${self.avgScore.toFixed(2)} 位列对标组第 1 / ${total}，领先标杆 NPS ${self.nps}，经验可沉淀为制度。`;
  } else if (scoreGapToBest >= -0.2) {
    summary = `「${self.dept}」均分 ${self.avgScore.toFixed(2)} 位列第 ${rank} / ${total}，与标杆差距 ${scoreGapToBest.toFixed(2)} 分，处于第一梯队。`;
  } else if (scoreGapToBest >= -0.5) {
    summary = `「${self.dept}」均分 ${self.avgScore.toFixed(2)} 位列第 ${rank} / ${total}，落后标杆 ${(-scoreGapToBest).toFixed(2)} 分，对标经验需复盘。`;
  } else {
    summary = `「${self.dept}」均分 ${self.avgScore.toFixed(2)} 位列第 ${rank} / ${total}，显著落后标杆 ${(-scoreGapToBest).toFixed(2)} 分，立即启动 PDCA 改进。`;
  }

  return { self, peers: peers.slice(), scoreGapToBest, rank, total, summary };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 4：generatePatientVoiceReport（患者之声报告）                         */
/* -------------------------------------------------------------------------- */

/**
 * generatePatientVoiceReport：患者之声报告。
 *
 * @param period  期间标签（如「2026-Q3」）
 * @param signals 原始信号
 */
export function generatePatientVoiceReport(
  period: string,
  signals: ReadonlyArray<DeepSatisfactionSignal>,
): PatientVoiceReport {
  const list = (signals ?? []).slice();

  // 1) 高频负面词：扫负面评论，按类别词典统计命中
  const keywordCount = new Map<string, { count: number; category: string }>();
  const positiveQuotes: VoiceQuote[] = [];
  const negativeQuotes: VoiceQuote[] = [];

  for (const s of list) {
    const emo = analyzeEmotion(s.comment ?? '', s.score);
    const channel = s.channel ?? 'outpatient';
    const text = (s.comment ?? '').trim();
    if (!text) continue;

    if (emo.label === 'negative') {
      negativeQuotes.push({ channel, text, emotion: 'negative' });
      for (const c of CATEGORY_LEXICON) {
        for (const kw of c.keywords) {
          if (normalize(text).includes(kw)) {
            const cur = keywordCount.get(kw) ?? { count: 0, category: c.category };
            cur.count += 1;
            keywordCount.set(kw, cur);
          }
        }
      }
    } else if (emo.label === 'positive') {
      positiveQuotes.push({ channel, text, emotion: 'positive' });
    }
  }

  const topNegativeKeywords: VoiceKeyword[] = Array.from(keywordCount.entries())
    .map(([word, v]) => ({ word, count: v.count, category: v.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 2) 改进建议：按高频词类别反推
  const recommendations: string[] = [];
  const seenCat = new Set<string>();
  for (const k of topNegativeKeywords) {
    if (seenCat.has(k.category)) continue;
    seenCat.add(k.category);
    const cat = CATEGORY_LEXICON.find((c) => c.category === k.category);
    if (!cat) continue;
    recommendations.push(`针对「${cat.label}」高频问题（如「${k.word}」），建议按 PDCA：${CATEGORY_DEFAULT_ROOT_CAUSE[k.category] ? ROOT_CAUSE_LABEL[CATEGORY_DEFAULT_ROOT_CAUSE[k.category]] : '流程优化'} → 派单责任科室限期整改 → 30 天后复查满意度与 NPS。`);
    if (recommendations.length >= 4) break;
  }

  return {
    period,
    totalSignals: list.length,
    topNegativeKeywords,
    positiveQuotes: positiveQuotes.slice(0, 5),
    negativeQuotes: negativeQuotes.slice(0, 5),
    recommendations,
  };
}
