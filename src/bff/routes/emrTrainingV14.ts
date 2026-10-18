/**
 * 健澜科技 jlmedaios - 病历质控培训考核模块 V14 路由（M467-D，M467 收官）
 *
 * GET  /api/v1/emr-training          （read，auth:true）返回课程列表+成绩
 * POST /api/v1/emr-training/submit   （auth:true，body 用 await c.req.json()）提交考核
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildTrainingModule,
  scoreExam,
  type TrainingQuestionV14,
} from "../aggregators/emrTrainingV14Aggregator.js";

const demoModule = buildTrainingModule("COURSE-QC-001");

export const emrTrainingV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-training",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-training:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ course: demoModule }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-training/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-training:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as { answers?: number[] };
      const result = scoreExam(body.answers ?? [], demoModule.questions);
      return json(ok({ result }));
    },
  },
];
