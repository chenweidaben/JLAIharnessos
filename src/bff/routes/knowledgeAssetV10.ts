/**
 * 健澜科技 jlmedaios - 医院级 AI 知识资产大盘 V10 路由（M292-D）
 *
 * GET /api/v1/knowledge/asset-dashboard 大盘
 * GET /api/v1/knowledge/growth 周环比（query: period）
 * GET /api/v1/knowledge/gap 知识缺口
 *
 * 权限：knowledge-asset:read（只读）。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHospitalKnowledgeAssetV10,
  computeKnowledgeGrowthV10,
  identifyKnowledgeGapV10,
  type DoctorGraphMiniV10,
  type FailureClusterV10,
  type PracticeMiniV10,
} from "../aggregators/knowledgeAssetV10Aggregator.js";

const failureClusters: FailureClusterV10[] = [
  { rootCause: "medication_error", count: 12 },
  { rootCause: "diagnosis_error", count: 8 },
  { rootCause: "communication_delay", count: 5 },
];

const practices: PracticeMiniV10[] = [
  { condition: "急性心梗", sourceCaseCnt: 5 },
  { condition: "急性心衰", sourceCaseCnt: 3 },
];

const doctorGraphs: DoctorGraphMiniV10[] = [
  { doctorId: "d-001", knowledgeDensity: 57 },
  { doctorId: "d-002", knowledgeDensity: 30 },
];

const asset = buildHospitalKnowledgeAssetV10(failureClusters, practices, doctorGraphs);

const prevWeekAsset = {
  failureTotal: 28,
  practiceTotal: 1,
  doctorCount: 2,
  avgDensity: 40,
};

export const knowledgeAssetV10Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/knowledge/asset-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-asset:read");
      if (denied) return denied;

      return json(ok(asset));
    },
  },
  {
    method: "GET",
    path: "/api/v1/knowledge/growth",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-asset:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      void url.searchParams.get("period");
      return json(ok(computeKnowledgeGrowthV10(prevWeekAsset, asset)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/knowledge/gap",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "knowledge-asset:read");
      if (denied) return denied;

      return json(ok(identifyKnowledgeGapV10(asset, failureClusters, practices)));
    },
  },
];
