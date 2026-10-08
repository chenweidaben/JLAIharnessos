/**
 * 健澜科技 jlmedaios - 临床路径纯函数规则引擎（M15-A）
 *
 * 与后端 src/medical-tools/pathway/pathwayRules.ts 严格同口径：纯函数、确定性、无 I/O、可单测。
 * 口径可追溯国家《临床路径管理指导原则》：ICD 前缀匹配、入/出院标准逐项核对、排除项命中拦截、
 * 正/负变异分类、负性变异退出提示、质控指标分子分母。
 *
 * 医疗安全：本模块只产出"匹配/核对/分类建议"；入径、执行、退出、出径均须有资质医师电子签名，
 * 路径仅为诊疗规范辅助，不替代医师判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  PathwayDefinition,
  PathwayFormItem,
  PathwayMetrics,
  PathwayFraction,
  VariationCategory,
  VariationType,
} from '@/types/pathway';

/* ---------------------------------------------------------------------------
 * 字典
 * ------------------------------------------------------------------------ */

export const ITEM_TYPE_LABEL: Record<PathwayFormItem['itemType'], string> = {
  drug: '药物',
  lab: '检验',
  imaging: '检查',
  treatment: '治疗',
  nursing: '护理',
  diet: '饮食',
  other: '其他',
};

export const VARIATION_CATEGORY_LABEL: Record<VariationCategory, string> = {
  early_discharge: '提前达到出院标准',
  complication: '并发症',
  resistance: '耐药/疗效不佳',
  abnormal_exam: '检查异常',
  patient_reason: '患者原因',
  diagnosis_change: '诊断修正',
  other: '其他',
};

export const ENROLLMENT_STATUS_LABEL: Record<
  'in_path' | 'completed' | 'withdrawn',
  string
> = {
  in_path: '在径',
  completed: '完成出径',
  withdrawn: '变异退出',
};

export const EXECUTION_STATUS_LABEL: Record<string, string> = {
  pending: '待执行',
  executed: '已执行',
  skipped: '未执行',
  replaced: '替代',
};

/* ---------------------------------------------------------------------------
 * 当前阶段（§2）
 * ------------------------------------------------------------------------ */

/**
 * 当前住院第几天：max(1, floor((now-admit)/86400000)+1)。
 * 入院当天即为第 1 天； admitAt 非法时回退第 1 天（保守）。
 */
export function currentStageDay(admitAt: string | null | undefined, now: Date = new Date()): number {
  if (!admitAt) return 1;
  const t = new Date(admitAt).getTime();
  if (Number.isNaN(t)) return 1;
  const dayMs = now.getTime() - t;
  if (dayMs < 0) return 1;
  return Math.max(1, Math.floor(dayMs / 86_400_000) + 1);
}

/* ---------------------------------------------------------------------------
 * 路径匹配（§2）
 * ------------------------------------------------------------------------ */

function normIcd(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase();
}

export interface MatchResult {
  def: PathwayDefinition | null;
  matched: boolean;
}

/**
 * ICD 前缀匹配：患者诊断码可能比路径定义更细（J18.901 命中 J18.9），
 * 反之路径定义更细时患者码为其前缀亦命中。trim + 大小写不敏感。
 * 返回第一个命中的 active 路径。
 */
export function matchPathway(
  patientIcd: string | null | undefined,
  defs: PathwayDefinition[],
): MatchResult {
  const patient = normIcd(patientIcd);
  if (!patient) return { def: null, matched: false };
  for (const def of defs) {
    if (def.status !== 'active') continue;
    const defIcd = normIcd(def.icdCode);
    if (!defIcd) continue;
    if (patient.startsWith(defIcd) || defIcd.startsWith(patient)) {
      return { def, matched: true };
    }
  }
  return { def: null, matched: false };
}

/* ---------------------------------------------------------------------------
 * 入径 / 出院标准核对（§2）
 * ------------------------------------------------------------------------ */

export interface CriteriaResult {
  met: string[];
  unmet: string[];
  allMet: boolean;
}

/**
 * 逐项核对标准：confirmed 为医师已确认满足的条目；all 为全部标准。
 * met = 已确认；unmet = 全部 - 已确认。空 all 视为全部满足（allMet=true）。
 */
export function evaluateCriteria(confirmed: string[], all: string[]): CriteriaResult {
  const confirmedSet = new Set(confirmed.map((c) => c.trim()).filter(Boolean));
  const met = all.filter((c) => confirmedSet.has(c.trim()));
  const unmet = all.filter((c) => !confirmedSet.has(c.trim()));
  return { met, unmet, allMet: unmet.length === 0 };
}

