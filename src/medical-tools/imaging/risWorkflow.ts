/**
 * 健澜科技 jlmedaios - RIS 检查全流程规则引擎（M11-B）
 *
 * 纯函数、确定性、无 I/O、无随机，供 RIS 聚合器调用。覆盖：
 *  1. 检查申请 / 预约 / 报告状态机转移表与 canTransition；
 *  2. DICOM Study Instance UID 确定性生成（基于传入 seed，保持纯函数）；
 *  3. 报告审核职责分离：书写人不得为同一人审核；
 *  4. 报告内容完整性：findings/impression 至少一项非空白方可提交。
 *
 * 医学依据：《放射诊断质量管理规范》、三甲等级评审「双签/职责分离」条款。
 * AI 仅辅助检出，不自主出报告；报告须另一资质人员审核、电子签名后方可发布。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 状态枚举
// ---------------------------------------------------------------------------

export type ImagingRequestStatus =
  | 'requested'
  | 'scheduled'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AppointmentStatus =
  | 'booked'
  | 'arrived'
  | 'done'
  | 'cancelled'
  | 'no_show';

export type ImagingReportStatus =
  | 'draft'
  | 'reviewing'
  | 'approved'
  | 'published'
  | 'returned';

// ---------------------------------------------------------------------------
// 状态机转移表
// ---------------------------------------------------------------------------

/**
 * 检查申请状态转移：
 *  requested  -> scheduled（预约安排）/ cancelled（取消）
 *  scheduled  -> arrived（到检登记）/ cancelled（取消）
 *  arrived    -> in_progress（开始执行）
 *  in_progress -> completed（全部报告发布后由聚合器推进）
 */
export const REQUEST_TRANSITIONS: Record<ImagingRequestStatus, ImagingRequestStatus[]> = {
  requested: ['scheduled', 'cancelled'],
  scheduled: ['arrived', 'cancelled'],
  arrived: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

/**
 * 预约状态转移：
 *  booked  -> arrived（到检 checkin）/ cancelled（取消）
 *  arrived -> done（技师执行生成 study）
 *  booked -> no_show 由业务外部处理，不在本引擎暴露端点
 */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  booked: ['arrived', 'cancelled'],
  arrived: ['done'],
  done: [],
  cancelled: [],
  no_show: [],
};

/**
 * 报告状态转移：
 *  draft     -> reviewing（提交审核）
 *  reviewing -> approved（审核通过）/ returned（退回书写）
 *  returned  -> reviewing（修改后重新提交）
 *  approved  -> published（发布）
 */
export const REPORT_TRANSITIONS: Record<ImagingReportStatus, ImagingReportStatus[]> = {
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
// DICOM Study Instance UID（纯函数：由 seed 确定性派生）
// ---------------------------------------------------------------------------

/** FNV-1a 双路 32 位哈希，将任意 seed 折叠为稳定数字串（同 seed 必同结果）。 */
function seedDigits(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x85ebca6b;
  for (let i = 0; i < seed.length; i += 1) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i * 2654435761), 0x85ebca6b) >>> 0;
  }
  return `${h1}${h2}`;
}

/**
 * 生成 DICOM Study Instance UID。
 * 采用根 OID 2.25（ISO 直接颁发的单个根），后接由 seed 确定性派生的数字串。
 * 纯函数：相同 seed 恒返回相同 UID，便于幂等与测试断言。
 */
export function genStudyUid(seed: string): string {
  const s = seed == null ? '' : String(seed);
  return `2.25.${seedDigits(s)}`;
}

// ---------------------------------------------------------------------------
// 职责分离与报告内容
// ---------------------------------------------------------------------------

/**
 * 报告审核职责分离：书写人与审核人不能为同一人。
 * 返回 true 表示通过（二者不同），false 表示违反职责分离（聚合器据此抛 CONFLICT）。
 */
export function assertSeparation(authorId: string, reviewerId: string): boolean {
  return authorId !== reviewerId;
}

export interface ReportContentShape {
  findings?: string | null;
  impression?: string | null;
}

/**
 * 报告内容完整性：findings 与 impression 至少一个非空白（trim 后非空）方为 true。
 * 聚合器据此拦截空报告提交审核。
 */
export function hasReportContent(report: ReportContentShape): boolean {
  const findings = (report.findings ?? '').trim();
  const impression = (report.impression ?? '').trim();
  return findings.length > 0 || impression.length > 0;
}
