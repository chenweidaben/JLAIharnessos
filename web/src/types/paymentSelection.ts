/**
 * 健澜科技 jlmedaios - 病组选择前端类型（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface SelectionRow {
  id: string; visitId: string;
  drgGroupCode: string | null; drgExpectedPayment: number | null;
  dipPacketCode: string | null; dipScore: number | null; dipPointValue: number | null; dipPayment: number | null;
  selectedPath: string; rationale: string | null;
}
