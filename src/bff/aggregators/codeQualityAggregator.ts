/**
 * 健澜科技 jlmedaios - 代码质量聚合器（M150-B · 持续优化）
 *
 * 面向工程质量的纯函数层，覆盖五类检查项：
 *  - any：`: any` 类型断言（绕过类型检查）
 *  - ts-ignore：`@ts-ignore` 压制注释（掩盖真实类型错误）
 *  - console-log：生产残留的裸 `console.log`
 *  - unused-vars：未使用的局部变量 / 导入（死代码）
 *  - complexity：函数圈复杂度（阈值 10，超过即建议拆分）
 *
 * 分层：
 *  - detectIssues(source, fileName): 纯扫描引擎，对一段源码文本做正则识别，
 *    真实产出 any / ts-ignore / console-log / complexity 问题（问题识别）；
 *  - scanCodeQuality(): 纯函数，基于治理台账构建 QualityReport——
 *    逐类汇总、严重度加权扣分、分级、Top 风险排序（质量扫描）；
 *  - generateQualityReport(): 纯函数，在 scanCodeQuality 之上产出面向 admin
 *    面板的执行报告（总分 / 等级 / 亮点 / 优先级整改计划 / VI 卡片）（报告生成）。
 *
 * 生产安全加固：
 *  - 不读时钟、不访问文件系统 / IO、不修改入参；时间戳由路由层 ok() 信封统一打；
 *  - 入参脏数据（非字符串源码 / 空文件名）直接抛 TypeError，尽早失败；
 *  - 本文件自身零 any / 零 @ts-ignore / 零 console.log（持续优化）；
 *  - 台账只存「文件 + 符号 + 次数 + 整改建议」，不含源码片段、不含 PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 五类检查项 */
export type IssueCategory = 'any' | 'ts-ignore' | 'console-log' | 'unused-vars' | 'complexity';

/** 问题严重等级 */
export type Severity = 'high' | 'medium' | 'low';

/** 台账条目状态：open=待整改 / fixed=已闭环 / monitor=持续观察 */
export type IssueStatus = 'open' | 'fixed' | 'monitor';

/** 单条代码质量问题（治理台账条目） */
export interface QualityIssue {
  /** 稳定 id（便于前端 rowKey） */
  id: string;
  category: IssueCategory;
  /** 相对仓库根的文件路径 */
  file: string;
  /** 出问题的函数 / 符号名 */
  symbol: string;
  /** 问题描述 */
  message: string;
  /** 该问题在该符号下的出现次数（complexity 类为圈复杂度数值） */
  count: number;
  severity: Severity;
  /** 具体整改建议（不是只指出问题，而是给出怎么改） */
  suggestion: string;
  status: IssueStatus;
}

/** 单类别的汇总 */
export interface CategorySummary {
  category: IssueCategory;
  /** 中文标签（直接渲染） */
  label: string;
  openCount: number;
  fixedCount: number;
  /** 该类别当前最高严重度；无问题时为 'none' */
  maxSeverity: Severity | 'none';
}

/** scanCodeQuality 的产出：一次质量扫描的结构化结果 */
export interface QualityReport {
  /** 扫描范围说明 */
  scope: string;
  /** 纳入台账评估的模块数 */
  totalFiles: number;
  /** 0-100，open 问题按严重度加权扣分，下限 40 */
  overallScore: number;
  /** A>=90 / B>=75 / C>=60 / D<60 */
  grade: 'A' | 'B' | 'C' | 'D';
  totals: {
    open: number;
    fixed: number;
    /** 每类别的 open 计数（五键齐全，便于前端直接取） */
    byCategory: Record<IssueCategory, number>;
  };
  categories: CategorySummary[];
  /** 全部 open 问题（按严重度加权 + 次数降序） */
  issues: QualityIssue[];
  /** 风险最高的前 N 条（topRisks） */
  topRisks: QualityIssue[];
}

/** generateQualityReport 的产出：面向 admin 面板的执行报告 */
export interface Report {
  title: string;
  subtitle: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  /** 一段话总结当前质量水位 */
  summary: string;
  /** 要点（亮点 / 红线） */
  highlights: string[];
  /** 优先级整改计划 */
  actionPlan: ActionItem[];
  /** VI 卡片数据（深海蓝面板直接渲染） */
  viCards: ViCard[];
}

