/**
 * 健澜科技 jlmedaios - 智慧病房 IoT V5 纯函数单测（M268-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessWardIoTAlertV5,
  buildSmartWardIoTV5Report,
  recommendNurseTaskV5,
} from "../../src/bff/aggregators/smartWardIoTV5ReportAggregator";

describe("assessWardIoTAlertV5", () => {
  it("总报警100次+真实90次 → 真实率90%优秀", () => {
    expect(assessWardIoTAlertV5({ total: 100, trueAlert: 90, falseAlert: 10, responseTime: 3 }).trueRate).toBe(90);
  });
});

describe("recommendNurseTaskV5", () => {
  it("有高优先级报警+护士可用 → 优先处理eta2分钟", () => {
    const r = recommendNurseTaskV5([{ priority: "high", location: "3床" }], { currentLocation: "护士站", available: true });
    expect(r.priority).toBe("high");
  });
});

describe("buildSmartWardIoTV5Report", () => {
  it("生成智能病床数据", () => {
    const r = buildSmartWardIoTV5Report("30d");
    expect(r.smartBed.offBedAlarm).toBeGreaterThan(0);
  });

  it("生成输液监控数据", () => {
    const r = buildSmartWardIoTV5Report("30d");
    expect(r.infusion.endAlarm).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSmartWardIoTV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
