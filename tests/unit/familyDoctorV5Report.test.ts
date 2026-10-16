/**
 * 健澜科技 jlmedaios - 家庭医生签约服务 V5 纯函数单测（M262-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assignFamilyDoctorV5,
  buildFamilyDoctorV5Report,
  planFollowupV5,
} from "../../src/bff/aggregators/familyDoctorV5ReportAggregator";

describe("assignFamilyDoctorV5", () => {
  it("70岁+2慢病+团队有容量 → 重点人群包", () => {
    expect(assignFamilyDoctorV5({ age: 70, chronic: 2 }, { gp: "张医生", capacity: 20 }).packageType).toBe("重点人群包");
  });
});

describe("planFollowupV5", () => {
  it("不稳定+2慢病 → 每两周电话+上门", () => {
    expect(planFollowupV5({ chronic: 2 }, { stable: false }).frequency).toBe("每两周");
  });
});

describe("buildFamilyDoctorV5Report", () => {
  it("生成签约数据", () => {
    const r = buildFamilyDoctorV5Report("30d");
    expect(r.sign.resident).toBeGreaterThan(0);
  });

  it("生成健康管理数据", () => {
    const r = buildFamilyDoctorV5Report("30d");
    expect(r.healthMgmt.chronic).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildFamilyDoctorV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
