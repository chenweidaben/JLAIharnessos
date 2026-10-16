/**
 * 健澜科技 jlmedaios - AI 门诊全流程闭环 V5 纯函数单测（M258-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOutpatientAIClosedLoopV5Report,
  predictNoShowV5,
  routePatientToDepartmentV5,
} from "../../src/bff/aggregators/outpatientAIClosedLoopV5ReportAggregator";

describe("predictNoShowV5", () => {
  it("历史爽约20%+walk-in → 30%触发提醒", () => {
    expect(predictNoShowV5({ time: "周一", channel: "walk-in" }, { noShowRate: 20 }).alert).toBe(true);
  });
});

describe("routePatientToDepartmentV5", () => {
  it("胸痛胸闷 → 心血管内科90%", () => {
    expect(routePatientToDepartmentV5(["胸痛", "胸闷"], ["消化内科", "神经内科"]).department).toBe("心血管内科");
  });
});

describe("buildOutpatientAIClosedLoopV5Report", () => {
  it("生成诊前数据", () => {
    const r = buildOutpatientAIClosedLoopV5Report("30d");
    expect(r.preConsult.preTriage).toBeGreaterThan(0);
  });

  it("生成诊中数据", () => {
    const r = buildOutpatientAIClosedLoopV5Report("30d");
    expect(r.inVisit.doctorStation).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOutpatientAIClosedLoopV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
