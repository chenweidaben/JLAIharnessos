/**
 * 健澜科技 jlmedaios - 质控-病案首页联动 V14 路由（M516-A）
 *
 * GET  /api/v1/emr-qc-homepage-link  （read，auth:true）返回病案首页联动数据
 * POST /api/v1/emr-qc-homepage-link  （auth:true）检查病案首页一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHomepageLink,
  buildHomepageLinkReport,
  checkHomepageConsistency,
  type HomepageConsistencyRecordV14,
} from "../aggregators/emrQcHomepageLinkV14Aggregator.js";

export const emrQcHomepageLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-homepage-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-homepage-link:read");
      if (denied) return denied;
      const link = buildHomepageLink("REC013", 3, 1);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-homepage-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-homepage-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: HomepageConsistencyRecordV14 = {
        hasDiagnosis: Boolean(body?.hasDiagnosis),
        hasSurgery: Boolean(body?.hasSurgery),
        hasDischargeInfo: Boolean(body?.hasDischargeInfo),
      };
      const result = checkHomepageConsistency(record);
      const report = buildHomepageLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
