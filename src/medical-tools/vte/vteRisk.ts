/**
 * 健澜科技 jlmedaios - VTE 风险防治规则引擎（M13-A）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供 VTE 聚合器调用并可独立单测。
 * 覆盖：
 *  1. 外科/手术患者 Caprini 评分与分层；
 *  2. 内科患者 Padua 评分与分层；
 *  3. VTE 预防相关出血风险评估；
 *  4. 确定性预防建议（仅建议，须医师确认，AI 不自主开抗凝药）；
 *  5. 风险分层与预防措施不匹配提醒；
 *  6. VTE 防治质控指标聚合（含分子分母）。
 *
 * 医学依据：全国《肺栓塞和深静脉血栓形成防治能力建设项目（VTE 防治中心）建设标准》、
 * Caprini 风险评估模型、Padua 预测评分、《中国血栓性疾病防治指南》及抗凝相关指南。
 * 分值与阈值严格对齐指南；特殊人群（儿童/孕妇/低体重/肾功能不全）应由评估医师人工确认。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type VteScale = 'caprini' | 'padua';
export type VteLevel = 'low' | 'medium' | 'high' | 'very_high';
export type BleedingLevel = 'low' | 'high';

export interface FactorItem {
  key: string;
  label: string;
  points: number;
}

// ---------------------------------------------------------------------------
// 1. Caprini（外科 / 手术患者）
// ---------------------------------------------------------------------------

export interface CapriniFactor {
  key: string;
  label: string;
  points: number;
}

/**
 * Caprini 危险因素字典（成人外科常用项，分值严格对齐 Caprini 模型）。
 * 年龄为互斥分层：评估人按患者实际年龄勾选其一，不应同时勾多个年龄档。
 */
export const CAPRINI_FACTORS: Record<string, CapriniFactor> = {
  age_41_60: { key: 'age_41_60', label: '年龄 41-60 岁', points: 1 },
  age_61_74: { key: 'age_61_74', label: '年龄 61-74 岁', points: 2 },
  age_ge75: { key: 'age_ge75', label: '年龄 ≥75 岁', points: 3 },
  minor_surgery: { key: 'minor_surgery', label: '小手术', points: 1 },
  major_surgery_gt45min: { key: 'major_surgery_gt45min', label: '大手术时长 >45 分钟', points: 2 },
  major_surgery_bedridden: { key: 'major_surgery_bedridden', label: '大手术并卧床', points: 2 },
  bedridden_gt72h: { key: 'bedridden_gt72h', label: '卧床 >72 小时', points: 2 },
  prior_vte: { key: 'prior_vte', label: '既往 VTE 病史', points: 3 },
  active_cancer: { key: 'active_cancer', label: '活动性肿瘤', points: 2 },
  preg_postpartum: { key: 'preg_postpartum', label: '妊娠/产后', points: 1 },
  oc_hormone: { key: 'oc_hormone', label: '避孕药/激素替代治疗(HRT)', points: 1 },
  family_thrombosis: { key: 'family_thrombosis', label: '血栓形成家族史', points: 3 },
  central_venous_catheter: { key: 'central_venous_catheter', label: '中心静脉置管', points: 2 },
  bmi_gt25: { key: 'bmi_gt25', label: 'BMI >25（超重）', points: 1 },
  leg_edema: { key: 'leg_edema', label: '下肢水肿', points: 1 },
  varicose_veins: { key: 'varicose_veins', label: '下肢静脉曲张', points: 1 },
  sepsis: { key: 'sepsis', label: '脓毒症', points: 1 },
  mi: { key: 'mi', label: '急性心肌梗死', points: 1 },
  copd: { key: 'copd', label: '慢性肺病', points: 1 },
  abnormal_pulmonary: { key: 'abnormal_pulmonary', label: '不明原因肺功能异常', points: 1 },
  recurrent_miscarriage: { key: 'recurrent_miscarriage', label: '复发性/不明原因流产史', points: 1 },
  rheumatoid: { key: 'rheumatoid', label: '类风湿性关节炎', points: 1 },
  lupus_antiphospholipid: { key: 'lupus_antiphospholipid', label: '狼疮/抗磷脂抗体阳性', points: 3 },
  thrombophilia: { key: 'thrombophilia', label: '其他先天/获得性血栓倾向', points: 3 },
};

