/**
 * 健澜科技 jlmedaios - 病历时间轴视图 V14 单测（M464-C）
 *
 * 测试 buildTimeline 乱序→升序、空数组→[]、groupByDay 跨2天→2组、同天2事件→1组含2 events、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTimeline,
  groupByDay,
  type TimelineEventV14,
} from "../../src/bff/aggregators/emrTimelineDetailV14Aggregator";
import { emrTimelineDetailV14Routes } from "../../src/bff/routes/emrTimelineDetailV14";
import type { RouteDef } from "../../src/bff/types";

const events: TimelineEventV14[] = [
  { id: "E001", eventType: "admission", title: "入院", eventTime: "2026-10-18T08:00:00Z" },
  { id: "E002", eventType: "progress", title: "病程", eventTime: "2026-10-18T10:00:00Z" },
  { id: "E003", eventType: "lab", title: "化验", eventTime: "2026-10-19T09:00:00Z" },
];

describe("buildTimeline 乱序→升序", () => {
  // 手算：乱序输入 [E003(10-19), E001(10-18), E002(10-18)] → 排序后 [E001, E002, E003]
  it("3 个乱序事件 → 按时间升序排好", () => {
    const unsorted = [events[2], events[0], events[1]];
    const sorted = buildTimeline(unsorted);
    expect(sorted[0]?.id).toBe("E001");
    expect(sorted[1]?.id).toBe("E002");
    expect(sorted[2]?.id).toBe("E003");
  });
});

describe("buildTimeline 空数组", () => {
  // 手算：空输入 → 返回 []
  it("空数组 → 返回 []", () => {
    expect(buildTimeline([])).toEqual([]);
  });
});

describe("groupByDay 跨2天", () => {
  // 手算：10-18 有 E001/E002，10-19 有 E003 → 2 组
  it("3 个事件跨 2 天 → 返回 2 组", () => {
    const groups = groupByDay(events);
    expect(groups.length).toBe(2);
  });
});

describe("groupByDay 同天2事件", () => {
  // 手算：10-18 有 E001/E002 → 1 组含 2 events
  it("同一天 2 事件 → 1 组含 2 events", () => {
    const groups = groupByDay(events);
    const dayGroup = groups.find((g) => g.day === "2026-10-18");
    expect(dayGroup?.events.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-timeline-detail/:patientId auth:true", () => {
    const def = (emrTimelineDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-timeline-detail/:patientId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
