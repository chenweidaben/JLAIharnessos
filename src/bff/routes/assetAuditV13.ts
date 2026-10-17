/**
 * 健澜科技 jlmedaios - 资产盘点周期 V13 路由（M305-B）
 *
 * GET /api/v1/asset-audit
 *
 * 权限：asset-audit:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAuditChecklistV13,
  notifyDepartmentHeadV13,
  scheduleAssetAuditV13,
  type AuditExpV13,
} from "../aggregators/assetAuditV13Aggregator.js";

const stale: AuditExpV13[] = [
  { experienceId: "e-1", title: "房颤华法林", assetScore: 71 },
  { experienceId: "e-2", title: "旧版阿司匹林", assetScore: 15 },
  { experienceId: "e-3", title: "旧版降压", assetScore: 30 },
];

export const assetAuditV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/asset-audit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "asset-audit:read");
      if (denied) return denied;
      const checklist = buildAuditChecklistV13(stale);
      return json(ok({
        needsAudit: scheduleAssetAuditV13(120),
        checklist,
        notice: notifyDepartmentHeadV13(checklist),
      }));
    },
  },
];
