/**
 * 健澜科技 jlmedaios - 【科研管理深化】科研项目全生命周期聚合器（M162-C）
 *
 * 【医院全场景】科研管理要真实，不能凑数：
 *   - 课题管理：国自然（nsfc）/ 省自然（provincial）/ 院级（institute）三档闭环；
 *   - 论文管理：投稿 submitted → 接收 accepted → 发表 published → 被引 cited；
 *   - 成果转化：专利 patent / 软著 software / 产品 product，区分受理与授权/上线；
 *   - 经费管理：预算 budget / 支出 spent / 结题审计 auditStatus 三栏对照。
 *
 * 纯函数约定（与全仓聚合器一致）：
 *   - buildResearchPortfolio / trackProjectMilestone / calculateResearchImpact
 *     均为纯计算，不修改入参、不触库、不读时钟；
 *   - 里程碑乱序 / 重复 / 越档一律抛错，由路由层收敛为 400；
 *   - 影响力得分口径透明可手算（论文 40 + 转化 30 + 经费执行 20 + 进度 10），
 *     禁止前端自报分数。
 *
 * 不触碰 WebSocket，不新增依赖。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { LITERATURE_DICTIONARY } from './researchLitAggregator';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                          */
/* ------------------------------------------------------------------ */

/** 课题档次（与 research.research_project_deep.category CHECK 一致） */
export type ProjectCategory = 'nsfc' | 'provincial' | 'institute';

/** 项目状态闭环 */
export type ProjectStatus = 'applying' | 'active' | 'completed' | 'accepted';

/** 里程碑阶段（顺序即生命周期，乱序在 trackProjectMilestone 中拦截） */
export type MilestoneStage =
  | 'proposal'   // 申报
  | 'approval'   // 立项
  | 'midterm'    // 中期检查
  | 'closing'    // 结题
  | 'acceptance';// 验收

/** 论文阶段 */
export type PaperStage = 'submitted' | 'accepted' | 'published' | 'cited';

/** 成果转化类别 */
export type OutputKind = 'patent' | 'software' | 'product';

/** 成果转化状态 */
export type OutputStatus = 'filed' | 'granted' | 'online';

/** 一篇论文流水 */
export interface ResearchPaper {
  title: string;
  journal: string;
  stage: PaperStage;
  citations: number;
}

/** 一项成果转化流水 */
export interface ResearchOutput {
  name: string;
  kind: OutputKind;
  status: OutputStatus;
}

/** 一条里程碑留痕 */
export interface MilestoneRecord {
  name: string;
  stage: MilestoneStage;
  recordedAt: string;
}

/** 一个科研课题（BFF 对外形态，camelCase） */
export interface ResearchProjectDeep {
  id: string;
  projectNo: string;
  title: string;
  dept: string;
  year: number;
  category: ProjectCategory;
  leader: string;
  status: ProjectStatus;
  progress: number;
  /** 预算（万元） */
  budget: number;
  /** 已支出（万元） */
  spent: number;
  auditStatus: 'pending' | 'passed' | 'issues';
  milestones: MilestoneRecord[];
  papers: ResearchPaper[];
  outputs: ResearchOutput[];
  impactScore: number;
}

/** 影响力计算结果 */
export interface ResearchImpact {
  projectId: string;
  /** 总分 0~100 */
  score: number;
  /** 等级 A(≥80) / B(≥60) / C(≥40) / D(<40) */
  grade: 'A' | 'B' | 'C' | 'D';
  /** 分项明细（各分上限见分母注释） */
  breakdown: {
    /** 论文分，上限 40（发表篇数×10 封顶 20 + 引用×0.5 封顶 20） */
    paper: number;
    /** 转化分，上限 30（专利 8 / 软著 6 / 产品 15，授权/上线加倍） */
    output: number;
    /** 经费执行分，上限 20（spent/budget × 20） */
    budget: number;
    /** 进度分，上限 10（progress/100 × 10） */
    progress: number;
  };
}

/** 科室年度课题组合汇总 */
export interface ResearchPortfolioSummary {
  totalCount: number;
  byCategory: Record<ProjectCategory, number>;
  byStatus: Record<ProjectStatus, number>;
  /** 预算合计（万元） */
  budgetTotal: number;
  /** 支出合计（万元） */
  spentTotal: number;
  /** 论文分阶段计数 */
  paperCounts: Record<PaperStage, number>;
  /** 累计引用 */
  totalCitations: number;
  /** 成果转化分类计数 */
  outputCounts: Record<OutputKind, number>;
  /** 平均影响力得分 */
  avgImpact: number;
  /** 结题审计有问题的课题数 */
  auditIssueCount: number;
}

