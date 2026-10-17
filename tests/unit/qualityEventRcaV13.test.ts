/**
 * 健澜科技 jlmedaios - 不良事件根因分析 RCA 辅助 V13 单测（M311-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFiveWhyTemplateV13,
  clusterSimilarEventsV13,
  trackImprovementMeasureV13,
  type QualityEventV13,
} from "../../src/bff/aggregators/qualityEventRcaV13Aggregator";
import { qualityEventRcaV13Routes } from "../../src/bff/routes/qualityEventRcaV13";

const events: QualityEventV13[] = [
  { id: "e1", eventType: "fall", description: "患者下床摔倒" },
  { id: "e2", eventType: "fall", description: "夜间跌倒" },
  { id: "e3", eventType: "fall", description: "如厕滑倒" },
  { id: "e4", eventType: "medication", description: "给药错误" },
];

describe("buildFiveWhyTemplateV13", () => {
  it("返回 eventId + 5 层空 why", () => {
    const t = buildFiveWhyTemplateV13(events[0]);
    expect(t.eventId).toBe("e1");
    expect(t.why.length).toBe(5);
    expect(t.why[0]).toBe("");
  });
});

describe("clusterSimilarEventsV13", () => {
  // 算式：4 事件中 eventType=fall 的有 e1/e2/e3 = 3 个
  it("type=fall → 3 条", () => {
    expect(clusterSimilarEventsV13(events, "fall").length).toBe(3);
  });
  it("空态（type=unknown）→ 0 条", () => {
    expect(clusterSimilarEventsV13(events, "unknown").length).toBe(0);
  });
});

describe("trackImprovementMeasureV13", () => {
  it("返回 eventId + measure + status", () => {
    const m = trackImprovementMeasureV13(events[0], "床边加装护栏", "verified");
    expect(m.eventId).toBe("e1");
    expect(m.measure).toBe("床边加装护栏");
    expect(m.status).toBe("verified");
  });
});

describe("qualityEventRcaV13Routes 读路由", () => {
  it("GET /api/v1/quality-event-rca 路由存在且 auth:true", () => {
    const route = qualityEventRcaV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/quality-event-rca",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
