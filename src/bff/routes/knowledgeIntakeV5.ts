/**
 * 健澜科技 jlmedaios - 新知识自动入库与指南更新监测 V5 路由（M276-B）
 *
 * POST /api/v1/knowledge-intake（摄入）
 * GET  /api/v1/knowledge-intake（待审核知识流）
 * PUT  /api/v1/knowledge-intake/review（审核发布）
 *
 * 权限：knowledge-intake:write / knowledge-intake:read / knowledge-intake:review。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildKnowledgeIntakeV5Report,
  deduplicateKnowledgeV5,
  extractKnowledgePointsV5,
  type KnowledgeIntake,
} from "../aggregators/knowledgeIntakeV5Aggregator.js";

const store: KnowledgeIntake[] = [];

export const knowledgeIntakeV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/knowledge-intake",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-intake:write");
      if (denied) return denied;

      const body = await c.req.json() as { sourceType: string; title: string; sourceUrl: string; text: string };
      const points = deduplicateKnowledgeV5(extractKnowledgePointsV5(body.text, body.sourceType));
      const intake: KnowledgeIntake = {
        id: `ki-${Date.now()}`,
        sourceType: body.sourceType,
        title: body.title,
        sourceUrl: body.sourceUrl,
        extractedPoints: points,
        status: "pending",
        reviewedBy: "",
      };
      store.push(intake);
      return json(ok(intake));
    },
  },
  {
    method: "GET",
    path: "/api/v1/knowledge-intake",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-intake:read");
      if (denied) return denied;

      return json(ok(buildKnowledgeIntakeV5Report(store)));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/knowledge-intake/review",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-intake:review");
      if (denied) return denied;

      const body = await c.req.json() as { id: string; status: "approved" | "rejected"; reviewedBy: string };
      const intake = store.find((i) => i.id === body.id);
      if (!intake) {
        return json(ok({ found: false }));
      }
      intake.status = body.status;
      intake.reviewedBy = body.reviewedBy;
      return json(ok({ found: true, intake }));
    },
  },
];
