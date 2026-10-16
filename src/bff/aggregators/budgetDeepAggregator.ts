/**
 * 健澜科技 jlmedaios — 【CDSS与运营精细化】医院预算与成本管理深化聚合器（M165-B，纯函数）
 *
 * 预算管理要真实，不能拍脑袋。本聚合器把科室年度预算从「领导拍个数」升级为
 * 「按驱动因子测算 + 执行逐月跟踪 + 超支预测 + 结构优化建议」的闭环：
 *
 *   - buildDepartmentBudget：按驱动因子（编制人数、门诊人次、床日、设备原值、
 *     面积等）量价测算四大类（人力/药品/设备/运营）及明细子项预算，每一行都带
 *     量价口径（driverQty × driverPrice），可追溯、可复算；
 *   - trackBudgetExecution：把年度预算摊到 12 个月做「进度基准线」，逐月对照
 *     实际支出，算执行率 / 进度偏差，给 on_track / warning / over 状态；
 *   - predictBudgetOverrun：用截至本月的月均运行率年化外推全年支出，叠加近 3
 *     个月加速度修正，预测年末是否超支及超支额，分 green/yellow/red 三档；
 *   - optimizeBudgetAllocation：读历史平均执行率，把长期结余大类（<80%）的
 *     可调剂额度，向长期超支大类（>100%）定向调剂，只出建议不自动调账。
 *
 * 全部无副作用、不触库，便于单测；数据库读写由路由层负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 预算四大类 */
export type BudgetCategory = 'labor' | 'drug' | 'equipment' | 'operation';

/** 大类中文名 */
export const CATEGORY_LABEL: Record<BudgetCategory, string> = {
  labor: '人力成本',
  drug: '药品耗材',
  equipment: '设备折旧',
  operation: '运营管理',
};

/** 一个预算明细行（量价可追溯） */
export interface BudgetLine {
  category: BudgetCategory;
  /** 子项 key */
  sub: string;
  /** 子项中文名 */
  subName: string;
  /** 年度预算金额（元） */
  amount: number;
  /** 驱动量（人数/人次/床日/m²/设备原值） */
  driverQty: number;
  /** 驱动量单位 */
  driverUnit: string;
  /** 单价 / 系数 */
  driverPrice: number;
  /** 测算口径说明 */
  methodNote: string;
}

/** buildDepartmentBudget 的驱动因子输入（科室实际运营量价） */
export interface DeptBudgetDrivers {
  deptCode: string;
  deptName: string;
  /** 编制人数 */
  headcount: number;
  /** 人均月应发工资（元/人·月） */
  avgMonthlySalary: number;
  /** 绩效占工资比例（如 0.30 = 30%） */
  performanceRatio: number;
  /** 社保公积金占工资比例（如 0.32） */
  socialInsuranceRatio: number;
  /** 人均年培训预算（元/人·年） */
  trainingPerHeadYear: number;
  /** 年预计门诊人次 */
  expectedOutpatientVisits: number;
  /** 门诊次均药品费（元/人次，含西药+中成药） */
  drugCostPerVisit: number;
  /** 门诊药品中西药占比（0..1） */
  westMedicineRatio: number;
  /** 年占用床日 */
  inpatientBedDays: number;
  /** 床日均耗材成本（元/床日） */
  consumableCostPerBedDay: number;
  /** 本年设备采购计划（元） */
  equipmentPurchase: number;
  /** 在用设备账面原值（元） */
  equipmentBookValue: number;
  /** 设备折旧年限（年） */
  depreciationYears: number;
  /** 年维护费率（占设备原值，如 0.05） */
  maintenanceRate: number;
  /** 科室面积（m²） */
  areaSqm: number;
  /** 每平米年水电（元/m²·年） */
  utilityPerSqmYear: number;
  /** 人均年办公费（元/人·年） */
  officePerHeadYear: number;
  /** 年差旅定额（元） */
  travelQuota: number;
  /** 年会议预算（元） */
  meetingBudget: number;
}

