/**
 * 健澜科技 jlmedaios - 病历借阅登记 V14 路由（M482-B）
 *
 * GET /api/v1/emr-borrow-register  （read，auth:true）返回借阅登记列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBorrowRecord, checkOverdueReturn, type BorrowRecordV14 } from "../aggregators/emrBorrowRegisterV14Aggregator.js";

const demoRecords: BorrowRecordV14[] = [
  buildBorrowRecord("MR001", "李医生", 5),
  buildBorrowRecord("MR002", "王医生", 10),
  buildBorrowRecord("MR003", "张医生", 3),
];

const demoChecks = demoRecords.map((r) => ({
  record: r,
  overdue: checkOverdueReturn(r.borrowDays, 7),
}));

export const emrBorrowRegisterV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-borrow-register",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-borrow-register:read");
      if (denied) return denied;
      return json(ok({ records: demoRecords, checks: demoChecks }));
    },
  },
];