/** 一条整改计划 */
export interface ActionItem {
  /** 1 = 最高优先级 */
  priority: number;
  action: string;
  /** 整改目标（文件 / 类别） */
  target: string;
  /** 预计收益 */
  expectedGain: string;
  /** 工作量估算 */
  effort: 'S' | 'M' | 'L';
}

/** 一张 VI 指标卡 */
export interface ViCard {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
}

/* ------------------------------------------------------------------ */
/* 常量                                                                */
/* ------------------------------------------------------------------ */

/** 类别中文标签 */
const CATEGORY_LABEL: Record<IssueCategory, string> = {
  any: 'any 类型断言',
  'ts-ignore': '@ts-ignore 压制',
  'console-log': '生产 console.log',
  'unused-vars': '未使用变量',
  complexity: '圈复杂度超标',
};

/** 严重度扣分权重（每条 open 问题固定扣减；次数用于排序与展示，不放大扣分） */
const SEVERITY_WEIGHT: Record<Severity, number> = { high: 10, medium: 5, low: 2 };

/** 函数圈复杂度阈值：超过即判定为需拆分 */
export const COMPLEXITY_THRESHOLD = 10;

/** 起评分与下限 */
const BASE_SCORE = 100;
const FLOOR_SCORE = 40;

/* ------------------------------------------------------------------ */
/* 治理台账（纯数据：已识别并登记的代码质量问题，持续优化）             */
/* ------------------------------------------------------------------ */

/**
 * 代码质量治理台账。
 *
 * 这是 BFF 对工程质量已知债项的固化登记（来自 tsc / eslint / code review
 * 周巡结论），不是运行时拉取仓库文件扫描——纯函数无 IO，admin 面板据此
 * 展示「哪里还有债、怎么还、还了多少」。detectIssues 提供对任意源码片段的
 * 实时识别能力，二者配合：台账看全局趋势，detectIssues 看具体 PR。
 */
export const CODE_QUALITY_LEDGER: readonly QualityIssue[] = [
  {
    id: 'cq-any-adapter',
    category: 'any',
    file: 'src/bff/adapters/legacyImport.ts',
    symbol: 'normalizeRow()',
    message: '存在 6 处 `: any` 断言，把外部导入行强行抹平，绕过了类型检查',
    count: 6,
    severity: 'high',
    suggestion:
      '改用 `unknown` + 类型守卫收窄字段，删除所有 `as any`；导入契约用 zod schema 校验后再进入领域层',
    status: 'open',
  },
  {
    id: 'cq-tsignore-llm',
    category: 'ts-ignore',
    file: 'src/bff/llm/client.ts',
    symbol: 'callModel()',
    message: '3 处 `@ts-ignore` 压制 LLM 返回类型错误，模型返回结构漂移时不会在编译期暴露',
    count: 3,
    severity: 'high',
    suggestion:
      '为 LLM 响应定义 zod schema 并 parse，用推导类型替代手写 any；逐条移除 @ts-ignore',
    status: 'open',
  },
  {
    id: 'cq-complexity-dispatcher',
    category: 'complexity',
    file: 'src/bff/routes/routeDispatcher.ts',
    symbol: 'dispatch()',
    message: '圈复杂度 28，远超阈值 10；if/else 嵌套 5 层，分支覆盖靠人肉记忆',
    count: 28,
    severity: 'high',
    suggestion:
      '按资源域拆成子 handler 注册表（method+path -> handler），用提前 return 消除嵌套，单函数复杂度压到 10 以内',
    status: 'open',
  },
  {
    id: 'cq-console-jobs',
    category: 'console-log',
    file: 'src/bff/jobs/nightlyReport.ts',
    symbol: 'sendReport()',
    message: '5 处裸 `console.log` 为调试残留，生产日志落到 stdout 无结构化字段',
    count: 5,
    severity: 'medium',
    suggestion: '改用 observability logger 输出结构化日志（traceId/level），生产构建删除裸 console',
    status: 'open',
  },
  {
    id: 'cq-unused-bridge',
    category: 'unused-vars',
    file: 'src/bff/aggregators/legacyBridge.ts',
    symbol: 'buildPayload()',
    message: '4 个声明后未被引用的局部变量与导入（旧协议字段残留）',
    count: 4,
    severity: 'medium',
    suggestion: '开启 tsc noUnusedLocals/noUnusedParameters，删除死导入与死局部变量',
    status: 'open',
  },
  {
    id: 'cq-console-health',
    category: 'console-log',
    file: 'src/bff/routes/health.ts',
    symbol: 'health()',
    message: '历史 2 处裸 console.log（已在 M149 闭环）',
    count: 2,
    severity: 'low',
    suggestion: '已改为结构化日志，持续观察不回潮',
    status: 'fixed',
  },
] as const;

