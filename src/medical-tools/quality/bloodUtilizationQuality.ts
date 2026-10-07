/**
 * 健澜科技 jlmedaios - 临床用血质量规则引擎（M10-B）
 *
 * 纯函数、确定性、无 I/O、无随机，供用血质量聚合器调用。覆盖：
 *  1. 各成分输血疗效的预期增量与分级；
 *  2. 输血指征的严格判定（区别于 M10-A 建议性 evaluateIndication）；
 *  3. 输血剂量合理性；
 *  4. 输血前必查项目完整性；
 *  5. 用血合理性综合结论；
 *  6. 等级评审质控指标聚合。
 *
 * 医学依据：《临床输血技术规范》《医疗机构临床用血管理办法》、三甲等级评审条款。
 * 阈值为成人通用参考值，特殊人群（儿童/孕妇/低体重）应由评估医师人工确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type BloodComponent = 'red_cell' | 'plasma' | 'platelet' | 'cryo' | 'whole';
export type EfficacyGrade = 'effective' | 'partial' | 'ineffective' | 'indeterminate';
export type UtilizationConclusion = 'rational' | 'largely' | 'irrational';

export const COMPONENT_LABEL: Record<BloodComponent, string> = {
  red_cell: '红细胞',
  plasma: '血浆',
  platelet: '血小板',
  cryo: '冷沉淀',
  whole: '全血',
};

// ---------------------------------------------------------------------------
// 1. 疗效预期
// ---------------------------------------------------------------------------

export interface EfficacyExpectation {
  /** 指标变化方向：up 指标应升高（Hb/PLT/Fib），down 指标应降低（INR） */
  direction: 'up' | 'down';
  /** 每单位预期增量（down 方向为 0，改用目标值判定） */
  perUnitDelta: number;
  /** 总预期增量 */
  expectedDelta: number;
  /** 目标值（down 方向用，如血浆输注后 INR 目标） */
  target: number | null;
  metricUnit: string;
  note: string;
}

/**
 * 各成分每单位疗效预期（成人，取保守值）：
 *  - 红细胞：1U 预期 Hb 升高约 10 g/L；
 *  - 单采血小板：1 治疗量预期 PLT 升高约 20 ×10^9/L（规范 20-30，取保守下限）；
 *  - 冷沉淀：1U 预期纤维蛋白原升高约 0.3 g/L（规范 0.3-0.5，取保守下限）；
 *  - 血浆：以 INR 降到 1.5 以下为目标，不做线性增量；
 *  - 全血：参照红细胞每单位 Hb +10。
 */
export function expectedEfficacy(component: BloodComponent, units: number): EfficacyExpectation {
  const u = Number(units);
  switch (component) {
    case 'red_cell':
      return {
        direction: 'up', perUnitDelta: 10, expectedDelta: 10 * u, target: null,
        metricUnit: 'g/L', note: `红细胞 ${u}U 预期 Hb 升高约 ${10 * u} g/L`,
      };
    case 'platelet':
      return {
        direction: 'up', perUnitDelta: 20, expectedDelta: 20 * u, target: null,
        metricUnit: '×10^9/L', note: `血小板 ${u} 治疗量预期 PLT 升高约 ${20 * u} ×10^9/L`,
      };
    case 'cryo':
      return {
        direction: 'up', perUnitDelta: 0.3, expectedDelta: 0.3 * u, target: null,
        metricUnit: 'g/L', note: `冷沉淀 ${u}U 预期纤维蛋白原升高约 ${(0.3 * u).toFixed(1)} g/L`,
      };
    case 'plasma':
      return {
        direction: 'down', perUnitDelta: 0, expectedDelta: 0, target: 1.5,
        metricUnit: 'INR', note: '血浆输注目标为 INR 降至 1.5 以下',
      };
    case 'whole':
      return {
        direction: 'up', perUnitDelta: 10, expectedDelta: 10 * u, target: null,
        metricUnit: 'g/L', note: `全血 ${u}U 参照红细胞预期 Hb 升高约 ${10 * u} g/L`,
      };
  }
}

// ---------------------------------------------------------------------------
// 2. 疗效分级
// ---------------------------------------------------------------------------

export interface EfficacyResult {
  grade: EfficacyGrade;
  pre: number | null;
  post: number | null;
  expectedDelta: number;
  actualDelta: number | null;
  reasons: string[];
}

