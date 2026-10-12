/**
 * 健澜科技 jlmedaios - 管路护理 + 非计划拔管引擎（M17-C）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供聚合器调用并可独立单测。
 * 负责：管路类型目录、高危管路标记(cvc/arterial_line)、拔管分类校验、
 * 以及 NQI_UNPLANNED_EXTUBATION 的分子/分母聚合。
 *
 * 医疗安全：本引擎只做"分类 + 统计"，不开医嘱、不代护士签名；
 * unplanned 拔管的备注留痕与 CAS 状态机在 repo/aggregator 层。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type TubeType =
  | 'cvc' | 'arterial_line' | 'urinary_catheter' | 'ng_tube' | 'feeding_tube'
  | 'chest_drain' | 'abdominal_drain' | 'other';
export type TubeStatus = 'in_place' | 'removed';
export type RemovalType = 'planned' | 'unplanned';
export type SiteIntegrity = 'good' | 'redness' | 'leak' | 'dislodged';

/** 高危管路（需重点看护部位完整性）。 */
const HIGH_RISK_TUBES: ReadonlySet<TubeType> = new Set<TubeType>(['cvc', 'arterial_line']);

/** 是否高危管路。 */
export function isHighRiskTube(tubeType: TubeType): boolean {
  return HIGH_RISK_TUBES.has(tubeType);
}

/** 拔管分类是否合法。 */
export function isValidRemovalType(t: string): t is RemovalType {
  return t === 'planned' || t === 'unplanned';
}

/** unplanned 拔管是否必须填 removal_note。 */
export function requiresRemovalNote(removalType: RemovalType): boolean {
  return removalType === 'unplanned';
}

// ---------------------------------------------------------------------------
// NQI_UNPLANNED_EXTUBATION 分子/分母
// ---------------------------------------------------------------------------

export interface TubeMetricRow {
  patientId: string;
  /** 该管路当前/周期内是否在管（in_place）或周期内置入过 */
  inPlace: boolean;
  /** 该管路是否非计划拔管 */
  unplanned: boolean;
}

export interface UnplannedExtubationMetrics {
  /** 非计划拔管率 = 非计划拔管例数 / 留置管路患者数 */
  rate: number;
  fractions: {
    rate: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * NQI_UNPLANNED_EXTUBATION：
 * 分母 = 周期内有 ≥1 根 in_place/置入管路的不同患者数；
 * 分子 = 周期内 removal_type='unplanned' 的管路例数。
 */
export function computeUnplannedExtubationMetrics(rows: TubeMetricRow[]): UnplannedExtubationMetrics {
  const denominatorPatients = new Set(
    (rows ?? []).filter((r) => r.inPlace).map((r) => r.patientId),
  );
  const numerator = (rows ?? []).filter((r) => r.unplanned).length;
  const denominator = denominatorPatients.size;
  return {
    rate: pct(numerator, denominator),
    fractions: { rate: { numerator, denominator } },
  };
}
