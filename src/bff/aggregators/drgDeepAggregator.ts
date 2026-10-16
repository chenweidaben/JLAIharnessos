/**
 * 健澜科技 jlmedaios - 【临床核心深化】DRG/DIP 付费深度分析聚合器（M176-A），纯函数。
 *
 * DRG 分析要真懂医保政策，不能外行。本模块把"年底拍脑袋算盈亏"升级为
 * 「分组正确性反查 → 费用偏差 → 病例/科室/院级盈亏 → CMI/时间·费用消耗指数 →
 *   离群病例识别 → 绩效优化建议」的闭环，全部无副作用、不触库，便于单测；
 * 数据库读写由路由层负责（表结构见 deploy/postgres/init/352-drg-deep.sql）。
 *
 * 政策口径（写死在常量里，可由医保办下发规则覆盖）：
 *  - DRG 入组三要素：主要诊断（定 MDC）＋其他诊断（CC/MCC）＋手术操作
 *    （是否进手术室 ORP，定外科组/内科组）；主诊断应选消耗资源最多的疾病；
 *  - 标准付费 = 权重 × 医保费率；超支部分医院自担（超支不补），结余部分留用；
 *  - 离群病例（极端值）单独结算：费用 > 组均 2 倍可走"特例/特病单议"；
 *    费用 < 组均 0.4 倍且住院日偏短，疑似低标入院/分解住院，需病案质控；
 *  - CMI = Σ权重 / 病例数；时间消耗指数 = 本院例均住院日 / 标杆组均住院日；
 *    费用消耗指数 = 本院例均费用 / 标杆组均费用，两者 <1 为优、>1.2 预警。
 *
 * 医疗安全红线：仅运营管理辅助，不触发诊疗、不自动改医嘱、不自动改结算。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** DRG 病组规则（与 56-drg-grouping.sql 种子同口径，演示基准，上线后由医保办维护） */
export interface DRGGroupDef {
  groupCode: string;
  groupName: string;
  mdc: string;
  /** 主诊断 ICD-10 前缀集合，如 ['I50'] 匹配 I50.x */
  dxPrefixes: string[];
  /** true=外科组（必须含手术室操作）；false=内科组 */
  requiresOrp: boolean;
  /** 组权重 */
  weight: number;
  /** 组标杆例均费用（元） */
  avgCost: number;
  /** 组标杆平均住院日（天） */
  avgLos: number;
}

/** 待分析的出院病例（纯数据，无 I/O） */
export interface DRGCase {
  visitId: string;
  dept?: string;
  /** 主诊断 ICD-10，如 'I50.9' */
  primaryDx: string;
  /** 是否含手术室操作 */
  hasOrp: boolean;
  /** 实际入组编码 */
  groupCode: string;
  /** 实际费用/成本（元） */
  actualCost: number;
  /** 实际住院日（天） */
  losDays: number;
}

/** 分组正确性结论 */
export type GroupingCorrectness = 'correct' | 'suspect' | 'wrong';

/** 离群类型 */
export type InlierStatus =
  | 'inlier'
  | 'high_cost_outlier'
  | 'long_los_outlier'
  | 'low_cost_outlier';

/** 单病例盈亏入参（calculateDRGProfitLoss 的 drgGroup） */
export interface DRGProfitInput {
  groupCode: string;
  /** 病组权重 */
  weight: number;
  /** 医保费率（元/权重） */
  rate: number;
  /** 实际费用/成本（元） */
  actualCost: number;
}

// ---------------------------------------------------------------------------
// 常量（政策口径）
// ---------------------------------------------------------------------------

/** 默认医保费率（元/权重），本地演示基准；实际由统筹区医保局公布 */
export const DEFAULT_RATE = 10000;

/** 高费用离群阈值：实际费用 > 组均 × 该倍数 → 极端值，可特例单议 */
export const HIGH_COST_OUTLIER_MULTIPLIER = 2.0;
/** 低费用离群阈值：实际费用 < 组均 × 该倍数 → 疑似低标入院/分解住院 */
export const LOW_COST_OUTLIER_MULTIPLIER = 0.4;
/** 超长住院离群阈值：住院日 > 组均 × 该倍数 */
export const LONG_LOS_OUTLIER_MULTIPLIER = 2.0;

/** 消耗指数预警线：>1.2 触发管控建议 */
export const EFFICIENCY_WARN_THRESHOLD = 1.2;
/** 分组错误率预警线（>5% 提示病案质控） */
export const GROUPING_ERROR_RATE_WARN = 0.05;
/** 超支病例占比预警线 */
export const LOSS_CASE_RATIO_WARN = 0.3;

