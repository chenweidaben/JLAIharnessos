/**
 * 健澜科技 jlmedaios - 虚拟病例演练与团队复盘 V5 路由（M276-C）
 *
 * POST /api/v1/drill-case（创建演练）
 * GET  /api/v1/drill-case（病例库报告）
 * POST /api/v1/drill-case/score（提交演练评分）
 *
 * 权限：drill-case:write / drill-case:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDebriefV5,
  buildDrillCaseV5Report,
  generateDrillCaseV5,
  scoreDrillV5,
  type DrillCase,
} from "../aggregators/drillCaseV5Aggregator.js";

const store: DrillCase[] = [];

export const drillCaseV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/drill-case",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drill-case:write");
      if (denied) return denied;

      const body = await c.req.json() as { specialty: string; difficulty: DrillCase["difficulty"]; teamId: string };
      const gen = generateDrillCaseV5(body.specialty, body.difficulty);
      const drill: DrillCase = {
        id: `drill-${Date.now()}`,
        title: gen.title,
        specialty: gen.specialty,
        difficulty: gen.difficulty,
        virtualSteps: gen.virtualSteps,
        correctPath: gen.correctPath,
        teamId: body.teamId,
        outcomeScore: 0,
        debriefNotes: "",
      };
      store.push(drill);
      return json(ok(drill));
    },
  },
  {
    method: "GET",
    path: "/api/v1/drill-case",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drill-case:read");
      if (denied) return denied;

      return json(ok(buildDrillCaseV5Report(store)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/drill-case/score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drill-case:write");
      if (denied) return denied;

      const body = await c.req.json() as { id: string; steps: string[] };
      const drill = store.find((d) => d.id === body.id);
      if (!drill) {
        return json(ok({ found: false }));
      }
      const scored = scoreDrillV5(body.steps, drill.correctPath);
      const debrief = buildDebriefV5(scored);
      drill.outcomeScore = scored.score;
      drill.debriefNotes = debrief.summary;
      return json(ok({ found: true, scored, debrief }));
    },
  },
];
