/**
 * 健澜科技 jlmedaios - 质控-输血记录联动 V14 路由（M514-B）
 *
 * GET  /api/v1/emr-qc-transfusion-link  （read，auth:true）返回输血联动数据
 * POST /api/v1/emr-qc-transfusion-link  （auth:true）检查输血一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTransfusionLink,
  buildTransfusionLinkReport,
  checkTransfusionConsistency,
  type TransfusionConsistencyRecordV14,
} from "../aggregators/emrQcTransfusionLinkV14Aggregator.js";

export const emrQcTransfusionLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-transfusion-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-transfusion-link:read");
      if (denied) return denied;
      const link = buildTransfusionLink("REC006", "O型", 2);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-transfusion-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-transfusion-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: TransfusionConsistencyRecordV14 = {
        hasConsent: Boolean(body?.hasConsent),
        hasCrossmatch: Boolean(body?.hasCrossmatch),
        hasTransfusionRecord: Boolean(body?.hasTransfusionRecord),
      };
      const result = checkTransfusionConsistency(record);
      const report = buildTransfusionLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
