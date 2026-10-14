/**
 * 健澜科技 jlmedaios - 质控整改闭环看板前端类型（215）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 状态机：open 待整改 → fixed 已整改待复核 → reviewed 复核通过 → closed 关闭 */
export type QcRectificationStatus = 'open' | 'fixed' | 'reviewed' | 'closed';

export interface QcRectification {
  id: string;
  issueId: string | null;
  assigneeId: string | null;
  status: QcRectificationStatus;
  note: string | null;
  createdAt: string;
  closedAt: string | null;
}

export interface CreateRectificationReq {
  issueId?: string;
  assigneeId?: string;
  note?: string;
}

export interface TransitionRectificationReq {
  note?: string;
}

/** 看板列定义（与状态机同序）。 */
export const BOARD_COLUMNS: { value: QcRectificationStatus; label: string; color: string }[] = [
  { value: 'open', label: '待整改', color: 'default' },
  { value: 'fixed', label: '已整改待复核', color: 'processing' },
  { value: 'reviewed', label: '复核通过', color: 'warning' },
  { value: 'closed', label: '已关闭', color: 'success' },
];

/** 卡片上的流转按钮文案：当前状态 → 下一动作。 */
export const NEXT_ACTION_LABEL: Record<QcRectificationStatus, string> = {
  open: '提交整改',
  fixed: '复核通过',
  reviewed: '关闭',
  closed: '已关闭',
};
