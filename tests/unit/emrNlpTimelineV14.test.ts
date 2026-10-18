/**
 * 健澜科技 jlmedaios - NLP 病历时间线构建 V14 单测（M490-D，M490 收官）
 *
 * 测试 buildMedicalTimeline 构建、aggregateTimelineEvents 聚合、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMedicalTimeline,
  aggregateTimelineEvents,
  type NlpTimelineResultV14,
  type TimelineEventV14,
} from "../../src/bff/aggregators/emrNlpTimelineV14Aggregator";
import { emrNlpTimelineV14Routes } from "../../src/bff/routes/emrNlpTimelineV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMedicalTimeline P001", () => {
  // 手算：patientId='P001', 3 个事件 → 正确构建
  it("patientId='P001', 3 个事件 → 正确构建", () => {
    const events: TimelineEventV14[] = [
      { date: "2026-01-01", event: "入院" },
      { date: "2026-02-15", event: "手术" },
      { date: "2026-03-01", event: "出院" },
    ];
    const result: NlpTimelineResultV14 = buildMedicalTimeline("P001", events);
    expect(result.patientId).toBe("P001");
    expect(result.events.length).toBe(3);
  });
});

describe("aggregateTimelineEvents 3个事件", () => {
  // 手算：3 个事件（2026-01-01/2026-02-01/2026-03-01）→ count=3, earliest='2026-01-01', latest='2026-03-01'
  it("3 个事件（2026-01-01/2026-02-01/2026-03-01）→ count=3, earliest='2026-01-01', latest='2026-03-01'", () => {
    const events: TimelineEventV14[] = [
      { date: "2026-01-01", event: "入院" },
      { date: "2026-02-01", event: "手术" },
      { date: "2026-03-01", event: "出院" },
    ];
    const result = aggregateTimelineEvents(events);
    expect(result.count).toBe(3);
    expect(result.earliest).toBe("2026-01-01");
    expect(result.latest).toBe("2026-03-01");
  });
});

describe("aggregateTimelineEvents 空数组", () => {
  // 手算：空数组 → count=0, earliest='', latest=''
  it("空数组 → count=0, earliest='', latest=''", () => {
    const events: TimelineEventV14[] = [];
    const result = aggregateTimelineEvents(events);
    expect(result.count).toBe(0);
    expect(result.earliest).toBe("");
    expect(result.latest).toBe("");
  });
});

describe("buildMedicalTimeline P002", () => {
  // 手算：patientId='P002', 2 个事件 → 正确构建
  it("patientId='P002', 2 个事件 → 正确构建", () => {
    const events: TimelineEventV14[] = [
      { date: "2026-04-01", event: "门诊" },
      { date: "2026-05-01", event: "复诊" },
    ];
    const result: NlpTimelineResultV14 = buildMedicalTimeline("P002", events);
    expect(result.patientId).toBe("P002");
    expect(result.events.length).toBe(2);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-timeline auth:true", () => {
    const def = (emrNlpTimelineV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-timeline");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
