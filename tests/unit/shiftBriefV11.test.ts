/**
 * 健澜科技 jlmedaios - NURSE_MUSE 主动式交接班简报 V11 单测（M293-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildShiftBriefV11,
  formatShiftBriefV11,
  prioritizeShiftV11,
  type HandoverItemV11,
  type IvTaskV11,
  type NightEventV11,
  type PressureRiskV11,
  type ShiftBedV11,
} from "../../src/bff/aggregators/shiftBriefV11Aggregator";
import { shiftBriefV11Routes } from "../../src/bff/routes/shiftBriefV11";

const beds: ShiftBedV11[] = [
  { bedId: "b1", patientId: "p1" },
  { bedId: "b2", patientId: "p2" },
];

const ivTasks: IvTaskV11[] = [
  { taskId: "iv-1", bedId: "b1", drug: "头孢" },
];

const pressureRisks: PressureRiskV11[] = [
  { riskId: "rp-1", bedId: "b2", level: "high" },
];

const nightEvents: NightEventV11[] = [
  { eventId: "ne-1", title: "血压波动" },
];

const handoverItems: HandoverItemV11[] = [
  { itemId: "ho-1", title: "出院结算" },
];

describe("buildShiftBriefV11", () => {
  it("聚合 1+1+1+2+1=6 条，五类计数正确", () => {
    const b = buildShiftBriefV11("n-001", beds, ivTasks, pressureRisks, nightEvents, handoverItems);
    expect(b.items.length).toBe(6);
    expect(b.bedCount).toBe(2);
    expect(b.ivCount).toBe(1);
    expect(b.pressureHighCount).toBe(1);
    expect(b.nightEventCount).toBe(1);
    expect(b.handoverCount).toBe(1);
  });
  it("空态→全部为0", () => {
    const b = buildShiftBriefV11("n-001", [], [], [], [], []);
    expect(b.items.length).toBe(0);
    expect(b.bedCount).toBe(0);
  });
});

describe("prioritizeShiftV11", () => {
  it("nightEvent > pressureRisk > ivTask > bed > handover", () => {
    const b = buildShiftBriefV11("n-001", beds, ivTasks, pressureRisks, nightEvents, handoverItems);
    const r = prioritizeShiftV11(b.items);
    expect(r[0].category).toBe("nightEvent");
    expect(r[1].category).toBe("pressureRisk");
    expect(r[2].category).toBe("ivTask");
    expect(r[3].category).toBe("bed");
    expect(r[4].category).toBe("bed");
    expect(r[5].category).toBe("handover");
  });
});

describe("formatShiftBriefV11", () => {
  it("文本含关键数字：2张床/1夜间/1压疮/1输液/1待交接", () => {
    const b = buildShiftBriefV11("n-001", beds, ivTasks, pressureRisks, nightEvents, handoverItems);
    const text = formatShiftBriefV11(b);
    expect(text).toContain("2张床");
    expect(text).toContain("1条夜间");
    expect(text).toContain("1例压疮高危");
    expect(text).toContain("1条输液");
    expect(text).toContain("1项待交接");
  });
});

describe("shiftBriefV11Routes 读路由", () => {
  it("GET /api/v1/shift-brief 路由存在且 auth:true", () => {
    const route = shiftBriefV11Routes.find((r) => r.method === "GET" && r.path === "/api/v1/shift-brief");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
