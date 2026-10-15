/**
 * 健澜科技 jlmedaios - 智能随访聚合器（M131-A）
 *
 * AI能力深化：基于出院诊断自动分型（术后/慢病/出院复诊），
 * 按临床规范生成随访计划并驱动患者提醒。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 随访计划类型 */
export type FollowUpPlanType =
  | 'postop_1w'
  | 'postop_1m'
  | 'postop_3m'
  | 'chronic_hypertension_monthly'
  | 'chronic_diabetes_biweekly'
  | 'discharge_revisit';

/** 随访计划状态 */
export type FollowUpStatus = 'pending' | 'sent' | 'completed' | 'cancelled';

/** 随访计划项（纯数据，不含副作用） */
export interface Plan {
  id: string;
  visitId: string;
  patientId: string;
  type: FollowUpPlanType;
  timepoint: string;
  diagnosis: string;
  dueAt: string;
  status: FollowUpStatus;
  description: string;
}

/** 提醒消息（纯数据） */
export interface Reminder {
  id: string;
  patientId: string;
  planId: string;
  channel: 'sms' | 'wechat' | 'app' | 'phone';
  message: string;
  sendAt: string;
  status: 'queued' | 'sent' | 'failed';
}

// ============================================================================
// 临床规则常量
// ============================================================================

/** 术后随访时间点（距手术/出院日） */
const POSTOP_RULES: ReadonlyArray<{ type: FollowUpPlanType; days: number; label: string }> = [
  { type: 'postop_1w', days: 7, label: '术后1周' },
  { type: 'postop_1m', days: 30, label: '术后1月' },
  { type: 'postop_3m', days: 90, label: '术后3月' },
];

/** 高血压慢病随访：每月一次 */
const HYPERTENSION_DAYS = 30;
/** 糖尿病慢病随访：每两周一次 */
const DIABETES_DAYS = 14;
/** 出院复诊：7-14天（取中位10天） */
const DISCHARGE_REVISIT_DAYS = 10;

// ============================================================================
// 纯函数：诊断分型
// ============================================================================

/**
 * AI能力深化：根据诊断文本自动识别随访类型。
 * 规则优先级：术后 > 高血压 > 糖尿病 > 出院复诊。
 */
export function classifyFollowUpType(diagnosis: string): 'postop' | 'chronic_hypertension' | 'chronic_diabetes' | 'discharge' {
  const d = (diagnosis || '').toLowerCase();
  if (/手术|术[后中]|surg|postop|post-op|切除|吻合|置换|移植/.test(d)) return 'postop';
  if (/高血压|hypertension|血压高|hb[pb]|sbp|dbp/.test(d)) return 'chronic_hypertension';
  if (/糖尿病|diabet|血糖|hba1c|空腹血糖/.test(d)) return 'chronic_diabetes';
  return 'discharge';
}

// ============================================================================
// 纯函数：日期工具
// ============================================================================

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) throw new Error(`日期非法: ${isoDate}`);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function makeId(prefix: string, visitId: string, type: string): string {
  // 纯函数内确定性 ID（无 crypto 依赖，便于测试断言）
  return `${prefix}_${visitId.slice(0, 8)}_${type}`;
}

// ============================================================================
// 纯函数：生成随访计划
// ============================================================================

/**
 * AI能力深化：根据就诊ID、诊断、出院日期自动生成随访计划列表。
 *
 * @param visitId       就诊ID（用于ID派生）
 * @param diagnosis     出院诊断文本
 * @param dischargeDate 出院/手术日期（ISO 8601）
 * @returns 随访计划数组
 */
export function generateFollowUpPlan(
  visitId: string,
  diagnosis: string,
  dischargeDate: string,
): Plan[] {
  if (!visitId) throw new Error('visitId 不能为空');
  if (!dischargeDate) throw new Error('dischargeDate 不能为空');
  new Date(dischargeDate).getTime(); // 触发非法日期异常

  const category = classifyFollowUpType(diagnosis);
  const plans: Plan[] = [];

  if (category === 'postop') {
    for (const rule of POSTOP_RULES) {
      plans.push({
        id: makeId('fup', visitId, rule.type),
        visitId,
        patientId: '',
        type: rule.type,
        timepoint: rule.label,
        diagnosis,
        dueAt: addDays(dischargeDate, rule.days),
        status: 'pending',
        description: `${rule.label}随访：复查切口/功能恢复/用药依从性`,
      });
    }
  } else if (category === 'chronic_hypertension') {
    plans.push({
      id: makeId('fup', visitId, 'chronic_hypertension_monthly'),
      visitId,
      patientId: '',
      type: 'chronic_hypertension_monthly',
      timepoint: '每月',
      diagnosis,
      dueAt: addDays(dischargeDate, HYPERTENSION_DAYS),
      status: 'pending',
      description: '高血压月度随访：居家血压记录、靶器官损害评估、用药调整',
    });
  } else if (category === 'chronic_diabetes') {
    plans.push({
      id: makeId('fup', visitId, 'chronic_diabetes_biweekly'),
      visitId,
      patientId: '',
      type: 'chronic_diabetes_biweekly',
      timepoint: '每两周',
      diagnosis,
      dueAt: addDays(dischargeDate, DIABETES_DAYS),
      status: 'pending',
      description: '糖尿病双周随访：空腹/餐后血糖、HbA1c趋势、低血糖事件筛查',
    });
  } else {
    plans.push({
      id: makeId('fup', visitId, 'discharge_revisit'),
      visitId,
      patientId: '',
      type: 'discharge_revisit',
      timepoint: '出院后7-14天',
      diagnosis,
      dueAt: addDays(dischargeDate, DISCHARGE_REVISIT_DAYS),
      status: 'pending',
      description: '出院复诊：门诊复查、康复评估、用药确认',
    });
  }

  return plans;
}

