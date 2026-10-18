/**
 * 健澜科技 jlmedaios - 病历时间轴生成 V14 单测（M538-A）
 *
 * 测试 buildTimeline 构建时间轴、generateTimeline 时间轴生成、buildTimelineReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTimeline,
  buildTimelineReport,
  generateTimeline,
  type TimelineGenerateInputV14,
} from "../../src/bff/aggregators/emrTimelineGenerateV14Aggregator";
import { emrTimelineGenerateV14Routes } from "../../src/bff/routes/emrTimelineGenerateV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTimeline 构建时间轴", () => {
  // 手算：recordId='REC500', patientName='张三' → 正确构建
  it("recordId='REC500', patientName='张三' → 正确构建", () => {
    const timeline = buildTimeline("REC500", "张三");
    expect(timeline.recordId).toBe("REC500");
    expect(timeline.patientName).toBe("张三");
  });
});

describe("generateTimeline 密集", () => {
  // 手算：{admissionDate='2026-10-01', dischargeDate='2026-10-08', eventCount=25}
  // 手算：totalDays = Math.ceil((2026-10-08 - 2026-10-01) / 86400000) = Math.ceil(7) = 7
  // 手算：density = 25>=20 → '密集'
  it("{admissionDate='2026-10-01', dischargeDate='2026-10-08', eventCount=25} → totalDays=7, density='密集'", () => {
    const input: TimelineGenerateInputV14 = {
      admissionDate: "2026-10-01",
      dischargeDate: "2026-10-08",
      eventCount: 25,
    };
    const result = generateTimeline(input);
    expect(result.totalDays).toBe(7);
    expect(result.density).toBe("密集");
  });
});

describe("generateTimeline 稀疏", () => {
  // 手算：{admissionDate='2026-10-01', dischargeDate='2026-10-08', eventCount=5}
  // 手算：totalDays = 7
  // 手算：density = 5>=20? false; 5>=10? false → '稀疏'
  it("{admissionDate='2026-10-01', dischargeDate='2026-10-08', eventCount=5} → totalDays=7, density='稀疏'", () => {
    const input: TimelineGenerateInputV14 = {
      admissionDate: "2026-10-01",
      dischargeDate: "2026-10-08",
      eventCount: 5,
    };
    const result = generateTimeline(input);
    expect(result.totalDays).toBe(7);
    expect(result.density).toBe("稀疏");
  });
});

describe("buildTimelineReport 构建报告", () => {
  // 手算：{totalDays=7, density='密集'}
  // 手算：透传 totalDays + density
  it("{totalDays=7, density='密集'} → 正确返回（透传）", () => {
    const report = buildTimelineReport({ totalDays: 7, density: "密集" });
    expect(report.totalDays).toBe(7);
    expect(report.density).toBe("密集");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-timeline-generate auth:true", () => {
    const def = (emrTimelineGenerateV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-timeline-generate");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
