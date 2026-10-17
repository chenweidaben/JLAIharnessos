/**
 * 健澜科技 jlmedaios - 继任者经验传承交接 V13 路由（M297-A）
 *
 * GET  /api/v1/handover?toDoctorId=  收件箱
 * POST /api/v1/handover/:id/confirm  确认（auth）
 *
 * 权限：handover:read / handover:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHandoverInboxV13,
  type HandoverPackageV13,
} from "../aggregators/handoverV13Aggregator.js";

const packages: HandoverPackageV13[] = [
  {
    packageId: "pkg-zhang-li",
    fromDoctor: "zhang",
    toDoctor: "li",
    experienceCount: 12,
    freshCount: 8,
    staleCount: 2,
    adaptationNote: "经验整体新鲜，可直接参考",
    status: "pending",
  },
  {
    packageId: "pkg-wang-zhao",
    fromDoctor: "wang",
    toDoctor: "zhao",
    experienceCount: 5,
    freshCount: 1,
    staleCount: 3,
    adaptationNote: "部分经验已过期，建议先复核再复用",
    status: "pending",
  },
];

export const handoverV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/handover",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "handover:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const toDocId = url.searchParams.get("toDoctorId") ?? "li";
      return json(ok(buildHandoverInboxV13(toDocId, packages)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/handover/:id/confirm",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "handover:write");
      if (denied) return denied;
      return json(ok({ packageId: c.params.id, confirmed: true }));
    },
  },
];
