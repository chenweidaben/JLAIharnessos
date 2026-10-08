/**
 * 健澜科技 jlmedaios - 临床路径管理规则引擎（M15-A）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖（now 由调用方传入），供路径聚合器调用
 * 并可独立单测。覆盖：
 *  1. 当前住院阶段日（按入院日推算第几天）；
 *  2. 诊断 ICD 与路径病种的匹配（前缀匹配，兼容更细编码）；
 *  3. 入径/出院标准逐项核对；
 *  4. 排除项命中判定；
 *  5. 变异分类（正性/负性）与负性变异退出提示；
 *  6. 路径质控指标聚合（含分子分母，除零保护）；
 *  7. 路径表单项目 -> 待确认医嘱草稿映射（不写库、不开方）。
 *
 * 医学依据：国家《临床路径管理指导原则》、电子病历五级评审与三甲医院评审要求。
 * 阈值/口径严格对齐上述规范；路径仅为诊疗规范辅助，不替代医师判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type VariationType = 'positive' | 'negative';

export type VariationCategory =
  | 'early_discharge'
  | 'complication'
  | 'resistance'
  | 'abnormal_exam'
  | 'patient_reason'
  | 'diagnosis_change'
  | 'other';

export type FormItemType =
  | 'drug' | 'lab' | 'imaging' | 'treatment' | 'nursing' | 'diet' | 'other';

/** 路径定义（匹配用最小结构）。 */
export interface PathwayDefinitionLite {
  id: string;
  pathwayCode: string;
  name: string;
  icdCode: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// 1. 当前住院阶段日
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/**
 * 当前住院第几天：max(1, floor((now - admitAt)/86400000) + 1)。
 * 入院当天记为第 1 天；admitAt 非法/未来时兜底为第 1 天。
 */
export function currentStageDay(admitAt: string, now: Date): number {
  const t = Date.parse(admitAt);
  if (Number.isNaN(t)) return 1;
  const diffMs = now.getTime() - t;
  if (diffMs < 0) return 1;
  return Math.max(1, Math.floor(diffMs / MS_PER_DAY) + 1);
}

// ---------------------------------------------------------------------------
// 2. 诊断 ICD 与路径病种匹配
// ---------------------------------------------------------------------------

function normIcd(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

/**
 * 诊断 ICD 与路径 icd_code 前缀匹配（大小写不敏感）：
 * 患者编码可能更细（如 J18.901 命中 J18.9），或路径编码更细；
 * 双向前缀任一成立即视为匹配。任一方为空不匹配。
 */
export function icdMatches(patientCode: string, defIcdCode: string | null | undefined): boolean {
  const p = normIcd(patientCode);
  const d = normIcd(defIcdCode);
  if (!p || !d) return false;
  return p.startsWith(d) || d.startsWith(p);
}

/** 在路径定义集合中找到首个与患者诊断匹配的 active 路径。 */
export function matchPathway(
  icdCode: string,
  defs: PathwayDefinitionLite[],
): { def: PathwayDefinitionLite | null; matched: boolean } {
  for (const def of defs) {
    if (def.status !== 'active') continue;
    if (icdMatches(icdCode, def.icdCode)) return { def, matched: true };
  }
  return { def: null, matched: false };
}

// ---------------------------------------------------------------------------
// 3. 入径/出院标准逐项核对
// ---------------------------------------------------------------------------

/** 归一化用于精确比对（去空白）。 */
function normCriterion(s: string): string {
  return (s ?? '').trim();
}

/**
 * 逐项核对标准：confirmed 为医师确认已满足的标准字符串集合，all 为路径要求的全部标准。
 * met = confirmed 中确实属于 all 的项；unmet = all 中尚未被确认的项。
 */
export function evaluateCriteria(
  confirmed: string[],
  all: string[],
): { met: string[]; unmet: string[]; allMet: boolean } {
  const confirmedSet = new Set((confirmed ?? []).map(normCriterion).filter(Boolean));
  const allList = (all ?? []).map(normCriterion).filter(Boolean);
  const met = allList.filter((c) => confirmedSet.has(c));
  const unmet = allList.filter((c) => !confirmedSet.has(c));
  return { met, unmet, allMet: unmet.length === 0 };
}

// ---------------------------------------------------------------------------
// 4. 排除项命中判定
// ---------------------------------------------------------------------------

/** 命中任一排除项即 true（confirmedExclusions 为医师确认存在的排除情形）。 */
export function hasExclusion(
  confirmedExclusions: string[],
  defExclusions: string[],
): boolean {
  const exSet = new Set((defExclusions ?? []).map(normCriterion).filter(Boolean));
  return (confirmedExclusions ?? [])
    .map(normCriterion)
    .filter(Boolean)
    .some((c) => exSet.has(c));
}

// ---------------------------------------------------------------------------
// 5. 变异分类与退出提示
// ---------------------------------------------------------------------------

/** early_discharge（提前达标）为正性变异，其余均为负性变异。 */
export function classifyVariation(category: VariationCategory): VariationType {
  return category === 'early_discharge' ? 'positive' : 'negative';
}

/** 负性变异中，并发症/诊断修正提示应退出路径。 */
export function negativeVariationSuggestsWithdraw(category: VariationCategory): boolean {
  return category === 'complication' || category === 'diagnosis_change';
}

// ---------------------------------------------------------------------------
// 6. 质控指标（含分子分母，除零保护 rate=null）
// ---------------------------------------------------------------------------

export interface PathwayMetricInput {
  /** 符合路径诊断的人数（入径率分母） */
  eligibleCount: number;
  /** 入径人数 */
  enrolledCount: number;
  /** 完成出径人数 */
  completedCount: number;
  /** 退出人数 */
  withdrawnCount: number;
  /** 有变异的入径人数 */
  variedCount: number;
  /** 完成患者实际住院日列表 */
  losValues: number[];
  /** 完成患者实际费用列表 */
  feeValues: number[];
  /** 变异原因分布 category -> count */
  categoryCounts: Record<string, number>;
}

export interface PathwayFraction {
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface PathwayMetrics {
  enrollmentRate: PathwayFraction;
  completionRate: PathwayFraction;
  variationRate: PathwayFraction;
  withdrawalRate: PathwayFraction;
  avgLos: number | null;
  avgFee: number | null;
  variationCategoryDistribution: Record<string, number>;
}

function fraction(numerator: number, denominator: number): PathwayFraction {
  const n = Number(numerator) || 0;
  const d = Number(denominator) || 0;
  return {
    numerator: n,
    denominator: d,
    rate: d <= 0 ? null : Number(((n / d) * 100).toFixed(2)),
  };
}

function avg(values: number[]): number | null {
  const nums = (values ?? []).map(Number).filter((v) => Number.isFinite(v));
  if (nums.length === 0) return null;
  return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
}

/** 聚合路径质控指标（纯计算，含分子分母与除零保护）。 */
export function computePathwayMetrics(input: PathwayMetricInput): PathwayMetrics {
  return {
    enrollmentRate: fraction(input.enrolledCount, input.eligibleCount),
    completionRate: fraction(input.completedCount, input.enrolledCount),
    variationRate: fraction(input.variedCount, input.enrolledCount),
    withdrawalRate: fraction(input.withdrawnCount, input.enrolledCount),
    avgLos: avg(input.losValues),
    avgFee: avg(input.feeValues),
    variationCategoryDistribution: { ...(input.categoryCounts ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// 7. 路径表单项目 -> 待确认医嘱草稿映射（不写库、不开方）
// ---------------------------------------------------------------------------

export interface PathwayFormItemLite {
  id: string;
  stageDay: number;
  itemCode: string;
  itemType: FormItemType;
  content: string;
  required: boolean;
}

export interface PathwayOrderDraft {
  orderType: FormItemType;
  content: string;
  detail: Record<string, unknown>;
}

/**
 * 纯映射：路径表单项目 -> 待确认医嘱草稿。
 * 仅生成草稿字段，不写库、不签名；真实下达须执行人在聚合器内本人电子签名。
 */
export function buildOrderFromFormItem(item: PathwayFormItemLite): PathwayOrderDraft {
  return {
    orderType: item.itemType,
    content: item.content,
    detail: {
      source: 'clinical_pathway',
      formItemId: item.id,
      itemCode: item.itemCode,
      stageDay: item.stageDay,
      required: item.required,
    },
  };
}
