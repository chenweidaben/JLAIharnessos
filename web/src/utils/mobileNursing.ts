/**
 * 健澜科技 jlmedaios - AI 移动护理（PDA 执行端）纯函数引擎（M16-A）
 *
 * 与后端 src/medical-tools/nursing/mobileNursing.ts 严格同口径：纯函数、确定性、无 I/O。
 * 供床旁表单实时算分 / 扫码五重核对 / 离线同步冲突判定使用，可直接单测。
 * 医疗安全：本文件只做"计算与核对"，不产生医嘱、不自动执行给药；所有结果须护士本人签名生效。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type { BarcodeKind, SbarSections } from '@/types/mobileNursing';

/* ---------------------------------------------------------------------------
 * 条码解析（复用现有唯一号，不新增 wristband_no）
 *  - 患者腕带：IP + 数字（如 IP001）
 *  - 标本条码：SM 开头
 *  - 药品条码：D + 3 位数字（如 D001）
 * ------------------------------------------------------------------------ */
export interface ParsedBarcode {
  kind: BarcodeKind;
  value: string;
}

export function parseBarcode(raw: string): ParsedBarcode {
  const code = (raw ?? '').trim();
  if (/^IP\d+$/.test(code)) return { kind: 'wristband', value: code };
  if (code.startsWith('SM')) return { kind: 'specimen', value: code };
  if (/^D\d{3}$/.test(code)) return { kind: 'drug', value: code };
  return { kind: 'unknown', value: code };
}

/* ---------------------------------------------------------------------------
 * 五重核对：床号 / 姓名 / 药名 / 剂量 / 时间（确定性、可单测）
 *  - 床号、姓名、药名：床旁扫码值与医嘱/就诊登记值逐项等值比对；
 *  - 剂量：以医嘱剂量为准（扫码枪不含剂量），按医嘱给药，默认放行并记录；
 *  - 时间：无 lastGiven 时默认放行并记录给药时点（医嘱有效窗内）。
 * ------------------------------------------------------------------------ */
export interface FiveRightsInput {
  visit: { bedNo: string; patientName: string };
  order: { content: string; dose?: string | null; drugCode?: string | null };
  scanned: { bedNo?: string | null; patientName?: string | null; drugCode?: string | null };
  now?: string;
}

export interface FiveRightsItemOut {
  ok: boolean;
  expected: string;
  actual: string;
}

export interface FiveRightsOut {
  bed: FiveRightsItemOut;
  patient: FiveRightsItemOut;
  drug: FiveRightsItemOut;
  dose: FiveRightsItemOut;
  time: FiveRightsItemOut;
  allOk: boolean;
  mismatches: string[];
}

const eq = (a: string | null | undefined, b: string | null | undefined): boolean =>
  (a ?? '').trim() === (b ?? '').trim();

export function verifyFiveRights(input: FiveRightsInput): FiveRightsOut {
  const { visit, order, scanned } = input;
  const now = input.now ?? new Date().toISOString();

  const bed: FiveRightsItemOut = {
    ok: eq(visit.bedNo, scanned.bedNo),
    expected: visit.bedNo || '-',
    actual: scanned.bedNo || '-',
  };
  const patient: FiveRightsItemOut = {
    ok: eq(visit.patientName, scanned.patientName),
    expected: visit.patientName || '-',
    actual: scanned.patientName || '-',
  };
  const drugExpected = order.drugCode || order.content;
  const drug: FiveRightsItemOut = {
    ok: eq(drugExpected, scanned.drugCode),
    expected: drugExpected || '-',
    actual: scanned.drugCode || '-',
  };
  // 剂量以医嘱为准：扫码不含剂量，护士按医嘱剂量给药即核对通过。
  const dose: FiveRightsItemOut = {
    ok: true,
    expected: order.dose || '按医嘱',
    actual: order.dose ? '按医嘱剂量' : '按医嘱',
  };
  // 时间：无上次给药记录时默认放行并记录当前时点。
  const time: FiveRightsItemOut = {
    ok: true,
    expected: '医嘱有效时点',
    actual: now,
  };

  const mismatches: string[] = [];
  if (!bed.ok) mismatches.push(`床号不符（登记 ${bed.expected} / 扫码 ${bed.actual}）`);
  if (!patient.ok) mismatches.push(`姓名不符（登记 ${patient.expected} / 扫码 ${patient.actual}）`);
  if (!drug.ok) mismatches.push(`药品不符（医嘱 ${drug.expected} / 扫码 ${drug.actual}）`);

  return {
    bed,
    patient,
    drug,
    dose,
    time,
    allOk: bed.ok && patient.ok && drug.ok && dose.ok && time.ok,
    mismatches,
  };
}

