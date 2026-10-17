/**
 * 健澜科技 jlmedaios - 患者侧经验转健康提示 V13 路由（M295-C）
 *
 * GET /api/v1/patient-tips?patientId=p-001
 *
 * 权限：patient-tips:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPatientTipFeedV13,
  type PatientExperienceV13,
} from "../aggregators/patientTipV13Aggregator.js";

const experiences: PatientExperienceV13[] = [
  {
    experienceId: "pt-1",
    category: "medication_adherence",
    title: "按时吃抗凝药",
    content: "华法林需固定时间服用",
    tags: ["afib", "elderly"],
  },
  {
    experienceId: "pt-2",
    category: "lifestyle",
    title: "低盐饮食",
    content: "每日盐摄入<5g",
    tags: ["hypertension"],
  },
  {
    experienceId: "pt-3",
    category: "prescription_decision",
    title: "抗生素选择",
    content: "诊断后选头孢类",
    tags: ["infection"],
  },
];

const patientTagMap: Record<string, string[]> = {
  "p-001": ["afib", "elderly"],
  "p-002": ["hypertension"],
};

export const patientTipV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-tips",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-tips:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? "p-001";
      const tags = patientTagMap[patientId] ?? [];
      const feed = buildPatientTipFeedV13(tags, experiences);
      return json(ok({ patientId, count: feed.length, items: feed }));
    },
  },
];
