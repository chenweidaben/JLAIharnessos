/**
 * 健澜科技 jlmedaios - LIS 检验全流程规则引擎（M11-A）
 *
 * 纯函数、确定性、无 I/O、无随机，供 LIS 聚合器调用。覆盖：
 *  1. 标本 / 报告状态机转移表与 canTransition；
 *  2. 项目结果判定：参考范围 / 异常 flag（H/L/HH/LL/N）/ 危急值确定性判定；
 *  3. 报告审核职责分离：录入人不得为同一人审核。
 *
 * 医学依据：《医疗机构临床实验室管理办法》、三甲等级评审条款。
 * 阈值取自项目目录 lab_items（ref_low/ref_high/crit_low/crit_high），
 * 本引擎只做确定性比较，不做任何诊疗建议；AI 不自主出报告。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 状态枚举
// ---------------------------------------------------------------------------

export type LabRequestStatus =
  | 'requested'
  | 'accepted'
  | 'specimen_collected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type SpecimenStatus =
  | 'registered'
  | 'collected'
  | 'received'
  | 'rejected'
  | 'tested';

export type ReportStatus =
  | 'draft'
  | 'reviewing'
  | 'approved'
  | 'published'
  | 'returned';

export type AbnormalFlag = 'H' | 'L' | 'HH' | 'LL' | 'N';

// ---------------------------------------------------------------------------
// 状态机转移表
// ---------------------------------------------------------------------------

/**
 * 标本状态转移：
 *  registered -> collected（采集）
 *  collected  -> received（签收）
 *  registered / collected -> rejected（拒收，未上机前均可拒）
 *  received   -> tested（上机检测完成）
 */
export const SPECIMEN_TRANSITIONS: Record<SpecimenStatus, SpecimenStatus[]> = {
  registered: ['collected', 'rejected'],
  collected: ['received', 'rejected'],
  received: ['tested'],
  rejected: [],
  tested: [],
};

/**
 * 报告状态转移：
 *  draft     -> reviewing（提交审核）
 *  reviewing -> approved（审核通过）/ returned（退回录入）
 *  returned  -> reviewing（修改后重新提交）
 *  approved  -> published（发布）
 */
export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ['reviewing'],
  reviewing: ['approved', 'returned'],
  approved: ['published'],
  returned: ['reviewing'],
  published: [],
};

/** 通用转移判定：from 是否可转移到 to。未知 from 一律 false。 */
export function canTransition<T extends string>(
  map: Record<T, T[]>,
  from: T,
  to: T,
): boolean {
  const allowed = map[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

// ---------------------------------------------------------------------------
// 项目结果判定
// ---------------------------------------------------------------------------

export interface ItemRange {
  refLow: number | null;
  refHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
}

export interface EvaluateResult {
  value: string;
  numericValue: number | null;
  abnormalFlag: AbnormalFlag;
  isCritical: boolean;
}

/**
 * 对单个项目原始结果做确定性判定。
 *
 * 数值可解析时判定顺序（先危急后异常，边界用严格不等号，等于阈值不报警）：
 *   critLow 非空且 v < critLow   -> LL，危急
 *   critHigh 非空且 v > critHigh -> HH，危急
 *   refLow 非空且 v < refLow     -> L
 *   refHigh 非空且 v > refHigh   -> H
 *   否则                         -> N
 *
 * 非数值结果（无法 parse / 空串）：numericValue=null、flag=N、isCritical=false，
 * value 原样保留（如形态学描述、凝集反应等文本结果）。
 */
export function evaluateItem(item: ItemRange, rawValue: string): EvaluateResult {
  const text = rawValue == null ? '' : String(rawValue);
  const trimmed = text.trim();
  const n = Number(trimmed);
  if (trimmed === '' || !Number.isFinite(n)) {
    return { value: text, numericValue: null, abnormalFlag: 'N', isCritical: false };
  }

  if (item.critLow != null && n < item.critLow) {
    return { value: text, numericValue: n, abnormalFlag: 'LL', isCritical: true };
  }
  if (item.critHigh != null && n > item.critHigh) {
    return { value: text, numericValue: n, abnormalFlag: 'HH', isCritical: true };
  }
  if (item.refLow != null && n < item.refLow) {
    return { value: text, numericValue: n, abnormalFlag: 'L', isCritical: false };
  }
  if (item.refHigh != null && n > item.refHigh) {
    return { value: text, numericValue: n, abnormalFlag: 'H', isCritical: false };
  }
  return { value: text, numericValue: n, abnormalFlag: 'N', isCritical: false };
}

// ---------------------------------------------------------------------------
// 职责分离
// ---------------------------------------------------------------------------

/**
 * 报告审核职责分离：录入人与审核人不能为同一人。
 * 返回 true 表示通过（二者不同），false 表示违反职责分离（聚合器据此抛 CONFLICT）。
 */
export function assertSeparation(enteredBy: string, reviewerId: string): boolean {
  return enteredBy !== reviewerId;
}