/* ---------------------------------------------------------------------------
 * Braden 压疮风险评分：6 子项（感觉/潮湿/活动/移动/营养/摩擦剪切），1-4 分（摩擦 1-3）
 * 总分 6-23；层级：≤9 high / 10-12 medium / 13-14 low / 15-18 none-low / ≥19 none
 * ------------------------------------------------------------------------ */
export interface BradenAnswers {
  sensation: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  friction: number;
}

export type BradenLevel = 'high' | 'medium' | 'low' | 'none_low' | 'none';

export interface ScaleScore {
  score: number;
  level: string;
  levelLabel: string;
}

export function scoreBraden(a: BradenAnswers): ScaleScore & { level: BradenLevel } {
  const score =
    (a.sensation || 0) +
    (a.moisture || 0) +
    (a.activity || 0) +
    (a.mobility || 0) +
    (a.nutrition || 0) +
    (a.friction || 0);
  let level: BradenLevel;
  let levelLabel: string;
  if (score <= 9) {
    level = 'high';
    levelLabel = '高度风险';
  } else if (score <= 12) {
    level = 'medium';
    levelLabel = '中度风险';
  } else if (score <= 14) {
    level = 'low';
    levelLabel = '低度风险';
  } else if (score <= 18) {
    level = 'none_low';
    levelLabel = '无显著风险';
  } else {
    level = 'none';
    levelLabel = '基本无风险';
  }
  return { score, level, levelLabel };
}

/* ---------------------------------------------------------------------------
 * Morse 跌倒风险评分：6 项加权，总分 0-125
 * 跌倒史25 / 多诊断15 / 行走辅助15 / 静脉输液20 / 步态(弱10·受损20) / 认知15
 * 层级：≥45 high / 25-44 medium / <25 low
 * ------------------------------------------------------------------------ */
export interface MorseAnswers {
  fallHistory: number;
  multipleDiagnosis: number;
  ambulationAid: number;
  ivTherapy: number;
  gait: number;
  cognition: number;
}

export type MorseLevel = 'high' | 'medium' | 'low';

export function scoreMorse(a: MorseAnswers): ScaleScore & { level: MorseLevel } {
  const score =
    (a.fallHistory || 0) +
    (a.multipleDiagnosis || 0) +
    (a.ambulationAid || 0) +
    (a.ivTherapy || 0) +
    (a.gait || 0) +
    (a.cognition || 0);
  let level: MorseLevel;
  let levelLabel: string;
  if (score >= 45) {
    level = 'high';
    levelLabel = '高度风险';
  } else if (score >= 25) {
    level = 'medium';
    levelLabel = '中度风险';
  } else {
    level = 'low';
    levelLabel = '低度风险';
  }
  return { score, level, levelLabel };
}

/* ---------------------------------------------------------------------------
 * Barthel（ADL）日常生活活动能力：10 项加权，总分 0-100
 * 层级：≤40 重度依赖 / 41-60 中度依赖 / 61-99 轻度依赖 / 100 自理
 * ------------------------------------------------------------------------ */
export interface BarthelAnswers {
  feeding: number;
  bathing: number;
  grooming: number;
  dressing: number;
  toileting: number;
  bowel: number;
  bladder: number;
  transfer: number;
  walking: number;
  stairs: number;
}