/**
 * 对照输注前后指标判定疗效。
 *  - 显效 effective：升高型实际增量达到预期 80%；降低型达到目标值；
 *  - 有效 partial：方向正确但未达预期 80%；
 *  - 无效 ineffective：方向错误或无变化；
 *  - 无法判定 indeterminate：输注前或后指标缺失。
 */
export function gradeEfficacy(
  component: BloodComponent,
  units: number,
  pre: number | null,
  post: number | null,
): EfficacyResult {
  const exp = expectedEfficacy(component, units);
  const reasons: string[] = [];
  if (pre === null || pre === undefined || post === null || post === undefined) {
    return {
      grade: 'indeterminate', pre: pre ?? null, post: post ?? null,
      expectedDelta: exp.expectedDelta, actualDelta: null,
      reasons: ['缺少输注前或输注后指标，无法判定疗效'],
    };
  }

  if (exp.direction === 'down') {
    // 血浆：INR 下降
    const actual = pre - post; // 正值表示下降
    if (post <= (exp.target ?? 1.5)) {
      reasons.push(`输注后 INR ${post} 已降至目标 ${exp.target} 以下，显效`);
      return { grade: 'effective', pre, post, expectedDelta: 0, actualDelta: actual, reasons };
    }
    if (actual > 0) {
      reasons.push(`INR 由 ${pre} 降至 ${post}，有改善但未达目标 ${exp.target}`);
      return { grade: 'partial', pre, post, expectedDelta: 0, actualDelta: actual, reasons };
    }
    reasons.push(`INR 未下降（${pre} → ${post}），疗效不佳`);
    return { grade: 'ineffective', pre, post, expectedDelta: 0, actualDelta: actual, reasons };
  }

  // 升高型：Hb / PLT / Fib
  const actual = post - pre;
  if (actual >= exp.expectedDelta * 0.8) {
    reasons.push(`实际升高 ${actual.toFixed(1)} ${exp.metricUnit}，达到预期 ${exp.expectedDelta.toFixed(1)} 的 80% 以上，显效`);
    return { grade: 'effective', pre, post, expectedDelta: exp.expectedDelta, actualDelta: actual, reasons };
  }
  if (actual > 0) {
    reasons.push(`实际升高 ${actual.toFixed(1)} ${exp.metricUnit}，未达预期 ${exp.expectedDelta.toFixed(1)} 的 80%，部分有效`);
    return { grade: 'partial', pre, post, expectedDelta: exp.expectedDelta, actualDelta: actual, reasons };
  }
  reasons.push(`指标未升高（${pre} → ${post}），判定无效，需排查继续失血/溶血/免疫因素`);
  return { grade: 'ineffective', pre, post, expectedDelta: exp.expectedDelta, actualDelta: actual, reasons };
}

// ---------------------------------------------------------------------------
// 3. 输血指征严格判定
// ---------------------------------------------------------------------------

