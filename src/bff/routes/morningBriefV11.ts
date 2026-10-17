/**
 * 健澜科技 jlmedaios - DOCTOR_MUSE 主动式晨间简报 V11 路由（M293-A）
 *
 * GET /api/v1/morning-brief 晨间简报（query: doctorId）
 *
 * 权限：morning-brief:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMorningBriefV11,
  formatBriefV11,
  prioritizeBriefV11,
  type ApprovalV11,
  type CriticalAlertV11,
  type MorningScheduleV11,
  type PendingCaseV11,
  type WeightDeltaV11,
} from "../aggregators/morningBriefV11Aggregator.js";

const schedule: MorningScheduleV11[] = [
  { surgeryId: "s-1", title: "冠脉搭桥" },
  { surgeryId: "s-2", title: "腹腔镜胆囊切除" },
];

const alerts: CriticalAlertV11[] = [
  { alertId: "a-1", title: "ICU 患者血压骤降" },
];

const pendingCases: PendingCaseV11[] = [
  { caseId: "c-1", title: "周三失败案例复盘" },
];

const approvals: ApprovalV11[] = [
  { approvalId: "ap-1", title: "50万设备采购" },
];

const weightDeltas: WeightDeltaV11[] = [
  { ruleId: "r-1", delta: 0.05 },
  { ruleId: "r-2", delta: -0.03 },
];

export const morningBriefV11Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/morning-brief",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "morning-brief:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "d-001";
      const brief = buildMorningBriefV11(doctorId, schedule, alerts, pendingCases, approvals, weightDeltas);
      return json(ok({
        ...brief,
        items: prioritizeBriefV11(brief.items),
        text: formatBriefV11(brief),
      }));
    },
  },
];
