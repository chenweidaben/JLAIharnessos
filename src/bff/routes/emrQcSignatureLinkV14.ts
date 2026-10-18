/**
 * 健澜科技 jlmedaios - 质控-电子签名联动 V14 路由（M513-A）
 *
 * GET  /api/v1/emr-qc-signature-link  （read，auth:true）返回签名联动数据
 * POST /api/v1/emr-qc-signature-link  （auth:true）检查签名合规性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildSignatureLink,
  buildSignatureLinkReport,
  checkSignatureCompliance,
  type SignatureComplianceRecordV14,
} from "../aggregators/emrQcSignatureLinkV14Aggregator.js";

export const emrQcSignatureLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-signature-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-signature-link:read");
      if (denied) return denied;
      const link = buildSignatureLink("REC001", "张医生", true);
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-signature-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-signature-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: SignatureComplianceRecordV14 = {
        hasContent: Boolean(body?.hasContent),
        hasSignature: Boolean(body?.hasSignature),
        hasTimestamp: Boolean(body?.hasTimestamp),
      };
      const result = checkSignatureCompliance(record);
      const report = buildSignatureLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
