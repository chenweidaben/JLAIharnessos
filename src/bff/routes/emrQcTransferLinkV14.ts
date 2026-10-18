/**
 * 健澜科技 jlmedaios - 质控-转科记录联动 V14 路由（M516-C）
 *
 * GET  /api/v1/emr-qc-transfer-link  （read，auth:true）返回转科联动数据
 * POST /api/v1/emr-qc-transfer-link  （auth:true）检查转科一致性
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTransferLink,
  buildTransferLinkReport,
  checkTransferConsistency,
  type TransferConsistencyRecordV14,
} from "../aggregators/emrQcTransferLinkV14Aggregator.js";

export const emrQcTransferLinkV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-transfer-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-transfer-link:read");
      if (denied) return denied;
      const link = buildTransferLink("REC015", "消化内科", "普外科");
      return json(ok(link));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-transfer-link",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-transfer-link:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record: TransferConsistencyRecordV14 = {
        hasTransferRecord: Boolean(body?.hasTransferRecord),
        hasHandover: Boolean(body?.hasHandover),
        hasReceiveNote: Boolean(body?.hasReceiveNote),
      };
      const result = checkTransferConsistency(record);
      const report = buildTransferLinkReport(result);
      return json(ok({ result, report }));
    },
  },
];