// ============================================================================
// 纯函数：发送随访提醒
// ============================================================================

/**
 * AI能力深化：根据计划内容生成患者提醒消息（纯函数，不真正发送）。
 *
 * @param patientId 患者ID
 * @param plan      随访计划
 * @returns 提醒消息对象
 */
export function sendFollowUpReminder(patientId: string, plan: Plan): Reminder {
  if (!patientId) throw new Error('patientId 不能为空');
  if (!plan) throw new Error('plan 不能为空');

  const dueDate = new Date(plan.dueAt);
  const dueStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;

  const message = `【健澜医院】尊敬的患者您好，您的${plan.timepoint}随访计划将于 ${dueStr} 到期，请按时复诊或居家完成健康数据上报。如有疑问请联系主管医生。`;

  return {
    id: `rem_${plan.id}`,
    patientId,
    planId: plan.id,
    channel: 'app',
    message,
    sendAt: new Date().toISOString(),
    status: 'queued',
  };
}

// ============================================================================
// 纯函数：完成随访记录
// ============================================================================

/**
 * AI能力深化：将计划标记为已完成，返回更新后的计划（不可变更新）。
 */
export function completeFollowUpPlan(plan: Plan, completedAt?: string): Plan {
  return {
    ...plan,
    status: 'completed',
    completedAt: completedAt ?? new Date().toISOString(),
  } as Plan & { completedAt: string };
}

// ============================================================================
// 视图层（供路由调用）
// ============================================================================

export class FollowUpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'FollowUpError';
  }
}
const badRequest = (m: string) => new FollowUpError(400, 'BAD_REQUEST', m);
const forbidden = (m: string) => new FollowUpError(403, 'FORBIDDEN', m);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 患者侧：查询本人随访计划。
 * 支持 query 参数：diagnosis、dischargeDate（演示模式下即时生成）。
 */
export async function patientFollowUpsView(
  auth: { id: string; permissions: string[] },
  query: { diagnosis?: string; dischargeDate?: string },
): Promise<{ plans: Plan[]; reminders: Reminder[] }> {
  if (!auth.permissions.includes('follow_up:view') && !auth.permissions.includes('patient_portal:view')) {
    throw forbidden('缺少随访查看权限');
  }
  const diagnosis = query.diagnosis ?? '';
  const dischargeDate = query.dischargeDate ?? new Date().toISOString();
  const visitId = `demo-${auth.id.slice(0, 8)}`;
  const plans = generateFollowUpPlan(visitId, diagnosis, dischargeDate).map((p) => ({
    ...p,
    patientId: auth.id,
  }));
  const reminders = plans.map((p) => sendFollowUpReminder(auth.id, p));
  return { plans, reminders };
}

/**
 * 医生侧：查询分管患者随访计划。
 * 支持 query 参数：patientId、diagnosis、dischargeDate。
 */
export async function doctorFollowUpsView(
  auth: { id: string; permissions: string[]; rawRoles?: string[] },
  query: { patientId?: string; diagnosis?: string; dischargeDate?: string },
): Promise<{ plans: Plan[]; total: number }> {
  if (!auth.permissions.includes('follow_up:view') && !auth.permissions.includes('follow_up:manage')) {
    throw forbidden('缺少随访查看权限');
  }
  const patientId = query.patientId ?? '';
  if (patientId && !UUID_RE.test(patientId)) throw badRequest('patientId 格式非法');
  const diagnosis = query.diagnosis ?? '';
  const dischargeDate = query.dischargeDate ?? new Date().toISOString();
  const visitId = `doc-${auth.id.slice(0, 8)}-${patientId.slice(0, 8) || 'x'}`;
  const plans = generateFollowUpPlan(visitId, diagnosis, dischargeDate).map((p) => ({
    ...p,
    patientId: patientId || auth.id,
  }));
  return { plans, total: plans.length };
}
