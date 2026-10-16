/**
 * 健澜科技 jlmedaios - 集团患者转诊与资源调度 V5 单测（M273-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildGroupReferralV5Report,
  routeGroupPatientV5,
  scheduleGroupResourceV5,
} from "../../src/bff/aggregators/groupReferralV5ReportAggregator";

describe("routeGroupPatientV5", () => {
  it("本部床位20分院床位5→转诊本部", () => {
    expect(routeGroupPatientV5("张三", [{ campus: "本部", beds: 20 }, { campus: "分院", beds: 5 }]).campus).toBe("本部");
  });
});

describe("scheduleGroupResourceV5", () => {
  it("资源100需求120→allocated=100 shortage=20", () => {
    const r = scheduleGroupResourceV5(100, 120);
    expect(r.allocated).toBe(100);
    expect(r.shortage).toBe(20);
  });
});

describe("buildGroupReferralV5Report", () => {
  it("生成转诊数据", () => {
    expect(buildGroupReferralV5Report("30d").intraGroup.crossCampus).toBeGreaterThan(0);
  });
  it("生成资源调度数据", () => {
    expect(buildGroupReferralV5Report("30d").resourceScheduling.bed).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildGroupReferralV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
