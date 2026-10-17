/**
 * 健澜科技 jlmedaios - 失败案例回灌学习飞轮 V5 路由（M275-C）
 *
 * POST /api/v1/failure-flywheel（不良事件→RCA→生成知识与规则）
 * GET  /api/v1/failure-flywheel（报告）
 * POST /api/v1/failure-flywheel/verify（验证）
 *
 * 权限：failure-flywheel:write / failure-flywheel:read / failure-flywheel:verify。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  backtrackToKnowledgeV5,
  buildFailureFlywheelV5Report,
  extractLessonV5,
  verifyLearningV5,
  type AdverseEvent,
  type FeedbackLoop,
} from "../aggregators/failureFlywheelV5Aggregator.js";

const store: FeedbackLoop[] = [];

export const failureFlywheelV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/failure-flywheel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "failure-flywheel:write");
      if (denied) return denied;

      const event = await c.req.json() as AdverseEvent;
      const lesson = extractLessonV5(event);
      const kb = backtrackToKnowledgeV5(lesson);
      const loop: FeedbackLoop = {
        eventType: event.eventType,
        caseRef: event.caseRef,
        rootCause: lesson.rootCause,
        actionItem: lesson.lesson,
        knowledgeArtifact: kb.knowledgeArtifact,
        ruleId: kb.ruleId,
        verifiedBy: "",
        verified: false,
      };
      store.push(loop);
      return json(ok(loop));
    },
  },
  {
    method: "GET",
    path: "/api/v1/failure-flywheel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "failure-flywheel:read");
      if (denied) return denied;

      return json(ok(buildFailureFlywheelV5Report(store)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/failure-flywheel/verify",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "failure-flywheel:verify");
      if (denied) return denied;

      const body = await c.req.json() as { ruleId: string; verifier: string };
      const loop = store.find((l) => l.ruleId === body.ruleId);
      if (!loop) {
        return json(ok({ found: false }));
      }
      const result = verifyLearningV5(loop, body.verifier);
      loop.verified = result.verified;
      loop.verifiedBy = body.verifier;
      return json(ok({ found: true, ...result }));
    },
  },
];
