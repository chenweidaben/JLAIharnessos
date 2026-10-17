/**
 * 健澜科技 jlmedaios - MUSE 能力市场与可插拔技能 V5 单测（M284-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseSkillsV5Report,
  enableSkillV5,
  invokeSkillV5,
  registerSkillV5,
} from "../../src/bff/aggregators/museSkillsV5Aggregator";
import { museSkillsV5Routes } from "../../src/bff/routes/museSkillsV5";

describe("registerSkillV5", () => {
  it("返回skillId默认pending", () => {
    const r = registerSkillV5({ skillName: "用药提醒", role: "护士", description: "d", endpoint: "/ep", version: "1.0.0" });
    expect(r.skillId).toContain("用药提醒");
    expect(r.status).toBe("pending");
  });
});

describe("enableSkillV5", () => {
  it("启用后enabled=true", () => {
    const install = enableSkillV5("skill-1", "医生", { key: "val" });
    expect(install.enabled).toBe(true);
    expect(install.role).toBe("医生");
  });
});

describe("invokeSkillV5", () => {
  it("启用技能→invoked=true并回显输入", () => {
    const r = invokeSkillV5({ skillId: "s1", endpoint: "/ep", enabled: true }, { q: "hi" });
    expect(r.invoked).toBe(true);
  });
  it("未启用→invoked=false", () => {
    const r = invokeSkillV5({ skillId: "s1", endpoint: "/ep", enabled: false }, {});
    expect(r.invoked).toBe(false);
  });
});

describe("buildMuseSkillsV5Report", () => {
  it("2技能1启用", () => {
    const installs = [
      { skillId: "s1", role: "医生", enabled: true, config: {} },
      { skillId: "s2", role: "护士", enabled: false, config: {} },
    ];
    const r = buildMuseSkillsV5Report(installs);
    expect(r.totalSkills).toBe(2);
    expect(r.enabledCount).toBe(1);
  });
});

describe("museSkillsV5Routes 写权限", () => {
  it("POST /api/v1/muse-skills/register 路由存在且 auth:true", () => {
    const post = museSkillsV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-skills/register");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
