/**
 * 健澜科技 jlmedaios - MANAGER_MUSE 主动式周会简报 V11 路由（M293-D）
 *
 * GET /api/v1/manager-brief 周会简报（query: managerId）
 *
 * 权限：manager-brief:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildManagerBriefV11,
  formatManagerBriefV11,
  prioritizeManagerBriefV11,
  type ApprovalV11,
  type ComplaintV11,
  type FailureHotspotV11,
  type KnowledgeGrowthV11,
  type ManagerKpiV11,
} from "../aggregators/managerBriefV11Aggregator.js";

const kpis: ManagerKpiV11[] = [
  { kpiId: "k1", name: "门诊量", value: 9000, target: 10000 },
  { kpiId: "k2", name: "满意度", value: 92, target: 90 },
];

const complaints: ComplaintV11[] = [
  { complaintId: "c-1", level: "major", title: "排队3小时" },
];

const approvals: ApprovalV11[] = [
  { approvalId: "ap-1", title: "50万设备采购" },
];

const knowledgeGrowth: KnowledgeGrowthV11 = { deltaPct: 18 };

const failureHotspots: FailureHotspotV11[] = [
  { rootCause: "medication_error", count: 12 },
];

export const managerBriefV11Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/manager-brief",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "manager-brief:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const managerId = url.searchParams.get("managerId") ?? "m-001";
      const brief = buildManagerBriefV11(managerId, kpis, complaints, approvals, knowledgeGrowth, failureHotspots);
      return json(ok({
        ...brief,
        items: prioritizeManagerBriefV11(brief.items),
        text: formatManagerBriefV11(brief),
      }));
    },
  },
];
