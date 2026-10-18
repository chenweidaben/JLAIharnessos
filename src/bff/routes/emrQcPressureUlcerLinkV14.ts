/**
 * 健澜科技 jlmedaios - 质控-压疮风险评估联动 V14 路由（M517-C）
 *
 * GET  /api/v1/emr-qc-pressure-ulcer-link  （read，auth:true）返回压疮评估联动数据
 * POST /api/v1/emr-qc-pressure-ulcer-link  （auth:true）检查压疮评估一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPressureUlcerLink,
  buildPressureUlcerLinkReport,
  checkPressureUlcerConsistency,
  type PressureUlcerConsistencyRecordV14,
} from "../aggregators/emrQcPressureUlcerLinkV14Aggregator.js";

export const emrQcPressureUlcerLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-pressure-ulcer-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pressure-ulcer-link:read");
      if (denied) return denied;
      const link = buildPressureUlcerLink("REC019", 14, "中度风险");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-pressure-ulcer-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pressure-ulcer-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: PressureUlcerConsistencyRecordV14 = {
        hasInitial: Boolean(body?.hasInitial),
        hasReassessment: Boolean(body?.hasReassessment),
        hasPrevention: Boolean(body?.hasPrevention),
      };
      const result = checkPressureUlcerConsistency(record);
      const report = buildPressureUlcerLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
