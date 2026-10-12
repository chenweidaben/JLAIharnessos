/**
 * 健澜科技 jlmedaios - 住院患者压疮(Braden)/跌倒(Morse)风险预警引擎（M17-A）
 *
 * 纯函数、确定性、无 I/O、无随机、无时钟依赖，供聚合器调用并可独立单测。
 * 与 M16-A mobileNursing.ts 分工：
 *  - scoreBraden / scoreMorse 仍由 mobileNursing 提供（PDA 床旁打分），本模块复用、不复制重写；
 *  - 本模块负责"闭环层"：把量表总分映射到入库三档 low/medium/high、生成确定性预防建议、
 *    高危无执行预防的预警、以及 NQI 高危率/事件发生率的分子分母聚合。
 *
 * 分层口径（与迁移 99 level CHECK 一致，仅 low/medium/high 三档）：
 *  - 压疮 Braden：≤9 高 / 10-12 中 / ≥13 低
 *      （mobileNursing 中 15-18"较低"与 ≥19"无明显风险"在闭环层统一归 low；
 *        高危预警只认 high，此归并不影响压疮高危率分子）；
 *  - 跌倒 Morse：≥45 高 / 25-44 中 / <25 低。
 *
 * 医疗安全：本引擎只做"分层 + 建议 + 预警 + 统计"，不产生医嘱、不代护士签名；
 * 预防建议一律为 suggested 草稿，须护士本人 accepted/executed 签名后方为已落实。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { scoreBraden, scoreMorse, type BradenAnswers, type MorseAnswers } from './mobileNursing.js';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type RiskType = 'pressure_ulcer' | 'fall';
export type RiskLevel = 'low' | 'medium' | 'high';

/** 预防建议措施（确定性字典，measure_code 稳定供前端与测试引用） */
export interface PreventionMeasure {
  measureCode: string;
  measureDesc: string;
}

// ---------------------------------------------------------------------------
// 1. 复用 PDA 打分（薄封装：只算总分，不重复实现量表规则）
// ---------------------------------------------------------------------------

/** Braden 压疮打分（复用 mobileNursing.scoreBraden，返回原始总分）。 */
export function scorePressureUlcer(items: BradenAnswers): number {
  return scoreBraden(items).score;
}

/** Morse 跌倒打分（复用 mobileNursing.scoreMorse，返回原始总分）。 */
export function scoreFall(items: MorseAnswers): number {
  return scoreMorse(items).score;
}

// ---------------------------------------------------------------------------
// 2. 分层：总分 -> low/medium/high（入库三档）
// ---------------------------------------------------------------------------

/**
 * 按风险类型把量表总分映射为入库三档。
 * 非法 risk_type 一律归 low（不抛异常，保持纯函数确定性）。
 */
export function classifyLevel(riskType: RiskType, totalScore: number): RiskLevel {
  const s = Number(totalScore) || 0;
  if (riskType === 'pressure_ulcer') {
    // Braden：≤9 高 / 10-12 中 / ≥13 低
    if (s <= 9) return 'high';
    if (s <= 12) return 'medium';
    return 'low';
  }
  if (riskType === 'fall') {
    // Morse：≥45 高 / 25-44 中 / <25 低
    if (s >= 45) return 'high';
    if (s >= 25) return 'medium';
    return 'low';
  }
  return 'low';
}

// ---------------------------------------------------------------------------
// 3. 确定性预防建议（仅建议草稿，须护士本人签名执行）
// ---------------------------------------------------------------------------

const PRESSURE_MEASURES: Record<RiskLevel, PreventionMeasure[]> = {
  high: [
    { measureCode: 'TURN_Q2H', measureDesc: '每 2 小时翻身一次并记录体位' },
    { measureCode: 'SKIN_INSPECTION_DAILY', measureDesc: '每日评估骶尾部/足跟等受压部位皮肤并记录' },
    { measureCode: 'PRESSURE_MATTRESS', measureDesc: '使用减压床垫/气垫床' },
    { measureCode: 'SKIN_CARE_DRY', measureDesc: '保持皮肤清洁干燥，避免摩擦与剪切力' },
    { measureCode: 'NUTRITION_CONSULT', measureDesc: '营养风险评估，必要时请营养科会诊' },
  ],
  medium: [
    { measureCode: 'TURN_Q2_4H', measureDesc: '每 2-4 小时翻身一次' },
    { measureCode: 'SKIN_OBSERVE', measureDesc: '每日观察受压部位皮肤变化' },
    { measureCode: 'PRESSURE_PAD_ASSESS', measureDesc: '评估并按需使用减压垫' },
  ],
  low: [
    { measureCode: 'EARLY_MOBILIZE', measureDesc: '鼓励早期活动，避免局部长时间受压' },
    { measureCode: 'SKIN_CARE_BASIC', measureDesc: '保持皮肤清洁干燥，做好基础皮肤护理' },
  ],
};

