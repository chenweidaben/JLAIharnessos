/**
 * 健澜科技 jlmedaios - 临床研究项目 V13 路由（M327-A）
 *
 * GET /api/v1/clinical-research-overview
 *
 * 权限：clinical-research-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  checkGcpComplianceV13,
  countActiveProjectsV13,
  countPublishedPapersV13,
  sumProjectFundingV13,
  type ResearchProjectV13,
} from "../aggregators/clinicalResearchV13Aggregator.js";

const projects: ResearchProjectV13[] = [
  { projectName: "项目A", funding: 100, publishedPapers: 1, gcpPassed: true },
  { projectName: "项目B", funding: 200, publishedPapers: 1, gcpPassed: true },
  { projectName: "项目C", funding: 300, publishedPapers: 1, gcpPassed: true },
];

export const clinicalResearchV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-research-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-research-overview:read");
      if (denied) return denied;
      return json(ok({
        activeProjects: countActiveProjectsV13(projects),
        totalFunding: sumProjectFundingV13(projects),
        publishedPapers: countPublishedPapersV13(projects),
        gcpCompliant: checkGcpComplianceV13(projects),
      }));
    },
  },
];
