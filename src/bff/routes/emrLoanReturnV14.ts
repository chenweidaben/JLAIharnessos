/**
 * 健澜科技 jlmedaios - 病历借阅归还管理 V14 路由（M534-D，M534 收官）
 *
 * GET  /api/v1/emr-loan-return  （read，auth:true）返回借阅归还基础数据
 * POST /api/v1/emr-loan-return  （auth:true）借阅归还记录 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLoanReturn,
  buildLoanReturnReport,
  recordLoanReturn,
  type LoanReturnInputV14,
} from "../aggregators/emrLoanReturnV14Aggregator.js";

export const emrLoanReturnV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-loan-return",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-loan-return:read");
      if (denied) return denied;
      const loan = buildLoanReturn("REC104", "心内科王医生");
      return json(ok(loan));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-loan-return",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-loan-return:write");
      if (denied) return denied;
      const body = await c.req.json();
      const obj = body as Record<string, unknown>;
      const input: LoanReturnInputV14 = {
        recordId: String(obj?.recordId ?? ""),
        borrowedDate: String(obj?.borrowedDate ?? ""),
        returnedDate: (obj?.returnedDate ?? null) as string | null,
      };
      const result = recordLoanReturn(input);
      const report = buildLoanReturnReport(result);
      return json(ok({ input, result, report }));
    },
  },
];
