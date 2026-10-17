/**
 * 健澜科技 jlmedaios - 患者 MUSE 助手 V5 路由（M284-A）
 *
 * GET  /api/v1/muse-patient（患者会话）
 * POST /api/v1/muse-patient/ask（提问）
 * GET  /api/v1/muse-patient/nudges（提醒）
 *
 * 权限：muse-patient:read / muse-patient:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  answerPatientV5,
  buildPatientMUSEV5,
  nudgePatientV5,
  type PatientContext,
} from "../aggregators/musePatientV5Aggregator.js";

const patientStore: PatientContext = {
  patientRef: "p-001",
  channel: "wechat",
  upcomingVisits: 2,
  pendingReports: 1,
  chronicDiseases: ["高血压"],
};

const knowledgeBase: Record<string, string> = {
  "高血压": "高血压患者每日盐摄入应<5g，规律测量血压并记录。",
  "糖尿病": "糖尿病患者应控制碳水摄入，餐后适量运动。",
};

export const musePatientV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-patient",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-patient:read");
      if (denied) return denied;

      return json(ok(buildPatientMUSEV5(patientStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/muse-patient/ask",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-patient:write");
      if (denied) return denied;

      const body = await c.req.json() as { question: string };
      return json(ok(answerPatientV5(body.question, knowledgeBase)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-patient/nudges",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-patient:read");
      if (denied) return denied;

      return json(ok(nudgePatientV5(patientStore, "低盐饮食+每日服药")));
    },
  },
];
