/**
 * 健澜科技 jlmedaios - 病历自动归档触发 V14 路由（M521-A）
 *
 * GET  /api/v1/emr-qc-auto-archive  （read，auth:true）返回归档触发基础数据
 * POST /api/v1/emr-qc-auto-archive  （auth:true）触发自动归档 + 构建报告
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAutoArchive,
  buildAutoArchiveReport,
  triggerAutoArchive,
  type AutoArchiveConfigV14,
} from "../aggregators/emrQcAutoArchiveV14Aggregator.js";

export const emrQcAutoArchiveV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-auto-archive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-auto-archive:read");
      if (denied) return denied;
      const archive = buildAutoArchive("REC021", "心内科", 35);
      return json(ok(archive));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-auto-archive",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-auto-archive:write");
      if (denied) return denied;
      const body = await c.req.json();
      const record = buildAutoArchive(
        String(body?.recordId ?? "REC021"),
        String(body?.dept ?? "心内科"),
        Number(body?.daysSinceDischarge ?? 0),
      );
      const config: AutoArchiveConfigV14 = {
        archiveAfterDays: Number(body?.config?.archiveAfterDays ?? 30),
        requireQcPass: Boolean(body?.config?.requireQcPass),
        qcPassed: Boolean(body?.config?.qcPassed),
      };
      const result = triggerAutoArchive(record, config);
      const report = buildAutoArchiveReport(result);
      return json(ok({ record, config, result, report }));
    },
  },
];
