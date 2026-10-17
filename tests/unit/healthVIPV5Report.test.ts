/**
 * 健澜科技 jlmedaios - 健康管理 VIP 服务 V5 单测（M274-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assignVIPDoctorV5,
  buildHealthVIPV5Report,
  planVIPHealthV5,
} from "../../src/bff/aggregators/healthVIPV5ReportAggregator";

describe("assignVIPDoctorV5", () => {
  it("钻石会员→首席专家", () => {
    expect(assignVIPDoctorV5("diamond").doctor).toBe("首席专家");
  });
});

describe("planVIPHealthV5", () => {
  it("5个目标→12次随访", () => {
    expect(planVIPHealthV5("张三", 5).sessions).toBe(12);
  });
});

describe("buildHealthVIPV5Report", () => {
  it("生成VIP会员数据", () => {
    expect(buildHealthVIPV5Report("30d").vipMember.familyDoctor).toBeGreaterThan(0);
  });
  it("生成私人医生数据", () => {
    expect(buildHealthVIPV5Report("30d").privateDoctor.signing).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildHealthVIPV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
