/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院财务管理深化聚合器（M178-A，纯函数）
 *
 * 财务管理要真实，不能账实不符。本聚合器把财务从「事后记账」升级为
 * 「预算有计划数、成本有归集口径、收入有结构监控、分析有本量利」的管理会计闭环：
 *
 *   - buildDeepFinanceMgmt：总装深度财务管理驾驶舱，一次产出四大管理维度：
 *       预算管理（年度预算 + 月度执行 + 超支预警）
 *       成本核算（科室成本 + 项目成本 + 病种成本，直接/间接可追溯）
 *       收入管理（门诊/住院/药品/检查四类收入结构与药占比监控）
 *       财务分析（收支结构 + 趋势外推 + 本量利 CVP 盈亏平衡）
 *   - calculateDepartmentCost：科室成本核算——直接成本 + 间接成本按动因归集，
 *     可下钻到项目成本、病种成本，并按门诊人次/床日折算单位成本；
 *   - analyzeRevenueStructure：收入结构分析——四类收入占比、药占比/检查占比预警；
 *   - predictFinancialTrend：财务趋势预测——对近 N 个月净结余做线性回归外推。
 *
 * 口径约定（与 clinical.finance_transaction CHECK 一致）：
 *   收入 income：outpatient 门诊 / inpatient 住院 / drug 药品 / exam 检查
 *   支出 expense：salary 人员工资(固定) / drug_purchase 药品采购(变动) /
 *                equipment_purchase 设备采购(固定) / consumable_purchase 耗材采购(变动) /
 *                utilities 水电费(固定)
 *
 * 全部无副作用、不触库、不改入参，便于单测；数据库读写由路由层负责。
 * 金额统一两位小数（人民币元），避免浮点误差导致报表对不上账。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 收支方向 */
export type FinanceType = 'income' | 'expense';

/** 会计期间：year 必填；month 指定时按年+月，缺省按整年 */
export interface Period {
  year: number;
  month?: number;
}

/** 一笔深度流水（BFF 喂入纯函数的形态，camelCase） */
export interface DeepTxn {
  type: FinanceType;
  /** 类别代码（与 finance_transaction category 一致） */
  category: string;
  /** 金额（正数，元，两位小数） */
  amount: number;
  /** 成本中心/归属科室 */
  dept: string;
  periodYear: number;
  /** 会计月份 1..12 */
  periodMonth: number;
  /** 项目成本编码（可空） */
  projectCode?: string;
  /** 病种成本编码（可空） */
  diseaseCode?: string;
  /** 直接/间接成本（缺省按 direct） */
  costNature?: 'direct' | 'indirect';
}

/** 年度预算计划数（clinical.finance_budget 一行） */
export interface BudgetLine {
  dept: string;
  fiscalYear: number;
  /** 预算科目（对应流水 category） */
  subject: string;
  annualAmount: number;
}

/** 科室运营量（折算单位成本的动因分母） */
export interface DeptActivity {
  /** 统计期门诊人次 */
  outpatientVisits?: number;
  /** 统计期占用床日 */
  bedDays?: number;
}

/** 类别元数据 */
const CATEGORY_META: Readonly<Record<string, { label: string; type: FinanceType; nature: 'fixed' | 'variable' }>> = {
  outpatient: { label: '门诊收入', type: 'income', nature: 'variable' },
  inpatient: { label: '住院收入', type: 'income', nature: 'variable' },
  drug: { label: '药品收入', type: 'income', nature: 'variable' },
  exam: { label: '检查收入', type: 'income', nature: 'variable' },
  salary: { label: '人员工资', type: 'expense', nature: 'fixed' },
  drug_purchase: { label: '药品采购', type: 'expense', nature: 'variable' },
  equipment_purchase: { label: '设备采购', type: 'expense', nature: 'fixed' },
  consumable_purchase: { label: '耗材采购', type: 'expense', nature: 'variable' },
  utilities: { label: '水电费', type: 'expense', nature: 'fixed' },
};

/** 药占比红线（国家公立医院监控口径，药品收入/医疗收入） */
export const DRUG_RATIO_RED_LINE = 0.30;

/* ------------------------------------------------------------------ */
/* 工具                                                                 */
/* ------------------------------------------------------------------ */

function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function labelOf(category: string): string {
  return CATEGORY_META[category]?.label ?? category;
}

/** 流水是否落在账期内（year 必匹配；period.month 指定时月份也要匹配） */
function inPeriod(t: DeepTxn, p: Period): boolean {
  if (t.periodYear !== p.year) return false;
  if (p.month !== undefined && t.periodMonth !== p.month) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* 1) 科室成本核算（纯函数）                                            */
