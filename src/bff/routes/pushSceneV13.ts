/**
 * 健澜科技 jlmedaios - 推送时机与场景触发 V13 路由（M302-B）
 *
 * GET /api/v1/push-scene?scene=
 *
 * 权限：push-scene:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPushSceneV13,
  evaluatePushTimingV13,
  filterSceneEligibleV13,
  type PushSceneExpV13,
  type SceneV13,
} from "../aggregators/pushSceneV13Aggregator.js";

const candidates: PushSceneExpV13[] = [
  { experienceId: "e-1", title: "房颤华法林" },
  { experienceId: "e-2", title: "术后低体温" },
];

export const pushSceneV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/push-scene",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "push-scene:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const scene = (url.searchParams.get("scene") ?? "order_write") as SceneV13;
      const score = evaluatePushTimingV13(scene);
      if (!filterSceneEligibleV13(score)) {
        return json(ok({ scene, score, eligible: false, pushList: [] }));
      }
      return json(ok({
        scene,
        score,
        eligible: true,
        ...buildPushSceneV13(scene, candidates),
      }));
    },
  },
];
