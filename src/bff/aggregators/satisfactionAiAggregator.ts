/**
 * 健澜科技 jlmedaios - 患者满意度智能化分析聚合器（M153-D，纯函数）
 *
 * 【临床决策支持】本模块不替代医师诊断，仅基于患者自由文本评论做
 *   结构化情感倾向判定、关键问题抽取与改进计划生成，服务于运营
 *   质量闭环；产出落库字段见 deploy/postgres/init/311-satisfaction-ai.sql。
 *
 * 三个纯函数：
 *   - analyzeSatisfactionFeedback(comments)：统计正/中/负情感占比，
 *     内置负面关键词词典（等待/态度/费用/环境/沟通/流程/预约/疗效）
 *     与正面词典；逐评论打分，命中负面 > 正面判负面，反之判正面。
 *   - extractKeyIssues(comments)：把命中负面词典的评论按类别聚合，
 *     给出严重度（high/medium/low）与代表性评论样本。
 *   - generateImprovementPlan(lowScoreDepts)：按低分科室/维度生成
 *     优先级与可执行改进动作清单，供管理员派单。
 *
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/satisfactionAi.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                    */
/* -------------------------------------------------------------------------- */

/** 情感倾向三态 */
export type Emotion = 'positive' | 'neutral' | 'negative';

/** 情感分析结果 */
export interface SentimentResult {
  /** 参评评论总数 */
  total: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  /** 负面占比 = negativeCount / total（0-1），样本为 0 时为 0 */
  negativeRatio: number;
  /** 整体倾向：negativeCount 占比 ≥ 0.4 → negative；≥ 0.2 → neutral；否则 positive */
  overall: Emotion;
}

/** 关键问题类别 */
export type IssueCategory =
  | 'wait_time'         // 等待/排队
  | 'staff_attitude'    // 医护态度
  | 'cost'              // 费用透明度
  | 'environment'        // 就医环境
  | 'communication'      // 医患沟通
  | 'process'            // 就诊流程
  | 'appointment'        // 预约挂号
  | 'treatment_effect'; // 疗效感知

/** 抽取到的关键问题 */
export interface KeyIssue {
  category: IssueCategory;
  /** 中文展示名 */
  label: string;
  /** 命中该类别的评论条数 */
  count: number;
  severity: 'high' | 'medium' | 'low';
  /** 代表性评论样本（去重后最多 3 条） */
  sampleComments: string[];
}

/** 低分科室/维度输入（由路由层按 source_type 或 dept_code 聚合后传入） */
export interface LowScoreDept {
  /** 科室或维度标识 */
  dept: string;
  /** 该科室/维度均分（1-5） */
  avgScore: number;
  /** 该科室/维度下命中关键问题的评论条数 */
  issueCount: number;
}

/** 改进计划条目 */
export interface ImprovementPlan {
  dept: string;
  avgScore: number;
  priority: 'high' | 'medium' | 'low';
  /** 可执行动作清单 */
  actions: string[];
  /** 量化改进目标 */
  target: string;
}

/* -------------------------------------------------------------------------- */
/* 词典（内置负面关键词词典，可在不引入外部依赖的情况下覆盖主流抱怨语义）       */
/* -------------------------------------------------------------------------- */

/** 负面关键词词典：类别 → 关键词数组（子串匹配，全部小写后比较） */
export const NEGATIVE_LEXICON: Readonly<Record<IssueCategory, string[]>> = {
  wait_time: [
    '等待', '排队', '候诊', '太久', '半天', '等了', '等很久', '等半天', '等一个',
    '排长队', '人太多',
  ],
  staff_attitude: [
    '态度差', '态度恶劣', '不耐烦', '冷漠', '凶', '不理', '敷衍', '甩脸',
    '态度不好', '说话难听', '训斥',
  ],
  cost: [
    '贵', '乱收费', '收费高', '费用高', '报销难', '发票', '花了很多',
    '药费贵', '隐形消费', '不合理收费',
  ],
  environment: [
    '脏', '拥挤', '吵', '卫生间', '异味', '太冷', '太热', '环境差',
    '床脏', '被子脏', '味大',
  ],
  communication: [
    '解释不清', '不告知', '听不懂', '没说清', '沟通差', '不解释',
    '不说清楚', '一问三不知',
  ],
  process: [
    '跑多次', '麻烦', '繁琐', '来回跑', '折腾', '手续多', '跑断腿',
    '反复排队',
  ],
  appointment: [
    '约不上', '号贩子', '抢号', '挂不上', '挂号难', '一号难求',
  ],
  treatment_effect: [
    '没效果', '复发', '误诊', '治不好', '疼痛', '没治好', '不见好',
    '越治越重',
  ],
};

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
};

