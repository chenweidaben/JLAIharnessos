/**
 * 健澜科技 jlmedaios - 移动护理 PDA 端纯函数（M16-A）
 *
 * 全部为确定性、无副作用、可单测的纯函数：
 *  - parseBarcode            腕带/标本/药品条码解析（复用现有唯一号，不新增字段）；
 *  - verifyFiveRights        床旁给药五重核对（床号/姓名/药名/剂量/时间）；
 *  - scoreBraden             Braden 压疮风险评分；
 *  - scoreMorse              Morse 跌倒风险评分；
 *  - scoreBarthel            Barthel ADL 日常生活活动能力评分；
 *  - painLevel               NRS 疼痛数字分级；
 *  - nutritionRisk           NRS2002 简化营养风险筛查；
 *  - buildSbarSections       SBAR 交接班四段结构化（不杜撰，仅组织入参）；
 *  - detectSyncConflict      离线/弱网恢复后同步冲突检测（给药类须人工确认）。
 *
 * 医疗安全：本模块只做"核对与评分"，不产生医嘱、不产生护理措施、不改变任何状态；
 * 评分结果仅供护士参考，最终护理决策与签名由责任护士本人完成。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 条码解析 =============================== */

export type BarcodeKind = 'wristband' | 'specimen' | 'drug' | 'unknown';

export interface ParsedBarcode {
  kind: BarcodeKind;
  /** 解析出的业务码原值（去掉语义前缀后的业务标识） */
  value: string;
  /** 原始扫码串 */
  raw: string;
}

/**
 * 条码口径（与迁移 97、设计契约一致）：
 *  - IP 开头                    → 患者腕带（visits.visit_no）
 *  - SM 开头                    → 标本条码（lab_specimens.specimen_no）
 *  - D + 恰好三位数字           → 药品条码（drug_catalog.drug_code）
 *  - 其余                        → unknown（不猜，交给上层报错）
 */
export function parseBarcode(code: string): ParsedBarcode {
  const raw = (code ?? '').trim();
  if (!raw) return { kind: 'unknown', value: '', raw };
  if (raw.startsWith('IP')) return { kind: 'wristband', value: raw, raw };
  if (raw.startsWith('SM')) return { kind: 'specimen', value: raw, raw };
  if (/^D\d{3}$/.test(raw)) return { kind: 'drug', value: raw, raw };
  return { kind: 'unknown', value: raw, raw };
}

/* ============================= 五重核对 =============================== */

export interface FiveRightsInput {
  /** 腕带解析出的在院就诊信息 */
  visit: { bedNo: string | null; patientName: string | null };
  /** 待执行药品医嘱 */
  order: { content: string; dose?: string | null; drugCode?: string | null };
  /** PDA 现场核对结果（床号/患者确认/药品扫码/剂量） */
  scanned: {
    bedNo?: string | null;
    patientName?: string | null;
    drugCode?: string | null;
    dose?: string | null;
  };
  /** 本次执行时点（缺省取当前） */
  now?: Date;
  /** 上次给药时点槽（时间窗核对，仅记录不拦截） */
  lastGiven?: string | null;
}

export interface CheckItem {
  ok: boolean;
  expected: unknown;
  actual: unknown;
}

export interface FiveRightsResult {
  bedNo: CheckItem;
  patientName: CheckItem;
  drug: CheckItem;
  dose: CheckItem;
  time: CheckItem;
  allOk: boolean;
  /** 未通过项的人类可读描述（床号不符…） */
  mismatches: string[];
}

const norm = (v: unknown): string => String(v ?? '').trim();

function eq(expected: unknown, actual: unknown): boolean {
  return norm(expected) === norm(actual) && norm(expected) !== '';
}

/**
 * 五重核对：床号 / 姓名 / 药名 / 剂量 / 时间。
 *  - 床号：就诊未分配床位（bedNo 为空）时放行（无可比对象），有床位则须与现场一致；
 *  - 姓名：腕带脱敏名须与现场确认一致；
 *  - 药名：以药品编码为准（order.drugCode 与扫码 drugCode），医嘱未挂药品编码时放行；
 *  - 剂量：医嘱标注剂量时须与现场一致，未标注则放行；
 *  - 时间：默认放行（无上次给药记录即视为合规），仅记录 lastGiven，不据此拦截。
 */