export interface ResearchPortfolio {
  dept: string;
  year: number;
  summary: ResearchPortfolioSummary;
  projects: ResearchProjectDeep[];
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 里程碑阶段顺序（下标即进度档位） */
export const MILESTONE_ORDER: readonly MilestoneStage[] = [
  'proposal', 'approval', 'midterm', 'closing', 'acceptance',
];

/** 各里程碑阶段对应的进度档位（纯函数推进依据） */
const STAGE_PROGRESS: Record<MilestoneStage, number> = {
  proposal: 20,
  approval: 40,
  midterm: 60,
  closing: 90,
  acceptance: 100,
};

/** 内置科室年度种子课题：科研管理页在 DB 未迁移时的真实演示口径 */
const SEED_PORTFOLIO: ReadonlyArray<ResearchProjectDeep> = [
  {
    id: 'PRJ-2026-NEU-001', projectNo: 'NSFC-2026-001',
    title: '基于多组学的脑小血管病影像标志物研究', dept: 'NEU', year: 2026,
    category: 'nsfc', leader: '王建国', status: 'active', progress: 60,
    budget: 55, spent: 31.2, auditStatus: 'pending',
    milestones: [
      { name: '课题申报', stage: 'proposal', recordedAt: '2026-01-10' },
      { name: '国自然立项', stage: 'approval', recordedAt: '2026-03-20' },
      { name: '中期检查', stage: 'midterm', recordedAt: '2026-09-15' },
    ],
    papers: [
      { title: '脑小血管病磁共振影像组学特征提取', journal: '中华放射学杂志', stage: 'published', citations: 12 },
      { title: 'Multi-omics markers in CSVD', journal: 'J Neurol', stage: 'accepted', citations: 0 },
    ],
    outputs: [
      { name: '脑小血管病影像分析软件 V1.0', kind: 'software', status: 'granted' },
    ],
    impactScore: 0,
  },
  {
    id: 'PRJ-2026-NEU-002', projectNo: 'PROV-2026-014',
    title: '老年认知障碍早期筛查路径研究', dept: 'NEU', year: 2026,
    category: 'provincial', leader: '李秀兰', status: 'active', progress: 40,
    budget: 15, spent: 6.8, auditStatus: 'pending',
    milestones: [
      { name: '课题申报', stage: 'proposal', recordedAt: '2026-02-01' },
      { name: '省自然立项', stage: 'approval', recordedAt: '2026-05-12' },
    ],
    papers: [
      { title: '社区老年认知筛查工具适用性评价', journal: '中华老年医学杂志', stage: 'submitted', citations: 0 },
    ],
    outputs: [],
    impactScore: 0,
  },
  {
    id: 'PRJ-2026-NEU-003', projectNo: 'INST-2026-032',
    title: '头痛门诊结构化问诊模板建设', dept: 'NEU', year: 2026,
    category: 'institute', leader: '陈静', status: 'completed', progress: 90,
    budget: 3, spent: 2.9, auditStatus: 'passed',
    milestones: [
      { name: '课题申报', stage: 'proposal', recordedAt: '2026-01-15' },
      { name: '院级立项', stage: 'approval', recordedAt: '2026-02-28' },
      { name: '结题报告提交', stage: 'closing', recordedAt: '2026-08-30' },
    ],
    papers: [
      { title: '头痛门诊结构化问诊的应用体会', journal: '中国卒中杂志', stage: 'published', citations: 3 },
    ],
    outputs: [
      { name: '头痛智能问答产品原型', kind: 'product', status: 'online' },
    ],
    impactScore: 0,
  },
  {
    id: 'PRJ-2025-CAR-008', projectNo: 'NSFC-2025-011',
    title: '冠心病人工智能心电预警模型研究', dept: 'CAR', year: 2025,
    category: 'nsfc', leader: '陈志远', status: 'accepted', progress: 100,
    budget: 50, spent: 48.5, auditStatus: 'passed',
    milestones: [
      { name: '课题申报', stage: 'proposal', recordedAt: '2025-01-08' },
      { name: '国自然立项', stage: 'approval', recordedAt: '2025-03-15' },
      { name: '中期检查', stage: 'midterm', recordedAt: '2025-09-10' },
      { name: '结题报告', stage: 'closing', recordedAt: '2026-06-30' },
      { name: '验收通过', stage: 'acceptance', recordedAt: '2026-09-28' },
    ],
    papers: [
      { title: 'AI-ECG early warning for CAD', journal: 'Eur Heart J', stage: 'cited', citations: 47 },
      { title: '心电深度学习特征工程实践', journal: '中华心血管病杂志', stage: 'published', citations: 9 },
    ],
    outputs: [
      { name: '一种心电异常预警方法', kind: 'patent', status: 'granted' },
      { name: '冠心病心电预警系统 V2.0', kind: 'software', status: 'granted' },
      { name: '院内心电实时预警产品', kind: 'product', status: 'online' },
    ],
    impactScore: 0,
  },
];

/** 全量种子课题（路由层里程碑登记内存台账的初始数据；断库时可真实回读） */
export const SEED_PROJECTS: ReadonlyArray<ResearchProjectDeep> = SEED_PORTFOLIO;

/* ------------------------------------------------------------------ */
/* 工具函数                                                            */
/* ------------------------------------------------------------------ */

/** 宽松收敛为 trim 后字符串 */
function toText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/** 数值收敛（非法按 0） */
function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** 深拷贝一个课题（纯函数不修改入参） */
function cloneProject(p: ResearchProjectDeep): ResearchProjectDeep {
  return {
    ...p,
    milestones: p.milestones.map((m) => ({ ...m })),
    papers: p.papers.map((x) => ({ ...x })),
    outputs: p.outputs.map((o) => ({ ...o })),
  };
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【科研管理深化】计算单个课题的科研影响力得分。
 *
 * 口径透明可手算（满分 100）：
 *   - 论文分（≤40）：published/cited 每篇 10 分封顶 20；总引用 × 0.5 封顶 20；
 *   - 转化分（≤30）：专利授权 8（受理 4）、软著授权 6（受理 3）、
 *     产品上线 15（其他状态 5）；
 *   - 经费执行分（≤20）：min(spent/budget, 1) × 20；
 *   - 进度分（≤10）：progress / 100 × 10。
 *
 * 纯函数：不修改入参，不触库。
 */
export function calculateResearchImpact(
  project: ResearchProjectDeep,
): ResearchImpact {
  if (!project || !toText(project.id)) {
    throw new Error('课题对象或 project.id 不能为空');
  }

  // —— 论文分 ——
  const publishedCount = project.papers.filter(
    (p) => p.stage === 'published' || p.stage === 'cited',
  ).length;
  const totalCitations = project.papers.reduce((s, p) => s + toNumber(p.citations), 0);
  const paperPubPart = Math.min(publishedCount * 10, 20);
  const paperCitePart = Math.min(totalCitations * 0.5, 20);
  const paper = Math.round((paperPubPart + paperCitePart) * 100) / 100;

  // —— 成果转化分 ——
  let output = 0;
  for (const o of project.outputs) {
    if (o.kind === 'patent') output += o.status === 'granted' ? 8 : o.status === 'filed' ? 4 : 0;
    else if (o.kind === 'software') output += o.status === 'granted' ? 6 : o.status === 'filed' ? 3 : 0;
    else if (o.kind === 'product') output += o.status === 'online' ? 15 : 5;
  }
  output = Math.min(Math.round(output * 100) / 100, 30);

  // —— 经费执行分 ——
  const budget = toNumber(project.budget);
  const spent = Math.min(toNumber(project.spent), budget);
  const budgetScore = budget > 0 ? Math.min(spent / budget, 1) * 20 : 0;

  // —— 进度分 ——
  const progressScore = Math.min(toNumber(project.progress), 100) / 100 * 10;

  const raw = paper + output + budgetScore + progressScore;
  const score = Math.min(Math.round(raw * 100) / 100, 100);
  const grade: ResearchImpact['grade'] =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  return {
    projectId: project.id,
    score,
    grade,
    breakdown: {
      paper,
      output,
      budget: Math.round(budgetScore * 100) / 100,
      progress: Math.round(progressScore * 100) / 100,
    },
  };
}

/**
 * 【科研管理深化】里程碑推进（纯函数）。
 *
 * 校验口径：
 *   - 阶段必须 ∈ MILESTONE_ORDER；
 *   - 同一阶段不可重复登记（重复抛错）；
 *   - 新阶段不得早于最近一次已登记阶段（禁止倒序补登）；
 *   - 返回新课题对象：milestones 追加、progress 按阶段档位刷新、
 *     status 随进度闭环（≥100 accepted / 结题后 completed / >0 active）。
 *
 * @param project    原课题（不被修改）
 * @param milestone  新增里程碑（name 必填，stage 必填，recordedAt 可选 ISO 日期）
 */
export function trackProjectMilestone(
  project: ResearchProjectDeep,
  milestone: { name: unknown; stage: unknown; recordedAt?: unknown },
): ResearchProjectDeep {
  if (!project || !toText(project.id)) {
    throw new Error('课题对象或 project.id 不能为空');
  }
  const name = toText(milestone?.name);
  if (!name) throw new Error('里程碑名称 name 不能为空');

  const stage = toText(milestone.stage) as MilestoneStage;
  if (!MILESTONE_ORDER.includes(stage)) {
    throw new Error(`里程碑阶段 stage 非法：${stage}，须为 ${MILESTONE_ORDER.join('/')}`);
  }
  const stageIdx = MILESTONE_ORDER.indexOf(stage);
  const existingStages = project.milestones.map((m) => m.stage);
  if (existingStages.includes(stage)) {
    throw new Error(`里程碑阶段 ${stage} 已登记，禁止重复`);
  }
  const lastIdx = existingStages.length
    ? Math.max(...existingStages.map((s) => MILESTONE_ORDER.indexOf(s)))
    : -1;
  if (stageIdx <= lastIdx) {
    throw new Error(`里程碑 ${stage} 早于或等于最近已登记阶段，禁止倒序补登`);
  }

  const next = cloneProject(project);
  next.milestones.push({
    name,
    stage,
    recordedAt: toText(milestone?.recordedAt) || '1970-01-01',
  });

  // 进度按最新阶段档位刷新
  next.progress = STAGE_PROGRESS[stage];

  // 状态闭环
  if (next.progress >= 100) next.status = 'accepted';
  else if (next.progress >= 90) next.status = 'completed';
  else if (next.progress > 0) next.status = 'active';

  // 回写影响力快照
  next.impactScore = calculateResearchImpact(next).score;
  return next;
}

/**
 * 【科研管理深化】构建科室年度课题组合。
 *
 * 纯函数：按 dept + year 过滤课题（缺省使用内置真实口径种子数据集），
 * 逐课题回算影响力得分并汇总。不触库、不读时钟。
 *
 * @param dept    承担科室编码（必填）
 * @param year    立项年度（必填）
 * @param projects 课题全集（缺省使用 SEED_PORTFOLIO，便于单测与断库演示）
 */
export function buildResearchPortfolio(
  dept: unknown,
  year: unknown,
  projects?: ReadonlyArray<ResearchProjectDeep>,
): ResearchPortfolio {
  const deptCode = toText(dept);
  if (!deptCode) throw new Error('承担科室 dept 不能为空');
  const yearNum = typeof year === 'number' ? year : Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    throw new Error('立项年度 year 必须为 2000~2100 的整数');
  }

  const pool = projects ?? SEED_PORTFOLIO;
  const matched = pool
    .filter((p) => p.dept === deptCode && p.year === yearNum)
    .map((p) => {
      const enriched = cloneProject(p);
      enriched.impactScore = calculateResearchImpact(enriched).score;
      return enriched;
    });

  const emptyCounts = (): Record<ProjectCategory, number> => ({ nsfc: 0, provincial: 0, institute: 0 });
  const emptyStatus = (): Record<ProjectStatus, number> => ({ applying: 0, active: 0, completed: 0, accepted: 0 });
  const emptyPapers = (): Record<PaperStage, number> => ({ submitted: 0, accepted: 0, published: 0, cited: 0 });
  const emptyOutputs = (): Record<OutputKind, number> => ({ patent: 0, software: 0, product: 0 });

  const byCategory = emptyCounts();
  const byStatus = emptyStatus();
  const paperCounts = emptyPapers();
  const outputCounts = emptyOutputs();
  let budgetTotal = 0;
  let spentTotal = 0;
  let totalCitations = 0;
  let impactSum = 0;
  let auditIssueCount = 0;

  for (const p of matched) {
    byCategory[p.category] += 1;
    byStatus[p.status] += 1;
    budgetTotal += toNumber(p.budget);
    spentTotal += toNumber(p.spent);
    impactSum += toNumber(p.impactScore);
    if (p.auditStatus === 'issues') auditIssueCount += 1;
    for (const paper of p.papers) {
      paperCounts[paper.stage] += 1;
      totalCitations += toNumber(paper.citations);
    }
    for (const o of p.outputs) outputCounts[o.kind] += 1;
  }

  const summary: ResearchPortfolioSummary = {
    totalCount: matched.length,
    byCategory,
    byStatus,
    budgetTotal: Math.round(budgetTotal * 100) / 100,
    spentTotal: Math.round(spentTotal * 100) / 100,
    paperCounts,
    totalCitations,
    outputCounts,
    avgImpact: matched.length
      ? Math.round((impactSum / matched.length) * 100) / 100
      : 0,
    auditIssueCount,
  };

  return { dept: deptCode, year: yearNum, summary, projects: matched };
}

/* ################################################################## */
/* M166-C【绩效与人才】AI 辅助科研深化                                  */
/* ------------------------------------------------------------------ */
/* 文献综述 / 实验设计 / 统计方案 / 论文初稿 四件套纯函数。              */
/*                                                                     */
/* 真实红线：                                                           */
/*  · 文献全部取自 researchLitAggregator.LITERATURE_DICTIONARY——       */
/*    内置词典均为真实发表论文（期刊/作者/年份可查），本切片不新造一条   */
/*    假文献、不编 DOI；正式环境应接 PubMed/CNKI 检索接口替换词典；     */
/*  · 论文初稿的结果段只复述调用方传入的实测结果，缺省一律落「待填入」   */
/*    占位，严禁由 AI 预造数字；                                        */
/*  · 纯函数：不触库、不发网络、不读时钟、不改入参。                    */
/* ################################################################## */

/** 文献检索年份闭区间（均可空） */
export interface ReviewYearRange {
  start?: number;
  end?: number;
}

/** 研究方法学标签（按关键词自动归类） */
export type MethodTag =
  | 'ai_deep_learning'   // 深度学习 / 人工智能
  | 'cohort_prognosis'   // 队列 / 预后评分
  | 'epidemiology'       // 疾病负担 / 统计报告
  | 'systematic_review'  // 系统综述 / 综述
  | 'other';

/** 方法标签的中文标签与优劣势口径（方法对比用） */
const METHOD_PROFILE: Record<MethodTag, { label: string; strengths: string; weaknesses: string }> = {
  ai_deep_learning: {
    label: '深度学习/人工智能',
    strengths: '高维特征自动提取，影像/EHR 规模化后判别精度可达专家水平',
    weaknesses: '数据需求大、黑箱可解释性弱、外部验证偏倚常见，易过拟合',
  },
  cohort_prognosis: {
    label: '队列/预后评分',
    strengths: '暴露-结局时序清晰，可计算发病率与 HR，评分工具可 bedside 复用',
    weaknesses: '随访失访、混杂需校正；评分外部迁移性受限',
  },
  epidemiology: {
    label: '疾病负担/统计报告',
    strengths: '人群级发病率/死亡率权威锚点，支撑立项依据与样本量假设',
    weaknesses: '描述性为主、无因果推断，跨区域外推需谨慎',
  },
  systematic_review: {
    label: '系统综述',
    strengths: '合并既有证据、明确偏倚风险与证据等级，是 gap 分析的金标准',
    weaknesses: '依赖纳入研究质量，发表偏倚可能夸大效应',
  },
  other: {
    label: '其他方法学',
    strengths: '方法杂糅，视具体研究而定',
    weaknesses: '方法学异质性高，需逐篇甄别',
  },
};

/** 命中文献条目（综述产物） */
export interface MatchedPaper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  keywords: string[];
  methodTag: MethodTag;
  /** 自动提取的要点摘要（首句截取，不编造结论） */
  keyPoint: string;
  /** Vancouver 风格完整引用 */
  citation: string;
}

