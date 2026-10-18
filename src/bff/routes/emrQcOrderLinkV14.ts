/**
 * 健澜科技 jlmedaios - 质控-医嘱联动 V14 路由（M513-B）
 *
 * GET  /api/v1/emr-qc-order-link  （read，auth:true）返回医嘱联动数据
 * POST /api/v1/emr-qc-order-link  （auth:true）检查医嘱一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOrderLink,
  buildOrderLinkReport,
  checkOrderConsistency,
  type OrderConsistencyRecordV14,
} from "../aggregators/emrQcOrderLinkV14Aggregator.js";

export const emrQcOrderLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-order-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-order-link:read");
      if (denied) return denied;
      const link = buildOrderLink("REC002", 5, "已审核");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-order-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-order-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: OrderConsistencyRecordV14 = {
        hasDiagnosis: Boolean(body?.hasDiagnosis),
        hasOrder: Boolean(body?.hasOrder),
        hasSignature: Boolean(body?.hasSignature),
      };
      const result = checkOrderConsistency(record);
      const report = buildOrderLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
