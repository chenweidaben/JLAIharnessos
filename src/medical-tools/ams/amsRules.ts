/**
 * 健澜科技 jlmedaios - 抗菌药物临床应用管理规则引擎（M14-A）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供 AMS 聚合器调用并可独立单测。
 * 覆盖：
 *  1. 医师职称 -> 抗菌药处方授权级别；
 *  2. 抗菌药分级（非限制/限制/特殊使用级）越权判定；
 *  3. 围术期预防用药点评（选药/时机/疗程）；
 *  4. 处方/医嘱专项点评（无指征/超量/超疗程/重复/禁忌/相互作用）；
 *  5. DDDs 与使用强度 AUD（DDDs/100 人天）计算；
 *  6. 抗菌药质控指标聚合（含分子分母）。
 *
 * 医学依据：国家《抗菌药物临床应用管理办法》《处方管理办法》、全国抗菌药物临床应用
 * 专项整治技术规范、WHO DDD 体系，及围术期预防应用抗菌药物指南。阈值/口径严格对齐
 * 上述规范；特殊人群应由临床药师/医师人工确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型与分级
// ---------------------------------------------------------------------------

export type AbxLevel = 'unrestricted' | 'restricted' | 'special';

/** 分级权重：数值越大授权越高（可开出更高级别药品）。 */
const LEVEL_RANK: Record<AbxLevel, number> = {
  unrestricted: 1,
  restricted: 2,
  special: 3,
};

export type PharmClass =
  | 'penicillins'
  | 'cephalosporin_1'
  | 'cephalosporin_2'
  | 'cephalosporin_3'
  | 'cephalosporin_4'
  | 'quinolones'
  | 'carbapenems'
  | 'macrolides'
  | 'glycopeptides'
  | 'nitroimidazole'
  | 'other';

// ---------------------------------------------------------------------------
// 1. 医师职称 -> 处方授权级别
// ---------------------------------------------------------------------------

/**
 * 职称默认可开级别：
 *  - 住院医师：非限制使用级；
 *  - 主治医师：限制使用级；
 *  - 副主任/主任医师：特殊使用级。
 * 实际开方以授权表（ams_prescriber_grants）为准，本函数仅作缺省/校验口径。
 */
export function titleToMaxLevel(title: string): AbxLevel {
  const t = (title ?? '').trim();
  if (t.includes('住院')) return 'unrestricted';
  if (t.includes('主治')) return 'restricted';
  // 副主任、主任医师均可开特殊使用级
  if (t.includes('主任')) return 'special';
  return 'unrestricted';
}

/**
 * 医师实际可开最高级别 = 授权表 max_level 与职称默认级别取较低者。
 * 无授权行时按职称兜底（职称即默认分级）；有授权时取更保守（rank 较小）的一级。
 */
export function prescriberMaxLevel(granted: AbxLevel | null, title: string): AbxLevel {
  const titleLevel = titleToMaxLevel(title);
  if (!granted) return titleLevel;
  const rank = Math.min(LEVEL_RANK[granted], LEVEL_RANK[titleLevel]);
  return rank <= 1 ? 'unrestricted' : rank === 2 ? 'restricted' : 'special';
}

/** 是否可开具某级别的抗菌药：药品级别不得高于医师可开最高级别。 */
export function canPrescribe(prescriberMax: AbxLevel, drugLevel: AbxLevel): boolean {
  return LEVEL_RANK[drugLevel] <= LEVEL_RANK[prescriberMax];
}

// ---------------------------------------------------------------------------
// 2. 围术期预防用药点评
// ---------------------------------------------------------------------------

export type IncisionClass = 'I' | 'II' | 'III';

export interface PerioperativeInput {
  incisionClass: IncisionClass;
  drugClass: PharmClass;
  /** 切皮前给药距切皮的分钟数；剖宫产（断脐后给药）按 isCesarean 判定 */
  timingMinutes?: number;
  /** 预防用药总持续时长（小时） */
  durationHours?: number;
  isCesarean?: boolean;
}