/** 研究趋势分析产物 */
export interface ReviewTrend {
  /** 按年分布（升序） */
  byYear: Array<{ year: number; count: number }>;
  /** 热点关键词（频次降序，top 8） */
  hotKeywords: Array<{ tag: string; count: number }>;
  /** 热点演变：命中文献按年份三等分的早期/中期/近期标签 */
  evolution: Array<{ band: string; topTags: Array<{ tag: string; count: number }> }>;
}

/** 不同研究方法对比产物 */
export interface MethodComparison {
  method: MethodTag;
  methodLabel: string;
  count: number;
  paperIds: string[];
  strengths: string;
  weaknesses: string;
}

/** 文献综述总产物 */
export interface LiteratureReview {
  topic: string;
  yearRange: ReviewYearRange;
  /** 命中总数（topK 截断前） */
  totalMatched: number;
  papers: MatchedPaper[];
  /** 摘要总结：跨文献自动提取的要点列表 */
  keyPoints: string[];
  trend: ReviewTrend;
  methodComparison: MethodComparison[];
  /** 真实性声明（前端必显） */
  sourceDisclaimer: string;
}

/** 方法学归类（按关键词命中，互斥优先级） */
function classifyMethod(keywords: string[]): MethodTag {
  const k = keywords.join(' ');
  if (/深度学习|人工智能|神经网络/.test(k)) return 'ai_deep_learning';
  if (/队列|预后评分/.test(k)) return 'cohort_prognosis';
  if (/系统综述|综述/.test(k)) return 'systematic_review';
  if (/肿瘤统计|GLOBOCAN|疾病负担/.test(k)) return 'epidemiology';
  return 'other';
}

