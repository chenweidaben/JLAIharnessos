/**
 * 健澜科技 jlmedaios - 质控整改通知单自动生成 V14 路由（M518-C）
 *
 * GET  /api/v1/emr-qc-rectification-notice  （read，auth:true）返回通知单基础数据
 * POST /api/v1/emr-qc-rectification-notice  （auth:true）生成通知单统计 + 摘要
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRectificationNotice,
  buildRectificationNoticeSummary,
  generateRectificationNotice,
  type RectificationDefectsV14,
} from "../aggregators/emrQcRectificationNoticeV14Aggregator.js";

export const emrQcRectificationNoticeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-rectification-notice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rectification-notice:read");
      if (denied) return denied;
      const notice = buildRectificationNotice("GZ20261019001", "普外科", "病程记录不及时");
      return json(ok(notice));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-rectification-notice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-rectification-notice:write");
      if (denied) return denied;
      const body = await c.req.json();
      const notice = buildRectificationNotice(
        String(body?.noticeId ?? "GZ20261019001"),
        String(body?.dept ?? "普外科"),
        String(body?.issue ?? "病程记录不及时"),
      );
      const defects: RectificationDefectsV14 = {
        block: Number(body?.defects?.block ?? 0),
        major: Number(body?.defects?.major ?? 0),
        minor: Number(body?.defects?.minor ?? 0),
      };
      const deadlineDays = Number(body?.deadlineDays ?? 7);
      const result = generateRectificationNotice(notice, defects, deadlineDays);
      const summary = buildRectificationNoticeSummary(result);
      return json(ok({ notice, defects, deadlineDays, result, summary }));
    },
  },
];
