/**
 * 健澜科技 jlmedaios - 跨角色经验复用与学习飞轮 V9 路由（M291-D）
 *
 * POST /api/v1/agent/transfer 经验转译
 * GET  /api/v1/agent/lessons 适用经验（query: targetRole）
 * GET  /api/v1/agent/flywheel 飞轮统计
 *
 * 权限：agent-transfer:write / agent-transfer:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildLearningFlywheelV9,
  filterApplicableLessonsV9,
  transferLessonV9,
  type TransferredLessonV9,
} from "../aggregators/learningFlywheelV9Aggregator.js";

const lessonStore: TransferredLessonV9[] = [
  { id: "tl-1", sourceRole: "doctor", targetRole: "nurse", condition: "急性心梗", lesson: "15分钟内完成首份心电图", sourceCnt: 5 },
  { id: "tl-2", sourceRole: "doctor", targetRole: "pharma", condition: "急性心梗", lesson: "早期双联抗血小板", sourceCnt: 4 },
  { id: "tl-3", sourceRole: "doctor", targetRole: "manager", condition: "再灌注延迟", lesson: "D2B时间纳入KPI", sourceCnt: 1 },
];

export const learningFlywheelV9Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/agent/transfer",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-transfer:write");
      if (denied) return denied;

      const body = await c.req.json() as {
        sourceRole: TransferredLessonV9["sourceRole"];
        targetRole: TransferredLessonV9["targetRole"];
        lessons: { condition: string; lesson: string; sourceCnt: number }[];
      };
      const created = transferLessonV9(body.sourceRole, body.targetRole, body.lessons);
      lessonStore.push(...created);
      return json(ok({
        createdCount: created.length,
        total: lessonStore.length,
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/lessons",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-transfer:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const targetRole = url.searchParams.get("targetRole") ?? "nurse";
      return json(ok(
        filterApplicableLessonsV9(lessonStore, targetRole as "nurse", {}),
      ));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/flywheel",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-transfer:read");
      if (denied) return denied;

      return json(ok(buildLearningFlywheelV9(lessonStore)));
    },
  },
];
