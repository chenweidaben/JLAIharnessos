/**
 * 健澜科技 jlmedaios - 行政办公 V3 纯函数单测（M245-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDocumentQualityV3,
  buildAdministrationV3Report,
  trackSupervisionV3,
} from "../../src/bff/aggregators/administrationV3ReportAggregator";

describe("assessDocumentQualityV3", () => {
  it("95/100合规 平均2天 → 合规率95%高效", () => {
    expect(assessDocumentQualityV3({ compliant: 95, total: 100, avgTime: 2 }).complianceRate).toBe(95);
  });
});

describe("trackSupervisionV3", () => {
  it("进行中剩余5天 → 在轨", () => {
    expect(trackSupervisionV3({ deadline: "2026-12-31", status: "进行中", daysLeft: 5 }).onTrack).toBe(true);
  });
});

describe("buildAdministrationV3Report", () => {
  it("生成公文数据", () => {
    const r = buildAdministrationV3Report("30d");
    expect(r.documents.receipt).toBeGreaterThan(0);
  });

  it("生成会议数据", () => {
    const r = buildAdministrationV3Report("30d");
    expect(r.meetings.resolutions).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildAdministrationV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