export interface ScoreResult {
  score: number;
  factors: FactorItem[];
  /** 输入中未在字典里的 key（防御性，不报错，便于前端纠错） */
  unknownKeys: string[];
}

/** 对选中的 Caprini 危险因素求总分并展开明细。 */
export function scoreCaprini(keys: string[]): ScoreResult {
  const factors: FactorItem[] = [];
  const unknownKeys: string[] = [];
  let score = 0;
  const seen = new Set<string>();
  for (const raw of keys ?? []) {
    const key = String(raw).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const f = CAPRINI_FACTORS[key];
    if (!f) {
      unknownKeys.push(key);
      continue;
    }
    score += f.points;
    factors.push({ key: f.key, label: f.label, points: f.points });
  }
  return { score, factors, unknownKeys };
}

/** Caprini 分层：低危 0-1 / 中危 2 / 高危 3-4 / 极高危 ≥5（边界严格）。 */
export function capriniLevel(score: number): VteLevel {
  const s = Number(score);
  if (s <= 1) return 'low';
  if (s === 2) return 'medium';
  if (s <= 4) return 'high';
  return 'very_high';
}

// ---------------------------------------------------------------------------
// 2. Padua（内科患者）
// ---------------------------------------------------------------------------

export const PADUA_FACTORS: Record<string, CapriniFactor> = {
  active_cancer: { key: 'active_cancer', label: '活动性恶性肿瘤', points: 3 },
  prior_vte: { key: 'prior_vte', label: '既往 VTE 病史', points: 3 },
  bedridden_ge3d: { key: 'bedridden_ge3d', label: '卧床 ≥3 天', points: 3 },
  thrombophilia: { key: 'thrombophilia', label: '血栓形成倾向', points: 3 },
  recent_trauma_surgery: { key: 'recent_trauma_surgery', label: '近 1 月内创伤/手术', points: 2 },
  age_ge70: { key: 'age_ge70', label: '年龄 ≥70 岁', points: 1 },
  heart_failure: { key: 'heart_failure', label: '心力衰竭/呼吸衰竭', points: 1 },
  mi_stroke: { key: 'mi_stroke', label: '急性心肌梗死/缺血性卒中', points: 1 },
  acute_infection_rheum: { key: 'acute_infection_rheum', label: '急性感染/风湿性疾病活动', points: 1 },
  obesity_bmi30: { key: 'obesity_bmi30', label: '肥胖 BMI ≥30', points: 1 },
  hormone_treatment: { key: 'hormone_treatment', label: '正在接受激素治疗', points: 1 },
};

/** 对选中的 Padua 危险因素求总分并展开明细。 */
export function scorePadua(keys: string[]): ScoreResult {
  const factors: FactorItem[] = [];
  const unknownKeys: string[] = [];
  let score = 0;
  const seen = new Set<string>();
  for (const raw of keys ?? []) {
    const key = String(raw).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const f = PADUA_FACTORS[key];
    if (!f) {
      unknownKeys.push(key);
      continue;
    }
    score += f.points;
    factors.push({ key: f.key, label: f.label, points: f.points });
  }
  return { score, factors, unknownKeys };
}

/** Padua 分层：低危 <4 / 高危 ≥4。 */
export function paduaLevel(score: number): VteLevel {
  return Number(score) >= 4 ? 'high' : 'low';
}

// ---------------------------------------------------------------------------
// 3. 出血风险（VTE 预防相关）
// ---------------------------------------------------------------------------

export interface BleedingFactor {
  key: string;
  label: string;
}