const FALL_MEASURES: Record<RiskLevel, PreventionMeasure[]> = {
  high: [
    { measureCode: 'BED_RAILS_UP', measureDesc: '双侧床栏拉起，床旁呼叫器置于伸手可及处' },
    { measureCode: 'FALL_WRISTBAND', measureDesc: '佩戴跌倒风险警示手环，床头悬挂防跌标识' },
    { measureCode: 'BED_LOWEST', measureDesc: '床位调至最低位并锁定脚轮' },
    { measureCode: 'ROUNDING_INCREASE', measureDesc: '增加巡视频次，高危时段（夜间/如厕）重点陪护' },
    { measureCode: 'TOILETING_ASSIST', measureDesc: '睡前及夜间协助如厕，床旁备便器' },
  ],
  medium: [
    { measureCode: 'BED_RAILS_ONDEMAND', measureDesc: '按需拉起床栏，告知跌倒风险' },
    { measureCode: 'FALL_SIGN', measureDesc: '床头/腕带跌倒风险标识提示' },
    { measureCode: 'ROUNDING_ENHANCE', measureDesc: '加强巡视，落实跌倒预防宣教' },
  ],
  low: [
    { measureCode: 'FALL_EDUCATION', measureDesc: '开展跌倒预防与下床宣教' },
    { measureCode: 'ENVIRONMENT_SAFE', measureDesc: '保持走道通畅、地面干燥、照明充足' },
  ],
};

/** 按风险类型与分层给出确定性预防建议数组（仅建议，须护士执行签名）。 */
export function recommendPreventions(riskType: RiskType, level: RiskLevel): PreventionMeasure[] {
  if (riskType === 'pressure_ulcer') return PRESSURE_MEASURES[level] ?? [];
  if (riskType === 'fall') return FALL_MEASURES[level] ?? [];
  return [];
}

// ---------------------------------------------------------------------------
// 4. 高危无执行预防预警
// ---------------------------------------------------------------------------

export interface WarningAssessment {
  assessmentId: string;
  visitId: string;
  riskType: RiskType;
  level: RiskLevel;
  totalScore: number;
  /** 该评估关联的预防措施状态列表 */
  preventions: Array<{ status: string }>;
}

export interface RiskWarning {
  assessmentId: string;
  visitId: string;
  riskType: RiskType;
  totalScore: number;
  reason: string;
}

/**
 * 高危（level=high）评估且无任何 executed 预防 => 预警。
 * 注意：仅 executed 视为已落实；accepted 但未执行仍预警（计划未落地）。
 * 非 high 评估一律不预警。
 */
export function detectNoPrevention(assessments: WarningAssessment[]): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  for (const a of assessments ?? []) {
    if (a.level !== 'high') continue;
    const hasExecuted = (a.preventions ?? []).some((p) => p.status === 'executed');
    if (!hasExecuted) {
      warnings.push({
        assessmentId: a.assessmentId,
        visitId: a.visitId,
        riskType: a.riskType,
        totalScore: a.totalScore,
        reason: a.riskType === 'pressure_ulcer'
          ? '压疮高风险，尚无已执行的预防措施，请及时落实翻身/减压并签名'
          : '跌倒高风险，尚无已执行的预防措施，请及时落实防跌措施并签名',
      });
    }
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// 5. NQI 高危率 / 事件发生率（分子分母）
// ---------------------------------------------------------------------------

export interface RiskMetricRow {
  riskType: RiskType;
  /** 该 visit 该风险类型最新评估层级；null = 未评估 */
  latestLevel: RiskLevel | null;
  /** 是否已发生不良结局事件（二期及以上压力性损伤 / 跌倒） */
  eventOccurred: boolean;
}

export interface RiskMetrics {
  /** 压疮高危率 = 压疮高危人数 / 压疮已评估人数 */
  pressureHighRiskRate: number;
  /** 跌倒高危率 = 跌倒高危人数 / 跌倒已评估人数 */
  fallHighRiskRate: number;
  /** 院内压力性损伤（二期及以上）发生率 = 发生例数 / 同期住院人数 */
  pressureInjuryRate: number;
  /** 跌倒发生率 = 跌倒发生例数 / 同期住院人数 */
  fallIncidentRate: number;
  fractions: {
    pressureHighRiskRate: { numerator: number; denominator: number };
    fallHighRiskRate: { numerator: number; denominator: number };
    pressureInjuryRate: { numerator: number; denominator: number };
    fallIncidentRate: { numerator: number; denominator: number };
  };
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Number(((n / d) * 100).toFixed(2));
}

/**
 * 聚合压疮/跌倒风险 NQI 指标。
 * @param rows  周期内住院 visit 明细（每个 visit 按风险类型可一行或两行）
 * @param totalVisits 同期住院人数，作为事件发生率分母
 */
export function computeRiskMetrics(rows: RiskMetricRow[], totalVisits: number): RiskMetrics {
  const pressure = rows.filter((r) => r.riskType === 'pressure_ulcer');
  const fall = rows.filter((r) => r.riskType === 'fall');

  const pressureAssessed = pressure.filter((r) => r.latestLevel != null);
  const fallAssessed = fall.filter((r) => r.latestLevel != null);
  const pressureHigh = pressureAssessed.filter((r) => r.latestLevel === 'high').length;
  const fallHigh = fallAssessed.filter((r) => r.latestLevel === 'high').length;

  const pressureEvents = pressure.filter((r) => r.eventOccurred).length;
  const fallEvents = fall.filter((r) => r.eventOccurred).length;

  return {
    pressureHighRiskRate: pct(pressureHigh, pressureAssessed.length),
    fallHighRiskRate: pct(fallHigh, fallAssessed.length),
    pressureInjuryRate: pct(pressureEvents, totalVisits),
    fallIncidentRate: pct(fallEvents, totalVisits),
    fractions: {
      pressureHighRiskRate: { numerator: pressureHigh, denominator: pressureAssessed.length },
      fallHighRiskRate: { numerator: fallHigh, denominator: fallAssessed.length },
      pressureInjuryRate: { numerator: pressureEvents, denominator: totalVisits },
      fallIncidentRate: { numerator: fallEvents, denominator: totalVisits },
    },
  };
}
