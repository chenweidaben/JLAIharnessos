/**
 * 健澜科技 jlmedaios - 推送频控与免打扰 V13 路由（M302-C）
 *
 * GET /api/v1/push-quota?doctorLoad=
 *
 * 权限：push-quota:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDndWindowV13,
  computePushQuotaV13,
  filterWithinQuotaV13,
  type QuotaPushV13,
} from "../aggregators/pushQuotaV13Aggregator.js";

const pushList: QuotaPushV13[] = [
  { experienceId: "e-1", title: "房颤华法林" },
  { experienceId: "e-2", title: "术后低体温" },
  { experienceId: "e-3", title: "阿司匹林相互作用" },
  { experienceId: "e-4", title: "压疮护理" },
  { experienceId: "e-5", title: "抗生素剂量" },
  { experienceId: "e-6", title: "VTE 预防" },
  { experienceId: "e-7", title: "血糖监测" },
  { experienceId: "e-8", title: "疼痛管理" },
  { experienceId: "e-9", title: "营养支持" },
  { experienceId: "e-10", title: "康复锻炼" },
];

export const pushQuotaV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/push-quota",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "push-quota:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorLoad = Number(url.searchParams.get("doctorLoad") ?? "45");
      const quota = computePushQuotaV13(doctorLoad);
      return json(ok({
        doctorLoad,
        quota,
        pushList: filterWithinQuotaV13(pushList, quota),
        dnd: buildDndWindowV13(),
      }));
    },
  },
];
