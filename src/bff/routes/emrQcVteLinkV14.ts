/**
 * 健澜科技 jlmedaios - 质控-VTE预防联动 V14 路由（M515-B）
 *
 * GET  /api/v1/emr-qc-vte-link  （read，auth:true）返回VTE联动数据
 * POST /api/v1/emr-qc-vte-link  （auth:true）检查VTE一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildVteLink,
  buildVteLinkReport,
  checkVteConsistency,
  type VteConsistencyRecordV14,
} from "../aggregators/emrQcVteLinkV14Aggregator.js";

export const emrQcVteLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-vte-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-vte-link:read");
      if (denied) return denied;
      const link = buildVteLink("REC010", "高危", ["气压治疗", "抗凝药物"]);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-vte-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-vte-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: VteConsistencyRecordV14 = {
        hasAssessment: Boolean(body?.hasAssessment),
        hasPrevention: Boolean(body?.hasPrevention),
        hasEducation: Boolean(body?.hasEducation),
      };
      const result = checkVteConsistency(record);
      const report = buildVteLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
