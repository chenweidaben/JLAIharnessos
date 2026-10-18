/**
 * 健澜科技 jlmedaios - 质控-患者投诉联动 V14 路由（M515-C）
 *
 * GET  /api/v1/emr-qc-complaint-link  （read，auth:true）返回投诉联动数据
 * POST /api/v1/emr-qc-complaint-link  （auth:true）检查投诉一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildComplaintLink,
  buildComplaintLinkReport,
  checkComplaintConsistency,
  type ComplaintConsistencyRecordV14,
} from "../aggregators/emrQcComplaintLinkV14Aggregator.js";

export const emrQcComplaintLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-complaint-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-complaint-link:read");
      if (denied) return denied;
      const link = buildComplaintLink("REC011", "服务态度", "已处理");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-complaint-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-complaint-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: ComplaintConsistencyRecordV14 = {
        hasComplaintRecord: Boolean(body?.hasComplaintRecord),
        hasInvestigation: Boolean(body?.hasInvestigation),
        hasFeedback: Boolean(body?.hasFeedback),
      };
      const result = checkComplaintConsistency(record);
      const report = buildComplaintLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
