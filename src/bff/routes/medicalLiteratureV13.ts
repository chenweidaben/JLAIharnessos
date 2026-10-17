/**
 * 健澜科技 jlmedaios - 医学文献检索 V13 路由（M327-D）
 *
 * GET /api/v1/medical-literature
 *
 * 权限：medical-literature:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countExportCitationsV13,
  countMonthlySearchesV13,
  listHotKeywordsV13,
  type LiteratureSearchV13,
} from "../aggregators/medicalLiteratureV13Aggregator.js";

const searches: LiteratureSearchV13[] = [
  { keyword: "高血压", isExported: true },
  { keyword: "高血压", isExported: true },
  { keyword: "高血压", isExported: false },
  { keyword: "糖尿病", isExported: true },
  { keyword: "糖尿病", isExported: false },
  { keyword: "冠心病", isExported: true },
  { keyword: "冠心病", isExported: false },
  { keyword: "肺炎", isExported: false },
  { keyword: "肺炎", isExported: false },
  { keyword: "肿瘤", isExported: false },
];

export const medicalLiteratureV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-literature",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-literature:read");
      if (denied) return denied;
      return json(ok({
        monthlySearches: countMonthlySearchesV13(searches),
        exportCitations: countExportCitationsV13(searches),
        hotKeywords: listHotKeywordsV13(searches),
      }));
    },
  },
];
