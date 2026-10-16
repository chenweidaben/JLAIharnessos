/**
 * 健澜科技 jlmedaios - 【CDSS与运营精细化】患者满意度与服务改进闭环聚合器（M165-C，纯函数）
 *
 * 设计原则：满意度闭环要真改进，不能只是登记投诉。
 *   传统做法把问卷/投诉当「登记表」，收完即止；本模块把每一条不满意信号
 *   驱动成一条可跟踪的改进事项，走完 收集 → 分析 → 改进 → 验证 四步：
 *
 *   - buildSatisfactionLoop(surveyData)：
 *       收集（满意度+投诉+表扬三通道统一计数与均分）→
 *       分析（归类 + 根因 + 趋势）→
 *       改进（措施 + 责任到人 + 限期）→
 *       验证（复查满意度 + 效果评估 + 标准化）。
 *   - analyzeSatisfactionRootCause(issue)：
 *       按问题类别 + 评论关键词定位根因（人力/流程/设施/沟通/制度/资源/临床），
 *       输出根因编码、中文释义、置信度与判定依据。
 *   - generateImprovementAction(issue, rootCause)：
 *       根因 → 可执行措施模板 + 责任岗位 + 限期天数 + 量化目标，
 *       禁止「无人认领、无限期」的空改进。
 *   - trackImprovementEffect(improvementId)：
 *       改进前后满意度复查对比，评定 resolved/improved/no_change/regressed，
 *       验证通过的措施 standardized 沉淀为制度；未改善的标记 needsRework 回炉，
 *       不静默丢弃、不归档了事。
 *
 * 本模块全部为无副作用纯函数，不触库、不发请求、便于单测；
 * 数据库读写由路由层 routes/satisfactionLoop.ts 负责。
 * 落库字段见 deploy/postgres/init/334-satisfaction-loop.sql（medmuse.service_improvement）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 信号来源三通道：满意度问卷 / 投诉 / 表扬 */
export type SignalSource = 'satisfaction' | 'complaint' | 'praise';

/** 问题归类（与 service_improvement.category 列对齐） */
export type IssueCategory =
  | 'wait_time'          // 等待/排队
  | 'staff_attitude'     // 医护态度
  | 'cost'               // 费用透明度
  | 'environment'        // 就医环境
  | 'communication'      // 医患沟通
  | 'process'            // 就诊流程
  | 'appointment'        // 预约挂号
  | 'treatment_effect'   // 疗效感知
  | 'other';

/** 根因编码（与 service_improvement.root_cause 列对齐） */
export type RootCauseCode =
  | 'staffing_gap'         // 人力配置不足（高峰缺人/导诊缺位）
  | 'process_bottleneck'   // 流程瓶颈（多窗口往返/环节串行）
  | 'facility_aging'       // 设施老化/环境维护不足
  | 'communication_gap'    // 沟通与服务培训不足
  | 'policy_unclear'       // 制度/收费公示不清
  | 'resource_misconfig'   // 资源/号源配置不合理
  | 'clinical_quality';    // 临床质量与随访不足

/** 趋势信号（前后两期负面占比对比得出） */
export type TrendSignal = 'rising' | 'stable' | 'falling';

/** 效果评定（与 service_effect_verdict 枚举对齐） */
export type EffectVerdict = 'resolved' | 'improved' | 'no_change' | 'regressed';

/** 严重度 */
export type Severity = 'high' | 'medium' | 'low';

/** 一条原始满意度信号（收集阶段入参） */
export interface SatisfactionSignal {
  /** 信号来源，缺省按满意度问卷处理 */
  source?: SignalSource;
  /** 满意度评分 1-5（complaint/praise 可缺省） */
  score?: number;
  /** 自由文本评论/投诉内容 */
  comment?: string;
  /** 来源科室/维度，如 outpatient / inpatient / pharmacy */
  dept?: string;
  /** 发生日期 ISO 字符串，用于前后两期趋势对比 */
  date?: string;
}

/** 分析阶段聚合出的单条问题 */
export interface LoopIssue {
  category: IssueCategory;
  /** 中文展示名 */
  label: string;
  /** 命中该类别的信号条数 */
  count: number;
  severity: Severity;
  trend: TrendSignal;
  /** 代表性评论样本（去重后最多 3 条原文） */
  sampleComments: string[];
}