/** 本地病组规则目录（演示基准；与 56-drg-grouping.sql 种子一致） */
export const DRG_GROUP_CATALOG: DRGGroupDef[] = [
  { groupCode: 'ES29', groupName: '内科-肺炎合并症', mdc: 'J', dxPrefixes: ['J18', 'J15', 'J16'], requiresOrp: false, weight: 0.8, avgCost: 8000, avgLos: 9 },
  { groupCode: 'FB29', groupName: '内科-心力衰竭', mdc: 'F', dxPrefixes: ['I50'], requiresOrp: false, weight: 0.9, avgCost: 9000, avgLos: 8 },
  { groupCode: 'FC25', groupName: '内科-冠脉介入', mdc: 'F', dxPrefixes: ['I21', 'I22'], requiresOrp: false, weight: 1.2, avgCost: 12000, avgLos: 7 },
  { groupCode: 'GB25', groupName: '外科-胆囊切除伴合并症', mdc: 'G', dxPrefixes: ['K80'], requiresOrp: true, weight: 1.5, avgCost: 15000, avgLos: 10 },
  { groupCode: 'IB29', groupName: '外科-阑尾切除', mdc: 'I', dxPrefixes: ['K35'], requiresOrp: true, weight: 1.0, avgCost: 10000, avgLos: 6 },
  { groupCode: 'UZ00', groupName: '未入组-其他', mdc: 'Z', dxPrefixes: [], requiresOrp: false, weight: 1.0, avgCost: 7000, avgLos: 5 },
];

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** 按编码取病组定义，找不到回落 UZ00 */
export function getGroupDef(groupCode: string): DRGGroupDef {
  return DRG_GROUP_CATALOG.find((g) => g.groupCode === groupCode) ?? DRG_GROUP_CATALOG[DRG_GROUP_CATALOG.length - 1];
}

