/**
 * 健澜科技 jlmedaios - SBAR 交接类型（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type SbarStatus = 'pending' | 'received' | 'closed';

export interface SbarHandoff {
  id: string;
  visitId: string;
  fromUnit: string;
  toUnit: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  status: SbarStatus;
  receiverUuid: string | null;
  receivedAt: string | null;
  handoffBy: string;
  createdAt: string;
}

export interface CreateInput {
  visitId: string;
  fromUnit: string;
  toUnit: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}
