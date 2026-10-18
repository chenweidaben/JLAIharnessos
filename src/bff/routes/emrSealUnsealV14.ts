/**
 * 健澜科技 jlmedaios - 病历封存解封 V14 路由（M482-C）
 *
 * POST /api/v1/emr-seal-unseal  （auth:true，body 用 await c.req.json()）执行封存/解封操作
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { sealRecord, unsealRecord } from "../aggregators/emrSealUnsealV14Aggregator.js";

export const emrSealUnsealV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-seal-unseal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-seal-unseal:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        medicalRecordId?: string;
        reason?: string;
        action?: "seal" | "unseal";
      };
      const medicalRecordId = body.medicalRecordId ?? "MR001";
      const reason = body.reason ?? "医疗纠纷";
      if (body.action === "unseal") {
        const sealed = sealRecord(medicalRecordId, reason);
        const unsealed = unsealRecord(sealed);
        return json(ok({ record: unsealed }));
      }
      const sealed = sealRecord(medicalRecordId, reason);
      return json(ok({ record: sealed }));
    },
  },
];