export function verifyFiveRights(input: FiveRightsInput): FiveRightsResult {
  const mismatches: string[] = [];

  // 床号
  const hasBed = norm(input.visit.bedNo) !== '';
  const bedOk = !hasBed || eq(input.visit.bedNo, input.scanned.bedNo);
  const bedNo: CheckItem = {
    ok: bedOk,
    expected: input.visit.bedNo ?? null,
    actual: input.scanned.bedNo ?? null,
  };
  if (!bedOk) mismatches.push(`床号不符（期望 ${norm(input.visit.bedNo)}，现场 ${norm(input.scanned.bedNo)}）`);

  // 姓名
  const patientName: CheckItem = {
    ok: eq(input.visit.patientName, input.scanned.patientName),
    expected: input.visit.patientName ?? null,
    actual: input.scanned.patientName ?? null,
  };
  if (!patientName.ok) {
    mismatches.push(`患者身份不符（腕带 ${norm(input.visit.patientName)}，现场 ${norm(input.scanned.patientName)}）`);
  }

  // 药名（药品编码）
  const hasDrug = norm(input.order.drugCode) !== '';
  const drugOk = !hasDrug || eq(input.order.drugCode, input.scanned.drugCode);
  const drug: CheckItem = {
    ok: drugOk,
    expected: input.order.drugCode ?? null,
    actual: input.scanned.drugCode ?? null,
  };
  if (!drugOk) mismatches.push(`药品不符（医嘱药品码 ${norm(input.order.drugCode)}，扫码 ${norm(input.scanned.drugCode)}）`);

  // 剂量
  const hasDose = norm(input.order.dose) !== '';
  const doseOk = !hasDose || eq(input.order.dose, input.scanned.dose);
  const dose: CheckItem = {
    ok: doseOk,
    expected: input.order.dose ?? null,
    actual: input.scanned.dose ?? null,
  };
  if (!doseOk) mismatches.push(`剂量不符（医嘱 ${norm(input.order.dose)}，现场 ${norm(input.scanned.dose)}）`);

  // 时间：无 lastGiven 视为合规；有则记录，不拦截
  const time: CheckItem = { ok: true, expected: input.lastGiven ?? null, actual: input.now ? new Date(input.now).toISOString() : new Date().toISOString() };

  const allOk = bedNo.ok && patientName.ok && drug.ok && dose.ok && time.ok;
  return { bedNo, patientName, drug, dose, time, allOk, mismatches };
}

/* ============================ Braden 压疮 ============================== */

export type RiskBand = 'none' | 'low' | 'medium' | 'high';

export interface BradenAnswers {
  /** 感觉：1-4 */
  sensory: number;
  /** 潮湿：1-4 */
  moisture: number;
  /** 活动：1-4 */
  activity: number;
  /** 移动：1-4 */
  mobility: number;
  /** 营养：1-4 */
  nutrition: number;
  /** 摩擦与剪切：1-3 */
  frictionShear: number;
}

export interface ScoreResult {
  score: number;
  level: string;
  band: RiskBand;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Number(v) || 0));

/**
 * Braden 总分 6-23。
 * 层级：≤9 高风险 / 10-12 中 / 13-14 低 / 15-18 较低 / ≥19 无明显风险。
 */
export function scoreBraden(a: BradenAnswers): ScoreResult {
  const score =
    clamp(a.sensory, 1, 4) + clamp(a.moisture, 1, 4) + clamp(a.activity, 1, 4) +
    clamp(a.mobility, 1, 4) + clamp(a.nutrition, 1, 4) + clamp(a.frictionShear, 1, 3);
  let level: string;
  let band: RiskBand;
  if (score <= 9) { level = '高风险'; band = 'high'; }
  else if (score <= 12) { level = '中风险'; band = 'medium'; }
  else if (score <= 14) { level = '低风险'; band = 'low'; }
  else if (score <= 18) { level = '较低风险'; band = 'low'; }
  else { level = '无明显风险'; band = 'none'; }
  return { score, level, band };
}

/* ============================= Morse 跌倒 ============================= */

export interface MorseAnswers {
  /** 跌倒史：0 或 25 */
  fallHistory: number;
  /** 多于诊断：0 或 15 */
  multipleDiagnoses: number;
  /** 行走辅助：0/15/30 */
  ambulationAid: number;
  /** 静脉输液/通路：0 或 20 */
  ivTherapy: number;
  /** 步态：0/10/20 */
  gait: number;
  /** 认知状态：0/15/30 */
  mentalStatus: number;
}

/**
 * Morse 总分 0-125。
 * 层级：≥45 高风险 / 25-44 中风险 / <25 低风险。
 */
export function scoreMorse(a: MorseAnswers): ScoreResult {
  const score =
    Number(a.fallHistory) + Number(a.multipleDiagnoses) + Number(a.ambulationAid) +
    Number(a.ivTherapy) + Number(a.gait) + Number(a.mentalStatus);
  let level: string;
  let band: RiskBand;
  if (score >= 45) { level = '高风险'; band = 'high'; }
  else if (score >= 25) { level = '中风险'; band = 'medium'; }
  else { level = '低风险'; band = 'low'; }
  return { score, level, band };
}

/* =========================== Barthel ADL ============================== */

export interface BarthelAnswers {
  feeding: number;
  bathing: number;
  grooming: number;
  dressing: number;
  toileting: number;
  bowel: number;
  bladder: number;
  transfers: number;
  walking: number;
  stairs: number;
}

/**
 * Barthel 总分 0-100。
 * 层级：≤40 重度依赖 / 41-60 中度依赖 / 61-99 轻度依赖 / 100 自理。
 */