/* ------------------------------------------------------------------ */

/** 项目成本归集行 */
export interface ProjectCostLine {
  projectCode: string;
  directCost: number;
  indirectCost: number;
  totalCost: number;
}

/** 病种成本归集行 */
export interface DiseaseCostLine {
  diseaseCode: string;
  directCost: number;
  indirectCost: number;
  totalCost: number;
}

/** 科室成本核算结果 */
export interface DeptCostResult {
  dept: string;
  periodYear: number;
  periodMonth?: number;
  /** 直接成本（可直接归集到科室） */
  directCost: number;
  /** 间接成本（需按动因分摊的公共成本） */
  indirectCost: number;
  /** 科室全成本 = 直接 + 间接 */
  totalCost: number;
  /** 成本按类别拆分 */
  costByCategory: { category: string; label: string; amount: number }[];
  /** 项目成本下钻 */
  projectCosts: ProjectCostLine[];
  /** 病种成本下钻 */
  diseaseCosts: DiseaseCostLine[];
  /** 科室收入（同期） */
  deptRevenue: number;
  /** 科室净贡献 = 收入 - 全成本 */
  netContribution: number;
  /** 单位成本：次均成本（元/门诊人次） */
  costPerVisit: number | null;
  /** 单位成本：床日成本（元/床日） */
  costPerBedDay: number | null;
  txnCount: number;
}

/**
 * 科室成本核算（纯函数）：直接成本 + 间接成本归集，下钻项目/病种，折算单位成本。
 *
 * 账实相符：成本全部来自该科室真实流水，不拍脑袋估数；间接成本单独列出，
 * 只做归集不自动分摊（分摊口径由预算管理侧的动因决定，避免双重分摊虚增成本）。
 *
 * @param dept    成本中心/科室编码
 * @param period  会计期间（year 必填，month 指定则单月）
 * @param txns    全量流水（纯函数不读全局台账）
 * @param activity 科室运营量（门诊人次/床日），用于折算单位成本
 */
