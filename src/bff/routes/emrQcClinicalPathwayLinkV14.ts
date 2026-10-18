/**
 * 健澜科技 jlmedaios - 质控-临床路径联动 V14 路由（M514-C）
 *
 * GET  /api/v1/emr-qc-clinical-pathway-link  （read，auth:true）返回临床路径联动数据
 * POST /api/v1/emr-qc-clinical-pathway-link  （auth:true）检查临床路径一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildClinicalPathwayLink,
  buildPathwayLinkReport,
  checkPathwayConsistency,
  type PathwayConsistencyRecordV14,
} from "../aggregators/emrQcClinicalPathwayLinkV14Aggregator.js";

export const emrQcClinicalPathwayLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-clinical-pathway-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-clinical-pathway-link:read");
      if (denied) return denied;
      const link = buildClinicalPathwayLink("REC007", "急性阑尾炎路径", "观察期");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-clinical-pathway-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-clinical-pathway-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: PathwayConsistencyRecordV14 = {
        hasPathwayEntry: Boolean(body?.hasPathwayEntry),
        hasPhaseUpdate: Boolean(body?.hasPhaseUpdate),
        hasExitNote: Boolean(body?.hasExitNote),
      };
      const result = checkPathwayConsistency(record);
      const report = buildPathwayLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