/** 截取摘要首句作为自动要点（不归纳、不外推） */
function firstSentence(abstract: string, max = 90): string {
  const hit = abstract.match(/[^。.!?！？]+[。.!?！？]?/);
  const s = (hit ? hit[0] : abstract).trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** 年份闭区间校验（非法抛错） */
function sanitizeYearRange(raw: unknown): ReviewYearRange {
  const range: ReviewYearRange = {};
  if (raw == null) return range;
  if (typeof raw !== 'object') throw new Error('yearRange 须为对象 { start, end }');
  const r = raw as Record<string, unknown>;
  for (const [key, val] of [['start', r.start], ['end', r.end]] as const) {
    if (val == null || val === '') continue;
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isInteger(n) || n < 1900 || n > 2100) {
      throw new Error(`年份区间 ${key} 非法：${String(val)}，须为 1900~2100 整数`);
    }
    range[key] = n;
  }
  if (range.start != null && range.end != null && range.start > range.end) {
    throw new Error(`年份区间 start(${range.start}) 大于 end(${range.end})`);
  }
  return range;
}

/**
 * 【绩效与人才·M166-C】构建文献综述（纯函数）。
 *
 * 流程：
 *   1. 在真实文献词典中按主题（题名/摘要/关键词子串，忽略大小写）+
 *      年份闭区间过滤，按发表年降序、topK 截断；
 *   2. 摘要总结：逐篇取摘要首句去重，作为自动要点；
 *   3. 趋势分析：逐年计数 + 关键词频次 top8 + 年份三等分热点演变；
 *   4. 方法对比：按关键词自动归类方法学，输出优劣势口径。
 *
 * @param topic   主题关键词（必填）
 * @param yearRange 年份闭区间 { start, end }（可空）
 * @param topK    返回条数（缺省 10，夹紧 1~50）
 */
