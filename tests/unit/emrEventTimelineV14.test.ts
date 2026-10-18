/**
 * 健澜科技 jlmedaios - 病历关键事件时间线 V14 单测（M538-C）
 *
 * 测试 buildEventTimeline 构建事件时间线、buildEventTimelineList 事件列表构建、buildEventTimelineReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEventTimeline,
  buildEventTimelineList,
  buildEventTimelineReport,
  type EventTimelineInputV14,
  type TimelineEventItemV14,
} from "../../src/bff/aggregators/emrEventTimelineV14Aggregator";
import { emrEventTimelineV14Routes } from "../../src/bff/routes/emrEventTimelineV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildEventTimeline 构建事件时间线", () => {
  // 手算：recordId='REC502', patientName='李四' → 正确构建
  it("recordId='REC502', patientName='李四' → 正确构建", () => {
    const timeline = buildEventTimeline("REC502", "李四");
    expect(timeline.recordId).toBe("REC502");
    expect(timeline.patientName).toBe("李四");
  });
});

describe("buildEventTimelineList 正常", () => {
  // 手算：{events=[{day=1,title='入院'},{day=3,title='手术'},{day=10,title='出院'}]}
  // 手算：eventCount = events.length = 3
  // 手算：firstEvent = events[0].title = '入院'
  it("{events=[入院,手术,出院]} → eventCount=3, firstEvent='入院'", () => {
    const events: TimelineEventItemV14[] = [
      { day: 1, title: "入院" },
      { day: 3, title: "手术" },
      { day: 10, title: "出院" },
    ];
    const input: EventTimelineInputV14 = { events };
    const result = buildEventTimelineList(input);
    expect(result.eventCount).toBe(3);
    expect(result.firstEvent).toBe("入院");
  });
});

describe("buildEventTimelineList 空列表", () => {
  // 手算：{events=[]}
  // 手算：eventCount = events.length = 0
  // 手算：firstEvent = '无事件'
  it("{events=[]} → eventCount=0, firstEvent='无事件'", () => {
    const input: EventTimelineInputV14 = { events: [] };
    const result = buildEventTimelineList(input);
    expect(result.eventCount).toBe(0);
    expect(result.firstEvent).toBe("无事件");
  });
});

describe("buildEventTimelineReport 构建报告", () => {
  // 手算：{eventCount=3, firstEvent='入院'}
  // 手算：透传 eventCount + firstEvent
  it("{eventCount=3, firstEvent='入院'} → 正确返回（透传）", () => {
    const report = buildEventTimelineReport({ eventCount: 3, firstEvent: "入院" });
    expect(report.eventCount).toBe(3);
    expect(report.firstEvent).toBe("入院");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-event-timeline auth:true", () => {
    const def = (emrEventTimelineV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-event-timeline");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
