/**
 * 健澜科技 jlmedaios - 续方流转前端类型（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface RenewalItem {
  id: string;
  rxNo: string;
  status: string;
  isRenewal: boolean;
  totalFee: string | null;
  createdAt: string;
}