export function buildLiteratureReview(
  topic: unknown,
  yearRange?: unknown,
  topK?: unknown,
): LiteratureReview {
  const topicText = toText(topic);
  if (!topicText) throw new Error('综述主题 topic 不能为空');
  const range = sanitizeYearRange(yearRange);

  let kTop = 10;
  if (topK != null && topK !== '') {
    const n = typeof topK === 'number' ? topK : Number(topK);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`topK 非法：${String(topK)}，须为正整数`);
    kTop = Math.min(n, 50);
  }

  const lower = topicText.toLowerCase();
  const hit = LITERATURE_DICTIONARY.filter((lit) => {
    if (range.start != null && lit.year < range.start) return false;
    if (range.end != null && lit.year > range.end) return false;
    const hay = `${lit.title} ${lit.abstract} ${lit.keywords.join(' ')}`.toLowerCase();
    return hay.includes(lower);
  }).sort((a, b) => b.year - a.year);

  const totalMatched = hit.length;
  const selected = hit.slice(0, kTop).map((lit) => {
    const methodTag = classifyMethod(lit.keywords);
    return {
      id: lit.id,
      title: lit.title,
      authors: [...lit.authors],
      journal: lit.journal,
      year: lit.year,
      keywords: [...lit.keywords],
      methodTag,
      keyPoint: firstSentence(lit.abstract),
      citation: lit.citation,
    };
  });

  // —— 摘要总结：首句要点去重，保序 ——
  const keyPoints: string[] = [];
  for (const p of selected) {
    if (!keyPoints.includes(p.keyPoint)) keyPoints.push(p.keyPoint);
  }

  // —— 趋势：逐年分布（升序） ——
  const yearCounter = new Map<number, number>();
  for (const p of selected) yearCounter.set(p.year, (yearCounter.get(p.year) ?? 0) + 1);
  const byYear = [...yearCounter.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  // —— 热点关键词 top8 ——
  const kwCounter = new Map<string, number>();
  for (const p of selected) {
    for (const kw of p.keywords) kwCounter.set(kw, (kwCounter.get(kw) ?? 0) + 1);
  }
  const hotKeywords = [...kwCounter.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 8);

  // —— 热点演变：按年份升序三等分 ——
  const asc = [...selected].sort((a, b) => a.year - b.year);
  const bands = [
    { label: '早期', slice: asc.slice(0, Math.ceil(asc.length / 3)) },
    { label: '中期', slice: asc.slice(Math.ceil(asc.length / 3), Math.ceil(asc.length * 2 / 3)) },
    { label: '近期', slice: asc.slice(Math.ceil(asc.length * 2 / 3)), },
  ];
  const evolution = bands.map(({ label, slice }) => {
    const c = new Map<string, number>();
    for (const p of slice) for (const kw of p.keywords) c.set(kw, (c.get(kw) ?? 0) + 1);
    return {
      band: slice.length ? `${label}（${slice[0]!.year}—${slice[slice.length - 1]!.year}）` : label,
      topTags: [...c.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
    };
  });

  // —— 方法对比 ——
  const groups = new Map<MethodTag, MatchedPaper[]>();
  for (const p of selected) {
    const arr = groups.get(p.methodTag) ?? [];
    arr.push(p);
    groups.set(p.methodTag, arr);
  }
  const methodComparison: MethodComparison[] = [...groups.entries()]
    .map(([method, papers]) => ({
      method,
      methodLabel: METHOD_PROFILE[method].label,
      count: papers.length,
      paperIds: papers.map((p) => p.id),
      strengths: METHOD_PROFILE[method].strengths,
      weaknesses: METHOD_PROFILE[method].weaknesses,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    topic: topicText,
    yearRange: range,
    totalMatched,
    papers: selected,
    keyPoints,
    trend: { byYear, hotKeywords, evolution },
    methodComparison,
    sourceDisclaimer:
      '本综述文献取自内置真实发表论文词典（不含编造 DOI），仅作离线演示与方法学锚点；正式使用须接 PubMed/CNKI 检索接口并人工复核。',
  };
}

/** 实验设计方法学 */
export type ExperimentMethod =
  | 'randomized-trial'       // 随机对照试验
  | 'prospective-cohort'     // 前瞻性队列
  | 'retrospective-cohort'   // 回顾性队列
  | 'case-control'           // 病例对照
  | 'diagnostic-accuracy';   // 诊断准确性研究

/** 实验设计产物 */
export interface ExperimentDesign {
  problem: string;
  method: ExperimentMethod;
  designLabel: string;
  hypothesis: string;
  arms: Array<{ name: string; description: string }>;
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  inclusion: string[];
  exclusion: string[];
  sampleSizeHint: string;
  ethics: string[];
  reportingStandard: string;
}

const METHOD_LABEL: Record<ExperimentMethod, string> = {
  'randomized-trial': '随机对照试验（RCT）',
  'prospective-cohort': '前瞻性队列研究',
  'retrospective-cohort': '回顾性队列研究',
  'case-control': '病例对照研究',
  'diagnostic-accuracy': '诊断准确性研究（DA）',
};

const METHOD_STANDARD: Record<ExperimentMethod, string> = {
  'randomized-trial': 'CONSORT 2010',
  'prospective-cohort': 'STROBE',
  'retrospective-cohort': 'STROBE',
  'case-control': 'STROBE',
  'diagnostic-accuracy': 'STARD 2015',
};

/**
 * 【绩效与人才·M166-C】实验设计（纯函数模板装配）。
 *
 * 按方法学类型给出假设/分组/终点/纳排/样本量提示/伦理要点骨架；
 * problem 仅作文字嵌入，不产生任何数据结论。
 */
export function designExperiment(problem: unknown, method: unknown): ExperimentDesign {
  const problemText = toText(problem);
  if (!problemText) throw new Error('研究问题 problem 不能为空');
  const methodText = toText(method) as ExperimentMethod;
  if (!(methodText in METHOD_LABEL)) {
    throw new Error(
      `实验方法 method 非法：${methodText}，须为 ${Object.keys(METHOD_LABEL).join('/')}`,
    );
  }

  const base = {
    problem: problemText,
    method: methodText,
    designLabel: METHOD_LABEL[methodText],
    hypothesis: `在目标人群中，${problemText} 较常规对照可带来有临床意义的结局改善（优效假设）。`,
    inclusion: [
      '符合疾病/问题定义的目标人群',
      '年龄、性别按研究问题限定并注明依据',
      '签署知情同意书（回顾性队列可申请豁免）',
    ],
    exclusion: [
      '合并严重并发症或预期随访不足者',
      '关键变量缺失（主要终点/协变量）者',
      '拒绝签署知情同意或无法完成随访者',
    ],
    ethics: [
      '经医院伦理委员会审批并备案伦理批件号',
      '注册前瞻性研究于 ChiCTR/ClinicalTrials.gov',
      '受试者隐私按《个人信息保护法》《医疗卫生机构网络安全管理办法》脱敏存储',
    ],
    reportingStandard: METHOD_STANDARD[methodText],
  };

  switch (methodText) {
    case 'randomized-trial':
      return {
        ...base,
        arms: [
          { name: '试验组', description: `干预：${problemText} 对应新策略` },
          { name: '对照组', description: '干预：现行标准方案' },
        ],
        primaryEndpoint: '主要终点：干预组 vs 对照组的主要临床事件发生率（优效性检验）',
        secondaryEndpoints: ['次要终点：安全性事件', '次要终点：卫生经济学指标', '次要终点：患者报告结局（PRO）'],
        sampleSizeHint: '按主要终点预期组间差异 α=0.05、power=0.8 估算每组样本量，并加 15% 失访冗余。',
      };
    case 'prospective-cohort':
      return {
        ...base,
        arms: [
          { name: '暴露组', description: `具备暴露因素：${problemText} 相关暴露` },
          { name: '非暴露组', description: '同期入院、无该暴露因素的可比人群' },
        ],
        primaryEndpoint: '主要终点：暴露组 vs 非暴露组的结局事件累积发生率与风险比（HR）',
        secondaryEndpoints: ['次要终点：亚组人群效应异质性', '次要终点：暴露剂量-反应关系'],
        sampleSizeHint: '按基线结局发生率、预期 HR=1.5~2.0、α=0.05、power=0.8 估算队列规模。',
      };
    case 'retrospective-cohort':
      return {
        ...base,
        arms: [
          { name: '历史暴露组', description: `既往接受 ${problemText} 相关策略的患者队列（EHR 回溯）` },
          { name: '历史对照组', description: '同期未接受该策略的可比患者队列' },
        ],
        primaryEndpoint: '主要终点：两组结局差异（倾向评分匹配校正混杂后）',
        secondaryEndpoints: ['次要终点：PSM 后协变量均衡性（SMD<0.1）', '次要终点：多因素 Cox/广义线性模型效应量'],
        sampleSizeHint: '以可用 EHR 全量队列入组，按结局事件数满足 EPV≥10 校验模型稳定性。',
      };
    case 'case-control':
      return {
        ...base,
        arms: [
          { name: '病例组', description: `确诊目标结局（${problemText} 相关疾病）的患者` },
          { name: '对照组', description: '同期就诊、无该结局的可比人群（1:1 或 1:2 匹配）' },
        ],
        primaryEndpoint: '主要终点：暴露因素在两组中的分布差异（OR 及 95%CI）',
        secondaryEndpoints: ['次要终点：分层分析控制混杂', '次要终点：交互作用检验'],
        sampleSizeHint: '按预期 OR=2.0、暴露率 30%、α=0.05、power=0.8 估算病例/对照配比。',
      };
    case 'diagnostic-accuracy':
      return {
        ...base,
        arms: [
          { name: '待评价试验', description: `待评价方法：${problemText} 对应诊断/预测模型` },
          { name: '金标准', description: '同期盲法参照的金标准检查（病理/影像随访/独立专家会诊）' },
        ],
        primaryEndpoint: '主要终点：灵敏度、特异度与 ROC 曲线下面积（AUC，95%CI）',
        secondaryEndpoints: ['次要终点：阳性/阴性似然比', '次要终点：与金标准的一致性（Cohen κ）'],
        sampleSizeHint: '按预期 AUC=0.85、患病率 30%、α=0.05、power=0.8 估算，并保证阳性例数≥50。',
      };
  }
}

/** 统计方案产物 */
export interface StatisticalPlan {
  alpha: number;
  power: number;
  primaryAnalysis: string;
  tests: Array<{ purpose: string; test: string; rationale: string }>;
  multiplicity: string;
  missingData: string;
  sensitivityAnalysis: string[];
  reportingStandard: string;
}

/**
 * 【绩效与人才·M166-C】由实验设计生成统计方案（纯函数）。
 *
 * 按设计类型映射主分析/检验方法/多重性/缺失值/敏感性分析口径，
 * alpha 固定 0.05、检验效能 0.80，不输出任何伪造 p 值。
 */
export function generateStatisticalPlan(design: ExperimentDesign): StatisticalPlan {
  if (!design || !design.designLabel) {
    throw new Error('实验设计对象 design 不能为空（先调用 designExperiment）');
  }
  const base = {
    alpha: 0.05,
    power: 0.8,
    multiplicity: '主要终点单一检验；多个次要终点按 Bonferroni 或 FDR 校正并在方案中预先声明。',
    missingData: '主要变量缺失 >5% 先行多重插补（MICE），并与完整病例分析对照作为敏感性分析。',
    sensitivityAnalysis: ['按方案集（per-protocol）与意向性治疗（ITT）双口径对照'],
    reportingStandard: design.reportingStandard,
  };

  switch (design.method) {
    case 'randomized-trial':
      return {
        ...base,
        primaryAnalysis: '意向性治疗分析（ITT）：组间主要终点率比较 + 95%CI。',
        tests: [
          { purpose: '主要终点率比较', test: '卡方检验 / Fisher 精确检验', rationale: '二分类结局组间差异' },
          { purpose: '连续协变量调整', test: '协方差分析（ANCOVA）', rationale: '平衡基线不均衡' },
          { purpose: '优效性判定', test: '单侧/双侧优效界值检验', rationale: '95%CI 下限大于 0 且超过临床优效界值' },
        ],
        sensitivityAnalysis: [...base.sensitivityAnalysis, '失访患者多重插补后重估'],
      };
    case 'prospective-cohort':
      return {
        ...base,
        primaryAnalysis: '暴露组 vs 非暴露组的 Kaplan-Meier 累积发生率比较。',
        tests: [
          { purpose: '组间生存曲线', test: 'Log-rank 检验', rationale: '非参比较两组事件发生时间分布' },
          { purpose: '效应量估计', test: 'Cox 比例风险回归（HR, 95%CI）', rationale: '校正年龄/性别/合并症等混杂' },
          { purpose: '比例风险假定', test: 'Schoenfeld 残差检验', rationale: '不满足时改用时间分层 Cox' },
        ],
        sensitivityAnalysis: [...base.sensitivityAnalysis, '竞争风险模型（Fine-Gray）对照'],
      };
    case 'retrospective-cohort':
      return {
        ...base,
        primaryAnalysis: '倾向评分匹配（PSM, 1:1）后组间结局比较。',
        tests: [
          { purpose: '混杂校正', test: '倾向评分匹配 + 标准化均数差（SMD<0.1）核验', rationale: '观察性数据控制选择偏倚' },
          { purpose: '效应量估计', test: '多因素 Logistic / Cox 回归（OR/HR, 95%CI）', rationale: '匹配后残余混杂再校正' },
          { purpose: '稳健性', test: 'E-value 敏感性分析', rationale: '评估未测量混杂需多大强度才能推翻结论' },
        ],
        sensitivityAnalysis: [...base.sensitivityAnalysis, '逆概率加权（IPTW）对照'],
      };
    case 'case-control':
      return {
        ...base,
        primaryAnalysis: '病例组 vs 对照组的暴露分布比较（条件 Logistic 回归）。',
        tests: [
          { purpose: '暴露关联强度', test: '条件 Logistic 回归（OR, 95%CI）', rationale: '匹配设计下的标准估计方法' },
          { purpose: '剂量-反应', test: '暴露等级趋势检验（Wald）', rationale: '支持因果推断的一致性' },
        ],
        sensitivityAnalysis: [...base.sensitivityAnalysis, '不同匹配比例（1:1 / 1:2）对照'],
      };
    case 'diagnostic-accuracy':
      return {
        ...base,
        primaryAnalysis: '待评价试验 vs 金标准的灵敏度/特异度/AUC（95%CI）。',
        tests: [
          { purpose: '判别能力', test: 'ROC 曲线下面积（AUC）+ DeLong 检验', rationale: '与既有方法 AUC 比较' },
          { purpose: '诊断一致性', test: 'Cohen κ / 阳性符合率', rationale: '评估观察者间一致性' },
          { purpose: '阈值优化', test: '约登指数（Youden J）确定最佳截断', rationale: '平衡灵敏度与特异度' },
        ],
        sensitivityAnalysis: [...base.sensitivityAnalysis, '缺失金标准病例的多重插补对照'],
      };
  }
}

/** 论文初稿的实测结果（由调用方提供，纯函数不预造） */
export interface ResearchResults {
  sampleSize?: number;
  keyFindings?: string[];
  effectSize?: string;
  pValue?: string;
  references?: string[];
}

/** 论文初稿产物（IMRaD 骨架） */
export interface ResearchPaperDraft {
  title: string;
  structuredAbstract: {
    background: string;
    objective: string;
    methods: string;
    results: string;
    conclusion: string;
  };
  introduction: string[];
  resultsNarrative: string[];
  discussion: string[];
  conclusion: string;
  references: string[];
  disclaimer: string;
}

/**
 * 【绩效与人才·M166-C】论文初稿（IMRaD 骨架，纯函数）。
 *
 * 真实性红线：Results 段只复述 results 入参中的实测数字；
 * 任何缺失一律落「待填入实测结果」占位，系统绝不预造效应量/p 值。
 *
 * @param topic   论文主题（必填）
 * @param results 实测结果（样本量/关键发现/效应量/p 值/参考文献）
 */
export function draftResearchPaper(topic: unknown, results?: ResearchResults): ResearchPaperDraft {
  const topicText = toText(topic);
  if (!topicText) throw new Error('论文主题 topic 不能为空');

  const r: ResearchResults = results ?? {};
  const nText = r.sampleSize != null && Number.isFinite(r.sampleSize)
    ? `纳入分析样本量 n=${r.sampleSize}`
    : '（待填入实测样本量）';
  const effectText = toText(r.effectSize) || '（待填入实测效应量，如 HR=1.32, 95%CI 1.10—1.58）';
  const pText = toText(r.pValue) || '（待填入实测 P 值）';

  const findings = Array.isArray(r.keyFindings) && r.keyFindings.length
    ? r.keyFindings.map((x) => toText(x)).filter(Boolean)
    : ['（待填入实测关键发现）'];

  const references = Array.isArray(r.references) ? r.references.filter((x) => typeof x === 'string' && x.trim()) : [];

  return {
    title: `${topicText}：方法学、证据与临床意义（初稿）`,
    structuredAbstract: {
      background: `${topicText} 是当前临床/科研关注的问题，既有证据仍存在方法学异质性与外部验证缺口。`,
      objective: `系统梳理 ${topicText} 的证据现状，并给出可复现的研究设计与统计口径。`,
      methods: '按预设纳排标准汇总真实发表文献，方法学归类后比较各研究设计的优势与局限；统计口径 α=0.05、power=0.80。',
      results: `${nText}；效应量 ${effectText}；${pText}。主要发现：${findings[0]}。`,
      conclusion: `在本证据范围内，${topicText} 的结论需经独立外部验证后方可进入临床决策。`,
    },
    introduction: [
      `临床/科研背景：${topicText} 的问题来源与现状（引述综述文献）。`,
      `证据缺口：既有研究在样本代表性、偏倚控制上的不足。`,
      '本文目标：给出可执行的研究设计、统计方案与可投稿的论文骨架。',
    ],
    resultsNarrative: [
      `${nText}。`,
      `效应量：${effectText}。`,
      `显著性：${pText}。`,
      ...findings.map((f) => `关键发现：${f}`),
    ],
    discussion: [
      '结果与既有真实文献的一致性/差异点（逐条对照引用）。',
      '方法学局限：回顾性偏倚、样本代表性、外部验证范围。',
      '临床/科研意义与下一步验证计划。',
    ],
    conclusion: `本初稿仅为结构化骨架，所有数字均须替换为实测结果并经作者团队核验后方可投稿。`,
    references,
    disclaimer:
      '本初稿由纯函数模板生成，未接入任何大模型杜撰；参考文献请人工在 PubMed/CNKI 复核后补全。',
  };
}