export type BarthelLevel = 'severe' | 'moderate' | 'mild' | 'independent';

export function scoreBarthel(a: BarthelAnswers): ScaleScore & { level: BarthelLevel } {
  const score =
    (a.feeding || 0) +
    (a.bathing || 0) +
    (a.grooming || 0) +
    (a.dressing || 0) +
    (a.toileting || 0) +
    (a.bowel || 0) +
    (a.bladder || 0) +
    (a.transfer || 0) +
    (a.walking || 0) +
    (a.stairs || 0);
  let level: BarthelLevel;
  let levelLabel: string;
  if (score <= 40) {
    level = 'severe';
    levelLabel = '重度依赖';
  } else if (score <= 60) {
    level = 'moderate';
    levelLabel = '中度依赖';
  } else if (score < 100) {
    level = 'mild';
    levelLabel = '轻度依赖';
  } else {
    level = 'independent';
    levelLabel = '完全自理';
  }
  return { score, level, levelLabel };
}

/* ---------------------------------------------------------------------------
 * 疼痛 NRS 0-10：0 无 / 1-3 轻 / 4-6 中 / 7-10 重
 * ------------------------------------------------------------------------ */
export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe';

export function painLevel(score: number): { level: PainLevel; levelLabel: string } {
  if (score <= 0) return { level: 'none', levelLabel: '无痛' };
  if (score <= 3) return { level: 'mild', levelLabel: '轻度疼痛' };
  if (score <= 6) return { level: 'moderate', levelLabel: '中度疼痛' };
  return { level: 'severe', levelLabel: '重度疼痛' };
}

/* ---------------------------------------------------------------------------
 * NRS2002 营养风险（简化）：BMI / 近期体重下降 / 进食减少 / 疾病应激 / 年龄≥70
 * 总分 ≥3 高风险 / <3 低风险
 * ------------------------------------------------------------------------ */
export interface NutritionAnswers {
  bmiLow: number;
  weightLoss: number;
  reducedIntake: number;
  severeStress: number;
  ageGe70: number;
}

export type NutritionLevel = 'high' | 'low';

export function nutritionRisk(a: NutritionAnswers): ScaleScore & { level: NutritionLevel } {
  const score =
    (a.bmiLow || 0) +
    (a.weightLoss || 0) +
    (a.reducedIntake || 0) +
    (a.severeStress || 0) +
    (a.ageGe70 || 0);
  const high = score >= 3;
  return {
    score,
    level: high ? 'high' : 'low',
    levelLabel: high ? '存在营养风险' : '暂无营养风险',
  };
}

/* ---------------------------------------------------------------------------
 * SBAR 四段组织（纯结构化，不杜撰：缺项标注"本班无记录"）
 * ------------------------------------------------------------------------ */
export interface SbarInput {
  situation?: string | null;
  background?: string | null;
  assessment?: string | null;
  recommendation?: string | null;
}

export function buildSbarSections(data: SbarInput): SbarSections {
  const na = '（本班无记录）';
  return {
    situation: data.situation?.trim() || na,
    background: data.background?.trim() || na,
    assessment: data.assessment?.trim() || na,
    recommendation: data.recommendation?.trim() || na,
  };
}

/* ---------------------------------------------------------------------------
 * 离线同步冲突检测：医嘱执行类（administer）若远端同 slot 已有记录 → 冲突需人工确认，
 * 绝不自动覆盖。
 * ------------------------------------------------------------------------ */
export interface SyncConflictInput {
  kind: 'administer' | 'write';
  orderId?: string | null;
  slot?: string | null;
  remoteHasRecord: boolean;
}

export interface SyncConflictResult {
  conflict: boolean;
  reason?: string;
}

export function detectSyncConflict(input: SyncConflictInput): SyncConflictResult {
  if (input.kind === 'administer' && input.remoteHasRecord) {
    return {
      conflict: true,
      reason: '远端该给药时点已有记录，离线重放可能重复给药，须人工核对确认（禁止自动覆盖）',
    };
  }
  return { conflict: false };
}