/** 部门预算结果 */
export interface DepartmentBudget {
  deptCode: string;
  deptName: string;
  year: number;
  category: BudgetCategory | 'all';
  lines: BudgetLine[];
  total: number;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * 人力成本测算：工资为基数，绩效与社保按比例叠加，培训按人头。
 */
function buildLabor(d: DeptBudgetDrivers): BudgetLine[] {
  const salary = d.headcount * d.avgMonthlySalary * 12;
  return [
    {
      category: 'labor', sub: 'salary', subName: '工资',
      amount: round2(salary),
      driverQty: d.headcount, driverUnit: '人', driverPrice: d.avgMonthlySalary * 12,
      methodNote: '编制人数 × 人均年薪（月工资×12）',
    },
    {
      category: 'labor', sub: 'performance', subName: '绩效',
      amount: round2(salary * d.performanceRatio),
      driverQty: round2(salary), driverUnit: '元工资基数', driverPrice: d.performanceRatio,
      methodNote: '工资基数 × 绩效系数',
    },
    {
      category: 'labor', sub: 'social_security', subName: '社保公积金',
      amount: round2(salary * d.socialInsuranceRatio),
      driverQty: round2(salary), driverUnit: '元工资基数', driverPrice: d.socialInsuranceRatio,
      methodNote: '工资基数 × 社保公积金系数',
    },
    {
      category: 'labor', sub: 'training', subName: '培训',
      amount: round2(d.headcount * d.trainingPerHeadYear),
      driverQty: d.headcount, driverUnit: '人', driverPrice: d.trainingPerHeadYear,
      methodNote: '编制人数 × 人均年培训预算',
    },
  ];
}

/**
 * 药品耗材测算：门诊药品按人次次均拆西药/中成药，耗材按住院床日。
 */
function buildDrug(d: DeptBudgetDrivers): BudgetLine[] {
  const outpatientDrug = d.expectedOutpatientVisits * d.drugCostPerVisit;
  const westRatio = Math.min(1, Math.max(0, d.westMedicineRatio));
  return [
    {
      category: 'drug', sub: 'west_medicine', subName: '西药',
      amount: round2(outpatientDrug * westRatio),
      driverQty: d.expectedOutpatientVisits, driverUnit: '人次', driverPrice: round2(d.drugCostPerVisit * westRatio),
      methodNote: '门诊人次 × 次均药费 × 西药占比',
    },
    {
      category: 'drug', sub: 'patent_drug', subName: '中成药',
      amount: round2(outpatientDrug * (1 - westRatio)),
      driverQty: d.expectedOutpatientVisits, driverUnit: '人次', driverPrice: round2(d.drugCostPerVisit * (1 - westRatio)),
      methodNote: '门诊人次 × 次均药费 × 中成药占比',
    },
    {
      category: 'drug', sub: 'consumable', subName: '耗材',
      amount: round2(d.inpatientBedDays * d.consumableCostPerBedDay),
      driverQty: d.inpatientBedDays, driverUnit: '床日', driverPrice: d.consumableCostPerBedDay,
      methodNote: '占用床日 × 床日均耗材成本',
    },
  ];
}

/**
 * 设备测算：本年采购 + 在用设备直线折旧 + 维护费。
 */
function buildEquipment(d: DeptBudgetDrivers): BudgetLine[] {
  const depreciation = d.depreciationYears > 0 ? d.equipmentBookValue / d.depreciationYears : 0;
  return [
    {
      category: 'equipment', sub: 'purchase', subName: '设备采购',
      amount: round2(d.equipmentPurchase),
      driverQty: 1, driverUnit: '项采购计划', driverPrice: d.equipmentPurchase,
      methodNote: '本年资本性采购计划（立项金额）',
    },
    {
      category: 'equipment', sub: 'depreciation', subName: '设备折旧',
      amount: round2(depreciation),
      driverQty: d.equipmentBookValue, driverUnit: '元原值', driverPrice: d.depreciationYears,
      methodNote: '在用设备原值 ÷ 折旧年限（直线法）',
    },
    {
      category: 'equipment', sub: 'maintenance', subName: '设备维护',
      amount: round2(d.equipmentBookValue * d.maintenanceRate),
      driverQty: d.equipmentBookValue, driverUnit: '元原值', driverPrice: d.maintenanceRate,
      methodNote: '在用设备原值 × 年维护费率',
    },
  ];
}

/**
 * 运营测算：水电按面积，办公按人头，差旅/会议按定额。
 */
function buildOperation(d: DeptBudgetDrivers): BudgetLine[] {
  return [
    {
      category: 'operation', sub: 'utility', subName: '水电',
      amount: round2(d.areaSqm * d.utilityPerSqmYear),
      driverQty: d.areaSqm, driverUnit: 'm²', driverPrice: d.utilityPerSqmYear,
      methodNote: '科室面积 × 每平米年水电单价',
    },
    {
      category: 'operation', sub: 'office', subName: '办公',
      amount: round2(d.headcount * d.officePerHeadYear),
      driverQty: d.headcount, driverUnit: '人', driverPrice: d.officePerHeadYear,
      methodNote: '编制人数 × 人均年办公费',
    },
    {
      category: 'operation', sub: 'travel', subName: '差旅',
      amount: round2(d.travelQuota),
      driverQty: 1, driverUnit: '项定额', driverPrice: d.travelQuota,
      methodNote: '科室年度差旅定额',
    },
    {
      category: 'operation', sub: 'meeting', subName: '会议',
      amount: round2(d.meetingBudget),
      driverQty: 1, driverUnit: '项定额', driverPrice: d.meetingBudget,
      methodNote: '科室年度会议预算定额',
    },
  ];
}

const BUILDERS: Record<BudgetCategory, (d: DeptBudgetDrivers) => BudgetLine[]> = {
  labor: buildLabor,
  drug: buildDrug,
  equipment: buildEquipment,
  operation: buildOperation,
};

/**
 * 预算编制（纯函数）：按驱动因子量价测算某科室某年度某大类（或全部）预算。
 *
 * @param dept     科室驱动因子（编制/人次/床日/设备原值/面积等真实量价）
 * @param year     预算年度
 * @param category 大类；传 'all' 返回四大类全部明细
 */
export function buildDepartmentBudget(
  dept: DeptBudgetDrivers,
  year: number,
  category: BudgetCategory | 'all',
): DepartmentBudget {
  const cats: BudgetCategory[] = category === 'all'
    ? ['labor', 'drug', 'equipment', 'operation']
    : [category];
  const lines: BudgetLine[] = [];
  for (const c of cats) lines.push(...BUILDERS[c](dept));
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    year,
    category,
    lines,
    total,
  };
}