export interface IndicationVerdict {
  compliant: boolean;
  matchedRules: string[];
  guidance: string;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * 严格判定申请指标是否真正命中输血阈值。
 * 阈值与 M10-A CDS 一致，但此处不通过即判不合规（用于事后合理性评价）。
 */
export function strictIndication(
  component: BloodComponent,
  meta: Record<string, unknown>,
): IndicationVerdict {
  const hb = num(meta.hb ?? meta.Hb ?? meta.HGB);
  const inr = num(meta.inr ?? meta.INR);
  const plt = num(meta.plt ?? meta.PLT);
  const fib = num(meta.fibrinogen ?? meta.Fib ?? meta.FIB);
  const activeBleeding = meta.activeBleeding === true || meta.activeBleeding === 'true';
  const bloodLoss = num(meta.bloodLoss);
  const shock = meta.shock === true || meta.shock === 'true';
  const matched: string[] = [];

  switch (component) {
    case 'red_cell':
      if (!Number.isNaN(hb) && hb < 70) matched.push(`Hb ${hb} < 70 g/L`);
      else if (!Number.isNaN(hb) && hb <= 80 && activeBleeding) matched.push(`Hb ${hb} 伴活动性出血`);
      return {
        compliant: matched.length > 0,
        matchedRules: matched,
        guidance: '红细胞指征：Hb<70，或 Hb 70-80 伴活动性出血/心脑血管疾病',
      };
    case 'plasma':
      if (!Number.isNaN(inr) && inr > 1.7) matched.push(`INR ${inr} > 1.7`);
      else if (activeBleeding && (!Number.isNaN(inr) && inr > 1.5)) matched.push('活动性出血伴凝血异常');
      return {
        compliant: matched.length > 0,
        matchedRules: matched,
        guidance: '血浆指征：INR>1.7，或活动性出血伴凝血异常',
      };
    case 'platelet':
      if (!Number.isNaN(plt) && plt < 50) matched.push(`PLT ${plt} < 50 ×10^9/L`);
      else if (!Number.isNaN(plt) && plt < 100 && activeBleeding) matched.push(`PLT ${plt} 伴活动性出血`);
      return {
        compliant: matched.length > 0,
        matchedRules: matched,
        guidance: '血小板指征：PLT<50，或 PLT<100 伴活动性出血',
      };
    case 'cryo':
      if (!Number.isNaN(fib) && fib < 1.0) matched.push(`纤维蛋白原 ${fib} < 1.0 g/L`);
      return {
        compliant: matched.length > 0,
        matchedRules: matched,
        guidance: '冷沉淀指征：纤维蛋白原<1.0 g/L',
      };
    case 'whole':
      if (!Number.isNaN(bloodLoss) && bloodLoss > 1500) matched.push(`失血量 ${bloodLoss} > 1500 ml`);
      else if (shock) matched.push('失血性休克');
      return {
        compliant: matched.length > 0,
        matchedRules: matched,
        guidance: '全血指征：大量失血（>1500 ml）或失血性休克',
      };
  }
}

// ---------------------------------------------------------------------------
// 4. 剂量合理性
// ---------------------------------------------------------------------------

export interface DosageVerdict {
  reasonable: boolean;
  note: string;
}

/**
 * 剂量合理性：常规剂量区间内合理；超大剂量需有紧急/大量输血依据。
 *  - 红细胞/全血：单次 1-4U 常规，>4U 需大量输血说明，emergency 豁免；
 *  - 血小板：1-2 治疗量常规，>2 需说明；
 *  - 血浆/冷沉淀：1-10 单位常规，>10 需说明。
 */
export function dosageReasonable(
  component: BloodComponent,
  units: number,
  urgency: string,
): DosageVerdict {
  const u = Number(units);
  if (!Number.isFinite(u) || u <= 0) return { reasonable: false, note: '剂量须为正数' };
  const emergency = urgency === 'emergency';
  const limit = component === 'red_cell' || component === 'whole'
    ? 4
    : component === 'platelet' ? 2 : 10;
  if (u <= limit) return { reasonable: true, note: `${u} 单位在常规剂量区间` };
  if (emergency) return { reasonable: true, note: `${u} 单位超常规，但紧急输血，按大量输血方案处理` };
  return { reasonable: false, note: `${u} 单位超常规剂量（上限 ${limit}），需大量输血审批说明` };
}

// ---------------------------------------------------------------------------
// 5. 输血前检测完整性
// ---------------------------------------------------------------------------

export interface PreTestRequirement {
  key: string;
  label: string;
  /** 命中任一 itemCode/itemName 关键词即视为已查 */
  any: string[];
}

/** 输血前必查项：ABO+RhD 血型、乙肝、丙肝、HIV、梅毒、凝血功能、血常规 Hb。 */
export const PRE_TEST_REQUIREMENTS: PreTestRequirement[] = [
  { key: 'blood_type', label: 'ABO及RhD血型', any: ['ABO', '血型', 'RhD', 'RH血型', 'BLOOD_TYPE'] },
  { key: 'hbv', label: '乙肝表面抗原', any: ['HBsAg', '乙肝', 'HBV', '乙型肝炎'] },
  { key: 'hcv', label: '丙肝抗体', any: ['HCV', '丙肝', '抗-HCV', '丙型肝炎'] },
  { key: 'hiv', label: 'HIV抗体', any: ['HIV', '艾滋病', '抗HIV', '人类免疫缺陷'] },
  { key: 'syphilis', label: '梅毒', any: ['梅毒', 'TP', 'TPPA', 'TRUST', 'RPR', 'Syphilis'] },
  { key: 'coagulation', label: '凝血功能', any: ['PT', 'INR', 'APTT', '凝血', 'TT'] },
  { key: 'hb', label: '血常规(血红蛋白)', any: ['HGB', '血红蛋白', '血常规', 'CBC'] },
];

export interface PreTestVerdict {
  complete: boolean;
  missing: string[];
}

/**
 * 判定输血前检测是否完整。available 为已完成检测的 itemCode/itemName 文本集合（大写归一）。
 */
export function preTestComplete(available: string[]): PreTestVerdict {
  const set = new Set(available.map((s) => String(s).toUpperCase()));
  const missing: string[] = [];
  for (const req of PRE_TEST_REQUIREMENTS) {
    const hit = req.any.some((k) => {
      const ku = k.toUpperCase();
      for (const have of set) {
        if (have.includes(ku)) return true;
      }
      return false;
    });
    if (!hit) missing.push(req.label);
  }
  return { complete: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// 6. 用血合理性综合结论
// ---------------------------------------------------------------------------

export interface UtilizationVerdict {
  conclusion: UtilizationConclusion;
  issues: string[];
}

/**
 * 综合三项判定给出结论：
 *  - 合理 rational：指征合规、剂量合理、输血前检测完整；
 *  - 不合理 irrational：指征不合规（无指征输血，一票否决）；
 *  - 基本合理 largely：指征合规但剂量或检测有可整改瑕疵。
 */
export function concludeUtilization(input: {
  indicationCompliant: boolean;
  dosageReasonable: boolean;
  preTestComplete: boolean;
  preTestMissing: string[];
  dosageNote?: string;
}): UtilizationVerdict {
  const issues: string[] = [];
  if (!input.indicationCompliant) {
    issues.push('输血指征未命中规范阈值，判定为无指征/超指征输血');
    return { conclusion: 'irrational', issues };
  }
  if (!input.dosageReasonable) issues.push(input.dosageNote ?? '剂量超常规且无审批说明');
  if (!input.preTestComplete) issues.push(`输血前检测缺项：${input.preTestMissing.join('、')}`);
  if (issues.length === 0) return { conclusion: 'rational', issues };
  return { conclusion: 'largely', issues };
}

// ---------------------------------------------------------------------------
// 7. 等级评审质控指标
// ---------------------------------------------------------------------------

export interface BloodQualityMetrics {
  /** 成分输血率，目标 ≥95% */
  componentTransfusionRate: number;
  /** 输血指征合格率，目标 ≥90% */
  indicationPassRate: number;
  /** 输血前检测率，目标 100% */
  preTestRate: number;
  /** 输血不良反应率，持续监测 */
  reactionRate: number;
  /** 完成输注的疗效评估率，目标持续提升 */
  efficacyAssessmentRate: number;
  /** 住院患者输血率 */
  inpatientTransfusionRate: number;
  /** 各指标的分子/分母，便于核查 */
  fractions: Record<string, { numerator: number; denominator: number }>;
}

export interface MetricSourceRow {
  patientId: string;
  isComponent: boolean;
  reviewed: boolean;
  conclusion: UtilizationConclusion | null;
  preTestComplete: boolean;
  hasReaction: boolean;
  efficacyAssessed: boolean;
  completed: boolean;
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * 聚合等级评审用血质控指标。rows 为统计周期内的用血/输注明细（由聚合器准备）。
 */
export function computeQualityMetrics(
  rows: MetricSourceRow[],
  inpatientDischarges: number,
): BloodQualityMetrics {
  const total = rows.length;
  const component = rows.filter((r) => r.isComponent).length;
  const reviewedRows = rows.filter((r) => r.reviewed);
  const indicationPass = reviewedRows.filter(
    (r) => r.conclusion === 'rational' || r.conclusion === 'largely',
  ).length;
  const preTest = rows.filter((r) => r.preTestComplete).length;
  const reaction = rows.filter((r) => r.hasReaction).length;
  const completedRows = rows.filter((r) => r.completed);
  const assessed = completedRows.filter((r) => r.efficacyAssessed).length;
  const transfusedPatients = new Set(rows.map((r) => r.patientId)).size;

  return {
    componentTransfusionRate: pct(component, total),
    indicationPassRate: pct(indicationPass, reviewedRows.length),
    preTestRate: pct(preTest, total),
    reactionRate: pct(reaction, total),
    efficacyAssessmentRate: pct(assessed, completedRows.length),
    inpatientTransfusionRate: pct(transfusedPatients, inpatientDischarges),
    fractions: {
      componentTransfusionRate: { numerator: component, denominator: total },
      indicationPassRate: { numerator: indicationPass, denominator: reviewedRows.length },
      preTestRate: { numerator: preTest, denominator: total },
      reactionRate: { numerator: reaction, denominator: total },
      efficacyAssessmentRate: { numerator: assessed, denominator: completedRows.length },
      inpatientTransfusionRate: { numerator: transfusedPatients, denominator: inpatientDischarges },
    },
  };
}
