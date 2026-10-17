/**
 * 健澜科技 jlmedaios - 成功案例蒸馏与最佳实践库 V10 路由（M292-B）
 *
 * GET  /api/v1/best-practice 列表（按加权排序）
 * GET  /api/v1/best-practice/:dept 按科室筛选
 * POST /api/v1/best-practice/upvote/:id 点赞
 *
 * 权限：best-practice:read / best-practice:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPracticeLibraryV10,
  distillBestPracticeV10,
  rankBestPracticeV10,
  type BestPracticeV10,
  type SuccessCaseV10,
} from "../aggregators/bestPracticeV10Aggregator.js";

const successCases: SuccessCaseV10[] = [
  { dept: "心内科", condition: "急性心梗", title: "D2B<90分钟路径", description: "胸痛中心绿色通道" },
  { dept: "心内科", condition: "急性心梗", title: "D2B<90分钟路径", description: "胸痛中心绿色通道" },
  { dept: "心内科", condition: "急性心衰", title: "早期利尿+BNP监测", description: "3小时内利尿" },
  { dept: "急诊科", condition: "过敏性休克", title: "肾上腺素1分钟肌注", description: "黄金1分钟" },
];

const practiceStore: BestPracticeV10[] = distillBestPracticeV10(successCases).map((p, idx) => ({
  ...p,
  upvoteCnt: idx === 0 ? 5 : idx === 1 ? 3 : 1,
}));

export const bestPracticeV10Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/best-practice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "best-practice:read");
      if (denied) return denied;

      void new URL(c.req.url).searchParams.get("sort");
      return json(ok({
        list: rankBestPracticeV10(practiceStore),
        library: buildPracticeLibraryV10(practiceStore),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/best-practice/:dept",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "best-practice:read");
      if (denied) return denied;

      const dept = c.params.dept;
      const scoped = practiceStore.filter((p) => p.dept === dept);
      return json(ok(rankBestPracticeV10(scoped)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/best-practice/upvote/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "best-practice:write");
      if (denied) return denied;

      const id = c.params.id;
      const target = practiceStore.find((p) => p.id === id);
      if (!target) {
        return json(ok({ found: false }));
      }
      target.upvoteCnt += 1;
      return json(ok({
        id,
        upvoteCnt: target.upvoteCnt,
      }));
    },
  },
];