/** 执行跟踪输入：一条明细预算 + 12 个月的实际支出（索引 0 = 1 月） */
export interface ExecutionLine {
  category: BudgetCategory;
  sub: string;
  subName: string;
  annualBudget: number;
  /** 1..12 月实际支出，长度不足按 0 补 */
  spentByMonth: number[];
}

export interface ExecutionPeriod {
  /** 跟踪截止到第几月（1..12，含本月） */
  upToMonth: number;
}

/** 单行执行状态 */
export interface ExecutionLineStatus {
  category: BudgetCategory;
  sub: string;
  subName: string;
  annualBudget: number;
  spentYtd: number;
  /** 进度基准：截至本月「应该花掉」的预算 = 年预算/12 × 已过月数 */
  paceBudget: number;
  /** 预算执行率 = 累计支出 / 年预算 */
  executionRate: number;
  /** 进度执行率 = 累计支出 / 进度基准 */
  paceRate: number;
  /** 进度偏差 = 累计支出 − 进度基准（正=超进度） */
  variance: number;
  /** on_track: 进度±5%内；warning: 超进度5~15%；over: 超进度>15%；ahead: 进度落后>10%（结余） */
  status: 'on_track' | 'warning' | 'over' | 'ahead';
}

export interface DepartmentExecution {
  deptCode: string;
  deptName: string;
  year: number;
  upToMonth: number;
  lines: ExecutionLineStatus[];
  categoryRollup: { category: BudgetCategory; label: string; annualBudget: number; spentYtd: number; executionRate: number }[];
  totalBudget: number;
  totalSpent: number;
  overallExecutionRate: number;
}

