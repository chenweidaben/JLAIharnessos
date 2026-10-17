/**
 * 健澜科技 jlmedaios - 安保消防与应急指挥 V5 单测（M279-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessFireSafetyV5,
  buildSecurityEmergencyV5Report,
  classifySecurityIncidentV5,
  dispatchEmergencyV5,
  type FireCheck,
  type SecurityEvent,
} from "../../src/bff/aggregators/securityEmergencyV5Aggregator";

describe("classifySecurityIncidentV5", () => {
  it("火灾且severity=8→重大", () => {
    const e: SecurityEvent = { incidentType: "火灾", location: "x", severity: 8, peopleInvolved: 3 };
    expect(classifySecurityIncidentV5(e)).toBe("重大");
  });
  it("暴力且2人→较大", () => {
    const e: SecurityEvent = { incidentType: "医闹暴力", location: "x", severity: 3, peopleInvolved: 2 };
    expect(classifySecurityIncidentV5(e)).toBe("较大");
  });
  it("电梯困人1人→一般", () => {
    const e: SecurityEvent = { incidentType: "电梯困人", location: "x", severity: 2, peopleInvolved: 1 };
    expect(classifySecurityIncidentV5(e)).toBe("一般");
  });
});

describe("dispatchEmergencyV5", () => {
  it("重大事件→4支队伍3分钟", () => {
    const e: SecurityEvent = { incidentType: "火灾", location: "x", severity: 9, peopleInvolved: 6 };
    const d = dispatchEmergencyV5(e);
    expect(d.teams.length).toBe(4);
    expect(d.responseMinutes).toBe(3);
  });
});

describe("assessFireSafetyV5", () => {
  it("3项2通过→66.7%", () => {
    const checks: FireCheck[] = [
      { item: "a", passed: true },
      { item: "b", passed: true },
      { item: "c", passed: false },
    ];
    const r = assessFireSafetyV5(checks);
    expect(r.passRate).toBe(66.7);
    expect(r.failItems).toContain("c");
  });
});

describe("buildSecurityEmergencyV5Report", () => {
  it("统计重大事件与消防合格率", () => {
    const events: SecurityEvent[] = [
      { incidentType: "火灾", location: "x", severity: 9, peopleInvolved: 6 },
      { incidentType: "电梯困人", location: "x", severity: 2, peopleInvolved: 1 },
    ];
    const checks: FireCheck[] = [{ item: "a", passed: true }];
    const r = buildSecurityEmergencyV5Report(events, checks);
    expect(r.majorCount).toBe(1);
    expect(r.firePassRate).toBe(100);
  });
});