export function calculateDepartmentCost(
  dept: string,
  period: Period,
  txns: readonly DeepTxn[],
  activity?: DeptActivity,
): DeptCostResult {
  if (!dept) throw new Error('科室 dept 不能为空');

  const mine = txns.filter((t) => t.dept === dept && inPeriod(t, period));

  let directCost = 0;
  let indirectCost = 0;
  let deptRevenue = 0;
  const catMap = new Map<string, number>();
  const projMap = new Map<string, { direct: number; indirect: number }>();
  const disMap = new Map<string, { direct: number; indirect: number }>();

  for (const t of mine) {
    if (t.type === 'income') {
      deptRevenue = round2(deptRevenue + t.amount);
      continue;
    }
    const isIndirect = t.costNature === 'indirect';
    if (isIndirect) indirectCost = round2(indirectCost + t.amount);
    else directCost = round2(directCost + t.amount);

    catMap.set(t.category, round2((catMap.get(t.category) ?? 0) + t.amount));

    if (t.projectCode) {
      const p = projMap.get(t.projectCode) ?? { direct: 0, indirect: 0 };
      if (isIndirect) p.indirect = round2(p.indirect + t.amount);
      else p.direct = round2(p.direct + t.amount);
      projMap.set(t.projectCode, p);
    }
    if (t.diseaseCode) {
      const d = disMap.get(t.diseaseCode) ?? { direct: 0, indirect: 0 };
      if (isIndirect) d.indirect = round2(d.indirect + t.amount);
      else d.direct = round2(d.direct + t.amount);
      disMap.set(t.diseaseCode, d);
    }
  }

  const totalCost = round2(directCost + indirectCost);
  const projectCosts: ProjectCostLine[] = Array.from(projMap.entries())
    .map(([projectCode, v]) => ({
      projectCode, directCost: round2(v.direct), indirectCost: round2(v.indirect),
      totalCost: round2(v.direct + v.indirect),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);
  const diseaseCosts: DiseaseCostLine[] = Array.from(disMap.entries())
    .map(([diseaseCode, v]) => ({
      diseaseCode, directCost: round2(v.direct), indirectCost: round2(v.indirect),
      totalCost: round2(v.direct + v.indirect),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return {
    dept,
    periodYear: period.year,
    periodMonth: period.month,
    directCost,
    indirectCost,
    totalCost,
    costByCategory: Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, label: labelOf(category), amount }))
      .sort((a, b) => b.amount - a.amount),
    projectCosts,
    diseaseCosts,
    deptRevenue,
    netContribution: round2(deptRevenue - totalCost),
    costPerVisit: activity?.outpatientVisits ? round2(totalCost / activity.outpatientVisits) : null,
    costPerBedDay: activity?.bedDays ? round2(totalCost / activity.bedDays) : null,
    txnCount: mine.length,
  };
}

/* ------------------------------------------------------------------ */
/* 2) 收入结构分析（纯函数）                                            */
/* ------------------------------------------------------------------ */

/** 某类收入结构行 */
export interface RevenueCategoryLine {
  category: string;
  label: string;
  amount: number;
  /** 占总收入比例 0..1 */
  share: number;
}

/** 收入结构分析结果 */
export interface RevenueStructure {
  periodYear: number;
  periodMonth?: number;
  totalRevenue: number;
  byCategory: RevenueCategoryLine[];
  /** 药占比 = 药品收入 / 总收入 */
  drugRatio: number;
  /** 检查占比 = 检查收入 / 总收入 */
  examRatio: number;
  /** 药占比是否触红线 */
  drugRatioWarning: boolean;
  incomeCount: number;
}

/**
 * 收入结构分析（纯函数）：门诊/住院/药品/检查四类收入占比，药占比红线预警。
 *
 * 账实相符：收入全部来自 type=income 的真实流水；药占比过高触发预警，
 * 引导医院调整收入结构（降低药占比是国考/绩效改革的硬指标）。
 *
 * @param period 会计期间
 * @param txns   全量流水
 */
export function analyzeRevenueStructure(
  period: Period,
  txns: readonly DeepTxn[],
): RevenueStructure {
  const income = txns.filter((t) => t.type === 'income' && inPeriod(t, period));
  const totalRevenue = round2(income.reduce((s, t) => s + t.amount, 0));

  const map = new Map<string, number>();
  for (const t of income) {
    map.set(t.category, round2((map.get(t.category) ?? 0) + t.amount));
  }
  const byCategory: RevenueCategoryLine[] = Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      label: labelOf(category),
      amount,
      share: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 10000) / 10000 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const drugAmount = map.get('drug') ?? 0;
  const examAmount = map.get('exam') ?? 0;
  const drugRatio = totalRevenue > 0 ? Math.round((drugAmount / totalRevenue) * 10000) / 10000 : 0;
  const examRatio = totalRevenue > 0 ? Math.round((examAmount / totalRevenue) * 10000) / 10000 : 0;

  return {
    periodYear: period.year,
    periodMonth: period.month,
    totalRevenue,
    byCategory,
    drugRatio,
    examRatio,
    drugRatioWarning: drugRatio > DRUG_RATIO_RED_LINE,
    incomeCount: income.length,
  };
}

/* ------------------------------------------------------------------ */
/* 3) 财务趋势预测（纯函数）                                            */
/* ------------------------------------------------------------------ */

/** 月度财务序列点 */
export interface MonthlyPoint {
  year: number;
  month: number;
  income: number;
  expense: number;
}

/** 趋势预测结果 */
export interface FinancialTrend {
  /** 趋势方向：up 上升 / down 下降 / flat 平稳 */
  direction: 'up' | 'down' | 'flat';
  /** 近 12 个月月均净结余 */
  avgMonthlyNet: number;
  /** 净结余月环比斜率（元/月，线性回归） */
  slope: number;
  /** 未来 3 个月净结余预测 */
  forecastNet: { year: number; month: number; net: number }[];
  /** 预测说明 */
  note: string;
}

/**
 * 财务趋势预测（纯函数）：对月度净结余做最小二乘线性回归，外推未来 3 个月。
 *
 * 账实相符：序列全部来自真实月度收支，预测只给趋势方向与量级，
 * 不伪装成精确预算；样本点 < 2 时退化为平稳、不外推。
 *
 * @param period 会计期间（as-of；预测月份从序列末端顺延）
 * @param series 近 N 个月真实月度收支（按时间升序）
 */
export function predictFinancialTrend(
  period: Period,
  series: readonly MonthlyPoint[],
): FinancialTrend {
  const pts = series.map((p) => ({ ...p, net: p.income - p.expense }));

  // 样本不足：无法拟合，按平稳处理
  if (pts.length < 2) {
    const net = pts.length === 1 ? round2(pts[0].net) : 0;
    return {
      direction: 'flat',
      avgMonthlyNet: net,
      slope: 0,
      forecastNet: [],
      note: '历史月度数据不足 2 期，无法拟合趋势，按平稳处理',
    };
  }

  const n = pts.length;
  const ys = pts.map((p) => p.net);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const meanY = sumY / n;
  // x = 0..n-1
  let sumX = 0, sumX2 = 0, sumXY = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumX2 += i * i;
    sumXY += i * ys[i];
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = meanY - (slope * sumX) / n;

  // 外推未来 3 个月
  const last = pts[n - 1];
  let fy = last.year;
  let fm = last.month;
  const forecastNet: { year: number; month: number; net: number }[] = [];
  for (let k = 1; k <= 3; k++) {
    fm += 1;
    if (fm > 12) { fm = 1; fy += 1; }
    forecastNet.push({ year: fy, month: fm, net: round2(intercept + slope * (n - 1 + k)) });
  }

  // 斜率折算成相对量级判断方向（避免噪声抖动判成趋势）
  const avgAbs = Math.abs(meanY) > 1e-6 ? Math.abs(meanY) : 1;
  const ratio = slope / avgAbs;
  const direction: FinancialTrend['direction'] =
    ratio > 0.05 ? 'up' : ratio < -0.05 ? 'down' : 'flat';

  return {
    direction,
    avgMonthlyNet: round2(meanY),
    slope: round2(slope),
    forecastNet,
    note: direction === 'flat'
      ? '近 N 个月净结余波动平稳，无明显上升/下降趋势'
      : direction === 'up'
        ? '净结余呈上升趋势，收入端改善或成本管控见效'
        : '净结余呈下降趋势，需关注收入结构变化与成本刚性上涨',
  };
}

/* ------------------------------------------------------------------ */
/* 4) 预算执行与超支预警（纯函数，供 buildDeepFinanceMgmt 调用）        */
/* ------------------------------------------------------------------ */

/** 预算执行单行 */
export interface BudgetExecutionLine {
  dept: string;
  subject: string;
  subjectLabel: string;
  annualBudget: number;
  /** 截至本月实际支出累计 */
  actualYtd: number;
  /** 进度基准 = 年预算/12 × 已过月数 */
  paceBudget: number;
  /** 进度执行率 = 实际 / 进度基准 */
  paceRate: number;
  /** on_track / warning / over / ahead */
  status: 'on_track' | 'warning' | 'over' | 'ahead';
}

/**
 * 预算月度执行跟踪（纯函数）：计划数（预算）对照实际数（流水），超进度预警。
 * 账实相符：实际只取 type=expense 且 category=subject 的流水累计。
 */
export function trackBudgetExecution(
  budgets: readonly BudgetLine[],
  period: Period,
  txns: readonly DeepTxn[],
): BudgetExecutionLine[] {
  const elapsed = period.month ?? 12;
  return budgets
    .filter((b) => b.fiscalYear === period.year)
    .map((b) => {
      let actualYtd = 0;
      for (const t of txns) {
        if (t.dept !== b.dept || t.type !== 'expense' || t.category !== b.subject) continue;
        if (t.periodYear !== period.year || t.periodMonth > elapsed) continue;
        actualYtd = round2(actualYtd + t.amount);
      }
      const paceBudget = round2((b.annualAmount / 12) * elapsed);
      const paceRate = paceBudget > 1e-9
        ? Math.round((actualYtd / paceBudget) * 1000) / 1000
        : (actualYtd > 0 ? 2 : 1);
      let status: BudgetExecutionLine['status'] = 'on_track';
      if (paceRate > 1.15) status = 'over';
      else if (paceRate > 1.05) status = 'warning';
      else if (paceRate < 0.9) status = 'ahead';
      return {
        dept: b.dept,
        subject: b.subject,
        subjectLabel: labelOf(b.subject),
        annualBudget: round2(b.annualAmount),
        actualYtd,
        paceBudget,
        paceRate,
        status,
      };
    })
    .sort((a, b) => b.paceRate - a.paceRate);
}

/* ------------------------------------------------------------------ */
/* 5) 本量利分析 CVP（纯函数，供 buildDeepFinanceMgmt 调用）            */
/* ------------------------------------------------------------------ */

/** 本量利分析结果 */
export interface CvpAnalysis {
  /** 固定成本（工资/设备/水电，不随业务量变动） */
  fixedCost: number;
  /** 变动成本（药品/耗材，随业务量变动） */
  variableCost: number;
  /** 业务收入 */
  revenue: number;
  /** 边际贡献 = 收入 - 变动成本 */
  contributionMargin: number;
  /** 边际贡献率 = 边际贡献 / 收入 */
  cmRatio: number;
  /** 盈亏平衡收入 = 固定成本 / 边际贡献率 */
  breakEvenRevenue: number;
  /** 安全边际率 = (实际收入 - 盈亏平衡收入) / 实际收入 */
  safetyMargin: number;
  /** 是否亏损 */
  isLoss: boolean;
}

/**
 * 本量利分析（纯函数）：划分固定/变动成本，算边际贡献与盈亏平衡点。
 * 账实相符：固定/变动按 category 口径硬划分，可复算、可审计。
 */
export function analyzeCvp(period: Period, txns: readonly DeepTxn[]): CvpAnalysis {
  let fixedCost = 0, variableCost = 0, revenue = 0;
  for (const t of txns) {
    if (!inPeriod(t, period)) continue;
    if (t.type === 'income') {
      revenue = round2(revenue + t.amount);
      continue;
    }
    const nature = CATEGORY_META[t.category]?.nature;
    if (nature === 'fixed') fixedCost = round2(fixedCost + t.amount);
    else variableCost = round2(variableCost + t.amount);
  }
  const contributionMargin = round2(revenue - variableCost);
  const cmRatio = revenue > 0 ? Math.round((contributionMargin / revenue) * 10000) / 10000 : 0;
  const breakEvenRevenue = cmRatio > 1e-9 ? round2(fixedCost / cmRatio) : 0;
  const safetyMargin = revenue > 0 && breakEvenRevenue > 0
    ? Math.round(((revenue - breakEvenRevenue) / revenue) * 10000) / 10000
    : 0;
  return {
    fixedCost,
    variableCost,
    revenue,
    contributionMargin,
    cmRatio,
    breakEvenRevenue,
    safetyMargin,
    isLoss: revenue - fixedCost - variableCost < 0,
  };
}

/* ------------------------------------------------------------------ */
/* 6) 总装：深度财务管理驾驶舱                                          */
/* ------------------------------------------------------------------ */

/** buildDeepFinanceMgmt 输入 */
export interface DeepFinanceInput {
  period: Period;
  txns: readonly DeepTxn[];
  budgets: readonly BudgetLine[];
  /** 重点科室（成本核算下钻）；缺省取流水出现的第一个科室 */
  dept?: string;
  /** 重点科室运营量（单位成本折算） */
  activity?: DeptActivity;
  /** 近 N 个月月度序列（趋势预测） */
  monthlySeries?: readonly MonthlyPoint[];
}

/** 深度财务管理结果 */
export interface DeepFinanceMgmt {
  periodYear: number;
  periodMonth?: number;
  /** 预算管理：月度执行 + 超支预警 */
  budgetExecution: BudgetExecutionLine[];
  /** 超支/预警条数 */
  overrunAlertCount: number;
  /** 成本核算（重点科室） */
  departmentCost: DeptCostResult;
  /** 收入结构 */
  revenue: RevenueStructure;
  /** 本量利分析 */
  cvp: CvpAnalysis;
  /** 趋势预测 */
  trend: FinancialTrend;
  generatedAt: string;
}

/**
 * 深度财务管理（纯函数总装）：把预算/成本/收入/分析四维一次算齐。
 *
 * @param input 会计期间 + 真实流水 + 年度预算 + 可选重点科室/月度序列
 */
export function buildDeepFinanceMgmt(input: DeepFinanceInput): DeepFinanceMgmt {
  const { period, txns, budgets } = input;

  const budgetExecution = trackBudgetExecution(budgets, period, txns);
  const overrunAlertCount = budgetExecution.filter(
    (l) => l.status === 'over' || l.status === 'warning',
  ).length;

  // 重点科室：显式指定优先，否则取流水里收支最活跃的科室
  let dept = input.dept?.trim() ?? '';
  if (!dept) {
    const freq = new Map<string, number>();
    for (const t of txns) {
      if (inPeriod(t, period)) freq.set(t.dept, (freq.get(t.dept) ?? 0) + t.amount);
    }
    let best = '';
    let bestAmt = -1;
    for (const [d, amt] of freq) {
      if (amt > bestAmt) { best = d; bestAmt = amt; }
    }
    dept = best || 'unknown';
  }

  const departmentCost = calculateDepartmentCost(dept, period, txns, input.activity);
  const revenue = analyzeRevenueStructure(period, txns);
  const cvp = analyzeCvp(period, txns);
  const trend = predictFinancialTrend(period, input.monthlySeries ?? []);

  return {
    periodYear: period.year,
    periodMonth: period.month,
    budgetExecution,
    overrunAlertCount,
    departmentCost,
    revenue,
    cvp,
    trend,
    generatedAt: new Date().toISOString(),
  };
}
