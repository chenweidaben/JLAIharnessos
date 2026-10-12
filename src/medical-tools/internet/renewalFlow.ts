/**
 * 健澜科技 jlmedaios - 续方流转纯函数（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface RenewEligibilityInput {
  sessionStatus: string;
  hasPriorRx: boolean;
  isEmergency?: boolean;
}

export function canRenew(input: RenewEligibilityInput): boolean {
  return input.sessionStatus === 'completed' && input.hasPriorRx && !input.isEmergency;
}

/** 状态机推导：当前 → 下一合法状态。null 表示非法跳转。 */
export function nextStatus(current: string, action: string): string | null {
  switch (action) {
    case 'prescribe':
      return current === 'consult_completed' ? 'approved' : null;
    case 'pay':
      return current === 'approved' ? 'paid' : null;
    case 'dispense':
      return current === 'paid' ? 'ready_dispense' : null;
    default:
      return null;
  }
}
