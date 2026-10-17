/**
 * 健澜科技 jlmedaios - MUSE 跨角色任务流转 V5 路由（M284-B）
 *
 * POST /api/v1/muse-handoff（创建交接）
 * GET  /api/v1/muse-handoff/pending（待接收）
 * POST /api/v1/muse-handoff/close（闭环）
 *
 * 权限：muse-handoff:read / muse-handoff:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseHandoffV5Report,
  closeHandoffV5,
  createHandoffV5,
  routeHandoffV5,
  type Handoff,
} from "../aggregators/museHandoffV5Aggregator.js";

const handoffStore: Handoff[] = [
  createHandoffV5("医生", "药师", "用药相互作用", "华法林+阿司匹林", "调整抗凝方案"),
];

export const museHandoffV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/muse-handoff",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-handoff:write");
      if (denied) return denied;

      const body = await c.req.json() as { fromRole: string; toRole: string; topic: string; context: string; actionRequired: string };
      const handoff = createHandoffV5(body.fromRole, body.toRole, body.topic, body.context, body.actionRequired);
      handoffStore.push(handoff);
      const route = routeHandoffV5(handoff);
      return json(ok({ handoff, route }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-handoff/pending",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-handoff:read");
      if (denied) return denied;

      return json(ok(buildMuseHandoffV5Report(handoffStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-handoff/close",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-handoff:write");
      if (denied) return denied;

      const body = await c.req.json() as { handoffId: string; result: string };
      const idx = handoffStore.findIndex((h) => h.id === body.handoffId);
      if (idx < 0) {
        return json(ok({ found: false }));
      }
      handoffStore[idx] = closeHandoffV5(handoffStore[idx], body.result);
      return json(ok(handoffStore[idx]));
    },
  },
];