/* ------------------------------------------------------------------ */
/* 纯函数：源码片段实时扫描（问题识别）                                */
/* ------------------------------------------------------------------ */

/** 统计正则在文本中的命中次数 */
function countMatches(source: string, re: RegExp): number {
  const matches = source.match(re);
  return matches === null ? 0 : matches.length;
}

/** 粗粒度圈复杂度：1 + 决策点计数（if/for/while/case/catch/&&/||/三元） */
export function computeCyclomaticComplexity(source: string): number {
  const decisionPoints = countMatches(
    source,
    /\bif\b|\belse\s+if\b|\bfor\b|\bwhile\b|\bcase\b|\bcatch\b|&&|\|\||\?[^.]/g,
  );
  return 1 + decisionPoints;
}

/**
 * 纯函数：对一段源码文本做五类里「可静态识别」项的扫描，返回问题清单。
 *
 * 说明：unused-vars 需要类型信息才能准确判定，正则无法可靠区分
 * 「导出的符号」与「真未使用」，故本函数不猜它，只产出 any / ts-ignore /
 * console-log / complexity 四类可由文本确定性识别的问题（宁缺毋滥）。
 *
 * @throws TypeError 入参非法时直接抛错
 */
export function detectIssues(source: string, fileName: string): QualityIssue[] {
  if (typeof source !== 'string') {
    throw new TypeError('detectIssues: source 必须是字符串');
  }
  if (typeof fileName !== 'string' || fileName.trim().length === 0) {
    throw new TypeError('detectIssues: fileName 必须是非空字符串');
  }
  const issues: QualityIssue[] = [];

  const anyCount = countMatches(source, /:\s*any\b(?!\w)/g);
  if (anyCount > 0) {
    issues.push({
      id: `scan-any-${fileName}`,
      category: 'any',
      file: fileName,
      symbol: '(片段)',
      message: `源码片段含 ${anyCount} 处 \`: any\` 断言`,
      count: anyCount,
      severity: anyCount >= 3 ? 'high' : 'medium',
      suggestion: '用 unknown + 类型守卫收窄，删除 as any',
      status: 'open',
    });
  }

  const tsIgnoreCount = countMatches(source, /@ts-ignore/g);
  if (tsIgnoreCount > 0) {
    issues.push({
      id: `scan-tsignore-${fileName}`,
      category: 'ts-ignore',
      file: fileName,
      symbol: '(片段)',
      message: `源码片段含 ${tsIgnoreCount} 处 @ts-ignore`,
      count: tsIgnoreCount,
      severity: 'high',
      suggestion: '补类型定义后移除压制注释',
      status: 'open',
    });
  }

  const consoleCount = countMatches(source, /console\.log\s*\(/g);
  if (consoleCount > 0) {
    issues.push({
      id: `scan-console-${fileName}`,
      category: 'console-log',
      file: fileName,
      symbol: '(片段)',
      message: `源码片段含 ${consoleCount} 处裸 console.log`,
      count: consoleCount,
      severity: 'medium',
      suggestion: '改结构化 logger，生产删除裸 console',
      status: 'open',
    });
  }

  const complexity = computeCyclomaticComplexity(source);
  if (complexity > COMPLEXITY_THRESHOLD) {
    issues.push({
      id: `scan-complexity-${fileName}`,
      category: 'complexity',
      file: fileName,
      symbol: '(片段)',
      message: `片段圈复杂度 ${complexity}，超过阈值 ${COMPLEXITY_THRESHOLD}`,
      count: complexity,
      severity: complexity >= 20 ? 'high' : 'medium',
      suggestion: '拆分分支、提前 return，降低嵌套深度',
      status: 'open',
    });
  }

  return issues;
}

/* ------------------------------------------------------------------ */
/* 纯函数：质量扫描（全局台账 -> QualityReport）                       */
/* ------------------------------------------------------------------ */

/** 由严重度权重 + 次数计算单条风险分值（越大越优先处理，仅用于排序，不用于扣分） */
function rankScore(issue: QualityIssue): number {
  return SEVERITY_WEIGHT[issue.severity] * issue.count;
}

/** 由严重度权重计算单条问题的扣分（分数 0-100，单条固定扣减，不乘次数） */
function deductionOf(issue: QualityIssue): number {
  return SEVERITY_WEIGHT[issue.severity];
}

/** 按 open 问题加权扣分计算总分 */
function computeScore(issues: readonly QualityIssue[]): number {
  const deduction = issues
    .filter((i) => i.status === 'open')
    .reduce((sum, i) => sum + deductionOf(i), 0);
  return Math.max(FLOOR_SCORE, BASE_SCORE - deduction);
}

/** 分数 -> 等级 */
export function gradeOf(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

const CATEGORY_ORDER: readonly IssueCategory[] = [
  'any',
  'ts-ignore',
  'console-log',
  'unused-vars',
  'complexity',
];

/**
 * 纯函数：基于治理台账构建一次代码质量扫描报告。
 *
 * 不传参时使用内置 CODE_QUALITY_LEDGER；也可传入外部台账（便于测试 /
 * 接入实时扫描结果）。返回全新对象，外部修改不影响内部台账。
 */
export function scanCodeQuality(
  ledger: readonly QualityIssue[] = CODE_QUALITY_LEDGER,
): QualityReport {
  const open = ledger.filter((i) => i.status === 'open');
  const fixed = ledger.filter((i) => i.status === 'fixed');

  const byCategory = CATEGORY_ORDER.reduce(
    (acc, cat) => ({ ...acc, [cat]: 0 }),
    {} as Record<IssueCategory, number>,
  );
  for (const i of open) byCategory[i.category] += 1;

  const severityRank: Record<Severity, number> = { high: 3, medium: 2, low: 1 };
  const categories: CategorySummary[] = CATEGORY_ORDER.map((cat) => {
    const catItems = ledger.filter((i) => i.category === cat);
    const openItems = catItems.filter((i) => i.status === 'open');
    let max: Severity | 'none' = 'none';
    for (const i of openItems) {
      if (max === 'none' || severityRank[i.severity] > severityRank[max]) {
        max = i.severity;
      }
    }
    return {
      category: cat,
      label: CATEGORY_LABEL[cat],
      openCount: openItems.length,
      fixedCount: catItems.filter((i) => i.status === 'fixed').length,
      maxSeverity: max,
    };
  });

  const issues = open
    .map((i) => ({ ...i }))
    .sort((a, b) => rankScore(b) - rankScore(a) || b.count - a.count);
  const topRisks = issues.slice(0, 3);
  const overallScore = computeScore(ledger);

  return {
    scope: 'src/bff（BFF 聚合层 + 路由）代码质量治理台账',
    totalFiles: new Set(ledger.map((i) => i.file)).size,
    overallScore,
    grade: gradeOf(overallScore),
    totals: {
      open: open.length,
      fixed: fixed.length,
      byCategory,
    },
    categories,
    issues,
    topRisks,
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数：执行报告生成（QualityReport -> 面向 admin 的 Report）        */
/* ------------------------------------------------------------------ */

/**
 * 纯函数：在 scanCodeQuality 之上生成一份面向 admin 面板的执行报告。
 *
 * 内容：总分 / 等级、一段话总结、要点红线、按风险排序的整改计划、
 * 深海蓝 VI 卡片数据。持续优化——后续可接入趋势对比与负责人认领。
 */
export function generateQualityReport(
  ledger: readonly QualityIssue[] = CODE_QUALITY_LEDGER,
): Report {
  const scan = scanCodeQuality(ledger);

  const top = scan.topRisks[0];
  const summary = top
    ? `代码质量当前水位 ${scan.overallScore} 分（${scan.grade} 级）：共 ${scan.totals.open} 项待整改、` +
      `${scan.totals.fixed} 项已闭环；最高风险集中在 ${CATEGORY_LABEL[top.category]}（${top.file}）。`
    : `代码质量当前水位 ${scan.overallScore} 分（${scan.grade} 级）：五类检查项全部清零，持续保持。`;

  const highlights: string[] = [];
  if (scan.totals.byCategory.any > 0) {
    highlights.push(`红线：仍有 ${scan.totals.byCategory.any} 个模块存在 \`: any\`，需在本迭代清零`);
  }
  if (scan.totals.byCategory['ts-ignore'] > 0) {
    highlights.push(`红线：${scan.totals.byCategory['ts-ignore']} 处 @ts-ignore 掩盖真实类型错误`);
  }
  if (scan.totals.byCategory['console-log'] > 0) {
    highlights.push(`提示：${scan.totals.byCategory['console-log']} 处裸 console.log 需改结构化日志`);
  }
  if (highlights.length === 0) {
    highlights.push('五类检查项无 open 问题，维持 tsc 零报错红线');
  }

  const actionPlan: ActionItem[] = scan.issues.map((issue, idx) => ({
    priority: idx + 1,
    action: issue.suggestion,
    target: `${issue.file} · ${issue.symbol}`,
    expectedGain: `消除 ${issue.count} 处${CATEGORY_LABEL[issue.category]}，预计提分 ${SEVERITY_WEIGHT[issue.severity]}`,
    effort: issue.severity === 'high' ? 'M' : 'S',
  }));

  const viCards: ViCard[] = [
    { label: '质量总分', value: `${scan.overallScore}`, tone: scan.overallScore >= 75 ? 'good' : scan.overallScore >= 60 ? 'warn' : 'bad' },
    { label: '待整改', value: `${scan.totals.open} 项`, tone: scan.totals.open === 0 ? 'good' : 'warn' },
    { label: '已闭环', value: `${scan.totals.fixed} 项`, tone: 'good' },
    {
      label: '最高风险',
      value: top ? CATEGORY_LABEL[top.category] : '无',
      tone: top ? 'bad' : 'good',
    },
  ];

  return {
    title: '代码质量报告',
    subtitle: '【M150-B】any / ts-ignore / console.log / 未使用变量 / 圈复杂度 五维治理 · 仅 admin 可见',
    score: scan.overallScore,
    grade: scan.grade,
    summary,
    highlights,
    actionPlan,
    viCards,
  };
}

/* ------------------------------------------------------------------ */
/* 【M167-D 安全修复与质量提升】覆盖率提升与类型/日志清零计划          */
/* ------------------------------------------------------------------ */

/** 覆盖率提升里程碑（把缺口按重点领域切成可交付的三段） */
export interface CoverageMilestone {
  /** 1 = 最先做 */
  order: number;
  /** 阶段名（中文，直接渲染） */
  stage: string;
  /** 本阶段起点覆盖率 0..100 */
  from: number;
  /** 本阶段终点覆盖率 0..100 */
  to: number;
  /** 本阶段补测重点说明 */
  focus: string;
}

/** 重点补测领域（不是凑数：安全模块 / 核心业务 / 边界条件） */
export interface CoverageFocusArea {
  area: string;
  reason: string;
  priority: number;
  estimatedGain: string;
}

/** improveTestCoverage 的产出：一份可执行的覆盖率冲刺计划 */
export interface CoverageImprovementPlan {
  /** 当前覆盖率 0..100 */
  current: number;
  /** 目标覆盖率 0..100（≥99% 红线） */
  target: number;
  /** 还需提升的百分点 */
  gap: number;
  /** 当前已达到 / 超过目标 */
  achieved: boolean;
  /** 三段式里程碑，终点 = target */
  milestones: CoverageMilestone[];
  /** 重点补测领域（安全模块优先） */
  focusAreas: CoverageFocusArea[];
  summary: string;
}

/** 单条清零任务（消除 any / ts-ignore / console.log 共用） */
export interface EliminationTask {
  order: number;
  file: string;
  symbol: string;
  /** 该符号下待清零的出现次数 */
  occurrences: number;
  /** 具体怎么改 */
  action: string;
  /** 改完之后的硬性结果（可验收） */
  expectedResult: string;
}

/** 一类清零计划（消除 any / ts-ignore / console.log 共用） */
export interface EliminationPlan {
  kind: 'any' | 'ts-ignore' | 'console-log';
  title: string;
  /** open 项涉及的总出现次数 */
  totalOccurrences: number;
  /** open 问题条数 */
  openItems: number;
  tasks: EliminationTask[];
  /** 防止回潮的红线（CI / review / 规范） */
  guardrails: string[];
  summary: string;
}

/** 覆盖率百分比上界（生产红线：≥99%） */
export const COVERAGE_TARGET_RED_LINE = 99;

/** 把任意有限数夹到 [0,100] 百分比区间并保留 1 位小数 */
function toPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/**
 * 纯函数：覆盖率提升计划（M167-D 安全修复与质量提升）。
 *
 * 不凑数：把缺口按「安全模块 → 核心业务 → 边界条件」三段切，
 * 每段给出起止覆盖率与补测重点；当前已达标时直接返回 achieved。
 *
 * @throws TypeError 入参不是有限数时抛错
 */
export function improveTestCoverage(currentCoverage: number, targetCoverage: number): CoverageImprovementPlan {
  if (typeof currentCoverage !== 'number' || !Number.isFinite(currentCoverage)) {
    throw new TypeError('improveTestCoverage: currentCoverage 必须是有限数');
  }
  if (typeof targetCoverage !== 'number' || !Number.isFinite(targetCoverage)) {
    throw new TypeError('improveTestCoverage: targetCoverage 必须是有限数');
  }
  const current = toPercent(currentCoverage);
  const target = toPercent(Math.max(targetCoverage, COVERAGE_TARGET_RED_LINE));
  const gap = Math.round(Math.max(0, target - current) * 10) / 10;
  const achieved = gap === 0;

  const focusAreas: CoverageFocusArea[] = [
    {
      area: '安全模块',
      reason: '鉴权 / 权限码 / MFA / 签名验签 / 脱敏一旦漏测，越权与泄露风险直接进生产',
      priority: 1,
      estimatedGain: '约贡献缺口的 40%，且把安全回归风险压到零',
    },
    {
      area: '核心业务',
      reason: '医嘱 / 计费 / 手术安全核查 / 危急值闭环等主链路，分支多、影响面大',
      priority: 2,
      estimatedGain: '约贡献缺口的 35%，主链路改动可被测试即时拦截',
    },
    {
      area: '边界条件',
      reason: '空入参 / 非法枚举 / 权限拒绝 / 外部超时 / 类型守卫收窄分支——当前最易漏测',
      priority: 3,
      estimatedGain: '约贡献缺口的 25%，把异常路径从「人肉记忆」变成确定性用例',
    },
  ];

  const milestones: CoverageMilestone[] = achieved
    ? []
    : [
        {
          order: 1,
          stage: '安全模块补测',
          from: current,
          to: Math.round((current + gap * 0.4) * 10) / 10,
          focus: 'auth / permissions / mfa / signing / dataMasking 的权限拒绝与越权用例',
        },
        {
          order: 2,
          stage: '核心业务补测',
          from: Math.round((current + gap * 0.4) * 10) / 10,
          to: Math.round((current + gap * 0.75) * 10) / 10,
          focus: '医嘱 / 计费 / 手术安全 / 危急值闭环的主链路与状态迁移用例',
        },
        {
          order: 3,
          stage: '边界与异常路径补测',
          from: Math.round((current + gap * 0.75) * 10) / 10,
          to: target,
          focus: '空入参 / 非法输入 / 外部超时 / TypeError 分支的防御性用例，锁死 ≥99%',
        },
      ];

  const summary = achieved
    ? `覆盖率已达 ${current}%（目标 ${target}%），维持红线、防止回潮即可。`
    : `当前覆盖率 ${current}%，距 ${target}% 红线还差 ${gap} 个百分点：先补安全模块，再补核心业务，最后锁边界条件。`;

  return { current, target, gap, achieved, milestones, focusAreas, summary };
}

/**
 * 由台账构造一类清零计划（内部共用：消除 any / ts-ignore / console.log）。
 * 只取 open 项，fixed 项不计入待办；台账外不臆造文件。
 */
function buildEliminationPlan(
  kind: EliminationPlan['kind'],
  ledger: readonly QualityIssue[],
): EliminationPlan {
  const open = ledger.filter((i) => i.category === kind && i.status === 'open');
  const tasks: EliminationTask[] = open.map((issue, idx) => ({
    order: idx + 1,
    file: issue.file,
    symbol: issue.symbol,
    occurrences: issue.count,
    action: issue.suggestion,
    expectedResult:
      kind === 'any'
        ? '该符号下 : any 清零，入参由 unknown + 类型守卫收窄，外部契约经 zod 校验'
        : kind === 'ts-ignore'
          ? '该符号下 @ts-ignore 清零，外部/模型响应由 zod schema 推导类型，类型错误在编译期暴露'
          : '该符号下裸 console.log 清零，统一走结构化 logger；console.error / console.warn 保留用于告警',
  }));
  const totalOccurrences = open.reduce((sum, i) => sum + i.count, 0);

  const meta: Record<EliminationPlan['kind'], { title: string; guardrails: string[] }> = {
    any: {
      title: 'any 类型清零计划',
      guardrails: [
        'CI 开启 @typescript-eslint/no-explicit-any = error，新增 any 直接红灯',
        'code review 拦截一切 as any / : any，外部入参一律 unknown + 类型守卫',
        'legacy 适配层必须 zod schema 校验后才允许进入领域层',
      ],
    },
    'ts-ignore': {
      title: '@ts-ignore 清零计划',
      guardrails: [
        'CI 禁止新增 @ts-ignore / @ts-expect-error，类型错误必须修复而非压制',
        'LLM / 第三方响应先 zod parse 再使用，用推导类型替代手写 any',
        '遗留压制注释逐条销账，PR 关联治理台账条目',
      ],
    },
    'console-log': {
      title: 'console.log 清零计划（保留 error / warn）',
      guardrails: [
        '生产构建删除裸 console.log；console.error / console.warn 保留并接入告警',
        '统一走 observability logger 输出结构化日志（traceId / level / module）',
        'PR checklist 含「无裸 console.log」一项，CR 不通过不得合并',
      ],
    },
  };

  const { title, guardrails } = meta[kind];
  const summary =
    open.length === 0
      ? `${title}：open 项已清零，维持 CI 红线不回潮。`
      : `${title}：共 ${open.length} 个 open 符号、${totalOccurrences} 处待清零，按顺序销账后由 guardrails 锁死。`;

  return { kind, title, totalOccurrences, openItems: open.length, tasks, guardrails, summary };
}

/** 纯函数：消除 `: any` 计划（M167-D 安全修复与质量提升） */
export function eliminateAnyTypes(
  ledger: readonly QualityIssue[] = CODE_QUALITY_LEDGER,
): EliminationPlan {
  return buildEliminationPlan('any', ledger);
}

/** 纯函数：消除 `@ts-ignore` 计划（M167-D 安全修复与质量提升） */
export function eliminateTsIgnore(
  ledger: readonly QualityIssue[] = CODE_QUALITY_LEDGER,
): EliminationPlan {
  return buildEliminationPlan('ts-ignore', ledger);
}

/** 纯函数：消除裸 console.log 计划（保留 console.error / console.warn） */
export function eliminateConsoleLog(
  ledger: readonly QualityIssue[] = CODE_QUALITY_LEDGER,
): EliminationPlan {
  return buildEliminationPlan('console-log', ledger);
}
