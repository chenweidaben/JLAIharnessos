/**
 * 健澜科技 jlmedaios - 配药任务纯函数（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 支付成功后是否应建配药任务。 */
export function shouldCreateTask(paymentStatus: string, prescriptionStatus: string): boolean {
  return paymentStatus === 'paid' && prescriptionStatus === 'approved';
}

/** 任务状态机：pending → completed。其他返回 null。 */
export function nextTaskStatus(current: string, action: string): string | null {
  if (action === 'complete' && current === 'pending') return 'completed';
  if (action === 'cancel' && current === 'pending') return 'cancelled';
  return null;
}
