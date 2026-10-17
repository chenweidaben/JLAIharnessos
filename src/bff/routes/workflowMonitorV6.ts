/**
 * 健澜科技 jlmedaios - 流程监控与效率分析 V6 路由（M288-D）
 *
 * GET  /api/v1/workflow/monitor 总览
 * GET  /api/v1/workflow/monitor/:defId 详情
 * POST /api/v1/workflow/monitor/snapshot 写快照
 *
 * 权限：workflow-monitor:read / workflow-monitor:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWfMonitorV6,
  computeWfEfficiencyV6,
  computeWfSlaV6,
  type WfDailyMetric,
  type WfInstanceMetric,
} from "../aggregators/workflowMonitorV6Aggregator.js";

const metricStore: WfDailyMetric[] = [
  { defId: "def-1", instanceCnt: 100, avgMinutes: 25, overdueCnt: 5, approvalCnt: 80, rejectCnt: 20 },
  { defId: "def-2", instanceCnt: 50, avgMinutes: 60, overdueCnt: 10, approvalCnt: 30, rejectCnt: 20 },
];

const instanceStore: WfInstanceMetric[] = [
  { instanceId: "i1", defId: "def-1", minutes: 20, overdue: false, action: "approved" },
  { instanceId: "i2", defId: "def-1", minutes: 30, overdue: false, action: "approved" },
];

export const workflowMonitorV6Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/workflow/monitor",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow-monitor:read");
      if (denied) return denied;

      return json(ok({
        overview: buildWfMonitorV6(metricStore),
        perDef: metricStore.map((m) => ({
          ...m,
          efficiency: computeWfEfficiencyV6(m),
        })),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/workflow/monitor/:defId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow-monitor:read");
      if (denied) return denied;

      const defId = c.params.defId;
      const m = metricStore.find((x) => x.defId === defId);
      if (!m) {
        return json(ok({ found: false }));
      }
      const instances = instanceStore.filter((i) => i.defId === defId);
      return json(ok({
        defId,
        daily: m,
        sla: computeWfSlaV6(instances),
        efficiency: computeWfEfficiencyV6(m),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/workflow/monitor/snapshot",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "workflow-monitor:write");
      if (denied) return denied;

      return json(ok({
        snapshotAt: Date.now(),
        overview: buildWfMonitorV6(metricStore),
      }));
    },
  },
];
