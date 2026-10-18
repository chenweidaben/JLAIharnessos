/**
 * 健澜科技 jlmedaios - 质控-会诊记录联动 V14 路由（M516-D，M516 收官）
 *
 * GET  /api/v1/emr-qc-consult-link  （read，auth:true）返回会诊联动数据
 * POST /api/v1/emr-qc-consult-link  （auth:true）检查会诊一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildConsultLink,
  buildConsultLinkReport,
  checkConsultConsistency,
  type ConsultConsistencyRecordV14,
} from "../aggregators/emrQcConsultLinkV14Aggregator.js";

export const emrQcConsultLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-consult-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-consult-link:read");
      if (denied) return denied;
      const link = buildConsultLink("REC016", "心内科", "院内会诊");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-consult-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-consult-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: ConsultConsistencyRecordV14 = {
        hasRequest: Boolean(body?.hasRequest),
        hasOpinion: Boolean(body?.hasOpinion),
        hasReply: Boolean(body?.hasReply),
      };
      const result = checkConsultConsistency(record);
      const report = buildConsultLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
