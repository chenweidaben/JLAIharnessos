/**
 * 健澜科技 jlmedaios - 个人质控档案自动生成 V14 路由（M518-B）
 *
 * GET  /api/v1/emr-qc-personal-profile  （read，auth:true）返回个人档案基础数据
 * POST /api/v1/emr-qc-personal-profile  （auth:true）生成个人档案统计 + 摘要
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPersonalProfile,
  buildPersonalProfileSummary,
  generatePersonalProfile,
  type PersonalProfileStatsV14,
} from "../aggregators/emrQcPersonalProfileV14Aggregator.js";

export const emrQcPersonalProfileV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-personal-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-personal-profile:read");
      if (denied) return denied;
      const profile = buildPersonalProfile("张医生", "心内科", 120);
      return json(ok(profile));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-personal-profile",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-personal-profile:write");
      if (denied) return denied;
      const body = await c.req.json();
      const profile = buildPersonalProfile(
        String(body?.doctor ?? "张医生"),
        String(body?.dept ?? "心内科"),
        Number(body?.totalRecords ?? 120),
      );
      const stats: PersonalProfileStatsV14 = {
        passRate: Number(body?.stats?.passRate ?? 0),
        defectCount: Number(body?.stats?.defectCount ?? 0),
        complianceRate: Number(body?.stats?.complianceRate ?? 0),
      };
      const result = generatePersonalProfile(profile, stats);
      const summary = buildPersonalProfileSummary(result);
      return json(ok({ profile, stats, result, summary }));
    },
  },
];
