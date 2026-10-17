/**
 * 健澜科技 jlmedaios - 跨角色经验复用 V5 单测（M275-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  adaptForRoleV5,
  buildExperienceShareV5Report,
  measureReuseV5,
  routeExperienceV5,
  type ShareExperience,
  type ShareRule,
} from "../../src/bff/aggregators/experienceShareV5Aggregator";

const exp: ShareExperience = { id: "e1", fromRole: "doctor", specialty: "心内科", situation: "胸痛", lesson: "首选心电图", upvotes: 10 };

describe("routeExperienceV5", () => {
  it("医生→护士/药师/质控", () => {
    expect(routeExperienceV5("doctor")).toEqual(["nurse", "pharmacist", "quality"]);
  });
  it("未知角色→空数组", () => {
    expect(routeExperienceV5("unknown")).toEqual([]);
  });
});

describe("adaptForRoleV5", () => {
  it("护士版本带护理前缀", () => {
    expect(adaptForRoleV5(exp, "nurse").adapted).toContain("【护理要点】");
  });
});

describe("measureReuseV5", () => {
  it("两条规则一条被消费→复用率50%", () => {
    const r = measureReuseV5([
      { experienceId: "e1", fromRole: "doctor", toRoles: [], visibility: "team", consumedCount: 3 },
      { experienceId: "e2", fromRole: "doctor", toRoles: [], visibility: "team", consumedCount: 0 },
    ]);
    expect(r.reuseRate).toBe(50);
    expect(r.totalConsumed).toBe(3);
  });
});

describe("buildExperienceShareV5Report", () => {
  it("按来源角色统计", () => {
    const rules: ShareRule[] = [
      { experienceId: "e1", fromRole: "doctor", toRoles: [], visibility: "team", consumedCount: 1 },
      { experienceId: "e2", fromRole: "nurse", toRoles: [], visibility: "public", consumedCount: 0 },
    ];
    const r = buildExperienceShareV5Report(rules);
    expect(r.byFromRole.doctor).toBe(1);
    expect(r.byVisibility.public).toBe(1);
  });
});