/** 按主诊断前缀反查病组（ORP 不一致也会命中，用于内外组错配识别） */
function matchGroupByDx(primaryDx: string): DRGGroupDef | null {
  const dx = (primaryDx || '').toUpperCase();
  if (!dx) return null;
  for (const g of DRG_GROUP_CATALOG) {
    if (g.dxPrefixes.some((p) => dx.startsWith(p.toUpperCase()))) return g;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1) 分组正确性反查
// ---------------------------------------------------------------------------

export interface GroupingCheck {
  visitId: string;
  actualGroup: string;
  expectedGroup: string;
  correctness: GroupingCorrectness;
  reasons: string[];
}

/**
 * 单病例分组正确性校验：主诊断前缀定 MDC、ORP 定内外组，反推应入组。
 * 非法输入安全降级：主诊断缺失按 suspect 处理，绝不抛错。
 */
export function checkGrouping(caseInput: DRGCase): GroupingCheck {
  const reasons: string[] = [];
  const dxMatched = matchGroupByDx(caseInput.primaryDx);
  const expected = dxMatched?.groupCode ?? 'UZ00';

  let correctness: GroupingCorrectness = 'correct';

  if (!caseInput.primaryDx) {
    reasons.push('缺少主诊断 ICD 编码，无法复核入组');
    correctness = 'suspect';
  } else if (!dxMatched) {
    reasons.push(`主诊断 ${caseInput.primaryDx} 未匹配本地病组规则，落入"其他"组待医保办核定`);
    correctness = 'suspect';
  } else {
    // 内外组错配：诊断指向外科组但无手术室操作，或反之
    if (dxMatched.requiresOrp && !caseInput.hasOrp) {
      reasons.push(`主诊断指向外科组 ${dxMatched.groupCode}，但病例无手术室操作（ORP），需复核主诊断或补填手术`);
      correctness = 'wrong';
    }
    if (!dxMatched.requiresOrp && caseInput.hasOrp) {
      reasons.push(`主诊断指向内科组 ${dxMatched.groupCode}，但病例含手术室操作，可能应入外科组`);
      correctness = correctness === 'correct' ? 'suspect' : correctness;
    }
  }

  // 应入组未入组：诊断明确命中规则，实际却落"其他"
  if (dxMatched && caseInput.groupCode === 'UZ00' && dxMatched.groupCode !== 'UZ00') {
    reasons.push(`主诊断应入 ${dxMatched.groupCode}，实际落入 UZ00（未入组），疑似主诊断/手术操作漏填`);
    correctness = 'wrong';
  }

  // 实际入组与应入组不一致（且已确认方向）
  if (correctness !== 'wrong' && caseInput.groupCode !== expected) {
    reasons.push(`实际入组 ${caseInput.groupCode}，按主诊断反推应为 ${expected}`);
    correctness = 'suspect';
  }

  return {
    visitId: caseInput.visitId,
    actualGroup: caseInput.groupCode,
    expectedGroup: expected,
    correctness,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// 2) 单病例盈亏（标准付费 - 实际费用）
// ---------------------------------------------------------------------------

export interface ProfitLossResult {
  visitId: string;
  groupCode: string;
  standardPayment: number;
  actualCost: number;
  /** 结余为正、超支为负 */
  profitLoss: number;
  /** deviationRate =（实际-标准）/ 标准 */
  deviationRate: number;
  /** profit 结余 / loss 超支 */
  verdict: 'profit' | 'loss' | 'balanced';
}

/**
 * 单病例 DRG 盈亏：标准付费 = 权重 × 费率；结余留用、超支自担。
 * 费率缺省回落 DEFAULT_RATE；标准付费为 0 时偏差率按 0 计，避免除零。
 */
export function calculateDRGProfitLoss(
  visitId: string,
  drgGroup: DRGProfitInput,
): ProfitLossResult {
  const rate = drgGroup.rate > 0 ? drgGroup.rate : DEFAULT_RATE;
  const standardPayment = round2(drgGroup.weight * rate);
  const actualCost = round2(drgGroup.actualCost);
  const profitLoss = round2(standardPayment - actualCost);
  const deviationRate = standardPayment > 0 ? round3((actualCost - standardPayment) / standardPayment) : 0;
  const verdict: ProfitLossResult['verdict'] =
    profitLoss > 0 ? 'profit' : profitLoss < 0 ? 'loss' : 'balanced';
  return {
    visitId,
    groupCode: drgGroup.groupCode,
    standardPayment,
    actualCost,
    profitLoss,
    deviationRate,
    verdict,
  };
}

// ---------------------------------------------------------------------------
// 3) 离群病例识别
// ---------------------------------------------------------------------------

export interface InlierCheck {
  groupCode: string;
  cost: number;
  los: number;
  status: InlierStatus;
  /** 处置建议：离群病例走特例单议 / 病案质控 */
  action: string;
  reason: string;
}

/**
 * DRG 离群病例识别：正常范围内为 inlier；
 * 高费用（>组均2倍）→ 可特例单议；超长住院（>组均2倍）→ 同走单议；
 * 低费用短住院（<组均0.4倍）→ 疑似低标入院/分解住院，转病案质控。
 */
export function identifyDRGInlier(
  groupCode: string,
  cost: number,
  los: number,
): InlierCheck {
  const def = getGroupDef(groupCode);
  const c = cost || 0;
  const l = los || 0;

  if (c > def.avgCost * HIGH_COST_OUTLIER_MULTIPLIER) {
    return {
      groupCode, cost: c, los: l,
      status: 'high_cost_outlier',
      action: '特例单议申报',
      reason: `费用 ${round2(c)} 元超过 ${def.groupCode} 组均 ${def.avgCost} 元的 ${HIGH_COST_OUTLIER_MULTIPLIER} 倍，属极端值，可申请特例/特病单议单独结算`,
    };
  }
  if (l > def.avgLos * LONG_LOS_OUTLIER_MULTIPLIER) {
    return {
      groupCode, cost: c, los: l,
      status: 'long_los_outlier',
      action: '超长住院专项分析',
      reason: `住院 ${round2(l)} 天超过 ${def.groupCode} 组均 ${def.avgLos} 天的 ${LONG_LOS_OUTLIER_MULTIPLIER} 倍，需排查并发症/院内感染并评估单议`,
    };
  }
  if (c < def.avgCost * LOW_COST_OUTLIER_MULTIPLIER && l < def.avgLos * 0.6) {
    return {
      groupCode, cost: c, los: l,
      status: 'low_cost_outlier',
      action: '病案首页质控',
      reason: `费用 ${round2(c)} 元低于组均 ${LOW_COST_OUTLIER_MULTIPLIER} 倍且住院日偏短，疑似低标入院/分解住院，转病案室核查`,
    };
  }
  return {
    groupCode, cost: c, los: l,
    status: 'inlier',
    action: '',
    reason: '费用与住院日均在病组正常带内（inlier），按标准组结算',
  };
}

// ---------------------------------------------------------------------------
// 4) 病种结构（CMI / 时间消耗指数 / 费用消耗指数）
// ---------------------------------------------------------------------------

export interface DiseaseStructure {
  caseCount: number;
  /** 病例组合指数 */
  cmi: number;
  /** 时间消耗指数（<1 优） */
  timeEfficiencyIndex: number;
  /** 费用消耗指数（<1 优） */
  costEfficiencyIndex: number;
}

export function buildDiseaseStructure(cases: DRGCase[]): DiseaseStructure {
  const n = cases.length;
  if (n === 0) return { caseCount: 0, cmi: 0, timeEfficiencyIndex: 0, costEfficiencyIndex: 0 };

  let weightSum = 0;
  let actualLosSum = 0;
  let actualCostSum = 0;
  let benchLosSum = 0;
  let benchCostSum = 0;
  for (const cs of cases) {
    const def = getGroupDef(cs.groupCode);
    weightSum += def.weight;
    actualLosSum += cs.losDays || 0;
    actualCostSum += cs.actualCost || 0;
    benchLosSum += def.avgLos;
    benchCostSum += def.avgCost;
  }
  return {
    caseCount: n,
    cmi: round3(weightSum / n),
    timeEfficiencyIndex: round3(benchLosSum > 0 ? (actualLosSum / n) / (benchLosSum / n) : 0),
    costEfficiencyIndex: round3(benchCostSum > 0 ? (actualCostSum / n) / (benchCostSum / n) : 0),
  };
}

// ---------------------------------------------------------------------------
// 5) 深度分析总装
// ---------------------------------------------------------------------------

export interface DeepDRGAnalysisInput {
  dept: string;
  period: string;
  cases: DRGCase[];
  /** 可选费率覆盖（默认 DEFAULT_RATE） */
  rate?: number;
}

export interface DeepDRGAnalysis {
  dept: string;
  period: string;
  groupChecks: GroupingCheck[];
  groupingSummary: {
    total: number;
    correct: number;
    suspect: number;
    wrong: number;
    wrongRate: number;
  };
  profitLosses: ProfitLossResult[];
  deptProfitLoss: number;
  profitCaseCount: number;
  lossCaseCount: number;
  diseaseStructure: DiseaseStructure;
  outliers: InlierCheck[];
}

/**
 * 深度 DRG/DIP 付费分析总装：分组正确性 + 费用偏差 + 盈亏 + 病种结构 + 离群。
 * 纯函数，输入病例列表即得完整报告；非法输入安全降级为空报告。
 */
export function buildDeepDRGAnalysis(input: DeepDRGAnalysisInput): DeepDRGAnalysis {
  const rate = input.rate && input.rate > 0 ? input.rate : DEFAULT_RATE;
  const cases = Array.isArray(input.cases) ? input.cases : [];

  const groupChecks = cases.map((c) => checkGrouping(c));
  const profitLosses = cases.map((c) => {
    const def = getGroupDef(c.groupCode);
    return calculateDRGProfitLoss(c.visitId, {
      groupCode: c.groupCode,
      weight: def.weight,
      rate,
      actualCost: c.actualCost,
    });
  });
  const outliers = cases.map((c) => identifyDRGInlier(c.groupCode, c.actualCost, c.losDays));

  const correct = groupChecks.filter((g) => g.correctness === 'correct').length;
  const suspect = groupChecks.filter((g) => g.correctness === 'suspect').length;
  const wrong = groupChecks.filter((g) => g.correctness === 'wrong').length;
  const deptProfitLoss = round2(profitLosses.reduce((s, p) => s + p.profitLoss, 0));
  const profitCaseCount = profitLosses.filter((p) => p.verdict === 'profit').length;
  const lossCaseCount = profitLosses.filter((p) => p.verdict === 'loss').length;

  return {
    dept: input.dept,
    period: input.period,
    groupChecks,
    groupingSummary: {
      total: groupChecks.length,
      correct, suspect, wrong,
      wrongRate: round3(groupChecks.length > 0 ? wrong / groupChecks.length : 0),
    },
    profitLosses,
    deptProfitLoss,
    profitCaseCount,
    lossCaseCount,
    diseaseStructure: buildDiseaseStructure(cases),
    outliers: outliers.filter((o) => o.status !== 'inlier'),
  };
}

// ---------------------------------------------------------------------------
// 6) DRG 绩效优化建议
// ---------------------------------------------------------------------------

export interface DRGRecommendation {
  dimension: 'grouping' | 'cost' | 'los' | 'cmi' | 'outlier';
  severity: 'info' | 'warning' | 'critical';
  finding: string;
  action: string;
  expectedEffect: string;
}

/**
 * DRG 绩效优化建议：科室 + 周期 + 病例列表，输出可落地的改进清单。
 * 纯函数：只给建议，不自动改医嘱/结算。
 */
export function optimizeDRGPerformance(
  dept: string,
  period: string,
  cases: DRGCase[],
): { dept: string; period: string; recommendations: DRGRecommendation[] } {
  const report = buildDeepDRGAnalysis({ dept, period, cases });
  const recs: DRGRecommendation[] = [];
  const { diseaseStructure: ds, groupingSummary: gs } = report;

  if (gs.total === 0) {
    recs.push({
      dimension: 'grouping', severity: 'info',
      finding: `${period} 周期科室无 DRG 出院病例数据`,
      action: '按月落库出院病例分组结果后再分析',
      expectedEffect: '形成科室 DRG 运营基线',
    });
    return { dept, period, recommendations: recs };
  }

  // 分组正确性
  if (gs.wrongRate > GROUPING_ERROR_RATE_WARN) {
    recs.push({
      dimension: 'grouping',
      severity: gs.wrongRate > 0.1 ? 'critical' : 'warning',
      finding: `分组错误率 ${(gs.wrongRate * 100).toFixed(1)}%（${gs.wrong}/${gs.total} 例），超过 ${(GROUPING_ERROR_RATE_WARN * 100).toFixed(0)}% 预警线`,
      action: '病案首页主诊断选择与手术操作填报质控：主诊断选资源消耗最多的疾病，外科组必须填 ORP 手术',
      expectedEffect: '减少错入组导致的付费损失，错误率降至 5% 以内',
    });
  }

  // 费用消耗指数
  if (ds.costEfficiencyIndex > EFFICIENCY_WARN_THRESHOLD) {
    recs.push({
      dimension: 'cost', severity: 'warning',
      finding: `费用消耗指数 ${ds.costEfficiencyIndex}，高于标杆 ${EFFICIENCY_WARN_THRESHOLD}`,
      action: '重点管控耗占比/药占比：百元医疗收入耗材占比、抗菌药物使用强度、高值耗材术前论证',
      expectedEffect: '费用消耗指数降至 1.0 附近，单病组成本下降 10%-15%',
    });
  }

  // 时间消耗指数
  if (ds.timeEfficiencyIndex > EFFICIENCY_WARN_THRESHOLD) {
    recs.push({
      dimension: 'los', severity: 'warning',
      finding: `时间消耗指数 ${ds.timeEfficiencyIndex}，平均住院日高于标杆`,
      action: '压缩术前等待日与术后恢复日：检查预约集中化、术后早期下床、日间手术适配',
      expectedEffect: '平均住院日缩短 1-2 天，床位周转提升',
    });
  }

  // CMI
  if (ds.cmi > 0 && ds.cmi < 0.8) {
    recs.push({
      dimension: 'cmi', severity: 'info',
      finding: `CMI ${ds.cmi}，病例难度偏低（标杆约 1.0）`,
      action: '提升三四级手术与疑难重症占比，开展新技术新项目，引导慢病轻症下转基层',
      expectedEffect: 'CMI 提升至 1.0 以上，在医保结余留用中获得更高权重补偿',
    });
  }

  // 超支面
  const lossRatio = report.profitLosses.length > 0
    ? report.lossCaseCount / report.profitLosses.length : 0;
  if (lossRatio > LOSS_CASE_RATIO_WARN) {
    recs.push({
      dimension: 'cost', severity: lossRatio > 0.5 ? 'critical' : 'warning',
      finding: `超支病例占比 ${(lossRatio * 100).toFixed(1)}%，科室 DRG 净盈亏 ${report.deptProfitLoss} 元`,
      action: '对超支集中病组逐例点评：识别超支 TOP3 病组，制定临床路径与费用预警线',
      expectedEffect: '超支面收敛，季度净盈亏转正',
    });
  }

  // 离群
  if (report.outliers.length > 0) {
    recs.push({
      dimension: 'outlier', severity: 'warning',
      finding: `识别离群病例 ${report.outliers.length} 例（高费用/超长住院/低费用短住院）`,
      action: '高费用与超长住院病例整理病案首页+并发症证据，向医保经办申请特例单议；低费用病例转病案室排查低标入院',
      expectedEffect: '极端值不纳入常规超支考核，低标入院风险前置拦截',
    });
  }

  if (recs.length === 0) {
    recs.push({
      dimension: 'grouping', severity: 'info',
      finding: '分组正确率、费用/时间消耗指数、盈亏面均在合理区间',
      action: '维持现行临床路径与费用管控，按季复盘标杆变化',
      expectedEffect: '巩固 DRG 运营基线',
    });
  }

  return { dept, period, recommendations: recs };
}
