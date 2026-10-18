/**
 * 健澜科技 jlmedaios - 病历质控通知公告 V14 路由（M472-C）
 *
 * GET  /api/v1/emr-qc-notice  （read，auth:true，query 用 new URL 取 type）返回通知列表
 * POST /api/v1/emr-qc-notice  （auth:true，body 用 await c.req.json()）发布通知
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildNotice,
  filterNoticesByType,
  type NoticeTypeV14,
  type QcNoticeV14,
} from "../aggregators/emrQcNoticeV14Aggregator.js";

const demoNotices: QcNoticeV14[] = [
  { id: "NT-001", title: "质控月报发布", content: "2026年10月质控报告", type: "announcement", date: "2026-10-01" },
  { id: "NT-002", title: "缺陷率偏高预警", content: "内科缺陷率超过10%", type: "warning", date: "2026-10-10" },
  { id: "NT-003", title: "归档提醒", content: "本周未归档病历请及时处理", type: "reminder", date: "2026-10-15" },
];

export const emrQcNoticeV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-notice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-notice:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const type = url.searchParams.get("type") ?? "";
      const notices = filterNoticesByType(demoNotices, type);
      return json(ok({ notices, total: notices.length }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-qc-notice",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-notice:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        title?: string;
        content?: string;
        type?: NoticeTypeV14;
      };
      const notice = buildNotice(
        body.title ?? "",
        body.content ?? "",
        body.type ?? "announcement",
      );
      return json(ok({ notice }));
    },
  },
];
