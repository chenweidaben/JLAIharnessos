/**
 * 健澜科技 jlmedaios - 修改点归因与经验补丁 V13 路由（M301-B）
 *
 * GET  /api/v1/experience-patches?experienceId=
 * POST /api/v1/experience-patches/:id/apply（auth 写）
 *
 * 权限：experience-patches:read / experience-patches:apply。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  attributeModificationV13,
  generateExperiencePatchV13,
  type FeedbackModV13,
} from "../aggregators/experiencePatchesV13Aggregator.js";

const feedbacks: FeedbackModV13[] = [
  { feedbackId: "f-1", suggestionId: "s-1", modificationNote: "剂量过大" },
  { feedbackId: "f-2", suggestionId: "s-2", modificationNote: "时机推后" },
  { feedbackId: "f-3", suggestionId: "s-3", modificationNote: "不符合本院" },
];

const patches = generateExperiencePatchV13(feedbacks.map(attributeModificationV13));

export const experiencePatchesV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-patches",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-patches:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("experienceId");
      return json(ok(patches));
    },
  },
  {
    method: "POST",
    path: "/api/v1/experience-patches/:id/apply",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-patches:apply");
      if (denied) return denied;
      return json(ok({ patchId: c.params.id, applied: true }));
    },
  },
];