/**
 * 预算执行跟踪（纯函数）：把年预算摊到 12 个月做进度基准，逐月对照实际。
 *
 * @param dept    含明细预算与逐月实际支出
 * @param period  截止月份
 */
export function trackBudgetExecution(
  dept: { deptCode: string; deptName: string; year: number; lines: ExecutionLine[] },
  period: ExecutionPeriod,
): DepartmentExecution {
  const upToMonth = Math.min(12, Math.max(1, Math.floor(period.upToMonth) || 1));
  const lines: ExecutionLineStatus[] = dept.lines.map((l) => {
    let spentYtd = 0;
    for (let m = 0; m < upToMonth; m++) spentYtd += Number(l.spentByMonth[m] ?? 0);
    const paceBudget = (l.annualBudget / 12) * upToMonth;
    const executionRate = l.annualBudget > 0 ? spentYtd / l.annualBudget : 0;
    const paceRate = paceBudget > 1e-9 ? spentYtd / paceBudget : (spentYtd > 0 ? 2 : 1);
    const variance = spentYtd - paceBudget;
    let status: ExecutionLineStatus['status'] = 'on_track';
    if (paceRate > 1.15) status = 'over';
    else if (paceRate > 1.05) status = 'warning';
    else if (paceRate < 0.90) status = 'ahead';
    return {
      category: l.category,
      sub: l.sub,
      subName: l.subName,
      annualBudget: round2(l.annualBudget),
      spentYtd: round2(spentYtd),
      paceBudget: round2(paceBudget),
      executionRate: Math.round(executionRate * 1000) / 1000,
      paceRate: Math.round(paceRate * 1000) / 1000,
      variance: round2(variance),
      status,
    };
  });

  const rollupMap = new Map<BudgetCategory, { annualBudget: number; spentYtd: number }>();
  for (const l of lines) {
    const acc = rollupMap.get(l.category) ?? { annualBudget: 0, spentYtd: 0 };
    acc.annualBudget += l.annualBudget;
    acc.spentYtd += l.spentYtd;
    rollupMap.set(l.category, acc);
  }
  const categoryRollup: DepartmentExecution['categoryRollup'] = Array.from(rollupMap.entries())
    .map(([category, v]) => ({
      category,
      label: CATEGORY_LABEL[category],
      annualBudget: round2(v.annualBudget),
      spentYtd: round2(v.spentYtd),
      executionRate: v.annualBudget > 0 ? Math.round((v.spentYtd / v.annualBudget) * 1000) / 1000 : 0,
    }));

  const totalBudget = round2(lines.reduce((s, l) => s + l.annualBudget, 0));
  const totalSpent = round2(lines.reduce((s, l) => s + l.spentYtd, 0));
  return {
    deptCode: dept.deptCode,
    deptName: dept.deptName,
    year: dept.year,
    upToMonth,
    lines,
    categoryRollup,
    totalBudget,
    totalSpent,
    overallExecutionRate: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 1000 : 0,
  };
}