/** 收集阶段汇总 */
export interface CollectSummary {
  total: number;
  satisfactionCount: number;
  complaintCount: number;
  praiseCount: number;
  /** 满意度均分（仅统计带 score 的 satisfaction 信号，0-5）；无样本为 0 */
  avgScore: number;
  /** 不满意率 = 低分(≤3)满意度 + 投诉 / 总信号数（0-1） */
  dissatisfactionRatio: number;
}

/** 改进阶段产出的单条措施 */
export interface LoopAction {
  issueCategory: IssueCategory;
  rootCause: RootCauseCode;
  /** 可执行措施描述 */
  action: string;
  /** 责任岗位/科室（责任到人，不允许空） */
  owner: string;
  /** 限期完成天数 */
  dueDays: number;
  priority: Severity;
  /** 量化改进目标 */
  target: string;
}

/** 验证阶段：一条改进事项的效果评估入参（路由层由 service_improvement 行映射） */
export interface ImprovementEffectInput {
  improvementId: string;
  category?: IssueCategory;
  beforeScore?: number;
  afterScore?: number;
  /** 改进后的回访评论，辅助判定 */
  followUpComments?: string[];
}

/** 验证阶段：单条效果评估结果 */
export interface ImprovementEffect {
  improvementId: string;
  beforeScore: number | null;
  afterScore: number | null;
  /** after - before（数据缺失为 null） */
  delta: number | null;
  verdict: EffectVerdict;
  /** 验证通过 → 措施标准化沉淀为制度 */
  standardized: boolean;
  /** 未改善/恶化 → 回炉再分析或升级督办，禁止静默归档 */
  needsRework: boolean;
  conclusion: string;
}

/** 验证阶段汇总 */
export interface VerifySummary {
  total: number;
  resolvedCount: number;
  improvedCount: number;
  noChangeCount: number;
  regressedCount: number;
  standardizedCount: number;
  reworkCount: number;
  effects: ImprovementEffect[];
}

/** 闭环总视图 */
export interface SatisfactionLoop {
  collect: CollectSummary;
  analyze: {
    issues: LoopIssue[];
    /** 样本量过小标记（n<10），不夸大结论 */
    underpowered: boolean;
  };
  improve: {
    actions: LoopAction[];
  };
  verify: VerifySummary;
}

/* -------------------------------------------------------------------------- */
/* 词典与模板（内置，不引入外部依赖）                                           */
/* -------------------------------------------------------------------------- */

/** 类别中文展示名 */
export const ISSUE_LABEL: Readonly<Record<IssueCategory, string>> = {
  wait_time: '等待/排队',
  staff_attitude: '医护态度',
  cost: '费用透明度',
  environment: '就医环境',
  communication: '医患沟通',
  process: '就诊流程',
  appointment: '预约挂号',
  treatment_effect: '疗效感知',
  other: '其他问题',
};

/** 负面关键词词典：类别 → 关键词（小写后子串匹配） */
export const ISSUE_LEXICON: Readonly<Record<Exclude<IssueCategory, 'other'>, string[]>> = {
  wait_time: [
    '等待', '排队', '候诊', '太久', '半天', '等了', '等很久', '排长队', '人太多',
  ],
  staff_attitude: [
    '态度差', '态度恶劣', '不耐烦', '冷漠', '敷衍', '甩脸', '态度不好', '说话难听',
  ],
  cost: [
    '贵', '乱收费', '收费高', '费用高', '报销难', '发票', '隐形消费', '不合理收费',
  ],
  environment: [
    '脏', '拥挤', '吵', '卫生间', '异味', '太热', '太冷', '环境差', '床脏',
  ],
  communication: [
    '解释不清', '不告知', '听不懂', '没说清', '沟通差', '不解释', '一问三不知',
  ],
  process: [
    '跑多次', '麻烦', '繁琐', '来回跑', '折腾', '手续多', '跑断腿', '反复排队',
  ],
  appointment: ['约不上', '号贩子', '抢号', '挂不上', '挂号难', '一号难求'],
  treatment_effect: ['没效果', '复发', '误诊', '治不好', '没治好', '不见好', '越治越重'],
};

