/**
 * 健澜科技 jlmedaios - 用药知识沉淀与反馈学习 V7 路由（M289-C）
 *
 * GET  /api/v1/cds/feedback 反馈列表
 * GET  /api/v1/cds/strength/:ruleId 规则强度
 * POST /api/v1/cds/feedback/submit 提交反馈
 * GET  /api/v1/cds/suggestions 改进建议
 *
 * 权限：cds-learning:read / cds-learning:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdherenceV7,
  deriveRuleSuggestionV7,
  tallyOverrideV7,
  type DrugFeedback,
} from "../aggregators/cdsLearningV7Aggregator.js";

const feedbackStore: DrugFeedback[] = [
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "调整剂量", feedbackType: "accept" },
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "维持原方案", feedbackType: "override" },
  { drugCode: "WARFARIN", ruleId: "r1", doctorAction: "加用PPI", feedbackType: "override" },
  { drugCode: "METFORMIN", ruleId: "r2", doctorAction: "换药", feedbackType: "accept" },
];

export const cdsLearningV7Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cds/feedback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds-learning:read");
      if (denied) return denied;

      return json(ok({
        total: feedbackStore.length,
        overrideCount: tallyOverrideV7(feedbackStore),
        feedbacks: feedbackStore,
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/cds/strength/:ruleId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds-learning:read");
      if (denied) return denied;

      const ruleId = c.params.ruleId;
      const hitCnt = feedbackStore.filter((f) => f.ruleId === ruleId).length;
      const overrideCnt = tallyOverrideV7(feedbackStore.filter((f) => f.ruleId === ruleId));
      const adherenceRatePct = computeAdherenceV7(ruleId, feedbackStore);
      return json(ok({
        ruleId,
        hitCnt,
        overrideCnt,
        adherenceRatePct,
        suggestion: deriveRuleSuggestionV7({ hitCnt, overrideCnt, adherenceRatePct }),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/cds/feedback/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds-learning:write");
      if (denied) return denied;

      const body = await c.req.json() as DrugFeedback;
      feedbackStore.push(body);
      return json(ok({
        accepted: true,
        adherenceRate: computeAdherenceV7(body.ruleId, feedbackStore),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/cds/suggestions",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cds-learning:read");
      if (denied) return denied;

      const ruleIds = Array.from(new Set(feedbackStore.map((f) => f.ruleId)));
      return json(ok(ruleIds.map((ruleId) => {
        const hitCnt = feedbackStore.filter((f) => f.ruleId === ruleId).length;
        const overrideCnt = tallyOverrideV7(feedbackStore.filter((f) => f.ruleId === ruleId));
        const adherenceRatePct = computeAdherenceV7(ruleId, feedbackStore);
        return {
          ruleId,
          hitCnt,
          overrideCnt,
          adherenceRatePct,
          ...deriveRuleSuggestionV7({ hitCnt, overrideCnt, adherenceRatePct }),
        };
      })));
    },
  },
];
