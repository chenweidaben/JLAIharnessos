/**
 * 健澜科技 jlmedaios - 飞轮改进任务闭环 V13 路由（M307-A）
 *
 * GET /api/v1/flywheel-tasks
 * POST /api/v1/flywheel-tasks
 *
 * 权限：flywheel-tasks:read / flywheel-tasks:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assignTaskV13,
  createFlywheelActionTaskV13,
  trackTaskProgressV13,
  type FlywheelTaskV13,
} from "../aggregators/flywheelTaskV13Aggregator.js";

const store: FlywheelTaskV13[] = [
  assignTaskV13(createFlywheelActionTaskV13("开跨科病例讨论会", 7.5, 5), "dr-zhang"),
];

export const flywheelTaskV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/flywheel-tasks",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-tasks:read");
      if (denied) return denied;
      return json(ok(store.map((t) => ({ ...t, progress: trackTaskProgressV13(t) }))));
    },
  },
  {
    method: "POST",
    path: "/api/v1/flywheel-tasks",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "flywheel-tasks:write");
      if (denied) return denied;
      const body = await c.req.json() as { title: string; expectedGain: number; owner: string; totalSubItems: number };
      const task = assignTaskV13(
        createFlywheelActionTaskV13(body.title, body.expectedGain, body.totalSubItems),
        body.owner,
      );
      store.push(task);
      return json(ok(task));
    },
  },
];