/** 排除项命中判定：医师勾选的排除项与路径定义排除标准有任一交集即不可入径。 */
export function hasExclusion(
  confirmedExclusions: string[],
  defExclusions: string[],
): boolean {
  const set = new Set(confirmedExclusions.map((c) => c.trim()).filter(Boolean));
  return defExclusions.some((e) => set.has(e.trim()));
}

/* ---------------------------------------------------------------------------
 * 变异分类（§2）
 * ------------------------------------------------------------------------ */

/** 变异方向分类：仅 early_discharge（提前达到出院标准）为正性变异，其余负性。 */
export function classifyVariation(category: VariationCategory): VariationType {
  return category === 'early_discharge' ? 'positive' : 'negative';
}

/** 负性变异是否建议退出：并发症、诊断修正达到退出条件时提示退出路径。 */
export function negativeVariationSuggestsWithdraw(category: VariationCategory): boolean {
  return category === 'complication' || category === 'diagnosis_change';
}

/* ---------------------------------------------------------------------------
 * 表单项目 → 医嘱草稿（§2，纯映射，不写库）
 * ------------------------------------------------------------------------ */

export interface OrderDraft {
  orderType: string;
  content: string;
  detail: string;
}

/**
 * 由路径表单项目纯映射为医嘱草稿字段（orderType/content/detail）。
 * 仅产出待确认清单；真正建单与审核签名由执行人本人在真实医嘱上完成（AI 不自主开方）。
 */
export function buildOrderFromFormItem(item: PathwayFormItem): OrderDraft {
  const typeMap: Record<PathwayFormItem['itemType'], string> = {
    drug: 'medication',
    lab: 'lab',
    imaging: 'imaging',
    treatment: 'treatment',
    nursing: 'nursing',
    diet: 'diet',
    other: 'other',
  };
  return {
    orderType: typeMap[item.itemType] ?? 'other',
    content: item.content,
    detail: `临床路径 ${item.itemCode}（第${item.stageDay}天·${item.stageName}）${item.required ? '·必选' : '·可选'}`,
  };
}

/* ---------------------------------------------------------------------------
 * 质控指标（§6，含分子分母，除零 rate=null）
 * ------------------------------------------------------------------------ */

function fraction(numerator: number, denominator: number): PathwayFraction {
  if (!denominator || denominator <= 0) return { numerator, denominator, rate: null };
  const rate = Math.round((numerator / denominator) * 10000) / 100;
  return { numerator, denominator, rate };
}

export interface PathwayMetricCounts {
  /** 窗口内符合路径诊断的人数（入径率分母）。 */
  eligibleCount: number;
  /** 入径人数（enrolled）。 */
  enrolledCount: number;
  /** 完成出径人数。 */
  completedCount: number;
  /** 变异退出人数。 */
  withdrawnCount: number;
  /** 发生过至少一次变异的入径人数。 */
  withVariationCount: number;
  /** 完成出径患者住院日合计（用于平均住院日）。 */
  sumLos: number;
  /** 完成出径患者样本数（avgLos/avgFee 分母）。 */
  completedSampleCount: number;
  /** 完成出径患者住院费用合计。 */
  sumFee: number;
  /** 变异原因分布 category → count。 */
  variationCategoryCounts: Record<string, number>;
  from: string;
  to: string;
}

/** 临床路径质控指标纯计算（百分比口径，分子分母可核查；除零 rate=null）。 */
export function computePathwayMetrics(c: PathwayMetricCounts): PathwayMetrics {
  const avgLos =
    c.completedSampleCount > 0
      ? Math.round((c.sumLos / c.completedSampleCount) * 100) / 100
      : null;
  const avgFee =
    c.completedSampleCount > 0
      ? Math.round(c.sumFee / c.completedSampleCount)
      : null;
  return {
    period: { from: c.from, to: c.to },
    enrollmentRate: fraction(c.enrolledCount, c.eligibleCount),
    completionRate: fraction(c.completedCount, c.enrolledCount),
    variationRate: fraction(c.withVariationCount, c.enrolledCount),
    withdrawalRate: fraction(c.withdrawnCount, c.enrolledCount),
    avgLos,
    avgFee,
    variationCategoryDistribution: { ...c.variationCategoryCounts },
  };
}