export function scoreBarthel(a: BarthelAnswers): ScoreResult {
  const score =
    Number(a.feeding) + Number(a.bathing) + Number(a.grooming) + Number(a.dressing) +
    Number(a.toileting) + Number(a.bowel) + Number(a.bladder) + Number(a.transfers) +
    Number(a.walking) + Number(a.stairs);
  let level: string;
  let band: RiskBand;
  if (score <= 40) { level = '重度依赖'; band = 'high'; }
  else if (score <= 60) { level = '中度依赖'; band = 'medium'; }
  else if (score < 100) { level = '轻度依赖'; band = 'low'; }
  else { level = '完全自理'; band = 'none'; }
  return { score, level, band };
}

/* ============================ 疼痛 NRS ================================ */

export type PainLevel = '无' | '轻度' | '中度' | '重度';

/** NRS 0-10：0 无痛 / 1-3 轻度 / 4-6 中度 / 7-10 重度。 */
export function painLevel(score: number): { score: number; level: PainLevel; band: RiskBand } {
  const s = clamp(Math.round(Number(score) || 0), 0, 10);
  if (s === 0) return { score: s, level: '无', band: 'none' };
  if (s <= 3) return { score: s, level: '轻度', band: 'low' };
  if (s <= 6) return { score: s, level: '中度', band: 'medium' };
  return { score: s, level: '重度', band: 'high' };
}

/* ======================== NRS2002 营养风险 ============================ */

export interface NutritionAnswers {
  /** BMI（kg/m²） */
  bmi?: number | null;
  /** 近 1 月体重下降百分比（%） */
  weightLossPct?: number | null;
  /** 进食减少程度：0 无 / 1 轻度 / 2 显著 */
  intakeLevel?: 0 | 1 | 2;
  /** 是否存在疾病应激（高热/大手术/脓毒症等） */
  diseaseStress?: boolean;
  /** 年龄（岁） */
  age?: number | null;
}

/**
 * NRS2002 简化营养风险筛查。
 * 评分：BMI<18.5 计 2、18.5-20.5 计 1；体重下降 ≥5% 计 2、≥2% 计 1；
 *       进食减少 0/1/2；疾病应激 +1；年龄 ≥70 +1。
 * 总分 ≥3 → 高风险；<3 → 低风险。
 */
export function nutritionRisk(a: NutritionAnswers): { score: number; highRisk: boolean; band: RiskBand } {
  let score = 0;
  if (typeof a.bmi === 'number' && a.bmi != null) {
    if (a.bmi < 18.5) score += 2;
    else if (a.bmi <= 20.5) score += 1;
  }
  if (typeof a.weightLossPct === 'number' && a.weightLossPct != null) {
    if (a.weightLossPct >= 5) score += 2;
    else if (a.weightLossPct >= 2) score += 1;
  }
  score += Number(a.intakeLevel ?? 0);
  if (a.diseaseStress) score += 1;
  if (typeof a.age === 'number' && a.age != null && a.age >= 70) score += 1;
  const highRisk = score >= 3;
  return { score, highRisk, band: highRisk ? 'high' : 'low' };
}

/* ============================== SBAR ================================= */

export interface SbarData {
  /** S 现状：床号/姓名/当前主要问题 */
  situation: string;
  /** B 背景：诊断/过敏/关键既往史 */
  background: string;
  /** A 评估：最新体征/风险/异常指标 */
  assessment: string;
  /** R 建议：待执行/待关注/交班事项 */
  recommendation: string;
}

export interface SbarSections {
  S: string;
  B: string;
  A: string;
  R: string;
}

/** 把聚合数据组织为 S/B/A/R 四段（纯结构化，不杜撰任何医学结论）。 */
export function buildSbarSections(data: Partial<SbarData>): SbarSections {
  return {
    S: (data.situation ?? '').trim(),
    B: (data.background ?? '').trim(),
    A: (data.assessment ?? '').trim(),
    R: (data.recommendation ?? '').trim(),
  };
}

/* ============================ 离线同步冲突 ============================ */

export interface SyncOp {
  /** 操作类型；administer 等医嘱执行类须人工确认 */
  type: string;
  orderId?: string;
  slot?: string;
}

export interface RemoteState {
  /** 远端已存在同一医嘱同一执行槽的给药记录 */
  hasAdministeredSlot?: boolean;
}

export interface SyncConflict {
  conflict: boolean;
  requiresManualConfirm: boolean;
  reason: string;
}

/**
 * 离线恢复后冲突检测。医嘱执行类（administer）若远端已有同 orderId+slot 记录，
 * 视为冲突，必须人工确认，严禁离线端自动覆盖。
 */
export function detectSyncConflict(local: SyncOp, remote: RemoteState): SyncConflict {
  if (local.type === 'administer' && remote.hasAdministeredSlot) {
    return {
      conflict: true,
      requiresManualConfirm: true,
      reason: '该医嘱在本执行时点已被他人执行，离线重放需人工确认，不得自动覆盖',
    };
  }
  return { conflict: false, requiresManualConfirm: false, reason: '' };
}