/** 超支预测单行结果 */
export interface OverrunPrediction {
  category: BudgetCategory;
  annualBudget: number;
  ytdSpent: number;
  /** 月均运行率（截至本月） */
  monthlyRunRate: number;
  /** 近 3 个月月均运行率（用于加速度修正） */
  recentRunRate: number;
  /** 年化外推年末支出（叠加加速度修正） */
  projectedYearEnd: number;
  /** 预计超支额（负=结余） */
  predictedOverrun: number;
  /** green: 外推<年预算90%；yellow: 90~100%；red: >100% */
  riskLevel: 'green' | 'yellow' | 'red';
}

export interface OverrunForecast {
  deptCode: string;
  year: number;
  asOfMonth: number;
  predictions: OverrunPrediction[];
  totalBudget: number;
  totalProjected: number;
  totalOverrun: number;
  overallRisk: 'green' | 'yellow' | 'red';
}

/**
 * 超支预测（纯函数）：月均运行率年化外推，近 3 月若加速则上调外推。
 *
 * @param dept 含明细预算与逐月实际支出
 * @param year 预测年度
 */
export function predictBudgetOverrun(
  dept: { deptCode: string; year: number; lines: ExecutionLine[] },
  year: number,
): OverrunForecast {
  // 找到有支出数据的最后一个月
  let lastMonth = 0;
  for (const l of dept.lines) {
    for (let m = l.spentByMonth.length - 1; m >= 0; m--) {
      if (Number(l.spentByMonth[m] ?? 0) > 0) { lastMonth = Math.max(lastMonth, m + 1); break; }
    }
  }
  const asOfMonth = Math.min(12, Math.max(1, lastMonth));

  // 按大类聚合
  const catAgg = new Map<BudgetCategory, { annualBudget: number; spentByMonth: number[] }>();
  for (const l of dept.lines) {
    const acc = catAgg.get(l.category) ?? { annualBudget: 0, spentByMonth: new Array(12).fill(0) };
    acc.annualBudget += l.annualBudget;
    for (let m = 0; m < 12; m++) acc.spentByMonth[m] += Number(l.spentByMonth[m] ?? 0);
    catAgg.set(l.category, acc);
  }

  const predictions: OverrunPrediction[] = [];
  for (const [category, v] of catAgg) {
    let ytd = 0;
    for (let m = 0; m < asOfMonth; m++) ytd += v.spentByMonth[m];
    const elapsed = asOfMonth;
    const monthlyRunRate = elapsed > 0 ? ytd / elapsed : 0;
    // 近 3 个月（或更少）月均
    const recentN = Math.min(3, asOfMonth);
    let recentSum = 0;
    for (let m = asOfMonth - recentN; m < asOfMonth; m++) recentSum += v.spentByMonth[m];
    const recentRunRate = recentN > 0 ? recentSum / recentN : 0;
    // 加速度：近 3 月运行率相对整体月均的偏离，越远月数权重越小
    const acceleration = monthlyRunRate > 1e-9 ? (recentRunRate - monthlyRunRate) / monthlyRunRate : 0;
    // 外推 = 已花 + 未来(12-asOf)月按修正后运行率
    const adjustedRunRate = monthlyRunRate * (1 + Math.max(-0.2, Math.min(0.3, acceleration)) * 0.5);
    const projected = ytd + adjustedRunRate * (12 - asOfMonth);
    const predictedOverrun = projected - v.annualBudget;
    const ratio = v.annualBudget > 0 ? projected / v.annualBudget : 0;
    const riskLevel: OverrunPrediction['riskLevel'] = ratio > 1.0 ? 'red' : ratio > 0.9 ? 'yellow' : 'green';
    predictions.push({
      category,
      annualBudget: round2(v.annualBudget),
      ytdSpent: round2(ytd),
      monthlyRunRate: round2(monthlyRunRate),
      recentRunRate: round2(recentRunRate),
      projectedYearEnd: round2(projected),
      predictedOverrun: round2(predictedOverrun),
      riskLevel,
    });
  }

  const totalBudget = round2(predictions.reduce((s, p) => s + p.annualBudget, 0));
  const totalProjected = round2(predictions.reduce((s, p) => s + p.projectedYearEnd, 0));
  const totalOverrun = round2(totalProjected - totalBudget);
  const overallRatio = totalBudget > 0 ? totalProjected / totalBudget : 0;
  const overallRisk: OverrunForecast['overallRisk'] = overallRatio > 1.0 ? 'red' : overallRatio > 0.9 ? 'yellow' : 'green';

  return {
    deptCode: dept.deptCode,
    year,
    asOfMonth,
    predictions,
    totalBudget,
    totalProjected,
    totalOverrun,
    overallRisk,
  };
}

