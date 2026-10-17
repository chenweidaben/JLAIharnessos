/**
 * 健澜科技 jlmedaios - MUSE 主动提醒引擎 V5 路由（M284-C）
 *
 * POST /api/v1/muse-reminder/trigger（触发事件）
 * GET  /api/v1/muse-reminder/logs（提醒记录）
 *
 * 权限：muse-reminder:read / muse-reminder:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseReminderV5Report,
  evaluateReminderV5,
  scheduleReminderV5,
  suppressDuplicateV5,
  type ReminderLog,
  type ReminderRule,
} from "../aggregators/museReminderV5Aggregator.js";

const ruleStore: ReminderRule[] = [
  { id: "r1", role: "护士", triggerEvent: "vital_abnormal", condition: "high", channel: "sms", messageTemplate: "患者生命体征异常", muteWindowMinutes: 60 },
  { id: "r2", role: "医生", triggerEvent: "pending_lab", condition: "any", channel: "wechat", messageTemplate: "有待复查检验", muteWindowMinutes: 120 },
];

const logStore: ReminderLog[] = [];

export const museReminderV5Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/muse-reminder/trigger",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-reminder:write");
      if (denied) return denied;

      const body = await c.req.json() as { userId: string; event: string; value: number };
      const now = Date.now();
      const triggered = ruleStore
        .filter((rule) => evaluateReminderV5({ userId: body.userId, event: body.event, value: body.value }, rule))
        .map((rule) => {
          const suppressed = suppressDuplicateV5(logStore, rule, body.userId, now);
          const schedule = scheduleReminderV5(rule, now);
          if (!suppressed) {
            logStore.push({ userId: body.userId, ruleId: rule.id, sentAt: now });
          }
          return { ruleId: rule.id, suppressed, schedule };
        });
      return json(ok({ triggered }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-reminder/logs",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-reminder:read");
      if (denied) return denied;

      return json(ok(buildMuseReminderV5Report(ruleStore, logStore)));
    },
  },
];
