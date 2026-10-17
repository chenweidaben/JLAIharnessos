/**
 * 健澜科技 jlmedaios - 模型版本迭代记录 V13 路由（M321-C）
 *
 * GET /api/v1/muse-model-version
 *
 * 权限：muse-model-version:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeVersionImprovementV13,
  latestVersionV13,
  listModelVersionsV13,
  type ModelVersionV13,
} from "../aggregators/museModelVersionV13Aggregator.js";

const versions: ModelVersionV13[] = [
  { version: "v1", trainingSamples: 1000, releaseDate: "2026-01", hitRate: 75 },
  { version: "v2", trainingSamples: 2000, releaseDate: "2026-06", hitRate: 80 },
  { version: "v3", trainingSamples: 3000, releaseDate: "2026-10", hitRate: 85 },
];

export const museModelVersionV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-model-version",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-model-version:read");
      if (denied) return denied;
      const latest = latestVersionV13(versions);
      const prev = versions.length >= 2 ? versions[versions.length - 2] : null;
      return json(ok({
        versions: listModelVersionsV13(versions),
        latestVersion: latest,
        improvementFromPrevious: latest && prev ? computeVersionImprovementV13(prev, latest) : 0,
      }));
    },
  },
];