/** VTE 预防相关出血高风险因素（命中任一即判高出血风险）。 */
export const BLEEDING_FACTORS: Record<string, BleedingFactor> = {
  active_bleeding: { key: 'active_bleeding', label: '活动性出血' },
  severe_liver_dysfunction: { key: 'severe_liver_dysfunction', label: '严重肝功能不全' },
  severe_renal_impairment: { key: 'severe_renal_impairment', label: '严重肾功能不全(CrCl<30)' },
  thrombocytopenia: { key: 'thrombocytopenia', label: '血小板减少(<50×10^9/L)' },
  recent_surgery_bleeding: { key: 'recent_surgery_bleeding', label: '近期手术/出血史' },
  coagulopathy: { key: 'coagulopathy', label: '凝血障碍/INR 升高' },
  uncontrolled_htn: { key: 'uncontrolled_htn', label: '未控制的严重高血压' },
  prior_intracranial_hemorrhage: { key: 'prior_intracranial_hemorrhage', label: '颅内出血史' },
  neuraxial_anesthesia: { key: 'neuraxial_anesthesia', label: '腰椎穿刺/硬膜外麻醉窗口期' },
};

export interface BleedingResult {
  level: BleedingLevel;
  factors: BleedingFactor[];
  unknownKeys: string[];
}

/** 命中任一关键出血因素 => high，否则 low。 */
export function assessBleeding(keys: string[]): BleedingResult {
  const factors: BleedingFactor[] = [];
  const unknownKeys: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys ?? []) {
    const key = String(raw).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const f = BLEEDING_FACTORS[key];
    if (!f) {
      unknownKeys.push(key);
      continue;
    }
    factors.push({ key: f.key, label: f.label });
  }
  return { level: factors.length > 0 ? 'high' : 'low', factors, unknownKeys };
}

// ---------------------------------------------------------------------------
// 4. 确定性预防建议（仅建议，须医师确认）
// ---------------------------------------------------------------------------

export type MechanicalMethod = 'ipc' | 'gcs' | 'foot_pump';
export type PharmacologicalMethod = 'lmwh' | 'ufh' | 'fondaparinux' | 'rivaroxaban' | 'other';

export interface SuggestedMechanical {
  category: 'mechanical';
  method: MechanicalMethod;
}

export interface SuggestedPharmacological {
  category: 'pharmacological';
  method: PharmacologicalMethod;
  deferred: boolean;
  deferredReason?: string;
}

export interface PreventionRecommendation {
  mechanical: SuggestedMechanical[];
  pharmacological: SuggestedPharmacological[];
  guidance: string;
}

const BLEEDING_DEFER_REASON =
  '出血风险高：暂缓药物预防，优先机械预防；出血风险下降后再评估药物预防（须医师确认）';

/**
 * 依据量表、VTE 分层与出血风险给出确定性预防建议。
 * - caprini 极高危/高危：药物 + 机械(IPC)；
 * - caprini 中危：机械预防（药物亦可，由医师定）；
 * - caprini 低危：早期活动/基础预防；
 * - padua 高危：药物（+机械）；padua 低危：早期活动；
 * - 出血高：药物项 deferred，机械优先。
 */
export function recommendPrevention(input: {
  scale: VteScale;
  vteLevel: VteLevel;
  bleedingLevel: BleedingLevel;
}): PreventionRecommendation {
  const { scale, vteLevel, bleedingLevel } = input;
  const mechIpc: SuggestedMechanical = { category: 'mechanical', method: 'ipc' };
  const deferred = bleedingLevel === 'high';

  if (scale === 'caprini') {
    if (vteLevel === 'very_high' || vteLevel === 'high') {
      return {
        mechanical: [mechIpc],
        pharmacological: [{ category: 'pharmacological', method: 'lmwh', deferred, deferredReason: deferred ? BLEEDING_DEFER_REASON : undefined }],
        guidance: 'Caprini 高危/极高危：建议药物预防联合机械预防(IPC)，并动态评估',
      };
    }
    if (vteLevel === 'medium') {
      return {
        mechanical: [mechIpc],
        pharmacological: [],
        guidance: 'Caprini 中危：建议机械预防(IPC)，或由医师评估药物预防',
      };
    }
    return {
      mechanical: [],
      pharmacological: [],
      guidance: 'Caprini 低危：早期活动、基础预防，无需常规药物/机械预防',
    };
  }

  // padua
  if (vteLevel === 'high') {
    return {
      mechanical: [mechIpc],
      pharmacological: [{ category: 'pharmacological', method: 'lmwh', deferred, deferredReason: deferred ? BLEEDING_DEFER_REASON : undefined }],
      guidance: 'Padua 高危：建议药物预防，可联合机械预防(IPC)',
    };
  }
  return {
    mechanical: [],
    pharmacological: [],
    guidance: 'Padua 低危：早期活动、基础预防',
  };
}

