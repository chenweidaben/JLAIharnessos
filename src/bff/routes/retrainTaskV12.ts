/**
 * 健澜科技 jlmedaios - 低采纳率规则自动复训提示 V12 路由（M294-B）
 *
 * GET  /api/v1/retrain-tasks              复训任务列表
 * POST /api/v1/retrain-tasks/:id/complete 完成复训（auth）
 *
 * 权限：retrain-task:read / retrain-task:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRetrainSummaryV12,
  buildRetrainTaskV12,
  prioritizeRetrainV12,
  type LowAdoptionRuleV12,
} from "../aggregators/retrainTaskV12Aggregator.js";

const lowAdoptionRules: LowAdoptionRuleV12[] = [
  { ruleId: "r-dose", ruleName: "剂量建议", adoptionRate: 25 },
  { ruleId: "r-interaction", ruleName: "相互作用识别", adoptionRate: 45 },
  { ruleId: "r-duplicate", ruleName: "重复处方检测", adoptionRate: 15 },
];

export const retrainTaskV12Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/retrain-tasks",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "retrain-task:read");
      if (denied) return denied;
      const tasks = prioritizeRetrainV12(buildRetrainTaskV12(lowAdoptionRules));
      return json(ok({ tasks, summary: buildRetrainSummaryV12(tasks) }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/retrain-tasks/:id/complete",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "retrain-task:write");
      if (denied) return denied;
      return json(ok({ taskId: c.params.id, completed: true }));
    },
  },
];
