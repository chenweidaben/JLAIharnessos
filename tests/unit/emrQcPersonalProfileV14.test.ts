/**
 * 健澜科技 jlmedaios - 个人质控档案自动生成 V14 单测（M518-B）
 *
 * 测试 buildPersonalProfile 构建档案、generatePersonalProfile 生成统计、buildPersonalProfileSummary 构建摘要、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPersonalProfile,
  buildPersonalProfileSummary,
  generatePersonalProfile,
  type PersonalProfileStatsV14,
} from "../../src/bff/aggregators/emrQcPersonalProfileV14Aggregator";
import { emrQcPersonalProfileV14Routes } from "../../src/bff/routes/emrQcPersonalProfileV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPersonalProfile 构建档案", () => {
  // 手算：doctor='张医生', dept='心内科', totalRecords=120 → 正确构建
  it("doctor='张医生', dept='心内科', totalRecords=120 → 正确构建", () => {
    const profile = buildPersonalProfile("张医生", "心内科", 120);
    expect(profile.doctor).toBe("张医生");
    expect(profile.dept).toBe("心内科");
    expect(profile.totalRecords).toBe(120);
  });
});

describe("generatePersonalProfile 生成统计", () => {
  // 手算：stats={passRate:95, defectCount:6, complianceRate:88.5} → clamp 0-100，1 位小数
  it("stats={passRate:95, defectCount:6, complianceRate:88.5} → 正确返回", () => {
    const profile = buildPersonalProfile("张医生", "心内科", 120);
    const stats: PersonalProfileStatsV14 = { passRate: 95, defectCount: 6, complianceRate: 88.5 };
    const result = generatePersonalProfile(profile, stats);
    expect(result.passRate).toBe(95);
    expect(result.defectCount).toBe(6);
    expect(result.complianceRate).toBe(88.5);
  });
});

describe("buildPersonalProfileSummary 构建摘要", () => {
  // 手算：passRate=95 >= 90 → grade='优秀'
  it("{passRate:95, complianceRate:88.5} → grade='优秀'", () => {
    const summary = buildPersonalProfileSummary({ passRate: 95, complianceRate: 88.5 });
    expect(summary.grade).toBe("优秀");
  });
});

describe("generatePersonalProfile 边界", () => {
  // 手算：stats={passRate:105, defectCount:0, complianceRate:-5} → passRate=100（clamp 上限），complianceRate=0（clamp 下限）
  it("stats={passRate:105, defectCount:0, complianceRate:-5} → passRate=100, complianceRate=0", () => {
    const profile = buildPersonalProfile("张医生", "心内科", 120);
    const stats: PersonalProfileStatsV14 = { passRate: 105, defectCount: 0, complianceRate: -5 };
    const result = generatePersonalProfile(profile, stats);
    expect(result.passRate).toBe(100);
    expect(result.complianceRate).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-personal-profile auth:true", () => {
    const def = (emrQcPersonalProfileV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-personal-profile");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
