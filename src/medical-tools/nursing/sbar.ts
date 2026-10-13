/**
 * 健澜科技 jlmedaios - SBAR 交接纯函数（M73-A）
 * 完整性 / 关闭判定 / 状态流转。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type SbarStatus = 'pending' | 'received' | 'closed';

export interface SbarParts {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

/** 四段均非空才算完整。 */
export function isComplete(s: SbarParts): boolean {
  return Boolean(
    s.situation.trim() && s.background.trim() && s.assessment.trim() && s.recommendation.trim(),
  );
}

/** 必须已 received 且接收方存在才能 closed。 */
export function canClose(status: SbarStatus, receiverUuid: string | null): boolean {
  return status === 'received' && Boolean(receiverUuid);
}

/** 状态机：pending -> received -> closed。非法跳转返回原值。 */
export function nextStatus(current: SbarStatus, event: 'receive' | 'close'): SbarStatus {
  if (event === 'receive' && current === 'pending') return 'received';
  if (event === 'close' && current === 'received') return 'closed';
  return current;
}