export interface ReviewVerdict {
  rational: boolean;
  issueTypes: string[];
  summary: string;
}

/** I 类（清洁）切口预防用药首选一/二代头孢。 */
const CLASS_1_2_CEPHALOSPORIN: PharmClass[] = ['cephalosporin_1', 'cephalosporin_2'];

export function evaluatePerioperative(input: PerioperativeInput): ReviewVerdict {
  const issues: string[] = [];
  const drug = input.drugClass;

  // 选药合理性：I 类切口首选一/二代头孢
  if (input.incisionClass === 'I' && !CLASS_1_2_CEPHALOSPORIN.includes(drug)) {
    issues.push('drug_not_recommended');
  }

  // 时机：切皮前 0.5-1h（30-60 分钟）；剖宫产须断脐后给药，不在术前窗内
  if (input.isCesarean) {
    // 剖宫产断脐后给药即视为时机正确；若仍给了术前窗内时机则提示
    if (input.timingMinutes !== undefined && input.timingMinutes >= 30 && input.timingMinutes <= 60) {
      issues.push('timing_incorrect');
    }
  } else if (input.timingMinutes !== undefined) {
    if (input.timingMinutes < 30 || input.timingMinutes > 60) {
      issues.push('timing_incorrect');
    }
  }

  // 疗程：通常 ≤24h，必要时 ≤48h；>48h 判不合理
  const dur = input.durationHours ?? null;
  if (dur !== null) {
    if (dur > 48) issues.push('duration_excessive');
    else if (dur > 24) issues.push('duration_over_24h');
  }

  const rational = issues.length === 0;
  return {
    rational,
    issueTypes: issues,
    summary: rational
      ? '围术期预防用药合理'
      : `围术期预防用药不合理：${issues.join('、')}`,
  };
}

// ---------------------------------------------------------------------------
// 3. 处方/医嘱专项点评
// ---------------------------------------------------------------------------

export interface AntibioticUseInput {
  /** 有无治疗/预防指征：none 无指征 / documented 有指征 */
  indication?: 'none' | 'documented';
  /** 单次剂量相对常规剂量的倍数（>2 判超量） */
  doseMultiplier?: number;
  /** 疗程（天） */
  durationDays?: number;
  duplicate?: boolean;
  contraindication?: boolean;
  interaction?: boolean;
}

export function evaluateAntibioticUse(input: AntibioticUseInput): ReviewVerdict {
  const issues: string[] = [];

  if (input.indication === 'none') issues.push('no_indication');
  if ((input.doseMultiplier ?? 1) > 2) issues.push('overdose');
  if ((input.durationDays ?? 0) > 14) issues.push('over_duration');
  if (input.duplicate === true) issues.push('duplicate');
  if (input.contraindication === true) issues.push('contraindication');
  if (input.interaction === true) issues.push('interaction');

  const rational = issues.length === 0;
  return {
    rational,
    issueTypes: issues,
    summary: rational
      ? '抗菌药物使用合理'
      : `抗菌药物使用不合理：${issues.join('、')}`,
  };
}

// ---------------------------------------------------------------------------
// 4. DDDs 与使用强度 AUD
// ---------------------------------------------------------------------------

/**
 * DDDs = 周期内总消耗量(g) / 该药品 DDD(g/日)。
 * ddd 非法（≤0）时返回 0。
 */
export function computeDdds(totalAmount: number, ddd: number): number {
  const amount = Number(totalAmount) || 0;
  const d = Number(ddd) || 0;
  if (d <= 0) return 0;
  return Number((amount / d).toFixed(2));
}

/**
 * 抗菌药物使用强度 AUD = DDDs / 同期收治患者人天数 × 100。
 * 人天数非法（≤0）时返回 0。
 */
