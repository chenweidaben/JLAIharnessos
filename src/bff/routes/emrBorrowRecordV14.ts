/**
 * 健澜科技 jlmedaios - 病历借阅登记管理 V14 路由（M540-B）
 *
 * GET  /api/v1/emr-borrow-record  （read，auth:true）返回借阅登记基础数据
 * POST /api/v1/emr-borrow-record  （auth:true）借阅登记 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildBorrowRecord,
  buildBorrowRecordReport,
  registerBorrow,
  type BorrowRecordInputV14,
} from "../aggregators/emrBorrowRecordV14Aggregator.js";

export const emrBorrowRecordV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-borrow-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-borrow-record:read");
      if (denied) return denied;
      const base = buildBorrowRecord("REC701", "心内科王医生");
      return json(ok(base));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-borrow-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-borrow-record:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: BorrowRecordInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        borrower: String(obj?.borrower ?? ""),
        dept: String(obj?.dept ?? ""),
        borrowDate: String(obj?.borrowDate ?? ""),
      };
      const result = registerBorrow(input);
      const report = buildBorrowRecordReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
