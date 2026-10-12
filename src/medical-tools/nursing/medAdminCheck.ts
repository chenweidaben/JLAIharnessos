/**
 * 健澜科技 jlmedaios - 医嘱给药三查七对引擎（M17-B，MAR）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供聚合器调用并可独立单测。
 * 与既有 orderAdministrationRepo（裸执行记录）分工：本模块负责"三查七对"闭环层——
 *   五对逐项核对、高危药判定与双人核对要求、CDS 拦截 override 理由校验、NQI_MED_ERROR 分子分母。
 *
 * 医疗安全红线：
 *  - 五对任一 fail 且无 override 理由 -> 聚合器拒绝(400)；
 *  - 高危药（毒麻精放/高警示）执行时必须双人核对（double_check_by 必填且 ≠ administered_by）；
 *  - 本人电子签名 signature 必填；本引擎不代护士签名、不自主开单。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type MedAdminStatus = 'planned' | 'arrived' | 'given' | 'held' | 'waste' | 'cancelled';
export type MedErrorType = 'none' | 'medication_error' | 'adr' | 'wrong_patient' | 'wrong_med';

/** 五对逐项核对结果。 */
export interface CheckItem {
  key: 'patient' | 'med' | 'dose' | 'time' | 'expire';
  label: string;
  ok: boolean;
  expected: string;
  actual: string;
}

export interface FiveChecksInput {
  /** 腕带扫描到的 patientId */
  wristbandPatientId: string;
  /** 就诊登记的 patientId */
  visitPatientId: string;
  /** 医嘱药名 */
  orderMedName: string;
  /** 实际给药药名（PDA 扫码/选择） */
  actualMedName: string;
  /** 医嘱剂量 */
  orderDose: string;
  /** 实际剂量 */
  actualDose: string;
  /** 当前时间是否在给药时间窗内 */
  withinTimeWindow: boolean;
  /** 药品是否在效期内 */
  notExpired: boolean;
}

// ---------------------------------------------------------------------------
// 1. 五对核对（患者/药名/剂量/时间/效期）
// ---------------------------------------------------------------------------

/** 归一化药名/剂量做宽松比对：去空白、去大小写差异。 */
function norm(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * 三查七对之五对：逐项返回 ok/expected/actual。
 * 患者核对 = 腕带 patientId 必须等于就诊 patientId；药名/剂量 = 与医嘱一致；
 * 时间 = 在给药窗内；效期 = 未过期。全部纯函数、不抛异常。
 */
export function runFiveChecks(input: FiveChecksInput): CheckItem[] {
  return [
    {
      key: 'patient',
      label: '患者核对',
      ok: norm(input.wristbandPatientId) === norm(input.visitPatientId),
      expected: input.visitPatientId,
      actual: input.wristbandPatientId,
    },
    {
      key: 'med',
      label: '药名核对',
      ok: norm(input.orderMedName) === norm(input.actualMedName),
      expected: input.orderMedName,
      actual: input.actualMedName,
    },
    {
      key: 'dose',
      label: '剂量核对',
      ok: norm(input.orderDose) === norm(input.actualDose),
      expected: input.orderDose,
      actual: input.actualDose,
    },
    {
      key: 'time',
      label: '给药时间窗',
      ok: input.withinTimeWindow === true,
      expected: '在给药时间窗内',
      actual: input.withinTimeWindow ? '在窗内' : '超出时间窗',
    },
    {
      key: 'expire',
      label: '药品效期',
      ok: input.notExpired === true,
      expected: '药品在效期内',
      actual: input.notExpired ? '在效期内' : '已过期',
    },
  ];
}

/** 五对是否全部通过。 */
export function allChecksPass(items: CheckItem[]): boolean {
  return items.every((i) => i.ok);
}

// ---------------------------------------------------------------------------
// 2. 高危药目录（毒麻精放 / 高警示药品，内置小字典，稳定可单测）
// ---------------------------------------------------------------------------

const HIGH_RISK_KEYWORDS = [
  '吗啡', 'morphine', '哌替啶', '芬太尼', 'fentanyl', '舒芬太尼',
  '阿托品', 'atropine', '氯化钾', 'potassium chloride', '高浓度氯化钾',
  '胰岛素', 'insulin', '肝素', 'heparin', '华法林', 'warfarin',
  '肾上腺素', 'adrenaline', 'epinephrine', '地高辛', 'digoxin',
  '咪达唑仑', 'midazolam', '丙泊酚', 'propofol', '利多卡因', 'lidocaine',
  '肌松', 'succinylcholine',
];

/** 判定是否高危药（毒麻精放/高警示）。子串匹配药名，大小写不敏感。 */
export function isHighRiskMed(medName: string): boolean {
  const n = norm(medName);
  if (!n) return false;
  return HIGH_RISK_KEYWORDS.some((k) => n.includes(norm(k)));
}

/** 高危药是否须双人核对：是（高危一律双人核对）。 */
export function requiresDoubleCheck(highRisk: boolean): boolean {
  return highRisk === true;
}

// ---------------------------------------------------------------------------
// 3. CDS 拦截 override 理由校验
// ---------------------------------------------------------------------------

/** CDS 拦截时 override 理由是否必填且非空。 */
export function requiresOverrideReason(cdsBlocked: boolean): boolean {
  return cdsBlocked === true;
}

/** 校验 override：被拦但理由空 -> 不通过。返回是否放行。 */
export function canOverride(cdsBlocked: boolean, overrideReason: string | null | undefined): boolean {
  if (!cdsBlocked) return true; // 未被拦不需要理由
  return (overrideReason ?? '').trim().length > 0;
}

// ---------------------------------------------------------------------------
// 4. NQI_MED_ERROR 分子分母
// ---------------------------------------------------------------------------

/** 差错类 error_type（计入给药差错率分子）。 */
const ERROR_TYPES: ReadonlySet<MedErrorType> = new Set<MedErrorType>([
  'medication_error', 'adr', 'wrong_patient', 'wrong_med',
]);

export interface MedAdminMetricRow {
  status: string;
  errorType: MedErrorType | null;
}

export interface MedErrorMetrics {
  /** 给药差错率 = 差错例数 / 给药总例次(given) */
  medErrorRate: number;
  fractions: {
    medErrorRate: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * NQI_MED_ERROR：分母 = status='given' 给药总例次；
 * 分子 = given 且 error_type 为差错类(medication_error/adr/wrong_patient/wrong_med) 的例数。
 */
export function computeMedErrorMetrics(rows: MedAdminMetricRow[]): MedErrorMetrics {
  const given = (rows ?? []).filter((r) => r.status === 'given');
  const numerator = given.filter((r) => r.errorType != null && ERROR_TYPES.has(r.errorType)).length;
  const denominator = given.length;
  return {
    medErrorRate: pct(numerator, denominator),
    fractions: { medErrorRate: { numerator, denominator } },
  };
}