/** 表扬正面词典 */
const PRAISE_LEXICON: ReadonlyArray<string> = [
  '满意', '谢谢', '感谢', '周到', '耐心', '清楚', '专业', '赞', '不错', '贴心', '认真', '负责', '热情', '温暖', '好评',
];

/** 根因中文释义 */
const ROOT_CAUSE_LABEL: Readonly<Record<RootCauseCode, string>> = {
  staffing_gap: '人力配置不足',
  process_bottleneck: '流程瓶颈',
  facility_aging: '设施老化/环境维护不足',
  communication_gap: '沟通与服务培训不足',
  policy_unclear: '制度与收费公示不清',
  resource_misconfig: '资源/号源配置不合理',
  clinical_quality: '临床质量与随访不足',
};

/** 类别 → 默认根因 */
const CATEGORY_DEFAULT_ROOT_CAUSE: Readonly<Record<IssueCategory, RootCauseCode>> = {
  wait_time: 'staffing_gap',
  staff_attitude: 'communication_gap',
  cost: 'policy_unclear',
  environment: 'facility_aging',
  communication: 'communication_gap',
  process: 'process_bottleneck',
  appointment: 'resource_misconfig',
  treatment_effect: 'clinical_quality',
  other: 'process_bottleneck',
};

/** 根因 → 措施模板（action / owner / dueDays） */
const ROOT_CAUSE_ACTION: Readonly<Record<RootCauseCode, { action: string; owner: string; dueDays: number }>> = {
  staffing_gap: {
    action: '高峰时段弹性排班并增设导诊岗，门诊楼层增派流动护士，目标高峰候诊 ≤ 30 分钟',
    owner: '门诊部/护理部',
    dueDays: 14,
  },
  process_bottleneck: {
    action: '一站式服务中心集成挂号/缴费/报告打印，串行环节改并行，目标患者往返窗口 ≤ 1 次',
    owner: '门诊部',
    dueDays: 21,
  },
  facility_aging: {
    action: '每日两次环境巡检，高峰时段加密卫生间保洁，更新老化等候区座椅与通风设施',
    owner: '后勤保障部',
    dueDays: 30,
  },
  communication_gap: {
    action: '开展服务礼仪与共情沟通专项培训，推行「三分钟病情解释」标准动作，投诉 48h 内回访',
    owner: '医务处',
    dueDays: 14,
  },
  policy_unclear: {
    action: '费用清单自助打印并公众号实时推送，收费项目与医保政策上墙公示，设置费用咨询专窗',
    owner: '财务/医保办',
    dueDays: 14,
  },
  resource_misconfig: {
    action: '放号窗口期全渠道公示，号源投放按历史就诊曲线动态调整，复诊续方走互联网医院免排队',
    owner: '门诊办/信息科',
    dueDays: 21,
  },
  clinical_quality: {
    action: '疑难病例 MDT 讨论，建立出院后 7/30 天随访闭环，复发预警提前干预',
    owner: '科主任/医务处',
    dueDays: 30,
  },
};

/* -------------------------------------------------------------------------- */
/* 内部工具                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return (text || '').trim().toLowerCase();
}

function severityOf(count: number): Severity {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

/** 判断一条信号是否为「不满意信号」（投诉，或满意度 ≤3 的问卷，或命中负面词典的评论） */
function isDissatisfiedSignal(s: SatisfactionSignal): boolean {
  if (s.source === 'complaint') return true;
  if (typeof s.score === 'number' && s.score > 0 && s.score <= 3) return true;
  const text = normalize(s.comment ?? '');
  if (!text) return false;
  return (Object.values(ISSUE_LEXICON) as string[][])
    .some((kws) => kws.some((kw) => text.includes(kw)));
}

/** 一条评论命中的类别集合（可多命中） */
function hitCategories(comment: string): IssueCategory[] {
  const text = normalize(comment);
  const hit: IssueCategory[] = [];
  for (const category of Object.keys(ISSUE_LEXICON) as Exclude<IssueCategory, 'other'>[]) {
    if (ISSUE_LEXICON[category].some((kw) => text.includes(kw))) hit.push(category);
  }
  return hit;
}

/* -------------------------------------------------------------------------- */
/* 纯函数 2：根因分析（先定义，供 buildSatisfactionLoop 复用）                   */
/* -------------------------------------------------------------------------- */

