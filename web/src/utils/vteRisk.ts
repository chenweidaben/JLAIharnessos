/**
 * 健澜科技 jlmedaios - VTE 风险评分纯函数引擎（M13-A）
 *
 * 与后端 src/medical-tools/vte/vteRisk.ts 严格同口径：纯函数、确定性、无 I/O。
 * 输入危险因素 key 清单，输出总分、分项明细与风险层级；前端表单实时算分用。
 *
 * 依据：Caprini 风险评估（外科/手术）、Padua 评分（内科）、VTE 预防相关出血风险因素。
 * 分值/阈值可追溯指南；规则引擎结果不可无依据改写。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  BleedingLevel,
  VteFactorItem,
  VteLevel,
} from '@/types/vte';

export interface FactorDef {
  label: string;
  points: number;
}

/* ---------------------------------------------------------------------------
 * Caprini（外科/手术患者）危险因素及分值
 * ------------------------------------------------------------------------ */
export const CAPRINI_FACTORS: Record<string, FactorDef> = {
  age_41_60: { label: '年龄 41-60 岁', points: 1 },
  age_61_74: { label: '年龄 61-74 岁', points: 2 },
  age_ge75: { label: '年龄 ≥75 岁', points: 3 },
  minor_surgery: { label: '小手术', points: 1 },
  major_surgery_gt45min: { label: '大手术 >45 min', points: 2 },
  major_surgery_bedridden: { label: '大手术 + 卧床', points: 2 },
  bedridden_gt72h: { label: '卧床 >72 h', points: 2 },
  prior_vte: { label: '既往 VTE（DVT/PE）', points: 3 },
  active_cancer: { label: '活动性肿瘤', points: 2 },
  pregnancy_postpartum: { label: '妊娠/产后', points: 1 },
  estrogen_hrt: { label: '避孕药 / 激素替代治疗(HRT)', points: 1 },
  family_thrombosis: { label: '血栓形成家族史', points: 3 },
  central_venous: { label: '中心静脉置管', points: 2 },
  bmi_gt25: { label: 'BMI >25', points: 1 },
  leg_edema: { label: '下肢水肿', points: 1 },
  varicose_veins: { label: '静脉曲张', points: 1 },
  sepsis: { label: '脓毒症', points: 1 },
  mi: { label: '急性心肌梗死', points: 1 },
  copd: { label: '慢性阻塞性肺病', points: 1 },
  impaired_pulm: { label: '不明原因肺功能异常/低氧', points: 1 },
  recurrent_miscarriage: { label: '不明原因/复发性流产', points: 1 },
  ra: { label: '类风湿关节炎', points: 1 },
  lupus_antiphospholipid: { label: '狼疮/抗磷脂综合征', points: 3 },
  inherited_thrombophilia: { label: '其他先天/获得性血栓倾向', points: 3 },
};

/* ---------------------------------------------------------------------------
 * Padua（内科患者）危险因素及分值
 * ------------------------------------------------------------------------ */
export const PADUA_FACTORS: Record<string, FactorDef> = {
  active_cancer: { label: '活动性肿瘤（既往6月内治疗/转移）', points: 3 },
  prior_vte: { label: '既往 VTE（除外浅表静脉血栓）', points: 3 },
  bedridden_ge3d: { label: '卧床 ≥3 天（医嘱限动/制动）', points: 3 },
  thrombophilia: { label: '血栓形成倾向（抗凝血酶缺乏等）', points: 3 },
  recent_trauma_surgery_1m: { label: '近1月内创伤/手术', points: 2 },
  age_ge70: { label: '年龄 ≥70 岁', points: 1 },
  heart_resp_failure: { label: '心力衰竭/呼吸衰竭', points: 1 },
  mi_ischemic_stroke: { label: '急性心梗/缺血性卒中', points: 1 },
  acute_infection_rheum: { label: '急性感染/风湿性疾病活动', points: 1 },
  obesity_bmi30: { label: '肥胖 BMI ≥30', points: 1 },
  hormone_therapy: { label: '激素治疗', points: 1 },
};

/* ---------------------------------------------------------------------------
 * 出血风险因素（VTE 预防相关；命中任一 => 高出血风险）
 * ------------------------------------------------------------------------ */
export const BLEEDING_FACTORS: Record<string, string> = {
  active_bleeding: '活动性出血',
  severe_liver: '严重肝功能不全',
  severe_renal: '严重肾功能不全（CrCl<30）',
  thrombocytopenia: '血小板减少（<50×10^9/L）',
  recent_surgery_bleeding: '近期手术/出血',
  coagulopathy: '凝血障碍/INR 升高',
  uncontrolled_htn: '未控制的严重高血压',
  prior_intracranial_hemorrhage: '颅内出血史',
  neuraxial_anesthesia: '腰椎穿刺/硬膜外/腰麻操作',
};

