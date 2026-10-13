/**
 * 健澜科技 jlmedaios - MDT 类型（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface MdtConsult {
  id: string;
  visitId: string;
  title: string;
  reason: string;
  departments: string[];
  scheduledAt: string | null;
  status: 'requested' | 'scheduled' | 'held' | 'concluded' | 'cancelled';
  minutes: string | null;
  conclusion: string | null;
  requestedBy: string;
  createdAt: string;
}

export interface CreateMdtInput {
  visitId: string;
  title: string;
  reason: string;
  departments: string[];
}