export interface RootCauseAnalysis {
  rootCause: RootCauseCode;
  rootCauseLabel: string;
  /** 置信度 0-1：关键词命中细化 +0.2，类别默认 0.6，高严重度 +0.1，封顶 1 */
  confidence: number;
  /** 判定依据（中文，供运营例会追溯） */
  reasoning: string;
}

/**
 * analyzeSatisfactionRootCause：按问题类别 + 评论关键词定位根因。
 *
 * @param issue 问题输入：类别 + 代表性评论 + 严重度
 * @returns 根因编码、释义、置信度与判定依据
 */
export function analyzeSatisfactionRootCause(issue: {
  category: IssueCategory;
  sampleComments?: string[];
  severity?: Severity;
}): RootCauseAnalysis {
  const category = issue.category || 'other';
  const defaultCause = CATEGORY_DEFAULT_ROOT_CAUSE[category];
  const comments = (issue.sampleComments ?? []).map((c) => normalize(c)).filter(Boolean);

  let rootCause: RootCauseCode = defaultCause;
  let refinedBy: string = '';

  // 类别内关键词细化：等待类问题可能是号源问题也可能是流程问题
  if (category === 'wait_time' || category === 'appointment') {
    if (comments.some((c) => /号|预约|挂/.test(c))) {
      rootCause = 'resource_misconfig';
      refinedBy = '评论提及号源/预约/挂号';
    } else if (comments.some((c) => /检查|报告|缴费|手续|窗口/.test(c))) {
      rootCause = 'process_bottleneck';
      refinedBy = '评论提及检查/报告/缴费/窗口往返';
    }
  } else if (category === 'process') {
    if (comments.some((c) => /态度|沟通|解释/.test(c))) {
      rootCause = 'communication_gap';
      refinedBy = '评论虽归类流程但指向沟通态度';
    }
  } else if (category === 'treatment_effect') {
    if (comments.some((c) => /随访|复查|没人管/.test(c))) {
      rootCause = 'clinical_quality';
      refinedBy = '评论指向出院后随访缺位';
    }
  }

  let confidence = refinedBy ? 0.8 : 0.6;
  if (issue.severity === 'high') confidence = Math.min(1, confidence + 0.1);

  const reasonParts: string[] = [`类别「${ISSUE_LABEL[category]}」默认根因为${ROOT_CAUSE_LABEL[defaultCause]}`];
  if (refinedBy) reasonParts.push(`依据${refinedBy}细化为${ROOT_CAUSE_LABEL[rootCause]}`);
  if (issue.severity === 'high') reasonParts.push('严重度 high 置信度上浮');

  return {
    rootCause,
    rootCauseLabel: ROOT_CAUSE_LABEL[rootCause],
    confidence: Math.round(confidence * 100) / 100,
    reasoning: reasonParts.join('；') + '。',
  };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 3：改进措施生成（先定义，供 buildSatisfactionLoop 复用）              */
/* -------------------------------------------------------------------------- */

/**
 * generateImprovementAction：根因 → 可执行措施 + 责任到人 + 限期。
 *
 * @param issue  问题输入（类别/严重度）
 * @param rootCause 根因分析结果（analyzeSatisfactionRootCause 的输出）
 * @returns 改进措施（含 owner、dueDays、量化目标）
 */
export function generateImprovementAction(
  issue: { category: IssueCategory; severity?: Severity },
  rootCause: RootCauseAnalysis,
): LoopAction {
  const tpl = ROOT_CAUSE_ACTION[rootCause.rootCause];
  const priority: Severity = issue.severity ?? 'low';
  // 高优问题限期上浮 20% 压力（天数下浮），中优不变，低优宽限
  let dueDays = tpl.dueDays;
  if (priority === 'high') dueDays = Math.max(7, Math.round(tpl.dueDays * 0.7));
  else if (priority === 'low') dueDays = Math.round(tpl.dueDays * 1.5);

  const target = `30 天内「${ISSUE_LABEL[issue.category || 'other']}」相关满意度提升 ≥ 0.5 分，回访好评率 ≥ 90%`;

  return {
    issueCategory: issue.category || 'other',
    rootCause: rootCause.rootCause,
    action: tpl.action,
    owner: tpl.owner,
    dueDays,
    priority,
    target,
  };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 4：改进效果跟踪（先定义，供 buildSatisfactionLoop 复用）             */
/* -------------------------------------------------------------------------- */

/**
 * trackImprovementEffect：改进前后满意度复查对比，评定效果并决定是否回炉。
 *
 * 判定规则（1-5 分制）：
 *   - after ≥ 4.5 且 Δ ≥ 1.0 → resolved（措施标准化沉淀）
 *   - Δ ≥ 0.5                → improved
 *   - Δ ≤ -0.5               → regressed（升级督办，回炉）
 *   - 其余（|Δ| < 0.5）      → no_change（回炉再分析）
 *   - 无复查数据              → no_change，结论明确提示「待复查」
 *
 * @param input 改进事项效果输入（improvementId + 前后评分 + 回访评论）
 */
export function trackImprovementEffect(input: ImprovementEffectInput): ImprovementEffect {
  const improvementId = input.improvementId || '';
  const hasBefore = typeof input.beforeScore === 'number' && Number.isFinite(input.beforeScore);
  const hasAfter = typeof input.afterScore === 'number' && Number.isFinite(input.afterScore);

  // 无复查数据：不臆造结论，明确标记待复查
  if (!hasBefore || !hasAfter) {
    return {
      improvementId,
      beforeScore: hasBefore ? input.beforeScore! : null,
      afterScore: hasAfter ? input.afterScore! : null,
      delta: null,
      verdict: 'no_change',
      standardized: false,
      needsRework: false,
      conclusion: '暂无改进后复查数据，待复查满意度后评定效果。',
    };
  }

  const before = input.beforeScore!;
  const after = input.afterScore!;
  const delta = Math.round((after - before) * 100) / 100;

  // 回访评论辅助：负面回访一票降级提示
  const negFollowUps = (input.followUpComments ?? [])
    .map((c) => normalize(c))
    .filter((c) => c && (Object.values(ISSUE_LEXICON) as string[][]).some((kws) => kws.some((kw) => c.includes(kw)))).length;

  let verdict: EffectVerdict;
  let standardized = false;
  let needsRework = false;
  let conclusion: string;

  if (after >= 4.5 && delta >= 1.0) {
    verdict = 'resolved';
    standardized = true;
    conclusion = `复查均分 ${after.toFixed(1)}（基线 ${before.toFixed(1)}，+${delta.toFixed(1)}），问题解决，措施标准化为制度。`;
  } else if (delta >= 0.5) {
    verdict = 'improved';
    conclusion = `复查均分 ${after.toFixed(1)}（基线 ${before.toFixed(1)}，+${delta.toFixed(1)}），有改善但未达解决线，继续保持。`;
  } else if (delta <= -0.5) {
    verdict = 'regressed';
    needsRework = true;
    conclusion = `复查均分 ${after.toFixed(1)}（基线 ${before.toFixed(1)}，${delta.toFixed(1)}），不升反降，升级医务处督办并回炉重分析。`;
  } else {
    verdict = 'no_change';
    needsRework = true;
    conclusion = `复查均分 ${after.toFixed(1)}（基线 ${before.toFixed(1)}，Δ=${delta.toFixed(1)}），改善不显著，回炉重新定位根因。`;
  }

  if (negFollowUps > 0 && verdict === 'resolved') {
    // 量化达标但回访仍有负面声音：不轻易标准化，提示人工复核
    standardized = false;
    conclusion += ` 注意：改进后仍有 ${negFollowUps} 条负面回访，措施暂缓标准化，需人工复核。`;
  }

  return { improvementId, beforeScore: before, afterScore: after, delta, verdict, standardized, needsRework, conclusion };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 1：闭环构建（收集→分析→改进→验证）                                    */
/* -------------------------------------------------------------------------- */

/**
 * buildSatisfactionLoop：把收集到的满意度信号构建为完整闭环视图。
 *
 * @param surveyData 原始信号数组（满意度/投诉/表扬混合）
 * @param improvements 已入库的改进事项效果记录（验证阶段输入，可缺省）
 * @returns 四阶段闭环视图
 */
export function buildSatisfactionLoop(
  surveyData: ReadonlyArray<SatisfactionSignal>,
  improvements?: ReadonlyArray<ImprovementEffectInput>,
): SatisfactionLoop {
  const signals = (surveyData ?? []).slice();

  /* ---- 收集 ---- */
  let satisfactionCount = 0;
  let complaintCount = 0;
  let praiseCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let dissatisfiedCount = 0;

  for (const s of signals) {
    const source = s.source ?? 'satisfaction';
    if (source === 'complaint') complaintCount += 1;
    else if (source === 'praise') praiseCount += 1;
    else satisfactionCount += 1;

    if (source === 'satisfaction' && typeof s.score === 'number' && Number.isFinite(s.score)) {
      scoreSum += s.score;
      scoreCount += 1;
    }
    if (isDissatisfiedSignal(s)) dissatisfiedCount += 1;
  }

  const total = signals.length;
  const avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0;
  const dissatisfactionRatio = total > 0 ? Math.round((dissatisfiedCount / total) * 1000) / 1000 : 0;

  /* ---- 分析：归类 + 根因 + 趋势 ---- */
  // 先把不满意信号按评论归类；无评论但低分的满意度信号归 other
  const buckets = new Map<IssueCategory, { count: number; samples: string[] }>();
  const datedHits = new Map<IssueCategory, string[]>(); // 用于趋势：收集每条命中的日期
  for (const s of signals) {
    if (!isDissatisfiedSignal(s)) continue;
    const text = normalize(s.comment ?? '');
    const cats = text ? hitCategories(text) : [];
    const effective: IssueCategory[] = cats.length > 0 ? cats : (s.source === 'complaint' || (s.score ?? 5) <= 3 ? ['other'] : []);
    for (const category of effective) {
      const bucket = buckets.get(category) ?? { count: 0, samples: [] };
      bucket.count += 1;
      if (text && bucket.samples.length < 3 && !bucket.samples.includes(text)) {
        bucket.samples.push(text);
      }
      buckets.set(category, bucket);
      if (s.date) {
        const d = datedHits.get(category) ?? [];
        d.push(s.date);
        datedHits.set(category, d);
      }
    }
  }

  const issues: LoopIssue[] = [];
  for (const [category, b] of buckets.entries()) {
    // 趋势：前后两期各占一半，对比负面条数
    let trend: TrendSignal = 'stable';
    const dates = (datedHits.get(category) ?? []).slice().sort();
    if (dates.length >= 4) {
      const mid = Math.floor(dates.length / 2);
      const early = mid;
      const late = dates.length - mid;
      if (late > early * 1.3) trend = 'rising';
      else if (late < early * 0.7) trend = 'falling';
    }
    issues.push({
      category,
      label: ISSUE_LABEL[category],
      count: b.count,
      severity: severityOf(b.count),
      trend,
      sampleComments: b.samples,
    });
  }
  issues.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  /* ---- 改进：根因分析 + 措施生成 ---- */
  const actions: LoopAction[] = issues.map((issue) => {
    const rc = analyzeSatisfactionRootCause({
      category: issue.category,
      sampleComments: issue.sampleComments,
      severity: issue.severity,
    });
    return generateImprovementAction({ category: issue.category, severity: issue.severity }, rc);
  });

  /* ---- 验证：逐条效果跟踪 ---- */
  const effectInputs = improvements ?? [];
  const effects = effectInputs.map((e) => trackImprovementEffect(e));
  const verify: VerifySummary = {
    total: effects.length,
    resolvedCount: effects.filter((e) => e.verdict === 'resolved').length,
    improvedCount: effects.filter((e) => e.verdict === 'improved').length,
    noChangeCount: effects.filter((e) => e.verdict === 'no_change').length,
    regressedCount: effects.filter((e) => e.verdict === 'regressed').length,
    standardizedCount: effects.filter((e) => e.standardized).length,
    reworkCount: effects.filter((e) => e.needsRework).length,
    effects,
  };

  return {
    collect: {
      total,
      satisfactionCount,
      complaintCount,
      praiseCount,
      avgScore,
      dissatisfactionRatio,
    },
    analyze: {
      issues,
      // 样本量过小不夸大结论（n<10）
      underpowered: total < 10,
    },
    improve: { actions },
    verify,
  };
}
