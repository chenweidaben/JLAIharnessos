/**
 * 健澜科技 jlmedaios - MUSE 主动提醒引擎 V5 单测（M284-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseReminderV5Report,
  evaluateReminderV5,
  scheduleReminderV5,
  suppressDuplicateV5,
  type ReminderLog,
  type ReminderRule,
} from "../../src/bff/aggregators/museReminderV5Aggregator";
import { museReminderV5Routes } from "../../src/bff/routes/museReminderV5";

const rule: ReminderRule = {
  id: "r1",
  role: "护士",
  triggerEvent: "vital_abnormal",
  condition: "high",
  channel: "sms",
  messageTemplate: "异常",
  muteWindowMinutes: 60,
};

describe("evaluateReminderV5", () => {
  it("value=90≥80且事件匹配→触发", () => {
    expect(evaluateReminderV5({ userId: "u", event: "vital_abnormal", value: 90 }, rule)).toBe(true);
  });
  it("value=50<80→不触发", () => {
    expect(evaluateReminderV5({ userId: "u", event: "vital_abnormal", value: 50 }, rule)).toBe(false);
  });
});

describe("scheduleReminderV5", () => {
  it("60分钟静音→sendAt=now+3600000", () => {
    const now = 1000000;
    expect(scheduleReminderV5(rule, now).sendAt).toBe(now + 3600000);
  });
});

describe("suppressDuplicateV5", () => {
  it("60分钟内已发→抑制", () => {
    const logs: ReminderLog[] = [{ userId: "u", ruleId: "r1", sentAt: 1000000 }];
    expect(suppressDuplicateV5(logs, rule, "u", 2000000)).toBe(true);
  });
  it("60分钟外→不抑制", () => {
    const logs: ReminderLog[] = [{ userId: "u", ruleId: "r1", sentAt: 1000000 }];
    expect(suppressDuplicateV5(logs, rule, "u", 1000000 + 3600001)).toBe(false);
  });
});

describe("buildMuseReminderV5Report", () => {
  it("统计规则与日志", () => {
    const logs: ReminderLog[] = [{ userId: "u", ruleId: "r1", sentAt: 1 }];
    expect(buildMuseReminderV5Report([rule], logs).totalLogs).toBe(1);
  });
});

describe("museReminderV5Routes 写权限", () => {
  it("POST /api/v1/muse-reminder/trigger 路由存在且 auth:true", () => {
    const post = museReminderV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-reminder/trigger");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
