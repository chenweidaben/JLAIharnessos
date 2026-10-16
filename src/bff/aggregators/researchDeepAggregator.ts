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