export function computeAud(ddds: number, patientDays: number): number {
  const days = Number(patientDays) || 0;
  if (days <= 0) return 0;
  return Number((((Number(ddds) || 0) / days) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// 5. 质控指标（含分子分母）
// ---------------------------------------------------------------------------

export interface AmsMetricSource {
  /** 门诊处方是否使用抗菌药 */
  outpatientAbx?: boolean;
  /** 住院患者是否使用抗菌药 */
  inpatientAbx?: boolean;
  /** 使用是否为特殊使用级 */
  specialLevel?: boolean;
  /** 治疗性使用前是否送检微生物 */
  therapeuticWithCulture?: boolean;
  /** 是否为治疗性使用（否则预防） */
  therapeutic?: boolean;
  /** I 类切口是否使用预防用药 */
  incisionClass1Prophylaxis?: boolean;
  /** I 类切口预防用药时机是否合理 */
  timingCorrect?: boolean;
  /** I 类切口预防用药疗程是否合格（≤48h） */
  durationQualified?: boolean;
}

export interface AmsMetrics {
  outpatientRatio: number;
  inpatientUseRate: number;
  specialProportion: number;
  cultureRate: number;
  incisionClass1ProphylaxisRate: number;
  timingCorrectRate: number;
  durationQualifiedRate: number;
  fractions: {
    outpatientRatio: { numerator: number; denominator: number };
    inpatientUseRate: { numerator: number; denominator: number };
    specialProportion: { numerator: number; denominator: number };
    cultureRate: { numerator: number; denominator: number };
    incisionClass1ProphylaxisRate: { numerator: number; denominator: number };
    timingCorrectRate: { numerator: number; denominator: number };
    durationQualifiedRate: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/** 聚合 AMS 质控指标（每项含分子分母）。 */
export function computeAmsMetrics(rows: AmsMetricSource[]): AmsMetrics {
  const outpatientTotal = rows.filter((r) => r.outpatientAbx !== undefined).length;
  const outpatientAbx = rows.filter((r) => r.outpatientAbx === true).length;

  const inpatientTotal = rows.filter((r) => r.inpatientAbx !== undefined).length;
  const inpatientAbx = rows.filter((r) => r.inpatientAbx === true).length;

  const abxTotal = rows.filter((r) => r.specialLevel !== undefined).length;
  const special = rows.filter((r) => r.specialLevel === true).length;

  const therapeuticTotal = rows.filter((r) => r.therapeutic === true).length;
  const culture = rows.filter((r) => r.therapeuticWithCulture === true).length;

  const incision1Total = rows.filter((r) => r.incisionClass1Prophylaxis !== undefined).length;
  const incision1 = rows.filter((r) => r.incisionClass1Prophylaxis === true).length;
  const timingTotal = rows.filter((r) => r.timingCorrect !== undefined).length;
  const timing = rows.filter((r) => r.timingCorrect === true).length;
  const durationTotal = rows.filter((r) => r.durationQualified !== undefined).length;
  const duration = rows.filter((r) => r.durationQualified === true).length;

  return {
    outpatientRatio: pct(outpatientAbx, outpatientTotal),
    inpatientUseRate: pct(inpatientAbx, inpatientTotal),
    specialProportion: pct(special, abxTotal),
    cultureRate: pct(culture, therapeuticTotal),
    incisionClass1ProphylaxisRate: pct(incision1, incision1Total),
    timingCorrectRate: pct(timing, timingTotal),
    durationQualifiedRate: pct(duration, durationTotal),
    fractions: {
      outpatientRatio: { numerator: outpatientAbx, denominator: outpatientTotal },
      inpatientUseRate: { numerator: inpatientAbx, denominator: inpatientTotal },
      specialProportion: { numerator: special, denominator: abxTotal },
      cultureRate: { numerator: culture, denominator: therapeuticTotal },
      incisionClass1ProphylaxisRate: { numerator: incision1, denominator: incision1Total },
      timingCorrectRate: { numerator: timing, denominator: timingTotal },
      durationQualifiedRate: { numerator: duration, denominator: durationTotal },
    },
  };
}