// ---------------------------------------------------------------------------
// 5. 风险分层与预防不匹配提醒（建议性，非阻断）
// ---------------------------------------------------------------------------

export interface MismatchWarning {
  mismatch: boolean;
  reason: string;
}

/**
 * vte_level 为 high/very_high 且无任何 confirmed/executed 预防 => mismatch。
 * preventions 为该 visit 的预防措施状态列表。
 */
export function detectPreventionMismatch(
  vteLevel: VteLevel,
  preventions: Array<{ status: string }>,
): MismatchWarning {
  if (vteLevel !== 'high' && vteLevel !== 'very_high') {
    return { mismatch: false, reason: '' };
  }
  const hasEffective = preventions.some((p) => p.status === 'confirmed' || p.status === 'executed');
  if (!hasEffective) {
    return {
      mismatch: true,
      reason: `当前 VTE 风险层级为 ${vteLevel === 'very_high' ? '极高危' : '高危'}，尚无已确认/已执行的预防措施，请及时干预`,
    };
  }
  return { mismatch: false, reason: '' };
}

// ---------------------------------------------------------------------------
// 6. VTE 防治质控指标（含分子分母）
// ---------------------------------------------------------------------------

export interface VteMetricSource {
  /** 是否至少做过一次风险评估 */
  assessed: boolean;
  /** 该 visit 最新评估层级 */
  latestLevel: VteLevel | null;
  /** 是否有已确认/已执行的预防措施 */
  hasPrevention: boolean;
  /** 是否发生医院获得性 DVT/PE */
  hospitalAcquiredVte: boolean;
}

export interface VteMetrics {
  /** 风险评估率（目标 100%） */
  assessmentRate: number;
  /** 高危患者预防实施率 */
  highRiskPreventionRate: number;
  /** 医院获得性 VTE 发生率 */
  hospitalAcquiredVteRate: number;
  fractions: {
    assessmentRate: { numerator: number; denominator: number };
    highRiskPreventionRate: { numerator: number; denominator: number };
    hospitalAcquiredVteRate: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * 聚合 VTE 防治质控指标。
 * @param rows 周期内住院 visit 明细（每行一个 visit）
 * @param totalDischarges 同期住院（出院）人数，作为评估率与医院获得性 VTE 发生率分母
 */
export function computeVteMetrics(rows: VteMetricSource[], totalDischarges: number): VteMetrics {
  const assessed = rows.filter((r) => r.assessed).length;
  const highRisk = rows.filter((r) => r.latestLevel === 'high' || r.latestLevel === 'very_high');
  const highRiskWithPrev = highRisk.filter((r) => r.hasPrevention).length;
  const haVte = rows.filter((r) => r.hospitalAcquiredVte).length;

  return {
    assessmentRate: pct(assessed, totalDischarges),
    highRiskPreventionRate: pct(highRiskWithPrev, highRisk.length),
    hospitalAcquiredVteRate: pct(haVte, totalDischarges),
    fractions: {
      assessmentRate: { numerator: assessed, denominator: totalDischarges },
      highRiskPreventionRate: { numerator: highRiskWithPrev, denominator: highRisk.length },
      hospitalAcquiredVteRate: { numerator: haVte, denominator: totalDischarges },
    },
  };
}
