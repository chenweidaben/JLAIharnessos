/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人经验沉淀闭环 V9 路由（M291-C）
 *
 * POST /api/v1/agent/case-lesson 记录案例
 * GET  /api/v1/agent/case-lesson 案例检索（query: condition）
 * GET  /api/v1/agent/doctor-legacy/:doctorId 个人经验遗产
 *
 * 权限：case-lesson:write / case-lesson:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDoctorLegacyV9,
  logCaseLessonV9,
  searchRelevantCasesV9,
  type CaseLessonV9,
} from "../aggregators/caseLessonV9Aggregator.js";

const caseStore: CaseLessonV9[] = [
  { id: "c-1", doctorId: "d-001", patientCase: "男65岁", diagnosis: "急性心肌梗死", outcome: "PCI成功", success: true, tag: "PCI" },
  { id: "c-2", doctorId: "d-001", patientCase: "女70岁", diagnosis: "急性心肌梗死合并糖尿病", outcome: "再灌注延迟", success: false, tag: "延迟" },
  { id: "c-3", doctorId: "d-001", patientCase: "男55岁", diagnosis: "不稳定心绞痛", outcome: "保守治疗好转", success: true, tag: "保守" },
];

export const caseLessonV9Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/agent/case-lesson",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "case-lesson:write");
      if (denied) return denied;

      const body = await c.req.json() as { doctorId: string; caseData: Omit<CaseLessonV9, "id" | "doctorId"> };
      const next = logCaseLessonV9(body.doctorId, body.caseData, caseStore);
      caseStore.length = 0;
      caseStore.push(...next);
      return json(ok({
        recorded: true,
        total: caseStore.length,
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/case-lesson",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "case-lesson:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const condition = url.searchParams.get("condition") ?? "";
      const results = condition ? searchRelevantCasesV9(caseStore, condition) : caseStore;
      return json(ok({
        query: condition,
        results,
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/doctor-legacy/:doctorId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "case-lesson:read");
      if (denied) return denied;

      const doctorId = c.params.doctorId;
      const mine = caseStore.filter((x) => x.doctorId === doctorId);
      return json(ok({
        doctorId,
        ...buildDoctorLegacyV9(mine),
      }));
    },
  },
];
