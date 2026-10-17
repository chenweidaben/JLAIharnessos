/**
 * 健澜科技 jlmedaios - 护士 MUSE 工作台 V5 路由（M283-B）
 *
 * GET  /api/v1/muse-nurse（工作台）
 * GET  /api/v1/muse-nurse/rounds（巡视任务）
 * POST /api/v1/muse-nurse/complete（完成）
 *
 * 权限：muse-nurse:read / muse-nurse:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNurseDailyV5,
  flagHighRiskV5,
  planRoundsV5,
  type RiskPatient,
  type RoundTask,
} from "../aggregators/museNurseV5Aggregator.js";

const taskStore: RoundTask[] = [
  { patientId: "p1", ward: "心内", scheduledHour: 8 },
  { patientId: "p2", ward: "心内", scheduledHour: 6 },
  { patientId: "p3", ward: "心内", scheduledHour: 10 },
];

const patientStore: RiskPatient[] = [
  { patientId: "p1", name: "张三", fallRisk: true, pressureUlcerRisk: false, vitalAbnormal: false },
  { patientId: "p2", name: "李四", fallRisk: false, pressureUlcerRisk: false, vitalAbnormal: false },
  { patientId: "p3", name: "王五", fallRisk: false, pressureUlcerRisk: true, vitalAbnormal: false },
];

export const museNurseV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-nurse",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-nurse:read");
      if (denied) return denied;

      const nurseId = c.query.get("nurseId") ?? "nurse-001";
      return json(ok(buildNurseDailyV5(nurseId, "心内", taskStore, patientStore)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-nurse/rounds",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-nurse:read");
      if (denied) return denied;

      return json(ok({ scheduled: planRoundsV5(taskStore), highRisk: flagHighRiskV5(patientStore) }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-nurse/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-nurse:write");
      if (denied) return denied;

      const body = await c.req.json() as { patientId: string; task: string };
      return json(ok({ completed: true, ...body }));
    },
  },
];