/** 历史执行率输入：某大类过去 N 年的平均执行率（实际支出/年预算） */
export interface CategoryHistory {
  category: BudgetCategory;
  label: string;
  /** 当前年度预算 */
  annualBudget: number;
  /** 过去 3 年平均执行率（如 0.72 = 常年结余 28%；1.10 = 常年超支 10%） */
  avgUtilization: number;
}

/** 优化建议 */
export interface ReallocationSuggestion {
  source: BudgetCategory;
  sourceLabel: string;
  target: BudgetCategory;
  targetLabel: string;
  /** 建议调剂金额（元） */
  amount: number;
  rationale: string;
}

export interface ReallocationResult {
  deptCode: string;
  year: number;
  suggestions: ReallocationSuggestion[];
  totalReallocated: number;
}

/** 长期结余阈值：执行率低于此的大类视为可调剂 */
const UNDERSPENT_THRESHOLD = 0.8;
/** 长期超支阈值：执行率高于此的大类视为需要补入 */
const OVERSPENT_THRESHOLD = 1.0;
/** 单个大类可调剂额度上限（占其预算比例），避免动摇基本盘 */
const MAX_FREE_RATIO = 0.15;

/**
 * 预算结构优化（纯函数）：从长期结余大类向长期超支大类定向调剂，只出建议。
 *
 * @param dept         科室标识
 * @param historyData  各大类当前预算与历史平均执行率
 */
export function optimizeBudgetAllocation(
  dept: { deptCode: string; year: number },
  historyData: CategoryHistory[],
): ReallocationResult {
  const sources = historyData
    .filter((h) => h.avgUtilization < UNDERSPENT_THRESHOLD && h.annualBudget > 0)
    .map((h) => ({
      ...h,
      freeable: round2(h.annualBudget * Math.min(1 - h.avgUtilization, MAX_FREE_RATIO)),
    }))
    .sort((a, b) => a.avgUtilization - b.avgUtilization);

  const targets = historyData
    .filter((h) => h.avgUtilization > OVERSPENT_THRESHOLD && h.annualBudget > 0)
    .map((h) => ({
      ...h,
      gap: round2(h.annualBudget * (h.avgUtilization - 1)),
    }))
    .sort((a, b) => b.avgUtilization - a.avgUtilization);

  const suggestions: ReallocationSuggestion[] = [];
  for (const t of targets) {
    let need = t.gap;
    for (const s of sources) {
      if (need <= 0) break;
      if (s.freeable <= 0) continue;
      if (s.category === t.category) continue;
      const amount = Math.min(s.freeable, need);
      suggestions.push({
        source: s.category,
        sourceLabel: s.label,
        target: t.category,
        targetLabel: t.label,
        amount: round2(amount),
        rationale: `${s.label} 近三年平均执行率仅 ${(s.avgUtilization * 100).toFixed(0)}%（长期结余），${t.label} 平均执行率达 ${(t.avgUtilization * 100).toFixed(0)}%（常年超支），建议调剂（仅建议，需财务处审批）`,
      });
      s.freeable = round2(s.freeable - amount);
      need = round2(need - amount);
    }
  }

  return {
    deptCode: dept.deptCode,
    year: dept.year,
    suggestions,
    totalReallocated: round2(suggestions.reduce((s, x) => s + x.amount, 0)),
  };
}
