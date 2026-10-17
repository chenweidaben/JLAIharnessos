/**
 * 健澜科技 jlmedaios - 失败案例根因复盘与防再发机制 V10 路由（M292-A）
 *
 * POST /api/v1/failure/postmortem 提交失败事件
 * GET  /api/v1/failure/postmortem 复盘榜（query: dept）
 *
 * 权限：failure-postmortem:write / failure-postmortem:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  analyzeFailureRootCauseV10,
  buildFailurePostmortemV10,
  buildPreventionPlanV10,
  type FailureEventV10,
} from "../aggregators/failurePostmortemV10Aggregator.js";

const failureStore: FailureEventV10[] = [
  { id: "f-1", dept: "心内科", patientCase: "男65", rootCause: "medication_error", description: "华法林剂量过大", recurrenceCnt: 3 },
  { id: "f-2", dept: "心内科", patientCase: "女70", rootCause: "diagnosis_error", description: "漏诊急性心梗", recurrenceCnt: 2 },
  { id: "f-3", dept: "急诊科", patientCase: "男50", rootCause: "communication_delay", description: "危急值交接延迟", recurrenceCnt: 1 },
];

export const failurePostmortemV10Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/failure/postmortem",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "failure-postmortem:write");
      if (denied) return denied;

      const body = await c.req.json() as {
        dept: string;
        patientCase: string;
        description: string;
      };
      const rootCause = analyzeFailureRootCauseV10({ description: body.description }, failureStore);
      const event: FailureEventV10 = {
        id: `f-${failureStore.length + 1}`,
        dept: body.dept,
        patientCase: body.patientCase,
        rootCause,
        description: body.description,
        recurrenceCnt: 0,
      };
      failureStore.push(event);
      return json(ok({
        event,
        preventionPlan: buildPreventionPlanV10(rootCause),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/failure/postmortem",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "failure-postmortem:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "";
      const scoped = dept ? failureStore.filter((f) => f.dept === dept) : failureStore;
      const groups = buildFailurePostmortemV10(scoped);
      return json(ok(
        groups.map((g) => ({
          ...g,
          preventionPlan: buildPreventionPlanV10(g.rootCause),
        })),
      ));
    },
  },
];