export interface ScoreResult {
  score: number;
  factors: VteFactorItem[];
}

/** 累加所选 Caprini 因素分值；未知 key 忽略（与后端一致）。 */
export function scoreCaprini(keys: string[]): ScoreResult {
  const factors: VteFactorItem[] = [];
  let score = 0;
  for (const key of keys) {
    const def = CAPRINI_FACTORS[key];
    if (!def) continue;
    factors.push({ key, label: def.label, points: def.points });
    score += def.points;
  }
  return { score, factors };
}

/** Caprini 分层：低危 0-1 / 中危 2 / 高危 3-4 / 极高危 ≥5（边界严格）。 */
export function capriniLevel(score: number): VteLevel {
  if (score <= 1) return 'low';
  if (score === 2) return 'medium';
  if (score <= 4) return 'high';
  return 'very_high';
}

/** 累加所选 Padua 因素分值；未知 key 忽略。 */
export function scorePadua(keys: string[]): ScoreResult {
  const factors: VteFactorItem[] = [];
  let score = 0;
  for (const key of keys) {
    const def = PADUA_FACTORS[key];
    if (!def) continue;
    factors.push({ key, label: def.label, points: def.points });
    score += def.points;
  }
  return { score, factors };
}

/** Padua 分层：低危 <4 / 高危 ≥4。 */
export function paduaLevel(score: number): Exclude<VteLevel, 'medium' | 'very_high'> {
  return score >= 4 ? 'high' : 'low';
}

export interface BleedingResult {
  level: BleedingLevel;
  factors: { key: string; label: string }[];
}

/** 出血风险：命中任一关键因素 => high，否则 low。 */
export function assessBleeding(keys: string[]): BleedingResult {
  const factors = keys
    .filter((k) => BLEEDING_FACTORS[k])
    .map((key) => ({ key, label: BLEEDING_FACTORS[key] }));
  return { level: factors.length > 0 ? 'high' : 'low', factors };
}

/* ---------------------------------------------------------------------------
 * 确定性预防建议（仅建议，须医师确认；前端用于展示建议口径）
 * ------------------------------------------------------------------------ */
export interface PreventionAdvice {
  category: 'mechanical' | 'pharmacological';
  method: string;
  rationale: string;
  deferred?: string;
}

export interface AdviceInput {
  scale: 'caprini' | 'padua';
  vteLevel: VteLevel;
  bleedingLevel: BleedingLevel;
}

/**
 * 预防建议：
 *  - 低危：早期活动/基础预防；
 *  - caprini 中危：机械或药物预防；
 *  - caprini 高危/极高危：药物 + 机械（IPC）；
 *  - padua 高危：药物（+机械）；
 *  - 高出血风险：暂缓药物预防，优先机械预防，标注 deferred 原因。
 */
export function recommendPrevention(input: AdviceInput): PreventionAdvice[] {
  const { scale, vteLevel, bleedingLevel } = input;
  const advice: PreventionAdvice[] = [];

  if (vteLevel === 'low') {
    advice.push({
      category: 'mechanical',
      method: 'early_mobilization',
      rationale: '早期活动 + 基础预防（健康教育、补液）',
    });
    return advice;
  }

  // 机械预防建议（高出血风险时优先）
  advice.push({
    category: 'mechanical',
    method: 'ipc',
    rationale: '间歇充气加压装置（IPC）',
  });

  const needsDrug = vteLevel === 'high' || vteLevel === 'very_high';
  const isMediumChoice = scale === 'caprini' && vteLevel === 'medium';

  if (needsDrug || isMediumChoice) {
    if (bleedingLevel === 'high') {
      advice.push({
        category: 'pharmacological',
        method: 'lmwh',
        rationale: '拟药物预防（低分子肝素），但当前高出血风险',
        deferred: '高出血风险：暂缓药物预防，优先机械预防；出血风险下降后再由医师复评药物预防',
      });
    } else {
      advice.push({
        category: 'pharmacological',
        method: 'lmwh',
        rationale: '药物预防：低分子肝素（须医师确认签名，走审方/CDS：禁忌、肾功能调整、出血风险）',
      });
    }
  }

  return advice;
}

/** 风险层级中文标签。 */
export const VTE_LEVEL_LABEL: Record<VteLevel, string> = {
  low: '低危',
  medium: '中危',
  high: '高危',
  very_high: '极高危',
};

/** 风险层级标签颜色（与 antd Tag 对应）。 */
export const VTE_LEVEL_COLOR: Record<VteLevel, string> = {
  low: 'green',
  medium: 'blue',
  high: 'orange',
  very_high: 'red',
};
