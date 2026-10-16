/**
 * 健澜科技 jlmedaios - Personal Agent V3 纯函数单测（M232-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAgentTask,
  buildPersonalAgentV3Report,
  learnFromExperience,
} from "../../src/bff/aggregators/personalAgentV3ReportAggregator";

describe("buildAgentTask", () => {
  it("Doctor 角色 → DoctorMUSE", () => {
    expect(buildAgentTask("Doctor", "门诊").agent).toBe("DoctorMUSE");
  });

  it("紧急上下文 → 高优先级", () => {
    expect(buildAgentTask("Nurse", "危急").priority).toBe("高");
  });
});

describe("learnFromExperience", () => {
  it("成功结果 → 学习沉淀", () => {
    expect(learnFromExperience("用药建议", "成功").learned).toBe(true);
  });

  it("失败结果 → 复盘改进", () => {
    expect(learnFromExperience("用药建议", "失败").learned).toBe(false);
  });
});

describe("buildPersonalAgentV3Report", () => {
  it("生成角色数据", () => {
    const r = buildPersonalAgentV3Report("30d");
    expect(r.roles.doctor).toBe(true);
  });

  it("生成主动服务数据", () => {
    const r = buildPersonalAgentV3Report("30d");
    expect(r.proactive.recommendations).toBeGreaterThan(0);
  });

  it("生成学习飞轮数据", () => {
    const r = buildPersonalAgentV3Report("30d");
    expect(r.flywheel.successes).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPersonalAgentV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