/** 正面词典 */
const POSITIVE_LEXICON: ReadonlyArray<string> = [
  '满意', '谢谢', '感谢', '周到', '耐心', '清楚', '专业', '赞',
  '不错', '贴心', '认真', '负责', '热情', '温暖', '好评',
];

/* -------------------------------------------------------------------------- */
/* 内部工具                                                                    */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return (text || '').trim().toLowerCase();
}

/** 统计一条评论命中的关键词数量 */
function countHits(text: string, lex: ReadonlyArray<string>): number {
  let n = 0;
  for (const kw of lex) {
    if (text.includes(kw.toLowerCase())) n += 1;
  }
  return n;
}

/** 单条评论情感判定 */
function classifyOne(comment: string): Emotion {
  const text = normalize(comment);
  if (!text) return 'neutral';
  const neg = (Object.values(NEGATIVE_LEXICON) as string[][])
    .reduce((sum, kws) => sum + countHits(text, kws), 0);
  const pos = countHits(text, POSITIVE_LEXICON);
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

function severityOf(count: number): KeyIssue['severity'] {
  if (count >= 5) return 'high';
  if (count >= 2) return 'medium';
  return 'low';
}

/* -------------------------------------------------------------------------- */
/* 纯函数 1：情感分析                                                          */
/* -------------------------------------------------------------------------- */

/**
 * analyzeSatisfactionFeedback：批量评论情感分析。
 *
 * @param comments 自由文本评论数组（空串/空白会被跳过）
 * @returns 正/中/负计数、负面占比与整体倾向
 *
 * 整体倾向规则：
 *   - negativeRatio ≥ 0.4 → 'negative'
 *   - negativeRatio ≥ 0.2 → 'neutral'
 *   - 其余（含 total=0）→ 'positive'（无负面信号视为正面基线）
 */
export function analyzeSatisfactionFeedback(comments: ReadonlyArray<string>): SentimentResult {
  const clean = (comments || []).map((c) => normalize(c)).filter((c) => c.length > 0);
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  for (const c of clean) {
    const label = classifyOne(c);
    if (label === 'positive') positiveCount += 1;
    else if (label === 'negative') negativeCount += 1;
    else neutralCount += 1;
  }
  const total = clean.length;
  const negativeRatio = total > 0 ? Math.round((negativeCount / total) * 1000) / 1000 : 0;
  let overall: Emotion = 'positive';
  if (negativeRatio >= 0.4) overall = 'negative';
  else if (negativeRatio >= 0.2) overall = 'neutral';
  return { total, positiveCount, neutralCount, negativeCount, negativeRatio, overall };
}

/* -------------------------------------------------------------------------- */
/* 纯函数 2：关键问题抽取                                                      */
/* -------------------------------------------------------------------------- */

/**
 * extractKeyIssues：从评论中抽取关键问题类别。
 *
 * 一条评论可同时命中多个类别（如「排队太久，医生态度还差」同时命中
 * wait_time 与 staff_attitude），各类别独立计数。
 *
 * @param comments 自由文本评论数组
 * @returns 按命中条数倒序的 KeyIssue 列表（空数组表示无负面信号）
 */
export function extractKeyIssues(comments: ReadonlyArray<string>): KeyIssue[] {
  const clean = (comments || []).map((c) => normalize(c)).filter((c) => c.length > 0);
  const buckets = new Map<IssueCategory, { count: number; samples: string[] }>();

  for (const c of clean) {
    for (const category of Object.keys(NEGATIVE_LEXICON) as IssueCategory[]) {
      const kws = NEGATIVE_LEXICON[category];
      const hit = kws.some((kw) => c.includes(kw.toLowerCase()));
      if (!hit) continue;
      const bucket = buckets.get(category) ?? { count: 0, samples: [] };
      bucket.count += 1;
      // 样本去重，最多保留 3 条原文
      if (bucket.samples.length < 3 && !bucket.samples.includes(c)) {
        bucket.samples.push(c);
      }
      buckets.set(category, bucket);
    }
  }

  const result: KeyIssue[] = [];
  for (const [category, b] of buckets.entries()) {
    result.push({
      category,
      label: ISSUE_LABEL[category],
      count: b.count,
      severity: severityOf(b.count),
      sampleComments: b.samples,
    });
  }
  // 命中条数倒序，同级按类别名稳定排序
  result.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  return result;
}

/* -------------------------------------------------------------------------- */
/* 纯函数 3：改进计划生成                                                      */
/* -------------------------------------------------------------------------- */

/** 每个类别对应的改进动作模板（用于高优问题时叠加） */
const ISSUE_ACTIONS: Readonly<Record<IssueCategory, string>> = {
  wait_time: '启动分时段预约与弹性出诊，高峰时段增设导诊岗，目标候诊 ≤ 30 分钟',
  staff_attitude: '开展服务礼仪与共情沟通专项培训，月度服务明星公示，投诉 48h 内回访',
  cost: '费用清单自助打印与公众号实时推送，开展收费项目公示与医保政策解读',
  environment: '每日两次环境卫生巡检，高峰时段增加卫生间保洁频次，优化等候区通风与座椅',
  communication: '推行「三分钟病情解释」标准动作，出院小结加印康复注意事项二维码',
  process: '一站式服务中心集成挂号/缴费/报告打印，减少患者往返窗口次数',
  appointment: '开放放号窗口期公示，严打号贩子，互联网医院复诊续方免排队',
  treatment_effect: '疑难病例 MDT 讨论，建立出院后 7/30 天随访闭环，复发预警提前干预',
};

/**
 * generateImprovementPlan：根据低分科室/维度生成改进计划。
 *
 * 优先级规则：
 *   - avgScore < 2.5 或 issueCount ≥ 5 → high
 *   - avgScore < 3.5 或 issueCount ≥ 2 → medium
 *   - 其余 → low
 *
 * @param lowScoreDepts 低分科室/维度列表
 * @returns 按优先级（high → medium → low）与均分升序排列的改进计划
 */
export function generateImprovementPlan(
  lowScoreDepts: ReadonlyArray<LowScoreDept>,
): ImprovementPlan[] {
  const input = (lowScoreDepts || []).slice();
  const plans: ImprovementPlan[] = input.map((d) => {
    const score = Number.isFinite(d.avgScore) ? d.avgScore : 5;
    const issues = Number.isFinite(d.issueCount) ? d.issueCount : 0;
    let priority: ImprovementPlan['priority'] = 'low';
    if (score < 2.5 || issues >= 5) priority = 'high';
    else if (score < 3.5 || issues >= 2) priority = 'medium';

    const actions: string[] = [];
    // 通用动作：按优先级加派单动作
    if (priority === 'high') {
      actions.push(`${d.dept}：由科主任牵头，7 个工作日内提交整改方案并报医务处备案`);
    } else if (priority === 'medium') {
      actions.push(`${d.dept}：科室质控小组两周内完成自查并提交改进清单`);
    } else {
      actions.push(`${d.dept}：纳入月度科室运营例会跟踪，季度复评`);
    }
    // 若路由层已抽取到该科室下的关键问题类别，附加对应动作模板
    // （此处由调用方在 issueCount>0 时自行拼接，本函数保持纯数据驱动）
    if (issues > 0) {
      actions.push(`针对 ${issues} 条负面评论逐条回访患者，闭环处理率 100%`);
    }
    const target = `30 天内 ${d.dept} 满意度均分由 ${score.toFixed(1)} 提升至 ${Math.min(5, score + 1).toFixed(1)}`;
    return { dept: d.dept, avgScore: score, priority, actions, target };
  });

  const order: Record<ImprovementPlan['priority'], number> = { high: 0, medium: 1, low: 2 };
  plans.sort((a, b) => order[a.priority] - order[b.priority] || a.avgScore - b.avgScore);
  return plans;
}

/** 供路由层在生成计划后，把 KeyIssue 动作模板附加到对应科室（非纯函数，独立导出） */
export function actionTemplateFor(category: IssueCategory): string {
  return ISSUE_ACTIONS[category];
}
